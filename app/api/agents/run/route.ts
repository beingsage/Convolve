/**
 * POST /api/agents/run
 * Run all agents and return proposals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import {
  runAllAgents,
  IngestionAgent,
  AlignmentAgent,
  ContradictionAgent,
  CurriculumAgent,
  ResearchAgent,
} from '@/lib/agents/complete-agents';

export async function POST(request: NextRequest) {
  try {
    const { agent_type = 'all', params = {} } = await request.json();

    const storage = await getStorageAdapter();

    // Load current state
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

    let proposals: any[] = [];

    if (agent_type === 'all') {
      // Get demo chunks
      const chunks = params.chunks || [];
      proposals = await runAllAgents(chunks, nodes, edges, storage);
    } else if (agent_type === 'ingestion') {
      const chunks = params.chunks || [];
      proposals = await IngestionAgent.process(chunks, nodes, storage);
    } else if (agent_type === 'alignment') {
      proposals = await AlignmentAgent.process(nodes);
    } else if (agent_type === 'contradiction') {
      proposals = await ContradictionAgent.process(nodes, edges);
    } else if (agent_type === 'curriculum') {
      const startNodes = params.start_nodes || Array.from(nodes.keys()).slice(0, 5);
      const targetNode = params.target_node || Array.from(nodes.keys())[0];
      proposals = await CurriculumAgent.process(startNodes, targetNode, nodes, edges);
    } else if (agent_type === 'research') {
      proposals = await ResearchAgent.process(nodes);
    } else {
      return NextResponse.json({ error: 'Unknown agent type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      agent_type,
      proposals_count: proposals.length,
      proposals,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /api/agents/run] Error:', error);
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
    const agent_type = searchParams.get('agent') || 'all';

    // Forward to POST
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ agent_type }),
      })
    );
  } catch (error) {
    console.error('[API /api/agents/run] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
