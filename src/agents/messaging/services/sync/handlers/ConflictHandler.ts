import { MessageSequence, QueuedMessage, ConflictResolutionStrategy } from '../types';
import { DatabaseAdapter } from '../adapters/DatabaseAdapter';
import { supabase } from '@/integrations/supabase/client';

export class ConflictHandler {
  private defaultStrategy: ConflictResolutionStrategy = {
    type: 'timestamp',
    resolve: (messages) => messages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0]
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

      console.log('[ConflictHandler] Conflict resolved:', sequence.messageId);
    } catch (error) {
      console.error('[ConflictHandler] Conflict resolution error:', error);
    }
  }
}