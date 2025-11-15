/**
 * Queue State Manager
 *
 * This file defines the QueueStateManager class, a singleton service responsible
 * for managing the state of the message queue. This includes saving snapshots
 * of the queue to persistent storage (IndexedDB), validating the queue state
 * against stored snapshots, and tracking metrics related to queue processing.
 *
 * Main Class:
 * - QueueStateManager: Manages and persists the state of the message queue.
 *
 * Key Dependencies:
 * - IndexedDBService (`../storage/indexed-db-service.ts`)
 * - Message and Queue state types.
 *
 * @author AI Dungeon Master Team
 */

// Project Services
import { IndexedDBService } from '../storage/IndexedDBService';

// Project Types
import { QueuedMessage } from '../../types';
import { QueueState } from '../storage/types';
import { logger } from '../../../../lib/logger';

export class QueueStateManager {
  private static instance: QueueStateManager;
  private storage: IndexedDBService;
  private queueMetrics: {
    totalProcessed: number;
    failedDeliveries: number;
    avgProcessingTime: number;
  };

  private constructor() {
    this.storage = IndexedDBService.getInstance();
    this.queueMetrics = {
      totalProcessed: 0,
      failedDeliveries: 0,
      avgProcessingTime: 0,
    };
  }

  public static getInstance(): QueueStateManager {
    if (!QueueStateManager.instance) {
      QueueStateManager.instance = new QueueStateManager();
    }
    return QueueStateManager.instance;
  }

  public async saveQueueSnapshot(messages: QueuedMessage[]): Promise<void> {
    try {
      const snapshot: QueueState = {
        lastSyncTimestamp: new Date().toISOString(),
        messages: messages,
        pendingMessages: messages.map((msg) => msg.id),
        processingMessage: undefined,
        isOnline: navigator.onLine,
        metrics: this.queueMetrics,
      };

      await this.storage.saveQueueState(snapshot);
      logger.info('[QueueStateManager] Queue snapshot saved:', snapshot.lastSyncTimestamp);
    } catch (error) {
      logger.error('[QueueStateManager] Failed to save queue snapshot:', error);
      throw error;
    }
  }

  public async validateQueueState(currentMessages: QueuedMessage[]): Promise<boolean> {
    try {
      const storedState = await this.storage.getQueueState();
      if (!storedState) return true;

      const currentIds = new Set(currentMessages.map((msg) => msg.id));
      const storedIds = new Set(storedState.messages.map((msg) => msg.id));

      const missingMessages = [...storedIds].filter((id) => !currentIds.has(id));
      if (missingMessages.length > 0) {
        logger.warn('[QueueStateManager] Found missing messages:', missingMessages);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[QueueStateManager] Queue validation error:', error);
      return false;
    }
  }

  public updateMetrics(processingTime: number, success: boolean): void {
    this.queueMetrics.totalProcessed++;
    if (!success) {
      this.queueMetrics.failedDeliveries++;
    }

    // Update average processing time
    const oldTotal = this.queueMetrics.avgProcessingTime * (this.queueMetrics.totalProcessed - 1);
    this.queueMetrics.avgProcessingTime =
      (oldTotal + processingTime) / this.queueMetrics.totalProcessed;
  }

  public getMetrics() {
    return { ...this.queueMetrics };
  }
}
