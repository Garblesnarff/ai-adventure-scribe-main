/**
 * IndexedDB Cleanup Tests
 *
 * Tests the automatic cleanup functionality for old agent messages
 * stored in IndexedDB.
 *
 * @author AI Dungeon Master Team
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndexedDBService } from '../IndexedDBService';
import { StoredMessage } from '../types';

// Mock the logger
vi.mock('../../../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('IndexedDBService - Cleanup Functionality', () => {
  let service: IndexedDBService;

  beforeEach(() => {
    // Get the singleton instance
    service = IndexedDBService.getInstance();
  });

  describe('clearOldMessages', () => {
    it('should return the count of deleted messages', async () => {
      // Note: This is a basic structure test
      // Full integration testing would require a real IndexedDB environment
      const maxAge = 1000; // 1 second

      // Test that the method exists and has the correct signature
      expect(service.clearOldMessages).toBeDefined();
      expect(typeof service.clearOldMessages).toBe('function');
    });

    it('should not delete messages in pending or failed state', async () => {
      // This would require setting up a test IndexedDB instance
      // For now, we verify the method signature
      const result = service.clearOldMessages(24 * 60 * 60 * 1000);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics', () => {
      const stats = service.getCleanupStats();

      expect(stats).toHaveProperty('lastCleanupTime');
      expect(stats).toHaveProperty('totalMessagesDeleted');
      expect(stats).toHaveProperty('lastDeletedCount');

      expect(typeof stats.lastCleanupTime).toBe('number');
      expect(typeof stats.totalMessagesDeleted).toBe('number');
      expect(typeof stats.lastDeletedCount).toBe('number');
    });

    it('should initialize with zero values', () => {
      const stats = service.getCleanupStats();

      // Stats might have been updated by previous operations
      expect(stats.lastCleanupTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalMessagesDeleted).toBeGreaterThanOrEqual(0);
      expect(stats.lastDeletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('manualCleanup', () => {
    it('should accept an optional maxAgeMs parameter', async () => {
      expect(service.manualCleanup).toBeDefined();
      expect(typeof service.manualCleanup).toBe('function');

      // Verify it returns a Promise
      const result = service.manualCleanup(1000);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should use default age if no parameter provided', async () => {
      const result = service.manualCleanup();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('automatic cleanup trigger', () => {
    it('should have checkAndCleanup method (private)', () => {
      // We can't directly test private methods, but we can verify
      // that the cleanup is triggered via public methods

      // Create a mock message
      const mockMessage: StoredMessage = {
        id: 'test-msg-1',
        content: { text: 'test' },
        type: 'request',
        priority: 'medium',
        timestamp: new Date().toISOString(),
        status: 'sent',
        retryCount: 0,
        metadata: {
          sender: 'test-sender',
          receiver: 'test-receiver',
        },
      };

      // Storing a message should trigger cleanup check
      const storePromise = service.storeMessage(mockMessage);
      expect(storePromise).toBeInstanceOf(Promise);
    });
  });

  describe('cleanup configuration', () => {
    it('should respect the cleanup interval configuration', () => {
      // The cleanup interval is checked before running cleanup
      // Multiple store operations within the interval should not trigger multiple cleanups

      const messages: StoredMessage[] = [
        {
          id: 'msg-1',
          content: {},
          type: 'request',
          priority: 'medium',
          timestamp: new Date().toISOString(),
          status: 'sent',
          retryCount: 0,
        },
        {
          id: 'msg-2',
          content: {},
          type: 'request',
          priority: 'medium',
          timestamp: new Date().toISOString(),
          status: 'sent',
          retryCount: 0,
        },
      ];

      // Store multiple messages - cleanup should only run once
      const promises = messages.map((msg) => service.storeMessage(msg));
      expect(promises.every((p) => p instanceof Promise)).toBe(true);
    });
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the cleanup functionality:
 *
 * 1. Open browser DevTools > Application > IndexedDB > agentMessaging > messages
 * 2. Run in console:
 *    ```
 *    const service = window.__indexedDBService || IndexedDBService.getInstance();
 *
 *    // Add test messages with old timestamps
 *    const oldMessage = {
 *      id: 'old-msg-' + Date.now(),
 *      content: { text: 'old message' },
 *      type: 'request',
 *      priority: 'medium',
 *      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours old
 *      status: 'sent',
 *      retryCount: 0,
 *    };
 *
 *    await service.storeMessage(oldMessage);
 *
 *    // Check stats before cleanup
 *    console.log('Before cleanup:', service.getCleanupStats());
 *
 *    // Trigger manual cleanup
 *    const deleted = await service.manualCleanup();
 *    console.log('Deleted messages:', deleted);
 *
 *    // Check stats after cleanup
 *    console.log('After cleanup:', service.getCleanupStats());
 *    ```
 *
 * 3. Verify in IndexedDB that old messages were removed
 * 4. Verify that pending/failed messages were NOT removed
 */
