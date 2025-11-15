/**
 * Unit Tests for Intent Detector Node
 *
 * Tests the intent detection functionality with various player inputs.
 *
 * @module agents/langgraph/nodes/__tests__/intent-detector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectIntent } from '../intent-detector';
import type { DMState } from '../../state';
import * as geminiUtils from '@/services/ai/shared/utils';

// Mock the Gemini manager
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(),
}));

// Mock logger to avoid console output during tests
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Intent Detector Node', () => {
  let mockGeminiManager: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockGeminiManager = {
      executeWithRotation: vi.fn(),
    };
    vi.mocked(geminiUtils.getGeminiManager).mockReturnValue(mockGeminiManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockState = (playerInput: string): DMState => ({
    messages: [],
    playerInput,
    playerIntent: null,
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

  describe('Intent Detection with AI', () => {
    it('should detect attack intent from AI response', async () => {
      const mockState = createMockState('I attack the goblin with my sword');

      // Mock AI response
      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'attack',
          confidence: 0.95,
          details: {
            target: 'goblin',
            action: 'attack with sword',
            skill: null,
          },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('attack');
      expect(result.metadata?.stepCount).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should detect social intent from AI response', async () => {
      const mockState = createMockState('I try to persuade the guard to let us pass');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'social',
          confidence: 0.92,
          details: {
            target: 'guard',
            action: 'persuade',
            skill: 'Persuasion',
          },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('social');
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should detect exploration intent from AI response', async () => {
      const mockState = createMockState('I search the room for hidden doors');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'exploration',
          confidence: 0.88,
          details: {
            target: 'room',
            action: 'search for hidden doors',
            skill: 'Investigation',
          },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('exploration');
    });

    it('should detect spellcast intent from AI response', async () => {
      const mockState = createMockState('I cast Healing Word on the wounded fighter');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'spellcast',
          confidence: 0.97,
          details: {
            target: 'fighter',
            action: 'cast Healing Word',
            skill: null,
          },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('spellcast');
    });

    it('should handle JSON embedded in text response', async () => {
      const mockState = createMockState('I move forward cautiously');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        'Based on the player input, here is my analysis: {"type": "movement", "confidence": 0.85, "details": {"target": null, "action": "move forward", "skill": null}}',
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('movement');
    });
  });

  describe('Fallback Intent Detection', () => {
    beforeEach(() => {
      // Mock AI to return invalid response
      mockGeminiManager.executeWithRotation.mockResolvedValue('Invalid response');
    });

    it('should use fallback for attack keywords', async () => {
      const mockState = createMockState('I strike the orc with my axe');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('attack');
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should use fallback for social keywords', async () => {
      const mockState = createMockState('I speak to the merchant about prices');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('social');
    });

    it('should use fallback for exploration keywords', async () => {
      const mockState = createMockState('I investigate the strange markings on the wall');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('exploration');
    });

    it('should use fallback for spellcast keywords', async () => {
      const mockState = createMockState('I cast Fireball at the enemy group');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('spellcast');
    });

    it('should use fallback for movement keywords', async () => {
      const mockState = createMockState('I walk towards the door');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('movement');
    });

    it('should default to "other" for unknown actions', async () => {
      const mockState = createMockState('I contemplate the meaning of existence');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('other');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const mockState = createMockState('');
      mockState.playerInput = null;

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('other');
      expect(result.error).toBe('No player input provided');
    });

    it('should handle AI service errors gracefully', async () => {
      const mockState = createMockState('I attack the dragon');

      mockGeminiManager.executeWithRotation.mockRejectedValue(new Error('AI service unavailable'));

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('attack'); // Should use fallback
      expect(result.error).toContain('AI service unavailable');
    });

    it('should handle malformed JSON from AI', async () => {
      const mockState = createMockState('I search for traps');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        '{"type": "exploration", invalid json}',
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('exploration'); // Should use fallback
    });

    it('should handle JSON without required fields', async () => {
      const mockState = createMockState('I talk to the innkeeper');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          // Missing 'type' and 'confidence'
          details: { target: 'innkeeper' },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('social'); // Should use fallback
    });
  });

  describe('Metadata Handling', () => {
    it('should increment step count', async () => {
      const mockState = createMockState('I ready my weapon');
      mockState.metadata!.stepCount = 5;

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ type: 'other', confidence: 0.5, details: {} }),
      );

      const result = await detectIntent(mockState);

      expect(result.metadata?.stepCount).toBe(6);
    });

    it('should preserve existing metadata', async () => {
      const mockState = createMockState('I look around');
      mockState.metadata = {
        timestamp: new Date('2024-01-01'),
        stepCount: 3,
        tokensUsed: 100,
      };

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ type: 'exploration', confidence: 0.9, details: {} }),
      );

      const result = await detectIntent(mockState);

      expect(result.metadata?.tokensUsed).toBe(100);
      expect(result.metadata?.stepCount).toBe(4);
    });
  });

  describe('Complex Input Scenarios', () => {
    it('should handle multi-action input', async () => {
      const mockState = createMockState('I draw my sword and attack the nearest enemy');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'attack',
          confidence: 0.93,
          details: { target: 'nearest enemy', action: 'attack', skill: null },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('attack');
    });

    it('should handle conditional actions', async () => {
      const mockState = createMockState(
        'If the door is locked, I try to pick it. Otherwise I open it.',
      );

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'skill_check',
          confidence: 0.78,
          details: { target: 'door', action: 'pick lock', skill: 'Sleight of Hand' },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('skill_check');
    });

    it('should handle roleplay-heavy input', async () => {
      const mockState = createMockState(
        'With a flourish of my cape, I address the crowd: "Good people of Waterdeep, lend me your ears!"',
      );

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          type: 'social',
          confidence: 0.96,
          details: { target: 'crowd', action: 'address', skill: 'Performance' },
        }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('social');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string input', async () => {
      const mockState = createMockState('');

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('other');
      expect(result.error).toBe('No player input provided');
    });

    it('should handle very long input', async () => {
      const longInput = 'I ' + 'really '.repeat(100) + 'want to attack';
      const mockState = createMockState(longInput);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ type: 'attack', confidence: 0.9, details: {} }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('attack');
    });

    it('should handle special characters in input', async () => {
      const mockState = createMockState('I say "Hey! @#$% you!" to the guard');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({ type: 'social', confidence: 0.85, details: {} }),
      );

      const result = await detectIntent(mockState);

      expect(result.playerIntent).toBe('social');
    });
  });
});
