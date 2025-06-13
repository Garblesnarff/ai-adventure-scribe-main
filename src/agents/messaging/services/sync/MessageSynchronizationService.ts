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

// Project Services & Utilities (assuming kebab-case filenames)
import { ErrorHandlingService } from '../../../error/services/error-handling-service';
import { RecoveryService } from '../../../error/services/recovery-service';
import { ConnectionStateService } from '../connection/connection-state-service';
import { MessageQueueService } from '../message-queue-service';
import { OfflineStateService } from '../offline/offline-state-service';
import { DatabaseAdapter } from './adapters/database-adapter';
import { ConflictHandler } from './handlers/conflict-handler';
import { SyncStateManager } from './managers/sync-state-manager';
import { ConsistencyValidator } from './validators/consistency-validator';

// Project Types
import { ErrorCategory, ErrorSeverity } from '@/types/error'; // Updated path
import { QueuedMessage, MessageSequence, MessageSyncOptions, SyncStatus } from '@/types/messaging';
// QueuedMessage was also in './types' but has been removed from there.
// MessageSequence, MessageSyncOptions, SyncStatus were also in './types' but now imported from global


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
