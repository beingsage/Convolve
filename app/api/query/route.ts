/**
 * POST /api/query
 * Execute a semantic query against the knowledge graph
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingEngine } from '@/lib/services/embedding-engine';
import { ReasoningEngine } from '@/lib/services/reasoning-engine';
import { getStorageAdapter } from '@/lib/storage/factory';
import { getStorageConfig } from '@/lib/config/storage';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const storage = await getStorageAdapter();
    const config = getStorageConfig();

    let results;

    if (config.type === 'qdrant') {
      // Use vector search with Qdrant
      const embeddingEngine = getEmbeddingEngine();
      const queryEmbedding = await embeddingEngine.embedText(query);

      // Search for similar vectors
      const vectorResults = await storage.searchVectors(queryEmbedding, limit * 2);

      // Get corresponding nodes (assuming vectors are linked to nodes)
      results = [];
      for (const vectorResult of vectorResults) {
        // Try to find node with matching ID or use metadata
        const nodeId = vectorResult.metadata?.node_id || vectorResult.id;
        const node = await storage.getNode(nodeId);

        if (node) {
          results.push({
            node,
            relevance_score: 1 - (vectorResult.metadata?.distance || 0), // Convert distance to similarity
            explanation: `Vector similarity match for: ${node.name}`,
          });
        }
      }
    } else {
      // Fallback to text-based search
      const nodes = await storage.listNodes(1, 1000);
      const nodeArray = nodes.items;

      results = nodeArray
        .filter((node: any) =>
          node.name.toLowerCase().includes(query.toLowerCase()) ||
          node.description.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map((node: any) => ({
          node: node,
          relevance_score: 1.0,
          explanation: `Text match for: ${node.name}`,
        }));
    }

    // Limit results
    const limitedResults = results.slice(0, limit);

    // Generate explanations for each result
    const detailedResults = [];
    for (const result of limitedResults) {
      const explanation = ReasoningEngine.explainConcept(
        result.node.id,
        new Map([[result.node.id, result.node]]),
        new Map()
      );

      detailedResults.push({
        node: result.node,
        relevance_score: result.relevance_score,
        explanation,
      });
    }

    return NextResponse.json({
      success: true,
      query,
      results: detailedResults,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /api/query] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/query?q=search_term
 * Quick search endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = Number(searchParams.get('limit')) || 5;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter (q) required' },
        { status: 400 }
      );
    }

    // Forward to POST handler
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
      })
    );
  } catch (error) {
    console.error('[API /api/query] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
