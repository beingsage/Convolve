/**
 * Storage Adapter Interface
 * Enables pluggable backends: MongoDB, Neo4j, Qdrant, PostgreSQL, In-Memory
 */

import {
  KnowledgeNode,
  KnowledgeEdge,
  VectorPayload,
  DocumentChunk,
  PaginatedResponse,
  StorageType,
  StorageConfig,
} from '@/lib/types';
import { InMemoryAdapter } from './adapters/memory';
import { MongoDBAdapter } from './adapters/mongodb';
import { Neo4jAdapter } from './adapters/neo4j';
import { QdrantAdapter } from './adapters/qdrant';

export interface IStorageAdapter {
  // ============================================================================
  // Initialization & Connection
  // ============================================================================
  
  /**
   * Initialize the storage adapter with connection settings
   */
  initialize(): Promise<void>;
  
  /**
   * Verify connection and health
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Close connection and cleanup
   */
  disconnect(): Promise<void>;
  
  // ============================================================================
  // Node Operations
  // ============================================================================
  
  /**
   * Create a new knowledge node
   */
  createNode(node: KnowledgeNode): Promise<KnowledgeNode>;
  
  /**
   * Get node by ID
   */
  getNode(id: string): Promise<KnowledgeNode | null>;
  
  /**
   * Search nodes by name or description
   */
  searchNodes(query: string, limit?: number): Promise<KnowledgeNode[]>;
  
  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: string, limit?: number): Promise<KnowledgeNode[]>;
  
  /**
   * Update an existing node
   */
  updateNode(id: string, updates: Partial<KnowledgeNode>): Promise<KnowledgeNode>;
  
  /**
   * Delete a node
   */
  deleteNode(id: string): Promise<boolean>;
  
  /**
   * List all nodes with pagination
   */
  listNodes(page: number, limit: number): Promise<PaginatedResponse<KnowledgeNode>>;
  
  // ============================================================================
  // Edge Operations
  // ============================================================================
  
  /**
   * Create an edge between two nodes
   */
  createEdge(edge: KnowledgeEdge): Promise<KnowledgeEdge>;
  
  /**
   * Get edge by ID
   */
  getEdge(id: string): Promise<KnowledgeEdge | null>;
  
  /**
   * Get all edges from a node
   */
  getEdgesFrom(nodeId: string): Promise<KnowledgeEdge[]>;
  
  /**
   * Get all edges to a node
   */
  getEdgesTo(nodeId: string): Promise<KnowledgeEdge[]>;
  
  /**
   * Get edges between two specific nodes
   */
  getEdgesBetween(fromId: string, toId: string): Promise<KnowledgeEdge[]>;
  
  /**
   * Get edges by relation type
   */
  getEdgesByType(relationType: string): Promise<KnowledgeEdge[]>;
  
  /**
   * List all edges with pagination
   */
  listEdges(page: number, limit: number): Promise<PaginatedResponse<KnowledgeEdge>>;
  
  /**
   * Update an edge
   */
  updateEdge(id: string, updates: Partial<KnowledgeEdge>): Promise<KnowledgeEdge>;
  
  /**
   * Delete an edge
   */
  deleteEdge(id: string): Promise<boolean>;
  
  /**
   * Get multi-hop path between two nodes (for graph reasoning)
   */
  getPath(fromId: string, toId: string, maxDepth: number): Promise<KnowledgeEdge[]>;
  
  // ============================================================================
  // Vector Operations
  // ============================================================================
  
  /**
   * Store an embedding vector
   */
  storeVector(vector: VectorPayload): Promise<VectorPayload>;
  
  /**
   * Retrieve vector by ID
   */
  getVector(id: string): Promise<VectorPayload | null>;
  
  /**
   * Search vectors by similarity (cosine distance)
   */
  searchVectors(
    embedding: number[],
    limit?: number,
    filters?: Record<string, unknown>
  ): Promise<VectorPayload[]>;
  
  /**
   * Delete a vector
   */
  deleteVector(id: string): Promise<boolean>;
  
  /**
   * Update vector decay score
   */
  updateVectorDecay(id: string, decay_score: number): Promise<void>;
  
  // ============================================================================
  // Chunk Operations (for document ingestion)
  // ============================================================================
  
  /**
   * Store a document chunk
   */
  storeChunk(chunk: DocumentChunk): Promise<DocumentChunk>;
  
  /**
   * Get chunks for a source document
   */
  getChunksBySource(sourceId: string): Promise<DocumentChunk[]>;
  
  /**
   * Get all chunks for a concept
   */
  getChunksByConceptId(conceptId: string): Promise<DocumentChunk[]>;
  
  /**
   * Delete chunks for a source (on re-ingest)
   */
  deleteChunksBySource(sourceId: string): Promise<number>;
  
  // ============================================================================
  // Bulk Operations
  // ============================================================================
  
  /**
   * Bulk create nodes
   */
  bulkCreateNodes(nodes: KnowledgeNode[]): Promise<KnowledgeNode[]>;
  
  /**
   * Bulk create edges
   */
  bulkCreateEdges(edges: KnowledgeEdge[]): Promise<KnowledgeEdge[]>;
  
  /**
   * Clear all data (for testing)
   */
  clear(): Promise<void>;
  
  // ============================================================================
  // Transaction Support
  // ============================================================================
  
  /**
   * Start a transaction
   */
  beginTransaction(): Promise<void>;
  
  /**
   * Commit current transaction
   */
  commit(): Promise<void>;
  
  /**
   * Rollback current transaction
   */
  rollback(): Promise<void>;
}

/**
 * Factory function to create appropriate storage adapter
 */
export function createStorageAdapter(type: StorageType, config: any): IStorageAdapter {
  switch (type) {
    case 'memory':
      return new InMemoryAdapter(config);
    case 'mongodb':
      return new MongoDBAdapter(config);
    case 'neo4j':
      return new Neo4jAdapter(config);
    case 'qdrant':
      return new QdrantAdapter(config);
    case 'postgres':
      // Fallback to in-memory for unimplemented adapters
      console.warn(`[UAILS] ${type} adapter not fully implemented, falling back to in-memory storage`);
      return new InMemoryAdapter(config);
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}

// Adapter implementations for Neo4j, PostgreSQL, and Qdrant will be added here
// For now, they fallback to in-memory storage

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
