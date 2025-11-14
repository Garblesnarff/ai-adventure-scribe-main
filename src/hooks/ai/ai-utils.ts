/**
 * AI Utilities
 *
 * Helper functions for formatting DM tasks, fetching game context, and selecting memories.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - ChatMessage and Memory types (src/types/game.ts, src/components/game/memory/types.ts)
 *
 * @author AI Dungeon Master Team
 */

import type { Memory } from '@/components/game/memory/types';
import type { Campaign } from '@/types/campaign';
import type { Character } from '@/types/character';
import type { ChatMessage } from '@/types/game';

import { isValidMemoryType } from '@/components/game/memory/types';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Formats chat messages into a task object for the DM Agent.
 *
 * @param {ChatMessage[]} messages - The full message history
 * @param {ChatMessage} latestMessage - The latest player message
 * @returns {object} The formatted task object
 */
export function formatDMTask(messages: ChatMessage[], latestMessage: ChatMessage) {
  return {
    id: `task_${Date.now()}`,
    description: `Respond to player message: ${latestMessage.text}`,
    expectedOutput: 'D&D appropriate response with game context',
    context: {
      messageHistory: messages,
      playerIntent: latestMessage.context?.intent || 'query',
      playerEmotion: latestMessage.context?.emotion || 'neutral',
    },
  };
}

/**
 * Fetches campaign and character details for the DM Agent context.
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<{campaign: Partial<Campaign>, character: Partial<Character>} | null>} The game context or null if failed
 */
export async function fetchGameContext(
  sessionId: string,
): Promise<{ campaign: Partial<Campaign>; character: Partial<Character> } | null> {
  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select(
        `
        *,
        campaigns:campaign_id (*),
        characters:character_id (*)
      `,
      )
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      logger.error('Error fetching session:', sessionError);
      return null;
    }

    if (!sessionData?.campaign_id || !sessionData?.character_id) {
      logger.error('No campaign or character IDs found in session');
      return null;
    }

    return {
      campaign: (sessionData.campaigns || {}) as Partial<Campaign>,
      character: (sessionData.characters || {}) as Partial<Character>,
    };
  } catch (error) {
    logger.error('Error in fetchGameContext:', error);
    return null;
  }
}

/**
 * Fetches and validates memories for a session.
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<Memory[]>} Array of validated memories
 */
export async function fetchMemories(sessionId: string): Promise<Memory[]> {
  const { data: memoriesData } = await supabase
    .from('memories')
    .select('*')
    .eq('session_id', sessionId);

  return (memoriesData || []).map((memory): Memory => {
    if (!isValidMemoryType(memory.type)) {
      logger.warn(`[Memory] Invalid memory type detected: ${memory.type}, defaulting to 'general'`);
      memory.type = 'general';
    }
    return {
      ...memory,
      type: isValidMemoryType(memory.type) ? memory.type : 'general',
    };
  });
}
