/**
 * Dungeon Master Agent
 *
 * Core AI Dungeon Master logic.
 * Manages game state, coordinates responses, interacts with memory,
 * and communicates with other agents.
 *
 * Dependencies:
 * - Agent interfaces and types (src/agents/types.ts)
 * - Messaging service (src/agents/messaging/agent-messaging-service.ts)
 * - CrewAI communication types (src/agents/crewai/types/communication.ts)
 * - Error handling services (src/agents/error/services/ErrorHandlingService.ts)
 * - Response coordinator (src/agents/services/response/response-coordinator.ts)
 * - Game state types (src/types/gameState.ts)
 * - Memory manager (src/agents/services/memory/EnhancedMemoryManager.ts)
 *
 * @author AI Dungeon Master Team
 */

// ============================
// Project Imports
// ============================

// Agent Core & Types
import { Agent, AgentResult, AgentTask } from './types';
import { ErrorCategory, ErrorSeverity } from './error/types';
import { GameState } from '@/types/gameState';
import { MessagePriority, MessageType } from './messaging/types';

// Services
import { AgentMessagingService } from './messaging/agent-messaging-service';
import { ErrorHandlingService } from './error/services/error-handling-service';
import { EnhancedMemoryManager } from './services/memory/EnhancedMemoryManager';
import { ResponseCoordinator } from './services/response/ResponseCoordinator';
import { ResponsePipeline } from './services/response/ResponsePipeline';
import { CachedCampaignContextProvider } from './services/campaign/CachedCampaignContextProvider';
import { ConversationStateStore } from './services/conversation/ConversationStateStore';
import encounterGenerator from '@/services/encounters/encounter-generator';
import { EncounterGenerationInput, EncounterSpec } from '@/types/encounters';
import { postEncounterTelemetry } from '@/services/encounters/telemetry-client';
import { logger } from '../lib/logger';

export class DungeonMasterAgent implements Agent {
  // ====================================
  // Types and Interfaces
  // ====================================
  // (none needed here, but this is where you'd define local types)

  // ====================================
  // Agent identity
  // ====================================
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose: boolean;
  allowDelegation: boolean;

  // ====================================
  // Dependencies and State
  // ====================================
  private messagingService: AgentMessagingService;
  private responseCoordinator: ResponseCoordinator;
  private responsePipeline: ResponsePipeline;
  private errorHandler: ErrorHandlingService;
  private gameState: Partial<GameState>;
  private memoryManager: EnhancedMemoryManager | null = null;
  private lastEncounterAt: number = 0;
  private readonly encounterCooldownMs = 120000; // 2 minutes

  // ====================================
  // Constructor
  // ====================================
  /**
   * Creates a new DungeonMasterAgent instance.
   */
  constructor() {
    this.id = 'dm_agent_1';
    this.role = 'Game Master';
    this.goal = 'Guide players through an engaging fantasy RPG campaign';
    this.backstory =
      'An experienced GM with vast knowledge of fantasy RPG rules and creative storytelling abilities';
    this.verbose = true;
    this.allowDelegation = true;

    this.messagingService = AgentMessagingService.getInstance();
    this.responseCoordinator = new ResponseCoordinator();
    this.responsePipeline = new ResponsePipeline({
      responseCoordinator: this.responseCoordinator,
      campaignProvider: new CachedCampaignContextProvider(),
      conversationStore: new ConversationStateStore(),
    });
    this.errorHandler = ErrorHandlingService.getInstance();
    this.gameState = this.initializeGameState();
  }

  /**
   * Initializes the default game state.
   *
   * @private
   * @returns {Partial<GameState>} The initial game state
   */
  private initializeGameState(): Partial<GameState> {
    return {
      location: {
        name: 'Starting Location',
        description: 'The beginning of your adventure',
        atmosphere: 'neutral',
        timeOfDay: 'dawn',
      },
      activeNPCs: [],
      sceneStatus: {
        currentAction: 'beginning',
        availableActions: [],
        environmentalEffects: [],
        threatLevel: 'none',
      },
    };
  }

  /**
   * Executes an agent task, updating game state, storing memories, and generating a response.
   *
   * @param {AgentTask} task - The task to execute
   * @returns {Promise<AgentResult>} The result of the task execution
   */
  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      logger.info(`DM Agent executing task: ${task.description}`);

      // Note: We initialize memory manager and response coordinator separately
      // to ensure dependencies are ready before generating a response.
      // See: src/agents/services/memory/EnhancedMemoryManager.ts
      // See: src/agents/services/response/ResponseCoordinator.ts
      await this.initializeMemoryManager(task);
      // Store the player's action for future context
      await this.storePlayerActionMemory(task);

      // Enhance the task with game state and recent memories
      const enhancedTask = await this.enhanceTaskContext(task);

      // Generate the DM response using the response pipeline
      const { result: response } = await this.responsePipeline.execute(enhancedTask);

      if (!response.success) {
        return response;
      }

      // Store the generated response in memory for future context
      await this.storeResponseMemories(response);

      // Update the internal game state based on the response
      await this.updateGameStateFromResponse(response);

      // Targeted invocation hooks (no player UI)
      await this.maybeInvokeEncounterHooks(enhancedTask, response);

      // Notify other agents (rules interpreter, narrator) with the response
      await this.notifyAgents(enhancedTask, response);

      return response;
    } catch (error) {
      logger.error('Error executing DM agent task:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute task',
      };
    }
  }

  /**
   * Plans an encounter using the internal orchestrator (players never see this directly).
   */
  public planEncounter(input: EncounterGenerationInput): EncounterSpec {
    return encounterGenerator.generate(input);
  }

  /**
   * Initializes the memory manager if needed.
   *
   * @private
   * @param {AgentTask} task - The task to execute
   */
  private async initializeMemoryManager(task: AgentTask): Promise<void> {
    if (task.context?.sessionId && !this.memoryManager) {
      this.memoryManager = new EnhancedMemoryManager(task.context.sessionId);
    }
  }

  /**
   * Stores the player's action in memory.
   *
   * @private
   * @param {AgentTask} task - The task to execute
   */
  private async storePlayerActionMemory(task: AgentTask): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.storeMemory(task.description, 'action', 'player_action', {
        location: this.gameState.location?.name,
      });
    }
  }

  /**
   * Enhances the task context with game state and recent memories.
   *
   * @private
   * @param {AgentTask} task - The original task
   * @returns {Promise<AgentTask>} The enhanced task
   */
  private async enhanceTaskContext(task: AgentTask): Promise<AgentTask> {
    const recentMemories = this.memoryManager
      ? await this.memoryManager.retrieveMemories({ timeframe: 'recent', limit: 10 })
      : [];

    return {
      ...task,
      context: {
        ...task.context,
        gameState: this.gameState,
        recentMemories,
      },
    };
  }

  /**
   * Stores the generated response in memory.
   *
   * @private
   * @param {AgentResult} response - The agent response
   */
  private async storeResponseMemories(response: AgentResult): Promise<void> {
    if (this.memoryManager && response.data?.narrativeResponse) {
      const { environment, characters } = response.data.narrativeResponse;

      await this.memoryManager.storeMemory(environment.description, 'description', 'location', {
        location: this.gameState.location?.name,
        npcs: characters.activeNPCs,
      });

      if (characters.dialogue) {
        await this.memoryManager.storeMemory(characters.dialogue, 'dialogue', 'npc', {
          location: this.gameState.location?.name,
          npcs: characters.activeNPCs,
        });
      }
    }
  }

  /**
   * Updates the game state based on the generated response.
   *
   * @private
   * @param {AgentResult} response - The agent response
   */
  private async updateGameStateFromResponse(response: AgentResult): Promise<void> {
    if (response.data?.narrativeResponse) {
      const { environment, characters } = response.data.narrativeResponse;

      this.updateGameState({
        location: {
          ...this.gameState.location,
          description: environment.description,
          atmosphere: environment.atmosphere,
        },
        activeNPCs: characters.activeNPCs.map((name) => ({
          id: name.toLowerCase().replace(/\s/g, '_'),
          name,
          description: '',
          personality: '',
          currentStatus: 'active',
        })),
        sceneStatus: {
          ...this.gameState.sceneStatus,
          availableActions: response.data.narrativeResponse.opportunities.immediate,
        },
      });
    }
  }

  /**
   * Updates the internal game state with new values.
   *
   * @private
   * @param {Partial<GameState>} newState - The new state to merge
   */
  private updateGameState(newState: Partial<GameState>) {
    this.gameState = {
      ...this.gameState,
      ...newState,
    };
    logger.info('Updated game state:', this.gameState);
  }

  /**
   * Notifies other agents (rules interpreter, narrator) with task results.
   *
   * @private
   * @param {AgentTask} task - The original task
   * @param {AgentResult} response - The generated response
   * @returns {Promise<void>}
   */
  private async notifyAgents(task: AgentTask, response: AgentResult): Promise<void> {
    await this.errorHandler.handleOperation(
      async () =>
        this.messagingService.sendMessage(
          this.id,
          'rules_interpreter_1',
          MessageType.TASK,
          {
            taskDescription: task.description,
            result: response,
          },
          MessagePriority.HIGH,
        ),
      {
        category: ErrorCategory.AGENT,
        context: 'DungeonMasterAgent.notifyAgents',
        severity: ErrorSeverity.MEDIUM,
      },
    );

    await this.errorHandler.handleOperation(
      async () =>
        this.messagingService.sendMessage(
          this.id,
          'narrator_1',
          MessageType.RESULT,
          {
            taskId: task.id,
            result: response,
          },
          MessagePriority.MEDIUM,
        ),
      {
        category: ErrorCategory.AGENT,
        context: 'DungeonMasterAgent.notifyAgents',
        severity: ErrorSeverity.MEDIUM,
      },
    );
  }

  /**
   * Ask Rules Interpreter to validate an encounter spec.
   */
  public async validatePlannedEncounter(spec: EncounterSpec): Promise<void> {
    await this.errorHandler.handleOperation(
      async () =>
        this.messagingService.sendMessage(
          this.id,
          'rules_interpreter_1',
          MessageType.TASK,
          {
            taskDescription: 'Validate planned encounter',
            ruleType: 'encounter',
            encounterSpec: spec,
            monsters: [], // kept empty here; Rules Interpreter can load SRD
          },
          MessagePriority.HIGH,
        ),
      {
        category: ErrorCategory.AGENT,
        context: 'DungeonMasterAgent.validatePlannedEncounter',
        severity: ErrorSeverity.MEDIUM,
      },
    );
  }

  /**
   * Internal targeted hooks to plan/validate encounters based on pacing signals.
   */
  private async maybeInvokeEncounterHooks(task: AgentTask, _response: AgentResult): Promise<void> {
    const now = Date.now();
    if (now - this.lastEncounterAt < this.encounterCooldownMs) return;

    const threat = this.gameState.sceneStatus?.threatLevel;
    const justRested =
      typeof task.description === 'string' && /(short|long)\s+rest/i.test(task.description);

    let trigger: 'none' | 'combat' | 'exploration' = 'none';
    if (threat === 'high' || threat === 'medium') trigger = 'combat';
    else if (justRested) trigger = 'exploration';

    if (trigger === 'none') return;

    const sessionId = task.context?.sessionId as string | undefined;
    const input = {
      type: trigger,
      party: { members: [{ level: 3 }] }, // TODO: replace with real party snapshot when available
      world: { biome: 'forest' },
      requestedDifficulty: trigger === 'combat' ? 'medium' : 'easy',
      sessionId,
    } as EncounterGenerationInput;

    const spec = this.planEncounter(input);
    await this.validatePlannedEncounter(spec);
    this.lastEncounterAt = now;
  }

  /**
   * Report outcome telemetry for adaptive difficulty. No player UI involved.
   */
  public async reportEncounterOutcome(
    sessionId: string,
    spec: EncounterSpec,
    resourcesUsedEst: number,
  ): Promise<void> {
    try {
      await postEncounterTelemetry({ sessionId, difficulty: spec.difficulty, resourcesUsedEst });
    } catch (e) {
      logger.warn('Failed to post encounter telemetry', e);
    }
  }
}
