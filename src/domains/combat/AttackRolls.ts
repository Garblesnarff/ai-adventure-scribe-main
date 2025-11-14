/**
 * Attack Roll Module
 *
 * Handles attack rolls, damage rolls, and hit determination.
 * Pure TypeScript - NO React dependencies.
 */

import type { DiceRoll } from './types';

import { rollDie } from '@/utils/diceRolls';

/**
 * Roll an attack roll
 */
export function rollAttack(
  attackBonus: number,
  options?: {
    advantage?: boolean;
    disadvantage?: boolean;
  },
): { roll: DiceRoll; hit: boolean; targetAC?: number } {
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
  const total = naturalRoll + attackBonus;
  const isCritical = naturalRoll === 20;
  const isCriticalMiss = naturalRoll === 1;

  const diceRoll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier: attackBonus,
    results: rolls,
    keptResults: keptRolls,
    total,
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
    critical: isCritical,
    naturalRoll,
  };

  return { roll: diceRoll, hit: false };
}

/**
 * Determine if an attack hits based on roll and target AC
 */
export function doesAttackHit(attackRoll: DiceRoll, targetAC: number): boolean {
  if (attackRoll.critical) {
    return true;
  }

  if (attackRoll.naturalRoll === 1) {
    return false;
  }

  return attackRoll.total >= targetAC;
}

/**
 * Roll damage dice
 */
export function rollDamage(diceExpression: string, isCritical: boolean = false): DiceRoll {
  const match = diceExpression.match(/(\d+)d(\d+)(?:\+(\d+))?/);

  if (!match) {
    throw new Error(`Invalid dice expression: ${diceExpression}`);
  }

  let count = parseInt(match[1], 10);
  const dieType = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (isCritical) {
    count *= 2;
  }

  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(dieType));
  }

  const total = results.reduce((sum, roll) => sum + roll, 0) + modifier;

  return {
    dieType,
    count,
    modifier,
    results,
    keptResults: results,
    total,
    critical: isCritical,
  };
}

/**
 * Calculate critical hit damage multiplier
 */
export function getCriticalMultiplier(): number {
  return 2;
}
