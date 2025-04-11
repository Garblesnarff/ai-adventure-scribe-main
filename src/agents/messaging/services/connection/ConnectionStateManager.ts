import { ConnectionState } from './types';
import { EventEmitter } from './EventEmitter';
import { MessageQueueService } from '../MessageQueueService';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { MessageType, QueuedMessage, MessagePriority } from '../../types';

export class ConnectionStateManager {
  private state: ConnectionState = {
    status: 'disconnected',
    lastConnected: null,
    lastDisconnected: null,
    reconnecting: false
  };

  constructor(
    private eventEmitter: EventEmitter,
    private queueService: MessageQueueService,
    private persistenceService: MessagePersistenceService,
    private offlineService: OfflineStateService
  ) {}

  public async handleConnectionRestored(): Promise<void> {
    console.log('[ConnectionStateManager] Connection restored');
    
    this.state = {
      ...this.state,
      status: 'connected',
      lastConnected: new Date(),
      reconnecting: false
    };

    this.eventEmitter.emit('connectionStateChanged', this.state);
    await this.synchronizeState();
  }

  public async handleConnectionLost(): Promise<void> {
    console.log('[ConnectionStateManager] Connection lost');
    
    this.state = {
      ...this.state,
      status: 'disconnected',
      lastDisconnected: new Date(),
      reconnecting: false
    };

    this.eventEmitter.emit('connectionStateChanged', this.state);
  }

  private async synchronizeState(): Promise<void> {
    try {
      const isValid = await this.queueService.validateQueue();
      if (!isValid) {
        console.warn('[ConnectionStateManager] Queue validation failed, initiating recovery...');
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
            attempts: 0
          },
          retryCount: 0,
          maxRetries: this.queueService.getConfig().maxRetries
        });
      }

      await this.offlineService.updateOnlineStatus(true);
      
      this.eventEmitter.emit('reconnectionSuccessful', {
        timestamp: new Date(),
        pendingMessages: pendingMessages.length
      });

    } catch (error) {
      console.error('[ConnectionStateManager] Error handling reconnection:', error);
      this.eventEmitter.emit('reconnectionError', {
        error,
        timestamp: new Date()
      });
    }
  }

  public getState(): ConnectionState {
    return { ...this.state };
  }
}