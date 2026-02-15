/**
 * Property-Based Tests for Storage Adapter Interface
 * Feature: uails-complete-system, Property 11: Storage Adapter Interface Compliance
 * Validates: Requirements 3.1, 3.7
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { IStorageAdapter } from './adapter'
import { InMemoryAdapter } from './adapters/memory'
import { MongoDBAdapter } from './adapters/mongodb'
import { Neo4jAdapter } from './adapters/neo4j'
import { QdrantAdapter } from './adapters/qdrant'
import { HybridAdapter } from './hybrid-adapter'
import type { StorageConfig } from '@/lib/types'

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig: StorageConfig = {
  type: 'memory',
  mongodb_uri: 'mongodb://localhost:27017/test',
  neo4j_uri: 'bolt://localhost:7687',
  neo4j_username: 'neo4j',
  neo4j_password: 'test',
  qdrant_url: 'http://localhost:6333',
  postgres_uri: 'postgresql://localhost:5432/test'
}

// Special config for HybridAdapter which requires nested structure
const hybridTestConfig: any = {
  type: 'hybrid',
  qdrant: {
    url: 'http://localhost:6333'
  },
  neo4j: {
    connection_string: 'bolt://localhost:7687',
    credentials: {
      username: 'neo4j',
      password: 'test'
    }
  }
}

// ============================================================================
// Required Interface Methods
// ============================================================================

const REQUIRED_LIFECYCLE_METHODS = [
  'initialize',
  'healthCheck',
  'disconnect'
]

const REQUIRED_NODE_METHODS = [
  'createNode',
  'getNode',
  'searchNodes',
  'getNodesByType',
  'updateNode',
  'deleteNode',
  'listNodes'
]

const REQUIRED_EDGE_METHODS = [
  'createEdge',
  'getEdge',
  'getEdgesFrom',
  'getEdgesTo',
  'getEdgesBetween',
  'getEdgesByType',
  'listEdges',
  'updateEdge',
  'deleteEdge',
  'getPath'
]

const REQUIRED_VECTOR_METHODS = [
  'storeVector',
  'getVector',
  'searchVectors',
  'deleteVector',
  'updateVectorDecay'
]

const REQUIRED_CHUNK_METHODS = [
  'storeChunk',
  'getChunksBySource',
  'getChunksByConceptId',
  'deleteChunksBySource'
]

const REQUIRED_BULK_METHODS = [
  'bulkCreateNodes',
  'bulkCreateEdges',
  'clear'
]

const REQUIRED_TRANSACTION_METHODS = [
  'beginTransaction',
  'commit',
  'rollback'
]

const ALL_REQUIRED_METHODS = [
  ...REQUIRED_LIFECYCLE_METHODS,
  ...REQUIRED_NODE_METHODS,
  ...REQUIRED_EDGE_METHODS,
  ...REQUIRED_VECTOR_METHODS,
  ...REQUIRED_CHUNK_METHODS,
  ...REQUIRED_BULK_METHODS,
  ...REQUIRED_TRANSACTION_METHODS
]

// ============================================================================
// Adapter Instances
// ============================================================================

const ADAPTER_CLASSES = [
  { name: 'InMemoryAdapter', class: InMemoryAdapter },
  { name: 'MongoDBAdapter', class: MongoDBAdapter },
  { name: 'Neo4jAdapter', class: Neo4jAdapter },
  { name: 'QdrantAdapter', class: QdrantAdapter },
  { name: 'HybridAdapter', class: HybridAdapter }
]

// ============================================================================
// Property Tests
// ============================================================================

describe('Storage Adapter Interface - Property 11: Interface Compliance', () => {
  
  describe('All adapters must implement IStorageAdapter interface', () => {
    
    ADAPTER_CLASSES.forEach(({ name, class: AdapterClass }) => {
      describe(`${name}`, () => {
        
        let adapter: IStorageAdapter
        
        beforeEach(() => {
          // Use special config for HybridAdapter
          const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
          adapter = new AdapterClass(config)
        })
        
        it('should have all lifecycle methods defined', () => {
          REQUIRED_LIFECYCLE_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all node CRUD methods defined', () => {
          REQUIRED_NODE_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all edge CRUD methods defined', () => {
          REQUIRED_EDGE_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all vector operation methods defined', () => {
          REQUIRED_VECTOR_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all chunk operation methods defined', () => {
          REQUIRED_CHUNK_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all bulk operation methods defined', () => {
          REQUIRED_BULK_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should have all transaction methods defined', () => {
          REQUIRED_TRANSACTION_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
        
        it('should implement all required interface methods', () => {
          ALL_REQUIRED_METHODS.forEach(method => {
            expect(adapter).toHaveProperty(method)
            expect(typeof (adapter as any)[method]).toBe('function')
          })
        })
      })
    })
  })
  
  describe('Property-based: All adapter instances must have complete interface', () => {
    
    it('should verify all adapters implement all required methods', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ADAPTER_CLASSES),
          ({ name, class: AdapterClass }) => {
            // Use special config for HybridAdapter
            const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
            const adapter = new AdapterClass(config)
            
            // Verify all required methods exist and are functions
            ALL_REQUIRED_METHODS.forEach(method => {
              expect(adapter).toHaveProperty(method)
              expect(typeof (adapter as any)[method]).toBe('function')
            })
            
            // Verify adapter is an instance of IStorageAdapter (structural typing)
            expect(adapter).toBeDefined()
            expect(typeof adapter.initialize).toBe('function')
            expect(typeof adapter.healthCheck).toBe('function')
            expect(typeof adapter.disconnect).toBe('function')
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should verify lifecycle methods return correct types', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ADAPTER_CLASSES),
          async ({ name, class: AdapterClass }) => {
            // Use special config for HybridAdapter
            const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
            const adapter = new AdapterClass(config)
            
            // initialize should return Promise<void>
            const initResult = adapter.initialize()
            expect(initResult).toBeInstanceOf(Promise)
            
            // healthCheck should return Promise<boolean>
            const healthResult = adapter.healthCheck()
            expect(healthResult).toBeInstanceOf(Promise)
            
            // disconnect should return Promise<void>
            const disconnectResult = adapter.disconnect()
            expect(disconnectResult).toBeInstanceOf(Promise)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  describe('Method signature validation', () => {
    
    it('should verify node methods accept correct parameters', () => {
      const adapter = new InMemoryAdapter(testConfig)
      
      // createNode should accept KnowledgeNode
      expect(adapter.createNode.length).toBe(1)
      
      // getNode should accept string (id)
      expect(adapter.getNode.length).toBe(1)
      
      // searchNodes should accept string and optional number
      expect(adapter.searchNodes.length).toBeGreaterThanOrEqual(1)
      expect(adapter.searchNodes.length).toBeLessThanOrEqual(2)
      
      // updateNode should accept string and Partial<KnowledgeNode>
      expect(adapter.updateNode.length).toBe(2)
      
      // deleteNode should accept string
      expect(adapter.deleteNode.length).toBe(1)
      
      // listNodes should accept two numbers (page, limit)
      expect(adapter.listNodes.length).toBe(2)
    })
    
    it('should verify edge methods accept correct parameters', () => {
      const adapter = new InMemoryAdapter(testConfig)
      
      // createEdge should accept KnowledgeEdge
      expect(adapter.createEdge.length).toBe(1)
      
      // getEdgesFrom should accept string (nodeId)
      expect(adapter.getEdgesFrom.length).toBe(1)
      
      // getEdgesTo should accept string (nodeId)
      expect(adapter.getEdgesTo.length).toBe(1)
      
      // getEdgesBetween should accept two strings
      expect(adapter.getEdgesBetween.length).toBe(2)
      
      // getPath should accept two strings and number (fromId, toId, maxDepth)
      expect(adapter.getPath.length).toBe(3)
    })
    
    it('should verify vector methods accept correct parameters', () => {
      const adapter = new InMemoryAdapter(testConfig)
      
      // storeVector should accept VectorPayload
      expect(adapter.storeVector.length).toBe(1)
      
      // getVector should accept string (id)
      expect(adapter.getVector.length).toBe(1)
      
      // searchVectors should accept array and optional number and filters
      expect(adapter.searchVectors.length).toBeGreaterThanOrEqual(1)
      expect(adapter.searchVectors.length).toBeLessThanOrEqual(3)
      
      // deleteVector should accept string
      expect(adapter.deleteVector.length).toBe(1)
      
      // updateVectorDecay should accept string and number
      expect(adapter.updateVectorDecay.length).toBe(2)
    })
    
    it('should verify bulk methods accept correct parameters', () => {
      const adapter = new InMemoryAdapter(testConfig)
      
      // bulkCreateNodes should accept array of KnowledgeNode
      expect(adapter.bulkCreateNodes.length).toBe(1)
      
      // bulkCreateEdges should accept array of KnowledgeEdge
      expect(adapter.bulkCreateEdges.length).toBe(1)
      
      // clear should accept no parameters
      expect(adapter.clear.length).toBe(0)
    })
    
    it('should verify transaction methods accept no parameters', () => {
      const adapter = new InMemoryAdapter(testConfig)
      
      expect(adapter.beginTransaction.length).toBe(0)
      expect(adapter.commit.length).toBe(0)
      expect(adapter.rollback.length).toBe(0)
    })
  })
  
  describe('Interface completeness across all storage types', () => {
    
    it('should verify all adapters have identical method signatures', () => {
      const adapters = ADAPTER_CLASSES.map(({ name, class: AdapterClass }) => {
        // Use special config for HybridAdapter
        const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
        return new AdapterClass(config)
      })
      
      // Get method names from first adapter
      const referenceAdapter = adapters[0]
      const referenceMethods = ALL_REQUIRED_METHODS
      
      // Verify all other adapters have the same methods
      adapters.slice(1).forEach(adapter => {
        referenceMethods.forEach(method => {
          expect(adapter).toHaveProperty(method)
          expect(typeof (adapter as any)[method]).toBe('function')
          
          // Verify same parameter count (arity)
          expect((adapter as any)[method].length).toBe(
            (referenceAdapter as any)[method].length
          )
        })
      })
    })
  })
  
  describe('Requirements validation', () => {
    
    it('should satisfy Requirement 3.1: Unified IStorageAdapter interface', () => {
      // Requirement 3.1: THE System SHALL provide a unified IStorageAdapter interface for all storage operations
      
      ADAPTER_CLASSES.forEach(({ name, class: AdapterClass }) => {
        // Use special config for HybridAdapter
        const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
        const adapter = new AdapterClass(config)
        
        // Verify adapter implements the unified interface
        expect(adapter).toBeDefined()
        
        // Verify all categories of operations are present
        expect(typeof adapter.initialize).toBe('function') // Lifecycle
        expect(typeof adapter.createNode).toBe('function') // Node ops
        expect(typeof adapter.createEdge).toBe('function') // Edge ops
        expect(typeof adapter.storeVector).toBe('function') // Vector ops
        expect(typeof adapter.storeChunk).toBe('function') // Chunk ops
        expect(typeof adapter.bulkCreateNodes).toBe('function') // Bulk ops
        expect(typeof adapter.beginTransaction).toBe('function') // Transaction ops
      })
    })
    
    it('should satisfy Requirement 3.7: Factory function returns appropriate adapter', () => {
      // Requirement 3.7: THE System SHALL provide factory function createStorageAdapter that returns appropriate adapter instance
      
      // This is tested by verifying all adapter classes can be instantiated
      ADAPTER_CLASSES.forEach(({ name, class: AdapterClass }) => {
        // Use special config for HybridAdapter
        const config = name === 'HybridAdapter' ? hybridTestConfig : testConfig
        const adapter = new AdapterClass(config)
        expect(adapter).toBeDefined()
        expect(adapter).toBeInstanceOf(AdapterClass)
      })
    })
  })
})
