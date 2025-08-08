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
import { GameState } from '../types/gameState'; // Path needs to be @/types for consistency or checked
import { MessagePriority, MessageType } from './crewai/types/communication';

// Services
import { AgentMessagingService } from './messaging/agent-messaging-service';
import { ErrorHandlingService } from './error/services/error-handling-service'; // Assuming kebab-case
import { EnhancedMemoryManager } from './services/memory/enhanced-memory-manager'; // Assuming kebab-case
import { ResponseCoordinator } from './services/response/response-coordinator'; // Assuming kebab-case


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
  private errorHandler: ErrorHandlingService;
  private gameState: Partial<GameState>;
  private memoryManager: EnhancedMemoryManager | null = null;

  // ====================================
  // Constructor
  // ====================================
  /**
   * Creates a new DungeonMasterAgent instance.
   */
  constructor() {
    this.id = 'dm_agent_1';
    this.role = 'Dungeon Master';
    this.goal = 'Guide players through an engaging D&D campaign';
    this.backstory = 'An experienced DM with vast knowledge of D&D rules and creative storytelling abilities';
    this.verbose = true;
    this.allowDelegation = true;
    
    this.messagingService = AgentMessagingService.getInstance();
    this.responseCoordinator = new ResponseCoordinator();
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
        timeOfDay: 'dawn'
      },
      activeNPCs: [],
      sceneStatus: {
        currentAction: 'beginning',
        availableActions: [],
        environmentalEffects: [],
        threatLevel: 'none'
      }
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
      console.log(`DM Agent executing task: ${task.description}`);

      // Note: We initialize memory manager and response coordinator separately
      // to ensure dependencies are ready before generating a response.
      // See: src/agents/services/memory/EnhancedMemoryManager.ts
      // See: src/agents/services/response/ResponseCoordinator.ts
      await this.initializeMemoryManager(task);
      await this.initializeResponseCoordinator(task);

      // Store the player's action for future context
      await this.storePlayerActionMemory(task);

      // Enhance the task with game state and recent memories
      const enhancedTask = await this.enhanceTaskContext(task);

      // Generate the DM response using the response coordinator
      const response = await this.responseCoordinator.generateResponse(enhancedTask);

      // Store the generated response in memory for future context
      await this.storeResponseMemories(response);

      // Update the internal game state based on the response
      await this.updateGameStateFromResponse(response);

      // Notify other agents (rules interpreter, narrator) with the response
      await this.notifyAgents(enhancedTask, response);

      return response;
    } catch (error) {
      console.error('Error executing DM agent task:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute task'
      };
    }
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
   * Initializes the response coordinator.
   * 
   * @private
   * @param {AgentTask} task - The task to execute
   */
  private async initializeResponseCoordinator(task: AgentTask): Promise<void> {
    if (task.context?.campaignId && task.context?.sessionId) {
      await this.responseCoordinator.initialize(
        task.context.campaignId,
        task.context.sessionId
      );
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
      await this.memoryManager.storeMemory(
        task.description,
        'action',
        'player_action',
        { location: this.gameState.location?.name }
      );
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
        recentMemories
      }
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
      
      await this.memoryManager.storeMemory(
        environment.description,
        'description',
        'location',
        {
          location: this.gameState.location?.name,
          npcs: characters.activeNPCs
        }
      );

      if (characters.dialogue) {
        await this.memoryManager.storeMemory(
          characters.dialogue,
          'dialogue',
          'npc',
          {
            location: this.gameState.location?.name,
            npcs: characters.activeNPCs
          }
        );
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
          atmosphere: environment.atmosphere
        },
        activeNPCs: characters.activeNPCs.map(name => ({
          id: name.toLowerCase().replace(/\s/g, '_'),
          name,
          description: '',
          personality: '',
          currentStatus: 'active'
        })),
        sceneStatus: {
          ...this.gameState.sceneStatus,
          availableActions: response.data.narrativeResponse.opportunities.immediate
        }
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
      ...newState
    };
    console.log('Updated game state:', this.gameState);
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
      async () => this.messagingService.sendMessage(
        this.id,
        'rules_interpreter_1',
        MessageType.TASK,
        {
          taskDescription: task.description,
          result: response
        },
        MessagePriority.HIGH
      ),
      {
        category: ErrorCategory.AGENT,
        context: 'DungeonMasterAgent.notifyAgents',
        severity: ErrorSeverity.MEDIUM
      }
    );

    await this.errorHandler.handleOperation(
      async () => this.messagingService.sendMessage(
        this.id,
        'narrator_1',
        MessageType.RESULT,
        {
          taskId: task.id,
          result: response
        },
        MessagePriority.MEDIUM
      ),
      {
        category: ErrorCategory.AGENT,
        context: 'DungeonMasterAgent.notifyAgents',
        severity: ErrorSeverity.MEDIUM
      }
    );
  }
}
