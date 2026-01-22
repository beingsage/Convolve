/**
 * Nodes API Endpoints
 * GET  /api/nodes - List all nodes
 * POST /api/nodes - Create a new node
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import { KnowledgeGraphService } from '@/lib/services/knowledge-graph';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const storage = await getStorageAdapter();

    let result;

    if (search) {
      // Search nodes
      const nodes = await storage.searchNodes(search, limit);
      result = {
        items: nodes,
        total: nodes.length,
        page: 1,
        limit,
        has_more: false,
      };
    } else if (type) {
      // Filter by type
      const nodes = await storage.getNodesByType(type, limit);
      result = {
        items: nodes,
        total: nodes.length,
        page: 1,
        limit,
        has_more: false,
      };
    } else {
      // List all with pagination
      result = await storage.listNodes(page, limit);
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /api/nodes GET] Error:', error);
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
    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 }
      );
    }

    const graphService = new KnowledgeGraphService();
    await graphService.initialize();

    const node = await graphService.createNode(
      body.name,
      body.type,
      body.description || '',
      body
    );

    return NextResponse.json(
      {
        success: true,
        data: node,
        timestamp: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /api/nodes POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
