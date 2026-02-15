/**
 * Agents API Endpoints
 * POST /api/agents/run - Run specific agent (legacy)
 * POST /api/agents/workflow - Run LangGraph workflow
 * GET  /api/agents/proposals - List proposals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphClient } from '@/lib/agents/langgraph-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, content, metadata, query, context } = body;

    const langGraphClient = getLangGraphClient();

    let result;

    if (action === 'ingest') {
      // Run knowledge ingestion workflow
      if (!content) {
        return NextResponse.json(
          { error: 'content required for ingest' },
          { status: 400 }
        );
      }

      result = await langGraphClient.ingestKnowledge({
        content,
        metadata,
        source: metadata?.source
      });
    } else if (action === 'reason') {
      // Run reasoning workflow
      if (!query) {
        return NextResponse.json(
          { error: 'query required for reasoning' },
          { status: 400 }
        );
      }

      result = await langGraphClient.reasonQuery({
        query,
        context
      });
    } else if (action === 'workflow_status') {
      // Get workflow status
      const { workflow_id } = body;
      if (!workflow_id) {
        return NextResponse.json(
          { error: 'workflow_id required' },
          { status: 400 }
        );
      }

      result = await langGraphClient.getWorkflowStatus(workflow_id);
    } else {
      return NextResponse.json(
        { error: 'Unknown action. Valid actions: ingest, reason, workflow_status' },
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
