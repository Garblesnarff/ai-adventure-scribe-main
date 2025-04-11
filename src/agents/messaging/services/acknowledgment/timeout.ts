import { supabase } from '@/integrations/supabase/client';
import { updateAcknowledgment } from './db';

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
        error: 'Message acknowledgment timeout'
      });
    }
  } catch (error) {
    console.error('[MessageAcknowledgmentTimeout] Handle timeout error:', error);
  }
}