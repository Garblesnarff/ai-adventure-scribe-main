/**
 * Combat Context Provider
 *
 * Manages D&D 5e combat state in a tabletop-focused way.
 * Handles initiative order, turn management, HP tracking, and conditions
 * as they would be managed at a physical D&D table.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

import { useCharacter } from './CharacterContext';

import type {
  CombatState,
  CombatEncounter,
  CombatParticipant,
  CombatAction as CombatActionType,
  Condition,
  ConditionName,
  CombatContextValue,
  DamageType,
  DiceRoll,
  FightingStyleName,
  ReactionOpportunity,
  ActionType,
  Equipment,
} from '@/types/combat';
import type { SpellSlotLevel } from '@/utils/spell-management';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { CombatEvent } from '@/types/combat';
import { activateRage, deactivateRage } from '@/utils/classFeatures';
import {
  getConditionModifiers,
  applyConditionEffects,
  removeConditionEffects,
  handleConditionSave,
  hasCondition,
} from '@/utils/conditionEffects';
import { rollDie } from '@/utils/diceRolls';
import { calculateDamage } from '@/utils/diceUtils';
import { processMovementAction } from '@/utils/movementUtils';
import { checkReactionTriggers } from '@/utils/reactionSystem';
import { castSpell, checkConcentration } from '@/utils/spell-management';
import { processShortRestCombat, processLongRestCombat } from '@/utils/restMechanics';
import { attemptHide, applyHiddenCondition, removeHiddenCondition } from '@/utils/stealthUtils';
import { FIGHTING_STYLES } from '@/utils/fightingStyles';

// ===========================
// Supabase Client
// ===========================

// ===========================
// Initial State
// ===========================

const initialCombatState: CombatState = {
  activeEncounter: null,
  isInCombat: false,
  selectedParticipantId: undefined,
  selectedTargetId: undefined,
  showInitiativeTracker: true,
  showCombatLog: true,
  pendingAction: undefined,
  activeReactionOpportunities: [],
  pendingReactionResponse: undefined,
};

// ===========================
// Combat Reducer
// ===========================

type ReducerAction =
  | { type: 'SET_ENCOUNTER'; encounter: CombatEncounter }
  | { type: 'START_COMBAT' }
  | { type: 'END_COMBAT' }
  | { type: 'UPDATE_PARTICIPANT'; participantId: string; updates: Partial<CombatParticipant> }
  | { type: 'ADD_PARTICIPANT'; participant: CombatParticipant }
  | { type: 'REMOVE_PARTICIPANT'; participantId: string }
  | { type: 'NEXT_TURN' }
  | { type: 'NEW_ROUND' }
  | { type: 'ADD_ACTION'; action: CombatActionType }
  | { type: 'SET_SELECTED_PARTICIPANT'; participantId?: string }
  | { type: 'SET_SELECTED_TARGET'; targetId?: string }
  | { type: 'TOGGLE_INITIATIVE_TRACKER' }
  | { type: 'TOGGLE_COMBAT_LOG' }
  | { type: 'ADD_REACTION_OPPORTUNITY'; opportunity: ReactionOpportunity }
  | { type: 'REMOVE_REACTION_OPPORTUNITY'; opportunityId: string }
  | { type: 'CLEAR_REACTION_OPPORTUNITIES' }
  | { type: 'SET_PENDING_REACTION'; opportunityId: string; selectedReaction: ActionType }
  | { type: 'REROLL_INITIATIVE'; participantId: string; newInitiative: number; roll: DiceRoll }
  | { type: 'UPDATE_INITIATIVE_ORDER'; newOrder: string[] }
  | { type: 'SET_GROUP_ID'; participantId: string; groupId: string };

function combatReducer(state: CombatState, action: ReducerAction): CombatState {
  switch (action.type) {
    case 'SET_ENCOUNTER':
      return {
        ...state,
        activeEncounter: action.encounter,
        isInCombat: action.encounter.phase === 'active',
      };

    case 'START_COMBAT':
      return {
        ...state,
        isInCombat: true,
      };

    case 'END_COMBAT':
      return {
        ...state,
        isInCombat: false,
        activeEncounter: null,
        selectedParticipantId: undefined,
        selectedTargetId: undefined,
      };

    case 'UPDATE_PARTICIPANT':
      if (!state.activeEncounter) return state;

      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === action.participantId ? { ...p, ...action.updates } : p,
          ),
        },
      };

    case 'ADD_PARTICIPANT': {
      if (!state.activeEncounter) return state;
      // Insert participant in initiative order
      const newParticipants = [...state.activeEncounter.participants, action.participant].sort(
        (a, b) => b.initiative - a.initiative,
      );
      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: newParticipants,
        },
      };
    }

    case 'REMOVE_PARTICIPANT':
      if (!state.activeEncounter) return state;

      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.filter(
            (p) => p.id !== action.participantId,
          ),
        },
      };

    case 'NEXT_TURN': {
      if (!state.activeEncounter) return state;
      const currentIndex = state.activeEncounter.participants.findIndex(
        (p) => p.id === state.activeEncounter?.currentTurnParticipantId,
      );
      let nextIndex = currentIndex + 1;
      let newRound = state.activeEncounter.currentRound;
      // If we've gone through all participants, start new round
      if (nextIndex >= state.activeEncounter.participants.length) {
        nextIndex = 0;
        newRound += 1;
      }
      // Skip unconscious/dead participants
      while (nextIndex < state.activeEncounter.participants.length) {
        const participant = state.activeEncounter.participants[nextIndex];
        if (participant.currentHitPoints > 0 || participant.deathSaves.failures < 3) {
          break;
        }
        nextIndex++;
      }
      const nextParticipant = state.activeEncounter.participants[nextIndex];
      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          currentRound: newRound,
          currentTurnParticipantId: nextParticipant?.id,
          roundsElapsed: newRound,
          // Reset actions for new turn
          participants: state.activeEncounter.participants.map((p) =>
            p.id === nextParticipant?.id
              ? {
                  ...p,
                  actionTaken: false,
                  bonusActionTaken: false,
                  reactionTaken: false,
                  movementUsed: 0,
                  reactionOpportunities: [],
                }
              : p,
          ),
        },
        // Clear global reaction opportunities at end of turn
        activeReactionOpportunities: [],
      };
    }

    case 'ADD_ACTION':
      if (!state.activeEncounter) return state;

      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          actions: [...state.activeEncounter.actions, action.action],
        },
      };

    case 'SET_SELECTED_PARTICIPANT':
      return {
        ...state,
        selectedParticipantId: action.participantId,
      };

    case 'SET_SELECTED_TARGET':
      return {
        ...state,
        selectedTargetId: action.targetId,
      };

    case 'TOGGLE_INITIATIVE_TRACKER':
      return {
        ...state,
        showInitiativeTracker: !state.showInitiativeTracker,
      };

    case 'TOGGLE_COMBAT_LOG':
      return {
        ...state,
        showCombatLog: !state.showCombatLog,
      };

    case 'ADD_REACTION_OPPORTUNITY':
      return {
        ...state,
        activeReactionOpportunities: [...state.activeReactionOpportunities, action.opportunity],
      };

    case 'REMOVE_REACTION_OPPORTUNITY':
      return {
        ...state,
        activeReactionOpportunities: state.activeReactionOpportunities.filter(
          (opportunity) => opportunity.id !== action.opportunityId,
        ),
      };

    case 'CLEAR_REACTION_OPPORTUNITIES':
      return {
        ...state,
        activeReactionOpportunities: [],
      };

    case 'SET_PENDING_REACTION':
      return {
        ...state,
        pendingReactionResponse: {
          opportunityId: action.opportunityId,
          selectedReaction: action.selectedReaction,
        },
      };

    case 'REROLL_INITIATIVE':
      if (!state.activeEncounter) return state;

      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === action.participantId ? { ...p, initiative: action.newInitiative } : p,
          ),
        },
      };

    case 'UPDATE_INITIATIVE_ORDER': {
      if (!state.activeEncounter) return state;
      const reorderedParticipants = [...state.activeEncounter.participants].sort((a, b) => {
        const aIndex = action.newOrder.indexOf(a.id);
        const bIndex = action.newOrder.indexOf(b.id);
        if (aIndex === -1) return 1; // Move unknown participants to end
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: reorderedParticipants,
        },
      };
    }

    case 'SET_GROUP_ID':
      if (!state.activeEncounter) return state;

      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.map((p) =>
            p.id === action.participantId ? { ...p, groupId: action.groupId } : p,
          ),
        },
      };

    default:
      return state;
  }
}

// ===========================
// Context Creation
// ===========================

const CombatContext = createContext<CombatContextValue | undefined>(undefined);

export const useCombat = (): CombatContextValue => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error('useCombat must be used within a CombatProvider');
  }
  return context;
};

// ===========================
// Provider Component
// ===========================

interface CombatProviderProps {
  children: React.ReactNode;
  sessionId?: string;
}

export const CombatProvider: React.FC<CombatProviderProps> = ({ children, sessionId }) => {
  const [state, dispatch] = useReducer(combatReducer, initialCombatState);
  const { state: characterState } = useCharacter();

  // ===========================
  // Database Operations
  // ===========================

  const saveEncounterToDatabase = useCallback(async (encounter: CombatEncounter) => {
    try {
      const env: any = (import.meta as any)?.env || {};
      const enableCombatDB = ['true', '1', 'yes', 'on'].includes(
        String(env.VITE_ENABLE_COMBAT_DB || '').toLowerCase(),
      );
      if (!enableCombatDB) {
        return; // Skip persistence when feature not enabled to avoid 400 errors on missing tables
      }

      await supabase.from('combat_encounters').upsert({
        id: encounter.id,
        session_id: encounter.sessionId,
        description: `Combat at ${encounter.location}`,
        status: encounter.phase,
        current_round: encounter.currentRound,
        current_turn:
          encounter.participants.findIndex((p) => p.id === encounter.currentTurnParticipantId) + 1,
        current_participant_id: encounter.currentTurnParticipantId,
        initiative_order: encounter.participants.map((p) => ({
          id: p.id,
          initiative: p.initiative,
          name: p.name,
        })),
        created_at: encounter.startTime.toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Save participants
      for (const participant of encounter.participants) {
        await supabase.from('combat_participants').upsert({
          id: participant.id,
          encounter_id: encounter.id,
          participant_type: participant.participantType,
          participant_id: participant.characterId || participant.id,
          initiative: participant.initiative,
          current_hp: participant.currentHitPoints,
          max_hp: participant.maxHitPoints,
          temporary_hp: participant.temporaryHitPoints,
          armor_class: participant.armorClass,
          conditions: participant.conditions,
          is_active: participant.currentHitPoints > 0,
        });
      }
    } catch (error) {
      logger.error('Error saving encounter to database:', error);
    }
  }, []);

  // ===========================
  // Combat Management
  // ===========================

  const startCombat = useCallback(
    async (sessionId: string, initialParticipants: Partial<CombatParticipant>[]) => {
      const encounterId = crypto.randomUUID();

      // Roll initiative for all participants
      const participantsWithInitiative = initialParticipants.map((p) => {
        const participant: CombatParticipant = {
          id: p.id || crypto.randomUUID(),
          participantType: p.participantType || 'monster',
          name: p.name || 'Unknown',
          characterId: p.characterId,
          initiative: rollDie(20) + (p.initiative || 0),
          armorClass: p.armorClass || 10,
          maxHitPoints: p.maxHitPoints || 1,
          currentHitPoints: p.currentHitPoints || p.maxHitPoints || 1,
          temporaryHitPoints: 0,
          position: p.position,
          conditions: [],
          deathSaves: { successes: 0, failures: 0 },
          actionTaken: false,
          bonusActionTaken: false,
          reactionTaken: false,
          movementUsed: 0,
          reactionOpportunities: [],
          monsterData: p.monsterData,
          spellSlots: undefined,
          activeConcentration: null,
          // Damage resistances, immunities, and vulnerabilities
          damageResistances: p.damageResistances || [],
          damageImmunities: p.damageImmunities || [],
          damageVulnerabilities: p.damageVulnerabilities || [],
          // Fighting styles
          fightingStyles: p.fightingStyles || [],
          // Weapons
          mainHandWeapon: p.mainHandWeapon,
          offHandWeapon: p.offHandWeapon,
          // Vision and stealth
          visionTypes: p.visionTypes || [],
          obscurement: p.obscurement || 'clear',
          isHidden: p.isHidden || false,
          stealthCheckBonus: p.stealthCheckBonus || 0,
        };

        // For player characters, copy spell slots, prepared spells, and damage resistances from CharacterContext
        if (
          p.participantType === 'player' &&
          p.characterId &&
          characterState.character?.id === p.characterId
        ) {
          participant.spellSlots = characterState.character.spellSlots;
          participant.preparedSpells = characterState.character.preparedSpells;
          participant.activeConcentration = characterState.character.activeConcentration;
          participant.damageResistances = characterState.character.damageResistances || [];
          participant.damageImmunities = characterState.character.damageImmunities || [];
          participant.damageVulnerabilities = characterState.character.damageVulnerabilities || [];
          participant.fightingStyles =
            characterState.character.fightingStyles?.map((style) => {
              // Convert string to FightingStyle object
              const styleName = style as FightingStyleName;
              return FIGHTING_STYLES[styleName] || { name: styleName, description: '', effect: {} };
            }) || [];
          // Copy vision and stealth properties from character
          participant.visionTypes = characterState.character.visionTypes || [];
          participant.obscurement = characterState.character.obscurement || 'clear';
          participant.isHidden = characterState.character.isHidden || false;
          participant.stealthCheckBonus = characterState.character.stealthCheckBonus || 0;
        }

        return participant;
      }) as CombatParticipant[];

      // Sort by initiative (highest first)
      participantsWithInitiative.sort((a, b) => b.initiative - a.initiative);

      const encounter: CombatEncounter = {
        id: encounterId,
        sessionId,
        phase: 'active',
        currentRound: 1,
        currentTurnParticipantId: participantsWithInitiative[0]?.id,
        participants: participantsWithInitiative,
        actions: [],
        roundsElapsed: 1,
        startTime: new Date(),
        location: 'Combat Location', // Will be enhanced later
        environmentalEffects: [],
        visibility: 'clear',
      };

      dispatch({ type: 'SET_ENCOUNTER', encounter });
      dispatch({ type: 'START_COMBAT' });

      await saveEncounterToDatabase(encounter);
    },
    [saveEncounterToDatabase, characterState.character],
  );

  const endCombat = useCallback(async () => {
    if (state.activeEncounter) {
      const updatedEncounter = {
        ...state.activeEncounter,
        phase: 'conclusion' as const,
        endTime: new Date(),
      };

      await saveEncounterToDatabase(updatedEncounter);
    }

    dispatch({ type: 'END_COMBAT' });
  }, [state.activeEncounter, saveEncounterToDatabase]);

  // ===========================
  // Turn Management
  // ===========================

  const nextTurn = useCallback(async () => {
    dispatch({ type: 'NEXT_TURN' });

    if (state.activeEncounter) {
      await saveEncounterToDatabase(state.activeEncounter);
    }
  }, [state.activeEncounter, saveEncounterToDatabase]);

  const rollInitiative = useCallback(
    async (participantId: string): Promise<number> => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant) return 0;

      const initiative = rollDie(20) + (participant.initiative || 0);

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: { initiative },
      });

      return initiative;
    },
    [state.activeEncounter],
  );

  // ===========================
  // Actions & Damage
  // ===========================

  const takeAction = useCallback(
    async (action: Partial<CombatActionType>) => {
      if (!state.activeEncounter) return;

      let fullAction: CombatActionType = {
        id: crypto.randomUUID(),
        encounterId: state.activeEncounter.id,
        participantId: action.participantId || '',
        targetParticipantId: action.targetParticipantId,
        round: state.activeEncounter.currentRound,
        turnOrder:
          state.activeEncounter.participants.findIndex((p) => p.id === action.participantId) + 1,
        actionType: action.actionType || 'attack',
        description: action.description || 'Unknown action',
        attackRoll: action.attackRoll,
        damageRolls: action.damageRolls,
        savingThrows: action.savingThrows,
        hit: action.hit,
        damageDealt: action.damageDealt,
        damageType: action.damageType,
        conditionsApplied: action.conditionsApplied,
        dmNarration: action.dmNarration,
        timestamp: new Date(),
      };

      const participant = state.activeEncounter.participants.find(
        (p) => p.id === action.participantId,
      );
      if (!participant) return;

      // Handle spell casting
      if (action.actionType === 'cast_spell' && participant.participantType === 'player') {
        try {
          const spellLevel = (action.spellLevel as SpellSlotLevel) || 1;
          const spellName = action.spellName || 'Unknown Spell';
          const { updatedParticipant, updatedAction } = castSpell(
            action,
            participant,
            spellName,
            spellLevel,
          );

          // Update participant in combat
          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId!,
            updates: {
              spellSlots: updatedParticipant.spellSlots,
              activeConcentration: updatedParticipant.activeConcentration,
              actionTaken: true, // Casting a spell uses the action
            },
          });

          fullAction = { ...fullAction, ...updatedAction };
        } catch (error) {
          logger.error('Spell casting failed:', error);
          // Still add the action but mark as failed
          fullAction.description += ` (Failed: ${(error as Error).message})`;
        }
      }
      // Handle divine smite
      else if (action.actionType === 'divine_smite') {
        try {
          // Check if participant is a paladin with spell slots
          if (participant.characterClass !== 'paladin' || !participant.spellSlots) {
            throw new Error('Only paladins can use Divine Smite');
          }

          // Find the lowest available spell slot (at least 1st level)
          let spellSlotLevel: SpellSlotLevel | null = null;
          for (let i = 1; i <= 5; i++) {
            // Check up to 5th level slots
            if (participant.spellSlots[i as SpellSlotLevel]?.current > 0) {
              spellSlotLevel = i as SpellSlotLevel;
              break;
            }
          }

          if (!spellSlotLevel) {
            throw new Error('No available spell slots for Divine Smite');
          }

          // Deduct the spell slot
          const updatedSlots = { ...participant.spellSlots };
          updatedSlots[spellSlotLevel] = {
            ...updatedSlots[spellSlotLevel],
            current: updatedSlots[spellSlotLevel].current - 1,
          };

          // Update participant in combat
          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId!,
            updates: {
              spellSlots: updatedSlots,
              actionTaken: true, // Using Divine Smite uses the action
            },
          });

          fullAction.description = `${participant.name} uses Divine Smite with a level ${spellSlotLevel} spell slot`;
        } catch (error) {
          logger.error('Divine Smite failed:', error);
          fullAction.description += ` (Failed: ${(error as Error).message})`;
        }
      }
      // Handle rage activation
      else if (action.actionType === 'use_class_feature' && action.featureUsed === 'rage') {
        try {
          if (!participant.resources) {
            throw new Error('Participant has no resources');
          }

          const { updatedParticipant, updatedResources, rageDamageBonus } = activateRage(
            participant,
            participant.resources,
          );

          // Update participant in combat
          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId!,
            updates: {
              ...updatedParticipant,
              resources: updatedResources,
              actionTaken: true, // Using rage uses the action
            },
          });

          fullAction.description = `${participant.name} enters a rage, gaining resistance to bludgeoning, piercing, and slashing damage and +${rageDamageBonus} damage to melee attacks`;
        } catch (error) {
          logger.error('Rage activation failed:', error);
          fullAction.description += ` (Failed: ${(error as Error).message})`;
        }
      }
      // Handle rage deactivation
      else if (action.actionType === 'end_rage') {
        try {
          const updatedParticipant = deactivateRage(participant);

          // Update participant in combat
          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId!,
            updates: {
              ...updatedParticipant,
              actionTaken: true, // Ending rage uses the action
            },
          });

          fullAction.description = `${participant.name} stops raging`;
        } catch (error) {
          logger.error('Rage deactivation failed:', error);
          fullAction.description += ` (Failed: ${(error as Error).message})`;
        }
      }
      // Handle short rest
      else if (action.actionType === 'short_rest') {
        // Process short rest for the participant
        const updatedParticipant = processShortRestCombat(participant, 1); // Default to rolling 1 hit die

        // Update participant in combat
        dispatch({
          type: 'UPDATE_PARTICIPANT',
          participantId: action.participantId!,
          updates: {
            ...updatedParticipant,
            actionTaken: true, // Taking a short rest uses the action
          },
        });

        fullAction.description = `${participant.name} takes a short rest`;
      }
      // Handle long rest
      else if (action.actionType === 'long_rest') {
        // Process long rest for the participant
        const updatedParticipant = processLongRestCombat(participant);

        // Update participant in combat
        dispatch({
          type: 'UPDATE_PARTICIPANT',
          participantId: action.participantId!,
          updates: {
            ...updatedParticipant,
            actionTaken: true, // Taking a long rest uses the action
          },
        });

        fullAction.description = `${participant.name} takes a long rest`;
      }
      // Handle hide action
      else if (action.actionType === 'hide') {
        try {
          // Attempt to hide
          const hideResult = attemptHide(participant);

          // Update participant in combat
          const updatedParticipant = hideResult.success
            ? applyHiddenCondition(participant)
            : removeHiddenCondition(participant);

          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId!,
            updates: {
              ...updatedParticipant,
              actionTaken: true, // Hiding uses the action
            },
          });

          fullAction.description = hideResult.description;
          fullAction.attackRoll = hideResult.roll;
        } catch (error) {
          logger.error('Hide action failed:', error);
          fullAction.description += ` (Failed: ${(error as Error).message})`;
        }
      } else {
        // Mark participant as having taken action for other actions
        if (action.participantId) {
          dispatch({
            type: 'UPDATE_PARTICIPANT',
            participantId: action.participantId,
            updates: { actionTaken: true },
          });
        }
      }

      dispatch({ type: 'ADD_ACTION', action: fullAction });

      // Check for reaction triggers
      if (state.activeEncounter) {
        const reactionOpportunities = checkReactionTriggers(fullAction, state.activeEncounter);
        reactionOpportunities.forEach((opportunity) => {
          addReactionOpportunity(opportunity);
          addParticipantReactionOpportunity(opportunity.participantId, opportunity);
        });
      }

      // Apply damage if any
      if (action.damageDealt && action.targetParticipantId) {
        await dealDamage(action.targetParticipantId, action.damageDealt, action.damageType);
      }
    },
    [state.activeEncounter],
  );

  const dealDamage = useCallback(
    async (participantId: string, damage: number, damageType?: DamageType) => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant) return;

      // Calculate damage with resistances, immunities, and vulnerabilities
      let actualDamage = damage;
      if (damageType) {
        actualDamage = calculateDamage(
          damage,
          damageType,
          participant.damageResistances || [],
          participant.damageImmunities || [],
          participant.damageVulnerabilities || [],
        );
      }

      // Apply temporary HP first
      const tempHPDamage = Math.min(participant.temporaryHitPoints, actualDamage);
      actualDamage -= tempHPDamage;

      const newTempHP = participant.temporaryHitPoints - tempHPDamage;
      const newCurrentHP = Math.max(0, participant.currentHitPoints - actualDamage);

      // Check concentration if participant is concentrating
      const concentrationMaintained = checkConcentration(participant, damage);
      let concentrationUpdate = {};
      if (!concentrationMaintained) {
        concentrationUpdate = { activeConcentration: null };
      }

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: {
          currentHitPoints: newCurrentHP,
          temporaryHitPoints: newTempHP,
          ...concentrationUpdate,
        },
      });
    },
    [state.activeEncounter],
  );

  const healDamage = useCallback(
    async (participantId: string, healing: number) => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant) return;

      const newCurrentHP = Math.min(
        participant.maxHitPoints,
        participant.currentHitPoints + healing,
      );

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: { currentHitPoints: newCurrentHP },
      });
    },
    [state.activeEncounter],
  );

  // ===========================
  // Conditions
  // ===========================

  const applyCondition = useCallback(
    async (participantId: string, condition: Condition) => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant) return;

      // Apply condition effects using the centralized conditionEffects utility
      const updatedParticipant = applyConditionEffects(participant, condition);

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: {
          conditions: updatedParticipant.conditions,
          // Include any additional effects (like speed changes)
          speed:
            updatedParticipant.speed !== participant.speed ? updatedParticipant.speed : undefined,
          movementUsed:
            updatedParticipant.movementUsed !== participant.movementUsed
              ? updatedParticipant.movementUsed
              : undefined,
        },
      });
    },
    [state.activeEncounter],
  );

  const removeCondition = useCallback(
    async (participantId: string, conditionName: ConditionName) => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant) return;

      // Find the condition to remove for proper effect removal
      const conditionToRemove = participant.conditions.find((c) => c.name === conditionName);
      if (!conditionToRemove) return;

      // Remove condition effects using the centralized conditionEffects utility
      const updatedParticipant = removeConditionEffects(participant, conditionToRemove);

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: {
          conditions: updatedParticipant.conditions,
          // Restore any modified stats (like speed)
          speed:
            updatedParticipant.speed !== participant.speed ? updatedParticipant.speed : undefined,
          movementUsed:
            updatedParticipant.movementUsed !== participant.movementUsed
              ? updatedParticipant.movementUsed
              : undefined,
        },
      });
    },
    [state.activeEncounter],
  );

  // ===========================
  // Death Saves
  // ===========================

  const rollDeathSave = useCallback(
    async (participantId: string): Promise<'success' | 'failure' | 'critical'> => {
      const participant = state.activeEncounter?.participants.find((p) => p.id === participantId);
      if (!participant || participant.currentHitPoints > 0) return 'success';

      const roll = rollDie(20);
      let result: 'success' | 'failure' | 'critical';
      let updates: Partial<CombatParticipant> = {};

      if (roll === 20) {
        // Critical success - regain 1 HP
        result = 'critical';
        updates = {
          currentHitPoints: 1,
          deathSaves: { successes: 0, failures: 0 },
        };
      } else if (roll === 1) {
        // Critical failure - two failures
        result = 'failure';
        updates = {
          deathSaves: {
            successes: participant.deathSaves.successes,
            failures: Math.min(3, participant.deathSaves.failures + 2),
          },
        };
      } else if (roll >= 10) {
        // Success
        result = 'success';
        updates = {
          deathSaves: {
            successes: participant.deathSaves.successes + 1,
            failures: participant.deathSaves.failures,
          },
        };
      } else {
        // Failure
        result = 'failure';
        updates = {
          deathSaves: {
            successes: participant.deathSaves.successes,
            failures: participant.deathSaves.failures + 1,
          },
        };
      }

      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates,
      });

      return result;
    },
    [state.activeEncounter],
  );

  // ===========================
  // Participant Management
  // ===========================

  const addParticipant = useCallback(
    async (participant: Partial<CombatParticipant>) => {
      const fullParticipant: CombatParticipant = {
        id: participant.id || crypto.randomUUID(),
        participantType: participant.participantType || 'monster',
        name: participant.name || 'Unknown',
        characterId: participant.characterId,
        initiative: participant.initiative || rollDie(20),
        armorClass: participant.armorClass || 10,
        maxHitPoints: participant.maxHitPoints || 1,
        currentHitPoints: participant.currentHitPoints || participant.maxHitPoints || 1,
        temporaryHitPoints: 0,
        position: participant.position,
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        actionTaken: false,
        bonusActionTaken: false,
        reactionTaken: false,
        movementUsed: 0,
        reactionOpportunities: [],
        monsterData: participant.monsterData,
        spellSlots: undefined,
        activeConcentration: null,
        // Damage resistances, immunities, and vulnerabilities
        damageResistances: participant.damageResistances || [],
        damageImmunities: participant.damageImmunities || [],
        damageVulnerabilities: participant.damageVulnerabilities || [],
        // Fighting styles
        fightingStyles: participant.fightingStyles || [],
        // Weapons
        mainHandWeapon: participant.mainHandWeapon,
        offHandWeapon: participant.offHandWeapon,
        // Vision and stealth
        visionTypes: participant.visionTypes || [],
        obscurement: participant.obscurement || 'clear',
        isHidden: participant.isHidden || false,
        stealthCheckBonus: participant.stealthCheckBonus || 0,
      };

      // For player characters, copy data from CharacterContext if available
      if (
        participant.participantType === 'player' &&
        participant.characterId &&
        characterState.character?.id === participant.characterId
      ) {
        fullParticipant.spellSlots = characterState.character.spellSlots;
        fullParticipant.preparedSpells = characterState.character.preparedSpells;
        fullParticipant.activeConcentration = characterState.character.activeConcentration;
        fullParticipant.damageResistances = characterState.character.damageResistances || [];
        fullParticipant.damageImmunities = characterState.character.damageImmunities || [];
        fullParticipant.damageVulnerabilities =
          characterState.character.damageVulnerabilities || [];
        fullParticipant.fightingStyles =
          characterState.character.fightingStyles?.map((style) => {
            // Convert string to FightingStyle object
            const styleName = style as FightingStyleName;
            return FIGHTING_STYLES[styleName] || { name: styleName, description: '', effect: {} };
          }) || [];
        // Copy vision and stealth properties from character
        fullParticipant.visionTypes = characterState.character.visionTypes || [];
        fullParticipant.obscurement = characterState.character.obscurement || 'clear';
        fullParticipant.isHidden = characterState.character.isHidden || false;
        fullParticipant.stealthCheckBonus = characterState.character.stealthCheckBonus || 0;
      }

      dispatch({ type: 'ADD_PARTICIPANT', participant: fullParticipant });
    },
    [characterState.character],
  );

  const removeParticipant = useCallback(async (participantId: string) => {
    dispatch({ type: 'REMOVE_PARTICIPANT', participantId });
  }, []);

  const updateParticipant = useCallback(
    async (participantId: string, updates: Partial<CombatParticipant>) => {
      dispatch({ type: 'UPDATE_PARTICIPANT', participantId, updates });
    },
    [],
  );

  // ===========================
  // Reaction Opportunities
  // ===========================

  const addReactionOpportunity = useCallback((opportunity: ReactionOpportunity) => {
    dispatch({ type: 'ADD_REACTION_OPPORTUNITY', opportunity });
  }, []);

  const removeReactionOpportunity = useCallback((opportunityId: string) => {
    dispatch({ type: 'REMOVE_REACTION_OPPORTUNITY', opportunityId });
  }, []);

  const clearReactionOpportunities = useCallback(() => {
    dispatch({ type: 'CLEAR_REACTION_OPPORTUNITIES' });
  }, []);

  const setPendingReaction = useCallback((opportunityId: string, selectedReaction: ActionType) => {
    dispatch({ type: 'SET_PENDING_REACTION', opportunityId, selectedReaction });
  }, []);

  // ===========================
  // Weapon Management
  // ===========================

  const equipMainHandWeapon = useCallback((participantId: string, weapon: Equipment) => {
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { mainHandWeapon: weapon },
    });
  }, []);

  const equipOffHandWeapon = useCallback((participantId: string, weapon: Equipment) => {
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { offHandWeapon: weapon },
    });
  }, []);

  const unequipMainHandWeapon = useCallback((participantId: string) => {
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { mainHandWeapon: undefined },
    });
  }, []);

  const unequipOffHandWeapon = useCallback((participantId: string) => {
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { offHandWeapon: undefined },
    });
  }, []);

  // ===========================
  // Participant Reaction Opportunities
  // ===========================

  const addParticipantReactionOpportunity = useCallback(
    (participantId: string, opportunity: ReactionOpportunity) => {
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: {
          reactionOpportunities: [
            ...(state.activeEncounter?.participants.find((p) => p.id === participantId)
              ?.reactionOpportunities || []),
            opportunity,
          ],
        },
      });
    },
    [state.activeEncounter],
  );

  const removeParticipantReactionOpportunity = useCallback(
    (participantId: string, opportunityId: string) => {
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: {
          reactionOpportunities: (
            state.activeEncounter?.participants.find((p) => p.id === participantId)
              ?.reactionOpportunities || []
          ).filter((opp) => opp.id !== opportunityId),
        },
      });
    },
    [state.activeEncounter],
  );

  const clearParticipantReactionOpportunities = useCallback((participantId: string) => {
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { reactionOpportunities: [] },
    });
  }, []);

  // ===========================
  // Movement Actions
  // ===========================

  const moveParticipant = useCallback(
    async (participantId: string, fromPosition: string, toPosition: string) => {
      if (!state.activeEncounter) return;

      // Process movement action
      const opportunities = processMovementAction(
        participantId,
        fromPosition,
        toPosition,
        state.activeEncounter,
      );

      // Add reaction opportunities
      opportunities.forEach((opportunity) => {
        addReactionOpportunity(opportunity);
        addParticipantReactionOpportunity(opportunity.participantId, opportunity);
      });

      // Update participant position
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        updates: { position: toPosition },
      });
    },
    [state.activeEncounter, addReactionOpportunity, addParticipantReactionOpportunity],
  );

  // ===========================
  // Context Value
  // ===========================

  const contextValue: CombatContextValue = {
    state,
    startCombat,
    endCombat,
    nextTurn,
    rollInitiative,
    takeAction,
    dealDamage,
    healDamage,
    applyCondition,
    removeCondition,
    rollDeathSave,
    addParticipant,
    removeParticipant,
    updateParticipant,
    // Reaction management
    addReactionOpportunity,
    removeReactionOpportunity,
    clearReactionOpportunities,
    setPendingReaction,
    // Participant reaction opportunities
    addParticipantReactionOpportunity,
    removeParticipantReactionOpportunity,
    clearParticipantReactionOpportunities,

    // Movement actions
    moveParticipant,

    // Weapon management
    equipMainHandWeapon,
    equipOffHandWeapon,
    unequipMainHandWeapon,
    unequipOffHandWeapon,
  };

  return <CombatContext.Provider value={contextValue}>{children}</CombatContext.Provider>;
};
