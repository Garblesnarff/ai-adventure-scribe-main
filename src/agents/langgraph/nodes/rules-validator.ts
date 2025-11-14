/**
 * Rules Validator Node
 *
 * Validates player actions against D&D 5E rules.
 * Ensures game mechanics are followed correctly.
 *
 * @module agents/langgraph/nodes/rules-validator
 */

import { DMState, RuleCheckResult } from '../state';
import { GEMINI_TEXT_MODEL } from '@/config/ai';
import { getGeminiManager } from '@/services/ai/shared/utils';
import logger from '@/lib/logger';

/**
 * Rules validation prompt template
 */
const RULES_VALIDATION_PROMPT = `You are a D&D 5E rules expert. Validate the following player action.

Player Intent: {intent}
Player Action: {action}
Character Context: {context}

Check:
1. Is the action valid according to D&D 5E rules?
2. Does it require a dice roll?
3. What is the appropriate roll (attack, saving throw, ability check)?
4. What is the DC or AC if applicable?

Respond in JSON format:
{
  "isValid": true/false,
  "reasoning": "explanation",
  "needsRoll": true/false,
  "rollType": "attack|save|check|none",
  "rollFormula": "1d20+modifier",
  "rollReason": "what the roll is for",
  "dc": number or null,
  "ac": number or null,
  "skill": "relevant skill name or null",
  "warnings": ["any rule warnings"],
  "modifications": ["suggested changes"]
}`;

/**
 * Parse validation result from AI response
 */
function parseValidation(text: string): RuleCheckResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON found in rules validation response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isValid: parsed.isValid ?? true,
      reasoning: parsed.reasoning || 'No reasoning provided',
      modifications: parsed.modifications || [],
      ruleReferences: parsed.ruleReferences || [],
    };
  } catch (error) {
    logger.error('Failed to parse validation:', error);
    return null;
  }
}

/**
 * Determine dice roll requirements from intent
 */
function determineDiceRollRequirement(
  intent: string,
  playerInput: string,
): {
  needsRoll: boolean;
  formula?: string;
  reason?: string;
  dc?: number;
} {
  const lowerInput = playerInput.toLowerCase();

  // Attack actions always need rolls
  if (intent === 'attack' || /attack|hit|strike/.test(lowerInput)) {
    return {
      needsRoll: true,
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
      needsRoll: true,
      formula: '1d20',
      reason: `${skill} check`,
      dc: 15, // Default DC
    };
  }

  // Saving throws
  if (/save|saving throw/.test(lowerInput)) {
    return {
      needsRoll: true,
      formula: '1d20',
      reason: 'saving throw',
      dc: 15,
    };
  }

  // Most other actions don't need rolls
  return { needsRoll: false };
}

/**
 * Validate action against D&D 5E rules
 *
 * Checks if the player's intended action is valid according to
 * D&D 5E rules. Determines if dice rolls are needed.
 *
 * @param state - Current graph state
 * @returns Updated state with rules validation result
 */
export async function validateRules(state: DMState): Promise<Partial<DMState>> {
  try {
    const { playerInput, playerIntent, worldContext } = state;

    if (!playerInput || !playerIntent) {
      logger.warn('Missing player input or intent for rules validation');
      return {
        rulesValidation: {
          isValid: false,
          reasoning: 'Missing player input or intent',
          modifications: [],
        },
        error: 'Cannot validate without player input and intent',
      };
    }

    logger.info(`Validating rules for intent: ${playerIntent}`);

    // Determine if a dice roll is needed
    const rollRequirement = determineDiceRollRequirement(playerIntent, playerInput);

    // Use Gemini for complex validation
    try {
      const geminiManager = getGeminiManager();
      const characterContext = worldContext.characterIds?.[0]
        ? `Character ID: ${worldContext.characterIds[0]}`
        : 'No character context';

      const prompt = RULES_VALIDATION_PROMPT.replace('{intent}', playerIntent)
        .replace('{action}', playerInput)
        .replace('{context}', characterContext);

      const responseText = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      });

      const validation = parseValidation(responseText);

      if (validation) {
        logger.info(`Rules validation complete: ${validation.isValid ? 'valid' : 'invalid'}`);

        // Build dice roll request if needed
        let diceRollRequest = null;
        if (rollRequirement.needsRoll) {
          diceRollRequest = {
            formula: rollRequirement.formula!,
            reason: rollRequirement.reason!,
            dc: rollRequirement.dc,
          };
        }

        return {
          rulesValidation: validation,
          requiresDiceRoll: diceRollRequest,
          metadata: {
            ...state.metadata,
            stepCount: (state.metadata?.stepCount || 0) + 1,
          },
        };
      }
    } catch (aiError) {
      logger.warn('AI validation failed, using fallback:', aiError);
    }

    // Fallback: simple validation
    const fallbackValidation: RuleCheckResult = {
      isValid: true,
      reasoning: 'Action appears valid based on basic rules',
      modifications: [],
      ruleReferences: [],
    };

    let diceRollRequest = null;
    if (rollRequirement.needsRoll) {
      diceRollRequest = {
        formula: rollRequirement.formula!,
        reason: rollRequirement.reason!,
        dc: rollRequirement.dc,
      };
    }

    return {
      rulesValidation: fallbackValidation,
      requiresDiceRoll: diceRollRequest,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('Rules validation failed:', error);
    return {
      rulesValidation: {
        isValid: false,
        reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        modifications: [],
      },
      error: `Rules validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
