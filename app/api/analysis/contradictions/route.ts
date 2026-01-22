/**
 * GET /api/analysis/contradictions
 * Detect and analyze contradictions in knowledge graph
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import { ReasoningEngine } from '@/lib/services/reasoning-engine';

export async function GET(request: NextRequest) {
  try {
    const storage = await getStorageAdapter();

    // Load all nodes and edges
    const nodesResp = await storage.listNodes(0, 10000);
    const nodes = new Map(nodesResp.items.map((n: any) => [n.id, n]));

    const edgesResp = await storage.getEdgesFrom('*');
    const edges = new Map<string, any[]>();
    for (const edge of edgesResp) {
      if (!edges.has(edge.from_node_id)) {
        edges.set(edge.from_node_id, []);
      }
      edges.get(edge.from_node_id)!.push(edge);
    }

    // Detect contradictions
    const contradictions = ReasoningEngine.detectContradictions(nodes, edges);

    // Enrich with details
    const enriched = contradictions.map((c) => ({
      id: `${c.nodeA}_${c.nodeB}`,
      nodeA: {
        id: c.nodeA,
        name: nodes.get(c.nodeA)?.name || 'Unknown',
        type: nodes.get(c.nodeA)?.type,
      },
      nodeB: {
        id: c.nodeB,
        name: nodes.get(c.nodeB)?.name || 'Unknown',
        type: nodes.get(c.nodeB)?.type,
      },
      relation: c.relation,
      severity: c.relation === 'FAILS_ON' ? 'high' : 'medium',
      description:
        c.relation === 'FAILS_ON'
          ? `"${nodes.get(c.nodeA)?.name}" fails on "${nodes.get(c.nodeB)?.name}"`
          : `"${nodes.get(c.nodeA)?.name}" competes with "${nodes.get(c.nodeB)?.name}"`,
    }));

    // Categorize contradictions
    const failureContradictions = enriched.filter((c) => c.relation === 'FAILS_ON');
    const competitionContradictions = enriched.filter((c) => c.relation === 'COMPETES_WITH');

    return NextResponse.json({
      success: true,
      summary: {
        total_contradictions: enriched.length,
        failure_mode_contradictions: failureContradictions.length,
        competing_approaches: competitionContradictions.length,
      },
      failure_modes: failureContradictions,
      competing_approaches: competitionContradictions,
      recommendations: [
        failureContradictions.length > 0
          ? 'Review failure modes and add defensive programming patterns'
          : null,
        competitionContradictions.length > 0
          ? 'Compare competing approaches and document trade-offs'
          : null,
        enriched.length === 0 ? 'No contradictions detected - knowledge is consistent' : null,
      ].filter(Boolean),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /analysis/contradictions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { from_node, to_node, relation_type } = await request.json();

    if (!from_node || !to_node || !relation_type) {
      return NextResponse.json(
        { error: 'from_node, to_node, and relation_type required' },
        { status: 400 }
      );
    }

    const storage = await getStorageAdapter();

    // Create contradiction edge
    const contradiction = {
      id: `${from_node}_${to_node}_${relation_type}`,
      from_node_id: from_node,
      to_node_id: to_node,
      relation_type,
      weight: {
        strength: 0.8,
        decay_rate: 0,
        reinforcement_rate: 0,
      },
      dynamics: {
        inhibitory: true,
        directional: true,
      },
      temporal: {
        created_at: new Date(),
        last_used_at: new Date(),
      },
    };

    // Store the contradiction edge
    const created = await storage.createEdge(contradiction);

    return NextResponse.json({
      success: true,
      contradiction: created,
      message: `Recorded contradiction between "${from_node}" and "${to_node}"`,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /analysis/contradictions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
