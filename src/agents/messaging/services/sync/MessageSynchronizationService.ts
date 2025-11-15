/**
 * Message Synchronization Service
 *
 * This file defines the MessageSynchronizationService class, a singleton responsible
 * for synchronizing messages and their sequence information, likely in a distributed
 * or multi-agent scenario. It uses vector clocks for managing message order and
 * consistency, handles conflicts, and interacts with various other services for
 * queue management, connection state, error handling, and persistence.
 *
 * Main Class:
 * - MessageSynchronizationService: Manages message synchronization and consistency.
 *
 * Key Dependencies:
 * - Various messaging sub-services (Queue, Connection, Offline, ErrorHandling, Recovery).
 * - Sync-specific components (SyncStateManager, ConflictHandler, ConsistencyValidator, DatabaseAdapter).
 * - Message and Sync types.
 *
 * @author AI Dungeon Master Team
 */

// Project Services & Utilities
import { ErrorHandlingService } from '../../../error/services/error-handling-service';
import { RecoveryService } from '../../../error/services/recovery-service';
import { ConnectionStateService } from '../connection/ConnectionStateService';
import { MessageQueueService } from '../MessageQueueService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { DatabaseAdapter } from './adapters/DatabaseAdapter';
import { ConflictHandler } from './handlers/ConflictHandler';
import { SyncStateManager } from './managers/SyncStateManager';
import { ConsistencyValidator } from './validators/ConsistencyValidator';

// Project Types
import { ErrorCategory, ErrorSeverity } from '../../../error/types';
import { QueuedMessage } from './types'; // Assuming QueuedMessage is from a higher-level type definition if not explicitly used here
import { logger } from '../../../../lib/logger';
// If QueuedMessage from '../../types' is needed, add: import { QueuedMessage } from '../../types';
// Currently, QueuedMessage is also in ./types, resolve this ambiguity if possible.
import { MessageSequence, MessageSyncOptions, SyncStatus } from './types';

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
    consistencyCheckInterval: 5000,
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
      logger.info('[MessageSynchronizationService] Initialized successfully');
    } catch (error) {
      logger.error('[MessageSynchronizationService] Initialization error:', error);
    }
  }

  private startConsistencyChecks(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(
      () => this.performConsistencyCheck(),
      this.defaultOptions.consistencyCheckInterval,
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
          severity: ErrorSeverity.HIGH,
        },
      );

      await this.stateManager.updateSyncState(agentId, this.queueService.getQueueIds());
      return true;
    } catch (error) {
      logger.error('[MessageSynchronizationService] Synchronization error:', error);
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
          severity: ErrorSeverity.HIGH,
        },
      );

      for (const sequence of sequences) {
        await this.processMessageSequence(sequence);
      }

      logger.info('[MessageSynchronizationService] Messages synchronized successfully');
    } catch (error) {
      logger.error('[MessageSynchronizationService] Synchronization error:', error);
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
        currentClock[agentId] = Math.max(currentClock[agentId] || 0, count);
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
