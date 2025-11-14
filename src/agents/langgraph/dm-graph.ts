/**
 * Dungeon Master Agent Graph
 *
 * LangGraph workflow for the DM agent.
 * Orchestrates intent detection, rules validation, and response generation.
 *
 * Replaces the custom messaging system with a clearer, more maintainable
 * graph-based architecture.
 *
 * @module agents/langgraph/dm-graph
 */

import { StateGraph, END } from '@langchain/langgraph';
import { DMState, dmStateChannels } from './state';
import { detectIntent } from './nodes/intent-detector';
import { validateRules } from './nodes/rules-validator';
import { generateResponse } from './nodes/response-generator';
import { checkpointer } from './checkpointer';
import { LANGGRAPH_CONFIG } from './config';

/**
 * Conditional edge: Check for errors after intent detection
 */
function shouldContinueAfterIntent(state: DMState): string {
  if (state.error) {
    return 'end_with_error';
  }
  if (!state.playerIntent) {
    return 'end_with_error';
  }
  return 'validate_rules';
}

/**
 * Conditional edge: Check rules validation and dice roll requirements
 */
function shouldContinueAfterValidation(state: DMState): string {
  // If there's an error, end
  if (state.error) {
    return 'end_with_error';
  }

  // If validation failed, still generate response (DM explains why it's invalid)
  if (state.rulesValidation && !state.rulesValidation.isValid) {
    return 'generate_response';
  }

  // If dice roll is required, pause for human input
  if (state.requiresDiceRoll) {
    return 'request_dice_roll';
  }

  // Otherwise, proceed to response generation
  return 'generate_response';
}

/**
 * Conditional edge: Check if dice roll was provided
 */
function shouldContinueAfterDiceRoll(state: DMState): string {
  // For now, always proceed to response generation
  // In the future, this could wait for actual dice roll results
  return 'generate_response';
}

/**
 * Dice roll request node (human-in-the-loop)
 */
async function requestDiceRoll(state: DMState): Promise<Partial<DMState>> {
  // This node pauses execution
  // Frontend should detect requiresDiceRoll and show dice roller UI
  // User provides result, graph continues

  return {
    metadata: {
      ...state.metadata,
      stepCount: (state.metadata?.stepCount || 0) + 1,
    },
  };
}

/**
 * Error handling node
 */
async function handleError(state: DMState): Promise<Partial<DMState>> {
  return {
    response: {
      description: state.error || 'An error occurred. Please try again.',
      atmosphere: 'neutral',
      npcs: [],
      availableActions: [],
      consequences: [],
    },
  };
}

/**
 * Create the DM agent workflow graph
 *
 * Graph flow with conditional edges:
 * 1. detect_intent - Analyze player input
 *    -> If error: end_with_error
 *    -> Else: validate_rules
 * 2. validate_rules - Check D&D 5E rules
 *    -> If error: end_with_error
 *    -> If dice roll needed: request_dice_roll (human-in-the-loop)
 *    -> Else: generate_response
 * 3. request_dice_roll - Pause for human dice roll input
 *    -> generate_response
 * 4. generate_response - Create narrative response
 *    -> END
 * 5. end_with_error - Handle errors
 *    -> END
 *
 * @returns Compiled graph ready for execution
 */
function createDMGraph() {
  // Create the state graph with defined channels
  const workflow = new StateGraph<DMState>({
    channels: dmStateChannels as any,
  });

  // Add nodes
  workflow.addNode('detect_intent', detectIntent);
  workflow.addNode('validate_rules', validateRules);
  workflow.addNode('request_dice_roll', requestDiceRoll);
  workflow.addNode('generate_response', generateResponse);
  workflow.addNode('end_with_error', handleError);

  // Set entry point
  workflow.setEntryPoint('detect_intent');

  // Add conditional edges
  workflow.addConditionalEdges('detect_intent', shouldContinueAfterIntent, {
    validate_rules: 'validate_rules',
    end_with_error: 'end_with_error',
  });

  workflow.addConditionalEdges('validate_rules', shouldContinueAfterValidation, {
    request_dice_roll: 'request_dice_roll',
    generate_response: 'generate_response',
    end_with_error: 'end_with_error',
  });

  workflow.addConditionalEdges('request_dice_roll', shouldContinueAfterDiceRoll, {
    generate_response: 'generate_response',
  });

  // Add edges to END
  workflow.addEdge('generate_response', END);
  workflow.addEdge('end_with_error', END);

  // Compile the graph with checkpointing
  return workflow.compile({
    checkpointer,
    // Interrupt before dice roll to allow human input
    interruptBefore: ['request_dice_roll'],
    interruptAfter: [], // Can add node names to pause after
  });
}

/**
 * Compiled DM graph instance
 *
 * Use this to invoke the graph:
 * ```typescript
 * const result = await dmGraph.invoke(initialState, {
 *   configurable: { thread_id: sessionId }
 * });
 * ```
 */
export const dmGraph = createDMGraph();

/**
 * Invoke the DM graph with input
 *
 * Helper function that wraps graph invocation with proper
 * configuration and error handling.
 *
 * @param playerInput - Player's message/action
 * @param worldContext - Campaign and session context
 * @param threadId - Session ID for checkpoint persistence
 * @returns Final state with DM response
 */
export async function invokeDMGraph(
  playerInput: string,
  worldContext: any,
  threadId: string,
): Promise<DMState> {
  const initialState: DMState = {
    messages: [],
    playerInput,
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

  try {
    const result = await dmGraph.invoke(initialState, {
      configurable: {
        thread_id: threadId,
      },
      recursionLimit: LANGGRAPH_CONFIG.maxIterations,
    });

    return result as DMState;
  } catch (error) {
    console.error('[LangGraph] DM graph execution failed:', error);

    return {
      ...initialState,
      error: error instanceof Error ? error.message : 'Graph execution failed',
    };
  }
}

/**
 * Stream the DM graph execution
 *
 * For real-time updates as the graph executes.
 * Useful for showing progress to users.
 *
 * @param playerInput - Player's message/action
 * @param worldContext - Campaign and session context
 * @param threadId - Session ID for checkpoint persistence
 * @returns Async iterator of state updates
 */
export async function* streamDMGraph(playerInput: string, worldContext: any, threadId: string) {
  const initialState: DMState = {
    messages: [],
    playerInput,
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

  try {
    const stream = await dmGraph.stream(initialState, {
      configurable: {
        thread_id: threadId,
      },
      recursionLimit: LANGGRAPH_CONFIG.maxIterations,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error('[LangGraph] DM graph streaming failed:', error);
    yield {
      error: error instanceof Error ? error.message : 'Graph streaming failed',
    };
  }
}
