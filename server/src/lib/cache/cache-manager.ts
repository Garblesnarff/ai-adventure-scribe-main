/**
 * REST API Cache Manager
 * 
 * Provides comprehensive caching capabilities for REST resources with
 * support for TTL, pattern-based invalidation, and ETag generation.
 */

import NodeCache from 'node-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkperiod?: number; // Check for expired keys every X seconds
  useClones?: boolean; // Clone objects when storing/retrieving
  maxKeys?: number; // Maximum number of keys to store
}

export interface CacheEntry {
  value: any;
  etag?: string;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private cache: NodeCache;
  private keyPatterns: Map<string, Set<string>>; // Pattern to keys mapping

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 300, // 5 minutes default
      checkperiod: options.checkperiod || 60, // Check every minute
      useClones: options.useClones !== false, // Default to true
      maxKeys: options.maxKeys || 10000
    });

    this.keyPatterns = new Map();
    
    // Listen for key deletions to clean up patterns
    this.cache.on('del', this.onKeyDeleted.bind(this));
    this.cache.on('expired', this.onKeyDeleted.bind(this));
  }

  /**
   * Get a value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get<CacheEntry>(key);
    
    if (!entry) {
      return null;
    }

    // Return the cached value
    return entry.value as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      value,
      etag: this.generateETag(value),
      timestamp: Date.now(),
      ttl: ttl || 300
    };

    this.cache.set(key, entry, ttl);
    this.addKeyToPatterns(key);
  }

  /**
   * Delete a specific key from cache
   */
  public async delete(key: string): Promise<void> {
    this.cache.del(key);
  }

  /**
   * Check if a key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   * Pattern syntax:
   * - * matches any characters within a segment
   * - ** matches any characters across segments
   * - {param} matches a parameter placeholder
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    const regex = this.patternToRegex(pattern);
    const keys = this.cache.keys();
    const matchedKeys: string[] = [];

    for (const key of keys) {
      if (regex.test(key)) {
        matchedKeys.push(key);
      }
    }

    // Delete all matched keys
    for (const key of matchedKeys) {
      this.cache.del(key);
    }

    return matchedKeys.length;
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      keys: this.cache.getStats().keys,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      ksize: this.cache.getStats().ksize,
      vsize: this.cache.getStats().vsize
    };
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    this.cache.flushAll();
    this.keyPatterns.clear();
  }

  /**
   * Get ETag for a cached entry
   */
  public async getETag(key: string): Promise<string | null> {
    const entry = this.cache.get<CacheEntry>(key);
    return entry ? entry.etag || null : null;
  }

  /**
   * Check if cached entry matches ETag
   */
  public async matchesETag(key: string, etag: string): Promise<boolean> {
    const cachedETag = await this.getETag(key);
    return cachedETag === etag;
  }

  /**
   * Get multiple keys matching a pattern
   */
  public async getByPattern<T = any>(pattern: string): Promise<Array<{key: string, value: T}>> {
    const regex = this.patternToRegex(pattern);
    const keys = this.cache.keys();
    const results: Array<{key: string, value: T}> = [];

    for (const key of keys) {
      if (regex.test(key)) {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.push({ key, value });
        }
      }
    }

    return results;
  }

  /**
   * Set cache entry with conditional update based on ETag
   */
  public async setIfMatch(key: string, value: any, etag: string, ttl?: number): Promise<boolean> {
    const cachedETag = await this.getETag(key);
    
    if (cachedETag && cachedETag !== etag) {
      return false; // ETag mismatch, don't update
    }

    await this.set(key, value, ttl);
    return true;
  }

  /**
   * Set cache entry only if key doesn't exist
   */
  public async setIfNotExists(key: string, value: any, ttl?: number): Promise<boolean> {
    if (await this.has(key)) {
      return false;
    }

    await this.set(key, value, ttl);
    return true;
  }

  /**
   * Get cache entry with metadata
   */
  public async getWithMetadata(key: string): Promise<CacheEntry | null> {
    return this.cache.get<CacheEntry>(key) || null;
  }

  /**
   * Extend TTL for existing cache entry
   */
  public async extendTTL(key: string, ttl: number): Promise<boolean> {
    return this.cache.ttl(key, ttl);
  }

  /**
   * Get TTL for a cache entry
   */
  public async getTTL(key: string): Promise<number | undefined> {
    return this.cache.getTtl(key);
  }

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and **
    let escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§DOUBLESTAR§')
      .replace(/\*/g, '§SINGLESTAR§');

    // Replace placeholders with regex equivalents
    escaped = escaped
      .replace(/§DOUBLESTAR§/g, '.*')
      .replace(/§SINGLESTAR§/g, '[^:]*')
      .replace(/\{[^}]+\}/g, '[^:]+');

    return new RegExp(`^${escaped}$`);
  }

  /**
   * Generate ETag for a value
   */
  private generateETag(value: any): string {
    const content = JSON.stringify(value);
    const hash = Buffer.from(content).toString('base64').slice(0, 16);
    return `"${hash}"`;
  }

  /**
   * Add key to pattern tracking
   */
  private addKeyToPatterns(key: string): void {
    // Extract patterns from key (simple heuristic)
    const segments = key.split(':');
    
    for (let i = 0; i < segments.length; i++) {
      const pattern = segments.slice(0, i + 1).join(':') + ':*';
      
      if (!this.keyPatterns.has(pattern)) {
        this.keyPatterns.set(pattern, new Set());
      }
      
      this.keyPatterns.get(pattern)!.add(key);
    }
  }

  /**
   * Handle key deletion to clean up pattern tracking
   */
  private onKeyDeleted(key: string): void {
    // Remove key from all patterns
    for (const [pattern, keys] of this.keyPatterns.entries()) {
      keys.delete(key);
      
      // Clean up empty pattern sets
      if (keys.size === 0) {
        this.keyPatterns.delete(pattern);
      }
    }
  }

  /**
   * Create cache key from components
   */
  public static createKey(resourceType: string, operation: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${resourceType}:${operation}${sortedParams ? ':' + sortedParams : ''}`;
  }

  /**
   * Create cache namespace for resources
   */
  public static createNamespace(resourceType: string, resourceId?: string): string {
    return resourceId ? `${resourceType}:${resourceId}` : resourceType;
  }
}