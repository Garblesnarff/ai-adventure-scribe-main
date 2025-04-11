import { Campaign } from '@/types/campaign';
import { Character } from '@/types/character';
import { Memory, MemoryContext } from '@/types/memory';
import { GameContext } from '@/types/game';
import { buildCampaignContext } from './campaignContext';
import { buildCharacterContext } from './characterContext';
import { buildMemoryContext } from './memoryContext';

/**
 * Validates the game context structure
 */
export const validateGameContext = (context: GameContext): boolean => {
  try {
    // Basic validation of required fields
    if (!context.campaign?.basic?.name) return false;
    if (!context.campaign?.setting) return false;
    if (!context.campaign?.thematicElements) return false;
    if (!context.memories) return false;

    return true;
  } catch (error) {
    console.error('[Context] Validation error:', error);
    return false;
  }
};

/**
 * Creates a default context with fallback values
 */
export const createDefaultContext = (): GameContext => ({
  campaign: {
    basic: {
      name: 'Unnamed Campaign',
      status: 'active',
    },
    setting: {
      era: 'unspecified',
      location: 'unknown',
      atmosphere: 'neutral',
    },
    thematicElements: {
      mainThemes: [],
      recurringMotifs: [],
      keyLocations: [],
      importantNPCs: [],
    },
  },
  memories: {
    recent: [],
    locations: [],
    characters: [],
    plot: [],
  },
});

/**
 * Builds a complete game context by combining campaign, character, and memory data
 */
export const buildGameContext = async (
  campaignId: string,
  characterId: string,
  sessionId: string
): Promise<GameContext | null> => {
  try {
    console.log('[Context] Building complete game context');
    
    // Fetch all contexts in parallel with error handling
    const [campaignContext, characterContext, memoryContext] = await Promise.allSettled([
      buildCampaignContext(campaignId),
      buildCharacterContext(characterId),
      buildMemoryContext(sessionId, { 
        timeframe: 'recent', 
        limit: 5,
        includeLocations: true,
        includeNPCs: true 
      }),
    ]);

    // Handle potential failures in context building
    const context: GameContext = {
      campaign: campaignContext.status === 'fulfilled' && campaignContext.value
        ? {
            basic: {
              name: campaignContext.value.basicInfo.name,
              description: campaignContext.value.basicInfo.description,
              genre: campaignContext.value.basicInfo.genre,
              status: campaignContext.value.basicInfo.status || 'active',
            },
            setting: {
              era: campaignContext.value.setting.era || 'unspecified',
              location: campaignContext.value.setting.location || 'unknown',
              atmosphere: campaignContext.value.setting.atmosphere || 'neutral',
            },
            thematicElements: campaignContext.value.thematicElements,
          }
        : createDefaultContext().campaign,

      character: characterContext.status === 'fulfilled' && characterContext.value
        ? {
            basic: {
              name: characterContext.value.basicInfo.name,
              race: characterContext.value.basicInfo.race,
              class: characterContext.value.basicInfo.class,
              level: characterContext.value.basicInfo.level || 1,
            },
            stats: {
              health: {
                current: characterContext.value.stats.currentHp,
                max: characterContext.value.stats.maxHp,
                temporary: 0
              },
              armorClass: characterContext.value.stats.armorClass,
              abilities: {
                strength: characterContext.value.stats.strength,
                dexterity: characterContext.value.stats.dexterity,
                constitution: characterContext.value.stats.constitution,
                intelligence: characterContext.value.stats.intelligence,
                wisdom: characterContext.value.stats.wisdom,
                charisma: characterContext.value.stats.charisma,
              },
            },
            equipment: characterContext.value.equipment.map(item => ({
              name: item.name,
              type: item.type,
              equipped: item.equipped,
            })),
          }
        : undefined,

      memories: memoryContext.status === 'fulfilled' && memoryContext.value
        ? {
            recent: memoryContext.value.recent || [],
            locations: memoryContext.value.locations || [],
            characters: memoryContext.value.characters || [],
            plot: memoryContext.value.plot || [],
            currentLocation: memoryContext.value.currentLocation,
            activeNPCs: memoryContext.value.activeNPCs,
          }
        : createDefaultContext().memories,
    };

    // Validate the built context
    if (!validateGameContext(context)) {
      console.error('[Context] Invalid game context structure');
      return createDefaultContext();
    }

    return context;
  } catch (error) {
    console.error('[Context] Error building game context:', error);
    return createDefaultContext();
  }
};