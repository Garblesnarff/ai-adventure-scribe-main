import type { CombatParticipant, DiceRoll } from '@/types/combat';

import { d20 } from '@/utils/diceRolls';

/**
 * Checks if a participant needs to make a death saving throw.
 * A character needs to make death saves if they are at 0 HP and not yet stable or dead.
 * @param participant The combat participant to check.
 * @returns True if the participant needs to make a death save, false otherwise.
 */
export const needsDeathSaves = (participant: CombatParticipant): boolean => {
  return (participant.currentHitPoints ?? 0) <= 0 && !participant.isStable && !participant.isDead;
};

/**
 * Rolls a death saving throw for a participant and updates their status.
 * - 20: Character regains 1 HP and becomes conscious.
 * - 10-19: One success.
 * - 2-9: One failure.
 * - 1: Two failures.
 * @param participant The participant making the death save.
 * @returns An object containing the updated participant and the dice roll details.
 */
export const rollDeathSave = (
  participant: CombatParticipant,
): { updatedParticipant: CombatParticipant; roll: DiceRoll } => {
  if (!needsDeathSaves(participant)) {
    // This should not be called if death saves are not needed, but as a safeguard:
    const roll: DiceRoll = {
      dieType: 20,
      count: 1,
      modifier: 0,
      results: [],
      keptResults: [],
      total: 0,
    };
    return { updatedParticipant: participant, roll };
  }

  const rollResult = d20();
  const currentSaves = participant.deathSaves || { successes: 0, failures: 0 };
  let newSaves = { ...currentSaves };
  let newHitPoints = participant.currentHitPoints;
  let isStable = participant.isStable;
  let isDead = participant.isDead;
  let isUnconscious = participant.isUnconscious;

  if (rollResult === 20) {
    // Critical success: regain 1 HP and consciousness.
    newHitPoints = 1;
    isStable = true;
    isUnconscious = false;
    newSaves = { successes: 0, failures: 0 }; // Reset saves
  } else if (rollResult >= 10) {
    // Success
    newSaves.successes = (newSaves.successes || 0) + 1;
  } else if (rollResult === 1) {
    // Critical failure
    newSaves.failures = (newSaves.failures || 0) + 2;
  } else {
    // Regular failure
    newSaves.failures = (newSaves.failures || 0) + 1;
  }

  if (newSaves.successes >= 3) {
    isStable = true;
    isUnconscious = true; // Still unconscious unless they regain HP
  }

  if (newSaves.failures >= 3) {
    isDead = true;
    isUnconscious = true;
  }

  const updatedParticipant: CombatParticipant = {
    ...participant,
    currentHitPoints: newHitPoints,
    deathSaves: newSaves,
    isStable,
    isDead,
    isUnconscious,
  };

  const roll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier: 0,
    results: [rollResult],
    keptResults: [rollResult],
    total: rollResult,
    critical: rollResult === 20,
    naturalRoll: rollResult,
  };

  return { updatedParticipant, roll };
};

/**
 * Stabilizes a dying participant (e.g., via a successful Medicine check or healing).
 * @param participant The participant to stabilize.
 * @returns The updated participant.
 */
export const stabilizeParticipant = (participant: CombatParticipant): CombatParticipant => {
  return {
    ...participant,
    isStable: true,
    deathSaves: { successes: 0, failures: 0 }, // Reset saves upon stabilization
  };
};
