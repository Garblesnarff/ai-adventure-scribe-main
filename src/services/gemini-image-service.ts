/**
 * Gemini Image Generation Service
 *
 * Proxies through the server LLM/image gateway to avoid exposing client-side keys.
 * Maintains the same public API.
 */

import { llmApiClient } from './llm-api-client';
import { logger } from '../lib/logger';

interface GeminiImageGenerationRequest {
  prompt: string;
  referenceImage?: string; // base64 encoded image to use as reference
  referenceImages?: string[]; // Multiple base64 encoded images for multi-image reference
}

/**
 * Service class for direct Gemini image generation
 */
export class GeminiImageService {
  private usageToday = 0;
  private readonly DAILY_FREE_LIMIT = 500; // Google AI free tier limit

  constructor() {}

  /**
   * Check if we can use the free tier today
   * @returns true if under daily limit
   */
  canUseFreeToday(): boolean {
    // Reset usage counter at start of new day
    const today = new Date().toDateString();
    const lastUsageDate = localStorage.getItem('gemini-image-last-usage-date');

    if (lastUsageDate !== today) {
      this.usageToday = 0;
      localStorage.setItem('gemini-image-last-usage-date', today);
      localStorage.setItem('gemini-image-usage-today', '0');
    } else {
      this.usageToday = parseInt(localStorage.getItem('gemini-image-usage-today') || '0', 10);
    }

    return this.usageToday < this.DAILY_FREE_LIMIT;
  }

  /**
   * Record successful usage
   */
  private recordUsage(): void {
    this.usageToday++;
    localStorage.setItem('gemini-image-usage-today', this.usageToday.toString());
  }

  /**
   * Get remaining free requests for today
   * @returns number of free requests remaining
   */
  getRemainingFreeRequests(): number {
    if (!this.canUseFreeToday()) {
      return 0;
    }
    return this.DAILY_FREE_LIMIT - this.usageToday;
  }

  /**
   * Generate an image (server-proxied)
   * @param request - Image generation request parameters
   * @returns Promise resolving to base64 encoded image data
   */
  async generateImage(request: GeminiImageGenerationRequest): Promise<string> {
    const { prompt, referenceImage, referenceImages } = request;

    // Check local free-tier counter (client-side UX guard only)
    if (!this.canUseFreeToday()) {
      throw new Error(
        `Gemini free tier limit exceeded for today (${this.DAILY_FREE_LIMIT} requests). ` +
          'Please try again tomorrow or use a paid alternative.',
      );
    }

    try {
      const ref =
        referenceImage ||
        (referenceImages && referenceImages.length > 0 ? referenceImages[0] : undefined);
      const imageData = await llmApiClient.generateImage({ prompt, referenceImage: ref });
      this.recordUsage();
      return imageData;
    } catch (error) {
      logger.error('Error generating image (server-proxy):', error);
      throw new Error(
        `Gemini image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get usage statistics for today
   * @returns Object containing usage stats
   */
  getUsageStats(): { used: number; limit: number; remaining: number } {
    return {
      used: this.usageToday,
      limit: this.DAILY_FREE_LIMIT,
      remaining: this.getRemainingFreeRequests(),
    };
  }
}

// Export singleton instance
export const geminiImageService = new GeminiImageService();
