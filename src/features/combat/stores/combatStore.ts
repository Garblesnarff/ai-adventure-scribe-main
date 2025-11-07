/**
 * Combat Store (Zustand)
 *
 * Modern state management for D&D 5e combat system.
 * Replaces the 1,199-line CombatContext with a clean, composable store.
 *
 * Features:
 * - Slice-based architecture for modularity
 * - Redux DevTools integration for debugging
 * - LocalStorage persistence for session recovery
 * - Custom middleware for combat logging
 * - Type-safe selectors for component usage
 *
 * @example
 * ```tsx
 * // In a component
 * import { useCombatStore } from '@/features/combat/stores';
 *
 * function CombatComponent() {
 *   const { startCombat, activeEncounter } = useCombatStore();
 *   // Use combat state and actions
 * }
 * ```
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createEncounterSlice, EncounterSlice } from './slices/encounterSlice';
import { createParticipantsSlice, ParticipantsSlice } from './slices/participantsSlice';
import { createTurnsSlice, TurnsSlice } from './slices/turnsSlice';
import { createActionsSlice, ActionsSlice } from './slices/actionsSlice';
import { CombatParticipant } from '@/types/combat';
import { rollDie } from '@/utils/diceRolls';

/**
 * Combined combat store interface
 */
export type CombatStore = EncounterSlice &
  ParticipantsSlice &
  TurnsSlice &
  ActionsSlice & {
    // High-level actions
    startCombat: (
      sessionId: string,
      initialParticipants: Partial<CombatParticipant>[]
    ) => void;
    endCombat: () => void;
  };

/**
 * Custom middleware for combat logging
 * Logs important combat events for debugging and audit trail
 */
const combatLogMiddleware = (config: any) => (set: any, get: any, api: any) =>
  config(
    (args: any) => {
      // Log state changes in development
      if (import.meta.env.DEV) {
        console.log('[Combat Store] State update:', args);
      }
      set(args);
    },
    get,
    api
  );

/**
 * Main combat store with all slices and middleware
 */
export const useCombatStore = create<CombatStore>()(
  devtools(
    persist(
      (set, get, api) => ({
        // Combine all slices
        ...createEncounterSlice(set, get, api),
        ...createParticipantsSlice(set, get, api),
        ...createTurnsSlice(set, get, api),
        ...createActionsSlice(set, get, api),

        // High-level combat actions
        /**
         * Start a new combat encounter
         *
         * @param sessionId - Session ID for the encounter
         * @param initialParticipants - Initial participants with partial data
         */
        startCombat: (sessionId, initialParticipants) => {
          const encounterId = crypto.randomUUID();

          // Roll initiative for all participants
          const participantsWithInitiative = initialParticipants.map((p) => {
            const participant: CombatParticipant = {
              id: p.id || crypto.randomUUID(),
              participantType: p.participantType || 'player',
              name: p.name || 'Unknown',
              characterId: p.characterId,
              initiative: rollDie(20) + (p.initiative || 0),
              armorClass: p.armorClass || 10,
              maxHitPoints: p.maxHitPoints || 1,
              currentHitPoints: p.currentHitPoints || p.maxHitPoints || 1,
              temporaryHitPoints: 0,
              speed: p.speed || 30,
              conditions: [],
              deathSaves: { successes: 0, failures: 0 },
              actionTaken: false,
              bonusActionTaken: false,
              reactionTaken: false,
              movementUsed: 0,
              reactionOpportunities: [],
              damageResistances: p.damageResistances || [],
              damageImmunities: p.damageImmunities || [],
              damageVulnerabilities: p.damageVulnerabilities || [],
            };

            return participant;
          });

          // Sort by initiative (highest first)
          participantsWithInitiative.sort((a, b) => b.initiative - a.initiative);

          const encounter = {
            id: encounterId,
            sessionId,
            phase: 'active' as const,
            currentRound: 1,
            currentTurnParticipantId: participantsWithInitiative[0]?.id,
            participants: participantsWithInitiative,
            actions: [],
            roundsElapsed: 1,
            startTime: new Date(),
            location: 'Combat Location',
            environmentalEffects: [],
            visibility: 'clear' as const,
          };

          set({
            activeEncounter: encounter,
            isInCombat: true,
            currentTurnId: encounter.currentTurnParticipantId || null,
            round: 1,
          });
        },

        /**
         * End the current combat encounter
         */
        endCombat: () => {
          const state = get();
          if (state.activeEncounter) {
            set({
              activeEncounter: {
                ...state.activeEncounter,
                phase: 'conclusion' as const,
                endTime: new Date(),
              },
            });
          }

          // Clear combat state
          set({
            activeEncounter: null,
            isInCombat: false,
            currentTurnId: null,
            selectedParticipantId: undefined,
            selectedTargetId: undefined,
            activeReactionOpportunities: [],
            pendingReactionResponse: undefined,
          });
        },
      }),
      {
        name: 'combat-storage',
        // Only persist essential state
        partialize: (state) => ({
          activeEncounter: state.activeEncounter,
          isInCombat: state.isInCombat,
          currentTurnId: state.currentTurnId,
          round: state.round,
        }),
      }
    ),
    {
      name: 'Combat Store',
      enabled: import.meta.env.DEV,
    }
  )
);

// Export individual slices for testing
export { createEncounterSlice, createParticipantsSlice, createTurnsSlice, createActionsSlice };
