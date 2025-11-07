/**
 * Turns Slice
 *
 * Manages combat turn progression and round tracking.
 * Handles advancing turns, resetting turn actions, and managing initiative order.
 */

import { StateCreator } from 'zustand';
import { EncounterSlice } from './encounterSlice';
import { ParticipantsSlice } from './participantsSlice';

/**
 * Turns state interface
 */
export interface TurnsSlice {
  // State
  currentTurnId: string | null;
  round: number;

  // Actions
  nextTurn: () => void;
  startNewRound: () => void;
  setCurrentTurn: (participantId: string) => void;
  rerollInitiative: (participantId: string, newInitiative: number) => void;
  updateInitiativeOrder: (newOrder: string[]) => void;
}

/**
 * Creates the turns slice with state and actions
 *
 * @param set - Zustand set function for state updates
 * @param get - Zustand get function for state access
 * @returns Turns slice with state and actions
 */
export const createTurnsSlice: StateCreator<
  TurnsSlice & EncounterSlice & ParticipantsSlice,
  [],
  [],
  TurnsSlice
> = (set, get) => ({
  // Initial state
  currentTurnId: null,
  round: 1,

  // Advance to next turn
  nextTurn: () =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const { participants, currentTurnParticipantId } = state.activeEncounter;

      // Find current participant index
      const currentIndex = participants.findIndex(
        (p) => p.id === currentTurnParticipantId
      );

      let nextIndex = currentIndex + 1;
      let newRound = state.activeEncounter.currentRound;

      // If we've gone through all participants, start new round
      if (nextIndex >= participants.length) {
        nextIndex = 0;
        newRound += 1;
      }

      // Skip unconscious/dead participants
      while (nextIndex < participants.length) {
        const participant = participants[nextIndex];
        if (participant.currentHitPoints > 0 || participant.deathSaves.failures < 3) {
          break;
        }
        nextIndex++;
      }

      const nextParticipant = participants[nextIndex];
      if (!nextParticipant) return state;

      // Reset turn actions for the new participant
      const updatedParticipants = participants.map((p) =>
        p.id === nextParticipant.id
          ? {
              ...p,
              actionTaken: false,
              bonusActionTaken: false,
              reactionTaken: false,
              movementUsed: 0,
              reactionOpportunities: [],
            }
          : p
      );

      return {
        activeEncounter: {
          ...state.activeEncounter,
          currentRound: newRound,
          currentTurnParticipantId: nextParticipant.id,
          roundsElapsed: newRound,
          participants: updatedParticipants,
        },
        currentTurnId: nextParticipant.id,
        round: newRound,
      };
    }),

  // Start a new round
  startNewRound: () =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const newRound = state.activeEncounter.currentRound + 1;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          currentRound: newRound,
          roundsElapsed: newRound,
        },
        round: newRound,
      };
    }),

  // Set current turn to a specific participant
  setCurrentTurn: (participantId) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          currentTurnParticipantId: participantId,
        },
        currentTurnId: participantId,
      };
    }),

  // Reroll initiative for a participant
  rerollInitiative: (participantId, newInitiative) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const updatedParticipants = state.activeEncounter.participants
        .map((p) =>
          p.id === participantId ? { ...p, initiative: newInitiative } : p
        )
        .sort((a, b) => b.initiative - a.initiative);

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: updatedParticipants,
        },
      };
    }),

  // Update initiative order manually
  updateInitiativeOrder: (newOrder) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const reorderedParticipants = [...state.activeEncounter.participants].sort(
        (a, b) => {
          const aIndex = newOrder.indexOf(a.id);
          const bIndex = newOrder.indexOf(b.id);
          if (aIndex === -1) return 1; // Move unknown participants to end
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }
      );

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: reorderedParticipants,
        },
      };
    }),
});
