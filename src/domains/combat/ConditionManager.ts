/**
 * Condition Manager Module
 *
 * Handles adding, removing, and checking conditions on participants.
 * Pure TypeScript - NO React dependencies.
 */

import type { CombatParticipant, Condition, ConditionName } from './types';

/**
 * Add a condition to a participant
 */
export function addCondition(
  participant: CombatParticipant,
  condition: Condition,
): CombatParticipant {
  const hasCondition = participant.conditions.some((c) => c.name === condition.name);

  if (hasCondition) {
    return {
      ...participant,
      conditions: participant.conditions.map((c) => (c.name === condition.name ? condition : c)),
    };
  }

  return {
    ...participant,
    conditions: [...participant.conditions, condition],
  };
}

/**
 * Remove a condition from a participant
 */
export function removeCondition(
  participant: CombatParticipant,
  conditionName: ConditionName,
): CombatParticipant {
  return {
    ...participant,
    conditions: participant.conditions.filter((c) => c.name !== conditionName),
  };
}

/**
 * Check if a participant has a specific condition
 */
export function hasCondition(
  participant: CombatParticipant,
  conditionName: ConditionName,
): boolean {
  return participant.conditions.some((c) => c.name === conditionName);
}
