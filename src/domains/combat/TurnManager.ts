/**
 * Turn Manager Module
 *
 * Handles turn progression, round advancement, and turn state management.
 * Pure TypeScript - NO React dependencies.
 */

import type { CombatParticipant, TurnAdvancementResult } from './types';

/**
 * Check if a participant can take their turn (not unconscious or dead)
 */
export function canTakeTurn(participant: CombatParticipant): boolean {
  // Participant is dead
  if (participant.currentHitPoints <= 0 && participant.deathSaves.failures >= 3) {
    return false;
  }

  // Participant is unconscious but stable or making death saves
  if (participant.currentHitPoints <= 0) {
    return false; // They can still roll death saves, but can't take normal turns
  }

  return true;
}

/**
 * Find the next participant who can take a turn
 */
export function findNextValidParticipant(
  participants: CombatParticipant[],
  currentIndex: number,
): { index: number; participant: CombatParticipant | undefined; wrappedAround: boolean } {
  if (participants.length === 0) {
    return { index: -1, participant: undefined, wrappedAround: false };
  }

  let nextIndex = currentIndex + 1;
  let wrappedAround = false;

  // Wrap around to start of initiative order
  if (nextIndex >= participants.length) {
    nextIndex = 0;
    wrappedAround = true;
  }

  // Find next valid participant
  const startIndex = nextIndex;
  while (nextIndex < participants.length) {
    const participant = participants[nextIndex];
    if (canTakeTurn(participant)) {
      return { index: nextIndex, participant, wrappedAround };
    }
    nextIndex++;
  }

  // If we didn't find anyone, wrap around and check from beginning
  if (!wrappedAround) {
    nextIndex = 0;
    wrappedAround = true;
    while (nextIndex < startIndex) {
      const participant = participants[nextIndex];
      if (canTakeTurn(participant)) {
        return { index: nextIndex, participant, wrappedAround };
      }
      nextIndex++;
    }
  }

  // No valid participants found
  return { index: -1, participant: undefined, wrappedAround: true };
}

/**
 * Advance to the next turn
 * Returns the next participant ID, new round number, and updates to apply
 */
export function advanceTurn(
  participants: CombatParticipant[],
  currentParticipantId: string | undefined,
  currentRound: number,
): TurnAdvancementResult {
  const currentIndex = currentParticipantId
    ? participants.findIndex((p) => p.id === currentParticipantId)
    : -1;

  const {
    index: nextIndex,
    participant: nextParticipant,
    wrappedAround,
  } = findNextValidParticipant(participants, currentIndex);

  // Calculate new round number
  const newRound = wrappedAround ? currentRound + 1 : currentRound;

  // Prepare updates for the next participant (reset action economy)
  const participantsToUpdate = new Map<string, Partial<CombatParticipant>>();

  if (nextParticipant) {
    participantsToUpdate.set(nextParticipant.id, {
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
      reactionOpportunities: [],
    });
  }

  return {
    nextParticipantId: nextParticipant?.id,
    newRound,
    participantsToUpdate,
  };
}

/**
 * Reset turn state for a participant (used when starting their turn)
 */
export function resetTurnState(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
  };
}

/**
 * Reset turn state for all participants (used at start of round)
 */
export function resetAllTurnStates(participants: CombatParticipant[]): CombatParticipant[] {
  return participants.map(resetTurnState);
}

/**
 * Get the current participant taking their turn
 */
export function getCurrentParticipant(
  participants: CombatParticipant[],
  currentParticipantId: string | undefined,
): CombatParticipant | undefined {
  if (!currentParticipantId) return undefined;
  return participants.find((p) => p.id === currentParticipantId);
}

/**
 * Get the index of the current participant
 */
export function getCurrentParticipantIndex(
  participants: CombatParticipant[],
  currentParticipantId: string | undefined,
): number {
  if (!currentParticipantId) return -1;
  return participants.findIndex((p) => p.id === currentParticipantId);
}

/**
 * Check if it's a specific participant's turn
 */
export function isParticipantsTurn(
  currentParticipantId: string | undefined,
  participantId: string,
): boolean {
  return currentParticipantId === participantId;
}

/**
 * Get the turn order number for a participant (1-indexed)
 */
export function getTurnOrderNumber(
  participants: CombatParticipant[],
  participantId: string,
): number {
  const index = participants.findIndex((p) => p.id === participantId);
  return index === -1 ? 0 : index + 1;
}

/**
 * Process end-of-turn effects (conditions with durations, etc.)
 * Returns updated conditions for each participant
 */
export function processEndOfTurnEffects(
  participants: CombatParticipant[],
  currentParticipantId: string,
): Map<string, Partial<CombatParticipant>> {
  const updates = new Map<string, Partial<CombatParticipant>>();

  for (const participant of participants) {
    // Decrement condition durations for the current participant
    if (participant.id === currentParticipantId) {
      const updatedConditions = participant.conditions
        .map((condition) => ({
          ...condition,
          duration: condition.duration > 0 ? condition.duration - 1 : condition.duration,
        }))
        .filter((condition) => condition.duration !== 0); // Remove expired conditions

      if (updatedConditions.length !== participant.conditions.length) {
        updates.set(participant.id, { conditions: updatedConditions });
      }
    }
  }

  return updates;
}

/**
 * Process start-of-turn effects
 * Returns updated state for each participant
 */
export function processStartOfTurnEffects(
  participant: CombatParticipant,
): Partial<CombatParticipant> {
  const updates: Partial<CombatParticipant> = {};

  // Check for conditions that trigger at start of turn
  // (e.g., ongoing damage, saving throws)
  // This would integrate with condition system

  return updates;
}
