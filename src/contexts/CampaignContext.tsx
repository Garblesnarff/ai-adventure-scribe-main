import React, { createContext, useContext, useReducer } from 'react';

interface Campaign {
  name: string;
  description?: string;
  genre?: string;
  difficulty_level?: string;
  campaign_length?: 'one-shot' | 'short' | 'full';
  tone?: 'serious' | 'humorous' | 'gritty';
  setting_details?: Record<string, any>;
}

interface CampaignState {
  campaign: Campaign | null;
}

type CampaignAction = {
  type: 'UPDATE_CAMPAIGN';
  payload: Partial<Campaign>;
} | {
  type: 'RESET_CAMPAIGN';
};

const initialState: CampaignState = {
  campaign: null
};

/**
 * Creates the campaign context with type safety
 */
const CampaignContext = createContext<{
  state: CampaignState;
  dispatch: React.Dispatch<CampaignAction>;
} | undefined>(undefined);

/**
 * Reducer function to handle campaign state updates
 * @param state - Current campaign state
 * @param action - Action to perform on the state
 * @returns Updated campaign state
 */
function campaignReducer(state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case 'UPDATE_CAMPAIGN':
      return {
        ...state,
        campaign: {
          ...state.campaign,
          ...action.payload
        }
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
export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(campaignReducer, initialState);

  return (
    <CampaignContext.Provider value={{ state, dispatch }}>
      {children}
    </CampaignContext.Provider>
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