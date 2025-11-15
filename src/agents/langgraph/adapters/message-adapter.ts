/**
 * LangGraph Message Adapter
 *
 * Converts between custom AgentMessagingService message format and
 * LangChain BaseMessage format for LangGraph state management.
 *
 * This adapter provides bidirectional conversion and maintains compatibility
 * during the migration from custom messaging to LangGraph state.
 *
 * @module langgraph/adapters
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { MessageType, QueuedMessage } from '../../messaging/types';

/**
 * Custom message format for game messages
 */
export interface GameMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Convert custom message types to LangChain message types
 */
export class LangGraphMessageAdapter {
  /**
   * Convert custom QueuedMessage to LangChain BaseMessage
   *
   * Maps custom message types to appropriate LangChain message classes:
   * - QUERY/TASK → HumanMessage (user input)
   * - RESPONSE/RESULT → AIMessage (agent output)
   * - STATE_UPDATE → SystemMessage (system events)
   */
  static toBaseMessage(customMessage: QueuedMessage): BaseMessage {
    const content =
      typeof customMessage.content === 'string'
        ? customMessage.content
        : JSON.stringify(customMessage.content);

    const metadata = {
      id: customMessage.id,
      sender: customMessage.sender,
      receiver: customMessage.receiver,
      priority: customMessage.priority,
      timestamp: customMessage.timestamp.toISOString(),
      retryCount: customMessage.retryCount,
      deliveryStatus: customMessage.deliveryStatus,
    };

    switch (customMessage.type) {
      case MessageType.QUERY:
      case MessageType.TASK:
        return new HumanMessage({
          content,
          additional_kwargs: metadata,
        });

      case MessageType.RESPONSE:
      case MessageType.RESULT:
        return new AIMessage({
          content,
          additional_kwargs: metadata,
        });

      case MessageType.STATE_UPDATE:
        return new SystemMessage({
          content,
          additional_kwargs: metadata,
        });

      default:
        // Default to system message for unknown types
        return new SystemMessage({
          content,
          additional_kwargs: { ...metadata, originalType: customMessage.type },
        });
    }
  }

  /**
   * Convert game chat message to LangChain BaseMessage
   */
  static fromGameMessage(gameMessage: GameMessage): BaseMessage {
    const metadata = {
      id: gameMessage.id,
      timestamp: gameMessage.timestamp.toISOString(),
      ...gameMessage.metadata,
    };

    switch (gameMessage.role) {
      case 'user':
        return new HumanMessage({
          content: gameMessage.content,
          additional_kwargs: metadata,
        });

      case 'assistant':
        return new AIMessage({
          content: gameMessage.content,
          additional_kwargs: metadata,
        });

      case 'system':
        return new SystemMessage({
          content: gameMessage.content,
          additional_kwargs: metadata,
        });

      default:
        return new SystemMessage({
          content: gameMessage.content,
          additional_kwargs: { ...metadata, originalRole: gameMessage.role },
        });
    }
  }

  /**
   * Convert LangChain BaseMessage back to custom format
   * Used for displaying messages in UI or logging
   */
  static fromBaseMessage(baseMessage: BaseMessage): QueuedMessage {
    const metadata = baseMessage.additional_kwargs || {};
    const messageType = baseMessage._getType();

    let customType: MessageType;
    switch (messageType) {
      case 'human':
        customType = MessageType.QUERY;
        break;
      case 'ai':
        customType = MessageType.RESPONSE;
        break;
      case 'system':
        customType = MessageType.STATE_UPDATE;
        break;
      default:
        customType = MessageType.STATE_UPDATE;
    }

    return {
      id: metadata.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: customType,
      content: baseMessage.content as any,
      priority: metadata.priority || 'MEDIUM',
      sender: metadata.sender || 'system',
      receiver: metadata.receiver || 'dm',
      timestamp: metadata.timestamp ? new Date(metadata.timestamp) : new Date(),
      deliveryStatus: metadata.deliveryStatus || {
        delivered: true,
        timestamp: new Date(),
        attempts: 1,
      },
      retryCount: metadata.retryCount || 0,
      maxRetries: 3,
      acknowledgment: metadata.acknowledgment,
    };
  }

  /**
   * Convert LangChain BaseMessage to GameMessage format
   */
  static toGameMessage(baseMessage: BaseMessage): GameMessage {
    const metadata = baseMessage.additional_kwargs || {};
    const messageType = baseMessage._getType();

    let role: 'user' | 'assistant' | 'system';
    switch (messageType) {
      case 'human':
        role = 'user';
        break;
      case 'ai':
        role = 'assistant';
        break;
      default:
        role = 'system';
    }

    return {
      id: metadata.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content:
        typeof baseMessage.content === 'string'
          ? baseMessage.content
          : JSON.stringify(baseMessage.content),
      timestamp: metadata.timestamp ? new Date(metadata.timestamp) : new Date(),
      metadata: {
        sender: metadata.sender,
        receiver: metadata.receiver,
        priority: metadata.priority,
      },
    };
  }

  /**
   * Convert array of BaseMessages to GameMessages
   */
  static toGameMessages(baseMessages: BaseMessage[]): GameMessage[] {
    return baseMessages.map((msg) => this.toGameMessage(msg));
  }

  /**
   * Convert array of GameMessages to BaseMessages
   */
  static fromGameMessages(gameMessages: GameMessage[]): BaseMessage[] {
    return gameMessages.map((msg) => this.fromGameMessage(msg));
  }
}
