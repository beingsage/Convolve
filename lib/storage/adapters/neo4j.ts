/**
 * Neo4j Storage Adapter
 * Graph database backend for knowledge graph operations
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';
import { IStorageAdapter } from '@/lib/storage/adapter';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  VectorPayload,
  DocumentChunk,
  PaginatedResponse,
  StorageConfig,
} from '@/lib/types';

export class Neo4jAdapter implements IStorageAdapter {
  private driver: Driver | null = null;
  private config: StorageConfig;
  private connected: boolean = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.connection_string || !this.config.credentials) {
        throw new Error('Neo4j connection string and credentials required');
      }

      this.driver = neo4j.driver(
        this.config.connection_string,
        neo4j.auth.basic(
          this.config.credentials.username,
          this.config.credentials.password
        ),
        {
          maxConnectionPoolSize: 10,
          connectionTimeout: 30000,
        }
      );

      // Test connection
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();

      this.connected = true;
      console.log('[Neo4j] Storage adapter initialized');

      // Create constraints and indexes
      await this.createSchema();
    } catch (error) {
      console.error('[Neo4j] Initialization failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.driver || !this.connected) return false;

    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      return true;
    } catch (error) {
      console.error('[Neo4j] Health check failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
    this.connected = false;
  }

  private async createSchema(): Promise<void> {
    const session = this.getSession();

    try {
      // Create constraints
      await session.run('CREATE CONSTRAINT node_id IF NOT EXISTS FOR (n:KnowledgeNode) REQUIRE n.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT edge_id IF NOT EXISTS FOR (e:KnowledgeEdge) REQUIRE e.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT vector_id IF NOT EXISTS FOR (v:Vector) REQUIRE v.id IS UNIQUE');

      // Create indexes
      await session.run('CREATE INDEX node_type IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.type)');
      await session.run('CREATE INDEX node_name IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.name)');
      await session.run('CREATE INDEX edge_type IF NOT EXISTS FOR (e:KnowledgeEdge) ON (e.relation_type)');
    } finally {
      await session.close();
    }
  }

  private getSession(): Session {
    if (!this.driver) throw new Error('Neo4j driver not initialized');
    return this.driver.session();
  }

  async createNode(node: KnowledgeNode): Promise<KnowledgeNode> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        CREATE (n:KnowledgeNode {
          id: $id,
          type: $type,
          name: $name,
          description: $description,
          level: $level,
          cognitive_state: $cognitive_state,
          temporal: $temporal,
          real_world: $real_world,
          grounding: $grounding,
          failure_surface: $failure_surface,
          canonical_name: $canonical_name,
          first_appearance_year: $first_appearance_year,
          domain: $domain,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN n
        `,
        {
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
        }
      );

      return this.mapNeo4jNode(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (n:KnowledgeNode {id: $id}) RETURN n',
        { id }
      );

      if (result.records.length === 0) return null;
      return this.mapNeo4jNode(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async searchNodes(query: string, limit = 10): Promise<KnowledgeNode[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        MATCH (n:KnowledgeNode)
        WHERE n.name CONTAINS $query OR
              n.description CONTAINS $query OR
              n.canonical_name CONTAINS $query
        RETURN n
        ORDER BY
          CASE WHEN n.name CONTAINS $query THEN 1 ELSE 0 END DESC,
          n.name
        LIMIT $limit
        `,
        { query, limit: neo4j.int(limit) }
      );

      return result.records.map(record => this.mapNeo4jNode(record.get('n')));
    } finally {
      await session.close();
    }
  }

  async getNodesByType(type: string, limit = 10): Promise<KnowledgeNode[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (n:KnowledgeNode {type: $type}) RETURN n LIMIT $limit',
        { type, limit: neo4j.int(limit) }
      );

      return result.records.map(record => this.mapNeo4jNode(record.get('n')));
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode> {
    const session = this.getSession();

    try {
      const setClause = Object.keys(updates)
        .map(key => `n.${key} = $${key}`)
        .join(', ');

      const params = { id, updated_at: new Date().toISOString(), ...updates };

      const result = await session.run(
        `MATCH (n:KnowledgeNode {id: $id}) SET ${setClause}, n.updated_at = datetime($updated_at) RETURN n`,
        params
      );

      if (result.records.length === 0) throw new Error(`Node ${id} not found`);
      return this.mapNeo4jNode(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<boolean> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (n:KnowledgeNode {id: $id}) DETACH DELETE n RETURN count(n) as deleted',
        { id }
      );

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  async listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>> {
    const session = this.getSession();

    try {
      const skip = (page - 1) * limit;

      const [nodesResult, countResult] = await Promise.all([
        session.run(
          'MATCH (n:KnowledgeNode) RETURN n ORDER BY n.created_at DESC SKIP $skip LIMIT $limit',
          { skip: neo4j.int(skip), limit: neo4j.int(limit) }
        ),
        session.run('MATCH (n:KnowledgeNode) RETURN count(n) as total')
      ]);

      const items = nodesResult.records.map(record => this.mapNeo4jNode(record.get('n')));
      const total = countResult.records[0].get('total').toNumber();

      return {
        items,
        total,
        page,
        limit,
        has_more: skip + limit < total,
      };
    } finally {
      await session.close();
    }
  }

  async createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        MATCH (from:KnowledgeNode {id: $from_node})
        MATCH (to:KnowledgeNode {id: $to_node})
        CREATE (from)-[e:KnowledgeEdge {
          id: $id,
          from_node: $from_node,
          to_node: $to_node,
          relation: $relation,
          weight: $weight,
          dynamics: $dynamics,
          temporal: $temporal,
          confidence: $confidence,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        }]->(to)
        RETURN e
        `,
        {
          id: edge.id,
          from_node: edge.from_node,
          to_node: edge.to_node,
          relation: edge.relation,
          weight: edge.weight,
          dynamics: edge.dynamics,
          temporal: edge.temporal,
          confidence: edge.confidence,
          created_at: edge.created_at?.toISOString() || new Date().toISOString(),
          updated_at: edge.updated_at?.toISOString() || new Date().toISOString(),
        }
      );

      return this.mapNeo4jEdge(result.records[0].get('e'));
    } finally {
      await session.close();
    }
  }

  async getEdge(id: string): Promise<KnowledgeEdge | null> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH ()-[e:KnowledgeEdge {id: $id}]-() RETURN e',
        { id }
      );

      if (result.records.length === 0) return null;
      return this.mapNeo4jEdge(result.records[0].get('e'));
    } finally {
      await session.close();
    }
  }

  async getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (from:KnowledgeNode {id: $nodeId})-[e:KnowledgeEdge]->(to:KnowledgeNode) RETURN e',
        { nodeId }
      );

      return result.records.map(record => this.mapNeo4jEdge(record.get('e')));
    } finally {
      await session.close();
    }
  }

  async getEdgesTo(nodeId: string): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (from:KnowledgeNode)-[e:KnowledgeEdge]->(to:KnowledgeNode {id: $nodeId}) RETURN e',
        { nodeId }
      );

      return result.records.map(record => this.mapNeo4jEdge(record.get('e')));
    } finally {
      await session.close();
    }
  }

  async getEdgesBetween(fromId: string, toId: string): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (from:KnowledgeNode {id: $fromId})-[e:KnowledgeEdge]->(to:KnowledgeNode {id: $toId}) RETURN e',
        { fromId, toId }
      );

      return result.records.map(record => this.mapNeo4jEdge(record.get('e')));
    } finally {
      await session.close();
    }
  }

  async getEdgesByType(relationType: string): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH ()-[e:KnowledgeEdge {relation_type: $relationType}]-() RETURN e',
        { relationType }
      );

      return result.records.map(record => this.mapNeo4jEdge(record.get('e')));
    } finally {
      await session.close();
    }
  }

  async listEdges(page: number, limit: number): Promise<PaginatedResponse<KnowledgeEdge>> {
    const session = this.getSession();

    try {
      const skip = (page - 1) * limit;

      const [edgesResult, countResult] = await Promise.all([
        session.run(
          'MATCH ()-[e:KnowledgeEdge]-() RETURN e ORDER BY e.created_at DESC SKIP $skip LIMIT $limit',
          { skip: neo4j.int(skip), limit: neo4j.int(limit) }
        ),
        session.run('MATCH ()-[e:KnowledgeEdge]-() RETURN count(e) as total')
      ]);

      const items = edgesResult.records.map(record => this.mapNeo4jEdge(record.get('e')));
      const total = countResult.records[0].get('total').toNumber();

      return {
        items,
        total,
        page,
        limit,
        has_more: skip + limit < total,
      };
    } finally {
      await session.close();
    }
  }

  async updateEdge(id: string, updates: Partial<KnowledgeEdge>): Promise<KnowledgeEdge> {
    const session = this.getSession();

    try {
      const setClause = Object.keys(updates)
        .map(key => `e.${key} = $${key}`)
        .join(', ');

      const params = { id, updated_at: new Date().toISOString(), ...updates };

      const result = await session.run(
        `MATCH ()-[e:KnowledgeEdge {id: $id}]-() SET ${setClause}, e.updated_at = datetime($updated_at) RETURN e`,
        params
      );

      if (result.records.length === 0) throw new Error(`Edge ${id} not found`);
      return this.mapNeo4jEdge(result.records[0].get('e'));
    } finally {
      await session.close();
    }
  }

  async deleteEdge(id: string): Promise<boolean> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH ()-[e:KnowledgeEdge {id: $id}]-() DELETE e RETURN count(e) as deleted',
        { id }
      );

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  async getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        MATCH path = shortestPath(
          (start:KnowledgeNode {id: $fromId})-[rels:KnowledgeEdge*1..${maxDepth}]-(end:KnowledgeNode {id: $toId})
        )
        RETURN relationships(path) as edges
        `,
        { fromId, toId }
      );

      if (result.records.length === 0) return [];

      const edges = result.records[0].get('edges');
      return edges.map((edge: any) => this.mapNeo4jEdge(edge));
    } finally {
      await session.close();
    }
  }

  // Vector operations - simplified for Neo4j (could be enhanced with vector plugins)
  async storeVector(vector: VectorPayload): Promise<VectorPayload> {
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        CREATE (v:Vector {
          id: $id,
          embedding: $embedding,
          metadata: $metadata,
          created_at: datetime($created_at)
        })
        RETURN v
        `,
        {
          id: vector.id,
          embedding: vector.embedding,
          metadata: vector.metadata || {},
          created_at: vector.created_at?.toISOString() || new Date().toISOString(),
        }
      );

      return this.mapNeo4jVector(result.records[0].get('v'));
    } finally {
      await session.close();
    }
  }

  async getVector(id: string): Promise<VectorPayload | null> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (v:Vector {id: $id}) RETURN v',
        { id }
      );

      if (result.records.length === 0) return null;
      return this.mapNeo4jVector(result.records[0].get('v'));
    } finally {
      await session.close();
    }
  }

  async searchVectors(embedding: number[], limit = 10, filters?: Record<string, unknown>): Promise<VectorPayload[]> {
    // Simplified vector search - in production, use Neo4j vector plugins
    const session = this.getSession();

    try {
      let query = 'MATCH (v:Vector) RETURN v';
      if (filters) {
        // Add basic filtering
        const conditions = Object.keys(filters).map(key => `v.metadata.${key} = $${key}`);
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }
      query += ' LIMIT $limit';

      const params = { limit: neo4j.int(limit), ...filters };

      const result = await session.run(query, params);
      return result.records.map(record => this.mapNeo4jVector(record.get('v')));
    } finally {
      await session.close();
    }
  }

  async deleteVector(id: string): Promise<boolean> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (v:Vector {id: $id}) DELETE v RETURN count(v) as deleted',
        { id }
      );

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  async updateVectorDecay(id: string, decay_score: number): Promise<void> {
    const session = this.getSession();

    try {
      await session.run(
        'MATCH (v:Vector {id: $id}) SET v.decay_score = $decay_score',
        { id, decay_score }
      );
    } finally {
      await session.close();
    }
  }

  // Chunk operations
  async storeChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    // Simplified - in production, link to nodes
    const session = this.getSession();

    try {
      const result = await session.run(
        `
        CREATE (c:DocumentChunk {
          id: $id,
          source_id: $source_id,
          content: $content,
          embedding: $embedding,
          metadata: $metadata,
          created_at: datetime($created_at)
        })
        RETURN c
        `,
        {
          id: chunk.id,
          source_id: chunk.source_id,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: chunk.metadata || {},
          created_at: chunk.created_at?.toISOString() || new Date().toISOString(),
        }
      );

      return this.mapNeo4jChunk(result.records[0].get('c'));
    } finally {
      await session.close();
    }
  }

  async getChunksBySource(sourceId: string): Promise<DocumentChunk[]> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (c:DocumentChunk {source_id: $sourceId}) RETURN c',
        { sourceId }
      );

      return result.records.map(record => this.mapNeo4jChunk(record.get('c')));
    } finally {
      await session.close();
    }
  }

  async getChunksByConceptId(conceptId: string): Promise<DocumentChunk[]> {
    // Simplified - in production, use relationships
    return [];
  }

  async deleteChunksBySource(sourceId: string): Promise<number> {
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (c:DocumentChunk {source_id: $sourceId}) DELETE c RETURN count(c) as deleted',
        { sourceId }
      );

      return result.records[0].get('deleted').toNumber();
    } finally {
      await session.close();
    }
  }

  // Bulk operations
  async bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]> {
    const session = this.getSession();

    try {
      const results: KnowledgeNode[] = [];

      for (const node of nodes) {
        const result = await session.run(
          `
          CREATE (n:KnowledgeNode {
            id: $id,
            type: $type,
            name: $name,
            description: $description,
            level: $level,
            cognitive_state: $cognitive_state,
            temporal: $temporal,
            real_world: $real_world,
            grounding: $grounding,
            failure_surface: $failure_surface,
            canonical_name: $canonical_name,
            first_appearance_year: $first_appearance_year,
            domain: $domain,
            created_at: datetime($created_at),
            updated_at: datetime($updated_at)
          })
          RETURN n
          `,
          {
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
          }
        );

        results.push(this.mapNeo4jNode(result.records[0].get('n')));
      }

      return results;
    } finally {
      await session.close();
    }
  }

  async bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]> {
    const session = this.getSession();

    try {
      const results: KnowledgeEdge[] = [];

      for (const edge of edges) {
        const result = await session.run(
          `
          MATCH (from:KnowledgeNode {id: $from_node})
          MATCH (to:KnowledgeNode {id: $to_node})
          CREATE (from)-[e:KnowledgeEdge {
            id: $id,
            from_node: $from_node,
            to_node: $to_node,
            relation: $relation,
            weight: $weight,
            dynamics: $dynamics,
            temporal: $temporal,
            confidence: $confidence,
            created_at: datetime($created_at),
            updated_at: datetime($updated_at)
          }]->(to)
          RETURN e
          `,
          {
            id: edge.id,
            from_node: edge.from_node,
            to_node: edge.to_node,
            relation: edge.relation,
            weight: edge.weight,
            dynamics: edge.dynamics,
            temporal: edge.temporal,
            confidence: edge.confidence,
            created_at: edge.created_at?.toISOString() || new Date().toISOString(),
            updated_at: edge.updated_at?.toISOString() || new Date().toISOString(),
          }
        );

        results.push(this.mapNeo4jEdge(result.records[0].get('e')));
      }

      return results;
    } finally {
      await session.close();
    }
  }

  async clear(): Promise<void> {
    const session = this.getSession();

    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } finally {
      await session.close();
    }
  }

  // Transaction support
  async beginTransaction(): Promise<void> {
    // Neo4j transactions are handled per session
  }

  async commit(): Promise<void> {
    // Neo4j transactions are handled per session
  }

  async rollback(): Promise<void> {
    // Neo4j transactions are handled per session
  }

  // Helper methods to map Neo4j results to TypeScript types
  private mapNeo4jNode(node: any): KnowledgeNode {
    const properties = node.properties;
    return {
      id: properties.id,
      type: properties.type,
      name: properties.name,
      description: properties.description,
      level: properties.level,
      cognitive_state: properties.cognitive_state,
      temporal: properties.temporal,
      real_world: properties.real_world,
      grounding: properties.grounding,
      failure_surface: properties.failure_surface,
      canonical_name: properties.canonical_name,
      first_appearance_year: properties.first_appearance_year,
      domain: properties.domain,
      created_at: new Date(properties.created_at),
      updated_at: new Date(properties.updated_at),
    };
  }

  private mapNeo4jEdge(edge: any): KnowledgeEdge {
    const properties = edge.properties;
    return {
      id: properties.id,
      from_node: properties.from_node,
      to_node: properties.to_node,
      relation: properties.relation,
      weight: properties.weight,
      dynamics: properties.dynamics,
      temporal: properties.temporal,
      confidence: properties.confidence,
      created_at: new Date(properties.created_at),
      updated_at: new Date(properties.updated_at),
      conflicting: properties.conflicting
    };
  }

  private mapNeo4jVector(vector: any): VectorPayload {
    const properties = vector.properties;
    return {
      id: properties.id,
      embedding: properties.embedding,
      metadata: properties.metadata,
      created_at: new Date(properties.created_at),
    };
  }

  private mapNeo4jChunk(chunk: any): DocumentChunk {
    const properties = chunk.properties;
    return {
      id: properties.id,
      source_id: properties.source_id,
      content: properties.content,
      embedding: properties.embedding,
      metadata: properties.metadata,
      created_at: new Date(properties.created_at),
    };
  }
}