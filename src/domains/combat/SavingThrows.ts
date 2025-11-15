/**
 * Saving Throws Module
 *
 * Handles saving throws and concentration checks.
 * Pure TypeScript - NO React dependencies.
 */

import type { CombatParticipant, DiceRoll } from './types';

import { rollDie } from '@/utils/diceRolls';

/**
 * Roll a saving throw
 */
export function rollSavingThrow(
  savingThrowBonus: number,
  dc: number,
  options?: {
    advantage?: boolean;
    disadvantage?: boolean;
  },
): { roll: DiceRoll; success: boolean } {
  const hasAdvantage = options?.advantage && !options?.disadvantage;
  const hasDisadvantage = options?.disadvantage && !options?.advantage;

  let rolls: number[];
  let keptRolls: number[];

  if (hasAdvantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    const kept = Math.max(roll1, roll2);
    keptRolls = [kept];
  } else if (hasDisadvantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    const kept = Math.min(roll1, roll2);
    keptRolls = [kept];
  } else {
    const roll = rollDie(20);
    rolls = [roll];
    keptRolls = [roll];
  }

  const naturalRoll = keptRolls[0];
  const total = naturalRoll + savingThrowBonus;

  const diceRoll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier: savingThrowBonus,
    results: rolls,
    keptResults: keptRolls,
    total,
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
    naturalRoll,
  };

  const success = total >= dc;

  return { roll: diceRoll, success };
}

/**
 * Check concentration after taking damage
 */
export function checkConcentration(
  participant: CombatParticipant,
  damage: number,
  constitutionSaveBonus: number = 0,
): { maintained: boolean; roll: DiceRoll } {
  if (!participant.activeConcentration) {
    return {
      maintained: true,
      roll: {
        dieType: 20,
        count: 0,
        modifier: 0,
        results: [],
        keptResults: [],
        total: 0,
      },
    };
  }

  const dc = Math.max(10, Math.floor(damage / 2));
  const { roll, success } = rollSavingThrow(constitutionSaveBonus, dc);

  return { maintained: success, roll };
}

/**
 * Break concentration (e.g., casting a new concentration spell)
 */
export function breakConcentration(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    activeConcentration: null,
  };
}
