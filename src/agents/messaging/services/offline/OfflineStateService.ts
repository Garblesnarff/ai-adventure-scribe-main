/**
 * Offline State Service
 *
 * This file defines the OfflineStateService class, a singleton service
 * responsible for managing the application's online/offline state. It listens
 * to browser online/offline events, attempts to synchronize pending messages
 * upon reconnection, and manages reconnection attempts with backoff.
 *
 * Main Class:
 * - OfflineStateService: Manages and tracks online/offline status and synchronization.
 *
 * Key Dependencies:
 * - IndexedDBService (`../storage/indexed-db-service.ts`)
 * - MessageQueueService (`../message-queue-service.ts`)
 * - MessagePersistenceService (`../storage/message-persistence-service.ts`)
 * - MessageRecoveryService (`../recovery/message-recovery-service.ts`)
 * - QueueStateManager (`../queue/queue-state-manager.ts`)
 * - Various message and storage types.
 *
 * @author AI Dungeon Master Team
 */

// Project Services & Utilities
import { MessageQueueService } from '../MessageQueueService';
import { QueueStateManager } from '../queue/QueueStateManager';
import { MessageRecoveryService } from '../recovery/MessageRecoveryService';
import { IndexedDBService } from '../storage/IndexedDBService';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';

// Project Types
import { MessagePriority, MessageType, QueuedMessage } from '../../types';
import { OfflineState, StoredMessage } from '../storage/types';
import { logger } from '../../../../lib/logger';

export class OfflineStateService {
  private static instance: OfflineStateService;
  private storage: IndexedDBService;
  private queueService: MessageQueueService;
  private persistenceService: MessagePersistenceService;
  private recoveryService: MessageRecoveryService;
  private stateManager: QueueStateManager;
  private state: OfflineState;
  private reconnectionTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.storage = IndexedDBService.getInstance();
    this.queueService = MessageQueueService.getInstance();
    this.persistenceService = MessagePersistenceService.getInstance();
    this.recoveryService = MessageRecoveryService.getInstance();
    this.stateManager = QueueStateManager.getInstance();

    this.state = {
      isOnline: navigator.onLine,
      lastOnlineTimestamp: new Date().toISOString(),
      lastOfflineTimestamp: '',
      pendingSync: false,
      queueSize: 0,
      reconnectionAttempts: 0,
    };

    this.initializeService();
  }

  public static getInstance(): OfflineStateService {
    if (!OfflineStateService.instance) {
      OfflineStateService.instance = new OfflineStateService();
    }
    return OfflineStateService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      const savedState = await this.storage.getOfflineState();
      if (savedState) {
        this.state = { ...this.state, ...savedState };
      }

      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      await this.saveState();

      logger.info('[OfflineStateService] Initialized with state:', this.state);
    } catch (error) {
      logger.error('[OfflineStateService] Initialization error:', error);
    }
  }

  private async handleOnline(): Promise<void> {
    logger.info('[OfflineStateService] Connection restored');

    this.state.isOnline = true;
    this.state.lastOnlineTimestamp = new Date().toISOString();
    this.state.pendingSync = true;

    await this.saveState();
    await this.synchronize();
  }

  private async handleOffline(): Promise<void> {
    logger.info('[OfflineStateService] Connection lost');

    this.state.isOnline = false;
    this.state.lastOfflineTimestamp = new Date().toISOString();
    this.state.pendingSync = false;

    await this.saveState();
    this.startReconnectionAttempts();
  }

  private async synchronize(): Promise<void> {
    try {
      const isValid = await this.queueService.validateQueue();
      if (!isValid) {
        logger.warn('[OfflineStateService] Queue validation failed, initiating recovery...');
        await this.recoveryService.recoverMessages();
      }

      const pendingMessages = await this.persistenceService.getUnsentMessages();
      for (const message of pendingMessages) {
        const queuedMessage = this.convertStoredToQueuedMessage(message);
        await this.queueService.enqueue(queuedMessage);
      }

      this.state.pendingSync = false;
      this.state.reconnectionAttempts = 0;
      await this.saveState();

      logger.info('[OfflineStateService] Synchronization complete');
    } catch (error) {
      logger.error('[OfflineStateService] Synchronization error:', error);
      this.state.pendingSync = true;
      await this.saveState();
    }
  }

  private convertStoredToQueuedMessage(stored: StoredMessage): QueuedMessage {
    return {
      id: stored.id,
      type: stored.type as MessageType,
      content: stored.content,
      priority: stored.priority as MessagePriority,
      sender: stored.metadata?.sender || '',
      receiver: stored.metadata?.receiver || '',
      timestamp: new Date(stored.timestamp),
      deliveryStatus: {
        delivered: false,
        timestamp: new Date(),
        attempts: stored.retryCount,
      },
      retryCount: stored.retryCount,
      maxRetries: this.queueService.getConfig().maxRetries,
    };
  }

  private async saveState(): Promise<void> {
    try {
      await this.storage.saveOfflineState(this.state);
    } catch (error) {
      logger.error('[OfflineStateService] Error saving state:', error);
    }
  }

  public getState(): OfflineState {
    return { ...this.state };
  }

  public isOnline(): boolean {
    return this.state.isOnline;
  }

  public isPendingSync(): boolean {
    return this.state.pendingSync;
  }

  public getQueueSize(): number {
    return this.queueService.getQueueLength();
  }

  public async updateOnlineStatus(isOnline: boolean): Promise<void> {
    this.state.isOnline = isOnline;
    this.state.lastOnlineTimestamp = isOnline
      ? new Date().toISOString()
      : this.state.lastOnlineTimestamp;
    this.state.lastOfflineTimestamp = !isOnline
      ? new Date().toISOString()
      : this.state.lastOfflineTimestamp;
    await this.saveState();
  }

  private startReconnectionAttempts(): void {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
    }

    const backoffTime = Math.min(1000 * Math.pow(2, this.state.reconnectionAttempts), 30000);

    this.reconnectionTimeout = setTimeout(async () => {
      if (!this.state.isOnline) {
        this.state.reconnectionAttempts++;
        await this.saveState();
        this.startReconnectionAttempts();
      }
    }, backoffTime);
  }
}
