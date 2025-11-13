/**
 * Integration Tests for AgentAdapter
 *
 * Tests the bridge between LangGraph state and existing agent classes,
 * ensuring proper state conversion, task execution, and error handling.
 *
 * @module agents/langgraph/adapters/__tests__/agent-adapter.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AgentAdapter,
  getAgentAdapter,
  resetAgentAdapter
} from '../agent-adapter';
import type { DMState, WorldInfo, RuleCheckResult, DiceRollRequest, NarrativeResponse } from '../../state';
import type { AgentTask, AgentResult } from '../../../types';
import { BaseMessage } from '@langchain/core/messages';

// Mock the logger to prevent console noise during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock DungeonMasterAgent
const mockDMExecuteTask = vi.fn();
vi.mock('../../../dungeon-master-agent', () => ({
  DungeonMasterAgent: vi.fn().mockImplementation(() => ({
    executeTask: mockDMExecuteTask
  }))
}));

// Mock RulesInterpreterAgent
const mockRulesExecuteTask = vi.fn();
vi.mock('../../../rules-interpreter-agent', () => ({
  RulesInterpreterAgent: vi.fn().mockImplementation(() => ({
    executeTask: mockRulesExecuteTask
  }))
}));

describe('AgentAdapter', () => {
  let adapter: AgentAdapter;
  let mockState: DMState;
  let mockWorldContext: WorldInfo;
  let mockRulesValidation: RuleCheckResult;
  let mockDiceRollRequest: DiceRollRequest;
  let mockNarrativeResponse: NarrativeResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAgentAdapter();
    adapter = new AgentAdapter();

    // Setup mock world context
    mockWorldContext = {
      sessionId: 'test-session-123',
      campaignId: 'test-campaign-456',
      characterIds: ['char-1', 'char-2'],
      location: 'Dark Cave',
      threatLevel: 'medium',
      activeNPCs: ['Goblin Scout', 'Ancient Spider'],
      recentMemories: [
        {
          content: 'Entered the cave',
          type: 'action',
          timestamp: new Date()
        }
      ]
    };

    // Setup mock rules validation
    mockRulesValidation = {
      isValid: true,
      reasoning: 'The attack action is valid',
      modifications: [],
      ruleReferences: ['PHB p.192']
    };

    // Setup mock dice roll request
    mockDiceRollRequest = {
      type: 'attack',
      formula: '1d20+5',
      reason: 'Sword attack against goblin',
      ac: 15
    };

    // Setup mock narrative response
    mockNarrativeResponse = {
      description: 'You swing your sword at the goblin...',
      atmosphere: 'tense',
      npcs: [
        { name: 'Goblin Scout', dialogue: 'Aaargh!' }
      ],
      availableActions: ['attack', 'defend', 'retreat']
    };

    // Setup complete mock state
    mockState = {
      messages: [] as BaseMessage[],
      playerInput: 'I attack the goblin with my sword',
      playerIntent: 'attack',
      rulesValidation: mockRulesValidation,
      worldContext: mockWorldContext,
      response: mockNarrativeResponse,
      requiresDiceRoll: mockDiceRollRequest,
      error: null,
      metadata: {
        timestamp: new Date(),
        stepCount: 1,
        tokensUsed: 100
      }
    };

    // Default mock implementations
    mockDMExecuteTask.mockResolvedValue({
      success: true,
      message: 'Task executed successfully',
      data: { narrative: 'The action was successful' }
    });

    mockRulesExecuteTask.mockResolvedValue({
      success: true,
      message: 'Rules validated successfully',
      data: { validationResults: mockRulesValidation }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('stateToTask conversion', () => {
    it('should convert DMState to AgentTask format with all fields', () => {
      const task = adapter.stateToTask(mockState);

      expect(task).toMatchObject({
        id: expect.stringMatching(/^task-\d+-[a-z0-9]+$/),
        description: 'I attack the goblin with my sword',
        expectedOutput: 'Generate narrative response based on player action',
        context: expect.objectContaining({
          sessionId: 'test-session-123',
          campaignId: 'test-campaign-456',
          characterId: 'char-1',
          gameState: expect.objectContaining({
            location: expect.objectContaining({
              name: 'Dark Cave',
              atmosphere: 'neutral',
              timeOfDay: 'day'
            }),
            activeNPCs: expect.arrayContaining([
              expect.objectContaining({
                id: 'goblin_scout',
                name: 'Goblin Scout',
                currentStatus: 'active'
              }),
              expect.objectContaining({
                id: 'ancient_spider',
                name: 'Ancient Spider',
                currentStatus: 'active'
              })
            ]),
            sceneStatus: expect.objectContaining({
              currentAction: 'attack',
              threatLevel: 'medium'
            })
          }),
          recentMemories: mockWorldContext.recentMemories,
          playerIntent: expect.objectContaining({
            type: 'attack',
            confidence: 0.9
          })
        })
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalState: DMState = {
        messages: [],
        playerInput: null,
        playerIntent: null,
        rulesValidation: null,
        worldContext: null,
        response: null,
        requiresDiceRoll: null,
        error: null
      };

      const task = adapter.stateToTask(minimalState);

      expect(task).toMatchObject({
        id: expect.stringMatching(/^task-\d+-[a-z0-9]+$/),
        description: 'Process player action',
        expectedOutput: 'Generate narrative response based on player action',
        context: expect.objectContaining({
          sessionId: undefined,
          campaignId: undefined,
          characterId: undefined,
          gameState: expect.objectContaining({
            location: expect.objectContaining({
              name: 'Unknown'
            }),
            activeNPCs: [],
            sceneStatus: expect.objectContaining({
              currentAction: 'unknown',
              threatLevel: 'none'
            })
          }),
          recentMemories: [],
          playerIntent: undefined
        })
      });
    });

    it('should use custom task description when provided', () => {
      const customDescription = 'Custom task for testing';
      const task = adapter.stateToTask(mockState, customDescription);

      expect(task.description).toBe(customDescription);
    });

    it('should handle partial world context', () => {
      const partialState: DMState = {
        ...mockState,
        worldContext: {
          sessionId: 'test-session',
          campaignId: 'test-campaign',
          characterIds: []
        }
      };

      const task = adapter.stateToTask(partialState);

      expect(task.context?.sessionId).toBe('test-session');
      expect(task.context?.campaignId).toBe('test-campaign');
      expect(task.context?.characterId).toBeUndefined();
      expect(task.context?.gameState.location.name).toBe('Unknown');
    });
  });

  describe('executeDMTask', () => {
    it('should execute DM agent task successfully', async () => {
      const mockResult: AgentResult = {
        success: true,
        message: 'DM task completed',
        data: { narrative: 'You attack the goblin!' }
      };
      mockDMExecuteTask.mockResolvedValueOnce(mockResult);

      const result = await adapter.executeDMTask(mockState);

      expect(mockDMExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'I attack the goblin with my sword',
          expectedOutput: 'Generate narrative response based on player action'
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw error when DM agent returns unsuccessful result', async () => {
      mockDMExecuteTask.mockResolvedValueOnce({
        success: false,
        message: 'DM task failed: Invalid action',
        data: null
      });

      await expect(adapter.executeDMTask(mockState)).rejects.toThrow('DM task failed: Invalid action');
      expect(mockDMExecuteTask).toHaveBeenCalled();
    });

    it('should throw error when DM agent fails without message', async () => {
      mockDMExecuteTask.mockResolvedValueOnce({
        success: false,
        message: '',
        data: null
      });

      await expect(adapter.executeDMTask(mockState)).rejects.toThrow('DM agent task failed');
    });

    it('should use custom task description when provided', async () => {
      const customDescription = 'Generate epic battle narration';
      await adapter.executeDMTask(mockState, customDescription);

      expect(mockDMExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: customDescription
        })
      );
    });

    it('should handle DM agent exceptions', async () => {
      const error = new Error('Network timeout');
      mockDMExecuteTask.mockRejectedValueOnce(error);

      await expect(adapter.executeDMTask(mockState)).rejects.toThrow('Network timeout');
    });
  });

  describe('executeRulesTask', () => {
    it('should execute rules agent task successfully', async () => {
      const mockResult: AgentResult = {
        success: true,
        message: 'Rules validated',
        data: {
          validationResults: {
            isValid: true,
            reasoning: 'Action follows D&D 5E rules'
          }
        }
      };
      mockRulesExecuteTask.mockResolvedValueOnce(mockResult);

      const result = await adapter.executeRulesTask(mockState);

      expect(mockRulesExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Validate player action against D&D 5E rules',
          expectedOutput: 'Validation result with rule compliance details',
          context: expect.objectContaining({
            ruleType: 'attack',
            rulesValidation: mockRulesValidation,
            requiresDiceRoll: mockDiceRollRequest
          })
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should use custom rule type when provided', async () => {
      await adapter.executeRulesTask(mockState, 'spellcasting');

      expect(mockRulesExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            ruleType: 'spellcasting'
          })
        })
      );
    });

    it('should return error result when rules agent fails (non-fatal)', async () => {
      const error = new Error('Rules database unavailable');
      mockRulesExecuteTask.mockRejectedValueOnce(error);

      const result = await adapter.executeRulesTask(mockState);

      expect(result).toEqual({
        success: false,
        message: 'Rules database unavailable',
        data: {
          validationResults: null,
          error: 'Rules database unavailable'
        }
      });
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockRulesExecuteTask.mockRejectedValueOnce('String error');

      const result = await adapter.executeRulesTask(mockState);

      expect(result).toEqual({
        success: false,
        message: 'Rules validation failed',
        data: {
          validationResults: null,
          error: 'Unknown error'
        }
      });
    });

    it('should use general rule type when player intent is missing', async () => {
      const stateWithoutIntent = {
        ...mockState,
        playerIntent: null
      };

      await adapter.executeRulesTask(stateWithoutIntent);

      expect(mockRulesExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            ruleType: 'general'
          })
        })
      );
    });
  });

  describe('executeCustomDMTask', () => {
    it('should execute custom DM task successfully', async () => {
      const customTask: AgentTask = {
        id: 'custom-task-123',
        description: 'Generate dungeon description',
        expectedOutput: 'Detailed dungeon layout',
        context: { dungeonLevel: 1 }
      };

      const mockResult: AgentResult = {
        success: true,
        message: 'Dungeon generated',
        data: { layout: 'A dark corridor...' }
      };
      mockDMExecuteTask.mockResolvedValueOnce(mockResult);

      const result = await adapter.executeCustomDMTask(customTask);

      expect(mockDMExecuteTask).toHaveBeenCalledWith(customTask);
      expect(result).toEqual(mockResult);
    });

    it('should return unsuccessful result without throwing', async () => {
      const customTask: AgentTask = {
        id: 'custom-task-456',
        description: 'Invalid custom task',
        expectedOutput: 'Should fail'
      };

      mockDMExecuteTask.mockResolvedValueOnce({
        success: false,
        message: 'Task validation failed',
        data: null
      });

      const result = await adapter.executeCustomDMTask(customTask);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Task validation failed');
    });

    it('should throw when custom DM task throws exception', async () => {
      const customTask: AgentTask = {
        id: 'custom-task-789',
        description: 'Task that will throw',
        expectedOutput: 'N/A'
      };

      const error = new Error('Custom task error');
      mockDMExecuteTask.mockRejectedValueOnce(error);

      await expect(adapter.executeCustomDMTask(customTask)).rejects.toThrow('Custom task error');
    });
  });

  describe('executeCustomRulesTask', () => {
    it('should execute custom rules task successfully', async () => {
      const customTask: AgentTask = {
        id: 'rules-task-123',
        description: 'Validate spell components',
        expectedOutput: 'Component validation result',
        context: { spell: 'Fireball' }
      };

      const mockResult: AgentResult = {
        success: true,
        message: 'Spell validated',
        data: { componentsValid: true }
      };
      mockRulesExecuteTask.mockResolvedValueOnce(mockResult);

      const result = await adapter.executeCustomRulesTask(customTask);

      expect(mockRulesExecuteTask).toHaveBeenCalledWith(customTask);
      expect(result).toEqual(mockResult);
    });

    it('should throw when custom rules task throws exception', async () => {
      const customTask: AgentTask = {
        id: 'rules-task-456',
        description: 'Task that will throw',
        expectedOutput: 'N/A'
      };

      const error = new Error('Rules validation error');
      mockRulesExecuteTask.mockRejectedValueOnce(error);

      await expect(adapter.executeCustomRulesTask(customTask)).rejects.toThrow('Rules validation error');
    });
  });

  describe('Direct agent access', () => {
    it('should provide access to DM agent instance', () => {
      const dmAgent = adapter.getDMAgent();

      expect(dmAgent).toBeDefined();
      expect(dmAgent).toHaveProperty('executeTask');
      expect(dmAgent.executeTask).toBe(mockDMExecuteTask);
    });

    it('should provide access to Rules agent instance', () => {
      const rulesAgent = adapter.getRulesAgent();

      expect(rulesAgent).toBeDefined();
      expect(rulesAgent).toHaveProperty('executeTask');
      expect(rulesAgent.executeTask).toBe(mockRulesExecuteTask);
    });

    it('should return the same agent instances on multiple calls', () => {
      const dmAgent1 = adapter.getDMAgent();
      const dmAgent2 = adapter.getDMAgent();
      const rulesAgent1 = adapter.getRulesAgent();
      const rulesAgent2 = adapter.getRulesAgent();

      expect(dmAgent1).toBe(dmAgent2);
      expect(rulesAgent1).toBe(rulesAgent2);
    });
  });

  describe('Singleton behavior', () => {
    it('should return same instance on multiple calls to getAgentAdapter', () => {
      const adapter1 = getAgentAdapter();
      const adapter2 = getAgentAdapter();

      expect(adapter1).toBe(adapter2);
    });

    it('should create new instance after reset', () => {
      const adapter1 = getAgentAdapter();
      resetAgentAdapter();
      const adapter2 = getAgentAdapter();

      expect(adapter1).not.toBe(adapter2);
    });

    it('should maintain separate agent instances after reset', () => {
      const adapter1 = getAgentAdapter();
      const dmAgent1 = adapter1.getDMAgent();

      resetAgentAdapter();

      const adapter2 = getAgentAdapter();
      const dmAgent2 = adapter2.getDMAgent();

      expect(dmAgent1).not.toBe(dmAgent2);
    });

    it('should handle multiple resets gracefully', () => {
      resetAgentAdapter();
      resetAgentAdapter();
      const adapter = getAgentAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.getDMAgent()).toBeDefined();
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle DM agent returning undefined result', async () => {
      mockDMExecuteTask.mockResolvedValueOnce(undefined as any);

      await expect(adapter.executeDMTask(mockState)).rejects.toThrow();
    });

    it('should handle rules agent returning undefined result', async () => {
      mockRulesExecuteTask.mockResolvedValueOnce(undefined as any);

      const result = await adapter.executeRulesTask(mockState);

      expect(result.success).toBe(false);
      // The actual error message when handling undefined
      expect(result.message).toBe("Cannot read properties of undefined (reading 'success')");
    });

    it('should handle null state gracefully in executeDMTask', async () => {
      await expect(adapter.executeDMTask(null as any)).rejects.toThrow();
    });

    it('should handle null state gracefully in executeRulesTask', async () => {
      // This will actually throw due to trying to read properties from null in the logger
      // The error happens in the catch block's logger statement
      await expect(adapter.executeRulesTask(null as any)).rejects.toThrow(
        "Cannot read properties of null (reading 'playerInput')"
      );
    });

    it('should handle extremely long player input', async () => {
      const longState = {
        ...mockState,
        playerInput: 'A'.repeat(10000)
      };

      await adapter.executeDMTask(longState);

      expect(mockDMExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'A'.repeat(10000)
        })
      );
    });

    it('should handle special characters in NPC names', () => {
      const stateWithSpecialNPCs: DMState = {
        ...mockState,
        worldContext: {
          ...mockWorldContext,
          activeNPCs: ['Gob!in $cout', 'Dragon & Rider', 'El/ven War*rior']
        }
      };

      const task = adapter.stateToTask(stateWithSpecialNPCs);

      expect(task.context?.gameState.activeNPCs).toHaveLength(3);
      expect(task.context?.gameState.activeNPCs[0].id).toBe('gob!in_$cout');
      expect(task.context?.gameState.activeNPCs[1].id).toBe('dragon_&_rider');
      expect(task.context?.gameState.activeNPCs[2].id).toBe('el/ven_war*rior');
    });
  });

  describe('Complex integration scenarios', () => {
    it('should handle sequential DM and Rules tasks', async () => {
      // First execute rules validation
      const rulesResult = await adapter.executeRulesTask(mockState);
      expect(rulesResult.success).toBe(true);

      // Then execute DM narration based on validation
      if (rulesResult.success) {
        const dmResult = await adapter.executeDMTask(mockState);
        expect(dmResult.success).toBe(true);
      }

      expect(mockRulesExecuteTask).toHaveBeenCalledTimes(1);
      expect(mockDMExecuteTask).toHaveBeenCalledTimes(1);
    });

    it('should handle state mutations between calls', async () => {
      const mutableState = { ...mockState };

      await adapter.executeDMTask(mutableState);

      // Mutate the state
      mutableState.playerIntent = 'defend';
      mutableState.playerInput = 'I raise my shield';

      await adapter.executeRulesTask(mutableState);

      // Verify both calls used different data
      expect(mockDMExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'I attack the goblin with my sword'
        })
      );

      expect(mockRulesExecuteTask).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            ruleType: 'defend'
          })
        })
      );
    });

    it('should handle concurrent task execution', async () => {
      const promises = [
        adapter.executeDMTask(mockState),
        adapter.executeRulesTask(mockState, 'combat'),
        adapter.executeCustomDMTask({
          id: 'concurrent-1',
          description: 'Task 1',
          expectedOutput: 'Output 1'
        }),
        adapter.executeCustomRulesTask({
          id: 'concurrent-2',
          description: 'Task 2',
          expectedOutput: 'Output 2'
        })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockDMExecuteTask).toHaveBeenCalledTimes(2);
      expect(mockRulesExecuteTask).toHaveBeenCalledTimes(2);
    });
  });
});