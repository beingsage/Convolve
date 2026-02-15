/**
 * Relationship Generator
 * Discovers and generates relationships between concepts
 */

import type { KnowledgeNode, KnowledgeEdge } from '../types';

export class RelationshipGenerator {
  /**
   * Generate ~5M relationships between 100K nodes
   */
  async generateRelationships(
    nodes: KnowledgeNode[],
    config: {
      edgesPerNode: number;
      relationTypes: string[];
      confidenceThreshold: number;
    }
  ): Promise<KnowledgeEdge[]> {
    const edges: KnowledgeEdge[] = [];

    console.log(`Generating relationships (${config.edgesPerNode} per node)...`);

    // Strategy 1: Domain-based relationships
    const domainEdges = this.findDomainRelationships(nodes, config.edgesPerNode / 3);
    edges.push(...domainEdges);

    // Strategy 2: Level-based dependencies
    const levelEdges = this.findLevelDependencies(nodes, config.edgesPerNode / 3);
    edges.push(...levelEdges);

    // Strategy 3: Semantic similarity (name-based)
    const semanticEdges = this.findSemanticSimilarity(nodes, config.edgesPerNode / 3);
    edges.push(...semanticEdges);

    console.log(`Generated ${edges.length} edges`);
    return edges;
  }

  /**
   * Find relationships within the same domain
   */
  private findDomainRelationships(
    nodes: KnowledgeNode[],
    edgesPerNode: number
  ): KnowledgeEdge[] {
    const edges: KnowledgeEdge[] = [];
    const nodesByDomain = this.groupBy(nodes, 'domain');

    for (const [domain, domainNodes] of Object.entries(nodesByDomain)) {
      for (let i = 0; i < domainNodes.length; i++) {
        const source = domainNodes[i];

        // Connect to nearest neighbors in same domain
        const neighbors = domainNodes
          .filter((n, idx) => idx !== i)
          .slice(0, Math.min(edgesPerNode, domainNodes.length - 1));

        neighbors.forEach((target, idx) => {
          edges.push({
            id: `${source.id}_related_${target.id}`,
            from_node_id: source.id,
            to_node_id: target.id,
            relation_type: 'related_in_domain',
            weight: 0.6 + Math.random() * 0.3,
            temporal: {
              created_at: new Date(),
              last_used_at: new Date()
            }
          });
        });
      }
    }

    return edges;
  }

  /**
   * Find prerequisite relationships (lower level → higher level)
   */
  private findLevelDependencies(
    nodes: KnowledgeNode[],
    edgesPerNode: number
  ): KnowledgeEdge[] {
    const edges: KnowledgeEdge[] = [];

    // Sort by abstraction level
    const nodesByLevel = [...nodes].sort(
      (a, b) => a.level.abstraction - b.level.abstraction
    );

    // Group into levels
    const levels: KnowledgeNode[][] = [];
    let currentLevel: KnowledgeNode[] = [];

    for (const node of nodesByLevel) {
      if (currentLevel.length > 0 &&
          Math.abs(currentLevel[0].level.abstraction - node.level.abstraction) > 0.1) {
        levels.push(currentLevel);
        currentLevel = [];
      }
      currentLevel.push(node);
    }
    if (currentLevel.length > 0) levels.push(currentLevel);

    // Connect lower levels to higher levels
    for (let i = 0; i < levels.length - 1; i++) {
      const lowerLevel = levels[i];
      const higherLevel = levels[i + 1];

      for (const highNode of higherLevel) {
        const prerequisites = lowerLevel.slice(0, Math.min(edgesPerNode, lowerLevel.length));

        prerequisites.forEach(lowNode => {
          edges.push({
            id: `${lowNode.id}_prerequisite_${highNode.id}`,
            from_node_id: lowNode.id,
            to_node_id: highNode.id,
            relation_type: 'prerequisite_for',
            weight: 0.7 + Math.random() * 0.25,
            temporal: {
              created_at: new Date(),
              last_used_at: new Date()
            }
          });
        });
      }
    }

    return edges;
  }

  /**
   * Find semantic similarities based on name matching
   */
  private findSemanticSimilarity(
    nodes: KnowledgeNode[],
    edgesPerNode: number
  ): KnowledgeEdge[] {
    const edges: KnowledgeEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const source = nodes[i];
      const sourceTokens = this.tokenize(source.name);

      // Find nodes with overlapping tokens
      const candidates = nodes
        .map((target, idx) => ({
          node: target,
          idx,
          similarity: this.calculateTokenSimilarity(
            sourceTokens,
            this.tokenize(target.name)
          )
        }))
        .filter(c => c.similarity > 0 && c.idx !== i)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, edgesPerNode);

      candidates.forEach(candidate => {
        edges.push({
          id: `${source.id}_similar_${candidate.node.id}`,
          from_node_id: source.id,
          to_node_id: candidate.node.id,
          relation_type: 'similar_to',
          weight: candidate.similarity,
          temporal: {
            created_at: new Date(),
            last_used_at: new Date()
          }
        });
      });
    }

    return edges;
  }

  /**
   * Tokenize concept name
   */
  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(token => token.length > 2)
    );
  }

  /**
   * Calculate Jaccard similarity between token sets
   */
  private calculateTokenSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Group array by property value
   */
  private groupBy<T>(
    array: T[],
    key: keyof T
  ): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}
