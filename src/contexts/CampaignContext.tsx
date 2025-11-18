/**
 * Campaign Context
 *
 * This file defines the CampaignContext for managing global campaign data
 * within the application. It includes the context provider, a reducer for state
 * updates, and a custom hook for accessing the campaign state and dispatch function.
 *
 * Main Components:
 * - CampaignContext: The React context object.
 * - CampaignProvider: The provider component that wraps parts of the app.
 * - useCampaign: Custom hook to consume the context.
 *
 * Key State:
 * - campaign: Object containing details of the currently active/selected campaign.
 *
 * Dependencies:
 * - React
 *
 * @author AI Dungeon Master Team
 */

// SDK Imports
import React, { createContext, useContext, useReducer } from 'react'; // Added ReactNode

import type { ReactNode } from 'react';

// Type Imports
import { GameSystem } from '@/types/game-systems';

/**
 * Campaign interface
 *
 * Represents a campaign in the application. Each campaign must have a game system
 * that defines the rules, mechanics, and character creation options available.
 * The game system determines how characters are built, what abilities they have,
 * and how the game mechanics function throughout the campaign.
 */
interface Campaign {
  id?: string;
  name: string;
  description?: string;
  genre?: string;
  difficulty_level?: string;
  campaign_length?: 'one-shot' | 'short' | 'full';
  tone?: 'serious' | 'humorous' | 'gritty';
  setting_details?: Record<string, unknown>;
  /** The game system used for this campaign (e.g., D&D 5E, OSE, Cairn) */
  gameSystem: GameSystem;
  // Defaults and configuration for scoped flows
  defaultArtStyle?: string; // e.g., 'fantasy', 'cyberpunk'
  rules?: Record<string, unknown> | string; // ruleset identifier or config blob
  enhancementSelections?: import('../types/enhancement-options').OptionSelection[];
  enhancementEffects?: {
    atmosphere?: string[];
    themes?: string[];
    hooks?: string[];
    worldLaws?: string[];
    npcs?: string[];
    locations?: string[];
  };
}

interface CampaignState {
  campaign: Campaign | null;
}

type CampaignAction =
  | {
      type: 'UPDATE_CAMPAIGN';
      payload: Partial<Campaign>;
    }
  | {
      type: 'RESET_CAMPAIGN';
    };

/**
 * Initial campaign state with default values.
 * Campaigns start with D&D 5E as the default game system.
 */
const initialState: CampaignState = {
  campaign: {
    name: '',
    gameSystem: GameSystem.DND5E,
  },
};

/**
 * Creates the campaign context with type safety
 */
const CampaignContext = createContext<
  | {
      state: CampaignState;
      dispatch: React.Dispatch<CampaignAction>;
    }
  | undefined
>(undefined);

/**
 * Reducer function to handle campaign state updates
 *
 * Campaigns must have a game system (e.g., D&D 5E, OSE, Cairn) that defines
 * the rules and mechanics used throughout the campaign. The game system
 * determines character creation, abilities, and gameplay mechanics.
 *
 * @param state - Current campaign state
 * @param action - Action to perform on the state
 * @returns Updated campaign state
 */
function campaignReducer(state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case 'UPDATE_CAMPAIGN':
      // Merge partial campaign updates into existing campaign state
      // This properly handles all fields including gameSystem
      return {
        ...state,
        campaign: {
          ...state.campaign,
          ...action.payload,
        },
      };
    case 'RESET_CAMPAIGN':
      return initialState;
    default:
      return state;
  }
}

/**
 * Provider component for campaign context
 * @param children - Child components that will have access to campaign context
 */
export function CampaignProvider({ children }: { children: ReactNode }) {
  // Used ReactNode
  const [state, dispatch] = useReducer(campaignReducer, initialState);

  return (
    <CampaignContext.Provider value={{ state, dispatch }}>{children}</CampaignContext.Provider>
  );
}

/**
 * Custom hook to use campaign context
 * @returns Campaign context state and dispatch function
 * @throws Error if used outside of CampaignProvider
 */
export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
