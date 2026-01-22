/**
 * Agents API Endpoints
 * POST /api/agents/run - Run specific agent
 * POST /api/agents/workflow - Run full workflow
 * GET  /api/agents/proposals - List proposals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agent_type, content, metadata } = body;

    const orchestrator = await getAgentOrchestrator();

    let result;

    if (action === 'workflow') {
      // Run full workflow
      result = await orchestrator.runFullWorkflow();
    } else if (action === 'ingest') {
      // Run ingestion agent
      if (!content || !metadata?.title) {
        return NextResponse.json(
          { error: 'content and metadata.title required for ingest' },
          { status: 400 }
        );
      }
      result = await orchestrator.runIngestionAgent(content, metadata);
    } else if (action === 'align') {
      // Run alignment agent
      result = await orchestrator.runAlignmentAgent();
    } else if (action === 'contradict') {
      // Run contradiction agent
      result = await orchestrator.runContradictionAgent();
    } else if (action === 'curriculum') {
      // Run curriculum agent
      result = await orchestrator.runCurriculumAgent(body.user_known_nodes || []);
    } else if (action === 'research') {
      // Run research agent
      result = await orchestrator.runResearchAgent();
    } else {
      return NextResponse.json(
        { error: 'Unknown action. Valid actions: workflow, ingest, align, contradict, curriculum, research' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /api/agents POST] Error:', error);
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
    const status = (searchParams.get('status') || 'proposed') as 'proposed' | 'approved' | 'rejected';

    const orchestrator = await getAgentOrchestrator();
    const proposals = orchestrator.getProposals(status);

    return NextResponse.json({
      success: true,
      data: {
        proposals,
        stats: orchestrator.getStats(),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /api/agents GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
