/**
 * Character Context
 * 
 * This file defines the CharacterContext for managing global character data
 * within the application. It includes the context provider, a reducer for state
 * updates (e.g., during character creation or when loading a character), and
 * a custom hook for accessing the character state and dispatch function.
 * 
 * Main Components:
 * - CharacterContext: The React context object.
 * - CharacterProvider: The provider component.
 * - useCharacter: Custom hook to consume the context.
 * 
 * Key State:
 * - character: Object containing details of the currently active/selected character.
 * - isDirty, currentStep, isLoading, error: UI state related to character management.
 * 
 * Dependencies:
 * - React
 * - Supabase client (`@/integrations/supabase/client`) - (Note: supabase client is imported but not directly used in this file's current code, might be for future use or removed if unused)
 * - Character types (`@/types/character`)
 * - useToast hook (`@/components/ui/use-toast`)
 * 
 * @author AI Dungeon Master Team
 */

// SDK Imports
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Project Modules & Hooks
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Imported but not directly used in the provided snippet
import { Character, transformCharacterForStorage } from '@/types/character';


// Interfaces and Types (defined in-file, specific to this context)
/**
 * Interface defining the shape of the character state
 * Includes the character data, UI state, and error handling
 */
interface CharacterState {
  character: Character | null;
  isDirty: boolean;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Union type defining all possible actions that can be dispatched to modify character state
 * Each action type has its own payload structure
 */
type CharacterAction =
  | { type: 'SET_CHARACTER'; payload: Character }
  | { type: 'UPDATE_CHARACTER'; payload: Partial<Character> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' }
  | { type: 'UPDATE_SPELL_SLOTS'; payload: Record<number, { max: number; current: number }> }
  | { type: 'UPDATE_CONCENTRATION'; payload: string | null };
// Added missing actions to CharacterAction type

/**
 * Initial state with default values to avoid null checks
 * Provides a base character object with empty/default values
 */
const initialState: CharacterState = {
  character: {
    user_id: '', // Will be set when user authenticates
    name: '',
    race: null,
    subrace: null,
    class: null,
    level: 1,
    background: null,
    abilityScores: {
      strength: { score: 10, modifier: 0, savingThrow: false },
      dexterity: { score: 10, modifier: 0, savingThrow: false },
      constitution: { score: 10, modifier: 0, savingThrow: false },
      intelligence: { score: 10, modifier: 0, savingThrow: false },
      wisdom: { score: 10, modifier: 0, savingThrow: false },
      charisma: { score: 10, modifier: 0, savingThrow: false }
    },
    experience: 0,
    alignment: '',
    personalityTraits: [],
    ideals: [],
    bonds: [],
    flaws: [],
    // Inspiration system
    inspiration: false,
    personalityNotes: '',
    personalityIntegration: {
      activeTraits: [],
      inspirationTriggers: [],
      inspirationHistory: []
    },
    equipment: [],
    skillProficiencies: [],
    toolProficiencies: [],
    savingThrowProficiencies: [],
    languages: []
  },
  isDirty: false,
  currentStep: 0,
  isLoading: false,
  error: null,
};

/**
 * Create context with type definition for better TypeScript support
 */
const CharacterContext = createContext<{
  state: CharacterState;
  dispatch: React.Dispatch<CharacterAction>;
} | null>(null);

/**
 * Reducer function to handle all character state updates
 * Each action type corresponds to a specific state transformation
 */
function characterReducer(state: CharacterState, action: CharacterAction): CharacterState {
  // Debug logging to track state changes
  console.log('Reducer action:', action.type, 'payload' in action ? action.payload : 'No payload');
  console.log('Current state:', state);

  // Enhanced error boundary for reducer operations
  try {
    switch (action.type) {
      case 'SET_CHARACTER': {
        // Validate character data before setting
        if (!action.payload || typeof action.payload !== 'object') {
          console.error('Invalid character payload:', action.payload);
          return {
            ...state,
            error: 'Invalid character data provided'
          };
        }

        return {
          ...state,
          character: action.payload,
          isDirty: false,
          error: null // Clear any previous errors
        };
      }

      case 'UPDATE_CHARACTER': {
        console.log('🔄 UPDATE_CHARACTER reducer called');
        console.log('🔄 Current state.character:', state.character);
        console.log('🔄 Action payload:', action.payload);

        // Special logging for spell-related updates
        if (action.payload.cantrips || action.payload.knownSpells) {
          console.log('🎯 [CharacterContext] Spell update detected:', {
            incomingCantrips: action.payload.cantrips,
            incomingKnownSpells: action.payload.knownSpells,
            currentCantrips: state.character?.cantrips,
            currentKnownSpells: state.character?.knownSpells
          });
        }

        // Validate current character state
        if (!state.character || typeof state.character !== 'object') {
          console.error('No character to update or invalid character state');
          return {
            ...state,
            error: 'No character data to update'
          };
        }

        // Validate payload
        if (!action.payload || typeof action.payload !== 'object') {
          console.error('Invalid update payload:', action.payload);
          return {
            ...state,
            error: 'Invalid character update data'
          };
        }

        // Safe merge with validation
        const updatedCharacter = {
          ...state.character,
          ...action.payload
        };

        console.log('🔄 Updated character after merge:', updatedCharacter);
        console.log('🔄 Class specifically:', updatedCharacter?.class);

        // Additional logging for spell updates
        if (action.payload.cantrips || action.payload.knownSpells) {
          console.log('🎯 [CharacterContext] Final spell state after update:', {
            finalCantrips: updatedCharacter.cantrips,
            finalKnownSpells: updatedCharacter.knownSpells,
            cantripCount: updatedCharacter.cantrips?.length || 0,
            spellCount: updatedCharacter.knownSpells?.length || 0
          });
        }

        const newState = {
          ...state,
          character: updatedCharacter,
          isDirty: true,
          error: null // Clear any previous errors on successful update
        };

        console.log('🔄 New state returned from reducer:', newState);
        return newState;
      }
      case 'SET_STEP': {
        // Validate step number
        const step = action.payload;
        if (typeof step !== 'number' || step < 0 || step > 20) {
          console.error('Invalid step number:', step);
          return {
            ...state,
            error: 'Invalid character creation step'
          };
        }

        return {
          ...state,
          currentStep: step,
          error: null
        };
      }

      case 'SET_LOADING': {
        // Validate loading boolean
        const loading = action.payload;
        if (typeof loading !== 'boolean') {
          console.error('Invalid loading value:', loading);
          return {
            ...state,
            error: 'Invalid loading state'
          };
        }

        return {
          ...state,
          isLoading: loading,
          error: null
        };
      }

      case 'SET_ERROR': {
        // Validate error message
        const error = action.payload;
        if (error !== null && typeof error !== 'string') {
          console.error('Invalid error value:', error);
          return {
            ...state,
            error: 'Invalid error message format'
          };
        }

        return {
          ...state,
          error: error
        };
      }

      case 'UPDATE_SPELL_SLOTS': {
        // Validate spell slots payload
        const spellSlots = action.payload;
        if (!spellSlots || typeof spellSlots !== 'object') {
          console.error('Invalid spell slots payload:', spellSlots);
          return {
            ...state,
            error: 'Invalid spell slot data'
          };
        }

        // Validate spell slot structure
        for (const [level, slots] of Object.entries(spellSlots)) {
          const levelNum = parseInt(level, 10);
          if (isNaN(levelNum) || levelNum < 0 || levelNum > 9) {
            console.error('Invalid spell slot level:', level);
            return {
              ...state,
              error: 'Invalid spell slot level'
            };
          }

          if (!slots || typeof slots !== 'object' ||
              typeof slots.max !== 'number' || typeof slots.current !== 'number' ||
              slots.max < 0 || slots.current < 0 || slots.current > slots.max) {
            console.error('Invalid spell slot data for level', level, ':', slots);
            return {
              ...state,
              error: 'Invalid spell slot structure'
            };
          }
        }

        // Validate character exists before updating
        if (!state.character) {
          console.error('No character to update spell slots for');
          return {
            ...state,
            error: 'No character data to update'
          };
        }

        return {
          ...state,
          character: {
            ...state.character,
            spellSlots: spellSlots,
          },
          isDirty: true,
          error: null
        };
      }

      case 'UPDATE_CONCENTRATION': {
        // Validate concentration payload
        const concentration = action.payload;
        if (concentration !== null && typeof concentration !== 'string') {
          console.error('Invalid concentration payload:', concentration);
          return {
            ...state,
            error: 'Invalid concentration spell data'
          };
        }

        // Validate character exists before updating
        if (!state.character) {
          console.error('No character to update concentration for');
          return {
            ...state,
            error: 'No character data to update'
          };
        }

        return {
          ...state,
          character: {
            ...state.character,
            activeConcentration: concentration,
          },
          isDirty: true,
          error: null
        };
      }

      case 'RESET': {
        console.log('Resetting character state to initial state');
        return initialState;
      }

      default: {
        console.warn('Unknown action type dispatched:', action);
        return state;
      }
    }
  } catch (error) {
    console.error('Unexpected error in character reducer:', error);
    return {
      ...state,
      error: 'An unexpected error occurred while updating character data'
    };
  }
}
// Added reducer cases for spell slot and concentration updates

/**
 * Provider component that wraps the application to provide character state
 * Initializes the reducer and provides context values to children
 */
export function CharacterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(characterReducer, initialState);
  const { toast } = useToast();

  const value = {
    state,
    dispatch,
  };

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
}

/**
 * Custom hook to access character context
 * Throws an error if used outside of CharacterProvider
 */
export function useCharacter() {
  const context = useContext(CharacterContext);
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
}

// Remove the saveCharacterDraft function as it's now handled by useCharacterSave hook
