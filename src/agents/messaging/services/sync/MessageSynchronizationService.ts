import { MessageQueueService } from '../MessageQueueService';
import { ConnectionStateService } from '../connection/ConnectionStateService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { MessageSequence, MessageSyncOptions, QueuedMessage, SyncStatus } from './types';
import { SyncStateManager } from './managers/SyncStateManager';
import { ConflictHandler } from './handlers/ConflictHandler';
import { ConsistencyValidator } from './validators/ConsistencyValidator';
import { DatabaseAdapter } from './adapters/DatabaseAdapter';
import { ErrorHandlingService } from '../../../error/services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from '../../../error/types';
import { RecoveryService } from '../../../error/services/RecoveryService';

export class MessageSynchronizationService {
  private static instance: MessageSynchronizationService;
  private queueService: MessageQueueService;
  private connectionService: ConnectionStateService;
  private offlineService: OfflineStateService;
  private stateManager: SyncStateManager;
  private conflictHandler: ConflictHandler;
  private consistencyValidator: ConsistencyValidator;
  private syncInterval: NodeJS.Timeout | null = null;

  private defaultOptions: MessageSyncOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    consistencyCheckInterval: 5000
  };

  private constructor() {
    this.queueService = MessageQueueService.getInstance();
    this.connectionService = ConnectionStateService.getInstance();
    this.offlineService = OfflineStateService.getInstance();
    this.stateManager = new SyncStateManager();
    this.conflictHandler = new ConflictHandler();
    this.consistencyValidator = new ConsistencyValidator();
    this.initializeService();
  }

  public static getInstance(): MessageSynchronizationService {
    if (!MessageSynchronizationService.instance) {
      MessageSynchronizationService.instance = new MessageSynchronizationService();
    }
    return MessageSynchronizationService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      await this.stateManager.loadVectorClock();
      this.startConsistencyChecks();
      this.listenToConnectionChanges();
      console.log('[MessageSynchronizationService] Initialized successfully');
    } catch (error) {
      console.error('[MessageSynchronizationService] Initialization error:', error);
    }
  }

  private startConsistencyChecks(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(
      () => this.performConsistencyCheck(),
      this.defaultOptions.consistencyCheckInterval
    );
  }

  private listenToConnectionChanges(): void {
    this.connectionService.onConnectionStateChanged(async (state) => {
      if (state.status === 'connected') {
        await this.synchronizeMessages();
      }
    });
  }

  public async synchronizeMessage(message: QueuedMessage): Promise<boolean> {
    const errorHandler = ErrorHandlingService.getInstance();
    const recoveryService = RecoveryService.getInstance();

    try {
      const agentId = message.sender;
      this.stateManager.incrementVectorClock(agentId);

      const sequence: Omit<MessageSequence, 'id' | 'createdAt' | 'updatedAt'> = {
        messageId: message.id,
        sequenceNumber: this.stateManager.getVectorClock()[agentId] || 0,
        vectorClock: this.stateManager.getVectorClock(),
      };

      await errorHandler.handleDatabaseOperation(
        async () => DatabaseAdapter.saveMessageSequence(sequence as MessageSequence),
        {
          category: ErrorCategory.DATABASE,
          context: 'MessageSync.saveSequence',
          severity: ErrorSeverity.HIGH
        }
      );

      await this.stateManager.updateSyncState(agentId, this.queueService.getQueueIds());
      return true;
    } catch (error) {
      console.error('[MessageSynchronizationService] Synchronization error:', error);
      await recoveryService.attemptRecovery('message-sync', error as Error);
      return false;
    }
  }

  private async synchronizeMessages(): Promise<void> {
    if (!this.offlineService.isOnline()) {
      return;
    }

    const errorHandler = ErrorHandlingService.getInstance();

    try {
      const sequences = await errorHandler.handleDatabaseOperation(
        async () => DatabaseAdapter.getAllMessageSequences(),
        {
          category: ErrorCategory.DATABASE,
          context: 'MessageSync.getAllSequences',
          severity: ErrorSeverity.HIGH
        }
      );
      
      for (const sequence of sequences) {
        await this.processMessageSequence(sequence);
      }

      console.log('[MessageSynchronizationService] Messages synchronized successfully');
    } catch (error) {
      console.error('[MessageSynchronizationService] Synchronization error:', error);
      await RecoveryService.getInstance().attemptRecovery('message-sync', error as Error);
    }
  }

  private async processMessageSequence(sequence: MessageSequence): Promise<void> {
    const hasConflict = this.stateManager.detectConflict(sequence.vectorClock);
    if (hasConflict) {
      await this.conflictHandler.handleConflict(sequence);
    } else {
      Object.entries(sequence.vectorClock).forEach(([agentId, count]) => {
        const currentClock = this.stateManager.getVectorClock();
        currentClock[agentId] = Math.max(
          currentClock[agentId] || 0,
          count
        );
      });
    }
  }

  private async performConsistencyCheck(): Promise<void> {
    if (!this.offlineService.isOnline()) {
      return;
    }

    const isConsistent = await this.consistencyValidator.checkConsistency();
    if (!isConsistent) {
      await this.synchronizeMessages();
    }
  }

  public async getMessageSequence(messageId: string): Promise<MessageSequence | null> {
    return DatabaseAdapter.getMessageSequence(messageId);
  }

  public async getSyncStatus(agentId: string): Promise<SyncStatus | null> {
    return DatabaseAdapter.getSyncStatus(agentId);
  }
}
