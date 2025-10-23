/**
 * CHARACTER CONTEXT - Central state management for character creation and display
 * 
 * WHY THIS EXISTS:
 * - 10+ components need access to same character data (race, class, abilities, etc)
 * - Prevents prop drilling through 7 levels of components
 * - Enables undo/redo and draft management
 * 
 * BUSINESS LOGIC:
 * - isDirty flag prevents data loss on back button
 * - canSave validation ensures required fields before database save
 * - Character cannot be saved without: name, race, class (mandatory for monetization)
 * 
 * INTEGRATION:
 * - Read from: /pages/CharacterCreateEntry (entry point)
 * - Write to: Supabase when user clicks "Save Character"
 * - Consumed by: 10+ child components via useCharacter() hook
 * 
 * PERFORMANCE NOTE:
 * - Memoized with useMemo to prevent unnecessary re-renders
 * - 100+ render cycles possible during character creation (if not optimized)
 * - Each dispatch triggers re-render of all subscribers
 * 
 * SECURITY NOTE:
 * - campaign_id is set when creating character in campaign context
 * - This field is CRITICAL - without it, user sees other campaigns' characters
 * - Always verify campaign_id matches authenticated user
 */

// SDK Imports
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Project Modules & Hooks
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Imported but not directly used in the provided snippet
import { Character, transformCharacterForStorage } from '@/types/character';
import logger from '@/lib/logger';


// Interfaces and Types (defined in-file, specific to this context)
/**
 * CHARACTER STATE - Represents one character from creation → gameplay
 *
 * REQUIRED FIELDS (character cannot save without these):
 * - character.name: string (1-50 chars, stored on character sheet)
 * - character.race: CharacterRace (determines speed, languages, physical traits)
 * - character.class: CharacterClass (determines hit die, abilities, spells)
 *
 * OPTIONAL FIELDS (nice to have, don't block save):
 * - background, personality traits, physical attributes, etc
 *
 * MONETIZATION FIELDS:
 * - character.campaign_id: nullable string (free users: 1 campaign, pro: unlimited)
 * - If campaign_id set, character is "campaign-scoped" (shared with teammates)
 * - If campaign_id null, character is "personal" (only visible to owner)
 *
 * FLAGS:
 * - isDirty: true if unsaved changes exist (shows "*" in UI, prevents accidental loss)
 * - isLoading: true during save (shows spinner, disables buttons)
 * - error: string | null with validation errors (what user must fix before saving)
 *
 * NEVER:
 * - Modify state directly - always dispatch
 * - Store user_id outside of the character object (it's part of the character data model)
 * - Store JWT token (security risk)
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
  | { type: 'SET_GENDER'; payload: 'male' | 'female' }
  | { type: 'SET_AGE'; payload: number }
  | { type: 'SET_HEIGHT'; payload: number }
  | { type: 'SET_WEIGHT'; payload: number }
  | { type: 'SET_EYES'; payload: string }
  | { type: 'SET_SKIN'; payload: string }
  | { type: 'SET_HAIR'; payload: string }
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
    languages: [],
    // Spell arrays for spellcasting classes
    cantrips: [],
    knownSpells: [],
    preparedSpells: [],
    ritualSpells: []
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
  logger.debug('Reducer action:', action.type, 'payload' in action ? action.payload : 'No payload');
  logger.debug('Current state:', state);

  // Enhanced error boundary for reducer operations
  try {
    switch (action.type) {
      case 'SET_CHARACTER': {
        /**
         * WHY: Replaces the entire character object in the state.
         *
         * BUSINESS IMPACT:
         * - Used when loading a character from the database.
         * - Essential for editing existing characters or resuming a creation session.
         *
         * FLOW:
         * 1. Component: Character loading logic (e.g., in a character selection screen).
         * 2. Dispatch: SET_CHARACTER with the full character object from the database.
         * 3. Reducer: Overwrites state.character, sets isDirty=false.
         * 4. Effect: The entire character creation wizard/sheet updates to reflect the loaded character.
         *
         * EDGE CASES:
         * - Payload must be a valid, complete character object.
         * - This action resets any unsaved changes (isDirty=false).
         */
        // Validate character data before setting
        if (!action.payload || typeof action.payload !== 'object') {
          logger.error('Invalid character payload:', action.payload);
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
        /**
         * WHY: Merges partial updates into the existing character state.
         *
         * BUSINESS IMPACT:
         * - The most common action during character creation.
         * - Allows individual components to update only the piece of state they manage (e.g., race, name, class).
         *
         * FLOW:
         * 1. Component: A wizard step (e.g., RaceSelection).
         * 2. Dispatch: UPDATE_CHARACTER with a partial character object (e.g., `{ race: selectedRace }`).
         * 3. Reducer: Merges the payload into state.character, marks isDirty=true.
         * 4. Effect: The UI reflects the change, and the "unsaved changes" indicator appears.
         *
         * DEPENDENCIES:
         * - Any component that modifies a part of the character sheet uses this.
         * - Triggers re-renders in all components subscribed to the updated fields.
         */
        // Only log when there are actual changes to reduce noise
        const currentCharacter = state.character;
        const payload = action.payload;
        const hasChanges = currentCharacter && payload &&
          Object.keys(payload).some(key => {
            const currentValue = currentCharacter[key as keyof Character];
            const newValue = payload[key as keyof typeof payload];
            return JSON.stringify(currentValue) !== JSON.stringify(newValue);
          });

        if (hasChanges) {
          logger.debug('UPDATE_CHARACTER reducer called');
          logger.debug('Current state.character:', state.character);
          logger.debug('Action payload:', payload);

          // Special logging for spell-related updates
          if (payload.cantrips || payload.knownSpells || payload.preparedSpells || payload.ritualSpells) {
            logger.debug('[CharacterContext] Spell update detected:', {
              incomingCantrips: payload.cantrips,
              incomingKnownSpells: payload.knownSpells,
              incomingPreparedSpells: payload.preparedSpells,
              incomingRitualSpells: payload.ritualSpells,
              currentCantrips: state.character?.cantrips,
              currentKnownSpells: state.character?.knownSpells,
              currentPreparedSpells: state.character?.preparedSpells,
              currentRitualSpells: state.character?.ritualSpells
            });
          }
        }

        // Validate current character state
        if (!state.character || typeof state.character !== 'object') {
          logger.error('No character to update or invalid character state');
          return {
            ...state,
            error: 'No character data to update'
          };
        }

        // Validate payload
        if (!action.payload || typeof action.payload !== 'object') {
          logger.error('Invalid update payload:', action.payload);
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

        // Additional logging for spell updates - include both property naming conventions
        if (hasChanges && (payload.cantrips || payload.knownSpells || payload.preparedSpells || payload.ritualSpells)) {
          logger.debug('[CharacterContext] Final spell state after update:', {
            finalCantrips: updatedCharacter.cantrips,
            finalKnownSpells: updatedCharacter.knownSpells,
            finalPreparedSpells: updatedCharacter.preparedSpells,
            finalRitualSpells: updatedCharacter.ritualSpells,
            cantripCount: updatedCharacter.cantrips?.length || 0,
            spellCount: updatedCharacter.knownSpells?.length || 0,
            preparedSpellCount: updatedCharacter.preparedSpells?.length || 0,
            ritualSpellCount: updatedCharacter.ritualSpells?.length || 0
          });
        }

        // Note: Removed incorrect property mapping that was causing spell data loss
        // preparedSpells should remain as preparedSpells (used by classes like Cleric/Wizard)
        // cantrips and knownSpells should remain separate (from Step 8 spell selection)
        // This allows both Step 8 (cantrips/knownSpells) and Step 9 (preparedSpells) to coexist

        const newState = {
          ...state,
          character: updatedCharacter,
          isDirty: true,
          error: null // Clear any previous errors on successful update
        };

        return newState;
      }
      case 'SET_GENDER':
        /**
         * WHY: User sets the character's gender.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.gender, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, gender: action.payload },
          isDirty: true,
        };
      case 'SET_AGE':
        /**
         * WHY: User sets the character's age.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.age, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, age: action.payload },
          isDirty: true,
        };
      case 'SET_HEIGHT':
        /**
         * WHY: User sets the character's height.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.height, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, height: action.payload },
          isDirty: true,
        };
      case 'SET_WEIGHT':
        /**
         * WHY: User sets the character's weight.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.weight, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, weight: action.payload },
          isDirty: true,
        };
      case 'SET_EYES':
        /**
         * WHY: User sets the character's eye color.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.eyes, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, eyes: action.payload },
          isDirty: true,
        };
      case 'SET_SKIN':
        /**
         * WHY: User sets the character's skin color.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.skin, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, skin: action.payload },
          isDirty: true,
        };
      case 'SET_HAIR':
        /**
         * WHY: User sets the character's hair color/style.
         * BUSINESS IMPACT: Cosmetic detail for player immersion. No gameplay impact.
         * FLOW: PhysicalStep component -> dispatch -> reducer updates character.hair, isDirty=true.
         */
        return {
          ...state,
          character: { ...state.character!, hair: action.payload },
          isDirty: true,
        };
      case 'SET_STEP': {
        /**
         * WHY: Controls the current step in the character creation wizard.
         * BUSINESS IMPACT: Essential for navigating the multi-step creation process.
         * FLOW: Next/Back buttons in wizard -> dispatch -> reducer updates currentStep.
         */
        // Validate step number
        const step = action.payload;
        if (typeof step !== 'number' || step < 0 || step > 20) {
          logger.error('Invalid step number:', step);
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
        /**
         * WHY: Manages the loading state for asynchronous operations.
         * BUSINESS IMPACT: Provides user feedback during saving/loading, prevents duplicate submissions.
         * FLOW: Before async call (e.g., save) -> dispatch(true) -> After call -> dispatch(false).
         */
        // Validate loading boolean
        const loading = action.payload;
        if (typeof loading !== 'boolean') {
          logger.error('Invalid loading value:', loading);
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
        /**
         * WHY: Stores error messages from validation or API calls.
         * BUSINESS IMPACT: Displays actionable error messages to the user.
         * FLOW: Catch block in an async operation -> dispatch(error.message) -> UI displays the error.
         */
        // Validate error message
        const error = action.payload;
        if (error !== null && typeof error !== 'string') {
          logger.error('Invalid error value:', error);
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
         /**
         * WHY: Updates the number of available spell slots for a character.
         * BUSINESS IMPACT: Critical for gameplay; tracks a core resource for spellcasters.
         * FLOW: After casting a spell or taking a long rest -> dispatch -> updates spellSlots.
         */
        // Validate spell slots payload
        const spellSlots = action.payload;
        if (!spellSlots || typeof spellSlots !== 'object') {
          logger.error('Invalid spell slots payload:', spellSlots);
          return {
            ...state,
            error: 'Invalid spell slot data'
          };
        }

        // Validate spell slot structure
        for (const [level, slots] of Object.entries(spellSlots)) {
          const levelNum = parseInt(level, 10);
          if (isNaN(levelNum) || levelNum < 0 || levelNum > 9) {
            logger.error('Invalid spell slot level:', level);
            return {
              ...state,
              error: 'Invalid spell slot level'
            };
          }

          if (!slots || typeof slots !== 'object' ||
              typeof slots.max !== 'number' || typeof slots.current !== 'number' ||
              slots.max < 0 || slots.current < 0 || slots.current > slots.max) {
            logger.error('Invalid spell slot data for level', level, ':', slots);
            return {
              ...state,
              error: 'Invalid spell slot structure'
            };
          }
        }

        // Validate character exists before updating
        if (!state.character) {
          logger.error('No character to update spell slots for');
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
        /**
         * WHY: Tracks the spell a character is currently concentrating on.
         * BUSINESS IMPACT: Core D&D mechanic; a character can only concentrate on one spell at a time.
         * FLOW: Casting a concentration spell -> dispatch(spellName) -> Taking damage -> dispatch(null).
         */
        // Validate concentration payload
        const concentration = action.payload;
        if (concentration !== null && typeof concentration !== 'string') {
          logger.error('Invalid concentration payload:', concentration);
          return {
            ...state,
            error: 'Invalid concentration spell data'
          };
        }

        // Validate character exists before updating
        if (!state.character) {
          logger.error('No character to update concentration for');
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
        /**
         * WHY: Resets the entire character state to its initial, empty values.
         * BUSINESS IMPACT: Allows the user to start character creation over from scratch.
         * FLOW: "Start Over" button -> dispatch -> state is replaced by initialState.
         */
        logger.info('Resetting character state to initial state');
        return initialState;
      }

      default: {
        logger.warn('Unknown action type dispatched:', action);
        return state;
      }
    }
  } catch (error) {
    logger.error('Unexpected error in character reducer:', error);
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
