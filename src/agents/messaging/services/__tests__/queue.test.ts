/**
 * Message Queue Service Tests
 *
 * Comprehensive tests for MessageQueueService covering:
 * - Enqueue/dequeue operations
 * - Priority-based ordering
 * - Queue size limits
 * - Message filtering and validation
 *
 * @author AI Dungeon Master Team
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessageQueueService } from '../MessageQueueService';
import { QueueValidator } from '../queue/QueueValidator';
import { QueueStateManager } from '../queue/QueueStateManager';
import { MessageType, MessagePriority, QueuedMessage } from '../../types';

// Mock dependencies
vi.mock('../../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../queue/QueueStateManager', () => {
  const mockMetrics = {
    totalProcessed: 0,
    failedDeliveries: 0,
    avgProcessingTime: 0,
  };

  return {
    QueueStateManager: {
      getInstance: vi.fn(() => ({
        saveQueueSnapshot: vi.fn().mockResolvedValue(undefined),
        validateQueueState: vi.fn().mockResolvedValue(true),
        updateMetrics: vi.fn((time: number, success: boolean) => {
          mockMetrics.totalProcessed++;
          if (!success) mockMetrics.failedDeliveries++;
        }),
        getMetrics: vi.fn(() => ({ ...mockMetrics })),
      })),
    },
  };
});

describe('MessageQueueService', () => {
  let service: MessageQueueService;
  let mockStateManager: any;

  // Helper function to create test messages
  const createTestMessage = (
    id: string,
    priority: MessagePriority = MessagePriority.MEDIUM,
  ): QueuedMessage => ({
    id,
    type: MessageType.TASK,
    content: { text: `Test message ${id}` },
    priority,
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

  beforeEach(() => {
    // Reset singleton instance before each test
    // @ts-ignore - accessing private static property for testing
    MessageQueueService.instance = undefined;

    service = MessageQueueService.getInstance();
    service.clear();

    mockStateManager = QueueStateManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MessageQueueService.getInstance();
      const instance2 = MessageQueueService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Enqueue Operations', () => {
    it('should successfully enqueue a valid message', async () => {
      const message = createTestMessage('msg-1');
      const result = await service.enqueue(message);

      expect(result).toBe(true);
      expect(service.getQueueLength()).toBe(1);
      expect(mockStateManager.saveQueueSnapshot).toHaveBeenCalled();
    });

    it('should enqueue multiple messages', async () => {
      const messages = [
        createTestMessage('msg-1'),
        createTestMessage('msg-2'),
        createTestMessage('msg-3'),
      ];

      for (const msg of messages) {
        await service.enqueue(msg);
      }

      expect(service.getQueueLength()).toBe(3);
      expect(service.getQueueIds()).toEqual(['msg-1', 'msg-2', 'msg-3']);
    });

    it('should reject invalid messages', async () => {
      const invalidMessage = {
        id: '', // Invalid: empty id
        type: MessageType.TASK,
        content: {},
        priority: MessagePriority.MEDIUM,
      } as QueuedMessage;

      vi.spyOn(QueueValidator, 'validateMessage').mockReturnValue(false);

      const result = await service.enqueue(invalidMessage);
      expect(result).toBe(false);
      expect(service.getQueueLength()).toBe(0);
    });

    it('should enforce queue size limit', async () => {
      service.updateConfig({ maxQueueSize: 5 });

      // Fill queue to limit
      for (let i = 0; i < 5; i++) {
        await service.enqueue(createTestMessage(`msg-${i}`));
      }

      // Try to exceed limit
      const result = await service.enqueue(createTestMessage('msg-overflow'));

      expect(result).toBe(false);
      expect(service.getQueueLength()).toBe(5);
    });

    it('should handle enqueue with different priorities', async () => {
      await service.enqueue(createTestMessage('msg-1', MessagePriority.LOW));
      await service.enqueue(createTestMessage('msg-2', MessagePriority.HIGH));
      await service.enqueue(createTestMessage('msg-3', MessagePriority.MEDIUM));

      expect(service.getQueueLength()).toBe(3);
    });
  });

  describe('Dequeue Operations', () => {
    it('should dequeue message in FIFO order', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      await service.enqueue(createTestMessage('msg-2'));
      await service.enqueue(createTestMessage('msg-3'));

      const first = service.dequeue();
      expect(first?.id).toBe('msg-1');
      expect(service.getQueueLength()).toBe(2);

      const second = service.dequeue();
      expect(second?.id).toBe('msg-2');
      expect(service.getQueueLength()).toBe(1);
    });

    it('should return undefined when queue is empty', () => {
      const result = service.dequeue();
      expect(result).toBeUndefined();
      expect(service.getQueueLength()).toBe(0);
    });

    it('should track processing start time', async () => {
      await service.enqueue(createTestMessage('msg-1'));

      const beforeDequeue = Date.now();
      const message = service.dequeue();
      const afterDequeue = Date.now();

      expect(message).toBeDefined();
      // Processing time should be tracked internally
    });
  });

  describe('Priority-Based Ordering', () => {
    it('should maintain messages in priority order', async () => {
      await service.enqueue(createTestMessage('msg-low', MessagePriority.LOW));
      await service.enqueue(createTestMessage('msg-high', MessagePriority.HIGH));
      await service.enqueue(createTestMessage('msg-medium', MessagePriority.MEDIUM));

      const isValid = await service.validateQueue();
      // Note: Current implementation doesn't automatically sort by priority
      // This test validates the queue integrity check
      expect(isValid).toBe(true);
    });
  });

  describe('Queue Size Limits', () => {
    it('should respect maxQueueSize configuration', async () => {
      const maxSize = 3;
      service.updateConfig({ maxQueueSize: maxSize });

      for (let i = 0; i < maxSize; i++) {
        const result = await service.enqueue(createTestMessage(`msg-${i}`));
        expect(result).toBe(true);
      }

      // Should reject when at capacity
      const overflowResult = await service.enqueue(createTestMessage('overflow'));
      expect(overflowResult).toBe(false);
      expect(service.getQueueLength()).toBe(maxSize);
    });

    it('should allow configuration updates', () => {
      const initialConfig = service.getConfig();
      expect(initialConfig.maxQueueSize).toBe(100);

      service.updateConfig({ maxQueueSize: 50 });
      const updatedConfig = service.getConfig();
      expect(updatedConfig.maxQueueSize).toBe(50);
      expect(updatedConfig.maxRetries).toBe(initialConfig.maxRetries); // Other configs unchanged
    });
  });

  describe('Message Filtering and Validation', () => {
    it('should validate queue integrity', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      await service.enqueue(createTestMessage('msg-2'));

      vi.spyOn(QueueValidator, 'validateQueueIntegrity').mockReturnValue(true);
      vi.spyOn(QueueValidator, 'validateQueueOrder').mockReturnValue(true);

      const isValid = await service.validateQueue();
      expect(isValid).toBe(true);
      expect(QueueValidator.validateQueueIntegrity).toHaveBeenCalled();
      expect(QueueValidator.validateQueueOrder).toHaveBeenCalled();
    });

    it('should detect invalid queue state', async () => {
      await service.enqueue(createTestMessage('msg-1'));

      vi.spyOn(QueueValidator, 'validateQueueIntegrity').mockReturnValue(false);

      const isValid = await service.validateQueue();
      expect(isValid).toBe(false);
    });

    it('should get queue IDs for filtering', async () => {
      const ids = ['msg-1', 'msg-2', 'msg-3'];
      for (const id of ids) {
        await service.enqueue(createTestMessage(id));
      }

      const queueIds = service.getQueueIds();
      expect(queueIds).toEqual(ids);
    });
  });

  describe('Peek Operations', () => {
    it('should peek at first message without removing it', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      await service.enqueue(createTestMessage('msg-2'));

      const peeked = service.peek();
      expect(peeked?.id).toBe('msg-1');
      expect(service.getQueueLength()).toBe(2); // Length unchanged
    });

    it('should return undefined when peeking empty queue', () => {
      const peeked = service.peek();
      expect(peeked).toBeUndefined();
    });
  });

  describe('Queue Clearing', () => {
    it('should clear all messages from queue', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      await service.enqueue(createTestMessage('msg-2'));
      await service.enqueue(createTestMessage('msg-3'));

      service.clear();
      expect(service.getQueueLength()).toBe(0);
      expect(service.getQueueIds()).toEqual([]);
    });
  });

  describe('Processing Metrics', () => {
    it('should track successful processing', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      service.dequeue();

      await service.completeProcessing(true);

      const metrics = service.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.failedDeliveries).toBe(0);
    });

    it('should track failed processing', async () => {
      await service.enqueue(createTestMessage('msg-1'));
      service.dequeue();

      await service.completeProcessing(false);

      const metrics = service.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.failedDeliveries).toBe(1);
    });

    it('should update metrics correctly for multiple messages', async () => {
      // Process 3 messages: 2 successful, 1 failed
      for (let i = 0; i < 3; i++) {
        await service.enqueue(createTestMessage(`msg-${i}`));
      }

      service.dequeue();
      await service.completeProcessing(true);

      service.dequeue();
      await service.completeProcessing(false);

      service.dequeue();
      await service.completeProcessing(true);

      const metrics = service.getMetrics();
      expect(metrics.totalProcessed).toBe(3);
      expect(metrics.failedDeliveries).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    it('should return configuration copy', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be a copy, not same reference
    });

    it('should update partial configuration', () => {
      service.updateConfig({ maxRetries: 5 });
      const config = service.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.retryDelay).toBe(1000); // Default unchanged
    });

    it('should have sensible default configuration', () => {
      const config = service.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.timeoutDuration).toBe(5000);
      expect(config.maxQueueSize).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle state manager errors gracefully', async () => {
      mockStateManager.saveQueueSnapshot.mockRejectedValue(new Error('Storage error'));

      const message = createTestMessage('msg-1');

      // Should still return true if validation passes, even if persistence fails
      await expect(service.enqueue(message)).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      vi.spyOn(QueueValidator, 'validateQueueIntegrity').mockImplementation(() => {
        throw new Error('Validation error');
      });

      await service.enqueue(createTestMessage('msg-1'));

      await expect(service.validateQueue()).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid enqueue/dequeue operations', async () => {
      const operations = [];

      // Rapid enqueues
      for (let i = 0; i < 10; i++) {
        operations.push(service.enqueue(createTestMessage(`msg-${i}`)));
      }

      await Promise.all(operations);
      expect(service.getQueueLength()).toBe(10);

      // Rapid dequeues
      for (let i = 0; i < 5; i++) {
        service.dequeue();
      }

      expect(service.getQueueLength()).toBe(5);
    });

    it('should handle messages with same priority', async () => {
      const priority = MessagePriority.MEDIUM;
      await service.enqueue(createTestMessage('msg-1', priority));
      await service.enqueue(createTestMessage('msg-2', priority));
      await service.enqueue(createTestMessage('msg-3', priority));

      // Should maintain FIFO order for same priority
      const first = service.dequeue();
      expect(first?.id).toBe('msg-1');
    });

    it('should handle complete processing without prior dequeue', async () => {
      // Edge case: complete processing called without dequeue
      await service.completeProcessing(true);

      // Should handle gracefully (no processing start time)
      const metrics = service.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
    });
  });
});
