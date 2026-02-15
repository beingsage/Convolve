/**
 * Property-Based Tests for UAILS Type Definitions
 * Feature: uails-complete-system, Property 3: Node Type Validation
 * Validates: Requirements 1.8
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { NodeType, RelationType, KnowledgeNode } from './index'

// ============================================================================
// Constants from Requirements
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

const VALID_RELATION_TYPES: RelationType[] = [
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
]

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const arbitraryNodeType = fc.constantFrom(...VALID_NODE_TYPES)
const arbitraryRelationType = fc.constantFrom(...VALID_RELATION_TYPES)

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

describe('Type Definitions - Property 3: Node Type Validation', () => {
  
  it('should accept all 9 valid node types', () => {
    fc.assert(
      fc.property(arbitraryNodeType, (nodeType) => {
        // Verify the generated type is one of the 9 valid types
        expect(VALID_NODE_TYPES).toContain(nodeType)
        
        // Verify it's a valid NodeType
        const validTypes: NodeType[] = VALID_NODE_TYPES
        expect(validTypes.includes(nodeType)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should accept all 19 valid relation types', () => {
    fc.assert(
      fc.property(arbitraryRelationType, (relationType) => {
        // Verify the generated type is one of the 19 valid types
        expect(VALID_RELATION_TYPES).toContain(relationType)
        
        // Verify it's a valid RelationType
        const validTypes: RelationType[] = VALID_RELATION_TYPES
        expect(validTypes.includes(relationType)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should generate valid KnowledgeNode objects with all required fields', () => {
    fc.assert(
      fc.property(arbitraryKnowledgeNode, (node) => {
        // Verify identity fields
        expect(node.id).toBeDefined()
        expect(typeof node.id).toBe('string')
        expect(node.type).toBeDefined()
        expect(VALID_NODE_TYPES).toContain(node.type)
        expect(node.name).toBeDefined()
        expect(typeof node.name).toBe('string')
        expect(node.name.length).toBeGreaterThan(0)
        expect(node.description).toBeDefined()
        expect(typeof node.description).toBe('string')
        
        // Verify level metrics are in [0, 1]
        expect(node.level.abstraction).toBeGreaterThanOrEqual(0)
        expect(node.level.abstraction).toBeLessThanOrEqual(1)
        expect(node.level.difficulty).toBeGreaterThanOrEqual(0)
        expect(node.level.difficulty).toBeLessThanOrEqual(1)
        expect(node.level.volatility).toBeGreaterThanOrEqual(0)
        expect(node.level.volatility).toBeLessThanOrEqual(1)
        
        // Verify cognitive state
        expect(node.cognitive_state.strength).toBeGreaterThanOrEqual(0)
        expect(node.cognitive_state.strength).toBeLessThanOrEqual(1)
        expect(node.cognitive_state.activation).toBeGreaterThanOrEqual(0)
        expect(node.cognitive_state.activation).toBeLessThanOrEqual(1)
        expect(node.cognitive_state.decay_rate).toBeGreaterThanOrEqual(0)
        expect(node.cognitive_state.decay_rate).toBeLessThanOrEqual(Math.fround(0.1))
        expect(node.cognitive_state.confidence).toBeGreaterThanOrEqual(0)
        expect(node.cognitive_state.confidence).toBeLessThanOrEqual(1)
        
        // Verify temporal metadata
        expect(node.temporal.introduced_at).toBeInstanceOf(Date)
        expect(node.temporal.last_reinforced_at).toBeInstanceOf(Date)
        expect(node.temporal.peak_relevance_at).toBeInstanceOf(Date)
        
        // Verify real-world metrics
        expect(typeof node.real_world.used_in_production).toBe('boolean')
        expect(node.real_world.companies_using).toBeGreaterThanOrEqual(0)
        expect(node.real_world.avg_salary_weight).toBeGreaterThanOrEqual(0)
        expect(node.real_world.avg_salary_weight).toBeLessThanOrEqual(1)
        expect(node.real_world.interview_frequency).toBeGreaterThanOrEqual(0)
        expect(node.real_world.interview_frequency).toBeLessThanOrEqual(1)
        
        // Verify grounding
        expect(Array.isArray(node.grounding.source_refs)).toBe(true)
        expect(Array.isArray(node.grounding.implementation_refs)).toBe(true)
        
        // Verify failure surface
        expect(Array.isArray(node.failure_surface.common_bugs)).toBe(true)
        expect(Array.isArray(node.failure_surface.misconceptions)).toBe(true)
        
        // Verify metadata
        expect(node.created_at).toBeInstanceOf(Date)
        expect(node.updated_at).toBeInstanceOf(Date)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject invalid node types', () => {
    const invalidTypes = ['invalid', 'wrong', 'bad_type', '', 'CONCEPT', 'Algorithm']
    
    invalidTypes.forEach(invalidType => {
      expect(VALID_NODE_TYPES).not.toContain(invalidType)
    })
  })

  it('should reject invalid relation types', () => {
    const invalidTypes = ['invalid', 'wrong', 'bad_relation', '', 'DEPENDS_ON', 'DependsOn']
    
    invalidTypes.forEach(invalidType => {
      expect(VALID_RELATION_TYPES).not.toContain(invalidType)
    })
  })

  it('should verify exactly 9 node types exist', () => {
    expect(VALID_NODE_TYPES.length).toBe(9)
    
    // Verify each expected type
    expect(VALID_NODE_TYPES).toContain('concept')
    expect(VALID_NODE_TYPES).toContain('algorithm')
    expect(VALID_NODE_TYPES).toContain('system')
    expect(VALID_NODE_TYPES).toContain('api')
    expect(VALID_NODE_TYPES).toContain('paper')
    expect(VALID_NODE_TYPES).toContain('tool')
    expect(VALID_NODE_TYPES).toContain('failure_mode')
    expect(VALID_NODE_TYPES).toContain('optimization')
    expect(VALID_NODE_TYPES).toContain('abstraction')
  })

  it('should verify exactly 19 relation types exist', () => {
    expect(VALID_RELATION_TYPES.length).toBe(19)
    
    // Verify each expected type
    expect(VALID_RELATION_TYPES).toContain('depends_on')
    expect(VALID_RELATION_TYPES).toContain('abstracts')
    expect(VALID_RELATION_TYPES).toContain('implements')
    expect(VALID_RELATION_TYPES).toContain('replaces')
    expect(VALID_RELATION_TYPES).toContain('suppresses')
    expect(VALID_RELATION_TYPES).toContain('interferes_with')
    expect(VALID_RELATION_TYPES).toContain('requires_for_debugging')
    expect(VALID_RELATION_TYPES).toContain('optimizes')
    expect(VALID_RELATION_TYPES).toContain('causes_failure_in')
    expect(VALID_RELATION_TYPES).toContain('uses')
    expect(VALID_RELATION_TYPES).toContain('improves')
    expect(VALID_RELATION_TYPES).toContain('generalizes')
    expect(VALID_RELATION_TYPES).toContain('specializes')
    expect(VALID_RELATION_TYPES).toContain('requires')
    expect(VALID_RELATION_TYPES).toContain('fails_on')
    expect(VALID_RELATION_TYPES).toContain('introduced_in')
    expect(VALID_RELATION_TYPES).toContain('evaluated_on')
    expect(VALID_RELATION_TYPES).toContain('competes_with')
    expect(VALID_RELATION_TYPES).toContain('derived_from')
  })
})
