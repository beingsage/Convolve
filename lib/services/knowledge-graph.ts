/**
 * Knowledge Graph Service
 * Manages graph relationships, multi-hop reasoning, and conflict detection
 */

import {
  KnowledgeNode,
  KnowledgeEdge,
  RelationType,
  NodeType,
  ConceptPath,
  ConceptComparison,
} from '@/lib/types';
import { IStorageAdapter } from '@/lib/storage/adapter';
import { getStorageAdapter } from '@/lib/storage/factory';

export class KnowledgeGraphService {
  private storage: IStorageAdapter | null = null;

  async initialize() {
    this.storage = await getStorageAdapter();
  }

  private getStorage(): IStorageAdapter {
    if (!this.storage) throw new Error('KnowledgeGraphService not initialized');
    return this.storage;
  }

  /**
   * Create a node in the knowledge graph
   */
  async createNode(
    name: string,
    type: NodeType,
    description: string,
    metadata?: Partial<KnowledgeNode>
  ): Promise<KnowledgeNode> {
    const now = new Date();
    const node: KnowledgeNode = {
      id: generateNodeId(),
      type,
      name,
      description,
      level: {
        abstraction: metadata?.level?.abstraction || 0.5,
        difficulty: metadata?.level?.difficulty || 0.5,
        volatility: metadata?.level?.volatility || 0.3,
      },
      cognitive_state: {
        strength: metadata?.cognitive_state?.strength || 1.0,
        activation: metadata?.cognitive_state?.activation || 0.5,
        decay_rate: metadata?.cognitive_state?.decay_rate || 0.01,
        confidence: metadata?.cognitive_state?.confidence || 0.8,
      },
      temporal: {
        introduced_at: metadata?.temporal?.introduced_at || now,
        last_reinforced_at: metadata?.temporal?.last_reinforced_at || now,
        peak_relevance_at: metadata?.temporal?.peak_relevance_at || now,
      },
      real_world: {
        used_in_production: metadata?.real_world?.used_in_production || false,
        companies_using: metadata?.real_world?.companies_using || 0,
        avg_salary_weight: metadata?.real_world?.avg_salary_weight || 0,
        interview_frequency: metadata?.real_world?.interview_frequency || 0,
      },
      grounding: {
        source_refs: metadata?.grounding?.source_refs || [],
        implementation_refs: metadata?.grounding?.implementation_refs || [],
      },
      failure_surface: {
        common_bugs: metadata?.failure_surface?.common_bugs || [],
        misconceptions: metadata?.failure_surface?.misconceptions || [],
      },
      canonical_name: metadata?.canonical_name,
      first_appearance_year: metadata?.first_appearance_year,
      domain: metadata?.domain,
      created_at: now,
      updated_at: now,
    };

    return this.getStorage().createNode(node);
  }

  /**
   * Create an edge between two nodes
   */
  async createEdge(
    fromNodeId: string,
    toNodeId: string,
    relation: RelationType,
    metadata?: Partial<KnowledgeEdge>
  ): Promise<KnowledgeEdge> {
    const now = new Date();
    const edge: KnowledgeEdge = {
      id: generateEdgeId(),
      from_node: fromNodeId,
      to_node: toNodeId,
      relation,
      weight: {
        strength: metadata?.weight?.strength || 0.8,
        decay_rate: metadata?.weight?.decay_rate || 0.01,
        reinforcement_rate: metadata?.weight?.reinforcement_rate || 0.05,
      },
      dynamics: {
        inhibitory: metadata?.dynamics?.inhibitory || false,
        directional: metadata?.dynamics?.directional !== false,
      },
      temporal: {
        created_at: metadata?.temporal?.created_at || now,
        last_used_at: metadata?.temporal?.last_used_at || now,
      },
      confidence: metadata?.confidence || 0.8,
      created_at: now,
      updated_at: now,
    };

    return this.getStorage().createEdge(edge);
  }

  /**
   * Find path between two concepts (for curriculum and reasoning)
   */
  async findConceptPath(
    fromNodeId: string,
    toNodeId: string,
    maxDepth: number = 5
  ): Promise<ConceptPath> {
    const edges = await this.getStorage().getPath(fromNodeId, toNodeId, maxDepth);

    if (edges.length === 0) {
      return {
        nodes: [],
        edges: [],
        reasoning: 'No path found between concepts',
      };
    }

    // Build node list from edges
    const nodeIds = new Set<string>([fromNodeId]);
    for (const edge of edges) {
      nodeIds.add(edge.from_node);
      nodeIds.add(edge.to_node);
    }

    const nodes: KnowledgeNode[] = [];
    for (const nodeId of nodeIds) {
      const node = await this.getStorage().getNode(nodeId);
      if (node) nodes.push(node);
    }

    const reasoning = this.generatePathReasoning(nodes, edges);

    return {
      nodes,
      edges,
      reasoning,
    };
  }

  /**
   * Compare two concepts
   */
  async compareConceptS(nodeId1: string, nodeId2: string): Promise<ConceptComparison> {
    const node1 = await this.getStorage().getNode(nodeId1);
    const node2 = await this.getStorage().getNode(nodeId2);

    if (!node1 || !node2) {
      throw new Error('One or both nodes not found');
    }

    const similarities = this.findSimilarities(node1, node2);
    const differences = this.findDifferences(node1, node2);
    const whenUse1 = this.generateWhenToUse(node1, node2, 'a');
    const whenUse2 = this.generateWhenToUse(node2, node1, 'b');

    return {
      concept_a: node1,
      concept_b: node2,
      similarities,
      differences,
      when_to_use_a: whenUse1,
      when_to_use_b: whenUse2,
    };
  }

  /**
   * Detect conflicts between related concepts
   */
  async detectConflicts(
    nodeIds: string[]
  ): Promise<Array<{ concept_a: KnowledgeNode; concept_b: KnowledgeNode; conflict: string }>> {
    const conflicts: Array<{
      concept_a: KnowledgeNode;
      concept_b: KnowledgeNode;
      conflict: string;
    }> = [];

    const nodes: Map<string, KnowledgeNode> = new Map();
    for (const id of nodeIds) {
      const node = await this.getStorage().getNode(id);
      if (node) nodes.set(id, node);
    }

    // Check for COMPETES_WITH or FAILS_ON edges
    for (const [id1, node1] of nodes) {
      const edges = await this.getStorage().getEdgesFrom(id1);
      for (const edge of edges) {
        if ((edge.relation === 'competes_with' || edge.relation === 'fails_on') && nodes.has(edge.to_node)) {
          const node2 = nodes.get(edge.to_node)!;
          conflicts.push({
            concept_a: node1,
            concept_b: node2,
            conflict: `${node1.name} ${edge.relation} ${node2.name}`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get all concepts that a node depends on
   */
  async getPrerequisites(nodeId: string, depth: number = 2): Promise<KnowledgeNode[]> {
    const prerequisites: Set<KnowledgeNode> = new Set();
    const visited = new Set<string>();

    const collect = async (id: string, currentDepth: number) => {
      if (visited.has(id) || currentDepth <= 0) return;
      visited.add(id);

      const edges = await this.getStorage().getEdgesTo(id);
      for (const edge of edges) {
        if (
          edge.relation === 'requires' ||
          edge.relation === 'depends_on' ||
          edge.relation === 'requires_for_debugging'
        ) {
          const node = await this.getStorage().getNode(edge.from_node);
          if (node) {
            prerequisites.add(node);
            await collect(edge.from_node, currentDepth - 1);
          }
        }
      }
    };

    await collect(nodeId, depth);
    return Array.from(prerequisites);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generatePathReasoning(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): string {
    if (nodes.length === 0) return 'No path found';
    if (nodes.length === 1) return 'Start and end are the same concept';

    const relations = edges.map(e => e.relation).join(' → ');
    const names = nodes.map(n => n.name).join(' → ');

    return `Conceptual path: ${names}. Relationships: ${relations}`;
  }

  private findSimilarities(node1: KnowledgeNode, node2: KnowledgeNode): string[] {
    const similarities: string[] = [];

    if (node1.type === node2.type) {
      similarities.push(`Both are ${node1.type}`);
    }

    if (Math.abs(node1.level.difficulty - node2.level.difficulty) < 0.2) {
      similarities.push('Similar difficulty level');
    }

    if (Math.abs(node1.level.abstraction - node2.level.abstraction) < 0.2) {
      similarities.push('Similar level of abstraction');
    }

    if (node1.domain === node2.domain && node1.domain) {
      similarities.push(`Both belong to ${node1.domain} domain`);
    }

    return similarities;
  }

  private findDifferences(node1: KnowledgeNode, node2: KnowledgeNode): string[] {
    const differences: string[] = [];

    if (node1.cognitive_state.confidence !== node2.cognitive_state.confidence) {
      const higher = node1.cognitive_state.confidence > node2.cognitive_state.confidence ? node1.name : node2.name;
      differences.push(`${higher} has higher confidence`);
    }

    if (node1.real_world.used_in_production !== node2.real_world.used_in_production) {
      const inProd = node1.real_world.used_in_production ? node1.name : node2.name;
      differences.push(`${inProd} is used in production`);
    }

    if (Math.abs(node1.level.volatility - node2.level.volatility) > 0.3) {
      differences.push('Different volatility (rate of change)');
    }

    return differences;
  }

  private generateWhenToUse(
    node: KnowledgeNode,
    other: KnowledgeNode,
    label: string
  ): string {
    const factors: string[] = [];

    if (node.level.difficulty < other.level.difficulty) {
      factors.push('easier to learn');
    }

    if (node.level.volatility < other.level.volatility) {
      factors.push('more stable/timeless');
    }

    if (node.real_world.used_in_production && !other.real_world.used_in_production) {
      factors.push('used in production systems');
    }

    if (factors.length === 0) {
      return `Use ${label} based on specific problem requirements`;
    }

    return `Use ${label} when you want: ${factors.join(', ')}`;
  }
}

// ============================================================================
// Utility ID Generators
// ============================================================================

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
