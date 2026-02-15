/**
 * Batch Ingest Service - For scaling to 100K+ nodes
 * Handles parallel batch processing with progress tracking
 */

import type { KnowledgeNode, KnowledgeEdge } from '../types';
import type { IStorageAdapter } from '@/lib/storage/adapter';

export interface BatchConfig {
  batchSize: number;              // Nodes per batch (1000-5000)
  concurrency: number;            // Parallel batches (5-10)
  delayBetweenBatches: number;   // ms between batch groups
}

export interface IngestResult {
  nodesCreated: number;
  edgesCreated: number;
  explanationsCreated: number;
  duration: number; // seconds
  rate: number;    // nodes/sec
}

export interface BatchProgress {
  batchNumber: number;
  totalBatches: number;
  nodesProcessed: number;
  totalNodes: number;
  rate: number; // nodes/sec
  estimatedTimeRemaining: number; // seconds
  startTime: Date;
}

export class BatchIngestService {
  constructor(private storage: IStorageAdapter) {}

  /**
   * Ingest nodes in optimized batches
   */
  async ingestNodesBatch(
    nodes: KnowledgeNode[],
    config: BatchConfig,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<IngestResult> {
    const startTime = Date.now();
    const batches = this.chunkArray(nodes, config.batchSize);
    
    const result: IngestResult = {
      nodesCreated: 0,
      edgesCreated: 0,
      explanationsCreated: 0,
      duration: 0,
      rate: 0
    };

    for (let i = 0; i < batches.length; i += config.concurrency) {
      const batchGroup = batches.slice(i, i + config.concurrency);
      
      const batchResults = await Promise.all(
        batchGroup.map(batch => this.processBatch(batch))
      );

      result.nodesCreated += batchResults.reduce((sum, r) => sum + r.nodesCreated, 0);
      result.edgesCreated += batchResults.reduce((sum, r) => sum + r.edgesCreated, 0);

      if (onProgress) {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress: BatchProgress = {
          batchNumber: Math.min(i + config.concurrency, batches.length),
          totalBatches: batches.length,
          nodesProcessed: result.nodesCreated,
          totalNodes: nodes.length,
          rate: result.nodesCreated / elapsed,
          estimatedTimeRemaining: 
            (nodes.length - result.nodesCreated) / (result.nodesCreated / elapsed),
          startTime: new Date(startTime)
        };
        onProgress(progress);
      }

      // Delay between batch groups to avoid overwhelming database
      if (i + config.concurrency < batches.length) {
        await this.sleep(config.delayBetweenBatches);
      }
    }

    result.duration = (Date.now() - startTime) / 1000;
    result.rate = result.nodesCreated / result.duration;

    return result;
  }

  /**
   * Ingest edges in batches
   */
  async ingestEdgesBatch(
    edges: KnowledgeEdge[],
    config: BatchConfig
  ): Promise<IngestResult> {
    const startTime = Date.now();
    const batches = this.chunkArray(edges, config.batchSize);

    let edgesCreated = 0;

    for (let i = 0; i < batches.length; i += config.concurrency) {
      const batchGroup = batches.slice(i, i + config.concurrency);

      const results = await Promise.all(
        batchGroup.map(batch => 
          Promise.all(batch.map(edge => 
            this.storage.updateEdge(edge.id, edge)
          ))
        )
      );

      edgesCreated += results.flat().length;

      if (i + config.concurrency < batches.length) {
        await this.sleep(config.delayBetweenBatches);
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      nodesCreated: 0,
      edgesCreated,
      explanationsCreated: 0,
      duration,
      rate: edgesCreated / duration
    };
  }

  /**
   * Process single batch of nodes
   */
  private async processBatch(nodes: KnowledgeNode[]): Promise<IngestResult> {
    const result: IngestResult = {
      nodesCreated: 0,
      edgesCreated: 0,
      explanationsCreated: 0,
      duration: 0,
      rate: 0
    };

    try {
      // Parallel creates with error handling
      const createPromises = nodes.map(node =>
        this.storage.createNode(node)
          .then(() => result.nodesCreated++)
          .catch(err => {
            console.error(`Failed to create node ${node.id}:`, err);
          })
      );

      await Promise.all(createPromises);
    } catch (error) {
      console.error('Batch processing error:', error);
    }

    return result;
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
