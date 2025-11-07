/**
 * Encounter Slice
 *
 * Manages combat encounter metadata and lifecycle.
 * Handles encounter initialization, phase transitions, and cleanup.
 */

import { StateCreator } from 'zustand';
import { CombatEncounter, CombatPhase } from '@/types/combat';

/**
 * Encounter state interface
 */
export interface EncounterSlice {
  // State
  activeEncounter: CombatEncounter | null;
  isInCombat: boolean;

  // Actions
  setEncounter: (encounter: CombatEncounter) => void;
  updateEncounter: (updates: Partial<CombatEncounter>) => void;
  setPhase: (phase: CombatPhase) => void;
  clearEncounter: () => void;
}

/**
 * Creates the encounter slice with state and actions
 *
 * @param set - Zustand set function for state updates
 * @param get - Zustand get function for state access
 * @returns Encounter slice with state and actions
 */
export const createEncounterSlice: StateCreator<
  EncounterSlice,
  [],
  [],
  EncounterSlice
> = (set, get) => ({
  // Initial state
  activeEncounter: null,
  isInCombat: false,

  // Set a new encounter
  setEncounter: (encounter) =>
    set({
      activeEncounter: encounter,
      isInCombat: encounter.phase === 'active',
    }),

  // Update encounter properties
  updateEncounter: (updates) =>
    set((state) => ({
      activeEncounter: state.activeEncounter
        ? { ...state.activeEncounter, ...updates }
        : null,
    })),

  // Update encounter phase
  setPhase: (phase) =>
    set((state) => ({
      activeEncounter: state.activeEncounter
        ? { ...state.activeEncounter, phase }
        : null,
      isInCombat: phase === 'active',
    })),

  // Clear encounter and reset combat state
  clearEncounter: () =>
    set({
      activeEncounter: null,
      isInCombat: false,
    }),
});
