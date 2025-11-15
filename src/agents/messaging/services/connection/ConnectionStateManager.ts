/**
 * Connection State Manager
 *
 * This file defines the ConnectionStateManager class, responsible for managing
 * and reacting to changes in the application's connection state (e.g., to a
 * backend service or network). It handles events for connection restoration
 * and loss, and attempts to synchronize state upon reconnection.
 *
 * Main Class:
 * - ConnectionStateManager: Manages connection state and related events.
 *
 * Key Dependencies:
 * - EventEmitter (./event-emitter.ts)
 * - MessageQueueService (`../message-queue-service.ts`)
 * - OfflineStateService (`../offline/offline-state-service.ts`)
 * - MessagePersistenceService (`../storage/message-persistence-service.ts`)
 * - ConnectionState type (`./types.ts`)
 * - General message types (`../../types.ts`)
 *
 * @author AI Dungeon Master Team
 */

// Project Services & Utilities
import { EventEmitter } from './EventEmitter';
import { MessageQueueService } from '../MessageQueueService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';

// Project Types
import { MessagePriority, MessageType, QueuedMessage } from '../../types';
import { ConnectionState } from './types';
import { logger } from '../../../../lib/logger';

export class ConnectionStateManager {
  private state: ConnectionState = {
    status: 'disconnected',
    lastConnected: null,
    lastDisconnected: null,
    reconnecting: false,
  };

  constructor(
    private eventEmitter: EventEmitter,
    private queueService: MessageQueueService,
    private persistenceService: MessagePersistenceService,
    private offlineService: OfflineStateService,
  ) {}

  public async handleConnectionRestored(): Promise<void> {
    logger.info('[ConnectionStateManager] Connection restored');

    this.state = {
      ...this.state,
      status: 'connected',
      lastConnected: new Date(),
      reconnecting: false,
    };

    this.eventEmitter.emit('connectionStateChanged', this.state);
    await this.synchronizeState();
  }

  public async handleConnectionLost(): Promise<void> {
    logger.info('[ConnectionStateManager] Connection lost');

    this.state = {
      ...this.state,
      status: 'disconnected',
      lastDisconnected: new Date(),
      reconnecting: false,
    };

    this.eventEmitter.emit('connectionStateChanged', this.state);
  }

  private async synchronizeState(): Promise<void> {
    try {
      const isValid = await this.queueService.validateQueue();
      if (!isValid) {
        logger.warn('[ConnectionStateManager] Queue validation failed, initiating recovery...');
        await this.persistenceService.cleanupOldMessages();
      }

      const pendingMessages = await this.persistenceService.getUnsentMessages();
      for (const message of pendingMessages) {
        await this.queueService.enqueue({
          ...message,
          sender: message.metadata?.sender || '',
          receiver: message.metadata?.receiver || '',
          type: message.type as MessageType, // Convert string to MessageType enum
          priority: MessagePriority.MEDIUM, // Set default priority
          timestamp: new Date(),
          deliveryStatus: {
            delivered: false,
            timestamp: new Date(),
            attempts: 0,
          },
          retryCount: 0,
          maxRetries: this.queueService.getConfig().maxRetries,
        });
      }

      await this.offlineService.updateOnlineStatus(true);

      this.eventEmitter.emit('reconnectionSuccessful', {
        timestamp: new Date(),
        pendingMessages: pendingMessages.length,
      });
    } catch (error) {
      logger.error('[ConnectionStateManager] Error handling reconnection:', error);
      this.eventEmitter.emit('reconnectionError', {
        error,
        timestamp: new Date(),
      });
    }
  }

  public getState(): ConnectionState {
    return { ...this.state };
  }
}
