/**
 * Workflow Status API Endpoint
 * GET /api/workflows/[id] - Get workflow status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphClient } from '@/lib/agents/langgraph-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const langGraphClient = getLangGraphClient();

    const result = await langGraphClient.getWorkflowStatus(workflowId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Workflow status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}