/**
 * AI Infrastructure Layer - Public API
 *
 * This module provides centralized access to AI service clients:
 * - Google Gemini (text generation, chat)
 * - OpenAI (embeddings)
 * - ElevenLabs (text-to-speech)
 *
 * All clients are configured with appropriate API keys from environment
 * variables and provide consistent error handling and logging.
 *
 * @module infrastructure/ai
 */

// Export Gemini client and singleton
export { GeminiApiManager } from './gemini-client';
export { getGeminiApiManager, resetGeminiApiManager } from './gemini-singleton';

// Export OpenAI client
export { OpenAIClient, openaiClient } from './openai-client';

// Export ElevenLabs client
export { ElevenLabsClient, elevenlabsClient } from './elevenlabs-client';

// Export types
export type {
  AIGenerationParams,
  AIProvider,
  RateLimitStats,
  ApiKeyConfig,
  VoiceSettings,
  TTSRequest,
  EmbeddingResponse,
} from './types';

/**
 * Convenience exports for common patterns
 */

/**
 * Get the singleton Gemini API manager
 * @example
 * ```typescript
 * import { geminiClient } from '@/infrastructure/ai';
 * const result = await geminiClient.executeWithRotation(async (genAI) => {
 *   const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
 *   const response = await model.generateContent('Hello!');
 *   return response.response.text();
 * });
 * ```
 */
export const geminiClient = getGeminiApiManager();
