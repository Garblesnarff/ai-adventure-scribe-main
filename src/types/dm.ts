/**
 * Interface for DM Agent response structure
 */
export interface DMResponse {
  environment: {
    description: string;
    atmosphere: string;
    sensoryDetails: string[];
  };
  characters: {
    activeNPCs: string[];
    reactions: string[];
    dialogue: string;
  };
  opportunities: {
    immediate: string[];
    nearby: string[];
    questHooks: string[];
  };
  mechanics: {
    availableActions: string[];
    relevantRules: string[];
    suggestions: string[];
  };
}

export interface CampaignContext {
  genre: string;
  tone: string;
  setting: {
    era: string;
    location: string;
    atmosphere: string;
  };
  thematicElements: {
    mainThemes: string[];
    recurringMotifs: string[];
    keyLocations: string[];
    importantNPCs: string[];
  };
}
