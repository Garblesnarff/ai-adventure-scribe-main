/**
 * Session Utilities
 *
 * Helper functions for creating, cleaning up, and summarizing game sessions.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Game session types (src/types/game.ts)
 *
 * @author AI Dungeon Master Team
 */

import type { GameSession } from '@/types/game';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Creates a new game session in Supabase.
 *
 * Note: We insert with default status 'active' and session_number=1.
 * This can be extended to support multiple concurrent sessions per user.
 *
 * @returns {Promise<string | null>} The new session ID or null if failed
 */
export async function createGameSession(): Promise<string | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert([{ session_number: 1, status: 'active' }])
    .select()
    .single();

  if (error) {
    logger.error('Error creating game session:', error);
    return null;
  }

  return data.id;
}

/**
 * Generates a summary string for the session based on dialogue history.
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<string>} The generated summary
 */
export async function generateSessionSummary(sessionId: string): Promise<string> {
  const { data: messages } = await supabase
    .from('dialogue_history')
    .select('message, speaker_type, context')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true });

  if (!messages?.length) return 'No activity recorded in this session';

  const messageCount = messages.length;
  const playerActions = messages.filter((m) => m.speaker_type === 'player').length;
  const dmResponses = messages.filter((m) => m.speaker_type === 'dm').length;

  return `Session completed with ${messageCount} total interactions: ${playerActions} player actions and ${dmResponses} DM responses.`;
}

/**
 * Cleans up an expired session, generates a summary, and updates status.
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<string>} The generated summary
 */
export async function cleanupSession(sessionId: string): Promise<string> {
  const summary = await generateSessionSummary(sessionId);

  const { error } = await supabase
    .from('game_sessions')
    .update({
      end_time: new Date().toISOString(),
      summary,
      status: 'completed' as const,
    })
    .eq('id', sessionId);

  if (error) {
    logger.error('Error cleaning up session:', error);
  }

  return summary;
}

/**
 * Checks if a session has expired based on start time.
 *
 * @param {GameSession} session - The session object
 * @param {number} expiryMs - Expiry time in milliseconds
 * @returns {boolean} True if expired, false otherwise
 */
export function isSessionExpired(session: GameSession, expiryMs: number): boolean {
  const startTime = new Date(session.start_time).getTime();
  return Date.now() - startTime > expiryMs;
}
