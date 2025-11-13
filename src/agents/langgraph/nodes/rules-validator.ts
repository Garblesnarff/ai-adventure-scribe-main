/**
 * Rules Validator Node
 *
 * Validates player actions against D&D 5E rules using the RulesInterpreterAgent.
 * Ensures game mechanics are followed correctly.
 *
 * @module agents/langgraph/nodes/rules-validator
 */

import { DMState, RuleCheckResult, DiceRollRequest } from '../state';
import { getAgentAdapter } from '../adapters/agent-adapter';
import { logger } from '@/lib/logger';

/**
 * Determine dice roll requirements from intent and input
 *
 * This D&D 5E specific logic determines what type of roll is needed
 * based on the player's intent and action description.
 */
function determineDiceRollRequirement(
  intent: string,
  playerInput: string
): DiceRollRequest | null {
  const lowerInput = playerInput.toLowerCase();

  // Attack actions always need rolls
  if (intent === 'attack' || /attack|hit|strike/.test(lowerInput)) {
    return {
      type: 'attack',
      formula: '1d20',
      reason: 'attack roll',
    };
  }

  // Skill checks
  if (intent === 'skill_check' || /check|attempt/.test(lowerInput)) {
    let skill = 'ability';
    if (/perception/.test(lowerInput)) skill = 'Perception';
    else if (/investigation/.test(lowerInput)) skill = 'Investigation';
    else if (/stealth/.test(lowerInput)) skill = 'Stealth';
    else if (/athletics/.test(lowerInput)) skill = 'Athletics';
    else if (/persuasion/.test(lowerInput)) skill = 'Persuasion';

    return {
      type: 'check',
      formula: '1d20',
      reason: `${skill} check`,
      dc: 15, // Default DC
      skill,
    };
  }

  // Saving throws
  if (/save|saving throw/.test(lowerInput)) {
    return {
      type: 'save',
      formula: '1d20',
      reason: 'saving throw',
      dc: 15,
    };
  }

  return null;
}

/**
 * Validate action against D&D 5E rules
 *
 * Uses RulesInterpreterAgent via AgentAdapter to validate player actions.
 * Preserves dice roll detection logic specific to LangGraph flow.
 *
 * @param state - Current graph state
 * @returns Updated state with rules validation result
 */
export async function validateRules(state: DMState): Promise<Partial<DMState>> {
  try {
    const { playerInput, playerIntent } = state;

    if (!playerInput || !playerIntent) {
      logger.warn('[RulesValidator] Missing player input or intent');
      return {
        rulesValidation: {
          isValid: false,
          reasoning: 'Missing player input or intent',
          modifications: [],
        },
        error: 'Cannot validate without player input and intent',
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    logger.info(`[RulesValidator] Validating rules for intent: ${playerIntent}`);

    const adapter = getAgentAdapter();
    const result = await adapter.executeRulesTask(state, playerIntent);

    // Extract validation results from agent response
    const validationResults = result.data?.validationResults;
    const validation: RuleCheckResult = validationResults
      ? {
          isValid: validationResults.isValid ?? true,
          reasoning: validationResults.errors?.length
            ? validationResults.errors.join('; ')
            : 'Action appears valid according to D&D 5E rules',
          modifications: validationResults.suggestions || [],
          ruleReferences: validationResults.validations?.map((v: any) => v.reference) || [],
        }
      : {
          isValid: true,
          reasoning: 'Action appears valid based on basic rules',
          modifications: [],
          ruleReferences: [],
        };

    // Determine dice roll requirements (D&D 5E specific logic)
    const diceRollRequest = determineDiceRollRequirement(playerIntent, playerInput);

    logger.info(
      `[RulesValidator] Validation complete: ${validation.isValid ? 'valid' : 'invalid'}` +
        (diceRollRequest ? `, requires ${diceRollRequest.type} roll` : '')
    );

    return {
      rulesValidation: validation,
      requiresDiceRoll: diceRollRequest,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('[RulesValidator] Rules validation failed:', error);
    return {
      rulesValidation: {
        isValid: false,
        reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modifications: [],
      },
      error: `Rules validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
