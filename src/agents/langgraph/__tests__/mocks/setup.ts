/**
 * Test Setup for LangGraph Tests
 *
 * Provides common mocks and utilities for testing LangGraph components.
 * Import this in test files to get consistent mocking behavior.
 *
 * @module agents/langgraph/__tests__/mocks/setup
 */

import { vi } from 'vitest';
import { mockSupabaseClient } from './checkpointer';

/**
 * Mock Supabase integration client
 *
 * This prevents tests from attempting to connect to Supabase
 */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

/**
 * Mock logger to prevent console spam during tests
 */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}));

/**
 * Mock AI configuration
 */
vi.mock('@/config/ai', () => ({
  GEMINI_TEXT_MODEL: 'gemini-pro',
  GEMINI_API_KEY: 'test-key',
}));

/**
 * Track AI service calls for test verification
 */
export interface MockAICallTracker {
  callCount: number;
  calls: Array<{ prompt: string; response: string }>;
  responses: string[];
  currentResponseIndex: number;
}

/**
 * Create a mock AI service tracker
 */
export function createMockAITracker(): MockAICallTracker {
  return {
    callCount: 0,
    calls: [],
    responses: [],
    currentResponseIndex: 0,
  };
}

/**
 * Mock Gemini AI Manager
 *
 * Provides configurable responses for testing AI interactions
 */
export function createMockGeminiManager(tracker: MockAICallTracker) {
  return {
    executeWithRotation: vi.fn(async (fn: any) => {
      tracker.callCount++;

      // If we have predefined responses, use them in sequence
      if (tracker.responses.length > 0) {
        const response = tracker.responses[tracker.currentResponseIndex];
        tracker.currentResponseIndex =
          (tracker.currentResponseIndex + 1) % tracker.responses.length;

        tracker.calls.push({
          prompt: 'test-prompt',
          response
        });

        return response;
      }

      // Default responses for common test scenarios
      const defaultResponses = [
        // Intent detection
        JSON.stringify({
          type: 'attack',
          confidence: 0.9,
          details: { target: 'goblin', action: 'attack with sword' },
        }),
        // Rules validation
        JSON.stringify({
          isValid: true,
          reasoning: 'Valid attack action',
          needsRoll: true,
          rollType: 'attack',
          rollFormula: '1d20+5',
          modifications: [],
        }),
        // Response generation
        JSON.stringify({
          description: 'The goblin raises its rusty sword and snarls at you menacingly.',
          atmosphere: 'tense',
          npcs: [{ name: 'Goblin', dialogue: 'Me smash you!' }],
          availableActions: ['Attack', 'Defend', 'Run'],
          consequences: ['Combat initiated'],
        }),
      ];

      const response = defaultResponses[tracker.callCount % defaultResponses.length];
      tracker.calls.push({
        prompt: 'test-prompt',
        response
      });

      return response;
    }),
  };
}

/**
 * Setup mock for @/services/ai/shared/utils
 *
 * This is the main AI service import that many nodes use
 */
export function setupAIServiceMock(tracker: MockAICallTracker) {
  vi.mock('@/services/ai/shared/utils', () => ({
    getGeminiManager: () => createMockGeminiManager(tracker),
  }));
}

/**
 * Mock AI prompts module
 */
vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are a skilled Dungeon Master.',
  buildGameContextPrompt: () => 'D&D 5E campaign',
  buildResponseStructurePrompt: () => 'Respond in JSON format',
}));

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.error.mockClear();
  mockLogger.debug.mockClear();
}

/**
 * Create a base test state for DM graph tests
 */
export function createBaseTestState() {
  return {
    messages: [],
    playerInput: null,
    playerIntent: null,
    rulesValidation: null,
    worldContext: {
      campaignId: 'test-campaign',
      sessionId: 'test-session',
      characterIds: ['test-char'],
    },
    response: null,
    requiresDiceRoll: null,
    error: null,
    metadata: {
      timestamp: new Date(),
      stepCount: 0,
    },
  };
}
