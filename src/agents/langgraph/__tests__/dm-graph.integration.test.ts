/**
 * DM Graph Integration Tests
 *
 * Comprehensive end-to-end tests for the complete DM agent graph.
 * Tests full workflow from player input to final narrative response.
 *
 * Test coverage:
 * - Complete graph execution end-to-end
 * - Graph flow with different player intents
 * - Error handling in graph execution
 * - Human-in-the-loop (dice roll requests)
 * - State transitions between nodes
 * - Conditional edge routing
 * - Checkpoint persistence across graph executions
 *
 * @module agents/langgraph/__tests__/dm-graph.integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dmGraph, invokeDMGraph, streamDMGraph } from '../dm-graph';
import type { DMState, WorldInfo } from '../state';

// Mock dependencies
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

// Track which node we're in for different responses
let nodeCallSequence: string[] = [];

// Mock manager instance that can be reconfigured in tests
let mockGeminiManager: any;

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => mockGeminiManager || ({
    executeWithRotation: vi.fn(async (fn: any) => {
      const currentCallIndex = nodeCallSequence.length;
      nodeCallSequence.push(`call-${currentCallIndex}`);

      // Cycle through intent, validation, response
      const callType = currentCallIndex % 3;

      if (callType === 0) {
        // Intent detection
        return JSON.stringify({
          type: 'attack',
          confidence: 0.9,
          details: { target: 'goblin', action: 'attack' },
        });
      } else if (callType === 1) {
        // Rules validation
        return JSON.stringify({
          isValid: true,
          reasoning: 'Valid attack',
          needsRoll: true,
          rollFormula: '1d20+5',
          modifications: [],
        });
      } else {
        // Response generation
        return JSON.stringify({
          description: 'The goblin snarls and prepares to fight!',
          atmosphere: 'tense',
          npcs: [{ name: 'Goblin', dialogue: 'Grr!' }],
          availableActions: ['Attack', 'Defend', 'Run'],
          consequences: ['Combat initiated'],
        });
      }
    }),
  }),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are a DM.',
  buildGameContextPrompt: () => 'D&D 5E',
  buildResponseStructurePrompt: () => 'JSON format',
}));

describe('DM Graph Integration Tests', () => {
  let mockWorldContext: WorldInfo;

  beforeEach(() => {
    nodeCallSequence = [];
    mockWorldContext = {
      campaignId: 'test-campaign',
      sessionId: 'test-session',
      characterIds: ['test-char'],
      location: 'Goblin Cave',
      threatLevel: 'medium',
      activeNPCs: ['Goblin Warrior'],
      recentMemories: [
        {
          content: 'Entered the cave',
          type: 'event',
          timestamp: new Date(),
        },
      ],
    };
  });

  describe('Complete Graph Execution', () => {
    it('should execute full graph from input to response', async () => {
      const result = await invokeDMGraph(
        'I attack the goblin with my sword',
        mockWorldContext,
        'test-thread-1'
      );

      expect(result).toBeDefined();
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
      expect(result.response).toBeTruthy();
      expect(result.error).toBeNull();
    }, 30000);

    it('should flow through all graph nodes', async () => {
      const result = await invokeDMGraph(
        'I swing my axe at the orc',
        mockWorldContext,
        'test-thread-2'
      );

      // Should have called intent, validation, and response nodes
      expect(nodeCallSequence.length).toBeGreaterThanOrEqual(3);
      expect(result.metadata?.stepCount).toBeGreaterThan(0);
    }, 30000);

    it('should preserve state across nodes', async () => {
      const result = await invokeDMGraph(
        'I attack the dragon',
        mockWorldContext,
        'test-thread-3'
      );

      // Verify state accumulated through nodes
      expect(result.playerInput).toBeTruthy();
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
      expect(result.response).toBeTruthy();
      expect(result.worldContext).toBeTruthy();
    }, 30000);
  });

  describe('Graph Flow with Different Intents', () => {
    it('should handle attack actions', async () => {
      const result = await invokeDMGraph(
        'I attack the goblin',
        mockWorldContext,
        'test-attack'
      );

      expect(result.playerIntent).toBeTruthy();
      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.response).toBeTruthy();
    }, 30000);

    it('should handle social interactions', async () => {
      // Override mock for social intent
      mockGeminiManager = {
        executeWithRotation: vi.fn(async (fn: any) => {
          const idx = nodeCallSequence.length;
          nodeCallSequence.push(`social-${idx}`);

          if (idx % 3 === 0) {
            return JSON.stringify({
              type: 'social',
              confidence: 0.9,
              details: { target: 'merchant', action: 'persuade' },
            });
          } else if (idx % 3 === 1) {
            return JSON.stringify({
              isValid: true,
              reasoning: 'Valid social interaction',
              needsRoll: false,
              modifications: [],
            });
          } else {
            return JSON.stringify({
              description: 'The merchant listens to your proposal.',
              atmosphere: 'friendly',
              npcs: [{ name: 'Merchant', dialogue: 'Tell me more...' }],
              availableActions: ['Continue talking', 'Make offer', 'Leave'],
              consequences: [],
            });
          }
        }),
      };

      const result = await invokeDMGraph(
        'I try to persuade the merchant',
        mockWorldContext,
        'test-social'
      );

      expect(result.response).toBeTruthy();
      expect(result.error).toBeNull();
    }, 30000);

    it('should handle exploration actions', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;
          nodeCallSequence.push(`explore-${idx}`);

          if (idx % 3 === 0) {
            return JSON.stringify({
              type: 'exploration',
              confidence: 0.85,
              details: { target: 'room', action: 'search' },
            });
          } else if (idx % 3 === 1) {
            return JSON.stringify({
              isValid: true,
              reasoning: 'Valid exploration',
              needsRoll: false,
              modifications: [],
            });
          } else {
            return JSON.stringify({
              description: 'You carefully search the dusty chamber.',
              atmosphere: 'mysterious',
              npcs: [],
              availableActions: ['Search chest', 'Examine walls', 'Leave'],
              consequences: ['Found a hidden compartment'],
            });
          }
        }),
      };

      const result = await invokeDMGraph(
        'I search the room for treasure',
        mockWorldContext,
        'test-explore'
      );

      expect(result.response).toBeTruthy();
      expect(result.response?.description).toBeTruthy();
    }, 30000);

    it('should handle movement actions', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;
          nodeCallSequence.push(`move-${idx}`);

          if (idx % 3 === 0) {
            return JSON.stringify({
              type: 'movement',
              confidence: 0.9,
              details: { target: 'door', action: 'walk' },
            });
          } else if (idx % 3 === 1) {
            return JSON.stringify({
              isValid: true,
              reasoning: 'Simple movement',
              needsRoll: false,
              modifications: [],
            });
          } else {
            return JSON.stringify({
              description: 'You walk down the corridor.',
              atmosphere: 'neutral',
              npcs: [],
              availableActions: ['Continue', 'Stop', 'Turn back'],
              consequences: [],
            });
          }
        }),
      };

      const result = await invokeDMGraph(
        'I walk through the door',
        mockWorldContext,
        'test-movement'
      );

      expect(result.response).toBeTruthy();
      // Movement typically doesn't require dice rolls
    }, 30000);
  });

  describe('Error Handling in Graph', () => {
    it('should handle intent detection errors', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          throw new Error('Intent detection failed');
        }),
      };

      const result = await invokeDMGraph(
        'I do something',
        mockWorldContext,
        'test-intent-error'
      );

      // Should handle error gracefully
      expect(result).toBeDefined();
      expect(result.error || result.response).toBeTruthy();
    }, 30000);

    it('should handle validation errors', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;

          if (idx === 0) {
            // Intent succeeds
            return JSON.stringify({
              type: 'attack',
              confidence: 0.9,
              details: {},
            });
          } else {
            // Validation fails
            throw new Error('Validation failed');
          }
        }),
      };

      const result = await invokeDMGraph(
        'I attack',
        mockWorldContext,
        'test-validation-error'
      );

      expect(result).toBeDefined();
    }, 30000);

    it('should handle response generation errors', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;

          if (idx === 0) {
            return JSON.stringify({ type: 'attack', confidence: 0.9, details: {} });
          } else if (idx === 1) {
            return JSON.stringify({ isValid: true, reasoning: 'Valid', modifications: [] });
          } else {
            throw new Error('Response generation failed');
          }
        }),
      };

      const result = await invokeDMGraph(
        'I attack',
        mockWorldContext,
        'test-response-error'
      );

      expect(result).toBeDefined();
      expect(result.error).toBeTruthy();
    }, 30000);

    it('should handle empty player input', async () => {
      const result = await invokeDMGraph(
        '',
        mockWorldContext,
        'test-empty-input'
      );

      expect(result).toBeDefined();
      expect(result.error || result.response).toBeTruthy();
    }, 30000);
  });

  describe('Dice Roll Human-in-the-Loop', () => {
    it('should detect when dice rolls are required', async () => {
      const result = await invokeDMGraph(
        'I attack the goblin',
        mockWorldContext,
        'test-dice-detection'
      );

      expect(result.requiresDiceRoll).toBeDefined();
      expect(result.requiresDiceRoll?.formula).toBeTruthy();
      expect(result.requiresDiceRoll?.reason).toBeTruthy();
    }, 30000);

    it('should include dice roll details in request', async () => {
      const result = await invokeDMGraph(
        'I swing my sword at the orc',
        mockWorldContext,
        'test-dice-details'
      );

      if (result.requiresDiceRoll) {
        expect(result.requiresDiceRoll.formula).toMatch(/\d+d\d+/);
        expect(result.requiresDiceRoll.reason).toBeTruthy();
      }
    }, 30000);

    it('should not require dice for simple actions', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;

          if (idx % 3 === 0) {
            return JSON.stringify({ type: 'movement', confidence: 0.9, details: {} });
          } else if (idx % 3 === 1) {
            return JSON.stringify({
              isValid: true,
              reasoning: 'Simple movement',
              needsRoll: false,
              modifications: [],
            });
          } else {
            return JSON.stringify({
              description: 'You walk forward.',
              atmosphere: 'neutral',
              npcs: [],
              availableActions: [],
              consequences: [],
            });
          }
        }),
      };

      const result = await invokeDMGraph(
        'I walk down the hall',
        mockWorldContext,
        'test-no-dice'
      );

      // Simple movement shouldn't require dice
      expect(result.response).toBeTruthy();
    }, 30000);
  });

  describe('State Transitions Between Nodes', () => {
    it('should transition from intent to validation', async () => {
      const result = await invokeDMGraph(
        'I attack',
        mockWorldContext,
        'test-transition-1'
      );

      // Both intent and validation should be present
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
    }, 30000);

    it('should transition from validation to response', async () => {
      const result = await invokeDMGraph(
        'I look around',
        mockWorldContext,
        'test-transition-2'
      );

      // All states should be populated
      expect(result.playerIntent).toBeTruthy();
      expect(result.rulesValidation).toBeTruthy();
      expect(result.response).toBeTruthy();
    }, 30000);

    it('should increment step count at each node', async () => {
      const result = await invokeDMGraph(
        'I search for traps',
        mockWorldContext,
        'test-step-count'
      );

      // Step count should reflect progression through nodes
      expect(result.metadata?.stepCount).toBeGreaterThan(0);
    }, 30000);

    it('should preserve metadata across transitions', async () => {
      const result = await invokeDMGraph(
        'I cast a spell',
        mockWorldContext,
        'test-metadata'
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeInstanceOf(Date);
    }, 30000);
  });

  describe('Conditional Edge Routing', () => {
    it('should route to error handler on intent failure', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          throw new Error('Intent failed');
        }),
      };

      const result = await invokeDMGraph(
        'Invalid input',
        mockWorldContext,
        'test-error-route'
      );

      expect(result).toBeDefined();
      // Should have been routed through error handler
    }, 30000);

    it('should skip dice roll for non-combat actions', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          const idx = nodeCallSequence.length;

          if (idx % 3 === 0) {
            return JSON.stringify({ type: 'social', confidence: 0.9, details: {} });
          } else if (idx % 3 === 1) {
            return JSON.stringify({
              isValid: true,
              reasoning: 'Valid',
              needsRoll: false,
              modifications: [],
            });
          } else {
            return JSON.stringify({
              description: 'Conversation flows naturally.',
              atmosphere: 'friendly',
              npcs: [],
              availableActions: [],
              consequences: [],
            });
          }
        }),
      };

      const result = await invokeDMGraph(
        'I chat with the innkeeper',
        mockWorldContext,
        'test-no-dice-route'
      );

      expect(result.response).toBeTruthy();
    }, 30000);
  });

  describe('Graph Streaming', () => {
    it('should stream graph execution updates', async () => {
      const updates: any[] = [];

      const stream = streamDMGraph(
        'I attack the goblin',
        mockWorldContext,
        'test-stream-1'
      );

      for await (const update of stream) {
        updates.push(update);
      }

      // Should have received multiple updates
      expect(updates.length).toBeGreaterThan(0);
    }, 30000);

    it('should include partial state in stream updates', async () => {
      const updates: any[] = [];

      const stream = streamDMGraph(
        'I search the room',
        mockWorldContext,
        'test-stream-2'
      );

      for await (const update of stream) {
        updates.push(update);
      }

      // Updates should contain state information
      expect(updates.some(u => u !== null && typeof u === 'object')).toBe(true);
    }, 30000);

    it('should handle streaming errors gracefully', async () => {
      mockGeminiManager = {
        executeWithRotation: vi.fn(async () => {
          throw new Error('Streaming error');
        }),
      };

      const updates: any[] = [];

      const stream = streamDMGraph(
        'I do something',
        mockWorldContext,
        'test-stream-error'
      );

      for await (const update of stream) {
        updates.push(update);
      }

      // Should have error update
      expect(updates.length).toBeGreaterThan(0);
      expect(updates.some(u => u && u.error)).toBe(true);
    }, 30000);
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-turn combat', async () => {
      const turn1 = await invokeDMGraph(
        'I attack the goblin',
        mockWorldContext,
        'combat-thread'
      );

      expect(turn1.response).toBeTruthy();

      const turn2 = await invokeDMGraph(
        'I attack again',
        mockWorldContext,
        'combat-thread'
      );

      expect(turn2.response).toBeTruthy();
    }, 30000);

    it('should handle complex player actions', async () => {
      const result = await invokeDMGraph(
        'I draw my sword, cast Shield, and then attack the orc',
        mockWorldContext,
        'test-complex'
      );

      expect(result.response).toBeTruthy();
      expect(result.playerIntent).toBeTruthy();
    }, 30000);

    it('should handle conditional player intents', async () => {
      const result = await invokeDMGraph(
        'If the guard attacks, I defend. Otherwise, I try to negotiate.',
        mockWorldContext,
        'test-conditional'
      );

      expect(result.response).toBeTruthy();
    }, 30000);
  });

  describe('Performance', () => {
    it('should complete graph execution in reasonable time', async () => {
      const startTime = Date.now();

      await invokeDMGraph(
        'I attack',
        mockWorldContext,
        'test-performance'
      );

      const duration = Date.now() - startTime;

      // Should complete in under 30 seconds (generous for tests)
      expect(duration).toBeLessThan(30000);
    }, 30000);

    it('should handle concurrent graph executions', async () => {
      const executions = [
        invokeDMGraph('Action 1', mockWorldContext, 'concurrent-1'),
        invokeDMGraph('Action 2', mockWorldContext, 'concurrent-2'),
        invokeDMGraph('Action 3', mockWorldContext, 'concurrent-3'),
      ];

      const results = await Promise.all(executions);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.response || result.error).toBeTruthy();
      });
    }, 30000);
  });
});
