/**
 * Agent Adapter
 *
 * Bridges LangGraph nodes with existing production-tested agent classes.
 * Eliminates code duplication by converting LangGraph state to AgentTask format
 * and delegating execution to DungeonMasterAgent and RulesInterpreterAgent.
 *
 * @module agents/langgraph/adapters/agent-adapter
 */

import { DungeonMasterAgent } from '../../dungeon-master-agent';
import { RulesInterpreterAgent } from '../../rules-interpreter-agent';
import type { AgentTask, AgentResult } from '../../types';
import type { DMState, WorldInfo } from '../state';
import { logger } from '@/lib/logger';

/**
 * Adapter class that bridges LangGraph state with existing agent implementations
 */
export class AgentAdapter {
  private dmAgent: DungeonMasterAgent;
  private rulesAgent: RulesInterpreterAgent;

  constructor() {
    this.dmAgent = new DungeonMasterAgent();
    this.rulesAgent = new RulesInterpreterAgent();
    logger.debug('AgentAdapter initialized with DM and Rules agents');
  }

  /**
   * Convert LangGraph DMState to AgentTask format
   *
   * @param state - The current DMState from LangGraph
   * @param taskDescription - Optional custom task description (defaults to playerInput)
   * @returns AgentTask with properly formatted context
   */
  stateToTask(state: DMState, taskDescription?: string): AgentTask {
    const worldContext = state.worldContext || {} as WorldInfo;
    const description = taskDescription || state.playerInput || 'Process player action';

    // Extract the first character ID if available
    const characterId = worldContext.characterIds?.[0];

    // Build the task with full context
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      expectedOutput: 'Generate narrative response based on player action',
      context: {
        sessionId: worldContext.sessionId,
        campaignId: worldContext.campaignId,
        characterId,
        gameState: {
          location: {
            name: worldContext.location || 'Unknown',
            description: '',
            atmosphere: 'neutral' as const,
            timeOfDay: 'day' as const
          },
          activeNPCs: worldContext.activeNPCs?.map(npcName => ({
            id: npcName.toLowerCase().replace(/\s/g, '_'),
            name: npcName,
            description: '',
            personality: '',
            currentStatus: 'active' as const
          })) || [],
          sceneStatus: {
            currentAction: state.playerIntent || 'unknown',
            availableActions: [],
            environmentalEffects: [],
            threatLevel: worldContext.threatLevel || 'none'
          }
        },
        recentMemories: worldContext.recentMemories || [],
        playerIntent: state.playerIntent ? {
          type: state.playerIntent as any,
          confidence: 0.9
        } : undefined
      }
    };

    logger.debug('Converted DMState to AgentTask', {
      taskId: task.id,
      description: task.description.substring(0, 50),
      sessionId: worldContext.sessionId,
      campaignId: worldContext.campaignId
    });

    return task;
  }

  /**
   * Call DungeonMasterAgent with state context
   *
   * @param state - The current DMState from LangGraph
   * @param taskDescription - Optional custom task description
   * @returns AgentResult from DungeonMasterAgent
   * @throws Error if DM agent task fails
   */
  async executeDMTask(state: DMState, taskDescription?: string): Promise<AgentResult> {
    try {
      logger.info('Executing DM agent task', {
        playerInput: state.playerInput?.substring(0, 50),
        intent: state.playerIntent
      });

      const task = this.stateToTask(state, taskDescription);
      const result = await this.dmAgent.executeTask(task);

      if (!result.success) {
        const errorMessage = result.message || 'DM agent task failed';
        logger.error('DM agent task failed', {
          taskId: task.id,
          error: errorMessage
        });
        throw new Error(errorMessage);
      }

      logger.info('DM agent task completed successfully', {
        taskId: task.id,
        hasData: !!result.data
      });

      return result;
    } catch (error) {
      logger.error('Error in executeDMTask', {
        error,
        playerInput: state.playerInput?.substring(0, 50)
      });
      throw error;
    }
  }

  /**
   * Call RulesInterpreterAgent for validation
   *
   * @param state - The current DMState from LangGraph
   * @param ruleType - Optional rule type to validate
   * @returns AgentResult from RulesInterpreterAgent
   */
  async executeRulesTask(state: DMState, ruleType?: string): Promise<AgentResult> {
    try {
      logger.info('Executing rules agent task', {
        playerInput: state.playerInput?.substring(0, 50),
        intent: state.playerIntent,
        ruleType
      });

      const task = this.stateToTask(state, 'Validate player action against D&D 5E rules');

      // Add rules-specific context
      task.expectedOutput = 'Validation result with rule compliance details';
      task.context = {
        ...task.context,
        ruleType: ruleType || state.playerIntent || 'general',
        rulesValidation: state.rulesValidation,
        requiresDiceRoll: state.requiresDiceRoll
      };

      const result = await this.rulesAgent.executeTask(task);

      logger.info('Rules agent task completed', {
        taskId: task.id,
        success: result.success,
        hasValidation: !!result.data?.validationResults
      });

      return result;
    } catch (error) {
      logger.error('Error in executeRulesTask', {
        error,
        playerInput: state.playerInput?.substring(0, 50)
      });

      // Don't throw for rules validation errors - return a non-fatal result
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Rules validation failed',
        data: {
          validationResults: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Execute a custom task with the DM agent using raw AgentTask
   *
   * @param task - Pre-formatted AgentTask
   * @returns AgentResult from DungeonMasterAgent
   */
  async executeCustomDMTask(task: AgentTask): Promise<AgentResult> {
    try {
      logger.info('Executing custom DM agent task', {
        taskId: task.id,
        description: task.description.substring(0, 50)
      });

      const result = await this.dmAgent.executeTask(task);

      if (!result.success) {
        logger.error('Custom DM agent task failed', {
          taskId: task.id,
          error: result.message
        });
      }

      return result;
    } catch (error) {
      logger.error('Error in executeCustomDMTask', {
        error,
        taskId: task.id
      });
      throw error;
    }
  }

  /**
   * Execute a custom task with the Rules agent using raw AgentTask
   *
   * @param task - Pre-formatted AgentTask
   * @returns AgentResult from RulesInterpreterAgent
   */
  async executeCustomRulesTask(task: AgentTask): Promise<AgentResult> {
    try {
      logger.info('Executing custom rules agent task', {
        taskId: task.id,
        description: task.description.substring(0, 50)
      });

      return await this.rulesAgent.executeTask(task);
    } catch (error) {
      logger.error('Error in executeCustomRulesTask', {
        error,
        taskId: task.id
      });
      throw error;
    }
  }

  /**
   * Get direct access to the DM agent instance
   * Useful for calling specialized methods like planEncounter()
   */
  getDMAgent(): DungeonMasterAgent {
    return this.dmAgent;
  }

  /**
   * Get direct access to the Rules agent instance
   */
  getRulesAgent(): RulesInterpreterAgent {
    return this.rulesAgent;
  }
}

/**
 * Singleton instance for efficient resource usage
 */
let adapterInstance: AgentAdapter | null = null;

/**
 * Get or create the singleton AgentAdapter instance
 *
 * @returns Shared AgentAdapter instance
 */
export function getAgentAdapter(): AgentAdapter {
  if (!adapterInstance) {
    logger.debug('Creating new AgentAdapter singleton instance');
    adapterInstance = new AgentAdapter();
  }
  return adapterInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAgentAdapter(): void {
  logger.debug('Resetting AgentAdapter singleton instance');
  adapterInstance = null;
}
