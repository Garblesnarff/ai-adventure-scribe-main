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

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { DiceRollRequest, DiceRollQueue, DiceRollRequestType } from '@/types/combat';
import type { ReactNode } from 'react';

import { useCombat } from '@/contexts/CombatContext';
import logger from '@/lib/logger';
import { throttle } from '@/lib/utils';

// Game phase types
export type GamePhase =
  | 'exploration' // General adventuring, skill checks, social interaction
  | 'combat' // Active combat with initiative order
  | 'social' // Heavy dialogue, negotiation, roleplay
  | 'puzzle' // Problem-solving, investigation
  | 'rest'; // Short/long rest periods

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
  | { type: 'SET_CURRENT_BATCH'; payload: string }
  | { type: 'CLEAR_BATCH' }
  | { type: 'SET_COMBAT_STATE'; payload: { isInCombat: boolean; currentTurnPlayerId?: string } }
  | { type: 'SET_AI_RESPONSE'; payload: { rollRequests: DiceRollRequest[] } }
  | { type: 'ADD_PENDING_ACTION'; payload: string }
  | { type: 'REMOVE_PENDING_ACTION'; payload: string };

// Initial game state
const initialState: GameState = {
  currentPhase: 'exploration',
  diceRollQueue: {
    pendingRolls: [],
    isProcessingRoll: false,
    currentBatchId: undefined,
    completedBatchRolls: [],
  },
  isInCombat: false,
  pendingActions: [],
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

  // Batch management
  isBatchComplete: () => boolean;
  getBatchResults: () => DiceRollRequest[];
  clearBatch: () => void;

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
      // Change Detection: Primitive comparison (===)
      // Only update state if phase actually changes
      // Comparison Strategy: GamePhase is a string union type (primitive)
      if (state.currentPhase === action.payload) {
        return state; // No change, return same reference to prevent re-render
      }
      return {
        ...state,
        currentPhase: action.payload,
      };

    case 'ADD_DICE_ROLL_REQUEST': {
      // Check for duplicates based on type, purpose, and participant
      const isDuplicate = state.diceRollQueue.pendingRolls.some(
        (roll) =>
          roll.requestType === action.payload.requestType &&
          roll.description === action.payload.description &&
          roll.participantId === action.payload.participantId &&
          roll.status === 'pending',
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
          currentRollId: state.diceRollQueue.currentRollId || action.payload.id,
        },
      };
    }

    case 'COMPLETE_DICE_ROLL': {
      const completedRolls = state.diceRollQueue.pendingRolls.map((roll) =>
        roll.id === action.payload.id
          ? { ...roll, status: 'completed' as const, result: action.payload.result }
          : roll,
      );

      // Find the completed roll
      const completedRoll = completedRolls.find((roll) => roll.id === action.payload.id);

      // If this roll is part of a batch, add to completedBatchRolls
      const updatedBatchRolls =
        completedRoll?.batchId === state.diceRollQueue.currentBatchId && completedRoll
          ? [...state.diceRollQueue.completedBatchRolls, completedRoll]
          : state.diceRollQueue.completedBatchRolls;

      // Remove completed rolls after a short delay and set next current roll
      const remainingPendingRolls = completedRolls.filter((roll) => roll.status === 'pending');
      const nextCurrentRollId =
        remainingPendingRolls.length > 0 ? remainingPendingRolls[0].id : undefined;

      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          pendingRolls: completedRolls,
          currentRollId: nextCurrentRollId,
          isProcessingRoll: false,
          completedBatchRolls: updatedBatchRolls,
        },
      };
    }

    case 'CANCEL_DICE_ROLL': {
      const cancelledRolls = state.diceRollQueue.pendingRolls.map((roll) =>
        roll.id === action.payload ? { ...roll, status: 'cancelled' as const } : roll,
      );

      const remainingAfterCancel = cancelledRolls.filter((roll) => roll.status === 'pending');
      const nextAfterCancel =
        remainingAfterCancel.length > 0 ? remainingAfterCancel[0].id : undefined;

      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          pendingRolls: cancelledRolls,
          currentRollId: nextAfterCancel,
          isProcessingRoll: false,
        },
      };
    }

    case 'SET_CURRENT_BATCH':
      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          currentBatchId: action.payload,
          completedBatchRolls: [],
        },
      };

    case 'CLEAR_BATCH':
      return {
        ...state,
        diceRollQueue: {
          ...state.diceRollQueue,
          currentBatchId: undefined,
          completedBatchRolls: [],
        },
      };

    case 'CLEAR_DICE_ROLL_QUEUE':
      // Change Detection: Check if queue is already empty
      // Comparison Strategy: Array length check and boolean primitive comparison
      if (
        state.diceRollQueue.pendingRolls.length === 0 &&
        state.diceRollQueue.isProcessingRoll === false &&
        !state.diceRollQueue.currentBatchId &&
        state.diceRollQueue.completedBatchRolls.length === 0
      ) {
        return state; // Queue already cleared, return same reference to prevent re-render
      }
      return {
        ...state,
        diceRollQueue: {
          pendingRolls: [],
          isProcessingRoll: false,
          currentBatchId: undefined,
          completedBatchRolls: [],
        },
      };

    case 'SET_COMBAT_STATE': {
      // Change Detection: Primitive comparison (===)
      // Only update state if combat state values actually change
      // Comparison Strategy: All values are primitives (boolean, string | undefined)
      const newPhase = action.payload.isInCombat ? 'combat' : 'exploration';
      if (
        state.isInCombat === action.payload.isInCombat &&
        state.currentTurnPlayerId === action.payload.currentTurnPlayerId &&
        state.currentPhase === newPhase
      ) {
        return state; // No change, return same reference to prevent re-render
      }
      return {
        ...state,
        isInCombat: action.payload.isInCombat,
        currentTurnPlayerId: action.payload.currentTurnPlayerId,
        currentPhase: newPhase,
      };
    }

    case 'SET_AI_RESPONSE':
      return {
        ...state,
        lastAiResponse: {
          timestamp: new Date(),
          rollRequests: action.payload.rollRequests,
        },
      };

    case 'ADD_PENDING_ACTION':
      // Change Detection: Check if action already exists in pendingActions
      // Comparison Strategy: Array includes check for primitive string values
      if (state.pendingActions.includes(action.payload)) {
        return state; // Action already pending, return same reference to prevent re-render
      }
      return {
        ...state,
        pendingActions: [...state.pendingActions, action.payload],
      };

    case 'REMOVE_PENDING_ACTION':
      // Change Detection: Check if action exists before filtering
      // Comparison Strategy: Array includes check for primitive string values
      if (!state.pendingActions.includes(action.payload)) {
        return state; // Action not in list, return same reference to prevent re-render
      }
      return {
        ...state,
        pendingActions: state.pendingActions.filter((action) => action !== action.payload),
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

  // Track previous combat state values to prevent infinite loops
  // This ref stores the last combat state values we synchronized with GameContext
  // Equality Strategy: Uses primitive comparison (=== for boolean and string)
  // - isInCombat: boolean primitive, compared by value
  // - currentTurnPlayerId: string | undefined primitive, compared by value
  // Deep equality is NOT needed because we only track primitive values, not nested objects
  const prevCombatStateRef = useRef({
    isInCombat: false,
    currentTurnPlayerId: undefined as string | undefined,
  });

  // Ref to always access latest state without causing useCallback dependencies to change
  // This prevents stale closure bugs in async operations and callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Sync with combat context - only dispatch when values actually change
  // Performance: This effect extracts primitives from combatState to avoid triggering
  // on activeEncounter object reference changes. Only the extracted primitive values
  // are compared, preventing unnecessary re-renders and infinite loops.
  useEffect(() => {
    const isInCombat = combatState.isInCombat;
    const currentTurnPlayerId = combatState.activeEncounter?.currentTurnParticipantId;

    // Only dispatch if values actually changed from the previous combat context values
    // Comparison Strategy:
    // - Uses !== for primitive values (boolean and string)
    // - Prevents infinite loops by storing previous values in ref
    // - No deep equality needed as we're only comparing primitives
    const prevState = prevCombatStateRef.current;
    if (
      prevState.isInCombat !== isInCombat ||
      prevState.currentTurnPlayerId !== currentTurnPlayerId
    ) {
      // Update ref to track new values
      prevCombatStateRef.current = { isInCombat, currentTurnPlayerId };

      dispatch({
        type: 'SET_COMBAT_STATE',
        payload: { isInCombat, currentTurnPlayerId },
      });
    }
  }, [combatState.isInCombat, combatState.activeEncounter?.currentTurnParticipantId]);

  // Auto-cleanup completed/cancelled rolls after delay
  // Only clear when ALL rolls are done (no pending rolls remaining)
  useEffect(() => {
    const completedOrCancelled = state.diceRollQueue.pendingRolls.filter(
      (roll) => roll.status === 'completed' || roll.status === 'cancelled',
    );

    const stillPending = state.diceRollQueue.pendingRolls.filter(
      (roll) => roll.status === 'pending',
    );

    // Only clear if we have completed/cancelled rolls AND no pending rolls
    // This ensures batch rolls display sequentially without being prematurely cleared
    if (completedOrCancelled.length > 0 && stillPending.length === 0) {
      const timeoutId = setTimeout(() => {
        dispatch({
          type: 'CLEAR_DICE_ROLL_QUEUE',
        });
      }, 2000); // Clear after 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [state.diceRollQueue.pendingRolls]);

  /**
   * Request a new dice roll with automatic deduplication
   *
   * Fixed: Properly memoized with useCallback and empty dependencies.
   * Only uses dispatch (stable) and local variables, so no external dependencies needed.
   * Dependencies: [] - no external dependencies, uses only dispatch and local scope
   */
  const requestDiceRoll = useCallback(
    (request: Omit<DiceRollRequest, 'id' | 'timestamp' | 'status'>): string => {
      const rollRequest: DiceRollRequest = {
        ...request,
        id: uuidv4(),
        timestamp: new Date(),
        status: 'pending',
      };

      logger.info('🎲 Requesting dice roll:', rollRequest);
      dispatch({ type: 'ADD_DICE_ROLL_REQUEST', payload: rollRequest });

      return rollRequest.id;
    },
    [],
  ); // No dependencies - only uses dispatch and function parameters

  /**
   * Complete a dice roll with the result
   *
   * Fixed: Properly memoized with useCallback and empty dependencies.
   * Only uses dispatch (stable) and function parameters.
   * Dependencies: [] - no external dependencies, uses only dispatch and parameters
   */
  const completeDiceRoll = useCallback((rollId: string, result: any) => {
    logger.info('🎯 Completing dice roll:', rollId, result);
    dispatch({ type: 'COMPLETE_DICE_ROLL', payload: { id: rollId, result } });
  }, []); // No dependencies - only uses dispatch and function parameters

  /**
   * Cancel a pending dice roll
   *
   * Fixed: Properly memoized with useCallback and empty dependencies.
   * Only uses dispatch (stable) and function parameters.
   * Dependencies: [] - no external dependencies, uses only dispatch and parameters
   */
  const cancelDiceRoll = useCallback((rollId: string) => {
    logger.info('❌ Cancelling dice roll:', rollId);
    dispatch({ type: 'CANCEL_DICE_ROLL', payload: rollId });
  }, []); // No dependencies - only uses dispatch and function parameters

  /**
   * Get the current dice roll that should be displayed to the user
   *
   * Fixed: Uses stateRef to access latest state without recreating callback on every state change.
   * This prevents stale closures while maintaining stable function reference.
   */
  const getCurrentDiceRoll = useCallback((): DiceRollRequest | null => {
    const currentState = stateRef.current;
    if (!currentState.diceRollQueue.currentRollId) return null;

    return (
      currentState.diceRollQueue.pendingRolls.find(
        (roll) => roll.id === currentState.diceRollQueue.currentRollId && roll.status === 'pending',
      ) || null
    );
  }, []); // Empty deps - uses stateRef to always get fresh state

  /**
   * Check if all rolls in the current batch are complete
   */
  const isBatchComplete = useCallback((): boolean => {
    const currentState = stateRef.current;
    const { currentBatchId, pendingRolls, completedBatchRolls } = currentState.diceRollQueue;

    if (!currentBatchId) return false;

    // Count pending rolls that belong to the current batch
    const pendingBatchRolls = pendingRolls.filter(
      (roll) => roll.batchId === currentBatchId && roll.status === 'pending',
    );

    // Batch is complete when no pending rolls remain with this batchId
    return pendingBatchRolls.length === 0 && completedBatchRolls.length > 0;
  }, []);

  /**
   * Get all completed rolls from the current batch
   */
  const getBatchResults = useCallback((): DiceRollRequest[] => {
    const currentState = stateRef.current;
    return currentState.diceRollQueue.completedBatchRolls;
  }, []);

  /**
   * Clear the current batch state
   */
  const clearBatch = useCallback(() => {
    logger.info('🧹 Clearing batch state');
    dispatch({ type: 'CLEAR_BATCH' });
  }, []);

  /**
   * Set the current game phase
   *
   * Fixed: Properly memoized with useCallback and empty dependencies.
   * Only uses dispatch (stable) and function parameters.
   * Change Detection: Uses stateRef to check current phase before dispatching.
   * Comparison Strategy: Primitive comparison (===) for GamePhase string union type.
   * Dependencies: [] - no external dependencies, uses stateRef and dispatch
   */
  const setGamePhase = useCallback((phase: GamePhase) => {
    // Change Detection: Only dispatch if phase actually changes
    // Uses stateRef to access current state without adding dependencies
    if (stateRef.current.currentPhase === phase) {
      logger.info('🎮 Game phase unchanged, skipping dispatch:', phase);
      return; // Early return prevents unnecessary dispatch and re-render
    }
    logger.info('🎮 Setting game phase:', phase);
    dispatch({ type: 'SET_PHASE', payload: phase });
  }, []); // No dependencies - only uses dispatch and function parameters

  /**
   * Process AI response and extract dice roll requests with deduplication
   * Enhanced with batch tracking for multi-roll scenarios
   *
   * Fixed: Properly memoized with requestDiceRoll dependency.
   * Since requestDiceRoll has stable reference (empty deps), this handler won't recreate unnecessarily.
   * Dependencies: [requestDiceRoll] - needed for calling requestDiceRoll within the handler
   */
  const processAiResponse = useCallback(
    (rollRequests: any[]) => {
      logger.info('🤖 Processing AI response with roll requests:', rollRequests);

      if (!rollRequests || !Array.isArray(rollRequests)) return;

      // Generate batchId if multiple rolls are requested
      const batchId = rollRequests.length > 1 ? uuidv4() : undefined;

      if (batchId) {
        logger.info('🎲 Creating batch with ID:', batchId);
        dispatch({ type: 'SET_CURRENT_BATCH', payload: batchId });
      }

      // Track this AI response
      const processedRollRequests: DiceRollRequest[] = [];

      const seenKeys = new Set<string>();

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
              ...parseRollFormula(request.formula),
            },
            batchId, // Assign batch ID
            dc: request.dc, // Extract DC for skill checks and saves
            ac: request.ac, // Extract AC for attack rolls
          };

          const dedupeKey = [
            rollRequest.requestType,
            rollRequest.participantId || 'any',
            rollRequest.description,
            rollRequest.rollConfig.dieType,
            rollRequest.rollConfig.count,
            rollRequest.rollConfig.modifier,
            rollRequest.rollConfig.advantage ? 'adv' : '',
            rollRequest.rollConfig.disadvantage ? 'dis' : '',
          ].join('|');

          if (seenKeys.has(dedupeKey)) {
            logger.info('🎲 Skipping duplicate AI roll request before queue:', rollRequest);
            return;
          }

          seenKeys.add(dedupeKey);

          const rollId = requestDiceRoll(rollRequest);
          processedRollRequests.push({
            ...rollRequest,
            id: rollId,
            timestamp: new Date(),
            status: 'pending',
          });
        } catch (error) {
          logger.warn('Failed to process roll request:', request, error);
        }
      });

      dispatch({ type: 'SET_AI_RESPONSE', payload: { rollRequests: processedRollRequests } });
    },
    [requestDiceRoll],
  ); // Depends on requestDiceRoll (stable reference)

  /**
   * Update combat state integration
   *
   * Fixed: Properly memoized with useCallback and empty dependencies.
   * Only uses dispatch (stable) and function parameters.
   * Change Detection: Uses stateRef to check combat state before dispatching.
   * Comparison Strategy: Primitive comparison (===) for boolean and string values.
   * Dependencies: [] - no external dependencies, uses stateRef and dispatch
   */
  const updateCombatState = useCallback((isInCombat: boolean, currentTurnPlayerId?: string) => {
    // Change Detection: Only dispatch if combat state values actually change
    // Uses stateRef to access current state without adding dependencies
    const currentState = stateRef.current;
    if (
      currentState.isInCombat === isInCombat &&
      currentState.currentTurnPlayerId === currentTurnPlayerId
    ) {
      logger.info('⚔️ Combat state unchanged, skipping dispatch:', {
        isInCombat,
        currentTurnPlayerId,
      });
      return; // Early return prevents unnecessary dispatch and re-render
    }
    dispatch({ type: 'SET_COMBAT_STATE', payload: { isInCombat, currentTurnPlayerId } });
  }, []); // No dependencies - only uses dispatch and function parameters

  /**
   * Throttled versions of frequently-called functions to prevent performance issues
   *
   * Throttle Strategy:
   * - updateCombatState: 100ms - Combat state updates need near-instant feedback but can be throttled slightly
   * - setGamePhase: 250ms - Phase transitions are less frequent but can happen during rapid state changes
   * - processAiResponse: 500ms - AI responses are async and don't need immediate processing
   *
   * Functions NOT throttled:
   * - requestDiceRoll: Already has deduplication logic in reducer, throttling could lose rolls
   * - completeDiceRoll: Must execute immediately to show results to user
   * - cancelDiceRoll: Must execute immediately for responsive user feedback
   * - getCurrentDiceRoll: Read-only getter, no state updates
   */
  const throttledUpdateCombatState = useMemo(
    () => throttle(updateCombatState, 100),
    [updateCombatState],
  ); // 100ms - Combat state updates should be near-instant but can be throttled slightly

  const throttledSetGamePhase = useMemo(() => throttle(setGamePhase, 250), [setGamePhase]); // 250ms - Phase transitions are less frequent but can happen during rapid state changes

  const throttledProcessAiResponse = useMemo(
    () => throttle(processAiResponse, 500),
    [processAiResponse],
  ); // 500ms - AI responses are async and don't need immediate processing

  const contextValue: GameContextValue = {
    state,
    dispatch,
    requestDiceRoll,
    completeDiceRoll,
    cancelDiceRoll,
    getCurrentDiceRoll,
    isBatchComplete,
    getBatchResults,
    clearBatch,
    setGamePhase: throttledSetGamePhase,
    processAiResponse: throttledProcessAiResponse,
    updateCombatState: throttledUpdateCombatState,
  };

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
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
      modifier: modifierStr ? parseInt(modifierStr) : 0,
    };
  } catch (error) {
    logger.warn('Failed to parse roll formula:', formula, error);
    return {};
  }
}
