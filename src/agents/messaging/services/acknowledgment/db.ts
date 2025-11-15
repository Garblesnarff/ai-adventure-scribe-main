/**
 * Message Acknowledgment DB Utilities
 *
 * This file provides utility functions for interacting with the
 * `message_acknowledgments` table in the Supabase database. These functions
 * handle the creation, updating, and retrieval of message acknowledgment records.
 *
 * Key Functions:
 * - createAcknowledgment: Creates a new acknowledgment record for a message.
 * - updateAcknowledgment: Updates the status and details of an existing acknowledgment.
 * - getAcknowledgmentStatus: Retrieves the current status of an acknowledgment.
 *
 * Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Acknowledgment types (`./types.ts`)
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Types
import { AcknowledgmentData, AcknowledgmentStatus } from './types';
import { logger } from '../../../../lib/logger';

export async function createAcknowledgment(messageId: string): Promise<void> {
  try {
    const { error } = await supabase.from('message_acknowledgments').insert({
      message_id: messageId,
      timeout_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minute timeout
    });

    if (error) throw error;
  } catch (error) {
    logger.error('[MessageAcknowledgmentDB] Create acknowledgment error:', error);
    throw error;
  }
}

export async function updateAcknowledgment(
  messageId: string,
  data: Partial<AcknowledgmentData>,
): Promise<void> {
  try {
    const updates: Record<string, any> = {
      status: data.status,
      attempts: data.attempts,
      last_attempt: data.lastAttempt?.toISOString(),
      error: data.error,
    };

    if (data.status === 'processed') {
      updates.acknowledged_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('message_acknowledgments')
      .update(updates)
      .eq('message_id', messageId);

    if (error) throw error;
  } catch (error) {
    logger.error('[MessageAcknowledgmentDB] Update acknowledgment error:', error);
    throw error;
  }
}

export async function getAcknowledgmentStatus(
  messageId: string,
): Promise<AcknowledgmentStatus | null> {
  try {
    const { data, error } = await supabase
      .from('message_acknowledgments')
      .select('*, agent_communications!inner(receiver_id)')
      .eq('message_id', messageId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      messageId: data.message_id,
      receiverId: data.agent_communications?.receiver_id || '',
      timestamp: new Date(data.created_at || Date.now()),
      status: data.status as AcknowledgmentStatus['status'],
    };
  } catch (error) {
    logger.error('[MessageAcknowledgmentDB] Check status error:', error);
    return null;
  }
}
