/**
 * Message Delivery Service
 *
 * This file defines the MessageDeliveryService class, a singleton service
 * responsible for delivering messages within the agent messaging system.
 * It interacts with Supabase to persist communications and uses other services
 * like Acknowledgment, ErrorHandling, and CircuitBreaker to ensure reliable delivery.
 *
 * Main Class:
 * - MessageDeliveryService: Handles the delivery of queued messages.
 *
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - MessageAcknowledgmentService (./message-acknowledgment-service.ts)
 * - ErrorHandlingService (`../../error/services/error-handling-service.ts`)
 * - CircuitBreakerService (`../../error/services/circuit-breaker-service.ts`)
 * - Various message and error types.
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Services (assuming kebab-case filenames)
import { CircuitBreakerService } from '../../error/services/circuit-breaker-service';
import { ErrorHandlingService } from '../../error/services/error-handling-service';
import { MessageAcknowledgmentService } from './message-acknowledgment-service';
import { MessageDiagnosticsService } from './diagnostics/MessageDiagnosticsService';

// Project Types
import { ErrorCategory, ErrorSeverity } from '../../error/types';
import { QueuedMessage } from '../types';
import { logger } from '../../../lib/logger';

export class MessageDeliveryService {
  private static instance: MessageDeliveryService;
  private acknowledgmentService: MessageAcknowledgmentService;
  private errorHandler: ErrorHandlingService;
  private circuitBreaker: CircuitBreakerService;
  private diagnostics: MessageDiagnosticsService;

  private constructor() {
    this.acknowledgmentService = MessageAcknowledgmentService.getInstance();
    this.errorHandler = ErrorHandlingService.getInstance();
    this.circuitBreaker = CircuitBreakerService.getInstance();
    this.diagnostics = MessageDiagnosticsService.getInstance();
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
      logger.warn(`[MessageDeliveryService] Circuit breaker open for ${context}`);
      return false;
    }

    try {
      const { error } = await this.errorHandler.handleDatabaseOperation(
        async () =>
          supabase.from('agent_communications').insert({
            sender_id: message.sender,
            receiver_id: message.receiver,
            message_type: message.type,
            content: message.content,
            created_at: new Date().toISOString(),
          }),
        {
          category: ErrorCategory.DATABASE,
          context,
          severity: ErrorSeverity.HIGH,
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
          },
        },
      );

      if (error) throw error;

      await this.acknowledgmentService.createAcknowledgment(message.id);

      message.deliveryStatus = {
        delivered: true,
        timestamp: new Date(),
        attempts: message.deliveryStatus.attempts + 1,
      };

      this.circuitBreaker.recordSuccess(context);
      return true;
    } catch (error) {
      logger.error('[MessageDeliveryService] Delivery error:', error);
      this.circuitBreaker.recordError(context);
      this.diagnostics.recordFailure(error instanceof Error ? error.message : 'Delivery error');

      message.deliveryStatus = {
        delivered: false,
        timestamp: new Date(),
        attempts: message.deliveryStatus.attempts + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
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
        timestamp: new Date().toISOString(),
      };

      await supabase.from('agent_communications').insert({
        sender_id: message.sender,
        receiver_id: message.receiver,
        message_type: 'FAILED_DELIVERY',
        content: failureContent,
        created_at: new Date().toISOString(),
      });

      await this.acknowledgmentService.updateAcknowledgment(
        message.id,
        'failed',
        'Maximum retry attempts exceeded',
      );

      this.diagnostics.recordDeadLetter(message);
    } catch (error) {
      logger.error('[MessageDeliveryService] Failed delivery handling error:', error);
    }
  }
}
