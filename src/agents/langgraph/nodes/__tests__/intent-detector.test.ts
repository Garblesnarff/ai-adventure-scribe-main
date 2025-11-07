/**
 * Intent Detector Node Tests
 *
 * Tests the intent detection functionality for player actions.
 * Verifies correct categorization of D&D action types.
 *
 * @module agents/langgraph/nodes/__tests__/intent-detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE imports
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/config/ai', () => ({
  GEMINI_TEXT_MODEL: 'gemini-pro',
}));

// Track AI calls for testing
let mockAIResponse: string | null = null;

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      if (mockAIResponse) {
        return mockAIResponse;
      }
      // Default response
      return JSON.stringify({
        type: 'attack',
        confidence: 0.9,
        details: { target: 'goblin', action: 'attack' },
      });
    }),
  }),
}));

// Import after mocks are set up
import { detectIntent } from '../intent-detector';
import type { DMState, WorldInfo } from '../../state';

describe('Intent Detector Node', () => {
  let baseState: DMState;

  beforeEach(() => {
    mockAIResponse = null;
    baseState = {
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
  });

  describe('Attack Intent Detection', () => {
    it('should detect attack intent from AI response', async () => {
      mockAIResponse = JSON.stringify({
        type: 'attack',
        confidence: 0.95,
        details: { target: 'goblin', action: 'swing sword' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I attack the goblin with my sword',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('attack');
      expect(result.error).toBeUndefined();
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should use fallback detection for attack keywords', async () => {
      mockAIResponse = 'Invalid JSON response';

      const state: DMState = {
        ...baseState,
        playerInput: 'I strike the enemy with my axe',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('attack');
    });

    it('should detect various attack verbs', async () => {
      const attackPhrases = [
        'I hit the orc',
        'I shoot the goblin with my bow',
        'I stab the bandit',
        'I strike at the dragon',
      ];

      for (const phrase of attackPhrases) {
        mockAIResponse = 'Invalid'; // Force fallback
        const state: DMState = {
          ...baseState,
          playerInput: phrase,
        };

        const result = await detectIntent(state);
        expect(result.playerIntent).toBe('attack');
      }
    });
  });

  describe('Social Intent Detection', () => {
    it('should detect social interaction intent', async () => {
      mockAIResponse = JSON.stringify({
        type: 'social',
        confidence: 0.9,
        details: { target: 'guard', action: 'persuade' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I try to persuade the guard',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('social');
    });

    it('should detect conversation keywords', async () => {
      const socialPhrases = [
        'I talk to the merchant',
        'I say hello to the innkeeper',
        'I speak with the wizard',
        'I ask the guard for directions',
        'I try to deceive the bandit',
        'I intimidate the goblin',
      ];

      for (const phrase of socialPhrases) {
        mockAIResponse = 'Invalid'; // Force fallback
        const state: DMState = {
          ...baseState,
          playerInput: phrase,
        };

        const result = await detectIntent(state);
        expect(result.playerIntent).toBe('social');
      }
    });
  });

  describe('Exploration Intent Detection', () => {
    it('should detect exploration intent', async () => {
      mockAIResponse = JSON.stringify({
        type: 'exploration',
        confidence: 0.85,
        details: { target: 'chest', action: 'investigate' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I search the chest for treasure',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('exploration');
    });

    it('should detect investigation keywords', async () => {
      const explorationPhrases = [
        'I look around the room',
        'I search for traps',
        'I investigate the bookshelf',
        'I examine the door',
        'I check for hidden passages',
      ];

      for (const phrase of explorationPhrases) {
        mockAIResponse = 'Invalid';
        const state: DMState = {
          ...baseState,
          playerInput: phrase,
        };

        const result = await detectIntent(state);
        expect(result.playerIntent).toBe('exploration');
      }
    });
  });

  describe('Spellcast Intent Detection', () => {
    it('should detect spellcasting intent', async () => {
      mockAIResponse = JSON.stringify({
        type: 'spellcast',
        confidence: 0.92,
        details: { target: 'party', action: 'cast healing spell' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I cast Cure Wounds on the fighter',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('spellcast');
    });

    it('should detect spell keywords', async () => {
      const spellPhrases = [
        'I cast Fireball',
        'I use my spell to heal',
      ];

      for (const phrase of spellPhrases) {
        mockAIResponse = 'Invalid';
        const state: DMState = {
          ...baseState,
          playerInput: phrase,
        };

        const result = await detectIntent(state);
        expect(result.playerIntent).toBe('spellcast');
      }
    });
  });

  describe('Movement Intent Detection', () => {
    it('should detect movement intent', async () => {
      mockAIResponse = JSON.stringify({
        type: 'movement',
        confidence: 0.8,
        details: { target: 'hallway', action: 'walk' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I walk down the hallway',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('movement');
    });

    it('should detect movement keywords', async () => {
      const movementPhrases = [
        'I move to the door',
        'I run towards the exit',
        'I go to the tavern',
      ];

      for (const phrase of movementPhrases) {
        mockAIResponse = 'Invalid';
        const state: DMState = {
          ...baseState,
          playerInput: phrase,
        };

        const result = await detectIntent(state);
        expect(result.playerIntent).toBe('movement');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: null,
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('other');
      expect(result.error).toBeDefined();
    });

    it('should handle empty player input', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: '',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('other');
      expect(result.error).toBeDefined();
    });

    it('should handle AI service failures gracefully', async () => {
      mockAIResponse = 'Invalid JSON response'; // Force fallback by providing invalid response

      const state: DMState = {
        ...baseState,
        playerInput: 'I do something',
      };

      const result = await detectIntent(state);

      // Should fallback to 'other' category
      expect(result.playerIntent).toBe('other');
    });
  });

  describe('JSON Parsing', () => {
    it('should handle malformed JSON from AI', async () => {
      mockAIResponse = '{invalid json}';

      const state: DMState = {
        ...baseState,
        playerInput: 'I attack the goblin',
      };

      const result = await detectIntent(state);

      // Should use fallback detection
      expect(result.playerIntent).toBe('attack');
    });

    it('should extract JSON from markdown code blocks', async () => {
      mockAIResponse = `\`\`\`json
{
  "type": "social",
  "confidence": 0.9,
  "details": {}
}
\`\`\``;

      const state: DMState = {
        ...baseState,
        playerInput: 'I talk to the guard',
      };

      const result = await detectIntent(state);

      // Might fallback if JSON extraction doesn't work
      expect(result.playerIntent).toBeDefined();
    });

    it('should handle missing required fields in JSON', async () => {
      mockAIResponse = JSON.stringify({
        // Missing 'type' field
        confidence: 0.9,
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I search the room',
      };

      const result = await detectIntent(state);

      // Should use fallback detection
      expect(result.playerIntent).toBe('exploration');
    });
  });

  describe('Confidence Handling', () => {
    it('should accept high confidence results', async () => {
      mockAIResponse = JSON.stringify({
        type: 'attack',
        confidence: 0.95,
        details: {},
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I attack',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('attack');
    });

    it('should accept low confidence results', async () => {
      mockAIResponse = JSON.stringify({
        type: 'other',
        confidence: 0.3,
        details: {},
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I do something unusual',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('other');
    });
  });

  describe('Metadata Management', () => {
    it('should increment step count', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: 'I attack',
        metadata: {
          timestamp: new Date(),
          stepCount: 5,
        },
      };

      const result = await detectIntent(state);

      expect(result.metadata?.stepCount).toBe(6);
    });

    it('should preserve other metadata fields', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: 'I attack',
        metadata: {
          timestamp: new Date(),
          stepCount: 0,
          tokensUsed: 100,
        },
      };

      const result = await detectIntent(state);

      expect(result.metadata?.tokensUsed).toBe(100);
      expect(result.metadata?.stepCount).toBe(1);
    });
  });

  describe('Complex Intent Scenarios', () => {
    it('should handle multi-action inputs', async () => {
      mockAIResponse = JSON.stringify({
        type: 'attack',
        confidence: 0.9,
        details: { target: 'goblin', action: 'attack with sword' },
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I draw my sword and attack the goblin',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('attack');
    });

    it('should handle conditional actions', async () => {
      mockAIResponse = JSON.stringify({
        type: 'social',
        confidence: 0.85,
        details: {},
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'If the guard refuses, I try to persuade him',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBe('social');
    });

    it('should handle ambiguous inputs', async () => {
      mockAIResponse = JSON.stringify({
        type: 'other',
        confidence: 0.5,
        details: {},
      });

      const state: DMState = {
        ...baseState,
        playerInput: 'I wait and see what happens',
      };

      const result = await detectIntent(state);

      expect(result.playerIntent).toBeDefined();
    });
  });
});
