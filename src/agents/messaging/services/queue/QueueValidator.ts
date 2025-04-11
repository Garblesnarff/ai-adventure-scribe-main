import { QueuedMessage } from '../../types';

export class QueueValidator {
  public static validateMessage(message: QueuedMessage): boolean {
    return (
      !!message.id &&
      !!message.type &&
      !!message.content &&
      !!message.priority &&
      !!message.sender &&
      !!message.receiver &&
      !!message.timestamp
    );
  }

  public static validateQueueIntegrity(messages: QueuedMessage[]): boolean {
    const seenIds = new Set<string>();
    
    for (const message of messages) {
      if (!this.validateMessage(message)) {
        console.error('[QueueValidator] Invalid message found:', message.id);
        return false;
      }

      if (seenIds.has(message.id)) {
        console.error('[QueueValidator] Duplicate message ID found:', message.id);
        return false;
      }

      seenIds.add(message.id);
    }

    return true;
  }

  public static validateQueueOrder(messages: QueuedMessage[]): boolean {
    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1];
      const currMsg = messages[i];

      if (prevMsg.priority < currMsg.priority) {
        console.warn('[QueueValidator] Queue order violation:', {
          prev: prevMsg.id,
          curr: currMsg.id
        });
        return false;
      }
    }

    return true;
  }
}