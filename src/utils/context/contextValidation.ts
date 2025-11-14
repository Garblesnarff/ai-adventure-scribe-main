import type { GameContext } from '@/types/game';
import type { Memory } from '@/types/memory';

import logger from '@/lib/logger';
import { Campaign } from '@/types/campaign';

/**
 * Validates campaign setting data
 */
export const validateCampaignSetting = (setting: unknown) => {
  const s = setting && typeof setting === 'object' ? (setting as Record<string, unknown>) : {};
  return {
    era: typeof s.era === 'string' ? s.era : 'unspecified',
    location: typeof s.location === 'string' ? s.location : 'unknown',
    atmosphere: typeof s.atmosphere === 'string' ? s.atmosphere : 'neutral',
  };
};

/**
 * Validates thematic elements data
 */
export const validateThematicElements = (elements: unknown) => {
  const e = elements && typeof elements === 'object' ? (elements as Record<string, unknown>) : {};
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    mainThemes: toStringArray(e.mainThemes),
    recurringMotifs: toStringArray(e.recurringMotifs),
    keyLocations: toStringArray(e.keyLocations),
    importantNPCs: toStringArray(e.importantNPCs),
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
    logger.error('[Context] Missing campaign name');
    return false;
  }

  if (!context.campaign?.setting) {
    logger.error('[Context] Missing campaign setting');
    return false;
  }

  if (!context.campaign?.thematicElements) {
    logger.error('[Context] Missing thematic elements');
    return false;
  }

  // Character context is optional but if present must be complete
  if (context.character) {
    if (
      !context.character.basic?.name ||
      !context.character.basic?.class ||
      !context.character.basic?.race
    ) {
      logger.error('[Context] Incomplete character data');
      return false;
    }

    if (!context.character.stats?.health || context.character.stats.armorClass === undefined) {
      logger.error('[Context] Missing character stats');
      return false;
    }
  }

  // Memories array should always exist even if empty
  if (!Array.isArray(context.memories?.recent)) {
    logger.error('[Context] Missing memories array');
    return false;
  }

  return true;
};
