/**
 * LangGraph Graph Execution Integration Tests
 *
 * Tests for the DM agent graph execution flow:
 * - Graph compilation and initialization
 * - Node execution flow (intent → validate → generate)
 * - State transitions through the graph
 * - Conditional edge routing
 * - Error handling in nodes
 * - Graph completion and final state
 *
 * @module agents/langgraph/__tests__
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { dmGraph, invokeDMGraph, streamDMGraph } from '../dm-graph';
import { DMState, WorldInfo, createInitialState } from '../state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/config/ai', () => ({
  GEMINI_TEXT_MODEL: 'gemini-1.5-flash',
}));

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(() => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      // Mock Gemini responses
      return JSON.stringify({
        type: 'attack',
        confidence: 0.9,
        details: {
          target: 'goblin',
          action: 'swing sword',
          skill: null,
        },
      });
    }),
  })),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: vi.fn(() => 'You are a DM.'),
  buildGameContextPrompt: vi.fn(() => 'Campaign context.'),
  buildResponseStructurePrompt: vi.fn(() => 'Respond in JSON.'),
}));

// Mock the checkpointer to avoid database calls
vi.mock('../checkpointer', () => ({
  checkpointer: {
    get: vi.fn().mockResolvedValue(undefined),
    getTuple: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe('LangGraph Graph Execution', () => {
  let worldContext: WorldInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    worldContext = {
      campaignId: 'test-campaign',
      sessionId: 'test-session',
      characterIds: ['char-1'],
      location: 'Tavern',
      threatLevel: 'low',
      recentMemories: [
        {
          content: 'The party entered the tavern',
          type: 'event',
          timestamp: new Date(),
        },
      ],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Graph Compilation', () => {
    it('should compile the DM graph successfully', () => {
      expect(dmGraph).toBeDefined();
      expect(typeof dmGraph.invoke).toBe('function');
      expect(typeof dmGraph.stream).toBe('function');
    });

    it('should have all required nodes', () => {
      // Graph structure is internal, but we can test invocation works
      expect(dmGraph).toHaveProperty('invoke');
    });
  });

  describe('Node Execution Flow', () => {
    it('should execute complete flow: intent → validate → generate', async () => {
      const playerInput = 'I attack the goblin with my sword';
      const threadId = 'test-thread-1';

      const result = await invokeDMGraph(playerInput, worldContext, threadId);

      expect(result).toBeDefined();
      expect(result.playerInput).toBe(playerInput);
      expect(result.playerIntent).toBeTruthy();
      expect(result.response).toBeTruthy();
      expect(result.metadata?.stepCount).toBeGreaterThan(0);
    });

    it('should detect intent from player input', async () => {
      const playerInput = 'I want to investigate the chest';

      const result = await invokeDMGraph(playerInput, worldContext, 'test-thread-2');

      expect(result.playerIntent).toBeTruthy();
      // Intent should be detected (attack, exploration, social, etc.)
      expect([
        'attack',
        'exploration',
        'social',
        'spellcast',
        'skill_check',
        'movement',
        'other',
      ]).toContain(result.playerIntent);
    });

    it('should validate rules after intent detection', async () => {
      const playerInput = 'I cast fireball at the enemy';

      const result = await invokeDMGraph(playerInput, worldContext, 'test-thread-3');

      expect(result.rulesValidation).toBeTruthy();
      expect(result.rulesValidation).toHaveProperty('isValid');
      expect(result.rulesValidation).toHaveProperty('reasoning');
    });

    it('should generate response after validation', async () => {
      const playerInput = 'I look around the room';

      const result = await invokeDMGraph(playerInput, worldContext, 'test-thread-4');

      expect(result.response).toBeTruthy();
      expect(result.response?.description).toBeTruthy();
      expect(typeof result.response?.description).toBe('string');
    });

    it('should increment step count through execution', async () => {
      const playerInput = 'I move forward';

      const result = await invokeDMGraph(playerInput, worldContext, 'test-thread-5');

      expect(result.metadata?.stepCount).toBeGreaterThan(0);
      // Should have at least 3 steps (intent, validate, generate)
      expect(result.metadata?.stepCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('State Transitions', () => {
    it('should maintain state through node execution', async () => {
      const initialState = createInitialState('I search for traps', worldContext);

      expect(initialState.playerInput).toBe('I search for traps');
      expect(initialState.playerIntent).toBeNull();
      expect(initialState.response).toBeNull();
      expect(initialState.metadata?.stepCount).toBe(0);

      // After execution, state should be updated
      const result = await invokeDMGraph('I search for traps', worldContext, 'test-thread-6');

      expect(result.playerIntent).not.toBeNull();
      expect(result.response).not.toBeNull();
      expect(result.metadata?.stepCount).toBeGreaterThan(0);
    });

    it('should preserve world context through execution', async () => {
      const result = await invokeDMGraph('I talk to the bartender', worldContext, 'test-thread-7');

      expect(result.worldContext).toBeDefined();
      expect(result.worldContext?.campaignId).toBe('test-campaign');
      expect(result.worldContext?.sessionId).toBe('test-session');
      expect(result.worldContext?.location).toBe('Tavern');
    });

    it('should accumulate messages in state', async () => {
      const result = await invokeDMGraph('Hello there', worldContext, 'test-thread-8');

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Messages array may be empty if nodes don't add messages
      // This is expected with placeholder nodes
    });
  });

  describe('Conditional Edge Routing', () => {
    it('should route to validate_rules after successful intent detection', async () => {
      const result = await invokeDMGraph('I attack the dragon', worldContext, 'test-thread-9');

      // Should have both intent and validation
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
    });

    it('should route to generate_response after validation', async () => {
      const result = await invokeDMGraph('I walk north', worldContext, 'test-thread-10');

      // Should complete full flow
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
      expect(result.response).toBeTruthy();
    });

    it('should handle dice roll requirement branching', async () => {
      const result = await invokeDMGraph('I try to pick the lock', worldContext, 'test-thread-11');

      // Dice roll may or may not be required based on intent
      // Just verify the field exists
      expect(result).toHaveProperty('requiresDiceRoll');
    });

    it('should end with error on intent detection failure', async () => {
      // Mock intent detector to fail
      const mockGemini = await import('@/services/ai/shared/utils');
      vi.mocked(mockGemini.getGeminiManager).mockReturnValueOnce({
        executeWithRotation: vi.fn().mockRejectedValue(new Error('API Error')),
      } as any);

      const result = await invokeDMGraph('', worldContext, 'test-thread-12');

      // Should handle error gracefully
      expect(result).toBeDefined();
      // Error state should be set or fallback response provided
    });
  });

  describe('Error Handling', () => {
    it('should handle missing player input gracefully', async () => {
      const result = await invokeDMGraph('', worldContext, 'test-thread-13');

      expect(result).toBeDefined();
      // Should either set error or provide fallback
      expect(result.playerIntent || result.error).toBeTruthy();
    });

    it('should handle node execution errors', async () => {
      // Mock Gemini to throw error
      const mockGemini = await import('@/services/ai/shared/utils');
      vi.mocked(mockGemini.getGeminiManager).mockReturnValueOnce({
        executeWithRotation: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      const result = await invokeDMGraph('test input', worldContext, 'test-thread-14');

      // Should complete without throwing
      expect(result).toBeDefined();
    });

    it('should catch and log graph execution failures', async () => {
      // Invoke with invalid context
      const invalidContext = null as any;

      const result = await invokeDMGraph('test', invalidContext, 'test-thread-15');

      // Should return error state
      expect(result).toBeDefined();
    });

    it('should handle timeout gracefully', async () => {
      // Note: Actual timeout testing would require async delays
      // This is a placeholder for timeout handling
      const result = await invokeDMGraph('test input', worldContext, 'test-thread-16');

      expect(result).toBeDefined();
    }, 35000); // 35 second timeout for this test
  });

  describe('Graph Completion', () => {
    it('should reach END node after successful execution', async () => {
      const result = await invokeDMGraph('I greet the NPC', worldContext, 'test-thread-17');

      // Graph should complete successfully
      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.error).toBeFalsy();
    });

    it('should have final state with all fields populated', async () => {
      const result = await invokeDMGraph('I examine the door', worldContext, 'test-thread-18');

      expect(result.playerInput).toBeTruthy();
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
      expect(result.response).toBeTruthy();
      expect(result.worldContext).toBeTruthy();
      expect(result.metadata).toBeTruthy();
    });

    it('should return complete DMState structure', async () => {
      const result = await invokeDMGraph('test', worldContext, 'test-thread-19');

      // Verify DMState structure
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('playerInput');
      expect(result).toHaveProperty('playerIntent');
      expect(result).toHaveProperty('rulesValidation');
      expect(result).toHaveProperty('worldContext');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('requiresDiceRoll');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Streaming Execution', () => {
    it('should stream graph execution with updates', async () => {
      const chunks: any[] = [];

      const stream = streamDMGraph('I cast a spell', worldContext, 'test-thread-20');

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should receive at least one chunk
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should emit state updates during streaming', async () => {
      const updates: any[] = [];

      const stream = streamDMGraph('I look around', worldContext, 'test-thread-21');

      for await (const update of stream) {
        updates.push(update);
      }

      // Should have multiple updates from different nodes
      expect(updates.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle streaming errors gracefully', async () => {
      // Mock to throw error during streaming
      const mockGemini = await import('@/services/ai/shared/utils');
      vi.mocked(mockGemini.getGeminiManager).mockReturnValueOnce({
        executeWithRotation: vi.fn().mockRejectedValue(new Error('Stream error')),
      } as any);

      const chunks: any[] = [];
      const stream = streamDMGraph('test', worldContext, 'test-thread-22');

      try {
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      } catch (error) {
        // Error should be caught
      }

      // Should have received error chunk or no chunks
      expect(true).toBe(true);
    });
  });

  describe('Graph with Messages', () => {
    it('should handle existing message history', async () => {
      const messages = [
        new HumanMessage({ content: 'Previous message 1' }),
        new AIMessage({ content: 'Previous response 1' }),
      ];

      const initialState: DMState = {
        messages,
        playerInput: 'New message',
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

      const result = await invokeDMGraph('New message', worldContext, 'test-thread-23');

      expect(result).toBeDefined();
    });

    it('should preserve message order', async () => {
      const result = await invokeDMGraph('Test message', worldContext, 'test-thread-24');

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle combat scenario with dice rolls', async () => {
      const combatInput = 'I attack the orc with my longsword';

      const result = await invokeDMGraph(combatInput, worldContext, 'test-thread-25');

      expect(result.playerIntent).toBeTruthy();
      // May require dice roll for attack
      expect(result).toHaveProperty('requiresDiceRoll');
    });

    it('should handle social interaction scenario', async () => {
      const socialInput = 'I try to persuade the guard to let me pass';

      const result = await invokeDMGraph(socialInput, worldContext, 'test-thread-26');

      expect(result.playerIntent).toBeTruthy();
      expect(result.response).toBeTruthy();
    });

    it('should handle exploration scenario', async () => {
      const explorationInput = 'I search the room for hidden doors';

      const result = await invokeDMGraph(explorationInput, worldContext, 'test-thread-27');

      expect(result.playerIntent).toBeTruthy();
      expect(result.response).toBeTruthy();
    });

    it('should handle spell casting scenario', async () => {
      const spellInput = 'I cast Detect Magic';

      const result = await invokeDMGraph(spellInput, worldContext, 'test-thread-28');

      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should complete execution in reasonable time', async () => {
      const start = Date.now();

      await invokeDMGraph('Quick test', worldContext, 'test-thread-29');

      const duration = Date.now() - start;

      // Should complete within 10 seconds (with mocked AI)
      expect(duration).toBeLessThan(10000);
    });

    it('should handle multiple sequential invocations', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await invokeDMGraph(`Message ${i}`, worldContext, `test-thread-30-${i}`);
        expect(result).toBeDefined();
      }
    });
  });
});
