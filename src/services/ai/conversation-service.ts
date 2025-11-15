/**
 * Conversation Service
 *
 * Handles saving and retrieving chat messages from the database.
 * Manages conversation history for AI sessions.
 * Extracted from ai-service.ts for separation of concerns.
 *
 * @module conversation-service
 */

import type { ChatMessage } from './shared/types';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Save a chat message to the database
 *
 * Stores a message in the dialogue_history table for persistent storage.
 *
 * @param params - Message parameters (sessionId, role, content, speakerId)
 * @throws Error if database save fails
 *
 * @example
 * ```typescript
 * await saveChatMessage({
 *   sessionId: 'session_123',
 *   role: 'user',
 *   content: 'I attack the goblin!',
 *   speakerId: 'char_456'
 * });
 * ```
 */
export async function saveChatMessage(params: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  speakerId?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from('dialogue_history').insert({
      session_id: params.sessionId,
      speaker_type: params.role,
      speaker_id: params.speakerId,
      message: params.content,
    });

    if (error) {
      logger.error('Error saving chat message:', error);
      throw new Error('Failed to save chat message');
    }
  } catch (error) {
    logger.error('Error saving chat message:', error);
    throw error;
  }
}

/**
 * Get conversation history for a session
 *
 * Retrieves all messages for a given session in chronological order.
 *
 * @param sessionId - The session ID to fetch history for
 * @returns Array of chat messages
 * @throws Error if database query fails
 *
 * @example
 * ```typescript
 * const history = await getConversationHistory('session_123');
 * console.log(`Found ${history.length} messages`);
 * ```
 */
export async function getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('dialogue_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: true });

    if (error) {
      logger.error('Error getting conversation history:', error);
      throw new Error('Failed to get conversation history');
    }

    return data.map((msg) => ({
      id: msg.id,
      role: msg.speaker_type as 'user' | 'assistant',
      content: msg.message,
      timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
    }));
  } catch (error) {
    logger.error('Error getting conversation history:', error);
    throw error;
  }
}
