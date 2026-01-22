/**
 * Ingestion Agent
 * Processes documents, extracts concepts, creates nodes and edges
 */

import { AgentProposal, KnowledgeNode, KnowledgeEdge } from '@/lib/types';
import { IStorageAdapter } from '@/lib/storage/adapter';
import { IngestionPipeline } from '@/lib/services/ingestion';

export class IngestionAgent {
  private storage: IStorageAdapter;
  private pipeline: IngestionPipeline;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
    this.pipeline = new IngestionPipeline({ chunk_size: 512, overlap: 100 });
  }

  /**
   * Process a document and generate node/edge creation proposals
   */
  async processDocument(
    content: string,
    metadata: { title: string; source_url: string }
  ): Promise<AgentProposal[]> {
    const proposals: AgentProposal[] = [];

    // Ingest the document
    const ingested = await this.pipeline.ingest(content, {
      title: metadata.title,
      source_url: metadata.source_url,
      source_tier: 'T3', // Default to practice tier
    });

    // Store chunks
    for (const chunk of ingested.chunks) {
      await this.storage.storeChunk(chunk);
    }

    // Create proposals for each extracted concept
    for (const concept of ingested.extracted_concepts) {
      const existing = await this.storage.searchNodes(concept, 1);

      if (existing.length === 0) {
        // Create new concept node
        const proposal: AgentProposal = {
          id: `prop_${Date.now()}_${Math.random()}`,
          agent_type: 'ingestion',
          action: 'create_node',
          target: {
            id: `concept_${Date.now()}`,
            type: 'concept',
            name: concept,
            description: `Extracted from: ${metadata.title}`,
            level: {
              abstraction: 0.5,
              difficulty: 0.5,
              volatility: 0.3,
            },
            cognitive_state: {
              strength: 0.8,
              activation: 0.7,
              decay_rate: 0.01,
              confidence: 0.75,
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
              source_refs: [metadata.source_url],
              implementation_refs: [],
            },
            failure_surface: {
              common_bugs: [],
              misconceptions: [],
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
          reasoning: `Extracted concept "${concept}" from source: ${metadata.title}`,
          confidence: 0.8,
          created_at: new Date(),
          status: 'proposed',
        };

        proposals.push(proposal);
      }
    }

    return proposals;
  }
}
