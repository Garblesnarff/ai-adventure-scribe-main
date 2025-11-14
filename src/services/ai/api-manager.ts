/**
 * API Manager Service
 *
 * Provides access to Gemini API manager statistics and diagnostics.
 * Extracted from ai-service.ts for modularity.
 *
 * @module api-manager
 */

import { getGeminiManager } from './shared/utils';

import type { GeminiApiManager } from '@/infrastructure/ai';

/**
 * API statistics structure
 */
export interface ApiStats {
  currentKey: ReturnType<GeminiApiManager['getCurrentKeyInfo']>;
  allKeyStats: ReturnType<GeminiApiManager['getStats']>;
  rateLimits: ReturnType<GeminiApiManager['getRateLimitStats']>;
}

/**
 * Get Gemini API manager statistics
 *
 * Retrieves comprehensive statistics about API key usage, rotation,
 * rate limits, and performance metrics. Useful for debugging and monitoring.
 *
 * @returns API statistics including current key, all key stats, and rate limits
 *
 * @example
 * ```typescript
 * const stats = getApiStats();
 * console.log('Current API key:', stats.currentKey.keyIndex);
 * console.log('Total requests:', stats.allKeyStats.totalRequests);
 * console.log('Rate limit status:', stats.rateLimits);
 * ```
 */
export function getApiStats(): ApiStats {
  try {
    const manager = getGeminiManager();
    return {
      currentKey: manager.getCurrentKeyInfo(),
      allKeyStats: manager.getStats(),
      rateLimits: manager.getRateLimitStats(),
    };
  } catch (error) {
    return { error: 'Gemini API manager not available' } as unknown as ApiStats;
  }
}
