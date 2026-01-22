/**
 * Complete Ingestion Pipeline
 * PDF/HTML → Parsing → Claim Extraction → Concept Tagging → Embedding → Storage
 */

import { DocumentChunk, KnowledgeNode, KnowledgeEdge, SourceTier } from '@/lib/types';
import { getEmbeddingEngine } from './embedding-engine';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentMetadata {
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
  source_tier: SourceTier;
}

export interface ParsedSection {
  title: string;
  content: string;
  level: number; // heading level
  claims: Claim[];
}

export interface Claim {
  text: string;
  type: 'definition' | 'method' | 'result' | 'limitation' | 'assumption';
  confidence: number;
}

export class IngestionPipeline {
  private embeddingEngine = getEmbeddingEngine();

  /**
   * Main ingestion: Text → Parsed → Chunks → Vectors → Nodes
   */
  async ingestDocument(content: string, metadata: DocumentMetadata) {
    console.log('[UAILS] Ingestion: Parsing document...');
    const sections = this.parseDocument(content, metadata);

    console.log('[UAILS] Ingestion: Extracting claims...');
    const claims = this.extractClaims(sections);

    console.log('[UAILS] Ingestion: Tagging concepts...');
    const concepts = this.tagConcepts(claims, metadata);

    console.log('[UAILS] Ingestion: Generating embeddings...');
    const chunks = this.createChunks(sections, claims, concepts);

    console.log(`[UAILS] Ingestion: Created ${chunks.length} chunks with embeddings`);
    return { sections, claims, concepts, chunks };
  }

  /**
   * Parse document into sections (handles simple markdown structure)
   */
  private parseDocument(content: string, metadata: DocumentMetadata): ParsedSection[] {
    const sections: ParsedSection[] = [];
    const lines = content.split('\n');

    let currentSection: ParsedSection | null = null;
    let sectionContent = '';

    for (const line of lines) {
      const heading = line.match(/^(#{1,6})\s+(.+)$/);

      if (heading) {
        // Save previous section
        if (currentSection) {
          currentSection.content = sectionContent.trim();
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: heading[2],
          content: '',
          level: heading[1].length,
          claims: [],
        };
        sectionContent = '';
      } else if (currentSection) {
        sectionContent += line + '\n';
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = sectionContent.trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract claims from sections using pattern matching
   */
  private extractClaims(sections: ParsedSection[]): Claim[] {
    const claims: Claim[] = [];

    for (const section of sections) {
      const sentences = section.content.split(/[.!?]+/).filter((s) => s.trim());

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 10) continue;

        // Simple pattern matching for claim types
        let type: Claim['type'] = 'result';
        let confidence = 0.7;

        if (
          trimmed.match(/^(defined|is|means|refers to|called)/i) ||
          trimmed.match(/definition/i)
        ) {
          type = 'definition';
          confidence = 0.9;
        } else if (trimmed.match(/^(method|algorithm|approach|technique)/i)) {
          type = 'method';
          confidence = 0.85;
        } else if (trimmed.match(/^(result|shows|demonstrates|proves)/i)) {
          type = 'result';
          confidence = 0.8;
        } else if (trimmed.match(/limitation|caveat|however|but/i)) {
          type = 'limitation';
          confidence = 0.75;
        } else if (trimmed.match(/^(assume|assuming|assume that)/i)) {
          type = 'assumption';
          confidence = 0.7;
        }

        claims.push({ text: trimmed, type, confidence });
      }
    }

    return claims;
  }

  /**
   * Tag concepts/keywords in claims
   */
  private tagConcepts(claims: Claim[], metadata: DocumentMetadata): string[] {
    const concepts = new Set<string>();

    for (const claim of claims) {
      const keywords = this.embeddingEngine.extractKeywords(claim.text, 5);
      keywords.forEach((kw) => concepts.add(kw));
    }

    return Array.from(concepts);
  }

  /**
   * Create document chunks with embeddings
   */
  private createChunks(
    sections: ParsedSection[],
    claims: Claim[],
    concepts: string[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const section of sections) {
      // Create chunk per section
      const sectionText = `${section.title}: ${section.content}`;
      const embedding = this.embeddingEngine.generateEmbedding(sectionText);

      const chunk: DocumentChunk = {
        id: uuidv4(),
        source_id: 'doc-' + Date.now(),
        section: section.title,
        content: sectionText,
        claim_type: 'result',
        embedding,
        concept_refs: concepts,
        chunk_index: chunks.length,
        created_at: new Date(),
      };

      chunks.push(chunk);
    }

    // Create chunks per claim
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const embedding = this.embeddingEngine.generateEmbedding(claim.text);

      const chunk: DocumentChunk = {
        id: uuidv4(),
        source_id: 'claim-' + i,
        section: 'claims',
        content: claim.text,
        claim_type: claim.type,
        embedding,
        concept_refs: this.embeddingEngine.extractKeywords(claim.text, 3),
        chunk_index: chunks.length,
        created_at: new Date(),
      };

      chunks.push(chunk);
    }

    return chunks;
  }
}

export function createIngestionPipeline(): IngestionPipeline {
  return new IngestionPipeline();
}
