import { QueuedMessage, MessageType, MessagePriority } from '../types';
import { MessageQueueService } from './MessageQueueService';
import { MessageDeliveryService } from './MessageDeliveryService';
import { MessagePersistenceService } from './storage/MessagePersistenceService';
import { useToast } from '@/hooks/use-toast';

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