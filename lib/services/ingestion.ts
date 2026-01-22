/**
 * Ingestion Pipeline
 * Handles: parsing → chunking → claim extraction → concept tagging → embedding
 */

import { v4 as uuidv4 } from 'crypto';
import { DocumentChunk, Document, SourceTier, ClaimType } from '@/lib/types';

export interface IngestionConfig {
  chunk_size: number;          // characters per chunk
  overlap: number;             // chunk overlap
  auto_extract_concepts: boolean;
}

export interface IngestedContent {
  document: Document;
  chunks: DocumentChunk[];
  extracted_concepts: string[];
  metadata: Record<string, unknown>;
}

/**
 * Main ingestion pipeline
 */
export class IngestionPipeline {
  private config: IngestionConfig;

  constructor(config: Partial<IngestionConfig> = {}) {
    this.config = {
      chunk_size: config.chunk_size || 512,
      overlap: config.overlap || 100,
      auto_extract_concepts: config.auto_extract_concepts !== false,
    };
  }

  /**
   * Process a text document through the full pipeline
   */
  async ingest(
    content: string,
    metadata: {
      title: string;
      source_url: string;
      source_tier: SourceTier;
      [key: string]: unknown;
    }
  ): Promise<IngestedContent> {
    const documentId = uuidv4();

    // Step 1: Create document record
    const document: Document = {
      id: documentId,
      title: metadata.title,
      source_url: metadata.source_url,
      source_tier: metadata.source_tier,
      content,
      metadata,
      created_at: new Date(),
      processed_at: undefined,
    };

    // Step 2: Chunk the content
    const chunks = this.chunkContent(content, documentId);

    // Step 3: Extract claims from chunks
    const chunksWithClaims = this.extractClaims(chunks);

    // Step 4: Extract concepts (if enabled)
    const extractedConcepts = this.config.auto_extract_concepts
      ? this.extractConcepts(content)
      : [];

    // Step 5: Tag chunks with extracted concepts
    const finalChunks = this.tagChunksWithConcepts(chunksWithClaims, extractedConcepts);

    document.chunks = finalChunks;
    document.processed_at = new Date();

    return {
      document,
      chunks: finalChunks,
      extracted_concepts: extractedConcepts,
      metadata: {
        chunk_count: finalChunks.length,
        total_chars: content.length,
        extraction_confidence: 0.85,
      },
    };
  }

  /**
   * Split document into overlapping chunks
   */
  private chunkContent(content: string, sourceId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { chunk_size, overlap } = this.config;
    let startIdx = 0;

    while (startIdx < content.length) {
      const endIdx = Math.min(startIdx + chunk_size, content.length);
      const chunkContent = content.substring(startIdx, endIdx);

      const chunk: DocumentChunk = {
        id: uuidv4(),
        content: chunkContent,
        source_id: sourceId,
        section: this.detectSection(content, startIdx),
        claim_type: 'unknown',
        extracted_concepts: [],
        confidence: 0.8,
        created_at: new Date(),
      };

      chunks.push(chunk);

      // Move to next chunk with overlap
      startIdx += chunk_size - overlap;
    }

    return chunks;
  }

  /**
   * Detect the section of a document based on content patterns
   */
  private detectSection(content: string, position: number): string {
    const beforeContent = content.substring(0, position);
    const headingMatch = beforeContent.match(/#{1,6}\s+([^\n]+)$/m);
    return headingMatch ? headingMatch[1] : 'introduction';
  }

  /**
   * Extract claim types from chunks
   */
  private extractClaims(chunks: DocumentChunk[]): DocumentChunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      claim_type: this.classifyClaimType(chunk.content),
    }));
  }

  /**
   * Classify the type of claim in a chunk
   */
  private classifyClaimType(content: string): ClaimType {
    const lowerContent = content.toLowerCase();

    // Simple heuristics
    if (/^(definition|is|means?)\s*:/i.test(content) || content.includes('defined as')) {
      return 'definition';
    }

    if (
      /method|algorithm|approach|technique|process|step/i.test(lowerContent) &&
      /how to|implement|calculate/i.test(lowerContent)
    ) {
      return 'method';
    }

    if (/result|found|showed|demonstrated|proved|conclus/i.test(lowerContent)) {
      return 'result';
    }

    if (/limitation|challenge|limitation|however|but|fail/i.test(lowerContent)) {
      return 'limitation';
    }

    return 'unknown';
  }

  /**
   * Extract concepts from content using keyword matching
   * In production, use an NLP model
   */
  private extractConcepts(content: string): string[] {
    const concepts: Set<string> = new Set();

    // AI-related concept keywords (demo)
    const aiConcepts = [
      'gradient descent',
      'backpropagation',
      'neural network',
      'transformer',
      'attention',
      'embedding',
      'loss function',
      'optimization',
      'reinforcement learning',
      'supervised learning',
      'unsupervised learning',
      'deep learning',
      'machine learning',
      'convolutional',
      'recurrent',
      'lstm',
      'gru',
      'activation function',
      'batch normalization',
      'dropout',
      'regularization',
    ];

    const lowerContent = content.toLowerCase();
    for (const concept of aiConcepts) {
      if (lowerContent.includes(concept)) {
        concepts.add(concept);
      }
    }

    return Array.from(concepts);
  }

  /**
   * Tag chunks with extracted concepts
   */
  private tagChunksWithConcepts(
    chunks: DocumentChunk[],
    concepts: string[]
  ): DocumentChunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      extracted_concepts: concepts.filter(c => chunk.content.toLowerCase().includes(c)),
    }));
  }
}

/**
 * Parse different document formats
 */
export class DocumentParser {
  /**
   * Parse markdown content
   */
  static parseMarkdown(content: string): string {
    // Remove markdown syntax but preserve structure
    let parsed = content;

    // Remove links: [text](url) -> text
    parsed = parsed.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove images: ![alt](url) -> alt
    parsed = parsed.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

    // Remove inline code markers
    parsed = parsed.replace(/`([^`]+)`/g, '$1');

    // Preserve headers as text with markers
    parsed = parsed.replace(/^#{1,6}\s+(.+)$/gm, '\n[$1]\n');

    return parsed.trim();
  }

  /**
   * Parse HTML content
   */
  static parseHTML(content: string): string {
    // Remove HTML tags
    let parsed = content.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    parsed = parsed
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return parsed.trim();
  }

  /**
   * Detect document format and parse accordingly
   */
  static autoparse(content: string): string {
    if (content.includes('<')) {
      return this.parseHTML(content);
    } else if (content.includes('#')) {
      return this.parseMarkdown(content);
    }
    return content;
  }
}

/**
 * Concept extraction utilities
 */
export class ConceptExtractor {
  /**
   * Extract related concepts based on semantic similarity
   */
  static findRelatedConcepts(concept: string, allConcepts: string[]): string[] {
    // Simple string similarity
    const similarity = (a: string, b: string): number => {
      const longer = a.length > b.length ? a : b;
      const shorter = a.length > b.length ? b : a;
      if (longer.length === 0) return 1.0;

      const editDistance = this.levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    };

    return allConcepts
      .filter(c => c !== concept && similarity(concept, c) > 0.6)
      .sort((a, b) => similarity(concept, b) - similarity(concept, a));
  }

  /**
   * Levenshtein distance for string similarity
   */
  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// Helper function for generating UUIDs in Node.js environment
function generateUUID(): string {
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.randomUUID ? crypto.randomUUID() : generateFallbackUUID();
    } catch {
      return generateFallbackUUID();
    }
  }
  return generateFallbackUUID();
}

function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
