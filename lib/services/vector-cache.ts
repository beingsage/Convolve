/**
 * Semantic Vector Cache Layer
 * Enhancement #1: Caches embeddings to avoid recomputation
 * LRU eviction, auto-invalidation on graph updates
 */

import { createHash } from 'crypto';

interface CacheEntry {
  vector: number[];
  timestamp: number;
  hits: number;
  confidence: number;
}

type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
};

export class VectorCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000;
  private ttl: number = 86400000; // 24 hours
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  private getHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  set(text: string, vector: number[], confidence: number = 1.0): void {
    const key = this.getHash(text);

    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      vector,
      timestamp: Date.now(),
      hits: 0,
      confidence,
    });

    this.stats.size = this.cache.size;
  }

  get(text: string): number[] | null {
    const key = this.getHash(text);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.vector;
  }

  private evictLRU(): void {
    // Find least recently used (fewest hits)
    let minHits = Infinity;
    let lruKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Invalidate entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }

    this.stats.size = this.cache.size;
  }

  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total === 0 ? 0 : this.stats.hits / total,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }
}

// Singleton instance
let cacheInstance: VectorCache | null = null;

export function getVectorCache(): VectorCache {
  if (!cacheInstance) {
    cacheInstance = new VectorCache();
  }
  return cacheInstance;
}
