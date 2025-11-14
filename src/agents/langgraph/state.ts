/**
 * LangGraph State Definitions
 *
 * Defines the state structure for agent graphs in the D&D AI platform.
 * This replaces the custom messaging system's state management.
 *
 * @module agents/langgraph/state
 */

import { BaseMessage } from '@langchain/core/messages';

/**
 * Result of D&D 5E rules validation
 */
export interface RuleCheckResult {
  /** Whether the action is valid according to D&D 5E rules */
  isValid: boolean;
  /** Reasoning for the validation result */
  reasoning: string;
  /** Suggested modifications to make the action valid */
  modifications: string[];
  /** Relevant rule references from SRD */
  ruleReferences?: string[];
}

/**
 * Dice roll request details
 */
export interface DiceRollRequest {
  /** Dice formula (e.g., "1d20+5", "2d6") */
  formula: string;
  /** Reason for the roll (e.g., "attack roll", "saving throw") */
  reason: string;
  /** Difficulty class (DC) if applicable */
  dc?: number;
  /** Advantage/disadvantage modifier */
  modifier?: 'advantage' | 'disadvantage' | 'normal';
  /** Skill or ability being tested */
  skill?: string;
}

/**
 * Campaign and world context information
 */
export interface WorldInfo {
  /** Current campaign ID */
  campaignId: string;
  /** Current session ID */
  sessionId: string;
  /** Active character IDs */
  characterIds: string[];
  /** Current location name */
  location?: string;
  /** Current threat level */
  threatLevel?: 'none' | 'low' | 'medium' | 'high';
  /** Active NPCs in the scene */
  activeNPCs?: string[];
  /** Recent memories for context */
  recentMemories?: Array<{
    content: string;
    type: string;
    timestamp: Date;
  }>;
}

/**
 * Narrative response from the DM
 */
export interface NarrativeResponse {
  /** Main narrative description */
  description: string;
  /** Environmental atmosphere */
  atmosphere?: string;
  /** Active NPCs and their dialogue */
  npcs?: Array<{
    name: string;
    dialogue?: string;
  }>;
  /** Available actions for the player */
  availableActions?: string[];
  /** Immediate consequences of player actions */
  consequences?: string[];
}

/**
 * Main state for the Dungeon Master agent graph
 *
 * This state flows through the graph nodes and accumulates
 * information as the graph executes.
 */
export interface DMState {
  /** Conversation history (LangChain messages) */
  messages: BaseMessage[];

  /** Original player input/query */
  playerInput: string | null;

  /** Detected player intent (e.g., "attack", "investigate", "talk") */
  playerIntent: string | null;

  /** Result of D&D rules validation */
  rulesValidation: RuleCheckResult | null;

  /** Campaign and world context */
  worldContext: WorldInfo | null;

  /** Final DM response */
  response: NarrativeResponse | null;

  /** Dice roll request if action requires rolling */
  requiresDiceRoll: DiceRollRequest | null;

  /** Error state for handling failures */
  error: string | null;

  /** Metadata for tracking and debugging */
  metadata?: {
    /** Timestamp when state was created */
    timestamp: Date;
    /** Graph execution step counter */
    stepCount: number;
    /** Total tokens used (for cost tracking) */
    tokensUsed?: number;
  };
}

/**
 * Channels configuration for state management
 *
 * Defines how state properties are updated when multiple
 * graph nodes write to them.
 */
export const dmStateChannels = {
  messages: {
    // Append new messages to the array
    reducer: (current: BaseMessage[], update: BaseMessage[]) => [...current, ...update],
    default: () => [] as BaseMessage[],
  },
  playerInput: {
    // Keep the latest player input
    reducer: (_current: string | null, update: string | null) => update,
    default: () => null,
  },
  playerIntent: {
    reducer: (_current: string | null, update: string | null) => update,
    default: () => null,
  },
  rulesValidation: {
    reducer: (_current: RuleCheckResult | null, update: RuleCheckResult | null) => update,
    default: () => null,
  },
  worldContext: {
    reducer: (_current: WorldInfo | null, update: WorldInfo | null) => update,
    default: () => null,
  },
  response: {
    reducer: (_current: NarrativeResponse | null, update: NarrativeResponse | null) => update,
    default: () => null,
  },
  requiresDiceRoll: {
    reducer: (_current: DiceRollRequest | null, update: DiceRollRequest | null) => update,
    default: () => null,
  },
  error: {
    reducer: (_current: string | null, update: string | null) => update,
    default: () => null,
  },
  metadata: {
    // Merge metadata objects
    reducer: (current: any, update: any) => ({ ...current, ...update }),
    default: () => ({
      timestamp: new Date(),
      stepCount: 0,
    }),
  },
};

/**
 * Initial state for a new DM graph execution
 */
export function createInitialState(playerInput: string, worldContext: WorldInfo): DMState {
  return {
    messages: [],
    playerInput,
    playerIntent: null,
    rulesValidation: null,
    worldContext,
    response: null,
    requiresDiceRoll: null,
    error: null,
    metadata: {
      timestamp: new Date(),
      stepCount: 0,
    },
  };
}
