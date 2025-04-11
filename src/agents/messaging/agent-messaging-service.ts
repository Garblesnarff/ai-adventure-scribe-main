import { QueuedMessage, MessageType, MessagePriority, OfflineState } from './types';
import { MessageQueueService } from './services/MessageQueueService';
import { MessageProcessingService } from './services/MessageProcessingService';
import { MessagePersistenceService } from './services/storage/MessagePersistenceService';
import { MessageRecoveryService } from './services/recovery/MessageRecoveryService';
import { OfflineStateService } from './services/offline/OfflineStateService';
import { ConnectionStateService } from './services/connection/ConnectionStateService';
import { MessageSynchronizationService } from './services/sync/MessageSynchronizationService';
import { useToast } from '@/hooks/use-toast';

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

  private constructor() {
    this.queueService = MessageQueueService.getInstance();
    this.processingService = MessageProcessingService.getInstance();
    this.persistenceService = MessagePersistenceService.getInstance();
    this.recoveryService = MessageRecoveryService.getInstance();
    this.offlineService = OfflineStateService.getInstance();
    this.connectionService = ConnectionStateService.getInstance();
    this.synchronizationService = MessageSynchronizationService.getInstance();
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
      console.error('[AgentMessagingService] Initialization error:', error);
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
      console.warn('[AgentMessagingService] Queue validation failed, initiating recovery...');
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
      console.error('[AgentMessagingService] Error processing message:', error);
      await this.queueService.completeProcessing(false);
    }
  }

  public async sendMessage(
    sender: string,
    receiver: string,
    type: MessageType,
    content: any,
    priority: MessagePriority = MessagePriority.MEDIUM
  ): Promise<boolean> {
    try {
      const message = await this.processingService.createMessage(
        sender,
        receiver,
        type,
        content,
        priority
      );

      await this.persistenceService.persistMessage(message);
      const enqueued = await this.queueService.enqueue(message);
      
      if (enqueued && this.offlineService.isOnline()) {
        await this.synchronizationService.synchronizeMessage(message);
      }
      
      return enqueued;
    } catch (error) {
      console.error('[AgentMessagingService] Send message error:', error);
      return false;
    }
  }

  public getQueueStatus(): {
    queueLength: number;
    processingMessage?: QueuedMessage;
    isOnline: boolean;
    metrics: any;
    offlineState?: OfflineState;
  } {
    return {
      queueLength: this.queueService.getQueueLength(),
      processingMessage: this.queueService.peek(),
      isOnline: this.offlineService.isOnline(),
      metrics: this.queueService.getMetrics(),
      offlineState: this.offlineService.getState()
    };
  }
}