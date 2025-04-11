import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/database.types';

export abstract class BaseMessageService {
  protected async storeFailedMessage(type: string, payload: any, error: any): Promise<void> {
    try {
      await supabase
        .from('agent_communications')
        .insert({
          message_type: `failed_${type}`,
          content: JSON.stringify({
            payload,
            error: error.message || error,
            timestamp: new Date().toISOString()
          })
        });
    } catch (storeError) {
      console.error('[BaseMessageService] Error storing failed message:', storeError);
    }
  }

  protected async notifyAgent(agentId: string, message: { type: string; content: any }): Promise<void> {
    try {
      const notificationData = {
        receiver_id: agentId,
        message_type: message.type,
        content: JSON.stringify(message.content)
      };

      await supabase
        .from('agent_communications')
        .insert(notificationData);
    } catch (error) {
      console.error('[BaseMessageService] Error notifying agent:', error);
      throw error;
    }
  }
}