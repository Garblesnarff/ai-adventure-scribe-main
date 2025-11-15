/**
 * MemoryLoader
 *
 * Loads recent memories for a session from Supabase.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Memory type (src/components/game/memory/types.ts)
 *
 * @author AI Dungeon Master Team
 */

import { supabase } from '@/integrations/supabase/client';
import { Memory, isValidMemoryType } from '@/components/game/memory/types';
import { logger } from '../../../lib/logger';

export class MemoryLoader {
  /**
   * Loads recent memories for a session.
   *
   * @param {string} sessionId - The session ID
   * @param {number} limit - Number of recent memories to fetch
   * @returns {Promise<Memory[]>} Array of recent memories
   */
  async loadRecentMemories(sessionId: string, limit = 10): Promise<Memory[]> {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map((memory): Memory => {
      if (!isValidMemoryType(memory.type)) {
        logger.warn(
          `[MemoryLoader] Invalid memory type detected: ${memory.type}, defaulting to 'general'`,
        );
        memory.type = 'general';
      }
      return {
        ...memory,
        type: isValidMemoryType(memory.type) ? memory.type : 'general',
      };
    });
  }
}
