/**
 * Dice Roller Node
 *
 * Executes dice rolls when required by rules validation.
 * Handles advantage/disadvantage and compares results against DC/AC.
 *
 * @module agents/langgraph/nodes/dice-roller
 */

import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import type { DMState, DiceRollResult } from '../state';
import logger from '@/lib/logger';

/**
 * Execute a dice roll based on the state's dice roll request
 *
 * Processes the dice roll request from rules validation, applies
 * advantage/disadvantage modifiers, executes the roll, and determines
 * success based on the roll type (check, save, attack).
 *
 * @param state - Current graph state with dice roll request
 * @returns Updated state with dice roll result in metadata
 */
export async function rollDice(state: DMState): Promise<Partial<DMState>> {
  try {
    const { requiresDiceRoll } = state;

    // Skip if no roll is needed
    if (!requiresDiceRoll) {
      logger.debug('[DiceRoller] No dice roll required, skipping');
      return {};
    }

    const { type, formula, dc, ac, advantage, disadvantage, reason } = requiresDiceRoll;

    logger.info(`[DiceRoller] Rolling dice: ${formula} for ${reason} (type: ${type})`);

    // Validate formula
    if (!formula) {
      logger.error('[DiceRoller] No formula provided in dice roll request');
      return {
        error: 'Invalid dice roll: no formula specified',
        requiresDiceRoll: null,
      };
    }

    let rollFormula = formula;

    // Apply advantage/disadvantage for d20 rolls
    if ((advantage || disadvantage) && formula.includes('d20')) {
      if (advantage && !disadvantage) {
        // Roll 2d20 and keep highest
        rollFormula = formula.replace(/(\d*)d20/i, '2d20kh1');
        logger.debug('[DiceRoller] Applying advantage: rolling 2d20kh1');
      } else if (disadvantage && !advantage) {
        // Roll 2d20 and keep lowest
        rollFormula = formula.replace(/(\d*)d20/i, '2d20kl1');
        logger.debug('[DiceRoller] Applying disadvantage: rolling 2d20kl1');
      } else if (advantage && disadvantage) {
        // Both cancel out - normal roll
        logger.debug('[DiceRoller] Advantage and disadvantage cancel out, rolling normally');
      }
    }

    // Execute the roll using the dice roller library
    let roll: DiceRoll;
    try {
      roll = new DiceRoll(rollFormula);
    } catch (error) {
      logger.error('[DiceRoller] Failed to parse dice formula:', error);
      return {
        error: `Invalid dice formula: ${rollFormula}`,
        requiresDiceRoll: null,
      };
    }

    const total = roll.total;
    logger.info(`[DiceRoller] Roll result: ${total} (formula: ${rollFormula})`);

    // Determine success based on type
    let success = false;
    let successMessage = '';

    if (type === 'check' || type === 'save') {
      if (dc !== undefined) {
        success = total >= dc;
        successMessage = success
          ? `Success! Rolled ${total} vs DC ${dc}`
          : `Failed. Rolled ${total} vs DC ${dc}`;
        logger.info(`[DiceRoller] ${type} ${successMessage}`);
      } else {
        logger.warn(`[DiceRoller] ${type} roll but no DC specified`);
      }
    } else if (type === 'attack') {
      if (ac !== undefined) {
        success = total >= ac;
        successMessage = success
          ? `Hit! Rolled ${total} vs AC ${ac}`
          : `Miss. Rolled ${total} vs AC ${ac}`;
        logger.info(`[DiceRoller] Attack ${successMessage}`);
      } else {
        logger.warn('[DiceRoller] Attack roll but no AC specified');
      }
    } else if (type === 'damage') {
      // Damage rolls don't have success/failure
      success = true;
      logger.info(`[DiceRoller] Damage roll: ${total}`);
    }

    // Build the result object
    const result: DiceRollResult = {
      formula: rollFormula,
      total,
      rolls: roll.rolls,
      success,
      dc,
      ac,
      type,
    };

    // Log detailed roll information for debugging
    logger.debug('[DiceRoller] Roll details:', {
      originalFormula: formula,
      actualFormula: rollFormula,
      total,
      success,
      advantage,
      disadvantage,
      rolls: roll.rolls.map(r => ({
        sides: r.sides,
        value: r.value,
      })),
    });

    return {
      requiresDiceRoll: null, // Clear the request
      metadata: {
        ...state.metadata,
        lastDiceRoll: result,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('[DiceRoller] Unexpected error during dice roll:', error);
    return {
      error: `Dice roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requiresDiceRoll: null, // Clear the request even on error
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
