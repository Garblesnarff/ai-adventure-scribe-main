/**
 * Exhaustion System Utilities for D&D 5e
 *
 * Handles the 6-level exhaustion system with cumulative effects
 */

import type { ExhaustionEffect, Condition, CombatParticipant } from '@/types/combat';

/**
 * Exhaustion level effects (cumulative)
 */
export const EXHAUSTION_EFFECTS: ExhaustionEffect[] = [
  {
    level: 1,
    description: 'Disadvantage on ability checks',
    effect: {
      disadvantageOnAbilityChecks: true,
    },
  },
  {
    level: 2,
    description: 'Speed halved',
    effect: {
      disadvantageOnAbilityChecks: true,
      speedHalved: true,
    },
  },
  {
    level: 3,
    description: 'Disadvantage on attack rolls and saving throws',
    effect: {
      disadvantageOnAbilityChecks: true,
      speedHalved: true,
      disadvantageOnAttacksAndSaves: true,
    },
  },
  {
    level: 4,
    description: 'Hit point maximum halved',
    effect: {
      disadvantageOnAbilityChecks: true,
      speedHalved: true,
      disadvantageOnAttacksAndSaves: true,
      hitPointMaxHalved: true,
    },
  },
  {
    level: 5,
    description: 'Speed reduced to 0',
    effect: {
      disadvantageOnAbilityChecks: true,
      speedHalved: true,
      disadvantageOnAttacksAndSaves: true,
      hitPointMaxHalved: true,
      speedReducedToZero: true,
    },
  },
  {
    level: 6,
    description: 'Death',
    effect: {
      disadvantageOnAbilityChecks: true,
      speedHalved: true,
      disadvantageOnAttacksAndSaves: true,
      hitPointMaxHalved: true,
      speedReducedToZero: true,
      death: true,
    },
  },
];

/**
 * Get exhaustion level from conditions
 */
export function getExhaustionLevel(conditions: Condition[]): number {
  const exhaustionCondition = conditions.find((c) => c.name === 'exhaustion');
  return exhaustionCondition?.level || 0;
}

/**
 * Apply exhaustion level to participant
 */
export function applyExhaustion(participant: CombatParticipant, level: number): CombatParticipant {
  const currentLevel = getExhaustionLevel(participant.conditions);
  const newLevel = Math.min(6, Math.max(0, level));

  if (newLevel === 0) {
    // Remove exhaustion
    return {
      ...participant,
      conditions: participant.conditions.filter((c) => c.name !== 'exhaustion'),
    };
  }

  // Update or add exhaustion condition
  const otherConditions = participant.conditions.filter((c) => c.name !== 'exhaustion');
  const exhaustionCondition: Condition = {
    name: 'exhaustion',
    description: `Exhaustion Level ${newLevel}: ${EXHAUSTION_EFFECTS[newLevel - 1].description}`,
    duration: -1, // Permanent until removed
    level: newLevel,
  };

  return {
    ...participant,
    conditions: [...otherConditions, exhaustionCondition],
  };
}

/**
 * Increase exhaustion level by 1
 */
export function addExhaustionLevel(participant: CombatParticipant): CombatParticipant {
  const currentLevel = getExhaustionLevel(participant.conditions);
  return applyExhaustion(participant, currentLevel + 1);
}

/**
 * Decrease exhaustion level by 1
 */
export function removeExhaustionLevel(participant: CombatParticipant): CombatParticipant {
  const currentLevel = getExhaustionLevel(participant.conditions);
  return applyExhaustion(participant, currentLevel - 1);
}

/**
 * Check if participant should have disadvantage on ability checks
 */
export function hasDisadvantageOnAbilityChecks(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 1;
}

/**
 * Check if participant's speed should be halved
 */
export function hasSpeedHalved(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 2;
}

/**
 * Check if participant should have disadvantage on attacks and saves
 */
export function hasDisadvantageOnAttacksAndSaves(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 3;
}

/**
 * Check if participant's hit point maximum should be halved
 */
export function hasHitPointMaxHalved(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 4;
}

/**
 * Check if participant's speed should be reduced to 0
 */
export function hasSpeedReducedToZero(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 5;
}

/**
 * Check if participant should die from exhaustion
 */
export function shouldDieFromExhaustion(participant: CombatParticipant): boolean {
  const level = getExhaustionLevel(participant.conditions);
  return level >= 6;
}

/**
 * Get modified hit point maximum considering exhaustion
 */
export function getModifiedHitPointMax(participant: CombatParticipant): number {
  if (hasHitPointMaxHalved(participant)) {
    return Math.floor(participant.maxHitPoints / 2);
  }
  return participant.maxHitPoints;
}

/**
 * Process long rest exhaustion recovery
 */
export function processLongRestExhaustionRecovery(
  participant: CombatParticipant,
  hadFoodAndDrink: boolean = true,
): CombatParticipant {
  if (!hadFoodAndDrink) {
    return participant; // No recovery without food and drink
  }

  return removeExhaustionLevel(participant);
}

/**
 * Get exhaustion effect description for UI
 */
export function getExhaustionDescription(level: number): string {
  if (level <= 0 || level > 6) return 'No exhaustion';
  return EXHAUSTION_EFFECTS[level - 1].description;
}

/**
 * Get all active exhaustion effects for a participant
 */
export function getActiveExhaustionEffects(
  participant: CombatParticipant,
): ExhaustionEffect | null {
  const level = getExhaustionLevel(participant.conditions);
  if (level <= 0) return null;

  return EXHAUSTION_EFFECTS[level - 1];
}
