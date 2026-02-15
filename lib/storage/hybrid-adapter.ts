/**
 * Hybrid Storage Adapter
 * Combines Qdrant (vector) and Neo4j (graph) for comprehensive knowledge storage
 */

import { IStorageAdapter, KnowledgeNode, KnowledgeEdge } from './adapter';
import { StorageConfig, DocumentChunk, PaginatedResponse, VectorPayload } from '@/lib/types';
import { QdrantAdapter } from './adapters/qdrant';
import { Neo4jAdapter } from './adapters/neo4j';

export class HybridAdapter implements IStorageAdapter {
  private qdrantAdapter: QdrantAdapter;
  private neo4jAdapter: Neo4jAdapter;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;

    if (!config.qdrant || !config.neo4j) {
      throw new Error('Hybrid storage requires both qdrant and neo4j configuration');
    }

    // Initialize adapters
    this.qdrantAdapter = new QdrantAdapter(config.qdrant);
    this.neo4jAdapter = new Neo4jAdapter(config.neo4j);
  }

  async initialize(): Promise<void> {
    console.log('[UAILS] Initializing hybrid storage adapter...');

    await Promise.all([
      this.qdrantAdapter.initialize(),
      this.neo4jAdapter.initialize()
    ]);

    console.log('[UAILS] Hybrid storage adapter initialized');
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.qdrantAdapter.disconnect(),
      this.neo4jAdapter.disconnect()
    ]);
  }

  // Node operations - primarily use Neo4j for metadata, Qdrant for vectors
  async createNode(node: KnowledgeNode): Promise<KnowledgeNode> {
    // Store in Neo4j
    const created = await this.neo4jAdapter.createNode(node);

    // Store embedding in Qdrant if available
    if (node.embedding) {
      await this.qdrantAdapter.storeEmbedding(created.id, node.embedding, {
        content: node.content,
        metadata: node.metadata,
        confidence: node.confidence,
        created_at: node.created_at,
        updated_at: node.updated_at
      });
    }

    return created;
  }

  async getNode(nodeId: string): Promise<KnowledgeNode | null> {
    // Get from Neo4j (primary source of truth)
    const node = await this.neo4jAdapter.getNode(nodeId);
    if (!node) return null;

    // Get embedding from Qdrant if needed
    if (node.embedding === null) {
      const embeddingData = await this.qdrantAdapter.getEmbedding(nodeId);
      if (embeddingData) {
        node.embedding = embeddingData.vector || null;
      }
    }

    return node;
  }

  async updateNode(nodeId: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode> {
    // Update Neo4j
    const updated = await this.neo4jAdapter.updateNode(nodeId, updates);

    // Update Qdrant if embedding changed
    if (updates.embedding) {
      const node = await this.neo4jAdapter.getNode(nodeId);
      if (node) {
        await this.qdrantAdapter.storeEmbedding(nodeId, updates.embedding, {
          content: node.content,
          metadata: node.metadata,
          confidence: node.confidence,
          created_at: node.created_at,
          updated_at: node.updated_at
        });
      }
    }

    return updated;
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    await Promise.all([
      this.neo4jAdapter.deleteNode(nodeId),
      this.qdrantAdapter.deleteEmbedding(nodeId)
    ]);
    return true;
  }

  async listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>> {
    // Use Neo4j as primary source for listing nodes
    return await this.neo4jAdapter.listNodes(page, limit);
  }

  async getNodesByType(type: string, limit?: number): Promise<KnowledgeNode[]> {
    // Use Neo4j for type-based queries
    return await this.neo4jAdapter.getNodesByType(type, limit);
  }

  async searchNodes(query: string, limit?: number): Promise<KnowledgeNode[]> {
    // Use Neo4j for text search
    return await this.neo4jAdapter.searchNodes(query, limit);
  }

  // Edge operations - Neo4j only
  async createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge> {
    return await this.neo4jAdapter.createEdge(edge);
  }

  async getEdge(edgeId: string): Promise<KnowledgeEdge | null> {
    return await this.neo4jAdapter.getEdge(edgeId);
  }

  async updateEdge(edgeId: string, updates: Partial<KnowledgeEdge>): Promise<KnowledgeEdge> {
    return await this.neo4jAdapter.updateEdge(edgeId, updates);
  }

  async deleteEdge(edgeId: string): Promise<boolean> {
    return await this.neo4jAdapter.deleteEdge(edgeId);
  }

  async getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getEdgesFrom(nodeId);
  }

  async getEdgesTo(nodeId: string): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getEdgesTo(nodeId);
  }

  async getEdgesBetween(fromId: string, toId: string): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getEdgesBetween(fromId, toId);
  }

  async getEdgesByType(relationType: string): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getEdgesByType(relationType);
  }

  async listEdges(page: number, limit: number): Promise<PaginatedResponse<KnowledgeEdge>> {
    return await this.neo4jAdapter.listEdges(page, limit);
  }

  // ============================================================================
  // Vector Operations
  // ============================================================================

  async storeVector(vector: VectorPayload): Promise<VectorPayload> {
    // Store vectors in Qdrant
    return await this.qdrantAdapter.storeVector(vector);
  }

  async getVector(id: string): Promise<VectorPayload | null> {
    // Retrieve vectors from Qdrant
    return await this.qdrantAdapter.getVector(id);
  }

  async searchVectors(
    embedding: number[],
    limit?: number,
    filters?: Record<string, unknown>
  ): Promise<VectorPayload[]> {
    // Search vectors in Qdrant
    return await this.qdrantAdapter.searchVectors(embedding, limit, filters);
  }

  async deleteVector(id: string): Promise<boolean> {
    // Delete vectors from Qdrant
    return await this.qdrantAdapter.deleteVector(id);
  }

  async updateVectorDecay(id: string, decay_score: number): Promise<void> {
    // Update vector decay in Qdrant
    return await this.qdrantAdapter.updateVectorDecay(id, decay_score);
  }

  // ============================================================================
  // Graph Operations
  // ============================================================================

  async getRelatedNodes(nodeId: string, options?: { depth?: number; relationshipTypes?: string[] }): Promise<KnowledgeNode[]> {
    return await this.neo4jAdapter.getRelatedNodes(nodeId, options);
  }

  async getNodeEdges(nodeId: string): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getNodeEdges(nodeId);
  }

  async getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.getPath(fromId, toId, maxDepth);
  }

  async findPath(fromId: string, toId: string, options?: { maxDepth?: number }): Promise<KnowledgeNode[]> {
    return await this.neo4jAdapter.findPath(fromId, toId, options);
  }

  // Batch operations
  async bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]> {
    // Create in Neo4j first
    const createdNodes = await this.neo4jAdapter.bulkCreateNodes(nodes);

    // Store embeddings in Qdrant for nodes that have them
    const embeddingPromises = nodes
      .filter((node, index) => node.embedding !== null)
      .map((node, index) => {
        const nodeId = createdNodes[index].id;
        return this.qdrantAdapter.storeEmbedding(nodeId, node.embedding!, {
          content: node.content,
          metadata: node.metadata,
          confidence: node.confidence,
          created_at: node.created_at,
          updated_at: node.updated_at
        });
      });

    await Promise.all(embeddingPromises);

    return createdNodes;
  }

  async bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]> {
    return await this.neo4jAdapter.bulkCreateEdges(edges);
  }

  // Analytics and maintenance
  async getStats(): Promise<Record<string, any>> {
    const [qdrantStats, neo4jStats] = await Promise.all([
      this.qdrantAdapter.getStats(),
      this.neo4jAdapter.getStats()
    ]);

    return {
      hybrid: true,
      qdrant: qdrantStats,
      neo4j: neo4jStats,
      total_nodes: (qdrantStats.node_count || 0) + (neo4jStats.node_count || 0),
      total_edges: neo4jStats.edge_count || 0
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [qdrantHealth, neo4jHealth] = await Promise.all([
        this.qdrantAdapter.healthCheck(),
        this.neo4jAdapter.healthCheck()
      ]);
      return qdrantHealth && neo4jHealth;
    } catch (error) {
      console.error('[UAILS] Hybrid storage health check failed:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.qdrantAdapter.clear(),
      this.neo4jAdapter.clear()
    ]);
  }

  // ============================================================================
  // Chunk Operations
  // ============================================================================

  async storeChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    // Store chunks in Neo4j (could also use MongoDB in a real implementation)
    return await this.neo4jAdapter.storeChunk(chunk);
  }

  async getChunksBySource(sourceId: string): Promise<DocumentChunk[]> {
    return await this.neo4jAdapter.getChunksBySource(sourceId);
  }

  async getChunksByConceptId(conceptId: string): Promise<DocumentChunk[]> {
    return await this.neo4jAdapter.getChunksByConceptId(conceptId);
  }

  async deleteChunksBySource(sourceId: string): Promise<number> {
    return await this.neo4jAdapter.deleteChunksBySource(sourceId);
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  async beginTransaction(): Promise<void> {
    // Transactions primarily use Neo4j
    await this.neo4jAdapter.beginTransaction();
  }

  async commit(): Promise<void> {
    await this.neo4jAdapter.commit();
  }

  async rollback(): Promise<void> {
    await this.neo4jAdapter.rollback();
  }
}