/**
 * Confidence Propagation Network
 * Enhancement #7: Propagate confidence scores across graph edges
 * Identifies weak links in reasoning chains
 */

export interface ConfidenceNode {
  id: string;
  initial_confidence: number;
  propagated_confidence: number;
}

export interface ConfidenceEdge {
  from: string;
  to: string;
  strength: number; // 0-1, how much confidence transfers
}

export class ConfidencePropagationNetwork {
  private nodes: Map<string, ConfidenceNode> = new Map();
  private edges: Map<string, ConfidenceEdge> = new Map();
  private propagationFactor: number = 0.8; // 80% confidence transfers across edges

  /**
   * Add node with initial confidence
   */
  addNode(id: string, confidence: number): void {
    this.nodes.set(id, {
      id,
      initial_confidence: Math.max(0, Math.min(1, confidence)),
      propagated_confidence: confidence,
    });
  }

  /**
   * Add edge with strength
   */
  addEdge(from: string, to: string, strength: number = 1.0): void {
    const key = `${from}->${to}`;
    this.edges.set(key, {
      from,
      to,
      strength: Math.max(0, Math.min(1, strength)),
    });
  }

  /**
   * Propagate confidence through network
   * Uses iterative refinement until convergence
   */
  propagateConfidence(iterations: number = 10): void {
    for (let iter = 0; iter < iterations; iter++) {
      const updates = new Map<string, number>();

      // For each edge, propagate confidence from source to target
      for (const edge of this.edges.values()) {
        const sourceNode = this.nodes.get(edge.from);
        if (!sourceNode) continue;

        const targetNode = this.nodes.get(edge.to);
        if (!targetNode) continue;

        // Propagate: target_confidence = source_confidence * edge_strength * propagation_factor
        const propagatedValue =
          sourceNode.propagated_confidence * edge.strength * this.propagationFactor;

        const current = updates.get(edge.to) || 0;
        updates.set(edge.to, Math.max(current, propagatedValue));
      }

      // Apply updates
      for (const [nodeId, newConfidence] of updates.entries()) {
        const node = this.nodes.get(nodeId);
        if (node) {
          // Keep initial confidence floor
          node.propagated_confidence = Math.max(
            node.initial_confidence * 0.5, // Can't drop below 50% of initial
            newConfidence
          );
        }
      }
    }
  }

  /**
   * Find weak links in reasoning chain
   * Returns edges where confidence drops significantly
   */
  findWeakLinks(threshold: number = 0.5): Array<{
    from: string;
    to: string;
    confidence_drop: number;
  }> {
    const weakLinks: Array<{
      from: string;
      to: string;
      confidence_drop: number;
    }> = [];

    for (const edge of this.edges.values()) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);

      if (!fromNode || !toNode) continue;

      const expectedConfidence = fromNode.propagated_confidence * edge.strength;
      const actualConfidence = toNode.propagated_confidence;
      const drop = expectedConfidence - actualConfidence;

      if (drop > threshold) {
        weakLinks.push({
          from: edge.from,
          to: edge.to,
          confidence_drop: drop,
        });
      }
    }

    return weakLinks.sort((a, b) => b.confidence_drop - a.confidence_drop);
  }

  /**
   * Trace reasoning chain with confidence
   */
  traceChainConfidence(
    startId: string,
    endId: string
  ): Array<{ nodeId: string; confidence: number }> {
    const visited = new Set<string>();
    const path: Array<{ nodeId: string; confidence: number }> = [];

    const traverse = (nodeId: string): boolean => {
      if (nodeId === endId) {
        const node = this.nodes.get(nodeId);
        if (node) {
          path.push({
            nodeId,
            confidence: node.propagated_confidence,
          });
        }
        return true;
      }

      if (visited.has(nodeId)) return false;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) return false;

      // Find outgoing edges
      for (const edge of this.edges.values()) {
        if (edge.from === nodeId) {
          if (traverse(edge.to)) {
            path.unshift({
              nodeId,
              confidence: node.propagated_confidence,
            });
            return true;
          }
        }
      }

      return false;
    };

    traverse(startId);
    return path;
  }

  /**
   * Calculate overall chain confidence
   */
  getChainConfidence(nodeIds: string[]): number {
    let confidence = 1.0;

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromId = nodeIds[i];
      const toId = nodeIds[i + 1];

      const edge = Array.from(this.edges.values()).find(
        (e) => e.from === fromId && e.to === toId
      );

      if (!edge) return 0; // Broken chain
      confidence *= edge.strength;
    }

    // Multiply by end node's confidence
    const endNode = this.nodes.get(nodeIds[nodeIds.length - 1]);
    if (endNode) {
      confidence *= endNode.propagated_confidence;
    }

    return confidence;
  }

  /**
   * Identify contradiction signals
   * Where confidence propagation creates conflicts
   */
  findContradictions(tolerance: number = 0.3): Array<{
    node: string;
    sources: Array<{ from: string; confidence: number }>;
  }> {
    const contradictions: Array<{
      node: string;
      sources: Array<{ from: string; confidence: number }>;
    }> = [];

    for (const node of this.nodes.values()) {
      const sources: Array<{ from: string; confidence: number }> = [];

      for (const edge of this.edges.values()) {
        if (edge.to === node.id) {
          const fromNode = this.nodes.get(edge.from);
          if (fromNode) {
            sources.push({
              from: edge.from,
              confidence: fromNode.propagated_confidence * edge.strength,
            });
          }
        }
      }

      // Check if sources conflict
      if (sources.length > 1) {
        const maxConfidence = Math.max(...sources.map((s) => s.confidence));
        const minConfidence = Math.min(...sources.map((s) => s.confidence));
        const gap = maxConfidence - minConfidence;

        if (gap > tolerance) {
          contradictions.push({ node: node.id, sources });
        }
      }
    }

    return contradictions;
  }

  /**
   * Get network statistics
   */
  getStats(): Record<string, any> {
    const confidences = Array.from(this.nodes.values()).map(
      (n) => n.propagated_confidence
    );

    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      minConfidence: Math.min(...confidences),
      maxConfidence: Math.max(...confidences),
      weakLinks: this.findWeakLinks(0.3).length,
      contradictions: this.findContradictions().length,
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

// Singleton instance
let propagationInstance: ConfidencePropagationNetwork | null = null;

export function getConfidencePropagationNetwork(): ConfidencePropagationNetwork {
  if (!propagationInstance) {
    propagationInstance = new ConfidencePropagationNetwork();
  }
  return propagationInstance;
}
