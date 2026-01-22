/**
 * Semantic Query Engine
 * Handles semantic search, vector operations, and intelligent filtering
 */

import {
  SemanticQuery,
  KnowledgeNode,
  VectorPayload,
  AbstractionLevel,
  SourceTier,
} from '@/lib/types';
import { IStorageAdapter } from '@/lib/storage/adapter';
import { getStorageAdapter } from '@/lib/storage/factory';

export class SemanticQueryEngine {
  private storage: IStorageAdapter | null = null;

  async initialize() {
    this.storage = await getStorageAdapter();
  }

  private getStorage(): IStorageAdapter {
    if (!this.storage) throw new Error('SemanticQueryEngine not initialized');
    return this.storage;
  }

  /**
   * Execute a semantic query
   */
  async query(input: SemanticQuery): Promise<{
    nodes: KnowledgeNode[];
    explanation: string;
  }> {
    // For now, use keyword search (in production, would use embeddings)
    const nodes = await this.getStorage().searchNodes(input.query, input.limit || 10);

    // Apply filters
    let filtered = nodes;

    if (input.filters) {
      if (input.filters.node_types && input.filters.node_types.length > 0) {
        filtered = filtered.filter(n => input.filters!.node_types!.includes(n.type));
      }

      if (input.filters.difficulty_range) {
        const [min, max] = input.filters.difficulty_range;
        filtered = filtered.filter(
          n => n.level.difficulty >= min && n.level.difficulty <= max
        );
      }

      if (input.filters.abstraction_range) {
        const [min, max] = input.filters.abstraction_range;
        filtered = filtered.filter(
          n => n.level.abstraction >= min && n.level.abstraction <= max
        );
      }

      if (input.filters.source_tiers && input.filters.source_tiers.length > 0) {
        // Filter by source tier of grounding
        filtered = filtered.filter(n => n.grounding.source_refs.length > 0);
      }
    }

    // Sort by relevance
    filtered = this.rankByRelevance(filtered, input.query, input.context);

    // Generate explanation
    const explanation = this.generateExplanation(filtered, input.context);

    return { nodes: filtered, explanation };
  }

  /**
   * Explain a concept with personalized depth
   */
  async explain(
    nodeId: string,
    context?: { user_level?: 'beginner' | 'intermediate' | 'advanced'; known_concepts?: string[] }
  ): Promise<{
    concept: KnowledgeNode;
    explanation: string;
    prerequisites: KnowledgeNode[];
    related_concepts: KnowledgeNode[];
  }> {
    const storage = this.getStorage();
    const concept = await storage.getNode(nodeId);

    if (!concept) throw new Error(`Concept ${nodeId} not found`);

    // Get prerequisites
    const incomingEdges = await storage.getEdgesTo(nodeId);
    const prerequisites: KnowledgeNode[] = [];

    for (const edge of incomingEdges) {
      if (edge.relation === 'requires' || edge.relation === 'depends_on') {
        const node = await storage.getNode(edge.from_node);
        if (node) prerequisites.push(node);
      }
    }

    // Get related concepts
    const outgoingEdges = await storage.getEdgesFrom(nodeId);
    const related: KnowledgeNode[] = [];

    for (const edge of outgoingEdges.slice(0, 3)) {
      const node = await storage.getNode(edge.to_node);
      if (node) related.push(node);
    }

    // Generate personalized explanation
    const explanation = this.generatePersonalizedExplanation(
      concept,
      prerequisites,
      context
    );

    return { concept, explanation, prerequisites, related_concepts: related };
  }

  /**
   * Compare two concepts
   */
  async compare(
    nodeId1: string,
    nodeId2: string
  ): Promise<{
    concept_a: KnowledgeNode;
    concept_b: KnowledgeNode;
    comparison: string;
  }> {
    const storage = this.getStorage();
    const conceptA = await storage.getNode(nodeId1);
    const conceptB = await storage.getNode(nodeId2);

    if (!conceptA || !conceptB) {
      throw new Error('One or both concepts not found');
    }

    const comparison = this.generateComparison(conceptA, conceptB);

    return { concept_a: conceptA, concept_b: conceptB, comparison };
  }

  /**
   * Find similar concepts
   */
  async findSimilar(nodeId: string, limit: number = 5): Promise<KnowledgeNode[]> {
    const concept = await this.getStorage().getNode(nodeId);
    if (!concept) throw new Error(`Concept ${nodeId} not found`);

    // Get all nodes
    let page = 1;
    let allNodes: KnowledgeNode[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.getStorage().listNodes(page, 50);
      allNodes.push(...result.items);

      if (!result.has_more) break;
      page++;
    }

    // Score by similarity
    const scored = allNodes
      .filter(n => n.id !== nodeId)
      .map(n => ({
        node: n,
        score: this.calculateNodeSimilarity(concept, n),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.node);

    return scored;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private rankByRelevance(nodes: KnowledgeNode[], query: string, context?: string): KnowledgeNode[] {
    return nodes.sort((a, b) => {
      // Exact name matches rank highest
      const aNameMatch = a.name.toLowerCase() === query.toLowerCase() ? 1000 : 0;
      const bNameMatch = b.name.toLowerCase() === query.toLowerCase() ? 1000 : 0;

      // Then by confidence
      const aConfidence = a.cognitive_state.confidence;
      const bConfidence = b.cognitive_state.confidence;

      // Then by strength
      const aStrength = a.cognitive_state.strength;
      const bStrength = b.cognitive_state.strength;

      return (
        bNameMatch - aNameMatch ||
        bConfidence - aConfidence ||
        bStrength - aStrength
      );
    });
  }

  private generateExplanation(nodes: KnowledgeNode[], context?: string): string {
    if (nodes.length === 0) {
      return 'No concepts found. Try different search terms or browse by category.';
    }

    const primary = nodes[0];
    const related = nodes.slice(1, 3);

    let explanation = `Found: **${primary.name}**\n\n`;
    explanation += `${primary.description}\n\n`;

    if (related.length > 0) {
      explanation += `**Related concepts:**\n`;
      for (const concept of related) {
        explanation += `- ${concept.name}\n`;
      }
    }

    return explanation;
  }

  private generatePersonalizedExplanation(
    concept: KnowledgeNode,
    prerequisites: KnowledgeNode[],
    context?: {
      user_level?: 'beginner' | 'intermediate' | 'advanced';
      known_concepts?: string[];
    }
  ): string {
    let explanation = `## ${concept.name}\n\n`;
    explanation += `${concept.description}\n\n`;

    if (prerequisites.length > 0) {
      const missingPrereqs = prerequisites.filter(
        p => !context?.known_concepts?.includes(p.id)
      );

      if (missingPrereqs.length > 0) {
        explanation += `**Before learning this, you should understand:**\n`;
        for (const prereq of missingPrereqs) {
          explanation += `- ${prereq.name}\n`;
        }
        explanation += '\n';
      }
    }

    // Adjust depth based on user level
    if (context?.user_level === 'beginner') {
      explanation += `**Key intuition:** Think of ${concept.name} as a way to...\n`;
    } else if (context?.user_level === 'advanced') {
      explanation += `**Mathematical details:** This involves...\n`;
    }

    return explanation;
  }

  private generateComparison(conceptA: KnowledgeNode, conceptB: KnowledgeNode): string {
    let comparison = `## ${conceptA.name} vs ${conceptB.name}\n\n`;

    // Similarities
    comparison += `### Similarities\n`;
    if (conceptA.type === conceptB.type) {
      comparison += `- Both are ${conceptA.type}s\n`;
    }
    if (
      Math.abs(conceptA.level.difficulty - conceptB.level.difficulty) < 0.3
    ) {
      comparison += `- Similar difficulty level\n`;
    }
    comparison += '\n';

    // Differences
    comparison += `### Differences\n`;
    if (conceptA.cognitive_state.confidence > conceptB.cognitive_state.confidence) {
      comparison += `- ${conceptA.name} has higher confidence in literature\n`;
    } else if (conceptB.cognitive_state.confidence > conceptA.cognitive_state.confidence) {
      comparison += `- ${conceptB.name} has higher confidence in literature\n`;
    }

    if (conceptA.real_world.used_in_production && !conceptB.real_world.used_in_production) {
      comparison += `- ${conceptA.name} is used in production systems\n`;
    } else if (conceptB.real_world.used_in_production && !conceptA.real_world.used_in_production) {
      comparison += `- ${conceptB.name} is used in production systems\n`;
    }
    comparison += '\n';

    // When to use
    comparison += `### When to use which?\n`;
    comparison += `- Use **${conceptA.name}** when you need: [specific use case A]\n`;
    comparison += `- Use **${conceptB.name}** when you need: [specific use case B]\n`;

    return comparison;
  }

  private calculateNodeSimilarity(node1: KnowledgeNode, node2: KnowledgeNode): number {
    let score = 0;

    // Same type: +30 points
    if (node1.type === node2.type) score += 30;

    // Similar difficulty: +25 points
    if (Math.abs(node1.level.difficulty - node2.level.difficulty) < 0.2) score += 25;

    // Similar abstraction: +20 points
    if (Math.abs(node1.level.abstraction - node2.level.abstraction) < 0.2) score += 20;

    // Same domain: +15 points
    if (node1.domain && node1.domain === node2.domain) score += 15;

    // Normalize
    return score / 100;
  }
}

// Global singleton instance
let queryEngineInstance: SemanticQueryEngine | null = null;

/**
 * Get the global semantic query engine instance
 */
export async function getSemanticQueryEngine(): Promise<SemanticQueryEngine> {
  if (!queryEngineInstance) {
    queryEngineInstance = new SemanticQueryEngine();
    await queryEngineInstance.initialize();
  }
  return queryEngineInstance;
}
