import { GameContext } from '@/types/game';
import { Campaign } from '@/types/campaign';
import { Memory } from '@/types/memory';

/**
 * Validates campaign setting data
 */
export const validateCampaignSetting = (setting: any) => {
  return {
    era: setting?.era || 'unspecified',
    location: setting?.location || 'unknown',
    atmosphere: setting?.atmosphere || 'neutral'
  };
};

/**
 * Validates thematic elements data
 */
export const validateThematicElements = (elements: any) => {
  return {
    mainThemes: Array.isArray(elements?.mainThemes) ? elements.mainThemes : [],
    recurringMotifs: Array.isArray(elements?.recurringMotifs) ? elements.recurringMotifs : [],
    keyLocations: Array.isArray(elements?.keyLocations) ? elements.keyLocations : [],
    importantNPCs: Array.isArray(elements?.importantNPCs) ? elements.importantNPCs : []
  };
};

/**
 * Sorts memories by relevance score
 */
export const sortMemoriesByRelevance = (memories: Memory[]): Memory[] => {
  return [...memories].sort((a, b) => (b.importance || 0) - (a.importance || 0));
};

/**
 * Validates that a context object has all required fields
 */
export const validateGameContext = (context: GameContext): boolean => {
  if (!context.campaign?.basic?.name) {
    console.error('[Context] Missing campaign name');
    return false;
  }

  if (!context.campaign?.setting) {
    console.error('[Context] Missing campaign setting');
    return false;
  }

  if (!context.campaign?.thematicElements) {
    console.error('[Context] Missing thematic elements');
    return false;
  }

  // Character context is optional but if present must be complete
  if (context.character) {
    if (!context.character.basic?.name || 
        !context.character.basic?.class || 
        !context.character.basic?.race) {
      console.error('[Context] Incomplete character data');
      return false;
    }

    if (!context.character.stats?.health || 
        context.character.stats.armorClass === undefined) {
      console.error('[Context] Missing character stats');
      return false;
    }
  }

  // Memories array should always exist even if empty
  if (!Array.isArray(context.memories?.recent)) {
    console.error('[Context] Missing memories array');
    return false;
  }

  return true;
};