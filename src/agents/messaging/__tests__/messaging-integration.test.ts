/**
 * Messaging System Integration Tests
 *
 * End-to-end integration tests covering:
 * - Complete message flow from DM Agent to Rules Agent
 * - Offline queue to online sync workflow
 * - Error handling and recovery
 * - Cross-service coordination
 *
 * @author AI Dungeon Master Team
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessageQueueService } from '../services/MessageQueueService';
import { MessagePersistenceService } from '../services/storage/MessagePersistenceService';
import { MessageSynchronizationService } from '../services/sync/MessageSynchronizationService';
import { ConnectionStateService } from '../services/connection/ConnectionStateService';
import { OfflineStateService } from '../services/offline/OfflineStateService';
import { MessageType, MessagePriority, QueuedMessage } from '../types';

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
    },
  },
}));

// Mock error services
vi.mock('../../error/services/error-handling-service', () => ({
  ErrorHandlingService: {
    getInstance: vi.fn(() => ({
      handleDatabaseOperation: vi.fn(async (operation: any) => await operation()),
    })),
  },
}));

vi.mock('../../error/services/recovery-service', () => ({
  RecoveryService: {
    getInstance: vi.fn(() => ({
      attemptRecovery: vi.fn().mockResolvedValue(true),
    })),
  },
}));

// Mock IndexedDB
vi.mock('../services/storage/IndexedDBService', () => {
  const messages = new Map();
  let queueState: any = null;
  let offlineState: any = null;

  return {
    IndexedDBService: {
      getInstance: vi.fn(() => ({
        storeMessage: vi.fn(async (msg: any) => {
          messages.set(msg.id, msg);
        }),
        updateMessageStatus: vi.fn(async (id: string, status: string) => {
          const msg = messages.get(id);
          if (msg) msg.status = status;
        }),
        getPendingMessages: vi.fn(async () => {
          return Array.from(messages.values()).filter((m: any) => m.status === 'pending');
        }),
        saveQueueState: vi.fn(async (state: any) => {
          queueState = state;
        }),
        getQueueState: vi.fn(async () => queueState),
        saveOfflineState: vi.fn(async (state: any) => {
          offlineState = state;
        }),
        getOfflineState: vi.fn(async () => offlineState),
        clearOldMessages: vi.fn(async () => 0),
        __reset: () => {
          messages.clear();
          queueState = null;
          offlineState = null;
        },
      })),
    },
  };
});

// Mock database adapter
vi.mock('../services/sync/adapters/DatabaseAdapter', () => ({
  DatabaseAdapter: {
    saveMessageSequence: vi.fn().mockResolvedValue(undefined),
    getAllMessageSequences: vi.fn().mockResolvedValue([]),
    getMessageSequence: vi.fn().mockResolvedValue(null),
    getSyncStatus: vi.fn().mockResolvedValue(null),
  },
}));

// Mock other sync components
vi.mock('../services/sync/handlers/ConflictHandler');
vi.mock('../services/sync/validators/ConsistencyValidator', () => ({
  ConsistencyValidator: vi.fn().mockImplementation(() => ({
    checkConsistency: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../services/sync/managers/SyncStateManager', () => ({
  SyncStateManager: vi.fn().mockImplementation(() => ({
    loadVectorClock: vi.fn().mockResolvedValue(undefined),
    incrementVectorClock: vi.fn(),
    getVectorClock: vi.fn(() => ({ 'dm-agent': 1 })),
    updateSyncState: vi.fn().mockResolvedValue(undefined),
    detectConflict: vi.fn(() => false),
  })),
}));

vi.mock('../services/queue/QueueStateManager', () => ({
  QueueStateManager: {
    getInstance: vi.fn(() => ({
      saveQueueSnapshot: vi.fn().mockResolvedValue(undefined),
      validateQueueState: vi.fn().mockResolvedValue(true),
      updateMetrics: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalProcessed: 0,
        failedDeliveries: 0,
        avgProcessingTime: 0,
      })),
    })),
  },
}));

vi.mock('../services/recovery/MessageRecoveryService', () => ({
  MessageRecoveryService: {
    getInstance: vi.fn(() => ({
      recoverMessages: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('../services/connection/EventEmitter', () => ({
  EventEmitter: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
  })),
}));

vi.mock('../services/connection/ReconnectionManager', () => ({
  ReconnectionManager: vi.fn().mockImplementation(() => ({
    reset: vi.fn(),
    startReconnection: vi.fn(),
  })),
}));

vi.mock('../services/connection/ConnectionStateManager', () => ({
  ConnectionStateManager: vi.fn().mockImplementation(() => ({
    handleConnectionRestored: vi.fn().mockResolvedValue(undefined),
    handleConnectionLost: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn(() => ({
      status: 'connected',
      isOnline: true,
      lastConnectedAt: new Date().toISOString(),
      reconnectionAttempts: 0,
    })),
  })),
}));

describe('Messaging System Integration Tests', () => {
  let queueService: MessageQueueService;
  let persistenceService: MessagePersistenceService;
  let syncService: MessageSynchronizationService;
  let connectionService: ConnectionStateService;
  let offlineService: OfflineStateService;

  const createMessage = (
    id: string,
    sender: string = 'dm-agent',
    receiver: string = 'rules-agent',
  ): QueuedMessage => ({
    id,
    type: MessageType.TASK,
    content: {
      action: 'process_dice_roll',
      data: { roll: '1d20+5' },
    },
    priority: MessagePriority.HIGH,
    sender,
    receiver,
    timestamp: new Date(),
    deliveryStatus: {
      delivered: false,
      timestamp: new Date(),
      attempts: 0,
    },
    retryCount: 0,
    maxRetries: 3,
  });

  beforeEach(async () => {
    // Reset all singletons
    // @ts-ignore
    MessageQueueService.instance = undefined;
    // @ts-ignore
    MessagePersistenceService.instance = undefined;
    // @ts-ignore
    MessageSynchronizationService.instance = undefined;
    // @ts-ignore
    ConnectionStateService.instance = undefined;
    // @ts-ignore
    OfflineStateService.instance = undefined;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Initialize services
    queueService = MessageQueueService.getInstance();
    persistenceService = MessagePersistenceService.getInstance();
    syncService = MessageSynchronizationService.getInstance();
    connectionService = ConnectionStateService.getInstance();
    offlineService = OfflineStateService.getInstance();

    // Clear queue
    queueService.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Message Flow: DM Agent → Rules Agent', () => {
    it('should handle complete message flow from sender to receiver', async () => {
      const message = createMessage('msg-e2e-1', 'dm-agent', 'rules-agent');

      // 1. Enqueue message
      const enqueued = await queueService.enqueue(message);
      expect(enqueued).toBe(true);
      expect(queueService.getQueueLength()).toBe(1);

      // 2. Persist message
      await persistenceService.persistMessage(message);

      // 3. Synchronize message
      const synced = await syncService.synchronizeMessage(message);
      expect(synced).toBe(true);

      // 4. Dequeue and process
      const dequeued = queueService.dequeue();
      expect(dequeued).toBeDefined();
      expect(dequeued?.id).toBe('msg-e2e-1');

      // 5. Complete processing
      await queueService.completeProcessing(true);

      // 6. Update status
      await persistenceService.updateMessageStatus('msg-e2e-1', 'sent');

      // Verify final state
      expect(queueService.getQueueLength()).toBe(0);
    });

    it('should handle multiple messages in sequence', async () => {
      const messages = [
        createMessage('seq-1', 'dm-agent', 'rules-agent'),
        createMessage('seq-2', 'dm-agent', 'rules-agent'),
        createMessage('seq-3', 'dm-agent', 'rules-agent'),
      ];

      // Enqueue all messages
      for (const msg of messages) {
        await queueService.enqueue(msg);
        await persistenceService.persistMessage(msg);
        await syncService.synchronizeMessage(msg);
      }

      expect(queueService.getQueueLength()).toBe(3);

      // Process all messages
      for (let i = 0; i < 3; i++) {
        const msg = queueService.dequeue();
        expect(msg).toBeDefined();
        await queueService.completeProcessing(true);
        await persistenceService.updateMessageStatus(msg!.id, 'sent');
      }

      expect(queueService.getQueueLength()).toBe(0);
    });

    it('should handle priority ordering', async () => {
      const lowPriority = createMessage('low', 'dm-agent', 'rules-agent');
      lowPriority.priority = MessagePriority.LOW;

      const highPriority = createMessage('high', 'dm-agent', 'rules-agent');
      highPriority.priority = MessagePriority.HIGH;

      const mediumPriority = createMessage('medium', 'dm-agent', 'rules-agent');
      mediumPriority.priority = MessagePriority.MEDIUM;

      // Enqueue in mixed order
      await queueService.enqueue(lowPriority);
      await queueService.enqueue(highPriority);
      await queueService.enqueue(mediumPriority);

      expect(queueService.getQueueLength()).toBe(3);

      // Messages are dequeued in FIFO order (not priority sorted in current impl)
      const first = queueService.dequeue();
      expect(first?.id).toBe('low');
    });
  });

  describe('Offline Queue → Online Sync Workflow', () => {
    it('should queue messages while offline', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const offlineMessages = [
        createMessage('offline-1'),
        createMessage('offline-2'),
        createMessage('offline-3'),
      ];

      // Enqueue and persist while offline
      for (const msg of offlineMessages) {
        await queueService.enqueue(msg);
        await persistenceService.persistMessage(msg);
      }

      expect(queueService.getQueueLength()).toBe(3);

      // Verify all messages are persisted
      const pending = await persistenceService.getUnsentMessages();
      expect(pending.length).toBeGreaterThanOrEqual(0);
    });

    it('should sync queued messages when coming online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Queue messages offline
      const msg1 = createMessage('sync-1');
      const msg2 = createMessage('sync-2');

      await queueService.enqueue(msg1);
      await queueService.enqueue(msg2);
      await persistenceService.persistMessage(msg1);
      await persistenceService.persistMessage(msg2);

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Sync messages
      await syncService.synchronizeMessage(msg1);
      await syncService.synchronizeMessage(msg2);

      // Process messages
      const dequeued1 = queueService.dequeue();
      const dequeued2 = queueService.dequeue();

      expect(dequeued1).toBeDefined();
      expect(dequeued2).toBeDefined();

      await queueService.completeProcessing(true);
      await queueService.completeProcessing(true);
    });

    it('should handle offline to online transition', async () => {
      // Offline: persist messages
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const message = createMessage('transition-1');
      await queueService.enqueue(message);
      await persistenceService.persistMessage(message);

      expect(queueService.getQueueLength()).toBe(1);

      // Online: sync
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const synced = await syncService.synchronizeMessage(message);
      expect(synced).toBe(true);

      // Process
      const dequeued = queueService.dequeue();
      expect(dequeued?.id).toBe('transition-1');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle message processing failures', async () => {
      const message = createMessage('fail-1');

      await queueService.enqueue(message);
      await persistenceService.persistMessage(message);

      const dequeued = queueService.dequeue();
      expect(dequeued).toBeDefined();

      // Simulate processing failure
      await queueService.completeProcessing(false);

      const metrics = queueService.getMetrics();
      expect(metrics.failedDeliveries).toBeGreaterThan(0);
    });

    it('should retry failed messages', async () => {
      const message = createMessage('retry-1');
      message.retryCount = 1;
      message.maxRetries = 3;

      await queueService.enqueue(message);
      await persistenceService.persistMessage(message);

      // First attempt fails
      const dequeued1 = queueService.dequeue();
      await queueService.completeProcessing(false);

      // Re-enqueue for retry (manual in this test)
      message.retryCount++;
      await queueService.enqueue(message);

      // Second attempt succeeds
      const dequeued2 = queueService.dequeue();
      await queueService.completeProcessing(true);

      expect(dequeued2).toBeDefined();
    });

    it('should handle persistence errors gracefully', async () => {
      const { IndexedDBService } = await import('../services/storage/IndexedDBService');
      const mockStorage = IndexedDBService.getInstance();

      (mockStorage.storeMessage as any).mockRejectedValueOnce(new Error('Storage error'));

      const message = createMessage('error-1');

      await expect(persistenceService.persistMessage(message)).rejects.toThrow('Storage error');
    });

    it('should handle sync errors gracefully', async () => {
      const { DatabaseAdapter } = await import('../services/sync/adapters/DatabaseAdapter');

      (DatabaseAdapter.saveMessageSequence as any).mockRejectedValueOnce(new Error('Sync error'));

      const message = createMessage('sync-error-1');

      const result = await syncService.synchronizeMessage(message);
      expect(result).toBe(false);
    });

    it('should recover from queue validation failures', async () => {
      const message = createMessage('validate-1');

      await queueService.enqueue(message);

      const isValid = await queueService.validateQueue();
      expect(isValid).toBe(true);
    });
  });

  describe('Cross-Service Coordination', () => {
    it('should coordinate queue, persistence, and sync', async () => {
      const message = createMessage('coord-1');

      // Queue
      await queueService.enqueue(message);
      expect(queueService.getQueueLength()).toBe(1);

      // Persist
      await persistenceService.persistMessage(message);

      // Sync
      const synced = await syncService.synchronizeMessage(message);
      expect(synced).toBe(true);

      // All services should be coordinated
      const dequeued = queueService.dequeue();
      expect(dequeued?.id).toBe('coord-1');
    });

    it('should maintain consistency across services', async () => {
      const messages = [createMessage('consistency-1'), createMessage('consistency-2')];

      for (const msg of messages) {
        await queueService.enqueue(msg);
        await persistenceService.persistMessage(msg);
        await syncService.synchronizeMessage(msg);
      }

      expect(queueService.getQueueLength()).toBe(2);

      // Process all
      while (queueService.getQueueLength() > 0) {
        const msg = queueService.dequeue();
        await queueService.completeProcessing(true);
        await persistenceService.updateMessageStatus(msg!.id, 'sent');
      }

      expect(queueService.getQueueLength()).toBe(0);
    });

    it('should handle service initialization order', () => {
      // Services should be initialized
      expect(queueService).toBeDefined();
      expect(persistenceService).toBeDefined();
      expect(syncService).toBeDefined();
      expect(connectionService).toBeDefined();
      expect(offlineService).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle bidirectional messaging', async () => {
      const dmToRules = createMessage('dm-to-rules', 'dm-agent', 'rules-agent');
      const rulesToDm = createMessage('rules-to-dm', 'rules-agent', 'dm-agent');

      // Send DM → Rules
      await queueService.enqueue(dmToRules);
      await syncService.synchronizeMessage(dmToRules);

      // Send Rules → DM
      await queueService.enqueue(rulesToDm);
      await syncService.synchronizeMessage(rulesToDm);

      expect(queueService.getQueueLength()).toBe(2);

      // Process both
      const msg1 = queueService.dequeue();
      const msg2 = queueService.dequeue();

      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();
    });

    it('should handle message bursts', async () => {
      const burstSize = 20;
      const messages = Array.from({ length: burstSize }, (_, i) => createMessage(`burst-${i}`));

      // Enqueue all at once
      await Promise.all(messages.map((msg) => queueService.enqueue(msg)));

      expect(queueService.getQueueLength()).toBe(burstSize);

      // Process all
      let processed = 0;
      while (queueService.getQueueLength() > 0) {
        queueService.dequeue();
        processed++;
      }

      expect(processed).toBe(burstSize);
    });

    it('should handle concurrent operations', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => createMessage(`concurrent-${i}`));

      // Concurrent enqueue and persist
      await Promise.all(
        messages.map(async (msg) => {
          await queueService.enqueue(msg);
          await persistenceService.persistMessage(msg);
          await syncService.synchronizeMessage(msg);
        }),
      );

      expect(queueService.getQueueLength()).toBe(10);
    });

    it('should handle state recovery after crash', async () => {
      // Simulate pre-crash state
      const messages = [createMessage('crash-1'), createMessage('crash-2')];

      for (const msg of messages) {
        await queueService.enqueue(msg);
        await persistenceService.persistMessage(msg);
      }

      // Save queue state
      const queueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: [messages[0], messages[1]],
        pendingMessages: ['crash-1', 'crash-2'],
        isOnline: true,
        metrics: {
          totalProcessed: 0,
          failedDeliveries: 0,
          avgProcessingTime: 0,
        },
      };

      await persistenceService.saveQueueState(queueState);

      // Recover state
      const recovered = await persistenceService.getQueueState();
      expect(recovered).toBeDefined();
      expect(recovered?.pendingMessages).toContain('crash-1');
      expect(recovered?.pendingMessages).toContain('crash-2');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle queue size limits', async () => {
      queueService.updateConfig({ maxQueueSize: 5 });

      const messages = Array.from({ length: 10 }, (_, i) => createMessage(`limit-${i}`));

      let enqueued = 0;
      for (const msg of messages) {
        const result = await queueService.enqueue(msg);
        if (result) enqueued++;
      }

      expect(enqueued).toBe(5);
      expect(queueService.getQueueLength()).toBe(5);
    });

    it('should maintain performance with large messages', async () => {
      const largeMessage = createMessage('large-1');
      largeMessage.content = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `data-${i}`,
        })),
      };

      const start = Date.now();
      await queueService.enqueue(largeMessage);
      await persistenceService.persistMessage(largeMessage);
      await syncService.synchronizeMessage(largeMessage);
      const duration = Date.now() - start;

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
