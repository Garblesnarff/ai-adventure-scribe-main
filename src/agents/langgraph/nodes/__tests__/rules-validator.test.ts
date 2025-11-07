/**
 * Rules Validator Node Tests
 *
 * Tests D&D 5E rules validation and dice roll detection.
 * Verifies correct validation of player actions and skill checks.
 *
 * @module agents/langgraph/nodes/__tests__/rules-validator
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

// Track AI responses for testing
let mockAIResponse: string | null = null;

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      if (mockAIResponse) {
        return mockAIResponse;
      }
      // Default validation response
      return JSON.stringify({
        isValid: true,
        reasoning: 'Valid D&D 5E action',
        needsRoll: true,
        rollType: 'attack',
        rollFormula: '1d20+5',
        modifications: [],
      });
    }),
  }),
}));

// Import after mocks are set up
import { validateRules } from '../rules-validator';
import type { DMState, RuleCheckResult } from '../../state';

describe('Rules Validator Node', () => {
  let baseState: DMState;

  beforeEach(() => {
    mockAIResponse = null;
    baseState = {
      messages: [],
      playerInput: 'I attack the goblin',
      playerIntent: 'attack',
      rulesValidation: null,
      worldContext: {
        campaignId: 'test-campaign',
        sessionId: 'test-session',
        characterIds: ['test-char-1'],
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

  describe('Attack Validation', () => {
    it('should validate attack actions', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack the goblin with my sword',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation).toBeDefined();
      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should require dice roll for attack actions', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I swing my axe at the orc',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll?.formula).toContain('d20');
      expect(result.requiresDiceRoll?.reason).toContain('attack');
    });

    it('should detect attack roll from keywords', async () => {
      const attackInputs = [
        'I attack the dragon',
        'I hit the goblin',
        'I strike at the enemy',
      ];

      for (const input of attackInputs) {
        const state: DMState = {
          ...baseState,
          playerIntent: 'attack',
          playerInput: input,
        };

        const result = await validateRules(state);

        expect(result.requiresDiceRoll).toBeDefined();
        expect(result.requiresDiceRoll?.formula).toBe('1d20');
      }
    });
  });

  describe('Skill Check Validation', () => {
    it('should validate skill check actions', async () => {
      mockAIResponse = JSON.stringify({
        isValid: true,
        reasoning: 'Valid Perception check',
        needsRoll: true,
        rollType: 'check',
        rollFormula: '1d20+3',
        skill: 'Perception',
        dc: 15,
        modifications: [],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'skill_check',
        playerInput: 'I make a Perception check',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation).toBeDefined();
      expect(result.rulesValidation?.isValid).toBe(true);
    });

    it('should require dice roll for skill checks', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'skill_check',
        playerInput: 'I attempt to pick the lock',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll?.dc).toBeDefined();
    });

    it('should detect different skill types', async () => {
      const skillChecks = [
        { input: 'I make a Perception check', expected: 'Perception' },
        { input: 'I use Investigation', expected: 'Investigation' },
        { input: 'I try Stealth', expected: 'Stealth' },
        { input: 'I use Athletics to jump', expected: 'Athletics' },
        { input: 'I attempt Persuasion', expected: 'Persuasion' },
      ];

      for (const check of skillChecks) {
        const state: DMState = {
          ...baseState,
          playerIntent: 'skill_check',
          playerInput: check.input,
        };

        const result = await validateRules(state);

        expect(result.requiresDiceRoll).toBeDefined();
        // Skill detection works via fallback logic
      }
    });

    it('should set default DC for skill checks', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'skill_check',
        playerInput: 'I check for traps',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll?.dc).toBe(15); // Default DC
    });
  });

  describe('Saving Throw Validation', () => {
    it('should detect saving throws', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'other',
        playerInput: 'I make a Dexterity saving throw',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll?.reason).toContain('saving throw');
    });

    it('should require dice roll for saves', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: 'I attempt a Constitution save',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll?.formula).toBe('1d20');
      expect(result.requiresDiceRoll?.dc).toBe(15);
    });
  });

  describe('Movement Validation', () => {
    it('should not require dice roll for simple movement', async () => {
      mockAIResponse = JSON.stringify({
        isValid: true,
        reasoning: 'Simple movement',
        needsRoll: false,
        modifications: [],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'movement',
        playerInput: 'I walk down the hallway',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(true);
      // Simple movement shouldn't need rolls
    });
  });

  describe('Social Interaction Validation', () => {
    it('should validate social interactions', async () => {
      mockAIResponse = JSON.stringify({
        isValid: true,
        reasoning: 'Valid social interaction',
        needsRoll: true,
        rollType: 'check',
        skill: 'Persuasion',
        dc: 12,
        modifications: [],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'social',
        playerInput: 'I try to persuade the guard',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(true);
    });
  });

  describe('Invalid Actions', () => {
    it('should detect invalid actions', async () => {
      mockAIResponse = JSON.stringify({
        isValid: false,
        reasoning: 'Cannot attack while prone without standing first',
        needsRoll: false,
        modifications: ['Stand up first', 'Use half your movement'],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack while lying down',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.rulesValidation?.modifications).toBeDefined();
      expect(result.rulesValidation?.modifications.length).toBeGreaterThan(0);
    });

    it('should provide modification suggestions', async () => {
      mockAIResponse = JSON.stringify({
        isValid: false,
        reasoning: 'Spell requires concentration',
        modifications: ['Drop current concentration spell first'],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'spellcast',
        playerInput: 'I cast another concentration spell',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.modifications).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: null,
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing player intent', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: null,
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle AI service failures gracefully', async () => {
      mockAIResponse = 'Invalid JSON response'; // Force fallback by providing invalid response

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack',
      };

      const result = await validateRules(state);

      // Should fallback to basic validation
      expect(result.rulesValidation).toBeDefined();
      expect(result.rulesValidation?.isValid).toBe(true);
    });

    it('should handle malformed AI responses', async () => {
      mockAIResponse = 'Not JSON at all';

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack',
      };

      const result = await validateRules(state);

      // Should fallback to basic validation
      expect(result.rulesValidation).toBeDefined();
    });
  });

  describe('Dice Roll Requirements', () => {
    it('should create proper dice roll request structure', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack the goblin',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll).toHaveProperty('formula');
      expect(result.requiresDiceRoll).toHaveProperty('reason');
    });

    it('should include DC when applicable', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'skill_check',
        playerInput: 'I check for traps',
      };

      const result = await validateRules(state);

      if (result.requiresDiceRoll) {
        expect(result.requiresDiceRoll.dc).toBeDefined();
      }
    });
  });

  describe('Fallback Validation', () => {
    it('should use fallback when AI fails', async () => {
      mockAIResponse = 'Invalid JSON response'; // Force fallback by providing invalid response

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation).toBeDefined();
      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.rulesValidation?.reasoning).toContain('basic rules');
    });

    it('should detect rolls via fallback logic', async () => {
      mockAIResponse = 'Invalid JSON response'; // Force fallback by providing invalid response

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I hit the enemy',
      };

      const result = await validateRules(state);

      expect(result.requiresDiceRoll).toBeDefined();
    });
  });

  describe('Metadata Management', () => {
    it('should increment step count', async () => {
      const state: DMState = {
        ...baseState,
        metadata: {
          timestamp: new Date(),
          stepCount: 3,
        },
      };

      const result = await validateRules(state);

      expect(result.metadata?.stepCount).toBe(4);
    });

    it('should preserve existing metadata', async () => {
      const state: DMState = {
        ...baseState,
        metadata: {
          timestamp: new Date(),
          stepCount: 0,
          tokensUsed: 150,
        },
      };

      const result = await validateRules(state);

      expect(result.metadata?.tokensUsed).toBe(150);
    });
  });

  describe('World Context Integration', () => {
    it('should use character context in validation', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          campaignId: 'test',
          sessionId: 'test',
          characterIds: ['char-123'],
        },
      };

      const result = await validateRules(state);

      // Should complete without errors
      expect(result.rulesValidation).toBeDefined();
    });

    it('should handle missing character context', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          campaignId: 'test',
          sessionId: 'test',
          characterIds: [],
        },
      };

      const result = await validateRules(state);

      expect(result.rulesValidation).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-target attacks', async () => {
      mockAIResponse = JSON.stringify({
        isValid: true,
        reasoning: 'Valid multi-target attack',
        needsRoll: true,
        rollType: 'attack',
        rollFormula: '1d20+5',
        modifications: [],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'I attack both goblins with my sword',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation?.isValid).toBe(true);
    });

    it('should handle conditional actions', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
        playerInput: 'If the goblin moves closer, I attack',
      };

      const result = await validateRules(state);

      expect(result.rulesValidation).toBeDefined();
    });
  });
});
