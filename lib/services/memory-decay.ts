/**
 * Memory Decay & Consolidation Engine
 * Implements temporal dynamics for knowledge nodes
 */

import { KnowledgeNode, DecayConfig, DecayState, VectorPayload } from '@/lib/types';
import { getDecayConfig } from '@/lib/config/storage';

/**
 * Calculate decay score for a node based on age and reinforcement
 * 
 * Formula: strength(t) = strength(0) * e^(-λΔt) + reinforcement
 * 
 * Where:
 * - λ (lambda) = decay rate (higher = faster decay)
 * - Δt = time elapsed since last reinforcement
 * - reinforcement = boost from recent access
 */
export function calculateDecayScore(
  node: KnowledgeNode,
  config: DecayConfig = getDecayConfig(),
  nowMs: number = Date.now()
): number {
  const timeSinceReinforcement = nowMs - node.temporal.last_reinforced_at.getTime();
  
  // Base exponential decay
  const decay = Math.exp(-config.base_lambda * timeSinceReinforcement);
  
  // Foundational concepts decay slower
  const foundationalBonus = node.level.abstraction < 0.3 ? config.foundational_bonus : 0;
  
  // Apply volatility (unstable concepts decay faster)
  const volatilityPenalty = node.level.volatility * 0.5;
  
  // Final strength calculation
  const strength = node.cognitive_state.strength * (decay + foundationalBonus - volatilityPenalty);
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, strength));
}

/**
 * Apply decay to a node's cognitive state
 */
export function applyDecayToNode(
  node: KnowledgeNode,
  config: DecayConfig = getDecayConfig(),
  nowMs: number = Date.now()
): KnowledgeNode {
  const newStrength = calculateDecayScore(node, config, nowMs);
  
  return {
    ...node,
    cognitive_state: {
      ...node.cognitive_state,
      strength: newStrength,
      // Decay rate increases as strength decreases
      decay_rate: config.base_lambda * (1 + node.level.volatility),
    },
    updated_at: new Date(nowMs),
  };
}

/**
 * Calculate vector decay (for semantic memory consolidation)
 */
export function calculateVectorDecay(
  vector: VectorPayload,
  config: DecayConfig = getDecayConfig(),
  nowMs: number = Date.now()
): number {
  const timeSinceCreation = nowMs - vector.created_at.getTime();
  
  // Exponential decay with abstraction-level adjustment
  const baseDecay = Math.exp(-config.base_lambda * timeSinceCreation);
  
  // Theoretical concepts decay slower than code patterns
  const abstractionBonus = vector.abstraction_level === 'theory' ? 0.2 : 0;
  
  // High-confidence vectors decay slower
  const confidenceBonus = vector.confidence * 0.1;
  
  const decay = baseDecay + abstractionBonus + confidenceBonus;
  return Math.max(0, Math.min(1, decay));
}

/**
 * Reinforce a node by updating its last reinforcement timestamp
 * This prevents decay when the concept is actively used
 */
export function reinforceNode(
  node: KnowledgeNode,
  config: DecayConfig = getDecayConfig(),
  nowMs: number = Date.now()
): KnowledgeNode {
  const newStrength = Math.min(
    1,
    node.cognitive_state.strength + config.reinforcement_boost
  );
  
  return {
    ...node,
    temporal: {
      ...node.temporal,
      last_reinforced_at: new Date(nowMs),
      peak_relevance_at: new Date(Math.max(
        node.temporal.peak_relevance_at.getTime(),
        nowMs
      )),
    },
    cognitive_state: {
      ...node.cognitive_state,
      strength: newStrength,
      activation: Math.min(1, node.cognitive_state.activation + 0.2),
    },
    updated_at: new Date(nowMs),
  };
}

/**
 * Calculate when a node would reach "forgotten" state (strength < 0.1)
 */
export function calculateForgettingTime(
  node: KnowledgeNode,
  config: DecayConfig = getDecayConfig(),
  targetStrength: number = 0.1
): number {
  // Solve for t in: targetStrength = strength(0) * e^(-λt)
  // t = -ln(targetStrength / strength(0)) / λ
  
  if (node.cognitive_state.strength <= targetStrength) {
    return 0;
  }
  
  const ratio = targetStrength / node.cognitive_state.strength;
  const timeMs = -Math.log(ratio) / config.base_lambda;
  
  return timeMs;
}

/**
 * Consolidate vectors: frequently co-activated → summarize
 * This creates higher-level representations from repeated patterns
 */
export interface ConsolidationResult {
  original_vectors: VectorPayload[];
  consolidated_vector: VectorPayload;
  confidence: number;
}

export function consolidateVectors(
  vectors: VectorPayload[],
  vectorId: string
): ConsolidationResult {
  if (vectors.length === 0) {
    throw new Error('Cannot consolidate zero vectors');
  }

  // Average embeddings
  const avgEmbedding = averageEmbeddings(vectors.map(v => v.embedding));
  
  // Merge entity references
  const allEntityRefs = new Set<string>();
  vectors.forEach(v => v.entity_refs.forEach(ref => allEntityRefs.add(ref)));
  
  // Take minimum confidence (conservative estimate)
  const minConfidence = Math.min(...vectors.map(v => v.confidence));
  
  // Promote abstraction level
  let abstractionLevel = vectors[0].abstraction_level;
  if (vectors.every(v => v.abstraction_level === 'code')) {
    abstractionLevel = 'intuition';
  } else if (vectors.every(v => v.abstraction_level !== 'theory')) {
    abstractionLevel = 'math';
  }

  const consolidated: VectorPayload = {
    id: vectorId,
    embedding: avgEmbedding,
    embedding_type: 'concept_embedding',
    collection: 'consolidated',
    entity_refs: Array.from(allEntityRefs),
    confidence: minConfidence * 0.95, // Slight penalty for consolidation
    abstraction_level: abstractionLevel,
    source_tier: vectors[0].source_tier,
    created_at: new Date(Math.min(...vectors.map(v => v.created_at.getTime()))),
    updated_at: new Date(),
  };

  return {
    original_vectors: vectors,
    consolidated_vector: consolidated,
    confidence: minConfidence,
  };
}

/**
 * Average multiple embeddings (simple mean)
 */
function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const dimension = embeddings[0].length;
  const avg: number[] = new Array(dimension).fill(0);
  
  for (let i = 0; i < dimension; i++) {
    let sum = 0;
    for (const emb of embeddings) {
      sum += emb[i] || 0;
    }
    avg[i] = sum / embeddings.length;
  }
  
  return avg;
}

/**
 * Decay manager: periodically applies decay to all nodes
 */
export class DecayManager {
  private decayConfig: DecayConfig;
  private lastDecayTime: number = Date.now();
  private decayIntervalMs: number = 60 * 60 * 1000; // 1 hour

  constructor(decayConfig?: DecayConfig) {
    this.decayConfig = decayConfig || getDecayConfig();
  }

  /**
   * Check if decay calculation is needed
   */
  shouldCalculateDecay(nowMs: number = Date.now()): boolean {
    return (nowMs - this.lastDecayTime) >= this.decayIntervalMs;
  }

  /**
   * Mark that decay has been calculated
   */
  markDecayCalculated(nowMs: number = Date.now()): void {
    this.lastDecayTime = nowMs;
  }

  /**
   * Calculate decay for a batch of nodes
   */
  applyBatchDecay(
    nodes: KnowledgeNode[],
    nowMs: number = Date.now()
  ): KnowledgeNode[] {
    return nodes.map(node => applyDecayToNode(node, this.decayConfig, nowMs));
  }
}
