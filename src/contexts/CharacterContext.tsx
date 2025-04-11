import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Character, transformCharacterForStorage } from '@/types/character';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  | { type: 'RESET' }; // No payload for RESET action

/**
 * Initial state with default values to avoid null checks
 * Provides a base character object with empty/default values
 */
const initialState: CharacterState = {
  character: {
    user_id: '', // Will be set when user authenticates
    name: '',
    race: null,
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
    equipment: []
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

  switch (action.type) {
    case 'SET_CHARACTER':
      return {
        ...state,
        character: action.payload,
        isDirty: false,
      };
    case 'UPDATE_CHARACTER':
      const updatedCharacter = {
        ...state.character,
        ...action.payload
      };
      console.log('Updated character:', updatedCharacter);
      return {
        ...state,
        character: updatedCharacter,
        isDirty: true,
      };
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

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
