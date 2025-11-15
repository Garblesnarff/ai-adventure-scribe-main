/**
 * Unit Tests for Response Generator Node
 *
 * Tests DM narrative response generation with various scenarios.
 *
 * @module agents/langgraph/nodes/__tests__/response-generator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateResponse } from '../response-generator';
import type { DMState, RuleCheckResult, DiceRollRequest } from '../../state';
import * as geminiUtils from '@/services/ai/shared/utils';

// Mock dependencies
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are an experienced DM',
  buildGameContextPrompt: () => 'Campaign context',
  buildResponseStructurePrompt: () => 'Response structure',
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Response Generator Node', () => {
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

  const createMockState = (
    playerInput: string,
    playerIntent: string,
    rulesValidation?: RuleCheckResult,
    requiresDiceRoll?: DiceRollRequest,
  ): DMState => ({
    messages: [],
    playerInput,
    playerIntent,
    rulesValidation: rulesValidation || null,
    worldContext: {
      campaignId: 'test-campaign',
      sessionId: 'test-session',
      characterIds: ['test-character'],
      recentMemories: [
        {
          content: 'You entered a dark tavern',
          type: 'event',
          timestamp: new Date(),
        },
        {
          content: 'A hooded figure watches from the corner',
          type: 'npc',
          timestamp: new Date(),
        },
      ],
    },
    response: null,
    requiresDiceRoll: requiresDiceRoll || null,
    error: null,
    metadata: {
      timestamp: new Date(),
      stepCount: 2,
    },
  });

  describe('Narrative Response Generation', () => {
    it('should generate combat narrative for attack action', async () => {
      const validation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid attack action',
        modifications: [],
      };

      const diceRoll: DiceRollRequest = {
        formula: '1d20+5',
        reason: 'attack roll',
      };

      const mockState = createMockState('I attack the goblin', 'attack', validation, diceRoll);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You swing your blade at the goblin. The creature snarls and raises its rusty shield to defend itself. Roll your attack!',
          atmosphere: 'tense and dangerous',
          npcs: [{ name: 'Goblin', dialogue: '*snarl* You die now, human!' }],
          availableActions: ['Attack again', 'Defend', 'Move to cover'],
          consequences: ['Goblin is now aware of you', 'Combat has begun'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
      expect(result.response?.description).toContain('attack');
      expect(result.response?.atmosphere).toBe('tense and dangerous');
      expect(result.response?.npcs?.length).toBeGreaterThan(0);
      expect(result.response?.availableActions?.length).toBeGreaterThan(0);
      expect(result.metadata?.stepCount).toBe(3);
    });

    it('should generate social narrative for persuasion', async () => {
      const validation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid persuasion attempt',
        modifications: [],
      };

      const mockState = createMockState('I try to persuade the guard', 'social', validation);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You approach the guard with a friendly smile and begin to make your case. The guard eyes you suspiciously but seems willing to listen.',
          atmosphere: 'cautiously hopeful',
          npcs: [
            {
              name: 'City Guard',
              dialogue: "Alright, I'm listening. But make it quick.",
            },
          ],
          availableActions: ['Present your case', 'Offer a bribe', 'Show credentials'],
          consequences: ['Guard is willing to negotiate'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('guard');
      expect(result.response?.npcs?.[0]?.name).toBe('City Guard');
      expect(result.response?.atmosphere).toBe('cautiously hopeful');
    });

    it('should generate exploration narrative', async () => {
      const validation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid exploration action',
        modifications: [],
      };

      const mockState = createMockState('I search the room', 'exploration', validation);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You carefully examine the room, running your hands along the stone walls. Dust particles dance in the dim light filtering through the cracked windows.',
          atmosphere: 'mysterious and quiet',
          npcs: [],
          availableActions: [
            'Examine the bookshelf',
            'Check behind the tapestry',
            'Investigate the fireplace',
          ],
          consequences: ['You notice strange markings on the floor'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('room');
      expect(result.response?.atmosphere).toBe('mysterious and quiet');
      expect(result.response?.availableActions?.length).toBe(3);
    });

    it('should generate spellcasting narrative', async () => {
      const validation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid spell',
        modifications: [],
      };

      const mockState = createMockState('I cast Healing Word', 'spellcast', validation);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You speak the words of power, and a warm golden light emanates from your outstretched hand, flowing toward your wounded companion. You feel the divine energy channel through you.',
          atmosphere: 'hopeful and magical',
          npcs: [],
          availableActions: ['Continue fighting', 'Cast another spell', 'Move to safety'],
          consequences: ['Spell slot consumed', 'Ally regains hit points'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('spell');
      expect(result.response?.consequences).toContain('Spell slot consumed');
    });
  });

  describe('Memory Integration', () => {
    it('should incorporate recent memories into narrative', async () => {
      const mockState = createMockState('I look around', 'exploration');

      mockGeminiManager.executeWithRotation.mockImplementation(async (callback: any) => {
        return JSON.stringify({
          description:
            'You recall entering the dark tavern and spot the hooded figure still watching.',
          atmosphere: 'tense',
          npcs: [],
          availableActions: [],
          consequences: [],
        });
      });

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
      // Verify that the generator was called with memories
      expect(mockGeminiManager.executeWithRotation).toHaveBeenCalled();
    });

    it('should handle empty memories gracefully', async () => {
      const mockState = createMockState('I investigate', 'exploration');
      mockState.worldContext.recentMemories = [];

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'You begin your investigation.',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
      expect(result.error).toBeUndefined();
    });
  });

  describe('Validation Integration', () => {
    it('should include validation results in narrative', async () => {
      const validation: RuleCheckResult = {
        isValid: false,
        reasoning: 'You cannot cast that spell without a spell slot',
        modifications: ['Use a different spell', 'Take a short rest'],
      };

      const mockState = createMockState('I cast Fireball', 'spellcast', validation);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You begin to channel the arcane energy, but realize you have no spell slots remaining. The magic fizzles before it can take form.',
          atmosphere: 'disappointed',
          npcs: [],
          availableActions: ['Use a cantrip', 'Take a short rest', 'Use an item'],
          consequences: ['No spell cast'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toBeTruthy();
    });

    it('should handle dice roll requirements in narrative', async () => {
      const validation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid attack',
        modifications: [],
      };

      const diceRoll: DiceRollRequest = {
        formula: '1d20+5',
        reason: 'attack roll',
        dc: 15,
      };

      const mockState = createMockState('I attack', 'attack', validation, diceRoll);

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'You ready your weapon for the strike. Roll to hit!',
          atmosphere: 'tense',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
      // Verify the prompt included dice roll info
      expect(mockGeminiManager.executeWithRotation).toHaveBeenCalled();
    });
  });

  describe('Fallback Handling', () => {
    it('should handle non-JSON AI response', async () => {
      const mockState = createMockState('I look around', 'exploration');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        'You see a dimly lit room with cobwebs in the corners.',
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('dimly lit room');
      expect(result.response?.atmosphere).toBe('neutral');
      expect(result.response?.npcs).toEqual([]);
    });

    it('should extract JSON from mixed response', async () => {
      const mockState = createMockState('I talk to NPC', 'social');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        'Here is the response: {"description": "The NPC greets you warmly.", "atmosphere": "friendly", "npcs": [], "availableActions": [], "consequences": []}',
      );

      const result = await generateResponse(mockState);

      expect(result.response?.description).toBe('The NPC greets you warmly.');
      expect(result.response?.atmosphere).toBe('friendly');
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockState = createMockState('I do something', 'other');

      mockGeminiManager.executeWithRotation.mockResolvedValue('{invalid json content');

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('invalid json');
      expect(result.response?.atmosphere).toBe('neutral');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const mockState = createMockState('', 'attack');
      mockState.playerInput = null;

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('need more information');
      expect(result.error).toBe('Missing player input or intent');
    });

    it('should handle missing player intent', async () => {
      const mockState = createMockState('I attack', 'attack');
      mockState.playerIntent = null;

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('need more information');
      expect(result.error).toBe('Missing player input or intent');
    });

    it('should handle AI service errors', async () => {
      const mockState = createMockState('I attack', 'attack');

      mockGeminiManager.executeWithRotation.mockRejectedValue(new Error('AI service down'));

      const result = await generateResponse(mockState);

      expect(result.response?.description).toContain('error');
      expect(result.error).toContain('AI service down');
    });

    it('should handle null AI response gracefully', async () => {
      const mockState = createMockState('I search', 'exploration');

      mockGeminiManager.executeWithRotation.mockResolvedValue('');

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
    });
  });

  describe('Metadata Handling', () => {
    beforeEach(() => {
      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'Test response',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );
    });

    it('should increment step count', async () => {
      const mockState = createMockState('I do something', 'other');
      mockState.metadata!.stepCount = 5;

      const result = await generateResponse(mockState);

      expect(result.metadata?.stepCount).toBe(6);
    });

    it('should preserve existing metadata', async () => {
      const mockState = createMockState('I attack', 'attack');
      mockState.metadata = {
        timestamp: new Date('2024-01-01'),
        stepCount: 3,
        tokensUsed: 150,
      };

      const result = await generateResponse(mockState);

      expect(result.metadata?.tokensUsed).toBe(150);
      expect(result.metadata?.stepCount).toBe(4);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-NPC interactions', async () => {
      const mockState = createMockState('I address the council', 'social');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You stand before the council of elders, each watching you with varying degrees of interest.',
          atmosphere: 'formal and tense',
          npcs: [
            { name: 'Elder Theron', dialogue: 'Speak your peace, traveler.' },
            { name: 'Elder Mira', dialogue: '*nods silently*' },
            { name: 'Elder Kain', dialogue: 'Make it quick.' },
          ],
          availableActions: ['Present your case', 'Show evidence', 'Appeal to emotion'],
          consequences: ['All council members are now paying attention'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.npcs?.length).toBe(3);
      expect(result.response?.npcs?.[0]?.name).toBe('Elder Theron');
    });

    it('should generate atmospheric descriptions', async () => {
      const mockState = createMockState('I enter the ancient tomb', 'exploration');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'The air grows cold as you step into the tomb. Ancient hieroglyphs line the walls, and the smell of decay fills your nostrils. Your torch barely pierces the oppressive darkness ahead.',
          atmosphere: 'ominous and foreboding',
          npcs: [],
          availableActions: ['Examine the hieroglyphs', 'Proceed deeper', 'Turn back'],
          consequences: ['You have entered the tomb', 'No turning back now'],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.atmosphere).toBe('ominous and foreboding');
      expect(result.response?.description).toContain('cold');
      expect(result.response?.description).toContain('darkness');
    });

    it('should provide meaningful consequences', async () => {
      const mockState = createMockState('I break down the door', 'attack');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description:
            'You charge at the door with all your might. The wood splinters and the door crashes inward with a deafening crash.',
          atmosphere: 'loud and chaotic',
          npcs: [],
          availableActions: ['Rush inside', 'Wait and listen', 'Take cover'],
          consequences: [
            'The door is destroyed',
            'Everyone in the building heard that',
            'Surprise is no longer possible',
          ],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response?.consequences?.length).toBeGreaterThan(0);
      expect(result.response?.consequences).toContain('Surprise is no longer possible');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long player input', async () => {
      const longInput =
        'I carefully and methodically ' + 'search every nook and cranny '.repeat(20);
      const mockState = createMockState(longInput, 'exploration');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'Your thorough search reveals hidden details.',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
    });

    it('should handle special characters in input', async () => {
      const mockState = createMockState('I shout "Hey! @#$%!"', 'social');

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'Your outburst echoes through the hall.',
          atmosphere: 'chaotic',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
    });

    it('should handle missing world context fields', async () => {
      const mockState = createMockState('I look around', 'exploration');
      mockState.worldContext.characterIds = [];

      mockGeminiManager.executeWithRotation.mockResolvedValue(
        JSON.stringify({
          description: 'You survey your surroundings.',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        }),
      );

      const result = await generateResponse(mockState);

      expect(result.response).toBeTruthy();
      expect(result.error).toBeUndefined();
    });
  });
});
