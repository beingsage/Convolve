/**
 * In-Memory Storage Adapter
 * Perfect for demo, testing, and lightweight deployments
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

export class InMemoryAdapter implements IStorageAdapter {
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
    this.connected = true;
    console.log('[InMemory] Storage adapter initialized');
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.clear();
  }

  async createNode(node: KnowledgeNode): Promise<KnowledgeNode> {
    this.nodes.set(node.id, { ...node, created_at: new Date(), updated_at: new Date() });
    return this.nodes.get(node.id)!;
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    return this.nodes.get(id) || null;
  }

  async searchNodes(query: string, limit = 10): Promise<KnowledgeNode[]> {
    const q = query.toLowerCase();
    return Array.from(this.nodes.values())
      .filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        (n.canonical_name?.toLowerCase().includes(q) || false)
      )
      .sort((a, b) => {
        // Prioritize name matches over description matches
        const aNameMatch = a.name.toLowerCase().includes(q);
        const bNameMatch = b.name.toLowerCase().includes(q);
        return (bNameMatch ? 1 : 0) - (aNameMatch ? 1 : 0);
      })
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
    const items = Array.from(this.nodes.values()).sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );
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
    this.edges.set(edge.id, { ...edge, created_at: new Date(), updated_at: new Date() });
    return this.edges.get(edge.id)!;
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

  async listEdges(page: number, limit: number): Promise<PaginatedResponse<KnowledgeEdge>> {
    const items = Array.from(this.edges.values()).sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
      has_more: start + limit < items.length,
    };
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
    const stored = { ...vector, created_at: new Date(), updated_at: new Date() };
    this.vectors.set(vector.id, stored);
    return stored;
  }

  async getVector(id: string): Promise<VectorPayload | null> {
    return this.vectors.get(id) || null;
  }

  async searchVectors(
    embedding: number[],
    limit = 10,
    filters?: Record<string, unknown>
  ): Promise<VectorPayload[]> {
    let vectors = Array.from(this.vectors.values());

    // Apply filters
    if (filters) {
      if (filters.entity_refs && Array.isArray(filters.entity_refs)) {
        vectors = vectors.filter(v =>
          (filters.entity_refs as string[]).some(ref => v.entity_refs.includes(ref))
        );
      }
      if (filters.source_tier && typeof filters.source_tier === 'string') {
        vectors = vectors.filter(v => v.source_tier === filters.source_tier);
      }
      if (filters.abstraction_level && typeof filters.abstraction_level === 'string') {
        vectors = vectors.filter(v => v.abstraction_level === filters.abstraction_level);
      }
    }

    // Calculate similarity
    const results = vectors
      .map(v => ({
        vector: v,
        score: cosineSimilarity(embedding, v.embedding),
      }))
      .filter(r => r.score > 0.3) // Lower threshold for initial filtering
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
      vector.updated_at = new Date();
    }
  }

  async storeChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    const stored = { ...chunk, created_at: new Date() };
    this.chunks.set(chunk.id, stored);
    return stored;
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
    const now = new Date();
    const created = nodes.map(n => ({
      ...n,
      created_at: now,
      updated_at: now,
    }));
    created.forEach(n => this.nodes.set(n.id, n));
    return created;
  }

  async bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]> {
    const now = new Date();
    const created = edges.map(e => ({
      ...e,
      created_at: now,
      updated_at: now,
    }));
    created.forEach(e => this.edges.set(e.id, e));
    return created;
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.vectors.clear();
    this.chunks.clear();
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  // ============================================================================
  // Query helpers for demo/testing
  // ============================================================================

  getStats(): { nodes: number; edges: number; vectors: number; chunks: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      vectors: this.vectors.size,
      chunks: this.chunks.size,
    };
  }

  getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): KnowledgeEdge[] {
    return Array.from(this.edges.values());
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;
    dotProduct += aVal * bVal;
    magnitudeA += aVal * aVal;
    magnitudeB += bVal * bVal;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
