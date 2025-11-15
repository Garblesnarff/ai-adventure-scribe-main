import { buildCampaignContext } from './campaignContext';
import { buildCharacterContext } from './characterContext';
import { buildMemoryContext } from './memoryContext';

import logger from '@/lib/logger';
import { Campaign } from '@/types/campaign';

export { buildCampaignContext } from './campaignContext';
export { buildCharacterContext } from './characterContext';
export { buildMemoryContext } from './memoryContext';

/**
 * Builds complete game context by combining campaign, character, and memory data
 * @param campaignId - UUID of the campaign
 * @param characterId - UUID of the character
 * @param sessionId - UUID of the game session
 * @returns Combined context object or null if any context fails to build
 */
export const buildGameContext = async (
  campaignId: string,
  characterId: string,
  sessionId: string,
) => {
  try {
    logger.info('[Context] Building complete game context');

    const [campaignContext, characterContext, memoryContext] = await Promise.all([
      buildCampaignContext(campaignId),
      buildCharacterContext(characterId),
      buildMemoryContext(sessionId, { timeframe: 'recent', limit: 5 }),
    ]);

    if (!campaignContext || !characterContext || !memoryContext) {
      logger.error('[Context] One or more contexts failed to build');
      return null;
    }

    return {
      campaign: {
        basic: campaignContext.basicInfo,
        setting: campaignContext.setting,
        themes: campaignContext.thematicElements,
      },
      character: {
        basic: characterContext.basicInfo,
        stats: characterContext.stats,
        equipment: characterContext.equipment,
      },
      memories: {
        recent: memoryContext.recent.slice(0, 5),
        locations: memoryContext.locations,
        characters: memoryContext.characters,
        plot: memoryContext.plot,
      },
      activeQuests: characterContext.activeQuests,
    };
  } catch (error) {
    logger.error('[Context] Error building game context:', error);
    return null;
  }
};
