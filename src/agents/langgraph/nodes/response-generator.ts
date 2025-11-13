/**
 * Response Generator Node
 *
 * Generates the final DM narrative response using production-tested DungeonMasterAgent.
 * Delegates to the agent via AgentAdapter to eliminate code duplication.
 *
 * @module agents/langgraph/nodes/response-generator
 */

import { DMState, NarrativeResponse } from '../state';
import { getAgentAdapter } from '../adapters/agent-adapter';
import { logger } from '@/lib/logger';

/**
 * Transform DMResponse format to NarrativeResponse format
 *
 * Converts the production agent's response structure to the format
 * expected by LangGraph state consumers.
 *
 * @param dmResponse - The response from DungeonMasterAgent
 * @returns NarrativeResponse in the expected state format
 */
function transformDMResponse(dmResponse: any): NarrativeResponse {
  const { environment, characters, opportunities } = dmResponse;

  // Transform activeNPCs array to npcs array with dialogue
  const npcs = characters.activeNPCs?.map((name: string) => ({
    name,
    dialogue: characters.dialogue || undefined,
  })) || [];

  return {
    description: environment.description,
    atmosphere: environment.atmosphere,
    npcs,
    availableActions: opportunities.immediate || [],
    consequences: opportunities.questHooks || [],
  };
}

/**
 * Generate DM narrative response
 *
 * Delegates to the production-tested DungeonMasterAgent via AgentAdapter.
 * Transforms the agent's response format to match LangGraph state expectations.
 *
 * @param state - Current graph state
 * @returns Updated state with generated response
 */
export async function generateResponse(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();

  try {
    const { playerInput, playerIntent } = state;

    if (!playerInput || !playerIntent) {
      logger.warn('[ResponseGenerator] Missing player input or intent');
      return {
        response: {
          description: 'I need more information to respond. What would you like to do?',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
        error: 'Missing player input or intent',
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    logger.info('[ResponseGenerator] Executing DM agent task', {
      playerInput: playerInput.substring(0, 50),
      intent: playerIntent,
    });

    // Call production-tested DM agent logic via adapter
    const result = await adapter.executeDMTask(state);

    if (!result.success || !result.data?.narrativeResponse) {
      const errorMsg = result.message || 'No narrative response from DM agent';
      logger.error('[ResponseGenerator] DM agent execution failed:', errorMsg);

      return {
        response: {
          description: `I encountered an issue generating a response: ${errorMsg}. Please try again.`,
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
        error: errorMsg,
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    // Transform the agent's response format to LangGraph state format
    const narrativeResponse = transformDMResponse(result.data.narrativeResponse);

    logger.info('[ResponseGenerator] DM response generated successfully');

    return {
      response: narrativeResponse,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('[ResponseGenerator] Error executing DM agent:', error);

    return {
      response: {
        description: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        atmosphere: 'neutral',
        npcs: [],
        availableActions: [],
        consequences: [],
      },
      error: error instanceof Error ? error.message : 'Failed to generate response',
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
