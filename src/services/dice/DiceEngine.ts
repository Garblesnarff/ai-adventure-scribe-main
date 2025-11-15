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
        critical: die.sides === 20 && (die.value === 20 || die.value === 1),
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
      secret,
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
        length: match[0].length,
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
      (match, count, sides) => `${parseInt(count) * 2}d${sides}`,
    );

    return this.roll(criticalExpression, { purpose: 'critical damage' });
  }

  /**
   * Get weapon damage formula by weapon name with actual character modifiers
   */
  static getWeaponDamageFormula(
    weaponName: string,
    character?: import('@/types/character').Character,
    preferredAbility?: 'str' | 'dex',
  ): string {
    const weaponData: Record<
      string,
      { damage: string; versatile?: string; finesse?: boolean; ranged?: boolean }
    > = {
      // Simple melee weapons
      club: { damage: '1d4' },
      dagger: { damage: '1d4', finesse: true },
      dart: { damage: '1d4', ranged: true },
      javelin: { damage: '1d6' },
      mace: { damage: '1d6' },
      staff: { damage: '1d6', versatile: '1d8' },
      spear: { damage: '1d6', versatile: '1d8' },

      // Martial melee weapons
      battleaxe: { damage: '1d8', versatile: '1d10' },
      longsword: { damage: '1d8', versatile: '1d10' },
      rapier: { damage: '1d8', finesse: true },
      scimitar: { damage: '1d6', finesse: true },
      shortsword: { damage: '1d6', finesse: true },
      warhammer: { damage: '1d8', versatile: '1d10' },
      greatsword: { damage: '2d6' },
      greataxe: { damage: '1d12' },
      maul: { damage: '2d6' },

      // Ranged weapons
      shortbow: { damage: '1d6', ranged: true },
      longbow: { damage: '1d8', ranged: true },
      crossbow: { damage: '1d8', ranged: true },
      handcrossbow: { damage: '1d6', ranged: true },
    };

    const weapon = weaponData[weaponName.toLowerCase()];
    if (!weapon) {
      // Default weapon - use character's STR if available
      const modifier = character?.abilityScores?.strength?.modifier ?? 0;
      return modifier >= 0 ? `1d6+${modifier}` : `1d6${modifier}`;
    }

    // Determine which ability to use
    let abilityToUse: 'strength' | 'dexterity' = 'strength';

    if (weapon.ranged) {
      // Ranged weapons always use dex
      abilityToUse = 'dexterity';
    } else if (weapon.finesse) {
      // Finesse weapons can use either STR or DEX - choose the better one
      if (character?.abilityScores) {
        const strMod = character.abilityScores.strength?.modifier ?? 0;
        const dexMod = character.abilityScores.dexterity?.modifier ?? 0;
        abilityToUse = preferredAbility === 'dex' || dexMod > strMod ? 'dexterity' : 'strength';
      } else {
        abilityToUse = preferredAbility === 'dex' ? 'dexterity' : 'strength';
      }
    }

    // Get the actual modifier value
    const modifier = character?.abilityScores?.[abilityToUse]?.modifier ?? 0;

    // Format the damage formula with proper +/- signs
    if (modifier === 0) {
      return weapon.damage;
    } else if (modifier > 0) {
      return `${weapon.damage}+${modifier}`;
    } else {
      return `${weapon.damage}${modifier}`;
    }
  }

  /**
   * Create an attack roll request with proper formula using character data
   */
  static createAttackRollRequest(
    weaponName: string,
    character?: import('@/types/character').Character,
    preferredAbility?: 'str' | 'dex',
  ): {
    formula: string;
    purpose: string;
  } {
    const weaponData: Record<string, { finesse?: boolean; ranged?: boolean }> = {
      dagger: { finesse: true },
      rapier: { finesse: true },
      scimitar: { finesse: true },
      shortsword: { finesse: true },
      shortbow: { ranged: true },
      longbow: { ranged: true },
      crossbow: { ranged: true },
      handcrossbow: { ranged: true },
      dart: { ranged: true },
    };

    const weapon = weaponData[weaponName.toLowerCase()];

    // Determine which ability to use for attack roll
    let abilityToUse: 'strength' | 'dexterity' = 'strength';

    if (weapon?.ranged) {
      abilityToUse = 'dexterity';
    } else if (weapon?.finesse && character?.abilityScores) {
      const strMod = character.abilityScores.strength?.modifier ?? 0;
      const dexMod = character.abilityScores.dexterity?.modifier ?? 0;
      abilityToUse = preferredAbility === 'dex' || dexMod > strMod ? 'dexterity' : 'strength';
    } else if (weapon?.finesse) {
      abilityToUse = preferredAbility === 'dex' ? 'dexterity' : 'strength';
    }

    // Calculate attack bonus: ability modifier + proficiency bonus
    const abilityMod = character?.abilityScores?.[abilityToUse]?.modifier ?? 0;
    const proficiencyBonus = character?.level ? Math.floor((character.level - 1) / 4) + 2 : 2;
    const attackBonus = abilityMod + proficiencyBonus;

    // Format the attack formula
    const formula = attackBonus >= 0 ? `1d20+${attackBonus}` : `1d20${attackBonus}`;

    return {
      formula,
      purpose: `Attack roll with ${weaponName}`,
    };
  }

  /**
   * Create a damage roll request with proper formula using character data
   */
  static createDamageRollRequest(
    weaponName: string,
    critical: boolean = false,
    character?: import('@/types/character').Character,
    preferredAbility?: 'str' | 'dex',
  ): {
    formula: string;
    purpose: string;
  } {
    const baseFormula = this.getWeaponDamageFormula(weaponName, character, preferredAbility);

    if (critical) {
      const criticalFormula = baseFormula.replace(
        /(\d+)d(\d+)/g,
        (match, count, sides) => `${parseInt(count) * 2}d${sides}`,
      );
      return {
        formula: criticalFormula,
        purpose: `Critical damage roll for ${weaponName}`,
      };
    }

    return {
      formula: baseFormula,
      purpose: `Damage roll for ${weaponName}`,
    };
  }

  /**
   * Check if a roll result is a critical hit
   */
  static isCriticalHit(result: DiceRollResult): boolean {
    return result.naturalRoll === 20 && result.rolls.some((r) => r.dice === 20);
  }

  /**
   * Check if a roll result is a critical miss
   */
  static isCriticalMiss(result: DiceRollResult): boolean {
    return result.naturalRoll === 1 && result.rolls.some((r) => r.dice === 20);
  }

  /**
   * Resolve advantage/disadvantage from multiple sources
   */
  static resolveAdvantage(
    sources: Array<{ advantage?: boolean; disadvantage?: boolean; source: string }>,
  ): {
    advantage: boolean;
    disadvantage: boolean;
    canceledOut: boolean;
  } {
    const advantageSources = sources.filter((s) => s.advantage);
    const disadvantageSources = sources.filter((s) => s.disadvantage);

    const hasAdvantage = advantageSources.length > 0;
    const hasDisadvantage = disadvantageSources.length > 0;

    return {
      advantage: hasAdvantage && !hasDisadvantage,
      disadvantage: hasDisadvantage && !hasAdvantage,
      canceledOut: hasAdvantage && hasDisadvantage,
    };
  }
}
