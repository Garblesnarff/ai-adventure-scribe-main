/**
 * Message Processing Service
 * 
 * This file defines the MessageProcessingService class, a singleton service
 * responsible for processing individual messages from the message queue.
 * It coordinates message delivery, persistence updates, and retry logic.
 * 
 * Main Class:
 * - MessageProcessingService: Processes messages for delivery.
 * 
 * Key Dependencies:
 * - MessageQueueService (./message-queue-service.ts)
 * - MessageDeliveryService (./message-delivery-service.ts)
 * - MessagePersistenceService (./storage/message-persistence-service.ts)
 * - useToast hook (`@/hooks/use-toast`) - (Note: useToast usage in a class is unconventional)
 * - Various message types from '../types'.
 * 
 * @author AI Dungeon Master Team
 */

// Project Services (assuming kebab-case filenames)
import { MessageDeliveryService } from './message-delivery-service';
import { MessagePersistenceService } from './storage/message-persistence-service';
import { MessageQueueService } from './message-queue-service';

// Project Hooks
import { useToast } from '@/hooks/use-toast'; // Note: useToast usage in a class is unconventional.

// Project Types
import { MessagePriority, MessageType, QueuedMessage } from '@/types/messaging';


export class MessageProcessingService {
  private static instance: MessageProcessingService;
  private queueService: MessageQueueService;
  private deliveryService: MessageDeliveryService;
  private persistenceService: MessagePersistenceService;

  private constructor() {
    this.queueService = MessageQueueService.getInstance();
    this.deliveryService = MessageDeliveryService.getInstance();
    this.persistenceService = MessagePersistenceService.getInstance();
  }

  public static getInstance(): MessageProcessingService {
    if (!MessageProcessingService.instance) {
      MessageProcessingService.instance = new MessageProcessingService();
    }
    return MessageProcessingService.instance;
  }

  public async processMessage(message: QueuedMessage): Promise<boolean> {
    try {
      const delivered = await this.deliveryService.deliverMessage(message);
      
      if (delivered) {
        await this.persistenceService.updateMessageStatus(message.id, 'sent');
        await this.deliveryService.confirmDelivery(message.id);
        return true;
      } else if (message.retryCount >= message.maxRetries) {
        await this.deliveryService.handleFailedDelivery(message);
        await this.persistenceService.updateMessageStatus(message.id, 'failed');
        return false;
      } else {
        message.retryCount++;
        this.queueService.enqueue(message);
        await this.persistenceService.updateMessageStatus(message.id, 'pending');
        return false;
      }
    } catch (error) {
      console.error('[MessageProcessingService] Error processing message:', error);
      return false;
    }
  }

  public async createMessage(
    sender: string,
    receiver: string,
    type: MessageType,
    content: any,
    priority: MessagePriority = MessagePriority.MEDIUM
  ): Promise<QueuedMessage> {
    return {
      id: crypto.randomUUID(),
      type,
      content,
      priority,
      sender,
      receiver,
      timestamp: new Date(),
      deliveryStatus: {
        delivered: false,
        timestamp: new Date(),
        attempts: 0
      },
      retryCount: 0,
      maxRetries: this.queueService.getConfig().maxRetries
    };
  }
}