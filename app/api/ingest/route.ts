/**
 * POST /api/ingest
 * Ingest documents into the knowledge system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage/factory';
import { createIngestionPipeline } from '@/lib/services/ingestion-complete';
import { DocumentMetadata } from '@/lib/services/ingestion-complete';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { content, title, authors, year, url, source_tier = 'T3' } = await request.json();

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    const storage = await getStorageAdapter();
    const pipeline = createIngestionPipeline();

    // Metadata for document
    const metadata: DocumentMetadata = {
      title,
      authors: authors || [],
      year: year || new Date().getFullYear(),
      url,
      source_tier: source_tier as any,
    };

    console.log(`[API /ingest] Starting ingestion of "${title}"`);

    // Run ingestion pipeline
    const { sections, claims, concepts, chunks } = await pipeline.ingestDocument(
      content,
      metadata
    );

    // Store chunks
    const storedChunks = [];
    for (const chunk of chunks) {
      try {
        const stored = await storage.storeChunk(chunk);
        storedChunks.push(stored);
      } catch (error) {
        console.warn(`Failed to store chunk ${chunk.id}:`, error);
      }
    }

    // Create nodes for extracted concepts
    const createdNodes = [];
    for (const concept of concepts) {
      try {
        const node = {
          id: uuidv4(),
          type: 'concept' as const,
          name: concept,
          description: `Extracted from: ${title}`,
          level: {
            abstraction: 0.4,
            difficulty: 0.5,
            volatility: 0.2,
          },
          cognitive_state: {
            strength: 0.6,
            activation: 0.7,
            decay_rate: 0.01,
            confidence: 0.7,
          },
          temporal: {
            introduced_at: new Date(),
            last_reinforced_at: new Date(),
            peak_relevance_at: new Date(),
          },
          real_world: {
            used_in_production: false,
            companies_using: 0,
            avg_salary_weight: 0,
            interview_frequency: 0,
          },
          grounding: {
            source_refs: [url || title],
            implementation_refs: [],
          },
          failure_surface: {
            common_bugs: [],
            misconceptions: [],
          },
          created_at: new Date(),
          updated_at: new Date(),
        };

        const created = await storage.createNode(node);
        createdNodes.push(created);
      } catch (error) {
        console.warn(`Failed to create node for ${concept}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        title,
        sections: sections.length,
        claims: claims.length,
        concepts: concepts.length,
      },
      ingestion: {
        chunks_stored: storedChunks.length,
        nodes_created: createdNodes.length,
      },
      concepts,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[API /ingest] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
