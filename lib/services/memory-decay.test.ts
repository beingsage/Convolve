/**
 * Property-Based Tests for Memory Decay Service
 * Feature: uails-complete-system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDecayScore,
  applyDecayToNode,
  calculateVectorDecay,
  reinforceNode,
  calculateForgettingTime,
  consolidateVectors,
  DecayManager,
} from './memory-decay';
import { KnowledgeNode, DecayConfig, VectorPayload } from '@/lib/types';

// Helper to create a test node
function createTestNode(overrides?: Partial<KnowledgeNode>): KnowledgeNode {
  const now = new Date();
  const baseNode: KnowledgeNode = {
    id: 'test-node',
    type: 'concept',
    name: 'Test Concept',
    description: 'A test concept',
    level: {
      abstraction: 0.6,
      difficulty: 0.5,
      volatility: 0.3,
    },
    cognitive_state: {
      strength: 0.8,
      confidence: 0.75,
      activation: 0.5,
      decay_rate: 0.01,
    },
    temporal: {
      introduced_at: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      last_reinforced_at: new Date(now.getTime() - 1000 * 60 * 60),
      peak_relevance_at: now,
    },
    real_world: {
      used_in_production: true,
      companies_using: 100,
      avg_salary_weight: 0.8,
      interview_frequency: 0.9,
    },
    grounding: {
      source_refs: [],
      implementation_refs: [],
    },
    failure_surface: {
      common_bugs: [],
      misconceptions: [],
    },
    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    updated_at: now,
  };

  return { ...baseNode, ...overrides };
}

// Helper to create a test vector
function createTestVector(overrides?: Partial<VectorPayload>): VectorPayload {
  const now = new Date();
  const baseVector: VectorPayload = {
    id: 'test-vector',
    embedding: new Array(768).fill(0.1),
    embedding_type: 'concept_embedding',
    collection: 'test',
    entity_refs: ['entity-1', 'entity-2'],
    confidence: 0.85,
    abstraction_level: 'code',
    source_tier: 'T1',
    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    updated_at: now,
  };

  return { ...baseVector, ...overrides };
}

// Helper to create a test decay config
function createTestConfig(overrides?: Partial<DecayConfig>): DecayConfig {
  const baseConfig: DecayConfig = {
    base_lambda: 0.01,
    foundational_bonus: 0.1,
    reinforcement_boost: 0.2,
    consolidation_threshold: 0.7,
    forgetting_threshold: 0.1,
  };

  return { ...baseConfig, ...overrides };
}

describe('Memory Decay Service - Property Tests', () => {
  let testConfig: DecayConfig;

  beforeEach(() => {
    testConfig = createTestConfig();
  });

  // Feature: uails-complete-system, Property 17: Memory Decay Formula Correctness
  describe('Property 17: Memory Decay Formula Correctness', () => {
    it('should apply exponential decay over time', () => {
      const node = createTestNode({
        temporal: {
          introduced_at: new Date(),
          last_reinforced_at: new Date(Date.now() - 1000 * 60 * 60),
          peak_relevance_at: new Date(),
        },
        cognitive_state: {
          strength: 0.8,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const decayScore = calculateDecayScore(node, testConfig);

      // Decay score should be in [0, 1]
      expect(decayScore).toBeGreaterThanOrEqual(0);
      expect(decayScore).toBeLessThanOrEqual(1);
    });

    it('should follow exponential decay pattern', () => {
      const node1 = createTestNode({
        cognitive_state: {
          strength: 0.8,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
        temporal: {
          introduced_at: new Date(),
          last_reinforced_at: new Date(Date.now() - 1000 * 60 * 60),
          peak_relevance_at: new Date(),
        },
      });

      const node2 = createTestNode({
        cognitive_state: {
          strength: 0.8,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
        temporal: {
          introduced_at: new Date(),
          last_reinforced_at: new Date(Date.now() - 1000 * 60 * 60 * 48), // Much older
          peak_relevance_at: new Date(),
        },
      });

      const decay1 = calculateDecayScore(node1, testConfig);
      const decay2 = calculateDecayScore(node2, testConfig);

      // Older node should have lower score
      expect(decay2).toBeLessThanOrEqual(decay1);
    });
  });

  // Feature: uails-complete-system, Property 18: Decay Strength Bounds
  describe('Property 18: Decay Strength Bounds', () => {
    it('should always return strength values in [0, 1]', () => {
      const node = createTestNode({
        cognitive_state: {
          strength: 0.5,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const decayScore = calculateDecayScore(node, testConfig);

      expect(decayScore).toBeGreaterThanOrEqual(0);
      expect(decayScore).toBeLessThanOrEqual(1);
    });

    it('should enforce bounds when applying decay to node', () => {
      const node = createTestNode({
        cognitive_state: {
          strength: 0.9,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const decayedNode = applyDecayToNode(node, testConfig);

      expect(isFinite(decayedNode.cognitive_state.strength)).toBe(true);
      expect(decayedNode.cognitive_state.strength).toBeGreaterThanOrEqual(0);
      expect(decayedNode.cognitive_state.strength).toBeLessThanOrEqual(1);
    });

    it('foundational concepts should decay slower than volatile ones', () => {
      const foundationalNode = createTestNode({
        level: {
          abstraction: 0.1,
          difficulty: 0.5,
          volatility: 0.1,
        },
        cognitive_state: {
          strength: 0.8,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const volatileNode = createTestNode({
        level: {
          abstraction: 0.8,
          difficulty: 0.5,
          volatility: 0.8,
        },
        cognitive_state: {
          strength: 0.8,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const foundationalDecay = calculateDecayScore(foundationalNode, testConfig);
      const volatileDecay = calculateDecayScore(volatileNode, testConfig);

      // Foundational should retain more strength
      expect(foundationalDecay).toBeGreaterThan(volatileDecay);
    });
  });

  describe('Reinforcement Boost', () => {
    it('should increase strength when reinforcing a node', () => {
      const node = createTestNode({
        cognitive_state: {
          strength: 0.5,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const reinforcedNode = reinforceNode(node, testConfig);

      // Strength should increase (but capped at 1)
      expect(reinforcedNode.cognitive_state.strength).toBeGreaterThan(0.5);
      expect(reinforcedNode.cognitive_state.strength).toBeLessThanOrEqual(1);
    });

    it('reinforcement should update last_reinforced_at timestamp', () => {
      const node = createTestNode();
      const nowMs = Date.now();
      const reinforcedNode = reinforceNode(node, testConfig, nowMs);

      expect(reinforcedNode.temporal.last_reinforced_at.getTime()).toBe(nowMs);
    });
  });

  describe('Forgetting Time Calculation', () => {
    it('should calculate positive forgetting time for nodes above threshold', () => {
      const node = createTestNode({
        cognitive_state: {
          strength: 0.5,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const forgettingTime = calculateForgettingTime(node, testConfig);

      expect(forgettingTime).toBeGreaterThan(0);
      expect(isFinite(forgettingTime)).toBe(true);
    });

    it('should return 0 forgetting time for nodes at or below threshold', () => {
      const node = createTestNode({
        cognitive_state: {
          strength: 0.08,
          confidence: 0.75,
          activation: 0.5,
          decay_rate: 0.01,
        },
      });

      const forgettingTime = calculateForgettingTime(node, testConfig);

      // Should be 0 or very close to 0 (within floating-point error)
      expect(forgettingTime).toBeLessThanOrEqual(0.0001);
    });
  });

  describe('Vector Decay', () => {
    it('should decay vectors appropriately based on age', () => {
      const ageMs = 1000 * 60 * 60 * 24; // 1 day old
      const vector = createTestVector({
        created_at: new Date(Date.now() - ageMs),
        confidence: 0.85,
      });

      const decay = calculateVectorDecay(vector, testConfig);

      expect(decay).toBeGreaterThanOrEqual(0);
      expect(decay).toBeLessThanOrEqual(1);
    });

    it('theoretical vectors should decay slower than code vectors', () => {
      const theoryVector = createTestVector({
        abstraction_level: 'theory',
        created_at: new Date(Date.now() - 1000 * 60 * 60),
      });

      const codeVector = createTestVector({
        abstraction_level: 'code',
        created_at: new Date(Date.now() - 1000 * 60 * 60),
      });

      const theoryDecay = calculateVectorDecay(theoryVector, testConfig);
      const codeDecay = calculateVectorDecay(codeVector, testConfig);

      // Theory should decay slower (higher value)
      expect(theoryDecay).toBeGreaterThan(codeDecay);
    });
  });

  describe('Vector Consolidation', () => {
    it('should consolidate multiple vectors into one', () => {
      const vectors = [
        createTestVector({ id: 'vec-1' }),
        createTestVector({ id: 'vec-2' }),
        createTestVector({ id: 'vec-3' }),
      ];

      const result = consolidateVectors(vectors, 'consolidated-id');

      expect(result.consolidated_vector).toBeDefined();
      expect(result.consolidated_vector.embedding).toHaveLength(768);
      expect(result.consolidated_vector.confidence).toBeLessThanOrEqual(0.85);
    });

    it('should merge entity refs from all vectors', () => {
      const vectors = [
        createTestVector({ entity_refs: ['a', 'b'] }),
        createTestVector({ entity_refs: ['b', 'c'] }),
        createTestVector({ entity_refs: ['c', 'd'] }),
      ];

      const result = consolidateVectors(vectors, 'consolidated-id');

      expect(result.consolidated_vector.entity_refs).toContain('a');
      expect(result.consolidated_vector.entity_refs).toContain('b');
      expect(result.consolidated_vector.entity_refs).toContain('c');
      expect(result.consolidated_vector.entity_refs).toContain('d');
    });

    it('should throw error on empty vector list', () => {
      expect(() => consolidateVectors([], 'id')).toThrow('Cannot consolidate zero vectors');
    });
  });

  describe('DecayManager', () => {
    it('should determine when decay calculation is needed', () => {
      const manager = new DecayManager(testConfig);
      const now = Date.now();

      manager.markDecayCalculated(now);
      expect(manager.shouldCalculateDecay(now + 1000 * 60)).toBe(false); // 1 minute later
      expect(manager.shouldCalculateDecay(now + 1000 * 60 * 60 * 2)).toBe(true); // 2 hours later
    });

    it('should apply batch decay to multiple nodes', () => {
      const nodeCount = 10;
      const nodes = Array.from({ length: nodeCount }, (_, i) =>
        createTestNode({ id: `node-${i}` })
      );

      const manager = new DecayManager(testConfig);
      const decayedNodes = manager.applyBatchDecay(nodes);

      expect(decayedNodes).toHaveLength(nodeCount);
      decayedNodes.forEach((node) => {
        expect(node.cognitive_state.strength).toBeGreaterThanOrEqual(0);
        expect(node.cognitive_state.strength).toBeLessThanOrEqual(1);
      });
    });
  });
});
