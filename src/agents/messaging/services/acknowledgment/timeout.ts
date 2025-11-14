/**
 * Message Acknowledgment Timeout Handler
 *
 * This file provides a utility function to handle message acknowledgment timeouts.
 * It checks if a pending acknowledgment has exceeded its timeout period and,
 * if so, updates its status to 'failed'.
 *
 * Key Function:
 * - handleTimeout: Checks and processes an acknowledgment timeout for a message.
 *
 * Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - updateAcknowledgment function from './db.ts'
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Utilities (assuming kebab-case for ./db.ts)
import { updateAcknowledgment } from './db';
import { logger } from '../../../../lib/logger';

export async function handleTimeout(messageId: string): Promise<void> {
  try {
    const { data: ack } = await supabase
      .from('message_acknowledgments')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (ack && ack.status === 'pending' && new Date(ack.timeout_at) <= new Date()) {
      await updateAcknowledgment(messageId, {
        status: 'failed',
        error: 'Message acknowledgment timeout',
      });
    }
  } catch (error) {
    logger.error('[MessageAcknowledgmentTimeout] Handle timeout error:', error);
  }
}
