/**
 * Advanced Entity Resolution Engine
 * Enhancement #12: Find and merge duplicate concepts
 * Levenshtein distance + semantic similarity
 */

export interface ResolutionCandidate {
  id1: string;
  id2: string;
  similarity_score: number;
  reasons: string[];
  recommended_merge: boolean;
}

export class EntityResolutionEngine {
  private aliases: Map<string, Set<string>> = new Map(); // canonical -> aliases

  /**
   * Register alias for concept
   */
  registerAlias(canonical: string, alias: string): void {
    if (!this.aliases.has(canonical)) {
      this.aliases.set(canonical, new Set());
    }
    this.aliases.get(canonical)!.add(alias);
  }

  /**
   * Find potential duplicates
   */
  findDuplicates(nodes: any[], threshold: number = 0.85): ResolutionCandidate[] {
    const candidates: ResolutionCandidate[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.calculateSimilarity(nodes[i], nodes[j]);

        if (similarity >= threshold) {
          const reasons = this.getResolutionReasons(nodes[i], nodes[j], similarity);

          candidates.push({
            id1: nodes[i].id,
            id2: nodes[j].id,
            similarity_score: similarity,
            reasons,
            recommended_merge: similarity >= 0.9,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.similarity_score - a.similarity_score);
  }

  /**
   * Calculate similarity between two nodes
   */
  private calculateSimilarity(node1: any, node2: any): number {
    let score = 0;
    let factors = 0;

    // Name similarity (Levenshtein)
    const nameSimilarity = this.levenshteinSimilarity(node1.name, node2.name);
    score += nameSimilarity * 0.4;
    factors += 0.4;

    // Description similarity
    if (node1.description && node2.description) {
      const descSimilarity = this.semanticSimilarity(
        node1.description,
        node2.description
      );
      score += descSimilarity * 0.3;
      factors += 0.3;
    }

    // Type matching
    if (node1.type === node2.type) {
      score += 0.2;
    }
    factors += 0.2;

    // Domain matching
    if (node1.domain === node2.domain) {
      score += 0.1;
    }
    factors += 0.1;

    return score / factors;
  }

  /**
   * Levenshtein distance-based similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLen = Math.max(str1.length, str2.length);
    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Semantic similarity (bag of words)
   */
  private semanticSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Propose merge with canonical name
   */
  proposeMerge(
    node1: any,
    node2: any,
    similarity: number
  ): {
    canonical: any;
    merged: any;
    confidence: number;
  } {
    // Choose better node as canonical
    const canonical =
      node1.cognitive_state.confidence >= node2.cognitive_state.confidence
        ? node1
        : node2;
    const merged = canonical === node1 ? node2 : node1;

    return {
      canonical,
      merged,
      confidence: similarity,
    };
  }

  /**
   * Get reasons for resolution
   */
  private getResolutionReasons(node1: any, node2: any, similarity: number): string[] {
    const reasons: string[] = [];

    const nameSim = this.levenshteinSimilarity(node1.name, node2.name);
    if (nameSim > 0.8) {
      reasons.push(`Names are ${(nameSim * 100).toFixed(0)}% similar`);
    }

    if (node1.type === node2.type) {
      reasons.push(`Same type: ${node1.type}`);
    }

    if (node1.domain === node2.domain) {
      reasons.push(`Same domain: ${node1.domain}`);
    }

    const descSim = this.semanticSimilarity(
      node1.description || '',
      node2.description || ''
    );
    if (descSim > 0.7) {
      reasons.push(`Descriptions are ${(descSim * 100).toFixed(0)}% similar`);
    }

    return reasons;
  }

  /**
   * Merge two nodes
   */
  mergeNodes(canonical: any, duplicate: any): any {
    const merged = {
      ...canonical,
      grounding: {
        source_refs: [
          ...(canonical.grounding?.source_refs || []),
          ...(duplicate.grounding?.source_refs || []),
        ],
        implementation_refs: [
          ...(canonical.grounding?.implementation_refs || []),
          ...(duplicate.grounding?.implementation_refs || []),
        ],
      },
      cognitive_state: {
        ...canonical.cognitive_state,
        confidence: Math.max(
          canonical.cognitive_state.confidence,
          duplicate.cognitive_state.confidence
        ),
      },
    };

    // Register duplicate as alias
    this.registerAlias(canonical.id, duplicate.id);

    return merged;
  }

  /**
   * Resolve alias to canonical
   */
  resolveAlias(nodeId: string): string {
    for (const [canonical, aliases] of this.aliases.entries()) {
      if (aliases.has(nodeId)) {
        return canonical;
      }
    }
    return nodeId;
  }

  /**
   * Get all aliases for node
   */
  getAliases(nodeId: string): string[] {
    const canonical = this.resolveAlias(nodeId);
    const aliases = this.aliases.get(canonical) || new Set();
    return [canonical, ...Array.from(aliases)];
  }

  /**
   * Get statistics
   */
  getStats(): Record<string, any> {
    return {
      unique_concepts: new Set(
        Array.from(this.aliases.keys()).concat(
          Array.from(this.aliases.values()).flatMap((a) => Array.from(a))
        )
      ).size,
      alias_groups: this.aliases.size,
      total_aliases: Array.from(this.aliases.values()).reduce((sum, a) => sum + a.size, 0),
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  clear(): void {
    this.aliases.clear();
  }
}

// Singleton instance
let entityResolutionInstance: EntityResolutionEngine | null = null;

export function getEntityResolutionEngine(): EntityResolutionEngine {
  if (!entityResolutionInstance) {
    entityResolutionInstance = new EntityResolutionEngine();
  }
  return entityResolutionInstance;
}
