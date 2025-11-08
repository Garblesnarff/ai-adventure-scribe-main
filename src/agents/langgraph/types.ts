/**
 * LangGraph Types
 *
 * Type definitions for the DM agent graph system.
 * Defines core types used across nodes and state management.
 *
 * @module langgraph/types
 */

import type { BaseMessage } from '@langchain/core/messages';

/**
 * Player intent types detected from messages
 */
export type PlayerIntentType =
  | 'attack'
  | 'social'
  | 'exploration'
  | 'spellcast'
  | 'skill_check'
  | 'movement'
  | 'other';

/**
 * Player intent with confidence score
 */
export interface PlayerIntent {
  type: PlayerIntentType;
  confidence: number;
  details?: {
    target?: string;
    action?: string;
    skill?: string;
  };
}

/**
 * D&D 5E rules validation result
 */
export interface RulesValidation {
  isValid: boolean;
  needsRoll: boolean;
  rollFormula?: string;
  rollReason?: string;
  dc?: number;
  ac?: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Dice roll request for human-in-the-loop
 */
export interface DiceRollRequest {
  formula: string;
  reason: string;
  dc?: number;
  ac?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

/**
 * World context for DM decisions
 */
export interface WorldContext {
  character?: any;
  campaign?: any;
  sessionId?: string;
  location?: string;
  activeNPCs?: string[];
  gameState?: any;
}

/**
 * DM state for LangGraph workflow
 */
export interface DMState {
  messages: BaseMessage[];
  playerIntent: PlayerIntent | null;
  rulesValidation: RulesValidation | null;
  worldContext: WorldContext;
  response: string | null;
  requiresDiceRoll: DiceRollRequest | null;
  error: string | null;
}
