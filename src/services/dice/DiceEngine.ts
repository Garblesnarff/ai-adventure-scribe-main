import { DiceRoll } from '@dice-roller/rpg-dice-roller';

export interface DiceRollResult {
  expression: string;
  total: number;
  rolls: Array<{
    dice: number;
    value: number;
    critical?: boolean;
  }>;
  modifiers: number;
  advantage?: boolean;
  disadvantage?: boolean;
  critical?: boolean;
  naturalRoll?: number;
  timestamp: number;
  purpose?: string;
  actorId?: string;
  secret?: boolean;
}

export interface DiceRollOptions {
  advantage?: boolean;
  disadvantage?: boolean;
  purpose?: string;
  actorId?: string;
  secret?: boolean;
}

export class DiceEngine {
  /**
   * Roll dice using the improved dice roller
   */
  static roll(expression: string, options: DiceRollOptions = {}): DiceRollResult {
    const { advantage, disadvantage, purpose, actorId, secret } = options;

    // Handle advantage/disadvantage for d20 rolls
    let finalExpression = expression;
    if ((advantage || disadvantage) && expression.includes('d20')) {
      // Extract the d20 part and modifiers
      const d20Match = expression.match(/(\d*)d20([+-]\d+)?/);
      if (d20Match) {
        const count = d20Match[1] || '1';
        const modifier = d20Match[2] || '';

        if (advantage && !disadvantage) {
          finalExpression = expression.replace(/(\d*)d20/, `${count}d20kh1`);
        } else if (disadvantage && !advantage) {
          finalExpression = expression.replace(/(\d*)d20/, `${count}d20kl1`);
        }
        // If both advantage and disadvantage, they cancel out (normal roll)
      }
    }

    const roll = new DiceRoll(finalExpression);

    // Extract individual die results
    const rolls = [];
    let naturalRoll: number | undefined;

    // Parse the roll output to extract individual dice
    for (const die of roll.rolls) {
      if (die.sides === 20 && rolls.length === 0) {
        naturalRoll = die.value;
      }
      rolls.push({
        dice: die.sides,
        value: die.value,
        critical: die.sides === 20 && (die.value === 20 || die.value === 1)
      });
    }

    // Determine if this is a critical hit/miss for d20 rolls
    const isCritical = naturalRoll === 20;
    const isCriticalMiss = naturalRoll === 1;

    return {
      expression: finalExpression,
      total: roll.total,
      rolls,
      modifiers: roll.total - rolls.reduce((sum, r) => sum + r.value, 0),
      advantage: advantage && !disadvantage,
      disadvantage: disadvantage && !advantage,
      critical: isCritical,
      naturalRoll,
      timestamp: Date.now(),
      purpose,
      actorId,
      secret
    };
  }

  /**
   * Parse a string to find dice expressions
   * Used for parsing DM messages with embedded dice
   */
  static findDiceExpressions(text: string): Array<{
    expression: string;
    purpose?: string;
    index: number;
    length: number;
  }> {
    // Match patterns like [DICE: 1d20+5 attack] or [DICE: 2d6+3]
    const dicePattern = /\[DICE:\s*([^\]]+?)(?:\s+([^\]]+?))?\]/g;
    const matches = [];
    let match;

    while ((match = dicePattern.exec(text)) !== null) {
      const expression = match[1].trim();
      const purpose = match[2]?.trim();

      matches.push({
        expression,
        purpose,
        index: match.index,
        length: match[0].length
      });
    }

    return matches;
  }

  /**
   * Calculate critical damage according to 5e rules
   * Double the dice, not the total
   */
  static calculateCriticalDamage(baseDamageExpression: string): DiceRollResult {
    // Parse the expression to double only the dice portions
    const criticalExpression = baseDamageExpression.replace(
      /(\d+)d(\d+)/g,
      (match, count, sides) => `${parseInt(count) * 2}d${sides}`
    );

    return this.roll(criticalExpression, { purpose: 'critical damage' });
  }

  /**
   * Resolve advantage/disadvantage from multiple sources
   */
  static resolveAdvantage(sources: Array<{ advantage?: boolean; disadvantage?: boolean; source: string }>): {
    advantage: boolean;
    disadvantage: boolean;
    canceledOut: boolean;
  } {
    const advantageSources = sources.filter(s => s.advantage);
    const disadvantageSources = sources.filter(s => s.disadvantage);

    const hasAdvantage = advantageSources.length > 0;
    const hasDisadvantage = disadvantageSources.length > 0;

    return {
      advantage: hasAdvantage && !hasDisadvantage,
      disadvantage: hasDisadvantage && !hasAdvantage,
      canceledOut: hasAdvantage && hasDisadvantage
    };
  }
}