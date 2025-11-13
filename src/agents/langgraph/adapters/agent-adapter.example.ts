/**
 * Agent Adapter Usage Examples
 *
 * Demonstrates how to use the AgentAdapter in LangGraph nodes
 * to call existing DungeonMasterAgent and RulesInterpreterAgent.
 *
 * @module agents/langgraph/adapters/agent-adapter.example
 */

import type { DMState } from '../state';
import { getAgentAdapter } from './agent-adapter';
import { logger } from '@/lib/logger';

/**
 * Example 1: Using AgentAdapter in a LangGraph node to call DungeonMasterAgent
 *
 * This replaces direct LLM calls with calls to the production-tested
 * DungeonMasterAgent, eliminating code duplication.
 */
export async function exampleDMNodeWithAdapter(state: DMState): Promise<Partial<DMState>> {
  try {
    // Get the singleton adapter instance
    const adapter = getAgentAdapter();

    // Convert DMState to AgentTask and execute via DungeonMasterAgent
    const result = await adapter.executeDMTask(state);

    // Extract narrative response from the agent result
    const narrativeData = result.data?.narrativeResponse;

    return {
      response: narrativeData || null,
      error: result.success ? null : result.message
    };
  } catch (error) {
    logger.error('Error in DM node with adapter', { error });
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example 2: Using AgentAdapter to validate rules with RulesInterpreterAgent
 *
 * This replaces direct rule validation logic with calls to the
 * production-tested RulesInterpreterAgent.
 */
export async function exampleRulesNodeWithAdapter(state: DMState): Promise<Partial<DMState>> {
  try {
    const adapter = getAgentAdapter();

    // Execute rules validation via RulesInterpreterAgent
    const result = await adapter.executeRulesTask(state, state.playerIntent || undefined);

    // Extract validation results
    const validation = result.data?.validationResults;

    return {
      rulesValidation: validation ? {
        isValid: validation.isValid,
        reasoning: validation.reasoning || '',
        modifications: validation.modifications || [],
        ruleReferences: validation.ruleReferences
      } : null,
      error: result.success ? null : result.message
    };
  } catch (error) {
    logger.error('Error in rules node with adapter', { error });
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example 3: Custom task execution with manual state-to-task conversion
 *
 * Use this when you need fine-grained control over the task parameters.
 */
export async function exampleCustomTaskExecution(state: DMState): Promise<Partial<DMState>> {
  try {
    const adapter = getAgentAdapter();

    // Manually convert state to task with custom description
    const task = adapter.stateToTask(state, 'Custom: Evaluate player action for consequences');

    // Add custom context
    task.context = {
      ...task.context,
      customFlag: true,
      evaluationMode: 'consequence-focused'
    };

    // Execute the custom task
    const result = await adapter.executeCustomDMTask(task);

    return {
      response: result.data?.narrativeResponse || null,
      error: result.success ? null : result.message
    };
  } catch (error) {
    logger.error('Error in custom task execution', { error });
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example 4: Direct agent access for specialized methods
 *
 * Use this when you need to call specialized methods on the agents
 * that aren't part of the standard executeTask flow.
 */
export async function exampleDirectAgentAccess(state: DMState): Promise<void> {
  const adapter = getAgentAdapter();

  // Get direct access to DM agent for specialized methods
  const dmAgent = adapter.getDMAgent();

  // Call specialized methods like planEncounter
  const encounter = dmAgent.planEncounter({
    type: 'combat',
    party: { members: [{ level: 5 }] },
    world: { biome: 'dungeon' },
    requestedDifficulty: 'medium',
    sessionId: state.worldContext?.sessionId
  });

  logger.info('Planned encounter', { encounter });
}

/**
 * Example 5: Error handling patterns
 *
 * Demonstrates proper error handling when using the adapter.
 */
export async function exampleErrorHandling(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();

  try {
    // executeDMTask throws on failure
    const result = await adapter.executeDMTask(state);

    return {
      response: result.data?.narrativeResponse || null,
      error: null
    };
  } catch (error) {
    logger.error('DM task failed', { error });

    // Fall back to a safe error state
    return {
      error: error instanceof Error ? error.message : 'Failed to process action',
      response: null
    };
  }
}

/**
 * Example 6: Using the adapter in a complete LangGraph workflow
 *
 * Shows how the adapter fits into a typical node implementation.
 */
export async function exampleCompleteNodeImplementation(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();

  // Validate state
  if (!state.playerInput || !state.worldContext) {
    logger.warn('Invalid state for DM node', {
      hasInput: !!state.playerInput,
      hasContext: !!state.worldContext
    });
    return {
      error: 'Missing required state: playerInput or worldContext'
    };
  }

  // Execute via adapter
  try {
    const result = await adapter.executeDMTask(state);

    // Transform result to DMState format
    const narrativeData = result.data?.narrativeResponse;

    logger.info('DM task completed', {
      success: result.success,
      hasNarrative: !!narrativeData
    });

    return {
      response: narrativeData ? {
        description: narrativeData.environment?.description || '',
        atmosphere: narrativeData.environment?.atmosphere,
        npcs: narrativeData.characters?.activeNPCs?.map(name => ({
          name,
          dialogue: narrativeData.characters?.dialogue
        })),
        availableActions: narrativeData.opportunities?.immediate || [],
        consequences: []
      } : null,
      error: null
    };
  } catch (error) {
    logger.error('DM task execution failed', { error });
    return {
      error: error instanceof Error ? error.message : 'Failed to execute task',
      response: null
    };
  }
}

/**
 * Example 7: Testing patterns with adapter reset
 *
 * Shows how to use resetAgentAdapter() in tests.
 */
export async function exampleTestingPattern() {
  // Import reset function for testing
  const { resetAgentAdapter } = await import('./agent-adapter');

  // Reset before each test to ensure clean state
  resetAgentAdapter();

  // Now get a fresh adapter instance
  const adapter = getAgentAdapter();

  // Test your node logic...
}
