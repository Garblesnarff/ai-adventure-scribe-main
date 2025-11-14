/**
 * OpenAI Client
 *
 * Client for OpenAI API services (embeddings, etc.)
 * Currently uses server-side proxy via llmApiClient for security.
 *
 * Environment variables:
 * - VITE_OPENAI_API_KEY: OpenAI API key (server-side only)
 */

import type { EmbeddingResponse } from './types';

import { llmApiClient } from '@/infrastructure/api';
import logger from '@/lib/logger';

export class OpenAIClient {
  /**
   * Generate embeddings for text using OpenAI's embedding model
   * Used for semantic memory retrieval and similarity search
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small',
  ): Promise<EmbeddingResponse> {
    try {
      logger.debug(`[OpenAIClient] Generating embedding for text (${text.length} chars)`);

      // Note: This currently uses llmApiClient which proxies to server
      // In the future, could support direct client-side calls if needed
      const embedding = await llmApiClient.generateEmbedding({
        text,
        model,
        provider: 'openai',
      });

      return {
        embedding,
        model,
        usage: {
          prompt_tokens: Math.ceil(text.length / 4), // Approximate
          total_tokens: Math.ceil(text.length / 4),
        },
      };
    } catch (error) {
      logger.error('[OpenAIClient] Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small',
  ): Promise<EmbeddingResponse[]> {
    logger.debug(`[OpenAIClient] Generating embeddings for ${texts.length} texts`);

    // Process in parallel
    const promises = texts.map((text) => this.generateEmbedding(text, model));
    return Promise.all(promises);
  }
}

/**
 * Singleton instance of OpenAI client
 */
export const openaiClient = new OpenAIClient();
