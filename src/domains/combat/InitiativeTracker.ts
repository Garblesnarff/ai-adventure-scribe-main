/**
 * Initiative Tracker Module
 *
 * Handles initiative rolling, sorting, and order management for D&D 5e combat.
 * Pure TypeScript - NO React dependencies.
 */

import type { CombatParticipant, DiceRoll, InitiativeRollResult } from './types';

import { rollDie } from '@/utils/diceRolls';

/**
 * Roll initiative for a single participant
 */
export function rollInitiativeForParticipant(
  participant: CombatParticipant,
  initiativeModifier?: number,
): InitiativeRollResult {
  const modifier = initiativeModifier ?? participant.initiative ?? 0;
  const roll = rollDie(20);
  const total = roll + modifier;

  const diceRoll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier,
    results: [roll],
    keptResults: [roll],
    total,
    naturalRoll: roll,
  };

  return {
    participantId: participant.id,
    initiative: total,
    roll: diceRoll,
  };
}

/**
 * Roll initiative for multiple participants
 */
export function rollInitiativeForAll(
  participants: CombatParticipant[],
): Map<string, InitiativeRollResult> {
  const results = new Map<string, InitiativeRollResult>();

  for (const participant of participants) {
    const result = rollInitiativeForParticipant(participant);
    results.set(participant.id, result);
  }

  return results;
}

/**
 * Sort participants by initiative (highest first)
 * Handles ties by using dexterity score if available, otherwise preserves order
 */
export function sortByInitiative(participants: CombatParticipant[]): CombatParticipant[] {
  return [...participants].sort((a, b) => {
    // Primary sort: initiative value (higher is better)
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }

    // Tie-breaker 1: Dexterity modifier (if available)
    // Note: This would require dexterity score to be available on participant
    // For now, we preserve the original order on ties

    return 0;
  });
}

/**
 * Update a participant's initiative and re-sort the list
 */
export function updateInitiative(
  participants: CombatParticipant[],
  participantId: string,
  newInitiative: number,
): CombatParticipant[] {
  const updated = participants.map((p) =>
    p.id === participantId ? { ...p, initiative: newInitiative } : p,
  );

  return sortByInitiative(updated);
}

/**
 * Reorder participants manually (e.g., drag-and-drop in UI)
 */
export function reorderParticipants(
  participants: CombatParticipant[],
  newOrder: string[],
): CombatParticipant[] {
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const reordered: CombatParticipant[] = [];

  for (const id of newOrder) {
    const participant = participantMap.get(id);
    if (participant) {
      reordered.push(participant);
      participantMap.delete(id);
    }
  }

  // Add any participants not in the new order at the end
  for (const participant of participantMap.values()) {
    reordered.push(participant);
  }

  return reordered;
}

/**
 * Get the current initiative order as a list of participant IDs
 */
export function getInitiativeOrder(participants: CombatParticipant[]): string[] {
  return sortByInitiative(participants).map((p) => p.id);
}

/**
 * Find the participant with the highest initiative
 */
export function getFirstInInitiative(
  participants: CombatParticipant[],
): CombatParticipant | undefined {
  if (participants.length === 0) return undefined;
  return sortByInitiative(participants)[0];
}

/**
 * Group participants by initiative value (for tied initiatives)
 */
export function groupByInitiative(
  participants: CombatParticipant[],
): Map<number, CombatParticipant[]> {
  const groups = new Map<number, CombatParticipant[]>();

  for (const participant of participants) {
    const initiative = participant.initiative;
    const group = groups.get(initiative) || [];
    group.push(participant);
    groups.set(initiative, group);
  }

  return groups;
}
