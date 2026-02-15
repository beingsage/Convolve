/**
 * Qdrant Storage Adapter
 * Vector database backend for semantic search operations
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { IStorageAdapter } from '@/lib/storage/adapter';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  VectorPayload,
  DocumentChunk,
  PaginatedResponse,
  StorageConfig,
} from '@/lib/types';

export class QdrantAdapter implements IStorageAdapter {
  private client: QdrantClient | null = null;
  private config: StorageConfig;
  private connected: boolean = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.connection_string) {
        throw new Error('Qdrant connection string required');
      }

      this.client = new QdrantClient({
        url: this.config.connection_string,
        apiKey: this.config.credentials?.password,
      });

      // Test connection by trying to list collections
      await this.client.getCollections();

      this.connected = true;
      console.log('[Qdrant] Storage adapter initialized');

      // Create collections if they don't exist
      await this.createCollections();
    } catch (error) {
      console.error('[Qdrant] Initialization failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.connected) return false;

    try {
      await this.client.healthCheck();
      return true;
    } catch (error) {
      console.error('[Qdrant] Health check failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // Qdrant client doesn't need explicit disconnection
    this.client = null;
    this.connected = false;
  }

  private async createCollections(): Promise<void> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const collections = ['knowledge_nodes', 'knowledge_edges', 'vectors', 'document_chunks'];

    for (const collection of collections) {
      try {
        await this.client.getCollection(collection);
      } catch (error) {
        // Collection doesn't exist, create it
        if (collection === 'vectors') {
          await this.client.createCollection(collection, {
            vectors: {
              size: 1536, // Default embedding dimension
              distance: 'Cosine',
            },
          });
        } else {
          await this.client.createCollection(collection, {
            vectors: {
              size: 1536,
              distance: 'Cosine',
            },
          });
        }
      }
    }
  }

  // Node operations - simplified for Qdrant (primarily vector-focused)
  async createNode(node: KnowledgeNode): Promise<KnowledgeNode> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const payload = {
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      level: node.level,
      cognitive_state: node.cognitive_state,
      temporal: node.temporal,
      real_world: node.real_world,
      grounding: node.grounding,
      failure_surface: node.failure_surface,
      canonical_name: node.canonical_name,
      first_appearance_year: node.first_appearance_year,
      domain: node.domain,
      created_at: node.created_at?.toISOString() || new Date().toISOString(),
      updated_at: node.updated_at?.toISOString() || new Date().toISOString(),
    };

    await this.client.upsert('knowledge_nodes', {
      wait: true,
      points: [
        {
          id: node.id,
          vector: new Array(1536).fill(0), // Placeholder vector
          payload,
        },
      ],
    });

    return node;
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.retrieve('knowledge_nodes', {
      ids: [id],
    });

    if (result.length === 0) return null;

    const payload = result[0].payload;
    return {
      id: payload.id,
      type: payload.type,
      name: payload.name,
      description: payload.description,
      level: payload.level,
      cognitive_state: payload.cognitive_state,
      temporal: payload.temporal,
      real_world: payload.real_world,
      grounding: payload.grounding,
      failure_surface: payload.failure_surface,
      canonical_name: payload.canonical_name,
      first_appearance_year: payload.first_appearance_year,
      domain: payload.domain,
      created_at: new Date(payload.created_at),
      updated_at: new Date(payload.updated_at),
    };
  }

  async searchNodes(query: string, limit = 10): Promise<KnowledgeNode[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    // For now, use simple filtering - in production, use vector search with text embeddings
    const result = await this.client.scroll('knowledge_nodes', {
      limit,
      with_payload: true,
      filter: {
        must: [
          {
            key: 'name',
            match: {
              text: query,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        type: payload.type,
        name: payload.name,
        description: payload.description,
        level: payload.level,
        cognitive_state: payload.cognitive_state,
        temporal: payload.temporal,
        real_world: payload.real_world,
        grounding: payload.grounding,
        failure_surface: payload.failure_surface,
        canonical_name: payload.canonical_name,
        first_appearance_year: payload.first_appearance_year,
        domain: payload.domain,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async getNodesByType(type: string, limit = 10): Promise<KnowledgeNode[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('knowledge_nodes', {
      limit,
      with_payload: true,
      filter: {
        must: [
          {
            key: 'type',
            match: {
              value: type,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        type: payload.type,
        name: payload.name,
        description: payload.description,
        level: payload.level,
        cognitive_state: payload.cognitive_state,
        temporal: payload.temporal,
        real_world: payload.real_world,
        grounding: payload.grounding,
        failure_surface: payload.failure_surface,
        canonical_name: payload.canonical_name,
        first_appearance_year: payload.first_appearance_year,
        domain: payload.domain,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const existing = await this.getNode(id);
    if (!existing) throw new Error(`Node ${id} not found`);

    const updated = { ...existing, ...updates, updated_at: new Date() };

    await this.client.upsert('knowledge_nodes', {
      wait: true,
      points: [
        {
          id,
          vector: new Array(1536).fill(0), // Placeholder vector
          payload: {
            id: updated.id,
            type: updated.type,
            name: updated.name,
            description: updated.description,
            level: updated.level,
            cognitive_state: updated.cognitive_state,
            temporal: updated.temporal,
            real_world: updated.real_world,
            grounding: updated.grounding,
            failure_surface: updated.failure_surface,
            canonical_name: updated.canonical_name,
            first_appearance_year: updated.first_appearance_year,
            domain: updated.domain,
            created_at: updated.created_at?.toISOString(),
            updated_at: updated.updated_at?.toISOString(),
          },
        },
      ],
    });

    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.delete('knowledge_nodes', {
      wait: true,
      points: [id],
    });

    return true;
  }

  async listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const offset = (page - 1) * limit;

    const result = await this.client.scroll('knowledge_nodes', {
      limit,
      offset,
      with_payload: true,
    });

    const items = result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        type: payload.type,
        name: payload.name,
        description: payload.description,
        level: payload.level,
        cognitive_state: payload.cognitive_state,
        temporal: payload.temporal,
        real_world: payload.real_world,
        grounding: payload.grounding,
        failure_surface: payload.failure_surface,
        canonical_name: payload.canonical_name,
        first_appearance_year: payload.first_appearance_year,
        domain: payload.domain,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });

    return {
      items,
      total: result.points.length, // Qdrant doesn't provide total count easily
      page,
      limit,
      has_more: result.points.length === limit,
    };
  }

  // Edge operations - simplified for Qdrant
  async createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const payload = {
      id: edge.id,
      from_node_id: edge.from_node_id,
      to_node_id: edge.to_node_id,
      relation_type: edge.relation_type,
      strength: edge.strength,
      direction: edge.direction,
      context: edge.context,
      temporal: edge.temporal,
      confidence: edge.confidence,
      created_at: edge.created_at?.toISOString() || new Date().toISOString(),
      updated_at: edge.updated_at?.toISOString() || new Date().toISOString(),
    };

    await this.client.upsert('knowledge_edges', {
      wait: true,
      points: [
        {
          id: edge.id,
          vector: new Array(1536).fill(0), // Placeholder vector
          payload,
        },
      ],
    });

    return edge;
  }

  async getEdge(id: string): Promise<KnowledgeEdge | null> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.retrieve('knowledge_edges', {
      ids: [id],
    });

    if (result.length === 0) return null;

    const payload = result[0].payload as any;
    return {
      id: payload.id,
      from_node_id: payload.from_node_id,
      to_node_id: payload.to_node_id,
      relation_type: payload.relation_type,
      strength: payload.strength,
      direction: payload.direction,
      context: payload.context,
      temporal: payload.temporal,
      confidence: payload.confidence,
      created_at: new Date(payload.created_at),
      updated_at: new Date(payload.updated_at),
    };
  }

  async getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('knowledge_edges', {
      with_payload: true,
      filter: {
        must: [
          {
            key: 'from_node_id',
            match: {
              value: nodeId,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        from_node_id: payload.from_node_id,
        to_node_id: payload.to_node_id,
        relation_type: payload.relation_type,
        strength: payload.strength,
        direction: payload.direction,
        context: payload.context,
        temporal: payload.temporal,
        confidence: payload.confidence,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async getEdgesTo(nodeId: string): Promise<KnowledgeEdge[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('knowledge_edges', {
      with_payload: true,
      filter: {
        must: [
          {
            key: 'to_node_id',
            match: {
              value: nodeId,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        from_node_id: payload.from_node_id,
        to_node_id: payload.to_node_id,
        relation_type: payload.relation_type,
        strength: payload.strength,
        direction: payload.direction,
        context: payload.context,
        temporal: payload.temporal,
        confidence: payload.confidence,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async getEdgesBetween(fromId: string, toId: string): Promise<KnowledgeEdge[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('knowledge_edges', {
      with_payload: true,
      filter: {
        must: [
          {
            key: 'from_node_id',
            match: {
              value: fromId,
            },
          },
          {
            key: 'to_node_id',
            match: {
              value: toId,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        from_node_id: payload.from_node_id,
        to_node_id: payload.to_node_id,
        relation_type: payload.relation_type,
        strength: payload.strength,
        direction: payload.direction,
        context: payload.context,
        temporal: payload.temporal,
        confidence: payload.confidence,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async getEdgesByType(relationType: string): Promise<KnowledgeEdge[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('knowledge_edges', {
      with_payload: true,
      filter: {
        must: [
          {
            key: 'relation_type',
            match: {
              value: relationType,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        from_node_id: payload.from_node_id,
        to_node_id: payload.to_node_id,
        relation_type: payload.relation_type,
        strength: payload.strength,
        direction: payload.direction,
        context: payload.context,
        temporal: payload.temporal,
        confidence: payload.confidence,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });
  }

  async listEdges(page: number, limit: number): Promise<PaginatedResponse<KnowledgeEdge>> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const offset = (page - 1) * limit;

    const result = await this.client.scroll('knowledge_edges', {
      limit,
      offset,
      with_payload: true,
    });

    const items = result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        from_node_id: payload.from_node_id,
        to_node_id: payload.to_node_id,
        relation_type: payload.relation_type,
        strength: payload.strength,
        direction: payload.direction,
        context: payload.context,
        temporal: payload.temporal,
        confidence: payload.confidence,
        created_at: new Date(payload.created_at),
        updated_at: new Date(payload.updated_at),
      };
    });

    return {
      items,
      total: result.points.length,
      page,
      limit,
      has_more: result.points.length === limit,
    };
  }

  async updateEdge(id: string, updates: Partial<KnowledgeEdge>): Promise<KnowledgeEdge> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const existing = await this.getEdge(id);
    if (!existing) throw new Error(`Edge ${id} not found`);

    const updated = { ...existing, ...updates, updated_at: new Date() };

    await this.client.upsert('knowledge_edges', {
      wait: true,
      points: [
        {
          id,
          vector: new Array(1536).fill(0), // Placeholder vector
          payload: {
            id: updated.id,
            from_node_id: updated.from_node_id,
            to_node_id: updated.to_node_id,
            relation_type: updated.relation_type,
            strength: updated.strength,
            direction: updated.direction,
            context: updated.context,
            temporal: updated.temporal,
            confidence: updated.confidence,
            created_at: updated.created_at?.toISOString(),
            updated_at: updated.updated_at?.toISOString(),
          },
        },
      ],
    });

    return updated;
  }

  async deleteEdge(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.delete('knowledge_edges', {
      wait: true,
      points: [id],
    });

    return true;
  }

  async getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]> {
    // Qdrant doesn't support graph traversal - return empty array
    console.warn('[Qdrant] getPath not supported - use Neo4j for graph operations');
    return [];
  }

  // Vector operations - core Qdrant functionality
  async storeVector(vector: VectorPayload): Promise<VectorPayload> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.upsert('vectors', {
      wait: true,
      points: [
        {
          id: vector.id,
          vector: vector.embedding,
          payload: {
            id: vector.id,
            metadata: vector.metadata || {},
            created_at: vector.created_at?.toISOString() || new Date().toISOString(),
          },
        },
      ],
    });

    return vector;
  }

  async getVector(id: string): Promise<VectorPayload | null> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.retrieve('vectors', {
      ids: [id],
    });

    if (result.length === 0) return null;

    const point = result[0];
    return {
      id: point.id as string,
      embedding: point.vector as number[],
      metadata: point.payload?.metadata || {},
      created_at: new Date(point.payload?.created_at || new Date()),
    };
  }

  async searchVectors(
    embedding: number[],
    limit = 10,
    filters?: Record<string, unknown>
  ): Promise<VectorPayload[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const searchRequest: any = {
      vector: embedding,
      limit,
      with_payload: true,
    };

    if (filters) {
      searchRequest.filter = {
        must: Object.entries(filters).map(([key, value]) => ({
          key: `metadata.${key}`,
          match: { value },
        })),
      };
    }

    const result = await this.client.search('vectors', searchRequest);

    return result.map(point => ({
      id: point.id as string,
      embedding: point.vector as number[],
      metadata: point.payload?.metadata || {},
      created_at: new Date(point.payload?.created_at || new Date()),
    }));
  }

  async deleteVector(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.delete('vectors', {
      wait: true,
      points: [id],
    });

    return true;
  }

  async updateVectorDecay(id: string, decay_score: number): Promise<void> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    // Update metadata with decay score
    await this.client.setPayload('vectors', {
      payload: {
        decay_score,
        updated_at: new Date().toISOString(),
      },
      points: [id],
    });
  }

  // Chunk operations
  async storeChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.upsert('document_chunks', {
      wait: true,
      points: [
        {
          id: chunk.id,
          vector: chunk.embedding || new Array(1536).fill(0),
          payload: {
            id: chunk.id,
            source_id: chunk.source_id,
            content: chunk.content,
            metadata: chunk.metadata || {},
            created_at: chunk.created_at?.toISOString() || new Date().toISOString(),
          },
        },
      ],
    });

    return chunk;
  }

  async getChunksBySource(sourceId: string): Promise<DocumentChunk[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('document_chunks', {
      with_payload: true,
      filter: {
        must: [
          {
            key: 'source_id',
            match: {
              value: sourceId,
            },
          },
        ],
      },
    });

    return result.points.map(point => {
      const payload = point.payload as any;
      return {
        id: payload.id,
        source_id: payload.source_id,
        content: payload.content,
        embedding: point.vector as number[],
        metadata: payload.metadata,
        created_at: new Date(payload.created_at),
      };
    });
  }

  async getChunksByConceptId(conceptId: string): Promise<DocumentChunk[]> {
    // Simplified - in production, link chunks to concepts via metadata
    return [];
  }

  async deleteChunksBySource(sourceId: string): Promise<number> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.scroll('document_chunks', {
      filter: {
        must: [
          {
            key: 'source_id',
            match: {
              value: sourceId,
            },
          },
        ],
      },
    });

    if (result.points.length > 0) {
      await this.client.delete('document_chunks', {
        wait: true,
        points: result.points.map(p => p.id),
      });
    }

    return result.points.length;
  }

  // Bulk operations
  async bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const points = nodes.map(node => ({
      id: node.id,
      vector: new Array(1536).fill(0), // Placeholder vector
      payload: {
        id: node.id,
        type: node.type,
        name: node.name,
        description: node.description,
        level: node.level,
        cognitive_state: node.cognitive_state,
        temporal: node.temporal,
        real_world: node.real_world,
        grounding: node.grounding,
        failure_surface: node.failure_surface,
        canonical_name: node.canonical_name,
        first_appearance_year: node.first_appearance_year,
        domain: node.domain,
        created_at: node.created_at?.toISOString() || new Date().toISOString(),
        updated_at: node.updated_at?.toISOString() || new Date().toISOString(),
      },
    }));

    await this.client.upsert('knowledge_nodes', {
      wait: true,
      points,
    });

    return nodes;
  }

  async bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const points = edges.map(edge => ({
      id: edge.id,
      vector: new Array(1536).fill(0), // Placeholder vector
      payload: {
        id: edge.id,
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        relation_type: edge.relation_type,
        strength: edge.strength,
        direction: edge.direction,
        context: edge.context,
        temporal: edge.temporal,
        confidence: edge.confidence,
        created_at: edge.created_at?.toISOString() || new Date().toISOString(),
        updated_at: edge.updated_at?.toISOString() || new Date().toISOString(),
      },
    }));

    await this.client.upsert('knowledge_edges', {
      wait: true,
      points,
    });

    return edges;
  }

  async clear(): Promise<void> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const collections = ['knowledge_nodes', 'knowledge_edges', 'vectors', 'document_chunks'];

    for (const collection of collections) {
      try {
        await this.client.deleteCollection(collection);
        await this.client.createCollection(collection, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
      } catch (error) {
        console.warn(`[Qdrant] Could not clear collection ${collection}:`, error);
      }
    }
  }

  // Transaction support - not applicable for Qdrant
  async beginTransaction(): Promise<void> {
    // Qdrant doesn't support transactions
  }

  async commit(): Promise<void> {
    // Qdrant doesn't support transactions
  }

  async rollback(): Promise<void> {
    // Qdrant doesn't support transactions
  }

  // ============================================================================
  // Hybrid Adapter Support Methods
  // These methods are used by HybridAdapter for combined storage
  // ============================================================================

  async storeEmbedding(
    id: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    await this.client.upsert('knowledge_nodes', {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: {
            ...metadata,
            has_embedding: true,
            updated_at: new Date().toISOString(),
          },
        },
      ],
    });
  }

  async getEmbedding(id: string): Promise<{ vector: number[]; metadata: Record<string, unknown> } | null> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    const result = await this.client.retrieve('knowledge_nodes', {
      ids: [id],
    });

    if (result.length === 0) return null;

    return {
      vector: result[0].vector as number[],
      metadata: result[0].payload || {},
    };
  }

  async deleteEmbedding(id: string): Promise<void> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    // Delete the point (which contains the embedding)
    await this.client.delete('knowledge_nodes', {
      wait: true,
      points: [id],
    });
  }

  // Additional helper for getting stats
  async getStats(): Promise<Record<string, unknown>> {
    if (!this.client) throw new Error('Qdrant client not initialized');

    try {
      const collections = await this.client.getCollections();
      const stats: Record<string, unknown> = {};

      for (const collection of collections.collections || []) {
        const info = await this.client.getCollection(collection.name);
        stats[collection.name] = {
          vectors_count: info.vectors_count,
          points_count: info.points_count,
          status: info.status,
        };
      }

      return stats;
    } catch (error) {
      return { error: String(error) };
    }
  }
}
