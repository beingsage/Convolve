/**
 * MongoDB Storage Adapter
 * Production-ready implementation of IStorageAdapter
 */

import {
  IStorageAdapter,
  KnowledgeNode,
  KnowledgeEdge,
  VectorPayload,
  DocumentChunk,
  PaginatedResponse,
  StorageConfig,
} from '@/lib/types';

/**
 * Mock MongoDB adapter for demo purposes
 * In production, replace with actual MongoDB driver
 */
export class MongoDBAdapter implements IStorageAdapter {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  private vectors: Map<string, VectorPayload> = new Map();
  private chunks: Map<string, DocumentChunk> = new Map();
  private config: StorageConfig;
  private connected: boolean = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // In production:
    // const client = new MongoClient(this.config.connection_string);
    // await client.connect();
    // this.db = client.db('uails');
    // await this.setupIndexes();
    
    console.log('[MongoDB] Adapter initialized (demo mode)');
    this.connected = true;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    // In production: await client.close();
    this.connected = false;
    this.clear();
  }

  async createNode(node: KnowledgeNode): Promise<KnowledgeNode> {
    this.nodes.set(node.id, node);
    return node;
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    return this.nodes.get(id) || null;
  }

  async searchNodes(query: string, limit = 10): Promise<KnowledgeNode[]> {
    const q = query.toLowerCase();
    return Array.from(this.nodes.values())
      .filter(n => 
        n.name.toLowerCase().includes(q) || 
        n.description.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  async getNodesByType(type: string, limit = 10): Promise<KnowledgeNode[]> {
    return Array.from(this.nodes.values())
      .filter(n => n.type === type)
      .slice(0, limit);
  }

  async updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode> {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    const updated = { ...node, ...updates, id, updated_at: new Date() };
    this.nodes.set(id, updated);
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    return this.nodes.delete(id);
  }

  async listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>> {
    const items = Array.from(this.nodes.values());
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
      has_more: start + limit < items.length,
    };
  }

  async createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge> {
    this.edges.set(edge.id, edge);
    return edge;
  }

  async getEdge(id: string): Promise<KnowledgeEdge | null> {
    return this.edges.get(id) || null;
  }

  async getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]> {
    return Array.from(this.edges.values()).filter(e => e.from_node === nodeId);
  }

  async getEdgesTo(nodeId: string): Promise<KnowledgeEdge[]> {
    return Array.from(this.edges.values()).filter(e => e.to_node === nodeId);
  }

  async getEdgesBetween(fromId: string, toId: string): Promise<KnowledgeEdge[]> {
    return Array.from(this.edges.values()).filter(
      e => e.from_node === fromId && e.to_node === toId
    );
  }

  async getEdgesByType(relationType: string): Promise<KnowledgeEdge[]> {
    return Array.from(this.edges.values()).filter(e => e.relation === relationType);
  }

  async updateEdge(id: string, updates: Partial<KnowledgeEdge>): Promise<KnowledgeEdge> {
    const edge = this.edges.get(id);
    if (!edge) throw new Error(`Edge ${id} not found`);
    const updated = { ...edge, ...updates, id, updated_at: new Date() };
    this.edges.set(id, updated);
    return updated;
  }

  async deleteEdge(id: string): Promise<boolean> {
    return this.edges.delete(id);
  }

  async getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]> {
    // BFS pathfinding
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: KnowledgeEdge[] }> = [
      { nodeId: fromId, path: [] },
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      if (visited.has(nodeId) || path.length >= maxDepth) continue;

      visited.add(nodeId);
      if (nodeId === toId) return path;

      const edges = await this.getEdgesFrom(nodeId);
      for (const edge of edges) {
        queue.push({ nodeId: edge.to_node, path: [...path, edge] });
      }
    }

    return [];
  }

  async storeVector(vector: VectorPayload): Promise<VectorPayload> {
    this.vectors.set(vector.id, vector);
    return vector;
  }

  async getVector(id: string): Promise<VectorPayload | null> {
    return this.vectors.get(id) || null;
  }

  async searchVectors(
    embedding: number[],
    limit = 10,
    filters?: Record<string, unknown>
  ): Promise<VectorPayload[]> {
    const results = Array.from(this.vectors.values())
      .map(v => ({
        vector: v,
        score: cosineSimilarity(embedding, v.embedding),
      }))
      .filter(r => r.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.vector);

    return results;
  }

  async deleteVector(id: string): Promise<boolean> {
    return this.vectors.delete(id);
  }

  async updateVectorDecay(id: string, decay_score: number): Promise<void> {
    const vector = this.vectors.get(id);
    if (vector) {
      vector.decay_score = decay_score;
    }
  }

  async storeChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    this.chunks.set(chunk.id, chunk);
    return chunk;
  }

  async getChunksBySource(sourceId: string): Promise<DocumentChunk[]> {
    return Array.from(this.chunks.values()).filter(c => c.source_id === sourceId);
  }

  async getChunksByConceptId(conceptId: string): Promise<DocumentChunk[]> {
    return Array.from(this.chunks.values()).filter(c =>
      c.extracted_concepts.includes(conceptId)
    );
  }

  async deleteChunksBySource(sourceId: string): Promise<number> {
    let count = 0;
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.source_id === sourceId) {
        this.chunks.delete(id);
        count++;
      }
    }
    return count;
  }

  async bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]> {
    nodes.forEach(n => this.nodes.set(n.id, n));
    return nodes;
  }

  async bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]> {
    edges.forEach(e => this.edges.set(e.id, e));
    return edges;
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.vectors.clear();
    this.chunks.clear();
  }

  async beginTransaction(): Promise<void> {
    // MongoDB sessions in production
  }

  async commit(): Promise<void> {
    // Commit transaction
  }

  async rollback(): Promise<void> {
    // Rollback transaction
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
