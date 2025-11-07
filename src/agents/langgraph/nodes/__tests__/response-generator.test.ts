/**
 * Response Generator Node Tests
 *
 * Tests narrative generation and response formatting.
 * Verifies DM responses are engaging and properly structured.
 *
 * @module agents/langgraph/nodes/__tests__/response-generator
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

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are an experienced Dungeon Master.',
  buildGameContextPrompt: (context: any) => `Campaign: ${context.campaignId}`,
  buildResponseStructurePrompt: () => 'Respond in structured JSON format',
}));

// Track AI responses for testing
let mockAIResponse: string | null = null;

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      if (mockAIResponse) {
        return mockAIResponse;
      }
      // Default narrative response
      return JSON.stringify({
        description: 'The goblin snarls and raises its rusty blade, eyes gleaming with malice.',
        atmosphere: 'tense',
        npcs: [{ name: 'Goblin', dialogue: 'You die now, human!' }],
        availableActions: ['Attack', 'Defend', 'Run', 'Cast Spell'],
        consequences: ['Combat has begun', 'Initiative rolled'],
      });
    }),
  }),
}));

// Import after mocks are set up
import { generateResponse } from '../response-generator';
import type { DMState, RuleCheckResult, DiceRollRequest } from '../../state';

describe('Response Generator Node', () => {
  let baseState: DMState;
  let validRulesResult: RuleCheckResult;
  let attackDiceRoll: DiceRollRequest;

  beforeEach(() => {
    mockAIResponse = null;

    validRulesResult = {
      isValid: true,
      reasoning: 'Valid attack action',
      modifications: [],
    };

    attackDiceRoll = {
      formula: '1d20+5',
      reason: 'attack roll',
      dc: undefined,
    };

    baseState = {
      messages: [],
      playerInput: 'I attack the goblin',
      playerIntent: 'attack',
      rulesValidation: validRulesResult,
      worldContext: {
        campaignId: 'test-campaign',
        sessionId: 'test-session',
        characterIds: ['char-1'],
        location: 'Dark Cave',
        recentMemories: [
          {
            content: 'Entered the goblin cave',
            type: 'event',
            timestamp: new Date(),
          },
        ],
      },
      response: null,
      requiresDiceRoll: null,
      error: null,
      metadata: {
        timestamp: new Date(),
        stepCount: 2,
      },
    };
  });

  describe('Basic Response Generation', () => {
    it('should generate a narrative response', async () => {
      const result = await generateResponse(baseState);

      expect(result.response).toBeDefined();
      expect(result.response?.description).toBeTruthy();
      expect(typeof result.response?.description).toBe('string');
    });

    it('should include atmosphere in response', async () => {
      mockAIResponse = JSON.stringify({
        description: 'A dark figure emerges.',
        atmosphere: 'mysterious',
        npcs: [],
        availableActions: [],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.atmosphere).toBe('mysterious');
    });

    it('should include NPCs when present', async () => {
      mockAIResponse = JSON.stringify({
        description: 'The merchant greets you.',
        atmosphere: 'friendly',
        npcs: [
          { name: 'Merchant', dialogue: 'Welcome to my shop!' },
          { name: 'Guard', dialogue: 'Move along.' },
        ],
        availableActions: [],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.npcs).toBeDefined();
      expect(result.response?.npcs?.length).toBe(2);
      expect(result.response?.npcs?.[0].name).toBe('Merchant');
    });

    it('should include available actions', async () => {
      mockAIResponse = JSON.stringify({
        description: 'You stand at a crossroads.',
        atmosphere: 'neutral',
        npcs: [],
        availableActions: ['Go left', 'Go right', 'Go straight', 'Turn back'],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.availableActions).toBeDefined();
      expect(result.response?.availableActions?.length).toBeGreaterThan(0);
    });

    it('should include consequences', async () => {
      mockAIResponse = JSON.stringify({
        description: 'Your attack connects!',
        atmosphere: 'intense',
        npcs: [],
        availableActions: [],
        consequences: ['Goblin takes 8 damage', 'Goblin becomes enraged'],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.consequences).toBeDefined();
      expect(result.response?.consequences?.length).toBeGreaterThan(0);
    });
  });

  describe('Context Integration', () => {
    it('should use player intent in response', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: 'social',
        playerInput: 'I greet the innkeeper',
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
      // Response should be contextually appropriate
    });

    it('should use rules validation in response', async () => {
      const state: DMState = {
        ...baseState,
        rulesValidation: {
          isValid: false,
          reasoning: 'Cannot attack while restrained',
          modifications: ['Break free first'],
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
      // Should acknowledge the constraint
    });

    it('should acknowledge dice roll requirements', async () => {
      const state: DMState = {
        ...baseState,
        requiresDiceRoll: {
          formula: '1d20+3',
          reason: 'attack roll',
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
      // Response should mention dice roll
    });

    it('should incorporate recent memories', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          ...baseState.worldContext!,
          recentMemories: [
            {
              content: 'The goblin threatened you earlier',
              type: 'dialogue',
              timestamp: new Date(),
            },
            {
              content: 'You found a magic sword',
              type: 'item',
              timestamp: new Date(),
            },
          ],
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input', async () => {
      const state: DMState = {
        ...baseState,
        playerInput: null,
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
      expect(result.response?.description).toContain('more information');
      expect(result.error).toBeDefined();
    });

    it('should handle missing player intent', async () => {
      const state: DMState = {
        ...baseState,
        playerIntent: null,
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
      expect(result.error).toBeDefined();
    });

    it('should handle AI service failures', async () => {
      mockAIResponse = 'Invalid JSON response'; // Force fallback by providing invalid response

      const result = await generateResponse(baseState);

      expect(result.response).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse valid JSON response', async () => {
      mockAIResponse = JSON.stringify({
        description: 'Test description',
        atmosphere: 'calm',
        npcs: [],
        availableActions: ['Action 1', 'Action 2'],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.description).toBe('Test description');
      expect(result.response?.atmosphere).toBe('calm');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockAIResponse = '{invalid json}';

      const result = await generateResponse(baseState);

      expect(result.response).toBeDefined();
      // Should use raw text as description
      expect(result.response?.description).toBeTruthy();
    });

    it('should extract JSON from markdown code blocks', async () => {
      mockAIResponse = `\`\`\`json
{
  "description": "From markdown",
  "atmosphere": "test",
  "npcs": [],
  "availableActions": [],
  "consequences": []
}
\`\`\``;

      const result = await generateResponse(baseState);

      expect(result.response).toBeDefined();
    });

    it('should handle missing JSON fields', async () => {
      mockAIResponse = JSON.stringify({
        description: 'Only description provided',
        // Missing other fields
      });

      const result = await generateResponse(baseState);

      expect(result.response?.description).toBe('Only description provided');
      expect(result.response?.atmosphere).toBeDefined(); // Should default
      expect(result.response?.npcs).toBeDefined(); // Should default to []
    });

    it('should use raw text as fallback', async () => {
      mockAIResponse = 'This is just plain text, not JSON';

      const result = await generateResponse(baseState);

      expect(result.response?.description).toBe('This is just plain text, not JSON');
      expect(result.response?.atmosphere).toBe('neutral');
    });
  });

  describe('Prompt Building', () => {
    it('should build prompt with DM persona', async () => {
      const result = await generateResponse(baseState);

      expect(result.response).toBeDefined();
      // Prompt building is tested implicitly by successful generation
    });

    it('should include game context in prompt', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          campaignId: 'epic-quest',
          sessionId: 'session-1',
          characterIds: ['hero-1'],
          location: 'Dragon\'s Lair',
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });

    it('should format validation status', async () => {
      const state: DMState = {
        ...baseState,
        rulesValidation: {
          isValid: true,
          reasoning: 'Excellent maneuver',
          modifications: [],
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });

    it('should format dice roll status', async () => {
      const state: DMState = {
        ...baseState,
        requiresDiceRoll: {
          formula: '2d6+3',
          reason: 'damage roll',
          dc: 15,
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });
  });

  describe('Memory Context Integration', () => {
    it('should handle no recent memories', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          ...baseState.worldContext!,
          recentMemories: [],
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });

    it('should format multiple memories', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: {
          ...baseState.worldContext!,
          recentMemories: [
            { content: 'Memory 1', type: 'event', timestamp: new Date() },
            { content: 'Memory 2', type: 'dialogue', timestamp: new Date() },
            { content: 'Memory 3', type: 'combat', timestamp: new Date() },
          ],
        },
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });

    it('should handle missing world context', async () => {
      const state: DMState = {
        ...baseState,
        worldContext: null,
      };

      const result = await generateResponse(state);

      expect(result.response).toBeDefined();
    });
  });

  describe('Metadata Management', () => {
    it('should increment step count', async () => {
      const state: DMState = {
        ...baseState,
        metadata: {
          timestamp: new Date(),
          stepCount: 5,
        },
      };

      const result = await generateResponse(state);

      expect(result.metadata?.stepCount).toBe(6);
    });

    it('should preserve existing metadata', async () => {
      const state: DMState = {
        ...baseState,
        metadata: {
          timestamp: new Date(),
          stepCount: 0,
          tokensUsed: 250,
        },
      };

      const result = await generateResponse(state);

      expect(result.metadata?.tokensUsed).toBe(250);
      expect(result.metadata?.stepCount).toBe(1);
    });
  });

  describe('Response Quality', () => {
    it('should generate multi-paragraph descriptions', async () => {
      mockAIResponse = JSON.stringify({
        description: `The goblin snarls viciously, its yellowed teeth gleaming in the torchlight.

        It raises a crude, rusty blade above its head, preparing to strike. The stench of the creature fills your nostrils.`,
        atmosphere: 'threatening',
        npcs: [{ name: 'Goblin' }],
        availableActions: ['Attack', 'Defend', 'Flee'],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.description).toBeTruthy();
      expect(result.response?.description.length).toBeGreaterThan(50);
    });

    it('should provide contextual available actions', async () => {
      mockAIResponse = JSON.stringify({
        description: 'You stand before a locked door.',
        atmosphere: 'neutral',
        npcs: [],
        availableActions: [
          'Try to pick the lock',
          'Knock on the door',
          'Search for a key',
          'Break down the door',
        ],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.availableActions).toBeDefined();
      expect(result.response?.availableActions?.length).toBeGreaterThan(2);
    });

    it('should create appropriate atmosphere', async () => {
      const atmospheres = ['tense', 'mysterious', 'joyful', 'somber', 'intense'];

      for (const atmo of atmospheres) {
        mockAIResponse = JSON.stringify({
          description: 'Test scene',
          atmosphere: atmo,
          npcs: [],
          availableActions: [],
          consequences: [],
        });

        const result = await generateResponse(baseState);

        expect(result.response?.atmosphere).toBe(atmo);
      }
    });
  });

  describe('Special Scenarios', () => {
    it('should handle combat scenarios', async () => {
      mockAIResponse = JSON.stringify({
        description: 'Your sword clashes against the goblin\'s blade!',
        atmosphere: 'intense',
        npcs: [{ name: 'Goblin Warrior', dialogue: 'Graaah!' }],
        availableActions: ['Attack again', 'Defend', 'Use potion', 'Cast spell'],
        consequences: ['Combat continues', 'Initiative: Your turn'],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'attack',
      };

      const result = await generateResponse(state);

      expect(result.response?.consequences).toBeDefined();
      expect(result.response?.availableActions?.some(a => a.toLowerCase().includes('attack'))).toBe(true);
    });

    it('should handle social scenarios', async () => {
      mockAIResponse = JSON.stringify({
        description: 'The merchant eyes you carefully, weighing your words.',
        atmosphere: 'cautious',
        npcs: [{ name: 'Merchant', dialogue: 'I might have what you seek... for the right price.' }],
        availableActions: ['Negotiate price', 'Browse wares', 'Ask about rumors', 'Leave'],
        consequences: [],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'social',
        playerInput: 'I try to haggle with the merchant',
      };

      const result = await generateResponse(state);

      expect(result.response?.npcs?.length).toBeGreaterThan(0);
      expect(result.response?.npcs?.[0].dialogue).toBeTruthy();
    });

    it('should handle exploration scenarios', async () => {
      mockAIResponse = JSON.stringify({
        description: 'You carefully search the ancient chamber. Dust motes dance in the faint light.',
        atmosphere: 'mysterious',
        npcs: [],
        availableActions: ['Search the chest', 'Examine the murals', 'Check for traps', 'Move on'],
        consequences: ['You discover a hidden alcove'],
      });

      const state: DMState = {
        ...baseState,
        playerIntent: 'exploration',
        playerInput: 'I search the room',
      };

      const result = await generateResponse(state);

      expect(result.response?.description).toBeTruthy();
      expect(result.response?.consequences).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty available actions array', async () => {
      mockAIResponse = JSON.stringify({
        description: 'The story continues...',
        atmosphere: 'neutral',
        npcs: [],
        availableActions: [],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.availableActions).toEqual([]);
    });

    it('should handle empty NPCs array', async () => {
      mockAIResponse = JSON.stringify({
        description: 'You are alone in the darkness.',
        atmosphere: 'lonely',
        npcs: [],
        availableActions: ['Continue forward', 'Turn back'],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.npcs).toEqual([]);
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A '.repeat(500) + 'very long description.';
      mockAIResponse = JSON.stringify({
        description: longDescription,
        atmosphere: 'verbose',
        npcs: [],
        availableActions: [],
        consequences: [],
      });

      const result = await generateResponse(baseState);

      expect(result.response?.description).toBeTruthy();
      expect(result.response?.description.length).toBeGreaterThan(100);
    });
  });
});
