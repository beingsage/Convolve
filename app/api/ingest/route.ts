/**
 * POST /api/ingest
 * Ingest documents into the knowledge system using LangGraph workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphClient } from '@/lib/agents/langgraph-client';

export async function POST(request: NextRequest) {
  try {
    const { content, title, authors, year, url, source_tier = 'T3' } = await request.json();

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    const langGraphClient = getLangGraphClient();

    // Prepare metadata
    const metadata = {
      title,
      authors: authors || [],
      year: year || new Date().getFullYear(),
      url,
      source_tier,
      ingested_at: new Date().toISOString()
    };

    console.log(`[API /ingest] Starting LangGraph ingestion workflow for "${title}"`);

    // Start LangGraph ingestion workflow
    const result = await langGraphClient.ingestKnowledge({
      content,
      metadata,
      source: url || 'api'
    });

    console.log(`[API /ingest] Ingestion workflow started: ${result.workflow_id}`);

    return NextResponse.json({
      success: true,
      workflow_id: result.workflow_id,
      status: result.status,
      message: 'Ingestion workflow started successfully'
    });
  } catch (error) {
    console.error('[API /ingest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
