/**
 * GET /api/query?q=...
 * Semantic search across knowledge graph
 * POST /api/query
 * Execute a semantic query using LangGraph reasoning workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphClient } from '@/lib/agents/langgraph-client';
import { getStorageAdapter } from '@/lib/storage/factory';
import { SemanticQueryEngine } from '@/lib/services/semantic-query';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter (q) required' },
        { status: 400 }
      );
    }

    console.log(`[API /query GET] Semantic search for: "${query}"`);

    const storage = await getStorageAdapter();
    const queryEngine = new SemanticQueryEngine(storage);

    // Execute semantic search
    const results = await queryEngine.query({
      query,
      filters: {},
      limit,
      offset: 0,
    });

    return NextResponse.json({
      success: true,
      query,
      results: results.nodes.map((r: any, idx: number) => ({
        node: r,
        relevance_score: 1 - (idx / results.nodes.length),
        explanation: `Matched on: ${r.name}`,
      })),
      total: results.nodes.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /query GET] Error:', error);
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
    const { query, context, wait_for_completion = false } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const langGraphClient = getLangGraphClient();

    console.log(`[API /query] Starting reasoning workflow for query: "${query.substring(0, 100)}..."`);

    // Start LangGraph reasoning workflow
    const result = await langGraphClient.reasonQuery({
      query,
      context: context || {}
    });

    if (wait_for_completion) {
      // Wait for workflow to complete
      const finalResult = await langGraphClient.waitForWorkflow(result.workflow_id, 60000); // 60 second timeout

      return NextResponse.json({
        success: true,
        workflow_id: finalResult.workflow_id,
        status: finalResult.status,
        answer: finalResult.result?.answer,
        confidence: finalResult.result?.confidence,
        reasoning_path: finalResult.result?.reasoning_path,
        contradictions_found: finalResult.result?.contradictions_found
      });
    } else {
      // Return immediately with workflow ID
      return NextResponse.json({
        success: true,
        workflow_id: result.workflow_id,
        status: result.status,
        message: 'Reasoning workflow started successfully'
      });
    }
  } catch (error) {
    console.error('[API /query] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
