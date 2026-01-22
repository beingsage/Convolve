/**
 * Vector Consolidation & Semantic Compression Engine
 * Groups similar vectors, creates higher-level concepts
 */

import { VectorPayload, KnowledgeNode } from '@/lib/types';
import { getEmbeddingEngine } from './embedding-engine';
import { v4 as uuidv4 } from 'uuid';

export interface ConsolidationResult {
  original_vectors: string[];
  consolidated_vector_id: string;
  higher_level_concept: KnowledgeNode;
  compression_ratio: number;
}

export class ConsolidationEngine {
  /**
   * Group similar vectors and consolidate them
   */
  static consolidateVectors(
    vectors: VectorPayload[],
    similarity_threshold: number = 0.7
  ): ConsolidationResult[] {
    const embeddingEngine = getEmbeddingEngine();
    const results: ConsolidationResult[] = [];
    const processed = new Set<string>();

    // Cluster similar vectors
    for (let i = 0; i < vectors.length; i++) {
      if (processed.has(vectors[i].id)) continue;

      const cluster: VectorPayload[] = [vectors[i]];
      processed.add(vectors[i].id);

      // Find all similar vectors
      for (let j = i + 1; j < vectors.length; j++) {
        if (processed.has(vectors[j].id)) continue;

        const similarity = embeddingEngine.cosineSimilarity(
          vectors[i].embedding,
          vectors[j].embedding
        );

        if (similarity > similarity_threshold) {
          cluster.push(vectors[j]);
          processed.add(vectors[j].id);
        }
      }

      // Only consolidate if we have multiple vectors
      if (cluster.length > 1) {
        const consolidated = this.createConsolidatedVector(cluster, embeddingEngine);
        results.push(consolidated);
      }
    }

    console.log(`[Consolidation] Consolidated ${results.reduce((sum, r) => sum + r.original_vectors.length, 0)} vectors into ${results.length} higher-level concepts`);
    return results;
  }

  /**
   * Create a higher-level concept from a cluster
   */
  private static createConsolidatedVector(
    cluster: VectorPayload[],
    embeddingEngine: ReturnType<typeof getEmbeddingEngine>
  ): ConsolidationResult {
    // Compute centroid embedding
    const dim = cluster[0].embedding.length;
    const centroid = new Array(dim).fill(0);

    for (const vector of cluster) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vector.embedding[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= cluster.length;
    }

    // Compute weighted confidence
    const avgConfidence = cluster.reduce((sum, v) => sum + v.confidence, 0) / cluster.length;

    // Find most common abstraction level
    const levelCounts: Record<string, number> = {};
    for (const vector of cluster) {
      levelCounts[vector.abstraction_level] =
        (levelCounts[vector.abstraction_level] || 0) + 1;
    }

    const commonLevel = Object.keys(levelCounts).reduce((a, b) =>
      levelCounts[a] > levelCounts[b] ? a : b
    );

    // Create higher-level concept
    const conceptName = this.generateConceptName(cluster);
    const concept: KnowledgeNode = {
      id: uuidv4(),
      type: 'abstraction',
      name: conceptName,
      description: `Abstraction of: ${cluster.map((v) => v.id).join(', ')}`,
      level: {
        abstraction: Math.min(1, 0.5 + cluster[0].abstraction_level),
        difficulty: 0.5,
        volatility: 0.3,
      },
      cognitive_state: {
        strength: avgConfidence,
        activation: 0,
        decay_rate: 0.005, // Lower decay for consolidated concepts
        confidence: avgConfidence,
      },
      temporal: {
        introduced_at: new Date(),
        last_reinforced_at: new Date(),
        peak_relevance_at: new Date(),
      },
      real_world: {
        used_in_production: false,
        companies_using: 0,
        avg_salary_weight: 0,
        interview_frequency: 0,
      },
      grounding: {
        source_refs: Array.from(new Set(cluster.flatMap((v) => v.entity_refs || []))),
        implementation_refs: [],
      },
      failure_surface: {
        common_bugs: [],
        misconceptions: [],
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    return {
      original_vectors: cluster.map((v) => v.id),
      consolidated_vector_id: uuidv4(),
      higher_level_concept: concept,
      compression_ratio: cluster.length,
    };
  }

  /**
   * Generate a name for consolidated concept
   */
  private static generateConceptName(cluster: VectorPayload[]): string {
    // Use entity references or abstract naming
    const refs = new Set(cluster.flatMap((v) => v.entity_refs || []));
    if (refs.size > 0) {
      return `${Array.from(refs).join('+')}_abstraction`;
    }
    return `Abstraction_${Date.now()}`;
  }

  /**
   * Apply decay to vectors and consolidate decayed ones
   */
  static applyDecayAndConsolidate(
    vectors: VectorPayload[],
    decayRate: number = 0.01
  ): { updated: VectorPayload[]; consolidated: ConsolidationResult[] } {
    const now = new Date().getTime();
    const updated: VectorPayload[] = [];

    // Apply exponential decay to each vector
    for (const vector of vectors) {
      const timeDiff = (now - vector.timestamp.getTime()) / (1000 * 60 * 60 * 24); // days
      const decayFactor = Math.exp(-decayRate * timeDiff);

      // Update confidence based on decay
      const decayedConfidence = vector.confidence * decayFactor;

      updated.push({
        ...vector,
        confidence: decayedConfidence,
        decay_applied: true,
      } as VectorPayload);
    }

    // Only consolidate high-confidence vectors
    const highConfidence = updated.filter((v) => v.confidence > 0.5);
    const consolidated = this.consolidateVectors(highConfidence, 0.75);

    return { updated, consolidated };
  }
}
