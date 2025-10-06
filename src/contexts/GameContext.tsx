/**
 * Game Context
 *
 * This context manages the overall game state, including dice roll deduplication,
 * combat awareness, and coordination between different game systems.
 * It acts as a central hub for game mechanics and state management.
 *
 * Key Features:
 * - Dice roll request deduplication to prevent multiple popups
 * - Combat state awareness and integration with CombatContext
 * - Turn management and initiative tracking
 * - Game phase management (exploration, combat, social interaction)
 *
 * @author AI Dungeon Master Team
 */

import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import logger from '@/lib/logger';
import { DiceRollRequest, DiceRollQueue, DiceRollRequestType } from '@/types/combat';
import { useCombat } from '@/contexts/CombatContext';
import { v4 as uuidv4 } from 'uuid';

// Game phase types
export type GamePhase =
  | 'exploration'      // General adventuring, skill checks, social interaction
  | 'combat'          // Active combat with initiative order
  | 'social'          // Heavy dialogue, negotiation, roleplay
  | 'puzzle'          // Problem-solving, investigation
  | 'rest';           // Short/long rest periods

// Game state interface
export interface GameState {
  // Current game phase
  currentPhase: GamePhase;

  // Dice roll management
  diceRollQueue: DiceRollQueue;

  // Combat integration
  isInCombat: boolean;
  currentTurnPlayerId?: string;

  // Game flow
  lastActionTime?: Date;
  pendingActions: string[];

  // AI response tracking
  lastAiResponse?: {
    timestamp: Date;
    rollRequests: DiceRollRequest[];
  };
}

// Action types for game state updates
type GameAction =
  | { type: 'SET_PHASE'; payload: GamePhase }
  | { type: 'ADD_DICE_ROLL_REQUEST'; payload: DiceRollRequest }
  | { type: 'COMPLETE_DICE_ROLL'; payload: { id: string; result: any } }
  | { type: 'CANCEL_DICE_ROLL'; payload: string }
  | { type: 'CLEAR_DICE_ROLL_QUEUE' }
  | { type: 'SET_COMBAT_STATE'; payload: { isInCombat: boolean; currentTurnPlayerId?: string } }
  | { type: 'SET_AI_RESPONSE'; payload: { rollRequests: DiceRollRequest[] } }
  | { type: 'ADD_PENDING_ACTION'; payload: string }
  | { type: 'REMOVE_PENDING_ACTION'; payload: string };

// Initial game state
const initialState: GameState = {
  currentPhase: 'exploration',
  diceRollQueue: {
    pendingRolls: [],
    isProcessingRoll: false
  },
  isInCombat: false,
  pendingActions: []
};

// Game context value interface
export interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;

  // Dice roll management
  requestDiceRoll: (request: Omit<DiceRollRequest, 'id' | 'timestamp' | 'status'>) => string;
  completeDiceRoll: (rollId: string, result: any) => void;
  cancelDiceRoll: (rollId: string) => void;
  getCurrentDiceRoll: () => DiceRollRequest | null;

  // Game phase management
  setGamePhase: (phase: GamePhase) => void;

  // AI integration
  processAiResponse: (rollRequests: any[]) => void;

  // Combat integration
  updateCombatState: (isInCombat: boolean, currentTurnPlayerId?: string) => void;
}

// Create context
const GameContext = createContext<GameContextValue | undefined>(undefined);

/**
 * Game state reducer
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return {
        ...state,
        currentPhase: action.payload
      };

    case 'ADD_DICE_ROLL_REQUEST': {
      // Check for duplicates based on type, purpose, and participant
      const isDuplicate = state.diceRollQueue.pendingRolls.some(roll =>
        roll.requestType === action.payload.requestType &&
        roll.description === action.payload.description &&
        roll.participantId === action.payload.participantId &&
        roll.status === 'pending'
      );

      if (isDuplicate) {
        logger.info('🎲 Duplicate dice roll request detected, ignoring:', action.payload);
        return state;
      }

      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          pendingRolls: [...state.diceRollQueue.pendingRolls, action.payload],
          currentRollId: state.diceRollQueue.currentRollId || action.payload.id
        }
      };
    }

    case 'COMPLETE_DICE_ROLL': {
      const completedRolls = state.diceRollQueue.pendingRolls.map(roll =>
        roll.id === action.payload.id
          ? { ...roll, status: 'completed' as const, result: action.payload.result }
          : roll
      );

      // Remove completed rolls after a short delay and set next current roll
      const remainingPendingRolls = completedRolls.filter(roll => roll.status === 'pending');
      const nextCurrentRollId = remainingPendingRolls.length > 0 ? remainingPendingRolls[0].id : undefined;

      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          pendingRolls: completedRolls,
          currentRollId: nextCurrentRollId,
          isProcessingRoll: false
        }
      };
    }

    case 'CANCEL_DICE_ROLL': {
      const cancelledRolls = state.diceRollQueue.pendingRolls.map(roll =>
        roll.id === action.payload
          ? { ...roll, status: 'cancelled' as const }
          : roll
      );

      const remainingAfterCancel = cancelledRolls.filter(roll => roll.status === 'pending');
      const nextAfterCancel = remainingAfterCancel.length > 0 ? remainingAfterCancel[0].id : undefined;

      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          pendingRolls: cancelledRolls,
          currentRollId: nextAfterCancel,
          isProcessingRoll: false
        }
      };
    }

    case 'CLEAR_DICE_ROLL_QUEUE':
      return {
        ...state,
        diceRollQueue: {
          pendingRolls: [],
          isProcessingRoll: false
        }
      };

    case 'SET_COMBAT_STATE':
      return {
        ...state,
        isInCombat: action.payload.isInCombat,
        currentTurnPlayerId: action.payload.currentTurnPlayerId,
        currentPhase: action.payload.isInCombat ? 'combat' : 'exploration'
      };

    case 'SET_AI_RESPONSE':
      return {
        ...state,
        lastAiResponse: {
          timestamp: new Date(),
          rollRequests: action.payload.rollRequests
        }
      };

    case 'ADD_PENDING_ACTION':
      return {
        ...state,
        pendingActions: [...state.pendingActions, action.payload]
      };

    case 'REMOVE_PENDING_ACTION':
      return {
        ...state,
        pendingActions: state.pendingActions.filter(action => action !== action.payload)
      };

    default:
      return state;
  }
}

/**
 * Game Context Provider
 */
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { state: combatState } = useCombat();

  // Sync with combat context
  useEffect(() => {
    const isInCombat = combatState.isInCombat;
    const currentTurnPlayerId = combatState.activeEncounter?.currentTurnParticipantId;

    if (state.isInCombat !== isInCombat || state.currentTurnPlayerId !== currentTurnPlayerId) {
      dispatch({
        type: 'SET_COMBAT_STATE',
        payload: { isInCombat, currentTurnPlayerId }
      });
    }
  }, [combatState.isInCombat, combatState.activeEncounter?.currentTurnParticipantId, state.isInCombat, state.currentTurnPlayerId]);

  // Auto-cleanup completed/cancelled rolls after delay
  useEffect(() => {
    const completedOrCancelled = state.diceRollQueue.pendingRolls.filter(
      roll => roll.status === 'completed' || roll.status === 'cancelled'
    );

    if (completedOrCancelled.length > 0) {
      const timeoutId = setTimeout(() => {
        dispatch({
          type: 'CLEAR_DICE_ROLL_QUEUE'
        });
      }, 2000); // Clear after 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [state.diceRollQueue.pendingRolls]);

  /**
   * Request a new dice roll with automatic deduplication
   */
  const requestDiceRoll = useCallback((
    request: Omit<DiceRollRequest, 'id' | 'timestamp' | 'status'>
  ): string => {
    const rollRequest: DiceRollRequest = {
      ...request,
      id: uuidv4(),
      timestamp: new Date(),
      status: 'pending'
    };

    logger.info('🎲 Requesting dice roll:', rollRequest);
    dispatch({ type: 'ADD_DICE_ROLL_REQUEST', payload: rollRequest });

    return rollRequest.id;
  }, []);

  /**
   * Complete a dice roll with the result
   */
  const completeDiceRoll = useCallback((rollId: string, result: any) => {
    logger.info('🎯 Completing dice roll:', rollId, result);
    dispatch({ type: 'COMPLETE_DICE_ROLL', payload: { id: rollId, result } });
  }, []);

  /**
   * Cancel a pending dice roll
   */
  const cancelDiceRoll = useCallback((rollId: string) => {
    logger.info('❌ Cancelling dice roll:', rollId);
    dispatch({ type: 'CANCEL_DICE_ROLL', payload: rollId });
  }, []);

  /**
   * Get the current dice roll that should be displayed to the user
   */
  const getCurrentDiceRoll = useCallback((): DiceRollRequest | null => {
    if (!state.diceRollQueue.currentRollId) return null;

    return state.diceRollQueue.pendingRolls.find(
      roll => roll.id === state.diceRollQueue.currentRollId && roll.status === 'pending'
    ) || null;
  }, [state.diceRollQueue.currentRollId, state.diceRollQueue.pendingRolls]);

  /**
   * Set the current game phase
   */
  const setGamePhase = useCallback((phase: GamePhase) => {
    logger.info('🎮 Setting game phase:', phase);
    dispatch({ type: 'SET_PHASE', payload: phase });
  }, []);

  /**
   * Process AI response and extract dice roll requests with deduplication
   */
  const processAiResponse = useCallback((rollRequests: any[]) => {
    logger.info('🤖 Processing AI response with roll requests:', rollRequests);

    if (!rollRequests || !Array.isArray(rollRequests)) return;

    // Track this AI response
    const processedRollRequests: DiceRollRequest[] = [];

    rollRequests.forEach((request: any) => {
      try {
        // Convert AI request format to our internal format
        const rollRequest: Omit<DiceRollRequest, 'id' | 'timestamp' | 'status'> = {
          requestType: request.type as DiceRollRequestType,
          participantId: request.participantId,
          description: request.purpose || request.description || 'Dice roll requested',
          rollConfig: {
            dieType: 20, // Default to d20, parse from formula if available
            count: 1,
            modifier: 0,
            advantage: request.advantage || false,
            disadvantage: request.disadvantage || false,
            ...parseRollFormula(request.formula)
          }
        };

        const rollId = requestDiceRoll(rollRequest);
        processedRollRequests.push({
          ...rollRequest,
          id: rollId,
          timestamp: new Date(),
          status: 'pending'
        });
      } catch (error) {
        logger.warn('Failed to process roll request:', request, error);
      }
    });

    dispatch({ type: 'SET_AI_RESPONSE', payload: { rollRequests: processedRollRequests } });
  }, [requestDiceRoll]);

  /**
   * Update combat state integration
   */
  const updateCombatState = useCallback((isInCombat: boolean, currentTurnPlayerId?: string) => {
    dispatch({ type: 'SET_COMBAT_STATE', payload: { isInCombat, currentTurnPlayerId } });
  }, []);

  const contextValue: GameContextValue = {
    state,
    dispatch,
    requestDiceRoll,
    completeDiceRoll,
    cancelDiceRoll,
    getCurrentDiceRoll,
    setGamePhase,
    processAiResponse,
    updateCombatState
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

/**
 * Hook to use the Game Context
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

/**
 * Parse a dice formula string to extract die type, count, and modifier
 */
function parseRollFormula(formula?: string): Partial<DiceRollRequest['rollConfig']> {
  if (!formula) return {};

  try {
    // Match patterns like "1d20+5", "2d6", "1d8-2", etc.
    const match = formula.match(/^(\d+)?d(\d+)([-+]\d+)?$/);
    if (!match) return {};

    const [, countStr, dieTypeStr, modifierStr] = match;

    return {
      count: countStr ? parseInt(countStr) : 1,
      dieType: parseInt(dieTypeStr),
      modifier: modifierStr ? parseInt(modifierStr) : 0
    };
  } catch (error) {
    logger.warn('Failed to parse roll formula:', formula, error);
    return {};
  }
}