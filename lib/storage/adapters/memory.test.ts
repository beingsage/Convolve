/**
 * Property-Based Tests for In-Memory Storage Adapter
 * Feature: uails-complete-system
 * - Property 1: Node Creation Completeness
 * - Property 2: Node Round-Trip Consistency
 * - Property 7: Node Deletion Completeness
 * Validates: Requirements 1.1-1.13
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { InMemoryAdapter } from './memory'
import type { KnowledgeNode, StorageConfig, NodeType } from '@/lib/types'

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig: StorageConfig = {
  type: 'memory'
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const VALID_NODE_TYPES: NodeType[] = [
  'concept',
  'algorithm',
  'system',
  'api',
  'paper',
  'tool',
  'failure_mode',
  'optimization',
  'abstraction'
]

const arbitraryNodeType = fc.constantFrom(...VALID_NODE_TYPES)

const arbitraryKnowledgeNode = fc.record({
  id: fc.uuid(),
  type: arbitraryNodeType,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  level: fc.record({
    abstraction: fc.float({ min: 0, max: 1, noNaN: true }),
    difficulty: fc.float({ min: 0, max: 1, noNaN: true }),
    volatility: fc.float({ min: 0, max: 1, noNaN: true })
  }),
  cognitive_state: fc.record({
    strength: fc.float({ min: 0, max: 1, noNaN: true }),
    activation: fc.float({ min: 0, max: 1, noNaN: true }),
    decay_rate: fc.float({ min: 0, max: Math.fround(0.1), noNaN: true }),
    confidence: fc.float({ min: 0, max: 1, noNaN: true })
  }),
  temporal: fc.record({
    introduced_at: fc.date(),
    last_reinforced_at: fc.date(),
    peak_relevance_at: fc.date()
  }),
  real_world: fc.record({
    used_in_production: fc.boolean(),
    companies_using: fc.nat({ max: 10000 }),
    avg_salary_weight: fc.float({ min: 0, max: 1, noNaN: true }),
    interview_frequency: fc.float({ min: 0, max: 1, noNaN: true })
  }),
  grounding: fc.record({
    source_refs: fc.array(fc.webUrl(), { maxLength: 5 }),
    implementation_refs: fc.array(fc.webUrl(), { maxLength: 5 })
  }),
  failure_surface: fc.record({
    common_bugs: fc.array(fc.uuid(), { maxLength: 5 }),
    misconceptions: fc.array(fc.uuid(), { maxLength: 5 })
  }),
  created_at: fc.date(),
  updated_at: fc.date()
})

// ============================================================================
// Property Tests
// ============================================================================

describe('InMemoryAdapter - Property 1: Node Creation Completeness', () => {
  let adapter: InMemoryAdapter

  beforeEach(async () => {
    adapter = new InMemoryAdapter(testConfig)
    await adapter.initialize()
  })

  afterEach(async () => {
    await adapter.disconnect()
  })

  // Feature: uails-complete-system, Property 1: Node Creation Completeness
  it('should store nodes with all required fields: identity, level metrics, cognitive state, temporal, real_world, grounding, failure_surface', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryKnowledgeNode, async (node) => {
        // Create the node
        const created = await adapter.createNode(node)

        // Verify identity fields (Requirement 1.1)
        expect(created.id).toBeDefined()
        expect(typeof created.id).toBe('string')
        expect(created.type).toBeDefined()
        expect(VALID_NODE_TYPES).toContain(created.type)
        expect(created.name).toBeDefined()
        expect(typeof created.name).toBe('string')
        expect(created.description).toBeDefined()
        expect(typeof created.description).toBe('string')

        // Verify level metrics are in [0, 1] (Requirement 1.2)
        expect(created.level).toBeDefined()
        expect(created.level.abstraction).toBeGreaterThanOrEqual(0)
        expect(created.level.abstraction).toBeLessThanOrEqual(1)
        expect(created.level.difficulty).toBeGreaterThanOrEqual(0)
        expect(created.level.difficulty).toBeLessThanOrEqual(1)
        expect(created.level.volatility).toBeGreaterThanOrEqual(0)
        expect(created.level.volatility).toBeLessThanOrEqual(1)

        // Verify cognitive state (Requirement 1.3)
        expect(created.cognitive_state).toBeDefined()
        expect(created.cognitive_state.strength).toBeGreaterThanOrEqual(0)
        expect(created.cognitive_state.strength).toBeLessThanOrEqual(1)
        expect(created.cognitive_state.activation).toBeGreaterThanOrEqual(0)
        expect(created.cognitive_state.activation).toBeLessThanOrEqual(1)
        expect(created.cognitive_state.decay_rate).toBeGreaterThanOrEqual(0)
        expect(created.cognitive_state.confidence).toBeGreaterThanOrEqual(0)
        expect(created.cognitive_state.confidence).toBeLessThanOrEqual(1)

        // Verify temporal metadata (Requirement 1.4)
        expect(created.temporal).toBeDefined()
        expect(created.temporal.introduced_at).toBeInstanceOf(Date)
        expect(created.temporal.last_reinforced_at).toBeInstanceOf(Date)
        expect(created.temporal.peak_relevance_at).toBeInstanceOf(Date)

        // Verify real-world metrics (Requirement 1.5)
        expect(created.real_world).toBeDefined()
        expect(typeof created.real_world.used_in_production).toBe('boolean')
        expect(created.real_world.companies_using).toBeGreaterThanOrEqual(0)
        expect(created.real_world.avg_salary_weight).toBeGreaterThanOrEqual(0)
        expect(created.real_world.avg_salary_weight).toBeLessThanOrEqual(1)
        expect(created.real_world.interview_frequency).toBeGreaterThanOrEqual(0)
        expect(created.real_world.interview_frequency).toBeLessThanOrEqual(1)

        // Verify grounding information (Requirement 1.6)
        expect(created.grounding).toBeDefined()
        expect(Array.isArray(created.grounding.source_refs)).toBe(true)
        expect(Array.isArray(created.grounding.implementation_refs)).toBe(true)

        // Verify failure surface data (Requirement 1.7)
        expect(created.failure_surface).toBeDefined()
        expect(Array.isArray(created.failure_surface.common_bugs)).toBe(true)
        expect(Array.isArray(created.failure_surface.misconceptions)).toBe(true)

        // Verify metadata timestamps are set
        expect(created.created_at).toBeInstanceOf(Date)
        expect(created.updated_at).toBeInstanceOf(Date)
      }),
      { numRuns: 100 }
    )
  })

  it('should accept all 9 valid node types (Requirement 1.8)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryNodeType, async (nodeType) => {
        const node: KnowledgeNode = {
          id: fc.sample(fc.uuid(), 1)[0],
          type: nodeType,
          name: 'Test Node',
          description: 'Test description for node',
          level: {
            abstraction: 0.5,
            difficulty: 0.5,
            volatility: 0.5
          },
          cognitive_state: {
            strength: 0.8,
            activation: 0.5,
            decay_rate: 0.01,
            confidence: 0.9
          },
          temporal: {
            introduced_at: new Date(),
            last_reinforced_at: new Date(),
            peak_relevance_at: new Date()
          },
          real_world: {
            used_in_production: true,
            companies_using: 100,
            avg_salary_weight: 0.7,
            interview_frequency: 0.6
          },
          grounding: {
            source_refs: [],
            implementation_refs: []
          },
          failure_surface: {
            common_bugs: [],
            misconceptions: []
          },
          created_at: new Date(),
          updated_at: new Date()
        }

        const created = await adapter.createNode(node)
        expect(created.type).toBe(nodeType)
        expect(VALID_NODE_TYPES).toContain(created.type)
      }),
      { numRuns: 100 }
    )
  })
})

describe('InMemoryAdapter - Property 2: Node Round-Trip Consistency', () => {
  let adapter: InMemoryAdapter

  beforeEach(async () => {
    adapter = new InMemoryAdapter(testConfig)
    await adapter.initialize()
  })

  afterEach(async () => {
    await adapter.disconnect()
  })

  // Feature: uails-complete-system, Property 2: Node Round-Trip Consistency
  it('should preserve node data through create-retrieve cycle (Requirement 1.9)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryKnowledgeNode, async (node) => {
        // Create the node
        const created = await adapter.createNode(node)

        // Retrieve the node
        const retrieved = await adapter.getNode(created.id)

        // Verify node was retrieved
        expect(retrieved).not.toBeNull()
        expect(retrieved).toBeDefined()

        // Verify identity fields match
        expect(retrieved!.id).toBe(created.id)
        expect(retrieved!.type).toBe(node.type)
        expect(retrieved!.name).toBe(node.name)
        expect(retrieved!.description).toBe(node.description)

        // Verify level metrics match
        expect(retrieved!.level.abstraction).toBe(node.level.abstraction)
        expect(retrieved!.level.difficulty).toBe(node.level.difficulty)
        expect(retrieved!.level.volatility).toBe(node.level.volatility)

        // Verify cognitive state matches
        expect(retrieved!.cognitive_state.strength).toBe(node.cognitive_state.strength)
        expect(retrieved!.cognitive_state.activation).toBe(node.cognitive_state.activation)
        expect(retrieved!.cognitive_state.decay_rate).toBe(node.cognitive_state.decay_rate)
        expect(retrieved!.cognitive_state.confidence).toBe(node.cognitive_state.confidence)

        // Verify temporal metadata matches (dates)
        expect(retrieved!.temporal.introduced_at.getTime()).toBe(node.temporal.introduced_at.getTime())
        expect(retrieved!.temporal.last_reinforced_at.getTime()).toBe(node.temporal.last_reinforced_at.getTime())
        expect(retrieved!.temporal.peak_relevance_at.getTime()).toBe(node.temporal.peak_relevance_at.getTime())

        // Verify real-world metrics match
        expect(retrieved!.real_world.used_in_production).toBe(node.real_world.used_in_production)
        expect(retrieved!.real_world.companies_using).toBe(node.real_world.companies_using)
        expect(retrieved!.real_world.avg_salary_weight).toBe(node.real_world.avg_salary_weight)
        expect(retrieved!.real_world.interview_frequency).toBe(node.real_world.interview_frequency)

        // Verify grounding matches
        expect(retrieved!.grounding.source_refs).toEqual(node.grounding.source_refs)
        expect(retrieved!.grounding.implementation_refs).toEqual(node.grounding.implementation_refs)

        // Verify failure surface matches
        expect(retrieved!.failure_surface.common_bugs).toEqual(node.failure_surface.common_bugs)
        expect(retrieved!.failure_surface.misconceptions).toEqual(node.failure_surface.misconceptions)
      }),
      { numRuns: 100 }
    )
  })

  it('should return null for non-existent node IDs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (nonExistentId) => {
        const retrieved = await adapter.getNode(nonExistentId)
        expect(retrieved).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
})

describe('InMemoryAdapter - Property 7: Node Deletion Completeness', () => {
  let adapter: InMemoryAdapter

  beforeEach(async () => {
    adapter = new InMemoryAdapter(testConfig)
    await adapter.initialize()
  })

  afterEach(async () => {
    await adapter.disconnect()
  })

  // Feature: uails-complete-system, Property 7: Node Deletion Completeness
  it('should remove node completely so retrieval returns null (Requirement 1.13)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryKnowledgeNode, async (node) => {
        // Create the node
        const created = await adapter.createNode(node)

        // Verify node exists
        const beforeDelete = await adapter.getNode(created.id)
        expect(beforeDelete).not.toBeNull()

        // Delete the node
        const deleteResult = await adapter.deleteNode(created.id)
        expect(deleteResult).toBe(true)

        // Verify node no longer exists
        const afterDelete = await adapter.getNode(created.id)
        expect(afterDelete).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  it('should return false when deleting non-existent nodes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (nonExistentId) => {
        const deleteResult = await adapter.deleteNode(nonExistentId)
        expect(deleteResult).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should handle multiple deletions of the same node', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryKnowledgeNode, async (node) => {
        // Create the node
        const created = await adapter.createNode(node)

        // First deletion should succeed
        const firstDelete = await adapter.deleteNode(created.id)
        expect(firstDelete).toBe(true)

        // Second deletion should return false (already deleted)
        const secondDelete = await adapter.deleteNode(created.id)
        expect(secondDelete).toBe(false)

        // Node should still be null
        const retrieved = await adapter.getNode(created.id)
        expect(retrieved).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
})

describe('InMemoryAdapter - Additional Node Operations', () => {
  let adapter: InMemoryAdapter

  beforeEach(async () => {
    adapter = new InMemoryAdapter(testConfig)
    await adapter.initialize()
  })

  afterEach(async () => {
    await adapter.disconnect()
  })

  it('should search nodes by name or description (Requirement 1.10)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryKnowledgeNode, { minLength: 5, maxLength: 20 }),
        async (nodes) => {
          // Create all nodes
          for (const node of nodes) {
            await adapter.createNode(node)
          }

          // Pick a random node to search for
          const targetNode = nodes[0]
          const searchTerm = targetNode.name.substring(0, 5).toLowerCase()

          // Search for nodes
          const results = await adapter.searchNodes(searchTerm)

          // All results should contain the search term in name or description
          results.forEach(result => {
            const nameMatch = result.name.toLowerCase().includes(searchTerm)
            const descMatch = result.description.toLowerCase().includes(searchTerm)
            const canonicalMatch = result.canonical_name?.toLowerCase().includes(searchTerm) || false
            expect(nameMatch || descMatch || canonicalMatch).toBe(true)
          })
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    )
  })

  it('should filter nodes by type (Requirement 1.11)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryKnowledgeNode, { minLength: 10, maxLength: 30 }),
        arbitraryNodeType,
        async (nodes, filterType) => {
          // Create all nodes
          for (const node of nodes) {
            await adapter.createNode(node)
          }

          // Filter by type
          const results = await adapter.getNodesByType(filterType)

          // All results should have the specified type
          results.forEach(result => {
            expect(result.type).toBe(filterType)
          })
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    )
  })

  it('should preserve ID and update timestamp on node update (Requirement 1.12)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryKnowledgeNode, async (node) => {
        // Create the node
        const created = await adapter.createNode(node)
        const originalId = created.id
        const originalUpdatedAt = created.updated_at

        // Wait a tiny bit to ensure timestamp changes
        await new Promise(resolve => setTimeout(resolve, 10))

        // Update the node
        const updates = { name: 'Updated Name' }
        const updated = await adapter.updateNode(created.id, updates)

        // Verify ID is preserved
        expect(updated.id).toBe(originalId)

        // Verify name was updated
        expect(updated.name).toBe('Updated Name')

        // Verify updated_at timestamp changed
        expect(updated.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      }),
      { numRuns: 100 }
    )
  })
})
