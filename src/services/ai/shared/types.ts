/**
 * Shared TypeScript types and interfaces for AI service modules
 * Extracted from ai-service.ts for reusability across modules
 */

/**
 * Chat message structure for conversation history
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  narrationSegments?: NarrationSegment[];
}

/**
 * Narration segment for multi-voice text-to-speech
 */
export type NarrationSegment = {
  type: 'dm' | 'character' | 'transition';
  text: string;
  character?: string;
  voice_category?: string;
};

/**
 * Game context for AI interactions
 */
export interface GameContext {
  campaignId: string;
  characterId: string;
  sessionId?: string;
  campaignDetails?: Record<string, unknown>;
  characterDetails?: Record<string, unknown>;
}

/**
 * Campaign generation parameters
 */
export interface CampaignParams {
  genre: string;
  difficulty: string;
  length: string;
  tone: string;
}

/**
 * Class equipment data
 */
export interface ClassEquipment {
  weapons: string[];
  armor: string;
}

/**
 * AI response structure with optional features
 */
export interface AIResponse {
  text: string;
  narrationSegments?: NarrationSegment[];
  roll_requests?: unknown[];
  dice_rolls?: unknown[];
  combatDetection?: {
    isCombat: boolean;
    confidence: number;
    combatType: string;
    shouldStartCombat: boolean;
    shouldEndCombat: boolean;
    enemies: unknown[];
    combatActions: unknown[];
  };
}
