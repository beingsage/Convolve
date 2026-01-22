/**
 * Knowledge Gap Detection System
 * Enhancement #21: Identify what we don't know
 * Missing prerequisites, low-confidence areas, research directions
 */

export interface KnowledgeGap {
  type: 'missing_prerequisite' | 'low_confidence' | 'contradiction' | 'isolated_node';
  description: string;
  affected_nodes: string[];
  severity: number; // 0-1
  suggested_research: string;
}

export class KnowledgeGapDetector {
  /**
   * Find missing prerequisite nodes
   * A concept should have prerequisites but doesn't
   */
  findMissingPrerequisites(nodes: any[], edges: any[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const node of nodes) {
      // Complex concepts should have prerequisites
      if (node.level.difficulty > 0.6 && node.level.abstraction > 0.5) {
        const incomingEdges = edges.filter(
          (e) => e.to_node_id === node.id && e.relation_type === 'REQUIRES'
        );

        if (incomingEdges.length === 0) {
          gaps.push({
            type: 'missing_prerequisite',
            description: `${node.name} requires prerequisites but none defined`,
            affected_nodes: [node.id],
            severity: node.level.difficulty,
            suggested_research: `Identify foundational concepts needed for ${node.name}`,
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Find low-confidence areas
   */
  findLowConfidenceAreas(nodes: any[], threshold: number = 0.6): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    const lowConfidenceNodes = nodes.filter(
      (n) => n.cognitive_state.confidence < threshold
    );

    if (lowConfidenceNodes.length > 0) {
      gaps.push({
        type: 'low_confidence',
        description: `${lowConfidenceNodes.length} concepts have low confidence scores`,
        affected_nodes: lowConfidenceNodes.map((n) => n.id),
        severity: Math.max(
          ...(lowConfidenceNodes.map((n) => 1 - n.cognitive_state.confidence) ||
            [0])
        ),
        suggested_research: `Verify and reinforce ${lowConfidenceNodes.length} low-confidence concepts`,
      });
    }

    return gaps;
  }

  /**
   * Find contradictory areas
   */
  findContradictions(nodes: any[], edges: any[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    const contradictoryEdges = edges.filter(
      (e) => e.relation_type === 'FAILS_ON' || e.relation_type === 'COMPETES_WITH'
    );

    for (const edge of contradictoryEdges) {
      gaps.push({
        type: 'contradiction',
        description: `Contradiction between concepts: ${edge.from_node_id} and ${edge.to_node_id}`,
        affected_nodes: [edge.from_node_id, edge.to_node_id],
        severity: 0.8,
        suggested_research: `Resolve contradiction: When does ${edge.from_node_id} fail against ${edge.to_node_id}?`,
      });
    }

    return gaps;
  }

  /**
   * Find isolated nodes (no connections)
   */
  findIsolatedNodes(nodes: any[], edges: any[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.from_node_id);
      connectedNodeIds.add(edge.to_node_id);
    }

    const isolatedNodes = nodes.filter((n) => !connectedNodeIds.has(n.id));

    if (isolatedNodes.length > 0) {
      gaps.push({
        type: 'isolated_node',
        description: `${isolatedNodes.length} concepts are isolated (no connections)`,
        affected_nodes: isolatedNodes.map((n) => n.id),
        severity: 0.5,
        suggested_research: `Establish relationships for: ${isolatedNodes.map((n) => n.name).join(', ')}`,
      });
    }

    return gaps;
  }

  /**
   * Find sparse domains
   * Domains with few concepts
   */
  findSparseDomains(nodes: any[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    const domainCounts = new Map<string, string[]>();
    for (const node of nodes) {
      if (!domainCounts.has(node.domain)) {
        domainCounts.set(node.domain, []);
      }
      domainCounts.get(node.domain)!.push(node.id);
    }

    for (const [domain, nodeIds] of domainCounts.entries()) {
      if (nodeIds.length < 5) {
        gaps.push({
          type: 'low_confidence',
          description: `Domain "${domain}" is sparsely covered with only ${nodeIds.length} concepts`,
          affected_nodes: nodeIds,
          severity: (5 - nodeIds.length) / 5,
          suggested_research: `Expand domain coverage for ${domain}`,
        });
      }
    }

    return gaps;
  }

  /**
   * Find concepts with few sources
   */
  findUnsupportedConcepts(nodes: any[], minSources: number = 2): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    const unsupported = nodes.filter((n) => (n.source_count || 0) < minSources);

    if (unsupported.length > 0) {
      gaps.push({
        type: 'low_confidence',
        description: `${unsupported.length} concepts have fewer than ${minSources} sources`,
        affected_nodes: unsupported.map((n) => n.id),
        severity: Math.max(...(unsupported.map((n) => 1 - n.confidence_score) || [0])),
        suggested_research: `Find additional sources for: ${unsupported.map((n) => n.name).join(', ')}`,
      });
    }

    return gaps;
  }

  /**
   * Aggregate all gaps
   */
  detectAllGaps(nodes: any[], edges: any[]): KnowledgeGap[] {
    const allGaps: KnowledgeGap[] = [];

    allGaps.push(
      ...this.findMissingPrerequisites(nodes, edges),
      ...this.findLowConfidenceAreas(nodes, 0.6),
      ...this.findContradictions(nodes, edges),
      ...this.findIsolatedNodes(nodes, edges),
      ...this.findSparseDomains(nodes),
      ...this.findUnsupportedConcepts(nodes, 2)
    );

    return allGaps.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Prioritize gaps for research
   */
  prioritizeGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
    return gaps.sort((a, b) => {
      // High severity first
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }

      // More affected nodes first
      return b.affected_nodes.length - a.affected_nodes.length;
    });
  }

  /**
   * Get summary report
   */
  generateReport(gaps: KnowledgeGap[]): string {
    const byType = new Map<string, KnowledgeGap[]>();

    for (const gap of gaps) {
      if (!byType.has(gap.type)) {
        byType.set(gap.type, []);
      }
      byType.get(gap.type)!.push(gap);
    }

    let report = 'KNOWLEDGE GAP ANALYSIS\n';
    report += '='.repeat(50) + '\n\n';

    for (const [type, typeGaps] of byType.entries()) {
      report += `${type.toUpperCase()} (${typeGaps.length})\n`;
      report += '-'.repeat(30) + '\n';

      for (const gap of typeGaps) {
        report += `Severity: ${(gap.severity * 100).toFixed(0)}%\n`;
        report += `Description: ${gap.description}\n`;
        report += `Research: ${gap.suggested_research}\n\n`;
      }
    }

    return report;
  }
}

// Singleton instance
let gapDetectorInstance: KnowledgeGapDetector | null = null;

export function getKnowledgeGapDetector(): KnowledgeGapDetector {
  if (!gapDetectorInstance) {
    gapDetectorInstance = new KnowledgeGapDetector();
  }
  return gapDetectorInstance;
}
