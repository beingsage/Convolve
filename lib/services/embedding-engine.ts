/**
 * Embedding Engine - Generates and manages vector embeddings
 * Uses TF-IDF + simple encoding for demo (production would use OpenAI/Hugging Face)
 */

import crypto from 'crypto';

export interface EmbeddingPayload {
  text: string;
  type: 'concept' | 'method' | 'claim' | 'failure' | 'pattern' | 'comparison';
  abstraction_level: 'theory' | 'math' | 'intuition' | 'code';
  source_tier: 'T1' | 'T2' | 'T3' | 'T4';
}

export class EmbeddingEngine {
  private vocab: Map<string, number> = new Map();
  private idfWeights: Map<string, number> = new Map();

  constructor() {
    this.initializeVocab();
  }

  /**
   * Generate embedding for text
   * Demo: TF-IDF based encoding (768-dim vector for compatibility)
   */
  generateEmbedding(text: string): number[] {
    const tokens = this.tokenize(text);
    const embedding = new Array(768).fill(0);

    // TF-IDF computation
    const termFreq: Map<string, number> = new Map();
    tokens.forEach((token) => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // Compute weighted embedding
    let norm = 0;
    termFreq.forEach((freq, term) => {
      const wordIdx = this.vocab.get(term) || 0;
      const idf = this.idfWeights.get(term) || 1.0;
      const weight = (freq / tokens.length) * idf;
      const posIdx = wordIdx % 768;
      embedding[posIdx] += weight;
      norm += weight * weight;
    });

    // Normalize
    norm = Math.sqrt(norm) || 1;
    return embedding.map((v) => v / norm);
  }

  /**
   * Compute similarity between two embeddings (cosine)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Find k nearest neighbors
   */
  kNearestNeighbors(
    embedding: number[],
    candidates: { id: string; embedding: number[] }[],
    k: number = 5
  ): { id: string; similarity: number }[] {
    return candidates
      .map((candidate) => ({
        id: candidate.id,
        similarity: this.cosineSimilarity(embedding, candidate.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * Hybrid search: TF-IDF + semantic + metadata
   */
  hybridSearch(
    query: string,
    candidates: {
      id: string;
      text: string;
      embedding: number[];
      confidence?: number;
      source_tier?: string;
    }[],
    k: number = 5
  ): { id: string; score: number }[] {
    const queryEmbedding = this.generateEmbedding(query);
    const queryTokens = new Set(this.tokenize(query));

    return candidates
      .map((candidate) => {
        // Semantic similarity
        const semantic = this.cosineSimilarity(queryEmbedding, candidate.embedding);

        // TF-IDF overlap
        const candidateTokens = new Set(this.tokenize(candidate.text));
        const intersection = Array.from(queryTokens).filter((t) =>
          candidateTokens.has(t)
        ).length;
        const tfidf = intersection / Math.max(queryTokens.size, 1);

        // Confidence boost
        const confidenceBoost = candidate.confidence || 0.5;

        // Tier weighting (T1 > T2 > T3 > T4)
        const tierWeights = { T1: 1.5, T2: 1.2, T3: 1.0, T4: 0.8 };
        const tierWeight =
          tierWeights[candidate.source_tier as keyof typeof tierWeights] || 1.0;

        // Combined score
        const score = (semantic * 0.5 + tfidf * 0.3 + confidenceBoost * 0.2) * tierWeight;

        return { id: candidate.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Extract keywords/concepts from text
   */
  extractKeywords(text: string, topK: number = 10): string[] {
    const tokens = this.tokenize(text);
    const termFreq: Map<string, number> = new Map();

    tokens.forEach((token) => {
      if (token.length > 2) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }
    });

    return Array.from(termFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([term]) => term);
  }

  /**
   * Simple tokenization
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter((token) => token.length > 0);
  }

  /**
   * Initialize AI vocabulary
   */
  private initializeVocab(): void {
    const aiTerms = [
      'transformer', 'attention', 'backpropagation', 'gradient', 'descent',
      'neural', 'network', 'deep', 'learning', 'embedding', 'vector',
      'layer', 'activation', 'loss', 'optimization', 'convergence',
      'overfitting', 'regularization', 'batch', 'normalization', 'dropout',
      'convolutional', 'recurrent', 'lstm', 'gru', 'encoder', 'decoder',
      'reinforcement', 'policy', 'reward', 'state', 'action', 'model',
      'training', 'inference', 'dataset', 'validation', 'test', 'accuracy',
      'precision', 'recall', 'f1', 'auc', 'roc', 'metric', 'framework',
      'tensorflow', 'pytorch', 'jax', 'numpy', 'pandas', 'matplotlib',
    ];

    aiTerms.forEach((term, idx) => {
      this.vocab.set(term, idx);
      this.idfWeights.set(term, Math.log(aiTerms.length / (idx + 1)));
    });
  }
}

/**
 * Singleton instance
 */
let embeddingEngine: EmbeddingEngine | null = null;

export function getEmbeddingEngine(): EmbeddingEngine {
  if (!embeddingEngine) {
    embeddingEngine = new EmbeddingEngine();
  }
  return embeddingEngine;
}
