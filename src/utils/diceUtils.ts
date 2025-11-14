/**
 * Enhanced Dice Rolling Utilities for D&D 5e
 *
 * Handles advantage/disadvantage, critical hits, and proper D&D mechanics
 */

import type { DiceRoll, DamageType } from '@/types/combat';

export interface DiceRollOptions {
  advantage?: boolean;
  disadvantage?: boolean;
  criticalThreshold?: number; // 20 by default, 19-20 for champion
  halflingLucky?: boolean; // Reroll 1s
}

/**
 * Roll dice with D&D 5e mechanics
 */
export function rollDice(
  dieType: number,
  count: number = 1,
  modifier: number = 0,
  options: DiceRollOptions = {},
): DiceRoll {
  const { advantage, disadvantage, criticalThreshold = 20, halflingLucky } = options;

  // Can't have both advantage and disadvantage
  const hasAdvantage = advantage && !disadvantage;
  const hasDisadvantage = disadvantage && !advantage;

  const results: number[] = [];
  let keptResults: number[] = [];

  // Roll base dice
  for (let i = 0; i < count; i++) {
    let roll = Math.floor(Math.random() * dieType) + 1;

    // Halfling Lucky - reroll 1s
    if (halflingLucky && roll === 1) {
      roll = Math.floor(Math.random() * dieType) + 1;
    }

    results.push(roll);
  }

  // Handle advantage/disadvantage for d20 rolls
  if ((hasAdvantage || hasDisadvantage) && dieType === 20) {
    // Roll second d20
    let secondRoll = Math.floor(Math.random() * 20) + 1;

    // Halfling Lucky on second roll too
    if (halflingLucky && secondRoll === 1) {
      secondRoll = Math.floor(Math.random() * 20) + 1;
    }

    results.push(secondRoll);

    // Keep appropriate roll
    if (hasAdvantage) {
      keptResults = [Math.max(results[0], secondRoll)];
    } else {
      keptResults = [Math.min(results[0], secondRoll)];
    }
  } else {
    keptResults = [...results];
  }

  const naturalRoll = dieType === 20 ? keptResults[0] : undefined;
  const total = keptResults.reduce((sum, roll) => sum + roll, 0) + modifier;
  const critical = naturalRoll !== undefined && naturalRoll >= criticalThreshold;

  return {
    dieType,
    count,
    modifier,
    results,
    keptResults,
    total,
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
    critical,
    naturalRoll,
  };
}

/**
 * Roll attack with advantage/disadvantage
 */
export function rollAttack(attackBonus: number, options: DiceRollOptions = {}): DiceRoll {
  return rollDice(20, 1, attackBonus, options);
}

/**
 * Roll damage dice, doubling on critical hits
 */
export function rollDamage(
  diceString: string, // "1d8+3", "2d6", etc.
  critical: boolean = false,
  options: DiceRollOptions = {},
): DiceRoll[] {
  const damageRolls: DiceRoll[] = [];

  // Parse dice string (basic implementation)
  const parts = diceString.split('+');
  let modifier = 0;

  if (parts.length > 1) {
    modifier = parseInt(parts[1]) || 0;
  }

  const dicePart = parts[0];
  const diceMatch = dicePart.match(/(\d+)d(\d+)/);

  if (diceMatch) {
    let count = parseInt(diceMatch[1]);
    const dieType = parseInt(diceMatch[2]);

    // Critical hits double dice, not modifiers
    if (critical) {
      count *= 2;
    }

    const roll = rollDice(dieType, count, modifier, options);
    damageRolls.push(roll);
  }

  return damageRolls;
}

/**
 * Calculate damage with resistances, immunities, and vulnerabilities
 */
export function calculateDamage(
  baseDamage: number,
  damageType: DamageType,
  resistances: DamageType[] = [],
  immunities: DamageType[] = [],
  vulnerabilities: DamageType[] = [],
): number {
  // Immunity negates all damage
  if (immunities.includes(damageType)) {
    return 0;
  }

  let finalDamage = baseDamage;

  // Resistance halves damage (rounded down)
  if (resistances.includes(damageType)) {
    finalDamage = Math.floor(finalDamage / 2);
  }

  // Vulnerability doubles damage
  if (vulnerabilities.includes(damageType)) {
    finalDamage = finalDamage * 2;
  }

  return Math.max(0, finalDamage);
}

/**
 * Roll a saving throw with advantage/disadvantage
 */
export function rollSavingThrow(
  abilityModifier: number,
  proficiencyBonus: number = 0,
  options: DiceRollOptions = {},
): DiceRoll {
  return rollDice(20, 1, abilityModifier + proficiencyBonus, options);
}

/**
 * Roll ability check with advantage/disadvantage
 */
export function rollAbilityCheck(
  abilityModifier: number,
  proficiencyBonus: number = 0,
  options: DiceRollOptions = {},
): DiceRoll {
  return rollDice(20, 1, abilityModifier + proficiencyBonus, options);
}

/**
 * Roll initiative with dex modifier and alert/disengage bonuses
 */
export function rollInitiative(
  dexModifier: number,
  bonuses: number = 0,
  options: DiceRollOptions = {},
): DiceRoll {
  return rollDice(20, 1, dexModifier + bonuses, options);
}

/**
 * Roll initiative for multiple participants (group initiative resolution)
 */
export function rollGroupInitiative(
  participants: {
    id: string;
    dexModifier: number;
    bonuses?: number;
    groupId?: string;
    options?: DiceRollOptions;
  }[],
): Array<{
  participantId: string;
  roll: DiceRoll;
  initiative: number;
}> {
  const results = participants.map((participant) => {
    const roll = rollInitiative(
      participant.dexModifier,
      participant.bonuses || 0,
      participant.options || {},
    );

    // For group initiative, all group members share the same result
    const initiative = roll.total + (participant.groupId ? 0 : 0); // Group init bonus can be added later

    return {
      participantId: participant.id,
      roll,
      initiative: initiative,
    };
  });

  return results;
}

/**
 * Reroll initiative (for delayed/jump-forward actions)
 */
export function rerollInitiative(
  dexModifier: number,
  bonuses: number = 0,
  options: DiceRollOptions = {},
  minInitiative?: number, // Optional: ensure reroll is higher than current
): DiceRoll {
  let initiative: DiceRoll;

  do {
    initiative = rollDice(20, 1, dexModifier + bonuses, options);
  } while (minInitiative && initiative.total < minInitiative);

  return initiative;
}

/**
 * Parse dice string to get die type and count
 */
export function parseDiceString(diceString: string): {
  dieType: number;
  count: number;
  modifier: number;
} {
  const parts = diceString.split('+');
  let modifier = 0;

  if (parts.length > 1) {
    modifier = parseInt(parts[1]) || 0;
  }

  const dicePart = parts[0];
  const diceMatch = dicePart.match(/(\d+)d(\d+)/);

  if (diceMatch) {
    return {
      count: parseInt(diceMatch[1]),
      dieType: parseInt(diceMatch[2]),
      modifier,
    };
  }

  return { count: 1, dieType: 20, modifier: 0 };
}
