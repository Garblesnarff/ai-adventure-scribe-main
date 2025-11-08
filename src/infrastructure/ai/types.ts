/**
 * AI Infrastructure Types
 *
 * Type definitions for AI service client configurations and responses.
 */

/**
 * Common AI generation parameters
 */
export interface AIGenerationParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

/**
 * AI provider types
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'elevenlabs';

/**
 * Rate limit statistics for AI services
 */
export interface RateLimitStats {
  dailyUsage: number;
  dailyLimit: number;
  recentRequests: number;
  minutelyLimit: number;
  remainingDaily: number;
  remainingMinutely: number;
  resetTime: number;
}

/**
 * API key configuration
 */
export interface ApiKeyConfig {
  index: number;
  truncatedKey: string;
  stats?: any;
}

/**
 * Voice generation settings for ElevenLabs
 */
export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * Text-to-speech request parameters
 */
export interface TTSRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
}

/**
 * Embedding generation response
 */
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
