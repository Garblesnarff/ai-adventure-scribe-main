/**
 * Agent Messaging Service
 *
 * Provides a centralized service for handling inter-agent communication.
 * Manages message queuing, processing, persistence, recovery, offline state,
 * connection status, and synchronization. This service is designed as a singleton.
 *
 * Key functionalities:
 * - Enqueuing messages for sending.
 * - Processing the message queue.
 * - Persisting messages for durability.
 * - Recovering messages after interruptions.
 * - Managing online/offline state.
 * - Synchronizing messages (e.g., with a backend or other clients).
 *
 * Dependencies:
 * - Various messaging sub-services (Queue, Processing, Persistence, Recovery, Offline, Connection, Sync).
 * - Message types from './types'.
 * - useToast hook for notifications.
 *
 * @author AI Dungeon Master Team
 */

// Project types
import { QueuedMessage, MessageType, MessagePriority, OfflineState } from './types';

// Messaging Sub-Services
import { ConnectionStateService } from './services/connection/ConnectionStateService';
import { MessagePersistenceService } from './services/storage/MessagePersistenceService';
import { MessageProcessingService } from './services/MessageProcessingService';
import { MessageQueueService } from './services/MessageQueueService';
import { MessageRecoveryService } from './services/recovery/MessageRecoveryService';
import { MessageSynchronizationService } from './services/sync/MessageSynchronizationService';
import { OfflineStateService } from './services/offline/OfflineStateService';

import { AgentNotificationService } from './services/notifications/AgentNotificationService';
import { MessageDiagnosticsService } from './services/diagnostics/MessageDiagnosticsService';
import { logger } from '../../lib/logger';

export class AgentMessagingService {
  private static instance: AgentMessagingService;
  private queueService: MessageQueueService;
  private processingService: MessageProcessingService;
  private persistenceService: MessagePersistenceService;
  private recoveryService: MessageRecoveryService;
  private offlineService: OfflineStateService;
  private connectionService: ConnectionStateService;
  private synchronizationService: MessageSynchronizationService;
  private processingInterval: NodeJS.Timeout | null = null;
  private notifier: AgentNotificationService;
  private diagnostics: MessageDiagnosticsService;

  private constructor() {
    this.queueService = MessageQueueService.getInstance();
    this.processingService = MessageProcessingService.getInstance();
    this.persistenceService = MessagePersistenceService.getInstance();
    this.recoveryService = MessageRecoveryService.getInstance();
    this.offlineService = OfflineStateService.getInstance();
    this.connectionService = ConnectionStateService.getInstance();
    this.synchronizationService = MessageSynchronizationService.getInstance();
    this.notifier = new AgentNotificationService();
    this.diagnostics = MessageDiagnosticsService.getInstance();
    this.initializeService();
  }

  public static getInstance(): AgentMessagingService {
    if (!AgentMessagingService.instance) {
      AgentMessagingService.instance = new AgentMessagingService();
    }
    return AgentMessagingService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      await this.recoveryService.recoverMessages();

      this.connectionService.onConnectionStateChanged((state) => {
        if (state.status === 'connected') {
          this.startQueueProcessor();
        } else {
          if (this.processingInterval) {
            clearInterval(this.processingInterval);
          }
        }
      });

      if (this.connectionService.getState().status === 'connected') {
        this.startQueueProcessor();
      }
    } catch (error) {
      logger.error('[AgentMessagingService] Initialization error:', error);
    }
  }

  private startQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (this.offlineService.isOnline()) {
        await this.processMessageQueue();
      }
    }, 1000);
  }

  private async processMessageQueue(): Promise<void> {
    const isValid = await this.queueService.validateQueue();
    if (!isValid) {
      logger.warn('[AgentMessagingService] Queue validation failed, initiating recovery...');
      await this.recoveryService.recoverMessages();
      return;
    }

    const message = this.queueService.peek();
    if (!message) return;

    try {
      const success = await this.processingService.processMessage(message);
      if (success) {
        await this.synchronizationService.synchronizeMessage(message);
      }
      this.queueService.dequeue();
      await this.queueService.completeProcessing(success);
    } catch (error) {
      logger.error('[AgentMessagingService] Error processing message:', error);
      await this.queueService.completeProcessing(false);
    }
  }

  public async sendMessage(
    sender: string,
    receiver: string,
    type: MessageType,
    content: any,
    priority: MessagePriority = MessagePriority.MEDIUM,
  ): Promise<boolean> {
    try {
      const message = await this.processingService.createMessage(
        sender,
        receiver,
        type,
        content,
        priority,
      );

      await this.persistenceService.persistMessage(message);
      const enqueued = await this.queueService.enqueue(message);

      if (enqueued && this.offlineService.isOnline()) {
        await this.synchronizationService.synchronizeMessage(message);
      }

      if (!enqueued) {
        this.notifier.notify({
          level: 'warning',
          title: 'Message queue is full',
          description: 'Unable to enqueue message due to capacity limits.',
        });
      }

      return enqueued;
    } catch (error) {
      logger.error('[AgentMessagingService] Send message error:', error);
      this.notifier.notify({
        level: 'error',
        title: 'Message dispatch failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  public getQueueStatus(): {
    queueLength: number;
    processingMessage?: QueuedMessage;
    isOnline: boolean;
    metrics: any;
    offlineState?: OfflineState;
    telemetry: ReturnType<MessageDiagnosticsService['getSnapshot']>;
    deadLetter: QueuedMessage[];
  } {
    return {
      queueLength: this.queueService.getQueueLength(),
      processingMessage: this.queueService.peek(),
      isOnline: this.offlineService.isOnline(),
      metrics: this.queueService.getMetrics(),
      offlineState: this.offlineService.getState(),
      telemetry: this.diagnostics.getSnapshot(),
      deadLetter: this.diagnostics.getDeadLetterQueue(),
    };
  }

  public getNotifier(): AgentNotificationService {
    return this.notifier;
  }
}
