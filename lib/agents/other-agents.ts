/**
 * Alignment, Contradiction, Curriculum, and Research Agents
 */

import { AgentProposal, KnowledgeNode } from '@/lib/types';
import { IStorageAdapter } from '@/lib/storage/adapter';

// ============================================================================
// Alignment Agent - Normalize concepts and find duplicates
// ============================================================================

export class AlignmentAgent {
  constructor(private storage: IStorageAdapter) {}

  async findDuplicatesAndNormalize(): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    // Get all nodes
    let page = 1;
    const nodeMap = new Map<string, KnowledgeNode>();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.storage.listNodes(page, 100);
      result.items.forEach(n => nodeMap.set(n.id, n));

      if (!result.has_more) break;
      page++;
    }

    // Check for similar concepts
    const nodes = Array.from(nodeMap.values());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.calculateSimilarity(nodes[i].name, nodes[j].name);

        if (similarity > 0.8) {
          // Propose merging
          const proposal: AgentProposal = {
            id: `prop_${Date.now()}_${Math.random()}`,
            agent_type: 'alignment',
            action: 'merge_nodes',
            target: { node_a: nodes[i].id, node_b: nodes[j].id },
            reasoning: `Concepts "${nodes[i].name}" and "${nodes[j].name}" are highly similar (${(similarity * 100).toFixed(1)}%)`,
            confidence: similarity,
            created_at: new Date(),
            status: 'proposed',
          };

          proposals.push(proposal);
        }
      }
    }

    return proposals;
  }

  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// ============================================================================
// Contradiction Agent - Detect conflicts
// ============================================================================

export class ContradictionAgent {
  constructor(private storage: IStorageAdapter) {}

  async detectAndFlagConflicts(): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    // Get all edges
    const allNodes = await this.getAllNodes();

    for (const node of allNodes) {
      const outgoing = await this.storage.getEdgesFrom(node.id);

      // Look for conflicting relationships
      for (const edge of outgoing) {
        if (edge.relation === 'competes_with' || edge.relation === 'fails_on') {
          const conflictNode = await this.storage.getNode(edge.to_node);

          if (conflictNode && node.cognitive_state.confidence > 0.9) {
            const proposal: AgentProposal = {
              id: `prop_${Date.now()}_${Math.random()}`,
              agent_type: 'contradiction',
              action: 'flag_conflict',
              target: { node_a: node.id, node_b: edge.to_node },
              reasoning: `Detected conflict: "${node.name}" ${edge.relation} "${conflictNode.name}"`,
              confidence: Math.min(node.cognitive_state.confidence, edge.confidence),
              created_at: new Date(),
              status: 'proposed',
            };

            proposals.push(proposal);
          }
        }
      }
    }

    return proposals;
  }

  private async getAllNodes(): Promise<KnowledgeNode[]> {
    const nodes: KnowledgeNode[] = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.storage.listNodes(page, 100);
      nodes.push(...result.items);

      if (!result.has_more) break;
      page++;
    }

    return nodes;
  }
}

// ============================================================================
// Curriculum Agent - Generate learning paths
// ============================================================================

export class CurriculumAgent {
  constructor(private storage: IStorageAdapter) {}

  async generateLearningPaths(userKnownNodeIds: string[]): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    const knownSet = new Set(userKnownNodeIds);
    const allNodes = await this.getAllNodes();

    // For each unknown concept, find prerequisites
    for (const node of allNodes) {
      if (knownSet.has(node.id)) continue;

      // Find nodes that lead to this one
      const prerequisites = await this.storage.getEdgesTo(node.id);
      const missingPrereqs = prerequisites.filter(e =>
        !knownSet.has(e.from_node) && (e.relation === 'requires' || e.relation === 'depends_on')
      );

      if (missingPrereqs.length > 0 && missingPrereqs.length < 3) {
        const proposal: AgentProposal = {
          id: `prop_${Date.now()}_${Math.random()}`,
          agent_type: 'curriculum',
          action: 'create_node', // Placeholder - actually a learning recommendation
          target: node,
          reasoning: `To understand "${node.name}", first learn: ${missingPrereqs.length} prerequisite(s)`,
          confidence: 0.85,
          created_at: new Date(),
          status: 'proposed',
        };

        proposals.push(proposal);
      }
    }

    return proposals;
  }

  private async getAllNodes(): Promise<KnowledgeNode[]> {
    const nodes: KnowledgeNode[] = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.storage.listNodes(page, 100);
      nodes.push(...result.items);

      if (!result.has_more) break;
      page++;
    }

    return nodes;
  }
}

// ============================================================================
// Research Agent - Find knowledge gaps
// ============================================================================

export class ResearchAgent {
  constructor(private storage: IStorageAdapter) {}

  async exploreKnowledgeGaps(): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    // Find low-confidence nodes
    const allNodes = await this.getAllNodes();

    for (const node of allNodes) {
      if (node.cognitive_state.confidence < 0.5) {
        const edges = await this.storage.getEdgesFrom(node.id);

        const proposal: AgentProposal = {
          id: `prop_${Date.now()}_${Math.random()}`,
          agent_type: 'research',
          action: 'update_node',
          target: node,
          reasoning: `"${node.name}" has low confidence (${(node.cognitive_state.confidence * 100).toFixed(0)}%). Recommend: fetch more sources, verify with experts`,
          confidence: 0.6,
          created_at: new Date(),
          status: 'proposed',
        };

        proposals.push(proposal);
      }

      // Find isolated nodes with few connections
      const edges = await this.storage.getEdgesFrom(node.id);
      if (edges.length === 0 && node.type === 'concept') {
        const proposal: AgentProposal = {
          id: `prop_${Date.now()}_${Math.random()}`,
          agent_type: 'research',
          action: 'create_edge',
          target: node,
          reasoning: `"${node.name}" is isolated (no outgoing edges). Investigate: is it foundational or orphaned?`,
          confidence: 0.7,
          created_at: new Date(),
          status: 'proposed',
        };

        proposals.push(proposal);
      }
    }

    return proposals;
  }

  private async getAllNodes(): Promise<KnowledgeNode[]> {
    const nodes: KnowledgeNode[] = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.storage.listNodes(page, 100);
      nodes.push(...result.items);

      if (!result.has_more) break;
      page++;
    }

    return nodes;
  }
}
