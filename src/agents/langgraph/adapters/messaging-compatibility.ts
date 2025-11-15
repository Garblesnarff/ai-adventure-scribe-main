/**
 * Messaging Compatibility Layer
 *
 * Provides backward compatibility between custom AgentMessagingService
 * and new LangGraph-based DMService during migration period.
 *
 * This allows components to gradually migrate without breaking changes.
 *
 * @module langgraph/adapters
 */

import { AgentMessagingService } from '../../messaging/agent-messaging-service';
import { DMService } from '../dm-service';
import { MessageType, MessagePriority } from '../../messaging/types';
import { logger } from '@/lib/logger';

/**
 * Migration strategy
 */
export type MigrationStrategy = 'legacy' | 'langgraph' | 'hybrid';

/**
 * Configuration for compatibility layer
 */
export interface CompatibilityConfig {
  strategy: MigrationStrategy;
  fallbackToLegacy?: boolean;
  enableLogging?: boolean;
}

/**
 * Unified messaging interface that works with both systems
 *
 * This class provides a consistent API that can use either the legacy
 * messaging system or the new LangGraph system, with automatic fallback.
 */
export class UnifiedMessagingService {
  private legacyService: AgentMessagingService;
  private langgraphService: DMService;
  private config: CompatibilityConfig;

  constructor(config: CompatibilityConfig = { strategy: 'langgraph' }) {
    this.legacyService = AgentMessagingService.getInstance();
    this.langgraphService = new DMService();
    this.config = {
      fallbackToLegacy: true,
      enableLogging: true,
      ...config,
    };
  }

  /**
   * Send a message using the configured strategy
   *
   * @param params - Message parameters
   */
  async sendMessage(params: {
    sessionId: string;
    message: string;
    context: any;
    onStream?: (chunk: string) => void;
  }): Promise<any> {
    const { sessionId, message, context, onStream } = params;

    if (this.config.enableLogging) {
      logger.info('[UnifiedMessaging] Sending message:', {
        strategy: this.config.strategy,
        sessionId,
      });
    }

    switch (this.config.strategy) {
      case 'langgraph':
        return this.sendViaLangGraph(params);

      case 'legacy':
        return this.sendViaLegacy(params);

      case 'hybrid':
        // Try LangGraph first, fallback to legacy on error
        try {
          return await this.sendViaLangGraph(params);
        } catch (error) {
          if (this.config.fallbackToLegacy) {
            logger.warn('[UnifiedMessaging] LangGraph failed, falling back to legacy:', error);
            return this.sendViaLegacy(params);
          }
          throw error;
        }

      default:
        throw new Error(`Unknown migration strategy: ${this.config.strategy}`);
    }
  }

  /**
   * Get conversation history using the configured strategy
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    switch (this.config.strategy) {
      case 'langgraph':
        return this.langgraphService.getConversationHistory(sessionId);

      case 'legacy':
        // Legacy system doesn't have direct conversation history
        // This would need to query the messages table directly
        return [];

      case 'hybrid':
        try {
          return await this.langgraphService.getConversationHistory(sessionId);
        } catch (error) {
          if (this.config.fallbackToLegacy) {
            logger.warn('[UnifiedMessaging] LangGraph history failed, returning empty array');
            return [];
          }
          throw error;
        }

      default:
        return [];
    }
  }

  /**
   * Send message via LangGraph service
   */
  private async sendViaLangGraph(params: {
    sessionId: string;
    message: string;
    context: any;
    onStream?: (chunk: string) => void;
  }) {
    const response = await this.langgraphService.sendMessage({
      sessionId: params.sessionId,
      message: params.message,
      context: params.context,
      onStream: params.onStream,
    });

    return response.response;
  }

  /**
   * Send message via legacy messaging service
   */
  private async sendViaLegacy(params: { sessionId: string; message: string; context: any }) {
    const sent = await this.legacyService.sendMessage(
      'user',
      'dm',
      MessageType.QUERY,
      {
        message: params.message,
        context: params.context,
      },
      MessagePriority.HIGH,
    );

    if (!sent) {
      throw new Error('Failed to send message via legacy service');
    }

    // Legacy service doesn't return response directly
    // Would need additional polling/subscription logic
    return 'Message sent via legacy service';
  }

  /**
   * Get queue status (legacy system only)
   */
  getQueueStatus() {
    if (this.config.strategy === 'legacy' || this.config.strategy === 'hybrid') {
      return this.legacyService.getQueueStatus();
    }

    return {
      queueLength: 0,
      isOnline: true,
      metrics: {},
      message: 'Using LangGraph - no queue',
    };
  }

  /**
   * Switch migration strategy at runtime
   */
  setStrategy(strategy: MigrationStrategy) {
    this.config.strategy = strategy;
    logger.info('[UnifiedMessaging] Strategy changed to:', strategy);
  }

  /**
   * Get current configuration
   */
  getConfig(): CompatibilityConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating unified messaging service
 */
export function createUnifiedMessaging(config?: CompatibilityConfig): UnifiedMessagingService {
  return new UnifiedMessagingService(config);
}
