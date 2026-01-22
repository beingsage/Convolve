/**
 * Batch Ingestion Pipeline
 * Enhancement #3: Process 1000+ documents with queuing & progress
 * Rollback support, parallel chunk processing
 */

import { IngestionPipeline } from './ingestion-complete';
import { getStorageAdapter } from '@/lib/storage/factory';

export interface BatchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_documents: number;
  processed: number;
  failed: number;
  start_time: number;
  end_time?: number;
  errors: Array<{ doc_index: number; error: string }>;
}

export class BatchIngestionPipeline {
  private queue: Array<{ id: string; content: string }> = [];
  private jobs: Map<string, BatchJob> = new Map();
  private pipeline: IngestionPipeline;
  private maxParallel: number = 4;

  constructor() {
    this.pipeline = new IngestionPipeline();
  }

  /**
   * Submit batch of documents
   */
  async submitBatch(
    documents: Array<{ id: string; content: string }>,
    jobId?: string
  ): Promise<string> {
    const id = jobId || `batch-${Date.now()}`;

    const job: BatchJob = {
      id,
      status: 'pending',
      total_documents: documents.length,
      processed: 0,
      failed: 0,
      start_time: Date.now(),
      errors: [],
    };

    this.jobs.set(id, job);
    this.queue.push(...documents);

    // Start processing asynchronously
    this.processQueue().catch((error) => {
      job.status = 'failed';
      job.errors.push({
        doc_index: job.processed,
        error: String(error),
      });
    });

    return id;
  }

  /**
   * Process documents from queue in parallel batches
   */
  private async processQueue(): Promise<void> {
    const storage = await getStorageAdapter();

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxParallel);
      const promises = batch.map((doc) => this.processDocument(doc, storage));

      await Promise.all(promises);
    }
  }

  /**
   * Process single document
   */
  private async processDocument(
    doc: { id: string; content: string },
    storage: any
  ): Promise<void> {
    try {
      // Extract concepts and chunks
      const chunks = this.pipeline.parseContent(doc.content);

      for (const chunk of chunks) {
        const concepts = this.pipeline.extractConcepts(chunk);

        for (const concept of concepts) {
          // Store in graph
          const node = {
            id: `${doc.id}-${concept.name}`,
            name: concept.name,
            description: chunk,
            type: 'concept' as const,
            canonical_name: concept.name,
            first_appearance_year: 2024,
            domain: 'ai_ml',
            confidence_score: 0.8,
            source_count: 1,
            level: {
              abstraction: 0.5,
              difficulty: 0.5,
              volatility: 0.3,
            },
            cognitive_state: {
              strength: 0.8,
              activation: 0.5,
              decay_rate: 0.01,
              confidence: 0.8,
            },
            temporal: {
              introduced_at: new Date(),
              last_reinforced_at: new Date(),
              peak_relevance_at: new Date(),
            },
            real_world: {
              used_in_production: true,
              companies_using: 5,
              avg_salary_weight: 0.8,
              interview_frequency: 0.6,
            },
            grounding: {
              source_refs: [doc.id],
              implementation_refs: [],
            },
            failure_surface: {
              common_bugs: [],
              misconceptions: [],
            },
          };

          await storage.createNode(node);
        }
      }
    } catch (error) {
      const jobId = Array.from(this.jobs.values())[0].id;
      const job = this.jobs.get(jobId);
      if (job) {
        job.failed++;
        job.errors.push({
          doc_index: job.processed,
          error: String(error),
        });
      }
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'processing' || job.status === 'pending') {
      job.status = 'failed';
      job.end_time = Date.now();
      return true;
    }

    return false;
  }

  /**
   * Rollback failed batch
   */
  async rollback(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const storage = await getStorageAdapter();
    await storage.beginTransaction();

    try {
      // Delete all nodes created by this job
      const nodes = await storage.listNodes(0, 10000);
      for (const node of nodes.items) {
        if (node.grounding?.source_refs?.includes(jobId)) {
          await storage.deleteNode(node.id);
        }
      }

      await storage.commit();
      job.status = 'failed';
    } catch (error) {
      await storage.rollback();
      throw error;
    }
  }

  /**
   * Get batch statistics
   */
  getStatistics(): Record<string, any> {
    const jobs = Array.from(this.jobs.values());
    const totalDocs = jobs.reduce((sum, j) => sum + j.total_documents, 0);
    const totalProcessed = jobs.reduce((sum, j) => sum + j.processed, 0);
    const totalFailed = jobs.reduce((sum, j) => sum + j.failed, 0);

    return {
      total_jobs: jobs.length,
      total_documents: totalDocs,
      total_processed: totalProcessed,
      total_failed: totalFailed,
      success_rate: totalDocs === 0 ? 0 : (totalProcessed / totalDocs) * 100,
      queue_size: this.queue.length,
    };
  }
}

// Singleton instance
let batchPipelineInstance: BatchIngestionPipeline | null = null;

export function getBatchIngestionPipeline(): BatchIngestionPipeline {
  if (!batchPipelineInstance) {
    batchPipelineInstance = new BatchIngestionPipeline();
  }
  return batchPipelineInstance;
}
