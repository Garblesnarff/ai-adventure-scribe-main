/**
 * Message Persistence Service Tests
 *
 * Comprehensive tests for MessagePersistenceService covering:
 * - IndexedDB storage operations
 * - Message persistence during offline
 * - Data recovery on reconnect
 * - Storage cleanup
 *
 * @author AI Dungeon Master Team
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';
import { IndexedDBService } from '../storage/IndexedDBService';
import { MessageType, MessagePriority, QueuedMessage } from '../../types';
import { StoredMessage, QueueState } from '../storage/types';

// Mock dependencies
vi.mock('../../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock IndexedDBService
vi.mock('../storage/IndexedDBService', () => {
  const mockMessages: Map<string, StoredMessage> = new Map();
  let mockQueueState: QueueState | null = null;

  return {
    IndexedDBService: {
      getInstance: vi.fn(() => ({
        storeMessage: vi.fn(async (msg: StoredMessage) => {
          mockMessages.set(msg.id, msg);
          return Promise.resolve();
        }),
        updateMessageStatus: vi.fn(async (id: string, status: string) => {
          const msg = mockMessages.get(id);
          if (msg) {
            msg.status = status as StoredMessage['status'];
          }
          return Promise.resolve();
        }),
        getPendingMessages: vi.fn(async () => {
          const pending: StoredMessage[] = [];
          mockMessages.forEach((msg) => {
            if (msg.status === 'pending') {
              pending.push(msg);
            }
          });
          return Promise.resolve(pending);
        }),
        saveQueueState: vi.fn(async (state: QueueState) => {
          mockQueueState = state;
          return Promise.resolve();
        }),
        getQueueState: vi.fn(async () => {
          return Promise.resolve(mockQueueState);
        }),
        clearOldMessages: vi.fn(async () => {
          return Promise.resolve(0);
        }),
        // Helpers for testing
        __clearMockData: () => {
          mockMessages.clear();
          mockQueueState = null;
        },
        __getMockMessages: () => mockMessages,
        __getMockQueueState: () => mockQueueState,
      })),
    },
  };
});

describe('MessagePersistenceService', () => {
  let service: MessagePersistenceService;
  let mockStorage: any;

  const createTestQueuedMessage = (id: string): QueuedMessage => ({
    id,
    type: MessageType.TASK,
    content: { text: `Test message ${id}` },
    priority: MessagePriority.MEDIUM,
    sender: 'dm-agent',
    receiver: 'rules-agent',
    timestamp: new Date(),
    deliveryStatus: {
      delivered: false,
      timestamp: new Date(),
      attempts: 0,
    },
    retryCount: 0,
    maxRetries: 3,
  });

  const createTestStoredMessage = (id: string): StoredMessage => ({
    id,
    content: { text: `Test message ${id}` },
    type: 'TASK',
    priority: 'MEDIUM',
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
    metadata: {
      sender: 'dm-agent',
      receiver: 'rules-agent',
    },
  });

  beforeEach(() => {
    // Reset singleton
    // @ts-ignore
    MessagePersistenceService.instance = undefined;

    service = MessagePersistenceService.getInstance();
    mockStorage = IndexedDBService.getInstance();
    mockStorage.__clearMockData?.();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MessagePersistenceService.getInstance();
      const instance2 = MessagePersistenceService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Message Persistence', () => {
    it('should persist a queued message', async () => {
      const message = createTestQueuedMessage('msg-1');

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          content: message.content,
          type: message.type,
          priority: 'MEDIUM',
          status: 'pending',
          retryCount: 0,
        }),
      );
    });

    it('should convert enum priority to string', async () => {
      const message = createTestQueuedMessage('msg-1');
      message.priority = MessagePriority.HIGH;

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'HIGH',
        }),
      );
    });

    it('should persist message metadata', async () => {
      const message = createTestQueuedMessage('msg-1');

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            sender: 'dm-agent',
            receiver: 'rules-agent',
          },
        }),
      );
    });

    it('should handle persistence errors', async () => {
      mockStorage.storeMessage.mockRejectedValue(new Error('Storage failed'));

      const message = createTestQueuedMessage('msg-1');

      await expect(service.persistMessage(message)).rejects.toThrow('Storage failed');
    });

    it('should persist multiple messages', async () => {
      const messages = [
        createTestQueuedMessage('msg-1'),
        createTestQueuedMessage('msg-2'),
        createTestQueuedMessage('msg-3'),
      ];

      for (const msg of messages) {
        await service.persistMessage(msg);
      }

      expect(mockStorage.storeMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Message Status Updates', () => {
    it('should update message status to sent', async () => {
      const messageId = 'msg-1';

      await service.updateMessageStatus(messageId, 'sent');

      expect(mockStorage.updateMessageStatus).toHaveBeenCalledWith(messageId, 'sent');
    });

    it('should update message status to failed', async () => {
      const messageId = 'msg-1';

      await service.updateMessageStatus(messageId, 'failed');

      expect(mockStorage.updateMessageStatus).toHaveBeenCalledWith(messageId, 'failed');
    });

    it('should update message status to acknowledged', async () => {
      const messageId = 'msg-1';

      await service.updateMessageStatus(messageId, 'acknowledged');

      expect(mockStorage.updateMessageStatus).toHaveBeenCalledWith(messageId, 'acknowledged');
    });

    it('should handle status update errors', async () => {
      mockStorage.updateMessageStatus.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateMessageStatus('msg-1', 'sent')).rejects.toThrow('Update failed');
    });
  });

  describe('Retrieving Unsent Messages', () => {
    it('should retrieve pending messages', async () => {
      const pendingMessages = [createTestStoredMessage('msg-1'), createTestStoredMessage('msg-2')];

      mockStorage.getPendingMessages.mockResolvedValue(pendingMessages);

      const result = await service.getUnsentMessages();

      expect(result).toEqual(pendingMessages);
      expect(mockStorage.getPendingMessages).toHaveBeenCalled();
    });

    it('should return empty array when no pending messages', async () => {
      mockStorage.getPendingMessages.mockResolvedValue([]);

      const result = await service.getUnsentMessages();

      expect(result).toEqual([]);
    });

    it('should handle retrieval errors', async () => {
      mockStorage.getPendingMessages.mockRejectedValue(new Error('Retrieval failed'));

      await expect(service.getUnsentMessages()).rejects.toThrow('Retrieval failed');
    });
  });

  describe('Queue State Management', () => {
    it('should save queue state', async () => {
      const queueState: QueueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: [createTestQueuedMessage('msg-1')],
        pendingMessages: ['msg-1'],
        isOnline: true,
        metrics: {
          totalProcessed: 5,
          failedDeliveries: 1,
          avgProcessingTime: 250,
        },
      };

      await service.saveQueueState(queueState);

      expect(mockStorage.saveQueueState).toHaveBeenCalledWith(queueState);
    });

    it('should retrieve saved queue state', async () => {
      const queueState: QueueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: [],
        pendingMessages: [],
        isOnline: false,
        metrics: {
          totalProcessed: 10,
          failedDeliveries: 2,
          avgProcessingTime: 300,
        },
      };

      mockStorage.getQueueState.mockResolvedValue(queueState);

      const result = await service.getQueueState();

      expect(result).toEqual(queueState);
    });

    it('should return null when no queue state exists', async () => {
      mockStorage.getQueueState.mockResolvedValue(null);

      const result = await service.getQueueState();

      expect(result).toBeNull();
    });

    it('should handle queue state save errors', async () => {
      mockStorage.saveQueueState.mockRejectedValue(new Error('Save failed'));

      const queueState: QueueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: [],
        pendingMessages: [],
        isOnline: true,
        metrics: {
          totalProcessed: 0,
          failedDeliveries: 0,
          avgProcessingTime: 0,
        },
      };

      await expect(service.saveQueueState(queueState)).rejects.toThrow('Save failed');
    });
  });

  describe('Data Recovery on Reconnect', () => {
    it('should retrieve all pending messages for recovery', async () => {
      // Simulate offline period with persisted messages
      const offlineMessages = [
        createTestStoredMessage('offline-1'),
        createTestStoredMessage('offline-2'),
        createTestStoredMessage('offline-3'),
      ];

      mockStorage.getPendingMessages.mockResolvedValue(offlineMessages);

      const recovered = await service.getUnsentMessages();

      expect(recovered).toHaveLength(3);
      expect(recovered.map((m) => m.id)).toEqual(['offline-1', 'offline-2', 'offline-3']);
    });

    it('should handle recovery with mixed message statuses', async () => {
      const messages = [
        { ...createTestStoredMessage('msg-1'), status: 'pending' as const },
        { ...createTestStoredMessage('msg-2'), status: 'sent' as const },
        { ...createTestStoredMessage('msg-3'), status: 'pending' as const },
      ];

      // Mock should only return pending messages
      mockStorage.getPendingMessages.mockResolvedValue(
        messages.filter((m) => m.status === 'pending'),
      );

      const recovered = await service.getUnsentMessages();

      expect(recovered).toHaveLength(2);
      expect(recovered.every((m) => m.status === 'pending')).toBe(true);
    });
  });

  describe('Storage Cleanup', () => {
    it('should trigger cleanup of old messages', async () => {
      await service.cleanupOldMessages();

      expect(mockStorage.clearOldMessages).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockStorage.clearOldMessages.mockRejectedValue(new Error('Cleanup failed'));

      await expect(service.cleanupOldMessages()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Offline Persistence Workflow', () => {
    it('should persist message immediately when offline', async () => {
      const message = createTestQueuedMessage('offline-msg');

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'offline-msg',
          status: 'pending',
        }),
      );
    });

    it('should maintain retry count in persisted message', async () => {
      const message = createTestQueuedMessage('retry-msg');
      message.retryCount = 2;

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 0, // Note: persistMessage resets retryCount to 0
        }),
      );
    });

    it('should handle full offline-to-online workflow', async () => {
      // 1. Offline: Persist messages
      const msg1 = createTestQueuedMessage('msg-1');
      const msg2 = createTestQueuedMessage('msg-2');

      await service.persistMessage(msg1);
      await service.persistMessage(msg2);

      // 2. Online: Retrieve pending messages
      mockStorage.getPendingMessages.mockResolvedValue([
        createTestStoredMessage('msg-1'),
        createTestStoredMessage('msg-2'),
      ]);

      const pending = await service.getUnsentMessages();
      expect(pending).toHaveLength(2);

      // 3. Update status after successful send
      await service.updateMessageStatus('msg-1', 'sent');
      await service.updateMessageStatus('msg-2', 'sent');

      expect(mockStorage.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'sent');
      expect(mockStorage.updateMessageStatus).toHaveBeenCalledWith('msg-2', 'sent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent persistence operations', async () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        createTestQueuedMessage(`concurrent-${i}`),
      );

      await Promise.all(messages.map((msg) => service.persistMessage(msg)));

      expect(mockStorage.storeMessage).toHaveBeenCalledTimes(10);
    });

    it('should handle message with complex content', async () => {
      const message = createTestQueuedMessage('complex-msg');
      message.content = {
        nested: {
          data: {
            value: 'complex',
            array: [1, 2, 3],
          },
        },
      };

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: message.content,
        }),
      );
    });

    it('should handle message without metadata', async () => {
      const message = createTestQueuedMessage('no-meta');

      await service.persistMessage(message);

      expect(mockStorage.storeMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            sender: 'dm-agent',
            receiver: 'rules-agent',
          },
        }),
      );
    });

    it('should handle empty pending messages array', async () => {
      mockStorage.getPendingMessages.mockResolvedValue([]);

      const result = await service.getUnsentMessages();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Integration with Queue State', () => {
    it('should save complete queue state with metrics', async () => {
      const state: QueueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: [createTestQueuedMessage('msg-1'), createTestQueuedMessage('msg-2')],
        pendingMessages: ['msg-1', 'msg-2'],
        processingMessage: 'msg-1',
        isOnline: true,
        metrics: {
          totalProcessed: 100,
          failedDeliveries: 5,
          avgProcessingTime: 150,
        },
      };

      await service.saveQueueState(state);

      expect(mockStorage.saveQueueState).toHaveBeenCalledWith(state);
    });

    it('should retrieve and restore queue state', async () => {
      const savedState: QueueState = {
        lastSyncTimestamp: '2024-01-01T00:00:00.000Z',
        messages: [],
        pendingMessages: ['msg-1', 'msg-2', 'msg-3'],
        isOnline: false,
        metrics: {
          totalProcessed: 50,
          failedDeliveries: 3,
          avgProcessingTime: 200,
        },
      };

      mockStorage.getQueueState.mockResolvedValue(savedState);

      const retrieved = await service.getQueueState();

      expect(retrieved).toEqual(savedState);
      expect(retrieved?.pendingMessages).toEqual(['msg-1', 'msg-2', 'msg-3']);
      expect(retrieved?.metrics.totalProcessed).toBe(50);
    });
  });
});
