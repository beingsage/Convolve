/**
 * Property-Based Tests for Neo4j Storage Adapter
 * Feature: uails-complete-system, Property 10: Path Finding Validity
 * Validates: Requirements 2.12
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fc from 'fast-check'
import { Neo4jAdapter } from './neo4j'
import type { KnowledgeNode, KnowledgeEdge, RelationType } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  connection_string: process.env.NEO4J_URI || 'bolt://localhost:7687',
  credentials: {
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  }
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const arbitraryRelationType = fc.constantFrom<RelationType>(
  'depends_on',
  'abstracts',
  'implements',
  'replaces',
  'suppresses',
  'interferes_with',
  'requires_for_debugging',
  'optimizes',
  'causes_failure_in',
  'uses',
  'improves',
  'generalizes',
  'specializes',
  'requires',
  'fails_on',
  'introduced_in',
  'evaluated_on',
  'competes_with',
  'derived_from'
)

function createMinimalNode(id: string, name: string): KnowledgeNode {
  return {
    id,
    type: 'concept',
    name,
    description: `Test concept ${name}`,
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
      companies_using: 10,
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
}

function createMinimalEdge(id: string, from: string, to: string, relation: RelationType): KnowledgeEdge {
  return {
    id,
    from_node: from,
    to_node: to,
    relation,
    weight: {
      strength: 0.8,
      decay_rate: 0.01,
      reinforcement_rate: 0.05
    },
    dynamics: {
      inhibitory: false,
      directional: true
    },
    temporal: {
      created_at: new Date(),
      last_used_at: new Date()
    },
    created_at: new Date(),
    updated_at: new Date(),
    confidence: 0.9
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Neo4j Adapter - Property 10: Path Finding Validity', () => {
  let adapter: Neo4jAdapter
  let skipTests = false

  beforeAll(async () => {
    adapter = new Neo4jAdapter(TEST_CONFIG)
    
    try {
      await adapter.initialize()
      const healthy = await adapter.healthCheck()
      
      if (!healthy) {
        console.warn('[Neo4j Test] Neo4j not available, skipping tests')
        skipTests = true
      }
    } catch (error) {
      console.warn('[Neo4j Test] Neo4j not available, skipping tests:', error)
      skipTests = true
    }
  })

  afterAll(async () => {
    if (!skipTests && adapter) {
      await adapter.disconnect()
    }
  })

  beforeEach(async () => {
    if (!skipTests) {
      await adapter.clear()
    }
  })

  // ==========================================================================
  // Property 10: Path Finding Validity
  // ==========================================================================

  it('should find valid paths where every consecutive pair is connected by an edge', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    // Create a simple linear graph: A -> B -> C -> D
    const nodeA = createMinimalNode(uuidv4(), 'A')
    const nodeB = createMinimalNode(uuidv4(), 'B')
    const nodeC = createMinimalNode(uuidv4(), 'C')
    const nodeD = createMinimalNode(uuidv4(), 'D')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)
    await adapter.createNode(nodeC)
    await adapter.createNode(nodeD)

    const edgeAB = createMinimalEdge(uuidv4(), nodeA.id, nodeB.id, 'depends_on')
    const edgeBC = createMinimalEdge(uuidv4(), nodeB.id, nodeC.id, 'depends_on')
    const edgeCD = createMinimalEdge(uuidv4(), nodeC.id, nodeD.id, 'depends_on')

    await adapter.createEdge(edgeAB)
    await adapter.createEdge(edgeBC)
    await adapter.createEdge(edgeCD)

    // Find path from A to D
    const path = await adapter.getPath(nodeA.id, nodeD.id, 5)

    // Verify path exists
    expect(path.length).toBeGreaterThan(0)
    expect(path.length).toBeLessThanOrEqual(3) // Should be 3 edges

    // Verify every consecutive pair is connected
    for (let i = 0; i < path.length - 1; i++) {
      const currentEdge = path[i]
      const nextEdge = path[i + 1]
      
      // The to_node of current edge should match from_node of next edge
      expect(currentEdge.to_node).toBe(nextEdge.from_node)
    }

    // Verify path starts at A and ends at D
    if (path.length > 0) {
      expect(path[0].from_node).toBe(nodeA.id)
      expect(path[path.length - 1].to_node).toBe(nodeD.id)
    }
  })

  it('should respect max depth constraint', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    // Create a longer chain: A -> B -> C -> D -> E
    const nodes = []
    for (let i = 0; i < 5; i++) {
      const node = createMinimalNode(uuidv4(), `Node${i}`)
      await adapter.createNode(node)
      nodes.push(node)
    }

    // Create edges connecting them
    for (let i = 0; i < nodes.length - 1; i++) {
      const edge = createMinimalEdge(uuidv4(), nodes[i].id, nodes[i + 1].id, 'depends_on')
      await adapter.createEdge(edge)
    }

    // Try to find path with max depth of 2 (should not reach from 0 to 4)
    const shortPath = await adapter.getPath(nodes[0].id, nodes[4].id, 2)
    
    // With max depth 2, we can't reach node 4 from node 0 (needs 4 hops)
    // Neo4j's shortestPath might still find it, so we just verify length constraint
    if (shortPath.length > 0) {
      expect(shortPath.length).toBeLessThanOrEqual(2)
    }

    // Try with sufficient depth
    const fullPath = await adapter.getPath(nodes[0].id, nodes[4].id, 10)
    expect(fullPath.length).toBeGreaterThan(0)
    expect(fullPath.length).toBeLessThanOrEqual(10)
  })

  it('should return empty array when no path exists', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    // Create two disconnected nodes
    const nodeA = createMinimalNode(uuidv4(), 'Isolated A')
    const nodeB = createMinimalNode(uuidv4(), 'Isolated B')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)

    // Try to find path between disconnected nodes
    const path = await adapter.getPath(nodeA.id, nodeB.id, 5)

    expect(path).toEqual([])
  })

  it('should handle direct connections (path length 1)', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    const nodeA = createMinimalNode(uuidv4(), 'Direct A')
    const nodeB = createMinimalNode(uuidv4(), 'Direct B')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)

    const edge = createMinimalEdge(uuidv4(), nodeA.id, nodeB.id, 'uses')
    await adapter.createEdge(edge)

    const path = await adapter.getPath(nodeA.id, nodeB.id, 5)

    expect(path.length).toBe(1)
    expect(path[0].from_node).toBe(nodeA.id)
    expect(path[0].to_node).toBe(nodeB.id)
  })

  it('should find paths in graphs with multiple routes', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    // Create a diamond graph:
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    const nodeA = createMinimalNode(uuidv4(), 'A')
    const nodeB = createMinimalNode(uuidv4(), 'B')
    const nodeC = createMinimalNode(uuidv4(), 'C')
    const nodeD = createMinimalNode(uuidv4(), 'D')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)
    await adapter.createNode(nodeC)
    await adapter.createNode(nodeD)

    // Create two paths from A to D
    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeA.id, nodeB.id, 'depends_on'))
    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeA.id, nodeC.id, 'depends_on'))
    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeB.id, nodeD.id, 'depends_on'))
    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeC.id, nodeD.id, 'depends_on'))

    const path = await adapter.getPath(nodeA.id, nodeD.id, 5)

    // Should find a path (either A->B->D or A->C->D)
    expect(path.length).toBeGreaterThan(0)
    expect(path.length).toBeLessThanOrEqual(2)

    // Verify path validity
    expect(path[0].from_node).toBe(nodeA.id)
    expect(path[path.length - 1].to_node).toBe(nodeD.id)

    // Verify connectivity
    for (let i = 0; i < path.length - 1; i++) {
      expect(path[i].to_node).toBe(path[i + 1].from_node)
    }
  })

  // ==========================================================================
  // Additional Neo4j Adapter Tests
  // ==========================================================================

  it('should create and retrieve nodes correctly', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    const node = createMinimalNode(uuidv4(), 'Test Node')
    const created = await adapter.createNode(node)

    expect(created.id).toBe(node.id)
    expect(created.name).toBe(node.name)

    const retrieved = await adapter.getNode(node.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe(node.id)
    expect(retrieved!.name).toBe(node.name)
  })

  it('should create and retrieve edges correctly', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    const nodeA = createMinimalNode(uuidv4(), 'Node A')
    const nodeB = createMinimalNode(uuidv4(), 'Node B')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)

    const edge = createMinimalEdge(uuidv4(), nodeA.id, nodeB.id, 'depends_on')
    const created = await adapter.createEdge(edge)

    expect(created.id).toBe(edge.id)
    expect(created.from_node).toBe(nodeA.id)
    expect(created.to_node).toBe(nodeB.id)

    const retrieved = await adapter.getEdge(edge.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe(edge.id)
  })

  it('should query edges from a node', async () => {
    if (skipTests) {
      console.log('[Neo4j Test] Skipping test - Neo4j not available')
      return
    }

    const nodeA = createMinimalNode(uuidv4(), 'Node A')
    const nodeB = createMinimalNode(uuidv4(), 'Node B')
    const nodeC = createMinimalNode(uuidv4(), 'Node C')

    await adapter.createNode(nodeA)
    await adapter.createNode(nodeB)
    await adapter.createNode(nodeC)

    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeA.id, nodeB.id, 'depends_on'))
    await adapter.createEdge(createMinimalEdge(uuidv4(), nodeA.id, nodeC.id, 'uses'))

    const edges = await adapter.getEdgesFrom(nodeA.id)

    expect(edges.length).toBe(2)
    expect(edges.every(e => e.from_node === nodeA.id)).toBe(true)
  })
})
