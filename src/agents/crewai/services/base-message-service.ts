/**
 * Base Message Service for CrewAI
 * 
 * This abstract class provides common functionalities for message services within
 * the CrewAI agent framework, such as storing failed messages and notifying agents.
 * It is intended to be extended by more specific message service implementations.
 * 
 * Main Class:
 * - BaseMessageService: Provides foundational methods for message handling.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Json type from Supabase (`@/integrations/supabase/database.types`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project-specific Types
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