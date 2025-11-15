import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DungeonMasterAgent } from '../dungeon-master-agent';
import type { AgentTask, AgentResult } from '../types';
import type { EncounterGenerationInput, EncounterSpec } from '@/types/encounters';

// ====================================
// Mock Dependencies
// ====================================

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock messaging service
vi.mock('../messaging/agent-messaging-service', () => ({
  AgentMessagingService: {
    getInstance: vi.fn(() => ({
      sendMessage: vi.fn().mockResolvedValue(true),
    })),
  },
}));

// Mock error handling service
vi.mock('../error/services/error-handling-service', () => ({
  ErrorHandlingService: {
    getInstance: vi.fn(() => ({
      handleOperation: vi.fn((operation: () => Promise<any>) => operation()),
    })),
  },
}));

// Mock memory manager
vi.mock('../services/memory/EnhancedMemoryManager', () => ({
  EnhancedMemoryManager: vi.fn().mockImplementation(() => ({
    storeMemory: vi.fn().mockResolvedValue(undefined),
    retrieveMemories: vi.fn().mockResolvedValue([
      {
        content: 'Previous encounter with goblins',
        type: 'action',
        importance: 3,
        timestamp: new Date().toISOString(),
      },
    ]),
  })),
}));

// Mock response coordinator
vi.mock('../services/response/ResponseCoordinator', () => ({
  ResponseCoordinator: vi.fn().mockImplementation(() => ({
    generateResponse: vi.fn().mockResolvedValue({
      success: true,
      message: 'Response generated successfully',
      data: {
        narrativeResponse: {
          environment: {
            description: 'A dark and mysterious forest',
            atmosphere: 'foreboding',
          },
          characters: {
            activeNPCs: ['Mysterious Stranger', 'Forest Guardian'],
            dialogue: 'Welcome, traveler. What brings you to these woods?',
          },
          opportunities: {
            immediate: ['Speak with the stranger', 'Investigate the forest', 'Set up camp'],
          },
        },
      },
    }),
  })),
}));

// Mock response pipeline
vi.mock('../services/response/ResponsePipeline', () => ({
  ResponsePipeline: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      result: {
        success: true,
        message: 'Task executed successfully',
        data: {
          narrativeResponse: {
            environment: {
              description: 'A dark and mysterious forest',
              atmosphere: 'foreboding',
            },
            characters: {
              activeNPCs: ['Mysterious Stranger', 'Forest Guardian'],
              dialogue: 'Welcome, traveler. What brings you to these woods?',
            },
            opportunities: {
              immediate: ['Speak with the stranger', 'Investigate the forest', 'Set up camp'],
            },
          },
        },
      },
      conversation: {
        currentNPC: 'Mysterious Stranger',
        dialogueHistory: [],
        playerChoices: [],
        lastResponse: null,
      },
    }),
  })),
}));

// Mock campaign context provider
vi.mock('../services/campaign/CachedCampaignContextProvider', () => ({
  CachedCampaignContextProvider: vi.fn().mockImplementation(() => ({
    fetchCampaignDetails: vi.fn().mockResolvedValue({
      id: 'camp-1',
      name: 'Test Campaign',
    }),
  })),
}));

// Mock conversation state store
vi.mock('../services/conversation/ConversationStateStore', () => ({
  ConversationStateStore: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock encounter generator
vi.mock('@/services/encounters/encounter-generator', () => ({
  default: {
    generate: vi.fn().mockReturnValue({
      type: 'combat',
      difficulty: 'medium',
      xpBudget: 400,
      participants: {
        hostiles: [{ ref: 'srd:goblin', count: 4 }],
        friendlies: [],
      },
      terrain: {
        biome: 'forest',
        features: ['dense trees', 'undergrowth'],
      },
      objectives: ['Defeat the goblins'],
      startState: {
        initiative: 'roll',
        surprise: false,
      },
    }),
  },
}));

// Mock telemetry client
vi.mock('@/services/encounters/telemetry-client', () => ({
  postEncounterTelemetry: vi.fn().mockResolvedValue(undefined),
}));

// ====================================
// Test Suite
// ====================================

describe('DungeonMasterAgent', () => {
  let agent: DungeonMasterAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DungeonMasterAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ====================================
  // Agent Identity Tests
  // ====================================
  describe('Agent Identity', () => {
    it('should have correct agent properties', () => {
      expect(agent.id).toBe('dm_agent_1');
      expect(agent.role).toBe('Game Master');
      expect(agent.goal).toBe('Guide players through an engaging fantasy RPG campaign');
      expect(agent.backstory).toContain('experienced GM');
      expect(agent.verbose).toBe(true);
      expect(agent.allowDelegation).toBe(true);
    });
  });

  // ====================================
  // Task Execution Tests
  // ====================================
  describe('executeTask', () => {
    it('should execute a basic task successfully', async () => {
      const task: AgentTask = {
        id: 'task-1',
        description: 'I want to explore the forest',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-1',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Task executed successfully');
      expect(result.data).toBeDefined();
      expect(result.data.narrativeResponse).toBeDefined();
    });

    it('should return narrative response with environment details', async () => {
      const task: AgentTask = {
        id: 'task-2',
        description: 'I look around',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-2',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.narrativeResponse?.environment).toBeDefined();
      expect(result.data?.narrativeResponse?.environment?.description).toBe(
        'A dark and mysterious forest',
      );
      expect(result.data?.narrativeResponse?.environment?.atmosphere).toBe('foreboding');
    });

    it('should return narrative response with character details', async () => {
      const task: AgentTask = {
        id: 'task-3',
        description: 'Who is here?',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-3',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.narrativeResponse?.characters).toBeDefined();
      expect(result.data?.narrativeResponse?.characters?.activeNPCs).toContain(
        'Mysterious Stranger',
      );
      expect(result.data?.narrativeResponse?.characters?.activeNPCs).toContain('Forest Guardian');
      expect(result.data?.narrativeResponse?.characters?.dialogue).toContain('Welcome, traveler');
    });

    it('should return narrative response with opportunity suggestions', async () => {
      const task: AgentTask = {
        id: 'task-4',
        description: 'What should I do next?',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-4',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.narrativeResponse?.opportunities?.immediate).toBeDefined();
      expect(result.data?.narrativeResponse?.opportunities?.immediate).toHaveLength(3);
      expect(result.data?.narrativeResponse?.opportunities?.immediate).toContain(
        'Speak with the stranger',
      );
    });

    it('should handle task without sessionId gracefully', async () => {
      const task: AgentTask = {
        id: 'task-no-session',
        description: 'I explore',
        expectedOutput: 'narrative',
        context: {
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle task without campaignId gracefully', async () => {
      const task: AgentTask = {
        id: 'task-no-campaign',
        description: 'I explore',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-no-campaign',
        },
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle empty task description', async () => {
      const task: AgentTask = {
        id: 'task-empty',
        description: '',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-empty',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle very long task descriptions', async () => {
      const longDescription = 'I '.repeat(1000) + 'explore the dungeon';

      const task: AgentTask = {
        id: 'task-long',
        description: longDescription,
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-long',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle tasks without expected output', async () => {
      const task: AgentTask = {
        id: 'task-no-output',
        description: 'I perform an action',
        expectedOutput: '',
        context: {
          sessionId: 'session-no-output',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle missing context gracefully', async () => {
      const task: AgentTask = {
        id: 'task-no-context',
        description: 'I explore',
        expectedOutput: 'narrative',
        context: {},
      };

      const result = await agent.executeTask(task);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  // ====================================
  // Encounter Management Tests
  // ====================================
  describe('Encounter Management', () => {
    describe('planEncounter', () => {
      it('should generate an encounter spec', () => {
        const input: EncounterGenerationInput = {
          party: {
            members: [{ level: 3 }, { level: 3 }, { level: 3 }, { level: 3 }],
          },
          world: {
            biome: 'forest',
          },
          requestedDifficulty: 'medium',
          type: 'combat',
        };

        const spec = agent.planEncounter(input);

        expect(spec).toBeDefined();
        expect(spec.type).toBe('combat');
        expect(spec.difficulty).toBe('medium');
        expect(spec.participants.hostiles).toHaveLength(1);
        expect(spec.xpBudget).toBe(400);
      });

      it('should generate encounter with specified biome', () => {
        const input: EncounterGenerationInput = {
          party: {
            members: [{ level: 5 }],
          },
          world: {
            biome: 'dungeon',
          },
          sessionId: 'session-encounter',
        };

        const spec = agent.planEncounter(input);

        expect(spec).toBeDefined();
        expect(spec.type).toBeDefined();
        expect(spec.difficulty).toBeDefined();
      });

      it('should generate encounter with combat objectives', () => {
        const input: EncounterGenerationInput = {
          party: {
            members: [{ level: 2 }, { level: 2 }],
          },
          world: {
            biome: 'forest',
          },
          requestedDifficulty: 'easy',
        };

        const spec = agent.planEncounter(input);

        expect(spec).toBeDefined();
        expect(spec.objectives).toBeDefined();
        expect(Array.isArray(spec.objectives)).toBe(true);
      });
    });

    describe('validatePlannedEncounter', () => {
      it('should validate encounter without throwing', async () => {
        const spec: EncounterSpec = {
          type: 'combat',
          difficulty: 'medium',
          xpBudget: 400,
          participants: {
            hostiles: [{ ref: 'srd:goblin', count: 4 }],
            friendlies: [],
          },
          terrain: {
            biome: 'forest',
            features: [],
          },
          objectives: [],
          startState: {
            initiative: 'roll',
            surprise: false,
          },
        };

        await expect(agent.validatePlannedEncounter(spec)).resolves.not.toThrow();
      });

      it('should handle validation of easy encounter', async () => {
        const spec: EncounterSpec = {
          type: 'combat',
          difficulty: 'easy',
          xpBudget: 100,
          participants: {
            hostiles: [{ ref: 'srd:wolf', count: 2 }],
            friendlies: [],
          },
          terrain: {
            features: [],
          },
          objectives: [],
          startState: {
            initiative: 'roll',
            surprise: false,
          },
        };

        await expect(agent.validatePlannedEncounter(spec)).resolves.not.toThrow();
      });
    });

    describe('reportEncounterOutcome', () => {
      it('should report telemetry without throwing', async () => {
        const spec: EncounterSpec = {
          type: 'combat',
          difficulty: 'hard',
          xpBudget: 800,
          participants: {
            hostiles: [{ ref: 'srd:ogre', count: 2 }],
            friendlies: [],
          },
          terrain: {
            features: [],
          },
          objectives: [],
          startState: {
            initiative: 'roll',
            surprise: false,
          },
        };

        await expect(
          agent.reportEncounterOutcome('session-outcome', spec, 0.7),
        ).resolves.not.toThrow();
      });

      it('should handle various resource usage values', async () => {
        const spec: EncounterSpec = {
          type: 'combat',
          difficulty: 'medium',
          xpBudget: 400,
          participants: {
            hostiles: [],
            friendlies: [],
          },
          terrain: {
            features: [],
          },
          objectives: [],
          startState: {
            initiative: 'roll',
            surprise: false,
          },
        };

        await expect(agent.reportEncounterOutcome('session-1', spec, 0)).resolves.not.toThrow();
        await expect(agent.reportEncounterOutcome('session-2', spec, 0.5)).resolves.not.toThrow();
        await expect(agent.reportEncounterOutcome('session-3', spec, 1.0)).resolves.not.toThrow();
      });
    });
  });

  // ====================================
  // Game State Management Tests
  // ====================================
  describe('Game State Management', () => {
    it('should initialize with default game state', () => {
      const newAgent = new DungeonMasterAgent();

      expect(newAgent.id).toBeDefined();
      expect(newAgent.role).toBeDefined();
      expect(newAgent.goal).toBeDefined();
    });

    it('should maintain state across multiple task executions', async () => {
      const task1: AgentTask = {
        id: 'task-state-1',
        description: 'I enter the tavern',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-state',
          campaignId: 'camp-1',
        },
      };

      const task2: AgentTask = {
        id: 'task-state-2',
        description: 'I order a drink',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-state',
          campaignId: 'camp-1',
        },
      };

      const result1 = await agent.executeTask(task1);
      const result2 = await agent.executeTask(task2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle state updates without errors', async () => {
      const task: AgentTask = {
        id: 'task-state-update',
        description: 'I travel to a new location',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-state-update',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data?.narrativeResponse?.environment).toBeDefined();
    });
  });

  // ====================================
  // Integration Tests
  // ====================================
  describe('Integration', () => {
    it('should handle complete player action flow', async () => {
      const task: AgentTask = {
        id: 'task-integration-1',
        description: 'I cast a spell at the enemy',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'session-integration',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Task executed successfully');
      expect(result.data).toBeDefined();
      expect(result.data.narrativeResponse).toBeDefined();
      expect(result.data.narrativeResponse.environment).toBeDefined();
      expect(result.data.narrativeResponse.characters).toBeDefined();
      expect(result.data.narrativeResponse.opportunities).toBeDefined();
    });

    it('should handle encounter planning and validation flow', async () => {
      const input: EncounterGenerationInput = {
        party: {
          members: [{ level: 4 }, { level: 4 }, { level: 4 }],
        },
        world: {
          biome: 'cave',
        },
        requestedDifficulty: 'hard',
        sessionId: 'session-encounter-flow',
      };

      const spec = agent.planEncounter(input);
      await agent.validatePlannedEncounter(spec);
      await agent.reportEncounterOutcome('session-encounter-flow', spec, 0.8);

      expect(spec).toBeDefined();
      expect(spec.type).toBeDefined();
      expect(spec.difficulty).toBeDefined();
    });

    it('should handle multiple sequential tasks', async () => {
      const tasks = [
        {
          id: 'seq-1',
          description: 'I enter the room',
          expectedOutput: 'narrative',
          context: { sessionId: 'seq', campaignId: 'camp-1' },
        },
        {
          id: 'seq-2',
          description: 'I search for traps',
          expectedOutput: 'narrative',
          context: { sessionId: 'seq', campaignId: 'camp-1' },
        },
        {
          id: 'seq-3',
          description: 'I move forward carefully',
          expectedOutput: 'narrative',
          context: { sessionId: 'seq', campaignId: 'camp-1' },
        },
      ];

      for (const task of tasks) {
        const result = await agent.executeTask(task);
        expect(result.success).toBe(true);
      }
    });
  });

  // ====================================
  // Edge Cases Tests
  // ====================================
  describe('Edge Cases', () => {
    it('should handle special characters in task description', async () => {
      const task: AgentTask = {
        id: 'edge-special',
        description: 'I say "Hello!" & wave at the guard (friendly)',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'edge-special',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle Unicode characters', async () => {
      const task: AgentTask = {
        id: 'edge-unicode',
        description: 'I greet with "こんにちは" and examine the 古代の遺跡',
        expectedOutput: 'narrative',
        context: {
          sessionId: 'edge-unicode',
          campaignId: 'camp-1',
        },
      };

      const result = await agent.executeTask(task);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle null-like values in context', async () => {
      const task: AgentTask = {
        id: 'edge-null',
        description: 'I explore',
        expectedOutput: 'narrative',
        context: {
          sessionId: undefined as any,
          campaignId: null as any,
        },
      };

      const result = await agent.executeTask(task);
      expect(result).toBeDefined();
    });

    it('should handle rapid successive task execution', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) => ({
        id: `rapid-${i}`,
        description: `Action ${i}`,
        expectedOutput: 'narrative',
        context: {
          sessionId: 'rapid',
          campaignId: 'camp-1',
        },
      }));

      const results = await Promise.all(tasks.map((t) => agent.executeTask(t)));

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });
});
