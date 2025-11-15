/**
 * Death Saves Module
 *
 * Handles death saving throws and death/unconsciousness states.
 * Pure TypeScript - NO React dependencies.
 */

import type { CombatParticipant, DiceRoll, DeathSaveResult } from './types';

import { rollDie } from '@/utils/diceRolls';

/**
 * Roll a death saving throw
 */
export function rollDeathSave(participant: CombatParticipant): {
  result: DeathSaveResult;
  roll: DiceRoll;
  updatedParticipant: CombatParticipant;
} {
  if (participant.currentHitPoints > 0) {
    throw new Error('Cannot roll death save when conscious');
  }

  if (participant.deathSaves.failures >= 3) {
    throw new Error('Participant is already dead');
  }

  const naturalRoll = rollDie(20);
  const diceRoll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier: 0,
    results: [naturalRoll],
    keptResults: [naturalRoll],
    total: naturalRoll,
    naturalRoll,
  };

  let result: DeathSaveResult;
  let updatedParticipant = { ...participant };

  if (naturalRoll === 20) {
    result = 'critical';
    updatedParticipant = {
      ...participant,
      currentHitPoints: 1,
      deathSaves: { successes: 0, failures: 0 },
    };
  } else if (naturalRoll === 1) {
    result = 'failure';
    const newFailures = Math.min(3, participant.deathSaves.failures + 2);
    updatedParticipant = {
      ...participant,
      deathSaves: {
        successes: participant.deathSaves.successes,
        failures: newFailures,
      },
    };
  } else if (naturalRoll >= 10) {
    result = 'success';
    const newSuccesses = participant.deathSaves.successes + 1;
    updatedParticipant = {
      ...participant,
      deathSaves: {
        successes: newSuccesses,
        failures: participant.deathSaves.failures,
        isStable: newSuccesses >= 3,
      },
    };
  } else {
    result = 'failure';
    const newFailures = participant.deathSaves.failures + 1;
    updatedParticipant = {
      ...participant,
      deathSaves: {
        successes: participant.deathSaves.successes,
        failures: newFailures,
      },
    };
  }

  return { result, roll: diceRoll, updatedParticipant };
}

/**
 * Check if a participant is dead
 */
export function isDead(participant: CombatParticipant): boolean {
  return participant.deathSaves.failures >= 3;
}

/**
 * Check if a participant is unconscious
 */
export function isUnconscious(participant: CombatParticipant): boolean {
  return participant.currentHitPoints <= 0 && !isDead(participant);
}

/**
 * Check if a participant is stable
 */
export function isStable(participant: CombatParticipant): boolean {
  return (
    participant.currentHitPoints <= 0 &&
    (participant.deathSaves.isStable === true || participant.deathSaves.successes >= 3)
  );
}

/**
 * Stabilize a dying participant
 */
export function stabilize(participant: CombatParticipant): CombatParticipant {
  if (participant.currentHitPoints > 0) {
    return participant;
  }

  return {
    ...participant,
    deathSaves: {
      successes: participant.deathSaves.successes,
      failures: participant.deathSaves.failures,
      isStable: true,
    },
  };
}

/**
 * Apply massive damage (instant death check)
 */
export function checkMassiveDamage(
  participant: CombatParticipant,
  damageAmount: number,
): { instantDeath: boolean; excessDamage: number } {
  if (participant.currentHitPoints > 0) {
    return { instantDeath: false, excessDamage: 0 };
  }

  const excessDamage = damageAmount - participant.currentHitPoints;
  const instantDeath = excessDamage >= participant.maxHitPoints;

  return { instantDeath, excessDamage };
}
