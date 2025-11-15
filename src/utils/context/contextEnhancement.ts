/**
 * Utilities for enhancing and merging different types of context
 */

import {
  validateCampaignSetting,
  validateThematicElements,
  sortMemoriesByRelevance,
} from './contextValidation';

import type { Memory } from '@/components/game/memory/types';
import type { Campaign } from '@/types/campaign';

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
      status: campaign.status || 'active',
    },
    setting,
    themes,
  };
};

/**
 * Enhances memory context with categorization and importance
 * @param memories - Array of memories to enhance
 * @returns Categorized and enhanced memories
 */
export const enhanceMemoryContext = (memories: Memory[]) => {
  const enhancedMemories = memories.map((memory) => ({
    ...memory,
    importance: Math.min(
      10,
      (memory.importance || 0) +
        (typeof memory.metadata === 'object' && memory.metadata !== null
          ? (memory.metadata as Record<string, number>).significance || 0
          : 0),
    ),
  }));

  const sortedMemories = sortMemoriesByRelevance(enhancedMemories);

  return {
    recent: sortedMemories.slice(0, 5),
    important: sortedMemories.filter((m) => (m.importance || 0) >= 7),
    locations: sortedMemories.filter((m) => m.type === 'location'),
    characters: sortedMemories.filter((m) => m.type === 'character'),
    plot: sortedMemories.filter((m) => m.type === 'plot'),
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
  characterContext?: unknown,
  memories: Memory[] = [],
  quests?: unknown[],
): EnhancedGameContext => {
  const c =
    characterContext && typeof characterContext === 'object'
      ? (characterContext as Record<string, unknown>)
      : null;
  const character = c
    ? {
        basic: {
          name: typeof c.name === 'string' ? c.name : 'Unknown',
          race: typeof c.race === 'string' ? c.race : 'Unknown',
          class: typeof c.class === 'string' ? c.class : 'Unknown',
          level: typeof c.level === 'number' ? c.level : 1,
        },
        stats: c.stats && typeof c.stats === 'object' ? (c.stats as Record<string, number>) : {},
        equipment: Array.isArray(c.equipment)
          ? (c.equipment as unknown[]).filter(
              (e): e is { name: string; type: string; equipped: boolean } => {
                const o = e as Record<string, unknown>;
                return (
                  typeof o?.name === 'string' &&
                  typeof o?.type === 'string' &&
                  typeof o?.equipped === 'boolean'
                );
              },
            )
          : [],
      }
    : undefined;

  const activeQuests = Array.isArray(quests)
    ? quests
        .map((q) => (q && typeof q === 'object' ? (q as Record<string, unknown>) : null))
        .filter((q): q is Record<string, unknown> => !!q && typeof q.status === 'string')
        .filter((q) => q.status === 'active')
        .map((q) => ({
          title: typeof q.title === 'string' ? q.title : 'Untitled Quest',
          description: typeof q.description === 'string' ? q.description : undefined,
          status: q.status as string,
          progress: typeof q.progress === 'number' ? q.progress : undefined,
        }))
    : undefined;

  return {
    campaign: enhanceCampaignContext(campaignContext),
    character,
    memories: enhanceMemoryContext(memories),
    activeQuests,
  };
};
