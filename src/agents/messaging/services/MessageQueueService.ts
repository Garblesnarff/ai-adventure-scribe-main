/**
 * Message Queue Service
 *
 * This file defines the MessageQueueService class, a singleton service
 * responsible for managing an in-memory queue of messages. It handles
 * enqueuing, dequeuing, peeking, and clearing messages, as well as
 * queue validation and configuration. It uses QueueStateManager for
 * persisting queue snapshots and metrics, and QueueValidator for integrity checks.
 *
 * Main Class:
 * - MessageQueueService: Manages the message queue.
 *
 * Key Dependencies:
 * - QueueStateManager (`./queue/queue-state-manager.ts`)
 * - QueueValidator (`./queue/queue-validator.ts`)
 * - Message types from '../types'.
 *
 * @author AI Dungeon Master Team
 */

// Project Utilities
import { QueueStateManager } from './queue/QueueStateManager';
import { QueueValidator } from './queue/QueueValidator';

// Project Types
import { QueuedMessage, MessageQueueConfig } from '../types';
import { logger } from '../../../lib/logger';

export class MessageQueueService {
  private static instance: MessageQueueService;
  private messageQueue: QueuedMessage[] = [];
  private config: MessageQueueConfig;
  private stateManager: QueueStateManager;
  private processingStartTime: number | null = null;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeoutDuration: 5000,
      maxQueueSize: 100,
    };
    this.stateManager = QueueStateManager.getInstance();
  }

  public static getInstance(): MessageQueueService {
    if (!MessageQueueService.instance) {
      MessageQueueService.instance = new MessageQueueService();
    }
    return MessageQueueService.instance;
  }

  public async enqueue(message: QueuedMessage): Promise<boolean> {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      logger.warn('[MessageQueueService] Queue size limit reached');
      return false;
    }

    if (!QueueValidator.validateMessage(message)) {
      logger.error('[MessageQueueService] Invalid message:', message);
      return false;
    }

    this.messageQueue.push(message);
    await this.stateManager.saveQueueSnapshot(this.messageQueue);
    return true;
  }

  public dequeue(): QueuedMessage | undefined {
    const message = this.messageQueue.shift();
    if (message) {
      this.processingStartTime = Date.now();
    }
    return message;
  }

  public async completeProcessing(success: boolean): Promise<void> {
    if (this.processingStartTime) {
      const processingTime = Date.now() - this.processingStartTime;
      this.stateManager.updateMetrics(processingTime, success);
      this.processingStartTime = null;
    }
    await this.stateManager.saveQueueSnapshot(this.messageQueue);
  }

  public peek(): QueuedMessage | undefined {
    return this.messageQueue[0];
  }

  public getQueueLength(): number {
    return this.messageQueue.length;
  }

  public getQueueIds(): string[] {
    return this.messageQueue.map((msg) => msg.id);
  }

  public async validateQueue(): Promise<boolean> {
    return (
      QueueValidator.validateQueueIntegrity(this.messageQueue) &&
      QueueValidator.validateQueueOrder(this.messageQueue) &&
      (await this.stateManager.validateQueueState(this.messageQueue))
    );
  }

  public clear(): void {
    this.messageQueue = [];
  }

  public getConfig(): MessageQueueConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<MessageQueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getMetrics() {
    return this.stateManager.getMetrics();
  }
}
