/**
 * Property-Based Tests for Ingestion Service
 * Feature: uails-complete-system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { IngestionPipeline, DocumentParser, ConceptExtractor } from './ingestion';
import { SourceTier } from '@/lib/types';

describe('Ingestion Service - Property Tests', () => {
  let pipeline: IngestionPipeline;

  beforeEach(() => {
    pipeline = new IngestionPipeline({
      chunk_size: 512,
      overlap: 100,
      auto_extract_concepts: true,
    });
  });

  // Feature: uails-complete-system, Property 15: Document Chunking Overlap
  describe('Property 15: Document Chunking Overlap', () => {
    it('should create consecutive chunks with exactly OVERLAP characters of overlap (except at boundaries)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random documents with varying lengths
          fc.string({ minLength: 200, maxLength: 2000 }),
          async (content) => {
            const CHUNK_SIZE = 512;
            const OVERLAP = 100;

            const result = await pipeline.ingest(content, {
              title: 'Test Document',
              source_url: 'http://test.com',
              source_tier: 'T1' as SourceTier,
            });

            const chunks = result.chunks;

            // Check overlap between consecutive chunks
            for (let i = 0; i < chunks.length - 1; i++) {
              const currentChunk = chunks[i];
              const nextChunk = chunks[i + 1];

              // Get the last OVERLAP characters of current chunk
              const currentEnd = currentChunk.content.slice(-OVERLAP);
              
              // Get the first OVERLAP characters of next chunk
              const nextStart = nextChunk.content.slice(0, OVERLAP);

              // They should match (unless we're at document boundary)
              if (currentChunk.content.length === CHUNK_SIZE) {
                expect(currentEnd).toBe(nextStart);
              }
            }

            // Verify that chunks cover the entire document
            // First chunk should start at position 0
            const firstChunkStart = content.indexOf(chunks[0].content);
            expect(firstChunkStart).toBe(0);

            // Last chunk should end at or near the document end
            const lastChunk = chunks[chunks.length - 1];
            const lastChunkEnd = content.indexOf(lastChunk.content) + lastChunk.content.length;
            expect(lastChunkEnd).toBe(content.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case: document shorter than chunk size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (content) => {
            const result = await pipeline.ingest(content, {
              title: 'Short Document',
              source_url: 'http://test.com',
              source_tier: 'T1' as SourceTier,
            });

            // Should create exactly one chunk
            expect(result.chunks.length).toBe(1);
            expect(result.chunks[0].content).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case: empty document', async () => {
      const result = await pipeline.ingest('', {
        title: 'Empty Document',
        source_url: 'http://test.com',
        source_tier: 'T1' as SourceTier,
      });

      // Should create one empty chunk
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].content).toBe('');
    });
  });

  // Feature: uails-complete-system, Property 16: Chunk Concept Linking
  describe('Property 16: Chunk Concept Linking', () => {
    it('should link all chunks to valid extracted concepts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate documents with AI-related terms
          fc.constantFrom(
            'Neural networks use backpropagation for training',
            'Gradient descent optimizes the loss function',
            'Transformers use attention mechanisms for sequence processing',
            'Deep learning models require large datasets',
            'Reinforcement learning agents learn from rewards',
            'Convolutional neural networks process images',
            'LSTM networks handle sequential data',
            'Dropout is a regularization technique'
          ),
          async (content) => {
            const result = await pipeline.ingest(content, {
              title: 'AI Document',
              source_url: 'http://test.com',
              source_tier: 'T1' as SourceTier,
            });

            const chunks = result.chunks;
            const extractedConcepts = result.extracted_concepts;

            // All chunks should have extracted_concepts array
            for (const chunk of chunks) {
              expect(Array.isArray(chunk.extracted_concepts)).toBe(true);

              // Each concept in chunk should be from the extracted concepts
              for (const concept of chunk.extracted_concepts) {
                expect(extractedConcepts).toContain(concept);
              }

              // Each concept in chunk should actually appear in the chunk content
              for (const concept of chunk.extracted_concepts) {
                expect(chunk.content.toLowerCase()).toContain(concept.toLowerCase());
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract concepts that actually exist in the document', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Neural networks and deep learning are fundamental to AI',
            'Gradient descent and backpropagation optimize models',
            'Transformers revolutionized natural language processing',
            'Reinforcement learning enables autonomous agents'
          ),
          async (content) => {
            const result = await pipeline.ingest(content, {
              title: 'AI Document',
              source_url: 'http://test.com',
              source_tier: 'T1' as SourceTier,
            });

            const extractedConcepts = result.extracted_concepts;

            // Every extracted concept should appear in the original content
            for (const concept of extractedConcepts) {
              expect(content.toLowerCase()).toContain(concept.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle documents with no recognizable concepts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 50, maxLength: 500 }).filter(
            s => !s.toLowerCase().includes('neural') && 
                 !s.toLowerCase().includes('gradient') &&
                 !s.toLowerCase().includes('learning')
          ),
          async (content) => {
            const result = await pipeline.ingest(content, {
              title: 'Generic Document',
              source_url: 'http://test.com',
              source_tier: 'T1' as SourceTier,
            });

            // Should still create chunks even if no concepts found
            expect(result.chunks.length).toBeGreaterThan(0);
            
            // extracted_concepts array should exist (may be empty)
            expect(Array.isArray(result.extracted_concepts)).toBe(true);
            
            // All chunks should have extracted_concepts array
            for (const chunk of result.chunks) {
              expect(Array.isArray(chunk.extracted_concepts)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional unit tests for document parsing
  describe('Document Parsing', () => {
    it('should parse markdown correctly', () => {
      const markdown = '# Title\n\nThis is [a link](http://example.com) and `code`';
      const parsed = DocumentParser.parseMarkdown(markdown);
      
      expect(parsed).toContain('[Title]');
      expect(parsed).toContain('a link');
      expect(parsed).not.toContain('http://example.com');
      expect(parsed).toContain('code');
      expect(parsed).not.toContain('`');
    });

    it('should parse HTML correctly', () => {
      const html = '<h1>Title</h1><p>This is a &lt;test&gt; with &amp; entities</p>';
      const parsed = DocumentParser.parseHTML(html);
      
      expect(parsed).not.toContain('<h1>');
      expect(parsed).not.toContain('</p>');
      expect(parsed).toContain('Title');
      expect(parsed).toContain('<test>');
      expect(parsed).toContain('&');
    });

    it('should auto-detect and parse format', () => {
      const markdown = '# Markdown Title';
      const html = '<h1>HTML Title</h1>';
      const plain = 'Plain text';

      expect(DocumentParser.autoparse(markdown)).toContain('[Markdown Title]');
      expect(DocumentParser.autoparse(html)).not.toContain('<h1>');
      expect(DocumentParser.autoparse(plain)).toBe(plain);
    });
  });

  // Additional unit tests for concept extraction
  describe('Concept Extraction', () => {
    it('should find related concepts based on similarity', () => {
      const concepts = [
        'neural network',
        'neural networks',
        'deep learning',
        'machine learning',
        'gradient descent'
      ];

      const related = ConceptExtractor.findRelatedConcepts('neural network', concepts);
      
      expect(related).toContain('neural networks');
      expect(related).not.toContain('neural network'); // Should not include itself
    });

    it('should calculate Levenshtein distance correctly', () => {
      // Access private method through any type for testing
      const extractor = ConceptExtractor as any;
      
      expect(extractor.levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(extractor.levenshteinDistance('', '')).toBe(0);
      expect(extractor.levenshteinDistance('abc', 'abc')).toBe(0);
    });
  });

  // Additional unit tests for claim classification
  describe('Claim Classification', () => {
    it('should classify definition claims', async () => {
      const content = 'Definition: A neural network is a computational model';
      const result = await pipeline.ingest(content, {
        title: 'Test',
        source_url: 'http://test.com',
        source_tier: 'T1' as SourceTier,
      });

      expect(result.chunks[0].claim_type).toBe('definition');
    });

    it('should classify method claims', async () => {
      const content = 'The algorithm implements a method to calculate gradients';
      const result = await pipeline.ingest(content, {
        title: 'Test',
        source_url: 'http://test.com',
        source_tier: 'T1' as SourceTier,
      });

      expect(result.chunks[0].claim_type).toBe('method');
    });

    it('should classify result claims', async () => {
      const content = 'The experiment showed that the model achieved 95% accuracy';
      const result = await pipeline.ingest(content, {
        title: 'Test',
        source_url: 'http://test.com',
        source_tier: 'T1' as SourceTier,
      });

      expect(result.chunks[0].claim_type).toBe('result');
    });

    it('should classify limitation claims', async () => {
      const content = 'However, the model fails on edge cases and has limitations';
      const result = await pipeline.ingest(content, {
        title: 'Test',
        source_url: 'http://test.com',
        source_tier: 'T1' as SourceTier,
      });

      expect(result.chunks[0].claim_type).toBe('limitation');
    });
  });
});
