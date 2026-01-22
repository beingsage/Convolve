/**
 * Graph Partitioning & Sharding Engine
 * Enhancement #2: Partitions knowledge graph by domain/abstraction
 * Enables distributed reasoning at 1M+ node scale
 */

import { KnowledgeNode, KnowledgeEdge } from '@/lib/types';

interface Partition {
  id: string;
  nodes: Map<string, KnowledgeNode>;
  edges: Map<string, KnowledgeEdge>;
  bridges: Array<{ from: string; to: string; partition: string }>;
  metadata: {
    domain: string;
    abstraction_range: [number, number];
    size: number;
    density: number;
  };
}

export class GraphPartitioner {
  private partitions: Map<string, Partition> = new Map();
  private nodeToPartition: Map<string, string> = new Map();

  /**
   * Partition graph by domain using simple clustering
   */
  partitionByDomain(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Map<string, Partition> {
    const domains = new Set<string>();

    // Collect unique domains
    for (const node of nodes) {
      // Extract domain from node type or description
      const domain = this.extractDomain(node);
      domains.add(domain);
    }

    // Create partitions per domain
    for (const domain of domains) {
      const domainNodes = nodes.filter((n) => this.extractDomain(n) === domain);
      const domainEdges = edges.filter(
        (e) =>
          domainNodes.some((n) => n.id === e.from_node_id) ||
          domainNodes.some((n) => n.id === e.to_node_id)
      );

      const partition: Partition = {
        id: domain,
        nodes: new Map(domainNodes.map((n) => [n.id, n])),
        edges: new Map(domainEdges.map((e) => [e.id, e])),
        bridges: [],
        metadata: {
          domain,
          abstraction_range: this.getAbstractionRange(domainNodes),
          size: domainNodes.length,
          density: domainEdges.length / (domainNodes.length * (domainNodes.length - 1)),
        },
      };

      this.partitions.set(domain, partition);
      domainNodes.forEach((n) => this.nodeToPartition.set(n.id, domain));
    }

    // Find bridges (edges crossing partitions)
    for (const edge of edges) {
      const fromPartition = this.nodeToPartition.get(edge.from_node_id);
      const toPartition = this.nodeToPartition.get(edge.to_node_id);

      if (fromPartition && toPartition && fromPartition !== toPartition) {
        const fromPart = this.partitions.get(fromPartition)!;
        fromPart.bridges.push({
          from: edge.from_node_id,
          to: edge.to_node_id,
          partition: toPartition,
        });
      }
    }

    return this.partitions;
  }

  /**
   * Partition by abstraction level (math → system → product)
   */
  partitionByAbstraction(
    nodes: KnowledgeNode[],
    levels: number = 3
  ): Map<string, Partition> {
    const abstractions = Array.from(
      { length: levels },
      (_, i) => `L${i}`
    );

    for (const level of abstractions) {
      const levelNodes = nodes.filter((n) => {
        const normalized = Math.floor(n.level.abstraction * levels);
        return normalized === parseInt(level.slice(1));
      });

      const partition: Partition = {
        id: level,
        nodes: new Map(levelNodes.map((n) => [n.id, n])),
        edges: new Map(),
        bridges: [],
        metadata: {
          domain: `abstraction_${level}`,
          abstraction_range: [
            parseInt(level.slice(1)) / levels,
            (parseInt(level.slice(1)) + 1) / levels,
          ],
          size: levelNodes.length,
          density: 0,
        },
      };

      this.partitions.set(level, partition);
      levelNodes.forEach((n) => this.nodeToPartition.set(n.id, level));
    }

    return this.partitions;
  }

  /**
   * Get partition for node
   */
  getPartition(nodeId: string): Partition | null {
    const partitionId = this.nodeToPartition.get(nodeId);
    if (!partitionId) return null;
    return this.partitions.get(partitionId) || null;
  }

  /**
   * Get local subgraph within partition
   */
  getLocalSubgraph(nodeId: string, depth: number = 2): Map<string, KnowledgeNode> {
    const partition = this.getPartition(nodeId);
    if (!partition) return new Map();

    const result = new Map<string, KnowledgeNode>();
    const queue = [nodeId];
    const visited = new Set<string>();
    let currentDepth = 0;

    while (queue.length > 0 && currentDepth < depth) {
      const nextQueue = [];

      for (const nid of queue) {
        if (visited.has(nid)) continue;
        visited.add(nid);

        const node = partition.nodes.get(nid);
        if (node) {
          result.set(nid, node);
        }

        // Find connected nodes within partition
        for (const edge of partition.edges.values()) {
          if (edge.from_node_id === nid) {
            const target = partition.nodes.get(edge.to_node_id);
            if (target && !visited.has(edge.to_node_id)) {
              nextQueue.push(edge.to_node_id);
            }
          } else if (edge.to_node_id === nid) {
            const target = partition.nodes.get(edge.from_node_id);
            if (target && !visited.has(edge.from_node_id)) {
              nextQueue.push(edge.from_node_id);
            }
          }
        }
      }

      queue.length = 0;
      queue.push(...nextQueue);
      currentDepth++;
    }

    return result;
  }

  /**
   * Cross-partition reasoning
   */
  getCrossPartitionPath(
    fromId: string,
    toId: string
  ): Array<{ partitionId: string; nodeId: string }> {
    const fromPartition = this.nodeToPartition.get(fromId);
    const toPartition = this.nodeToPartition.get(toId);

    if (!fromPartition || !toPartition) return [];

    // Simple bridge traversal
    const path: Array<{ partitionId: string; nodeId: string }> = [];
    path.push({ partitionId: fromPartition, nodeId: fromId });

    if (fromPartition !== toPartition) {
      // Find intermediate partitions
      const intermediate = Array.from(this.partitions.keys()).filter(
        (p) => p !== fromPartition && p !== toPartition
      );
      intermediate.forEach((p) => {
        path.push({ partitionId: p, nodeId: '' }); // Bridge point
      });
    }

    path.push({ partitionId: toPartition, nodeId: toId });
    return path;
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      partitionCount: this.partitions.size,
      partitions: {},
    };

    for (const [id, partition] of this.partitions.entries()) {
      stats.partitions[id] = {
        nodes: partition.nodes.size,
        edges: partition.edges.size,
        bridges: partition.bridges.length,
        density: partition.metadata.density,
      };
    }

    return stats;
  }

  private extractDomain(node: KnowledgeNode): string {
    // Extract domain from node type or metadata
    return node.type === 'algorithm' ? 'ml' : node.type === 'paper' ? 'research' : 'general';
  }

  private getAbstractionRange(nodes: KnowledgeNode[]): [number, number] {
    const abstractions = nodes.map((n) => n.level.abstraction);
    return [Math.min(...abstractions), Math.max(...abstractions)];
  }
}

// Singleton instance
let partitionerInstance: GraphPartitioner | null = null;

export function getGraphPartitioner(): GraphPartitioner {
  if (!partitionerInstance) {
    partitionerInstance = new GraphPartitioner();
  }
  return partitionerInstance;
}
