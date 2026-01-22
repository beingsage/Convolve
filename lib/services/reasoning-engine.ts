/**
 * Multi-hop Reasoning Engine
 * Graph traversal, dependency analysis, curriculum generation
 */

import { KnowledgeNode, KnowledgeEdge } from '@/lib/types';

export interface ReasoningResult {
  path: string[];
  reasoning: string;
  confidence: number;
}

export interface DependencyChain {
  node_id: string;
  name: string;
  depth: number;
  dependencies: string[];
  dependents: string[];
}

export class ReasoningEngine {
  /**
   * Find shortest path between two concepts
   */
  static findPath(
    startId: string,
    endId: string,
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>
  ): string[] {
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startId, path: [startId] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === endId) {
        return path;
      }

      // Get outgoing edges
      const outgoing = edges.get(nodeId) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.to_node_id)) {
          visited.add(edge.to_node_id);
          queue.push({ nodeId: edge.to_node_id, path: [...path, edge.to_node_id] });
        }
      }
    }

    return [];
  }

  /**
   * Compute transitive dependencies (multi-hop)
   */
  static computeDependencies(
    nodeId: string,
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>,
    maxDepth: number = 5
  ): DependencyChain {
    const dependencies: string[] = [];
    const dependents: string[] = [];
    const visited = new Set<string>();

    // Forward traversal (what depends on this)
    this.traverseForward(nodeId, edges, visited, 0, maxDepth, dependents);

    // Backward traversal (what this depends on)
    visited.clear();
    this.traverseBackward(nodeId, edges, visited, 0, maxDepth, dependencies);

    const node = nodes.get(nodeId);
    return {
      node_id: nodeId,
      name: node?.name || 'Unknown',
      depth: maxDepth,
      dependencies,
      dependents,
    };
  }

  /**
   * Detect contradictions in graph
   */
  static detectContradictions(
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>
  ): Array<{ nodeA: string; nodeB: string; relation: string }> {
    const contradictions: Array<{ nodeA: string; nodeB: string; relation: string }> = [];

    // Look for edges marked as FAILS_ON or COMPETES_WITH
    for (const [sourceId, outgoing] of edges.entries()) {
      for (const edge of outgoing) {
        if (
          edge.relation_type === 'FAILS_ON' ||
          edge.relation_type === 'COMPETES_WITH'
        ) {
          contradictions.push({
            nodeA: sourceId,
            nodeB: edge.to_node_id,
            relation: edge.relation_type,
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Generate personalized curriculum
   */
  static generateCurriculum(
    currentKnown: Set<string>,
    allNodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>,
    targetNode: string
  ): string[] {
    // BFS to find prerequisites of target node
    const prerequisites: string[] = [];
    const visited = new Set<string>();

    const queue = [targetNode];
    visited.add(targetNode);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      // Find incoming edges (prerequisites)
      for (const [srcId, srcEdges] of edges.entries()) {
        for (const edge of srcEdges) {
          if (edge.to_node_id === nodeId && edge.relation_type === 'REQUIRES') {
            if (!visited.has(srcId)) {
              visited.add(srcId);
              queue.push(srcId);
              if (!currentKnown.has(srcId)) {
                prerequisites.push(srcId);
              }
            }
          }
        }
      }
    }

    // Sort by difficulty (easier first)
    prerequisites.sort((a, b) => {
      const nodeA = allNodes.get(a);
      const nodeB = allNodes.get(b);
      return (nodeA?.level.difficulty || 0) - (nodeB?.level.difficulty || 0);
    });

    return prerequisites;
  }

  /**
   * Explain concept with context
   */
  static explainConcept(
    nodeId: string,
    nodes: Map<string, KnowledgeNode>,
    edges: Map<string, KnowledgeEdge[]>
  ): string {
    const node = nodes.get(nodeId);
    if (!node) return 'Concept not found';

    const deps = this.computeDependencies(nodeId, nodes, edges, 2);
    const explanation = [
      `## ${node.name}`,
      '',
      node.description,
      '',
      `**Abstraction Level:** ${(node.level.abstraction * 100).toFixed(0)}%`,
      `**Difficulty:** ${(node.level.difficulty * 100).toFixed(0)}%`,
      `**Confidence:** ${(node.cognitive_state.confidence * 100).toFixed(0)}%`,
      '',
    ];

    if (deps.dependencies.length > 0) {
      explanation.push(`**Requires:** ${deps.dependencies.join(', ')}`);
    }

    if (deps.dependents.length > 0) {
      explanation.push(`**Enables:** ${deps.dependents.join(', ')}`);
    }

    return explanation.join('\n');
  }

  /**
   * Compare two concepts
   */
  static compareConcepts(
    nodeIdA: string,
    nodeIdB: string,
    nodes: Map<string, KnowledgeNode>
  ): string {
    const nodeA = nodes.get(nodeIdA);
    const nodeB = nodes.get(nodeIdB);

    if (!nodeA || !nodeB) return 'One or both concepts not found';

    const comparison = [
      `## ${nodeA.name} vs ${nodeB.name}`,
      '',
      '| Property | ' + nodeA.name + ' | ' + nodeB.name + ' |',
      '|----------|' + Array(nodeA.name.length + 2).fill('-').join('') + '|' + Array(nodeB.name.length + 2).fill('-').join('') + '|',
      `| Abstraction | ${(nodeA.level.abstraction * 100).toFixed(0)}% | ${(nodeB.level.abstraction * 100).toFixed(0)}% |`,
      `| Difficulty | ${(nodeA.level.difficulty * 100).toFixed(0)}% | ${(nodeB.level.difficulty * 100).toFixed(0)}% |`,
      `| Volatility | ${(nodeA.level.volatility * 100).toFixed(0)}% | ${(nodeB.level.volatility * 100).toFixed(0)}% |`,
      `| Strength | ${(nodeA.cognitive_state.strength * 100).toFixed(0)}% | ${(nodeB.cognitive_state.strength * 100).toFixed(0)}% |`,
      '',
      `**A:** ${nodeA.description}`,
      `**B:** ${nodeB.description}`,
    ];

    return comparison.join('\n');
  }

  /**
   * Private: Forward traversal
   */
  private static traverseForward(
    nodeId: string,
    edges: Map<string, KnowledgeEdge[]>,
    visited: Set<string>,
    depth: number,
    maxDepth: number,
    result: string[]
  ): void {
    if (depth >= maxDepth || visited.has(nodeId)) return;
    visited.add(nodeId);

    for (const [srcId, srcEdges] of edges.entries()) {
      for (const edge of srcEdges) {
        if (edge.from_node_id === nodeId) {
          result.push(edge.to_node_id);
          this.traverseForward(edge.to_node_id, edges, visited, depth + 1, maxDepth, result);
        }
      }
    }
  }

  /**
   * Private: Backward traversal
   */
  private static traverseBackward(
    nodeId: string,
    edges: Map<string, KnowledgeEdge[]>,
    visited: Set<string>,
    depth: number,
    maxDepth: number,
    result: string[]
  ): void {
    if (depth >= maxDepth || visited.has(nodeId)) return;
    visited.add(nodeId);

    for (const [srcId, srcEdges] of edges.entries()) {
      for (const edge of srcEdges) {
        if (edge.to_node_id === nodeId) {
          result.push(srcId);
          this.traverseBackward(srcId, edges, visited, depth + 1, maxDepth, result);
        }
      }
    }
  }
}
