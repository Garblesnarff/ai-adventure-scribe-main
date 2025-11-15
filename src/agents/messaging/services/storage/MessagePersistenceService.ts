/**
 * Message Persistence Service
 *
 * This file defines the MessagePersistenceService class, a singleton service
 * responsible for managing the persistence of messages to client-side storage
 * (IndexedDB). It handles storing new messages, updating their status, retrieving
 * unsent messages, and managing the persisted state of the message queue.
 *
 * Main Class:
 * - MessagePersistenceService: Manages message persistence using IndexedDBService.
 *
 * Key Dependencies:
 * - IndexedDBService (`./indexed-db-service.ts`)
 * - Various message and queue state types.
 *
 * @author AI Dungeon Master Team
 */

// Project Services
import { IndexedDBService } from './IndexedDBService';

// Project Types
import { QueuedMessage } from '../../types';
import { StoredMessage, QueueState } from './types';
import { logger } from '../../../../lib/logger';

export class MessagePersistenceService {
  private static instance: MessagePersistenceService;
  private storage: IndexedDBService;

  private constructor() {
    this.storage = IndexedDBService.getInstance();
  }

  public static getInstance(): MessagePersistenceService {
    if (!MessagePersistenceService.instance) {
      MessagePersistenceService.instance = new MessagePersistenceService();
    }
    return MessagePersistenceService.instance;
  }

  public async persistMessage(message: QueuedMessage): Promise<void> {
    const storedMessage: StoredMessage = {
      id: message.id,
      content: message.content,
      type: message.type,
      priority: message.priority.toString(), // Convert enum to string
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      metadata: {
        sender: message.sender,
        receiver: message.receiver,
      },
    };

    await this.storage.storeMessage(storedMessage);
    logger.info('[MessagePersistence] Message persisted:', message.id);
  }

  public async updateMessageStatus(
    messageId: string,
    status: StoredMessage['status'],
  ): Promise<void> {
    await this.storage.updateMessageStatus(messageId, status);
    logger.info('[MessagePersistence] Message status updated:', messageId, status);
  }

  public async getUnsentMessages(): Promise<StoredMessage[]> {
    return this.storage.getPendingMessages();
  }

  public async saveQueueState(state: QueueState): Promise<void> {
    await this.storage.saveQueueState(state);
  }

  public async getQueueState(): Promise<QueueState | null> {
    return this.storage.getQueueState();
  }

  public async cleanupOldMessages(): Promise<void> {
    await this.storage.clearOldMessages();
  }
}
