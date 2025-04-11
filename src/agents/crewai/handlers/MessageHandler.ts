import { AgentMessage, MessageType, MessagePriority } from '../types/communication';
import { MessageHandlerService } from '../services/MessageHandlerService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles message passing between agents with priority queue
 */
export class MessageHandler {
  private messageService: MessageHandlerService;

  constructor() {
    this.messageService = MessageHandlerService.getInstance();
  }

  /**
   * Sends a message to another agent
   */
  async sendMessage(message: AgentMessage): Promise<void> {
    try {
      console.log('[MessageHandler] Sending message:', message);

      const { error } = await supabase
        .from('agent_communications')
        .insert([{
          sender_id: message.metadata?.sender,
          receiver_id: message.metadata?.receiver,
          message_type: message.type,
          content: message.content,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Process message based on type
      switch (message.type) {
        case MessageType.TASK:
          await this.messageService.handleTaskMessage(message.content);
          break;
        case MessageType.RESULT:
          await this.messageService.handleResultMessage(message.content);
          break;
        case MessageType.QUERY:
          await this.messageService.handleQueryMessage(message.content);
          break;
        case MessageType.STATE_UPDATE:
          await this.messageService.handleStateUpdate(message.content);
          break;
        default:
          console.warn('[MessageHandler] Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('[MessageHandler] Error sending message:', error);
      throw error;
    }
  }
}