/**
 * Participants Slice
 *
 * Manages combat participants (players, NPCs, monsters).
 * Handles participant creation, updates, HP tracking, conditions, and removal.
 */

import { StateCreator } from 'zustand';
import { CombatParticipant, Condition, ConditionName, DamageType } from '@/types/combat';
import { EncounterSlice } from './encounterSlice';

/**
 * Participants state interface
 */
export interface ParticipantsSlice {
  // Actions
  addParticipant: (participant: CombatParticipant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (
    participantId: string,
    updates: Partial<CombatParticipant>
  ) => void;

  // HP management
  dealDamage: (
    participantId: string,
    damage: number,
    damageType?: DamageType
  ) => void;
  healDamage: (participantId: string, healing: number) => void;

  // Condition management
  applyCondition: (participantId: string, condition: Condition) => void;
  removeCondition: (participantId: string, conditionName: ConditionName) => void;

  // Death saves
  updateDeathSaves: (
    participantId: string,
    successes: number,
    failures: number
  ) => void;
}

/**
 * Creates the participants slice with state and actions
 *
 * @param set - Zustand set function for state updates
 * @param get - Zustand get function for state access
 * @returns Participants slice with state and actions
 */
export const createParticipantsSlice: StateCreator<
  ParticipantsSlice & EncounterSlice,
  [],
  [],
  ParticipantsSlice
> = (set, get) => ({
  // Add a new participant to the encounter
  addParticipant: (participant) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      // Insert in initiative order (highest first)
      const newParticipants = [...state.activeEncounter.participants, participant].sort(
        (a, b) => b.initiative - a.initiative
      );

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: newParticipants,
        },
      };
    }),

  // Remove a participant from the encounter
  removeParticipant: (participantId) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.filter(
            (p) => p.id !== participantId
          ),
        },
      };
    }),

  // Update participant properties
  updateParticipant: (participantId, updates) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId ? { ...p, ...updates } : p
          ),
        },
      };
    }),

  // Deal damage to a participant
  dealDamage: (participantId, damage, damageType) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const participant = state.activeEncounter.participants.find(
        (p) => p.id === participantId
      );
      if (!participant) return state;

      // Apply temporary HP first
      const tempHPDamage = Math.min(participant.temporaryHitPoints, damage);
      const remainingDamage = damage - tempHPDamage;

      const newTempHP = participant.temporaryHitPoints - tempHPDamage;
      const newCurrentHP = Math.max(0, participant.currentHitPoints - remainingDamage);

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  currentHitPoints: newCurrentHP,
                  temporaryHitPoints: newTempHP,
                }
              : p
          ),
        },
      };
    }),

  // Heal a participant
  healDamage: (participantId, healing) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const participant = state.activeEncounter.participants.find(
        (p) => p.id === participantId
      );
      if (!participant) return state;

      const newCurrentHP = Math.min(
        participant.maxHitPoints,
        participant.currentHitPoints + healing
      );

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId ? { ...p, currentHitPoints: newCurrentHP } : p
          ),
        },
      };
    }),

  // Apply a condition to a participant
  applyCondition: (participantId, condition) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      const participant = state.activeEncounter.participants.find(
        (p) => p.id === participantId
      );
      if (!participant) return state;

      // Add condition if not already present
      const hasCondition = participant.conditions.some(
        (c) => c.name === condition.name
      );

      if (hasCondition) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId
              ? { ...p, conditions: [...p.conditions, condition] }
              : p
          ),
        },
      };
    }),

  // Remove a condition from a participant
  removeCondition: (participantId, conditionName) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  conditions: p.conditions.filter((c) => c.name !== conditionName),
                }
              : p
          ),
        },
      };
    }),

  // Update death saves for a participant
  updateDeathSaves: (participantId, successes, failures) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  deathSaves: { successes, failures },
                }
              : p
          ),
        },
      };
    }),
});
