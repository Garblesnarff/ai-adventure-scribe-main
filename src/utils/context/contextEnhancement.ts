/**
 * Utilities for enhancing and merging different types of context
 */

import { Campaign } from '@/types/campaign';
import { Memory } from '@/components/game/memory/types';
import { validateCampaignSetting, validateThematicElements, sortMemoriesByRelevance } from './contextValidation';

interface EnhancedGameContext {
  campaign: {
    basic: {
      name: string;
      description?: string;
      genre?: string;
      status: string;
    };
    setting: {
      era: string;
      location: string;
      atmosphere: string;
      world?: {
        name?: string;
        climate_type?: string;
        magic_level?: string;
        technology_level?: string;
      };
    };
    themes: {
      mainThemes: string[];
      recurringMotifs: string[];
      keyLocations: string[];
      importantNPCs: string[];
    };
  };
  character?: {
    basic: {
      name: string;
      race: string;
      class: string;
      level: number;
    };
    stats: Record<string, number>;
    equipment: Array<{
      name: string;
      type: string;
      equipped: boolean;
    }>;
  };
  memories: {
    recent: Memory[];
    important: Memory[];
    locations: Memory[];
    characters: Memory[];
    plot: Memory[];
  };
  activeQuests?: Array<{
    title: string;
    description?: string;
    status: string;
    progress?: number;
  }>;
}

/**
 * Enhances campaign context with additional derived information
 * @param campaign - Raw campaign data
 * @returns Enhanced campaign context
 */
export const enhanceCampaignContext = (campaign: Campaign) => {
  const setting = validateCampaignSetting(campaign.setting);
  const themes = validateThematicElements(campaign.thematic_elements);

  return {
    basic: {
      name: campaign.name,
      description: campaign.description,
      genre: campaign.genre,
      status: campaign.status || 'active'
    },
    setting,
    themes
  };
};

/**
 * Enhances memory context with categorization and importance
 * @param memories - Array of memories to enhance
 * @returns Categorized and enhanced memories
 */
export const enhanceMemoryContext = (memories: Memory[]) => {
  const enhancedMemories = memories.map(memory => ({
    ...memory,
    importance: Math.min(10, (memory.importance || 0) + 
      (typeof memory.metadata === 'object' && memory.metadata !== null ? 
        (memory.metadata as Record<string, number>).significance || 0 : 0))
  }));

  const sortedMemories = sortMemoriesByRelevance(enhancedMemories);

  return {
    recent: sortedMemories.slice(0, 5),
    important: sortedMemories.filter(m => (m.importance || 0) >= 7),
    locations: sortedMemories.filter(m => m.type === 'location'),
    characters: sortedMemories.filter(m => m.type === 'character'),
    plot: sortedMemories.filter(m => m.type === 'plot')
  };
};

/**
 * Merges all context types into a single enhanced context object
 * @param campaignContext - Campaign context
 * @param characterContext - Character context (optional)
 * @param memories - Memory array
 * @param quests - Active quests (optional)
 * @returns Enhanced game context
 */
export const buildEnhancedGameContext = (
  campaignContext: Campaign,
  characterContext?: any,
  memories: Memory[] = [],
  quests?: any[]
): EnhancedGameContext => {
  return {
    campaign: enhanceCampaignContext(campaignContext),
    character: characterContext ? {
      basic: {
        name: characterContext.name,
        race: characterContext.race,
        class: characterContext.class,
        level: characterContext.level || 1
      },
      stats: characterContext.stats || {},
      equipment: characterContext.equipment || []
    } : undefined,
    memories: enhanceMemoryContext(memories),
    activeQuests: quests?.filter(q => q.status === 'active')
  };
};