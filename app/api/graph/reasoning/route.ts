/**
 * POST /api/graph/reasoning
 * Multi-hop reasoning: paths, dependencies, explanations, comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import { ReasoningEngine } from '@/lib/services/reasoning-engine';

export async function POST(request: NextRequest) {
  try {
    const {
      operation = 'explain',
      node_id,
      target_node_id,
      max_depth = 3,
    } = await request.json();

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

    let result: any = null;

    if (operation === 'explain') {
      // Explain a single concept
      if (!node_id) {
        return NextResponse.json({ error: 'node_id required' }, { status: 400 });
      }
      const explanation = ReasoningEngine.explainConcept(node_id, nodes, edges);
      result = {
        operation,
        node_id,
        explanation,
      };
    } else if (operation === 'compare') {
      // Compare two concepts
      if (!node_id || !target_node_id) {
        return NextResponse.json(
          { error: 'node_id and target_node_id required' },
          { status: 400 }
        );
      }
      const comparison = ReasoningEngine.compareConcepts(node_id, target_node_id, nodes);
      result = {
        operation,
        node_a: node_id,
        node_b: target_node_id,
        comparison,
      };
    } else if (operation === 'path') {
      // Find path between two nodes
      if (!node_id || !target_node_id) {
        return NextResponse.json(
          { error: 'node_id and target_node_id required' },
          { status: 400 }
        );
      }
      const path = ReasoningEngine.findPath(node_id, target_node_id, nodes, edges);
      const pathDetails = path.map((nid) => ({
        id: nid,
        name: nodes.get(nid)?.name || 'Unknown',
      }));
      result = {
        operation,
        from: node_id,
        to: target_node_id,
        path: pathDetails,
        length: path.length,
      };
    } else if (operation === 'dependencies') {
      // Compute dependencies
      if (!node_id) {
        return NextResponse.json({ error: 'node_id required' }, { status: 400 });
      }
      const deps = ReasoningEngine.computeDependencies(node_id, nodes, edges, max_depth);
      const depDetails = {
        node: nodes.get(node_id),
        ...deps,
      };
      result = {
        operation,
        data: depDetails,
      };
    } else if (operation === 'contradictions') {
      // Find contradictions
      const contradictions = ReasoningEngine.detectContradictions(nodes, edges);
      const details = contradictions.map((c) => ({
        node_a: {
          id: c.nodeA,
          name: nodes.get(c.nodeA)?.name || 'Unknown',
        },
        node_b: {
          id: c.nodeB,
          name: nodes.get(c.nodeB)?.name || 'Unknown',
        },
        relation: c.relation,
      }));
      result = {
        operation,
        contradictions: details,
        count: details.length,
      };
    } else if (operation === 'curriculum') {
      // Generate curriculum
      const startNodes = Array.from(nodes.keys()).slice(0, 3);
      const targetNode = node_id || Array.from(nodes.keys())[0];
      const curriculum = ReasoningEngine.generateCurriculum(
        new Set(startNodes),
        nodes,
        edges,
        targetNode
      );
      const curriculumDetails = curriculum.map((nid) => ({
        id: nid,
        name: nodes.get(nid)?.name || 'Unknown',
        difficulty: nodes.get(nid)?.level.difficulty || 0,
      }));
      result = {
        operation,
        target_node: targetNode,
        prerequisites: curriculumDetails,
        steps: curriculum.length,
      };
    } else {
      return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /graph/reasoning] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('op') || 'explain';
    const node_id = searchParams.get('node');
    const target_node_id = searchParams.get('target');
    const max_depth = Number(searchParams.get('depth')) || 3;

    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({
          operation,
          node_id,
          target_node_id,
          max_depth,
        }),
      })
    );
  } catch (error) {
    console.error('[API /graph/reasoning] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
