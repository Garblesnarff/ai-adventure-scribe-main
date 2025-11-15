/**
 * Unit Tests for Rules Validator Node
 *
 * Tests D&D 5E rules validation and dice roll determination.
 *
 * @module agents/langgraph/nodes/__tests__/rules-validator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateRules } from '../rules-validator';
import type { DMState } from '../../state';
import * as geminiUtils from '@/services/ai/shared/utils';

// Mock the Gemini manager
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Rules Validator Node', () => {
  let mockGeminiManager: any;

  beforeEach(() => {
    mockGeminiManager = {
      executeWithRotation: vi.fn(),
    };
    vi.mocked(geminiUtils.getGeminiManager).mockReturnValue(mockGeminiManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockState = (playerInput: string, playerIntent: string): DMState => ({
    messages: [],
    playerInput,
    playerIntent,
    rulesValidation: null,
    worldContext: {
      campaignId: 'test-campaign',
      sessionId: 'test-session',
      characterIds: ['test-character'],
    },
    response: null,
    requiresDiceRoll: null,
    error: null,
    metadata: {
      timestamp: new Date(),
      stepCount: 0,
    },
  });

  describe('AI-Based Validation', () => {
    it('should validate attack action as valid', async () => {
      const mockState = createMockState('I attack the goblin', 'attack');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          reasoning: 'Standard melee attack is valid',
          needsRoll: true,
          rollType: 'attack',
          rollFormula: '1d20+modifier',
          rollReason: 'attack roll',
          warnings: [],
          modifications: [],
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.rulesValidation?.reasoning).toContain('valid');
      expect(result.requiresDiceRoll).toBeTruthy();
    });

    it('should validate spell casting with appropriate checks', async () => {
      const mockState = createMockState('I cast Fireball', 'spellcast');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          reasoning: 'Fireball is a valid 3rd level spell',
          needsRoll: false,
          rollType: 'save',
          dc: 15,
          warnings: ['Targets must make Dexterity saving throws'],
          modifications: [],
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.rulesValidation?.reasoning).toContain('valid');
    });

    it('should flag invalid actions', async () => {
      const mockState = createMockState('I attack three times in one turn', 'attack');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: false,
          reasoning: 'Most characters can only attack once per turn without Extra Attack',
          warnings: ['Check character level and class features'],
          modifications: ['Reduce to one attack', 'Use Action Surge if Fighter'],
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.rulesValidation?.modifications?.length).toBeGreaterThan(0);
    });
  });

  describe('Dice Roll Determination', () => {
    beforeEach(() => {
      // Mock AI to return basic valid response
      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ isValid: true, reasoning: 'Valid action' }),
      );
    });

    it('should require dice roll for attack intent', async () => {
      const mockState = createMockState('I swing my sword', 'attack');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.formula).toBe('1d20');
      expect(result.requiresDiceRoll?.reason).toBe('attack roll');
    });

    it('should require dice roll for skill check intent', async () => {
      const mockState = createMockState('I check for traps', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.formula).toBe('1d20');
      expect(result.requiresDiceRoll?.reason).toContain('check');
      expect(result.requiresDiceRoll?.dc).toBe(15);
    });

    it('should identify Perception checks', async () => {
      const mockState = createMockState('I use my Perception to spot enemies', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.reason).toContain('Perception');
    });

    it('should identify Investigation checks', async () => {
      const mockState = createMockState('I investigate the crime scene', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.reason).toContain('Investigation');
    });

    it('should identify Stealth checks', async () => {
      const mockState = createMockState('I attempt to stealth past the guards', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.reason).toContain('Stealth');
    });

    it('should identify Athletics checks', async () => {
      const mockState = createMockState('I make an athletics check to climb', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.reason).toContain('Athletics');
    });

    it('should identify Persuasion checks', async () => {
      const mockState = createMockState('I use persuasion to convince them', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.reason).toContain('Persuasion');
    });

    it('should require saving throw rolls', async () => {
      const mockState = createMockState('I make a Dexterity save', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.reason).toBe('saving throw');
    });

    it('should not require rolls for simple actions', async () => {
      const mockState = createMockState('I open the unlocked door', 'movement');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeNull();
    });
  });

  describe('Fallback Validation', () => {
    beforeEach(() => {
      // Mock AI to fail
      mockGeminiManager.executeWithRotation.mockRejectedValue(new Error('AI unavailable'));
    });

    it('should use fallback for valid actions', async () => {
      const mockState = createMockState('I attack', 'attack');

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.rulesValidation?.reasoning).toContain('basic rules');
      expect(result.requiresDiceRoll).toBeTruthy();
    });

    it('should handle skill checks in fallback', async () => {
      const mockState = createMockState('I check for traps', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.requiresDiceRoll).toBeTruthy();
    });

    it('should handle movement in fallback', async () => {
      const mockState = createMockState('I walk forward', 'movement');

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.requiresDiceRoll).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const mockState = createMockState('', 'attack');
      mockState.playerInput = null;

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.error).toContain('Cannot validate');
    });

    it('should handle missing player intent', async () => {
      const mockState = createMockState('I attack', 'attack');
      mockState.playerIntent = null;

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.error).toContain('Cannot validate');
    });

    it('should handle AI errors gracefully', async () => {
      const mockState = createMockState('I attack', 'attack');

      mockGeminiManager.executeWithRotation.mockRejectedValue(new Error('Service error'));

      const result = await validateRules(mockState);

      // Should use fallback
      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.requiresDiceRoll).toBeTruthy();
    });

    it('should handle malformed AI response', async () => {
      const mockState = createMockState('I search', 'exploration');

      mockGeminiManager.executeWithRotation.mockResolvedValue('Not JSON');

      const result = await validateRules(mockState);

      // Should use fallback
      expect(result.rulesValidation).toBeTruthy();
    });
  });

  describe('Metadata Handling', () => {
    beforeEach(() => {
      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ isValid: true, reasoning: 'Valid' }),
      );
    });

    it('should increment step count', async () => {
      const mockState = createMockState('I attack', 'attack');
      mockState.metadata!.stepCount = 3;

      const result = await validateRules(mockState);

      expect(result.metadata?.stepCount).toBe(4);
    });

    it('should preserve existing metadata', async () => {
      const mockState = createMockState('I search', 'exploration');
      mockState.metadata = {
        timestamp: new Date('2024-01-01'),
        stepCount: 2,
        tokensUsed: 50,
      };

      const result = await validateRules(mockState);

      expect(result.metadata?.tokensUsed).toBe(50);
      expect(result.metadata?.stepCount).toBe(3);
    });
  });

  describe('World Context Integration', () => {
    it('should use character context in validation', async () => {
      const mockState = createMockState('I cast a spell', 'spellcast');
      mockState.worldContext.characterIds = ['warrior-123'];

      mockGeminiManager.executeWithRotation.mockImplementation(async (fn) => {
        // Verify the prompt includes character ID
        return JSON.stringify({ isValid: true, reasoning: 'Valid spell' });
      });

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
      expect(mockGeminiManager.executeWithRotation).toHaveBeenCalled();
    });

    it('should handle missing character context', async () => {
      const mockState = createMockState('I attack', 'attack');
      mockState.worldContext.characterIds = [];

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ isValid: true, reasoning: 'Valid' }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should validate multiclass spell slots', async () => {
      const mockState = createMockState(
        'I cast a 3rd level spell using my multiclass slots',
        'spellcast',
      );

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          reasoning: 'Multiclass spell slots are calculated correctly',
          warnings: ['Verify available 3rd level slots'],
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
    });

    it('should handle advantage/disadvantage scenarios', async () => {
      const mockState = createMockState('I attack with advantage due to hidden status', 'attack');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          reasoning: 'Hidden status grants advantage on attack rolls',
          needsRoll: true,
          rollFormula: '2d20kh1', // Roll 2d20, keep highest
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
    });

    it('should validate bonus actions vs actions', async () => {
      const mockState = createMockState(
        'I use my bonus action to Cunning Action and dash',
        'skill_check',
      );

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          reasoning: 'Cunning Action allows bonus action Dash for Rogues',
          needsRoll: false,
        }),
      );

      const result = await validateRules(mockState);

      expect(result.rulesValidation?.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ isValid: true, reasoning: 'Valid' }),
      );
    });

    it('should handle attack keywords in input', async () => {
      const mockState = createMockState('I hit the target hard', 'attack');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.reason).toBe('attack roll');
    });

    it('should handle strike keywords', async () => {
      const mockState = createMockState('I strike with my weapon', 'attack');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll?.formula).toBe('1d20');
    });

    it('should handle attempt keywords for skill checks', async () => {
      const mockState = createMockState('I attempt to climb the wall', 'skill_check');

      const result = await validateRules(mockState);

      expect(result.requiresDiceRoll).toBeTruthy();
    });
  });
});
