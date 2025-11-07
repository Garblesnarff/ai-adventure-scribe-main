/**
 * Actions Slice
 *
 * Manages combat actions and combat log.
 * Handles action recording, reaction opportunities, and UI state.
 */

import { StateCreator } from 'zustand';
import { CombatAction, ReactionOpportunity, ActionType } from '@/types/combat';
import { EncounterSlice } from './encounterSlice';

/**
 * Actions state interface
 */
export interface ActionsSlice {
  // UI State
  selectedParticipantId?: string;
  selectedTargetId?: string;
  showInitiativeTracker: boolean;
  showCombatLog: boolean;

  // Pending actions
  pendingAction?: Partial<CombatAction>;

  // Reaction system
  activeReactionOpportunities: ReactionOpportunity[];
  pendingReactionResponse?: {
    opportunityId: string;
    selectedReaction?: ActionType;
  };

  // Actions
  addAction: (action: CombatAction) => void;
  setPendingAction: (action?: Partial<CombatAction>) => void;

  // UI Actions
  setSelectedParticipant: (participantId?: string) => void;
  setSelectedTarget: (targetId?: string) => void;
  toggleInitiativeTracker: () => void;
  toggleCombatLog: () => void;

  // Reaction Management
  addReactionOpportunity: (opportunity: ReactionOpportunity) => void;
  removeReactionOpportunity: (opportunityId: string) => void;
  clearReactionOpportunities: () => void;
  setPendingReaction: (opportunityId: string, selectedReaction: ActionType) => void;
}

/**
 * Creates the actions slice with state and actions
 *
 * @param set - Zustand set function for state updates
 * @param get - Zustand get function for state access
 * @returns Actions slice with state and actions
 */
export const createActionsSlice: StateCreator<
  ActionsSlice & EncounterSlice,
  [],
  [],
  ActionsSlice
> = (set, get) => ({
  // Initial state
  selectedParticipantId: undefined,
  selectedTargetId: undefined,
  showInitiativeTracker: true,
  showCombatLog: true,
  pendingAction: undefined,
  activeReactionOpportunities: [],
  pendingReactionResponse: undefined,

  // Add a combat action to the log
  addAction: (action) =>
    set((state) => {
      if (!state.activeEncounter) return state;

      return {
        activeEncounter: {
          ...state.activeEncounter,
          actions: [...state.activeEncounter.actions, action],
        },
      };
    }),

  // Set pending action
  setPendingAction: (action) =>
    set({
      pendingAction: action,
    }),

  // Set selected participant
  setSelectedParticipant: (participantId) =>
    set({
      selectedParticipantId: participantId,
    }),

  // Set selected target
  setSelectedTarget: (targetId) =>
    set({
      selectedTargetId: targetId,
    }),

  // Toggle initiative tracker visibility
  toggleInitiativeTracker: () =>
    set((state) => ({
      showInitiativeTracker: !state.showInitiativeTracker,
    })),

  // Toggle combat log visibility
  toggleCombatLog: () =>
    set((state) => ({
      showCombatLog: !state.showCombatLog,
    })),

  // Add a reaction opportunity
  addReactionOpportunity: (opportunity) =>
    set((state) => ({
      activeReactionOpportunities: [
        ...state.activeReactionOpportunities,
        opportunity,
      ],
    })),

  // Remove a reaction opportunity
  removeReactionOpportunity: (opportunityId) =>
    set((state) => ({
      activeReactionOpportunities: state.activeReactionOpportunities.filter(
        (o) => o.id !== opportunityId
      ),
    })),

  // Clear all reaction opportunities
  clearReactionOpportunities: () =>
    set({
      activeReactionOpportunities: [],
    }),

  // Set pending reaction response
  setPendingReaction: (opportunityId, selectedReaction) =>
    set({
      pendingReactionResponse: {
        opportunityId,
        selectedReaction,
      },
    }),
});
