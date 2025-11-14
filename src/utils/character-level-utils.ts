/**
 * Character Level Utilities
 *
 * Provides functions to retrieve character level information for world builders
 * and other systems that need to generate content appropriate to party level.
 */

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export interface PartyLevelInfo {
  averageLevel: number;
  minLevel: number;
  maxLevel: number;
  partySize: number;
  characters: Array<{
    id: string;
    name: string;
    level: number;
    class?: string;
  }>;
}

/**
 * Get party level information for a specific session
 */
export async function getSessionPartyLevel(sessionId: string): Promise<PartyLevelInfo> {
  try {
    // Get characters from the session's campaign
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('campaign_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.warn('Could not find session, using default party level');
      return getDefaultPartyLevel();
    }

    return await getCampaignPartyLevel(session.campaign_id);
  } catch (error) {
    logger.error('Error getting session party level:', error);
    return getDefaultPartyLevel();
  }
}

/**
 * Get party level information for a specific campaign
 */
export async function getCampaignPartyLevel(campaignId: string): Promise<PartyLevelInfo> {
  try {
    // Get all characters in the campaign
    const { data: characters, error } = await supabase
      .from('campaign_characters')
      .select(
        `
        character_id,
        characters (
          id,
          name,
          level,
          class
        )
      `,
      )
      .eq('campaign_id', campaignId);

    if (error || !characters || characters.length === 0) {
      logger.warn('No characters found for campaign, using default party level');
      return getDefaultPartyLevel();
    }

    // Extract character data and filter out null characters
    const validCharacters = characters
      .map((cc) => cc.characters)
      .filter((char) => char && char.level && char.level > 0)
      .map((char) => ({
        id: char.id,
        name: char.name || 'Unknown',
        level: char.level || 1,
        class: char.class || undefined,
      }));

    if (validCharacters.length === 0) {
      return getDefaultPartyLevel();
    }

    const levels = validCharacters.map((char) => char.level);
    const averageLevel = Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);

    return {
      averageLevel,
      minLevel,
      maxLevel,
      partySize: validCharacters.length,
      characters: validCharacters,
    };
  } catch (error) {
    logger.error('Error getting campaign party level:', error);
    return getDefaultPartyLevel();
  }
}

/**
 * Get the appropriate challenge level for world generation
 * This considers the party's average level and suggests content difficulty
 */
export function getContentDifficultyLevel(partyInfo: PartyLevelInfo): {
  difficulty: 'trivial' | 'easy' | 'moderate' | 'hard' | 'deadly';
  recommendedLevel: number;
  description: string;
} {
  const avgLevel = partyInfo.averageLevel;

  if (avgLevel <= 2) {
    return {
      difficulty: 'easy',
      recommendedLevel: avgLevel,
      description: 'New adventurers, simple challenges',
    };
  } else if (avgLevel <= 5) {
    return {
      difficulty: 'moderate',
      recommendedLevel: avgLevel,
      description: 'Local heroes, regional threats',
    };
  } else if (avgLevel <= 10) {
    return {
      difficulty: 'moderate',
      recommendedLevel: avgLevel,
      description: 'Seasoned adventurers, significant threats',
    };
  } else if (avgLevel <= 15) {
    return {
      difficulty: 'hard',
      recommendedLevel: avgLevel,
      description: 'Champions, world-threatening challenges',
    };
  } else {
    return {
      difficulty: 'deadly',
      recommendedLevel: avgLevel,
      description: 'Legendary heroes, cosmic threats',
    };
  }
}

/**
 * Default party level when no character data is available
 */
function getDefaultPartyLevel(): PartyLevelInfo {
  return {
    averageLevel: 3,
    minLevel: 3,
    maxLevel: 3,
    partySize: 4,
    characters: [],
  };
}

/**
 * Quick function to get just the average party level for simple use cases
 */
export async function getAveragePartyLevel(
  campaignId?: string,
  sessionId?: string,
): Promise<number> {
  try {
    if (sessionId) {
      const partyInfo = await getSessionPartyLevel(sessionId);
      return partyInfo.averageLevel;
    } else if (campaignId) {
      const partyInfo = await getCampaignPartyLevel(campaignId);
      return partyInfo.averageLevel;
    } else {
      return 3; // Default level
    }
  } catch (error) {
    logger.error('Error getting average party level:', error);
    return 3; // Default level
  }
}
