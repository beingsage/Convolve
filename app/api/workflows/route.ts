/**
 * Workflows API Endpoints
 * POST /api/workflows/ingest - Start knowledge ingestion workflow
 * POST /api/workflows/reason - Start reasoning workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphClient } from '@/lib/agents/langgraph-client';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop(); // 'ingest' or 'reason'

    const body = await request.json();
    const langGraphClient = getLangGraphClient();

    let result;

    if (action === 'ingest') {
      const { content, metadata, source } = body;

      if (!content) {
        return NextResponse.json(
          { error: 'content is required' },
          { status: 400 }
        );
      }

      result = await langGraphClient.ingestKnowledge({
        content,
        metadata,
        source
      });
    } else if (action === 'reason') {
      const { query, context } = body;

      if (!query) {
        return NextResponse.json(
          { error: 'query is required' },
          { status: 400 }
        );
      }

      result = await langGraphClient.reasonQuery({
        query,
        context
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid workflow action' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}