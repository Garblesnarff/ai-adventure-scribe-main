/**
 * Combat Store Selectors
 *
 * Provides optimized, computed state access for components.
 * Selectors help prevent unnecessary re-renders by memoizing derived data.
 *
 * @example
 * ```tsx
 * import { useCombatStore } from '@/features/combat/stores';
 * import { selectCurrentParticipant } from '@/features/combat/stores/selectors';
 *
 * function CombatComponent() {
 *   const currentParticipant = useCombatStore(selectCurrentParticipant);
 *   // Only re-renders when currentParticipant changes
 * }
 * ```
 */

import { CombatStore } from './combatStore';
import { CombatParticipant } from '@/types/combat';

/**
 * Select the current participant whose turn it is
 */
export const selectCurrentParticipant = (state: CombatStore): CombatParticipant | null => {
  if (!state.activeEncounter || !state.activeEncounter.currentTurnParticipantId) {
    return null;
  }

  return (
    state.activeEncounter.participants.find(
      (p) => p.id === state.activeEncounter!.currentTurnParticipantId
    ) || null
  );
};

/**
 * Select all active participants (HP > 0)
 */
export const selectActiveParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter((p) => p.currentHitPoints > 0);
};

/**
 * Select all defeated participants (HP = 0, death saves failed)
 */
export const selectDefeatedParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter(
    (p) => p.currentHitPoints === 0 && p.deathSaves.failures >= 3
  );
};

/**
 * Select all unconscious participants (HP = 0, still making death saves)
 */
export const selectUnconsciousParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter(
    (p) => p.currentHitPoints === 0 && p.deathSaves.failures < 3
  );
};

/**
 * Select a participant by ID
 */
export const selectParticipantById =
  (participantId: string) =>
  (state: CombatStore): CombatParticipant | null => {
    if (!state.activeEncounter) return null;

    return state.activeEncounter.participants.find((p) => p.id === participantId) || null;
  };

/**
 * Select all player participants
 */
export const selectPlayerParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter((p) => p.participantType === 'player');
};

/**
 * Select all enemy participants
 */
export const selectEnemyParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter((p) => p.participantType === 'enemy');
};

/**
 * Select all NPC participants
 */
export const selectNpcParticipants = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.participants.filter((p) => p.participantType === 'npc');
};

/**
 * Select combat status (in combat, participants count, round number)
 */
export const selectCombatStatus = (state: CombatStore) => ({
  isInCombat: state.isInCombat,
  round: state.activeEncounter?.currentRound || 0,
  participantCount: state.activeEncounter?.participants.length || 0,
  activeParticipantCount: state.activeEncounter?.participants.filter(
    (p) => p.currentHitPoints > 0
  ).length || 0,
  currentTurnId: state.activeEncounter?.currentTurnParticipantId || null,
});

/**
 * Select initiative order (sorted by initiative, highest first)
 */
export const selectInitiativeOrder = (state: CombatStore): CombatParticipant[] => {
  if (!state.activeEncounter) return [];

  return [...state.activeEncounter.participants].sort((a, b) => b.initiative - a.initiative);
};

/**
 * Select combat actions log
 */
export const selectCombatLog = (state: CombatStore) => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.actions;
};

/**
 * Select actions for the current round
 */
export const selectCurrentRoundActions = (state: CombatStore) => {
  if (!state.activeEncounter) return [];

  return state.activeEncounter.actions.filter(
    (a) => a.round === state.activeEncounter!.currentRound
  );
};

/**
 * Select whether a participant has taken their action this turn
 */
export const selectParticipantActionStatus =
  (participantId: string) => (state: CombatStore) => {
    const participant = state.activeEncounter?.participants.find(
      (p) => p.id === participantId
    );

    if (!participant) {
      return {
        actionTaken: false,
        bonusActionTaken: false,
        reactionTaken: false,
        movementUsed: 0,
      };
    }

    return {
      actionTaken: participant.actionTaken,
      bonusActionTaken: participant.bonusActionTaken,
      reactionTaken: participant.reactionTaken,
      movementUsed: participant.movementUsed,
    };
  };

/**
 * Select available reaction opportunities
 */
export const selectReactionOpportunities = (state: CombatStore) => {
  return state.activeReactionOpportunities;
};

/**
 * Select pending reaction response
 */
export const selectPendingReaction = (state: CombatStore) => {
  return state.pendingReactionResponse;
};

/**
 * Select UI state
 */
export const selectUIState = (state: CombatStore) => ({
  selectedParticipantId: state.selectedParticipantId,
  selectedTargetId: state.selectedTargetId,
  showInitiativeTracker: state.showInitiativeTracker,
  showCombatLog: state.showCombatLog,
});
