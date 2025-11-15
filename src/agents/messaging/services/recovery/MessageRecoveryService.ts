/**
 * Message Recovery Service
 *
 * This file defines the MessageRecoveryService class, a singleton service
 * responsible for recovering pending messages from persistent storage (IndexedDB)
 * and re-enqueuing them into the MessageQueueService. This is crucial for ensuring
 * message durability across application sessions or after unexpected closures.
 * It also provides a method to validate queue integrity against stored state.
 *
 * Main Class:
 * - MessageRecoveryService: Handles recovery of pending messages.
 *
 * Key Dependencies:
 * - IndexedDBService (`../storage/indexed-db-service.ts`)
 * - MessageQueueService (`../message-queue-service.ts`)
 * - QueuedMessage type from `../../types`.
 *
 * @author AI Dungeon Master Team
 */

// Project Services
import { IndexedDBService } from '../storage/IndexedDBService';
import { MessageQueueService } from '../MessageQueueService';

// Project Types
import { QueuedMessage } from '../../types';
import { logger } from '../../../../lib/logger';

export class MessageRecoveryService {
  private static instance: MessageRecoveryService;
  private storage: IndexedDBService;
  private queueService: MessageQueueService;

  private constructor() {
    this.storage = IndexedDBService.getInstance();
    this.queueService = MessageQueueService.getInstance();
  }

  public static getInstance(): MessageRecoveryService {
    if (!MessageRecoveryService.instance) {
      MessageRecoveryService.instance = new MessageRecoveryService();
    }
    return MessageRecoveryService.instance;
  }

  public async recoverMessages(): Promise<void> {
    try {
      logger.info('[MessageRecoveryService] Starting message recovery...');

      // Get all pending messages from storage
      const pendingMessages = await this.storage.getPendingMessages();
      logger.info(`[MessageRecoveryService] Found ${pendingMessages.length} pending messages`);

      // Validate and restore messages to queue
      for (const storedMessage of pendingMessages) {
        const queuedMessage: QueuedMessage = {
          id: storedMessage.id,
          type: storedMessage.type as any,
          content: storedMessage.content,
          priority: storedMessage.priority as any,
          sender: storedMessage.metadata?.sender || '',
          receiver: storedMessage.metadata?.receiver || '',
          timestamp: new Date(storedMessage.timestamp),
          deliveryStatus: {
            delivered: false,
            timestamp: new Date(),
            attempts: 0,
          },
          retryCount: 0,
          maxRetries: this.queueService.getConfig().maxRetries,
        };

        // Validate message integrity
        if (this.validateMessage(queuedMessage)) {
          await this.queueService.enqueue(queuedMessage);
          logger.info(`[MessageRecoveryService] Recovered message: ${queuedMessage.id}`);
        } else {
          logger.error(`[MessageRecoveryService] Invalid message found: ${queuedMessage.id}`);
          await this.storage.updateMessageStatus(queuedMessage.id, 'failed');
        }
      }

      logger.info('[MessageRecoveryService] Message recovery completed');
    } catch (error) {
      logger.error('[MessageRecoveryService] Recovery error:', error);
      throw error;
    }
  }

  private validateMessage(message: QueuedMessage): boolean {
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

  public async validateQueueIntegrity(): Promise<boolean> {
    try {
      const queueState = await this.storage.getQueueState();
      if (!queueState) return true; // No stored state to validate against

      const currentQueueIds = this.queueService.getQueueIds();
      const storedQueueIds = queueState.pendingMessages;

      // Check if all stored messages are in the queue
      const missingMessages = storedQueueIds.filter((id) => !currentQueueIds.includes(id));

      if (missingMessages.length > 0) {
        logger.warn(`[MessageRecoveryService] Found ${missingMessages.length} missing messages`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[MessageRecoveryService] Queue validation error:', error);
      return false;
    }
  }
}
