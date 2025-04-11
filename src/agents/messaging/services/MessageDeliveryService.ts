import { supabase } from '@/integrations/supabase/client';
import { QueuedMessage } from '../types';
import { MessageAcknowledgmentService } from './MessageAcknowledgmentService';
import { ErrorHandlingService } from '../../error/services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from '../../error/types';
import { CircuitBreakerService } from '../../error/services/CircuitBreakerService';

export class MessageDeliveryService {
  private static instance: MessageDeliveryService;
  private acknowledgmentService: MessageAcknowledgmentService;
  private errorHandler: ErrorHandlingService;
  private circuitBreaker: CircuitBreakerService;

  private constructor() {
    this.acknowledgmentService = MessageAcknowledgmentService.getInstance();
    this.errorHandler = ErrorHandlingService.getInstance();
    this.circuitBreaker = CircuitBreakerService.getInstance();
  }

  public static getInstance(): MessageDeliveryService {
    if (!MessageDeliveryService.instance) {
      MessageDeliveryService.instance = new MessageDeliveryService();
    }
    return MessageDeliveryService.instance;
  }

  public async deliverMessage(message: QueuedMessage): Promise<boolean> {
    const context = `MessageDelivery.${message.id}`;

    if (this.circuitBreaker.isOpen(context)) {
      console.warn(`[MessageDeliveryService] Circuit breaker open for ${context}`);
      return false;
    }

    try {
      const { error } = await this.errorHandler.handleDatabaseOperation(
        async () => supabase.from('agent_communications').insert({
          sender_id: message.sender,
          receiver_id: message.receiver,
          message_type: message.type,
          content: message.content,
          created_at: new Date().toISOString()
        }),
        {
          category: ErrorCategory.DATABASE,
          context,
          severity: ErrorSeverity.HIGH,
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000
          }
        }
      );

      if (error) throw error;

      await this.acknowledgmentService.createAcknowledgment(message.id);
      
      message.deliveryStatus = {
        delivered: true,
        timestamp: new Date(),
        attempts: message.deliveryStatus.attempts + 1
      };

      this.circuitBreaker.recordSuccess(context);
      return true;
    } catch (error) {
      console.error('[MessageDeliveryService] Delivery error:', error);
      this.circuitBreaker.recordError(context);
      
      message.deliveryStatus = {
        delivered: false,
        timestamp: new Date(),
        attempts: message.deliveryStatus.attempts + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      return false;
    }
  }

  public async confirmDelivery(messageId: string): Promise<void> {
    await this.acknowledgmentService.updateAcknowledgment(messageId, 'received');
  }

  public async handleFailedDelivery(message: QueuedMessage): Promise<void> {
    try {
      const failureContent = {
        originalMessageId: message.id,
        originalType: message.type,
        error: 'Maximum retry attempts exceeded',
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('agent_communications')
        .insert({
          sender_id: message.sender,
          receiver_id: message.receiver,
          message_type: 'FAILED_DELIVERY',
          content: failureContent,
          created_at: new Date().toISOString()
        });

      await this.acknowledgmentService.updateAcknowledgment(
        message.id,
        'failed',
        'Maximum retry attempts exceeded'
      );
    } catch (error) {
      console.error('[MessageDeliveryService] Failed delivery handling error:', error);
    }
  }
}