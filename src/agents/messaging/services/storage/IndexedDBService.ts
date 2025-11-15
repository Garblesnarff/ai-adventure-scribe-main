/**
 * IndexedDB Service
 *
 * This file defines the IndexedDBService class, a singleton service that provides
 * an interface for interacting with the browser's IndexedDB. It is used for
 * persistent client-side storage of messages, queue state, and offline state,
 * supporting the offline capabilities of the messaging system.
 *
 * Main Class:
 * - IndexedDBService: Manages IndexedDB operations (init, store, get, update, clear).
 *
 * Key Dependencies:
 * - DatabaseInitializer (`./core/database-initializer.ts`)
 * - DEFAULT_STORAGE_CONFIG (`./config/storage-config.ts`)
 * - Various storage types from `./types.ts`.
 *
 * @author AI Dungeon Master Team
 */

// Project Utilities & Config
import { DEFAULT_STORAGE_CONFIG } from './config/StorageConfig';
import { DatabaseInitializer } from './core/DatabaseInitializer';

// Project Types
import { OfflineState, QueueState, StoredMessage } from './types';
import { logger } from '../../../../lib/logger';

export class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBDatabase | null = null;
  private lastCleanupTime: number = 0;
  private cleanupStats = {
    lastCleanupTime: 0,
    totalMessagesDeleted: 0,
    lastDeletedCount: 0,
  };

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await DatabaseInitializer.initDatabase();
    } catch (error) {
      logger.error('[IndexedDB] Initialization error:', error);
      throw error;
    }
  }

  public async storeMessage(message: StoredMessage): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.messageStoreName],
        'readwrite',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const request = store.put(message);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        logger.info('[IndexedDB] Message stored successfully:', message.id);
        resolve();
      };
    }).then(async () => {
      // Check if cleanup is needed after storing a message
      await this.checkAndCleanup();
    });
  }

  public async getMessage(id: string): Promise<StoredMessage | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.messageStoreName],
        'readonly',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  public async updateMessageStatus(id: string, status: StoredMessage['status']): Promise<void> {
    const message = await this.getMessage(id);
    if (!message) {
      throw new Error(`Message ${id} not found`);
    }

    return this.storeMessage({ ...message, status });
  }

  public async getPendingMessages(): Promise<StoredMessage[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.messageStoreName],
        'readonly',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  public async saveQueueState(state: QueueState): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.queueStoreName],
        'readwrite',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.queueStoreName);
      const request = store.put({ id: 'current', ...state });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        logger.info('[IndexedDB] Queue state saved successfully');
        resolve();
      };
    });
  }

  public async getQueueState(): Promise<QueueState | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEFAULT_STORAGE_CONFIG.queueStoreName], 'readonly');
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.queueStoreName);
      const request = store.get('current');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  public async saveOfflineState(state: OfflineState): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.offlineStoreName],
        'readwrite',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.offlineStoreName);
      const request = store.put({ id: 'current', ...state });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        logger.info('[IndexedDB] Offline state saved successfully');
        resolve();
      };
    });
  }

  public async getOfflineState(): Promise<OfflineState | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.offlineStoreName],
        'readonly',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.offlineStoreName);
      const request = store.get('current');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const state = request.result;
        resolve(state ? state : null);
      };
    });
  }

  public async clearOldMessages(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffTime = new Date(Date.now() - maxAgeMs).toISOString();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [DEFAULT_STORAGE_CONFIG.messageStoreName],
        'readwrite',
      );
      const store = transaction.objectStore(DEFAULT_STORAGE_CONFIG.messageStoreName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          // Skip messages that are pending or in retry state
          const message = cursor.value as StoredMessage;
          if (message.status !== 'pending' && message.status !== 'failed') {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          // Update cleanup stats
          this.cleanupStats.lastCleanupTime = Date.now();
          this.cleanupStats.lastDeletedCount = deletedCount;
          this.cleanupStats.totalMessagesDeleted += deletedCount;

          logger.info(`[IndexedDB] Cleanup complete: removed ${deletedCount} old messages`);
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * Check if cleanup is needed and run it if necessary
   * Uses requestIdleCallback to avoid blocking the main thread
   */
  private async checkAndCleanup(): Promise<void> {
    const config = DEFAULT_STORAGE_CONFIG.cleanup;
    if (!config) return;

    const now = Date.now();
    const timeSinceLastCleanup = now - this.lastCleanupTime;

    // Only run cleanup if enough time has passed
    if (timeSinceLastCleanup < config.checkIntervalMs) {
      return;
    }

    // Update last cleanup time immediately to prevent concurrent cleanups
    this.lastCleanupTime = now;

    // Use requestIdleCallback if available to avoid blocking UI
    const runCleanup = async () => {
      try {
        const deletedCount = await this.clearOldMessages(config.maxMessageAgeMs);
        if (deletedCount > 0) {
          logger.info(
            `[IndexedDB] Auto-cleanup: removed ${deletedCount} messages older than ${config.maxMessageAgeMs}ms`,
          );
        }
      } catch (error) {
        logger.error('[IndexedDB] Auto-cleanup error:', error);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        runCleanup().catch((err) => logger.error('[IndexedDB] Idle cleanup error:', err));
      });
    } else {
      // Fallback to setTimeout with a small delay
      setTimeout(() => {
        runCleanup().catch((err) => logger.error('[IndexedDB] Delayed cleanup error:', err));
      }, 100);
    }
  }

  /**
   * Get cleanup statistics
   */
  public getCleanupStats(): {
    lastCleanupTime: number;
    totalMessagesDeleted: number;
    lastDeletedCount: number;
  } {
    return { ...this.cleanupStats };
  }

  /**
   * Manually trigger cleanup (useful for settings/debug UI)
   */
  public async manualCleanup(maxAgeMs?: number): Promise<number> {
    const config = DEFAULT_STORAGE_CONFIG.cleanup;
    const ageMs = maxAgeMs ?? config?.maxMessageAgeMs ?? 24 * 60 * 60 * 1000;

    try {
      const deletedCount = await this.clearOldMessages(ageMs);
      logger.info(`[IndexedDB] Manual cleanup: removed ${deletedCount} messages`);
      return deletedCount;
    } catch (error) {
      logger.error('[IndexedDB] Manual cleanup error:', error);
      throw error;
    }
  }
}
