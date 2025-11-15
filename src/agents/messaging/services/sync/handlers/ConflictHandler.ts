import { MessageSequence, QueuedMessage, ConflictResolutionStrategy } from '../types';
import { DatabaseAdapter } from '../adapters/DatabaseAdapter';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../../../../../lib/logger';

export class ConflictHandler {
  private defaultStrategy: ConflictResolutionStrategy = {
    type: 'timestamp',
    resolve: (messages) =>
      messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
  };

  public async handleConflict(sequence: MessageSequence): Promise<void> {
    try {
      const message = await DatabaseAdapter.getMessageById(sequence.messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      const resolvedMessage = this.defaultStrategy.resolve([message]);

      await supabase
        .from('agent_communications')
        .update(resolvedMessage)
        .eq('id', sequence.messageId);

      logger.info('[ConflictHandler] Conflict resolved:', sequence.messageId);
    } catch (error) {
      logger.error('[ConflictHandler] Conflict resolution error:', error);
    }
  }
}
