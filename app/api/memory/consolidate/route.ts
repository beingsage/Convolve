/**
 * POST /api/memory/consolidate
 * Consolidate vectors and apply memory decay
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import { ConsolidationEngine } from '@/lib/services/consolidation-engine';

export async function POST(request: NextRequest) {
  try {
    const {
      operation = 'consolidate',
      similarity_threshold = 0.7,
      apply_decay = true,
    } = await request.json();

    const storage = await getStorageAdapter();

    if (operation === 'consolidate') {
      console.log('[API /memory/consolidate] Starting vector consolidation...');

      // Get all vectors (simulated - in real system would query Qdrant)
      // For now, we'll consolidate based on stored chunks
      const result = {
        operation,
        status: 'consolidation_simulated',
        message: 'Vector consolidation would group similar vectors and create higher-level concepts',
        details: {
          approach: 'Cluster similar vectors using cosine similarity',
          threshold: similarity_threshold,
          benefits: [
            'Reduced memory footprint',
            'Faster inference',
            'Semantic compression',
            'Higher-level concept creation',
          ],
        },
      };

      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date(),
      });
    } else if (operation === 'decay') {
      console.log('[API /memory/consolidate] Applying memory decay...');

      const nodes = await storage.listNodes(0, 10000);
      const now = new Date().getTime();
      let decayedCount = 0;

      for (const node of nodes.items) {
        const timeDiff = (now - new Date(node.temporal.last_reinforced_at).getTime()) / (1000 * 60 * 60 * 24);
        const decayRate = node.cognitive_state.decay_rate || 0.01;
        const decayFactor = Math.exp(-decayRate * timeDiff);
        const newStrength = node.cognitive_state.strength * decayFactor;

        // Only update if change is significant
        if (Math.abs(newStrength - node.cognitive_state.strength) > 0.01) {
          try {
            await storage.updateNode(node.id, {
              cognitive_state: {
                ...node.cognitive_state,
                strength: newStrength,
              },
            });
            decayedCount++;
          } catch (error) {
            console.warn(`Failed to update decay for node ${node.id}:`, error);
          }
        }
      }

      return NextResponse.json({
        success: true,
        operation,
        nodes_processed: nodes.items.length,
        nodes_updated: decayedCount,
        details: {
          formula: 'strength(t) = strength(0) * e^(-λΔt)',
          description: 'Applied exponential decay to concept strength based on time since last reinforcement',
        },
        timestamp: new Date(),
      });
    } else if (operation === 'reinforce') {
      console.log('[API /memory/consolidate] Reinforcing concept...');

      const { node_id } = await request.json();

      if (!node_id) {
        return NextResponse.json({ error: 'node_id required' }, { status: 400 });
      }

      const node = await storage.getNode(node_id);
      if (!node) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }

      // Increase strength and confidence
      const reinforcedNode = await storage.updateNode(node_id, {
        cognitive_state: {
          ...node.cognitive_state,
          strength: Math.min(1, node.cognitive_state.strength + 0.1),
          confidence: Math.min(1, node.cognitive_state.confidence + 0.05),
          activation: 1.0,
        },
        temporal: {
          ...node.temporal,
          last_reinforced_at: new Date(),
          peak_relevance_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        operation,
        node: reinforcedNode,
        message: `Reinforced "${node.name}" - strength increased to ${(reinforcedNode.cognitive_state.strength * 100).toFixed(0)}%`,
        timestamp: new Date(),
      });
    } else if (operation === 'status') {
      // Get memory consolidation status
      const nodes = await storage.listNodes(0, 10000);

      const stats = {
        total_nodes: nodes.items.length,
        weak_concepts: nodes.items.filter((n: any) => n.cognitive_state.strength < 0.4).length,
        low_confidence: nodes.items.filter((n: any) => n.cognitive_state.confidence < 0.5).length,
        avg_strength: nodes.items.reduce((sum: number, n: any) => sum + n.cognitive_state.strength, 0) / nodes.items.length,
        avg_confidence: nodes.items.reduce((sum: number, n: any) => sum + n.cognitive_state.confidence, 0) / nodes.items.length,
      };

      return NextResponse.json({
        success: true,
        operation,
        stats,
        recommendations: [
          stats.weak_concepts > 0 ? `${stats.weak_concepts} concepts with weak memory - consider reinforcement` : null,
          stats.low_confidence > 0 ? `${stats.low_confidence} concepts need more research` : null,
          stats.avg_strength < 0.6 ? 'Overall memory strength is low - recommend review cycle' : null,
        ].filter(Boolean),
        timestamp: new Date(),
      });
    } else {
      return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API /memory/consolidate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
