/**
 * Combat Context Provider
 * 
 * Manages D&D 5e combat state in a tabletop-focused way.
 * Handles initiative order, turn management, HP tracking, and conditions
 * as they would be managed at a physical D&D table.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  CombatState, 
  CombatEncounter, 
  CombatParticipant, 
  CombatAction as CombatActionType, 
  CombatEvent,
  Condition,
  ConditionName,
  CombatContextValue,
  DamageType,
  DiceRoll
} from '@/types/combat';
import { createClient } from '@supabase/supabase-js';
import { rollDie } from '@/utils/diceRolls';
import { 
  castSpell, 
  checkConcentration,
  SpellSlotLevel 
} from '@/utils/spell-management';
import { useCharacter } from './CharacterContext';

// ===========================
// Supabase Client
// ===========================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
  | { type: 'TOGGLE_COMBAT_LOG' };

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
          participants: state.activeEncounter.participants.map(p => 
            p.id === action.participantId 
              ? { ...p, ...action.updates }
              : p
          ),
        },
      };

    case 'ADD_PARTICIPANT':
      if (!state.activeEncounter) return state;
      
      // Insert participant in initiative order
      const newParticipants = [...state.activeEncounter.participants, action.participant]
        .sort((a, b) => b.initiative - a.initiative);
      
      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: newParticipants,
        },
      };

    case 'REMOVE_PARTICIPANT':
      if (!state.activeEncounter) return state;
      
      return {
        ...state,
        activeEncounter: {
          ...state.activeEncounter,
          participants: state.activeEncounter.participants.filter(p => 
            p.id !== action.participantId
          ),
        },
      };

    case 'NEXT_TURN':
      if (!state.activeEncounter) return state;
      
      const currentIndex = state.activeEncounter.participants.findIndex(p => 
        p.id === state.activeEncounter?.currentTurnParticipantId
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
          participants: state.activeEncounter.participants.map(p => 
            p.id === nextParticipant?.id
              ? {
                  ...p,
                  actionTaken: false,
                  bonusActionTaken: false,
                  reactionTaken: false,
                  movementUsed: 0,
                }
              : p
          ),
        },
      };

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

export const CombatProvider: React.FC<CombatProviderProps> = ({ 
  children, 
  sessionId 
}) => {
  const [state, dispatch] = useReducer(combatReducer, initialCombatState);
  const { state: characterState } = useCharacter();

  // ===========================
  // Database Operations
  // ===========================

  const saveEncounterToDatabase = useCallback(async (encounter: CombatEncounter) => {
    try {
      await supabase
        .from('combat_encounters')
        .upsert({
          id: encounter.id,
          session_id: encounter.sessionId,
          description: `Combat at ${encounter.location}`,
          status: encounter.phase,
          current_round: encounter.currentRound,
          current_turn: encounter.participants.findIndex(p => 
            p.id === encounter.currentTurnParticipantId
          ) + 1,
          current_participant_id: encounter.currentTurnParticipantId,
          initiative_order: encounter.participants.map(p => ({
            id: p.id,
            initiative: p.initiative,
            name: p.name,
          })),
          created_at: encounter.startTime.toISOString(),
          updated_at: new Date().toISOString(),
        });

      // Save participants
      for (const participant of encounter.participants) {
        await supabase
          .from('combat_participants')
          .upsert({
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
      console.error('Error saving encounter to database:', error);
    }
  }, []);

  // ===========================
  // Combat Management
  // ===========================

  const startCombat = useCallback(async (
    sessionId: string, 
    initialParticipants: Partial<CombatParticipant>[]
  ) => {
    const encounterId = crypto.randomUUID();
    
    // Roll initiative for all participants
    const participantsWithInitiative = initialParticipants.map(p => {
      let participant: CombatParticipant = {
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
        monsterData: p.monsterData,
        spellSlots: undefined,
        activeConcentration: null,
      };

      // For player characters, copy spell slots from CharacterContext
      if (p.participantType === 'player' && p.characterId && characterState.character?.id === p.characterId) {
        participant.spellSlots = characterState.character.spellSlots;
        participant.activeConcentration = characterState.character.activeConcentration;
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
  }, [saveEncounterToDatabase, characterState.character]);

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

  const rollInitiative = useCallback(async (participantId: string): Promise<number> => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
    if (!participant) return 0;
    
    const initiative = rollDie(20) + (participant.initiative || 0);
    
    dispatch({ 
      type: 'UPDATE_PARTICIPANT', 
      participantId, 
      updates: { initiative }
    });
    
    return initiative;
  }, [state.activeEncounter]);

  // ===========================
  // Actions & Damage
  // ===========================

  const takeAction = useCallback(async (action: Partial<CombatActionType>) => {
    if (!state.activeEncounter) return;

    let fullAction: CombatActionType = {
      id: crypto.randomUUID(),
      encounterId: state.activeEncounter.id,
      participantId: action.participantId || '',
      targetParticipantId: action.targetParticipantId,
      round: state.activeEncounter.currentRound,
      turnOrder: state.activeEncounter.participants.findIndex(p => 
        p.id === action.participantId
      ) + 1,
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

    const participant = state.activeEncounter.participants.find(p => p.id === action.participantId);
    if (!participant) return;

    // Handle spell casting
    if (action.actionType === 'cast_spell' && participant.participantType === 'player') {
      try {
        const spellLevel = (action as any).spellLevel as SpellSlotLevel || 1;
        const spellName = (action as any).spellName || 'Unknown Spell';
        const { updatedParticipant, updatedAction } = castSpell(action, participant, spellName, spellLevel);
        
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
        console.error('Spell casting failed:', error);
        // Still add the action but mark as failed
        fullAction.description += ` (Failed: ${(error as Error).message})`;
      }
    } else {
      // Mark participant as having taken action for non-spell actions
      if (action.participantId && (action.actionType === 'attack' || action.actionType === 'cast_spell')) {
        dispatch({
          type: 'UPDATE_PARTICIPANT',
          participantId: action.participantId,
          updates: { actionTaken: true },
        });
      }
    }
    
    dispatch({ type: 'ADD_ACTION', action: fullAction });
    
    // Apply damage if any
    if (action.damageDealt && action.targetParticipantId) {
      await dealDamage(action.targetParticipantId, action.damageDealt, action.damageType);
    }
  }, [state.activeEncounter]);

  const dealDamage = useCallback(async (
    participantId: string, 
    damage: number, 
    damageType?: DamageType
  ) => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    let actualDamage = damage;
    
    // Apply temporary HP first
    let tempHPDamage = Math.min(participant.temporaryHitPoints, actualDamage);
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
  }, [state.activeEncounter]);

  const healDamage = useCallback(async (participantId: string, healing: number) => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const newCurrentHP = Math.min(participant.maxHitPoints, participant.currentHitPoints + healing);
    
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { currentHitPoints: newCurrentHP },
    });
  }, [state.activeEncounter]);

  // ===========================
  // Conditions
  // ===========================

  const applyCondition = useCallback(async (
    participantId: string, 
    condition: Condition
  ) => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const newConditions = [...participant.conditions, condition];
    
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { conditions: newConditions },
    });
  }, [state.activeEncounter]);

  const removeCondition = useCallback(async (
    participantId: string, 
    conditionName: ConditionName
  ) => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const newConditions = participant.conditions.filter(c => c.name !== conditionName);
    
    dispatch({
      type: 'UPDATE_PARTICIPANT',
      participantId,
      updates: { conditions: newConditions },
    });
  }, [state.activeEncounter]);

  // ===========================
  // Death Saves
  // ===========================

  const rollDeathSave = useCallback(async (participantId: string): Promise<'success' | 'failure' | 'critical'> => {
    const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
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
  }, [state.activeEncounter]);

  // ===========================
  // Participant Management
  // ===========================

  const addParticipant = useCallback(async (participant: Partial<CombatParticipant>) => {
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
      monsterData: participant.monsterData,
      spellSlots: undefined,
      activeConcentration: null,
    };
    
    dispatch({ type: 'ADD_PARTICIPANT', participant: fullParticipant });
  }, []);

  const removeParticipant = useCallback(async (participantId: string) => {
    dispatch({ type: 'REMOVE_PARTICIPANT', participantId });
  }, []);

  const updateParticipant = useCallback(async (
    participantId: string, 
    updates: Partial<CombatParticipant>
  ) => {
    dispatch({ type: 'UPDATE_PARTICIPANT', participantId, updates });
  }, []);

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
  };

  return (
    <CombatContext.Provider value={contextValue}>
      {children}
    </CombatContext.Provider>
  );
};
