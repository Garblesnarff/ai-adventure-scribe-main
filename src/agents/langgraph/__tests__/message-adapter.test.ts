/**
 * Tests for LangGraph Message Adapter
 *
 * Verifies bidirectional conversion between custom message formats
 * and LangChain BaseMessage format.
 */

import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { LangGraphMessageAdapter } from '../adapters/message-adapter';
import { MessageType, MessagePriority } from '../../messaging/types';
import type { QueuedMessage } from '../../messaging/types';
import type { GameMessage } from '../adapters/message-adapter';

describe('LangGraphMessageAdapter', () => {
  describe('toBaseMessage', () => {
    it('should convert QUERY to HumanMessage', () => {
      const customMessage: QueuedMessage = {
        id: 'test-1',
        type: MessageType.QUERY,
        content: 'What is in the room?',
        priority: MessagePriority.HIGH,
        sender: 'player',
        receiver: 'dm',
        timestamp: new Date('2025-01-01'),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(customMessage);

      expect(baseMessage).toBeInstanceOf(HumanMessage);
      expect(baseMessage.content).toBe('What is in the room?');
      expect(baseMessage.additional_kwargs.id).toBe('test-1');
      expect(baseMessage.additional_kwargs.sender).toBe('player');
    });

    it('should convert RESPONSE to AIMessage', () => {
      const customMessage: QueuedMessage = {
        id: 'test-2',
        type: MessageType.RESPONSE,
        content: 'You see a dragon!',
        priority: MessagePriority.MEDIUM,
        sender: 'dm',
        receiver: 'player',
        timestamp: new Date('2025-01-01'),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(customMessage);

      expect(baseMessage).toBeInstanceOf(AIMessage);
      expect(baseMessage.content).toBe('You see a dragon!');
      expect(baseMessage.additional_kwargs.sender).toBe('dm');
    });

    it('should convert STATE_UPDATE to SystemMessage', () => {
      const customMessage: QueuedMessage = {
        id: 'test-3',
        type: MessageType.STATE_UPDATE,
        content: 'Session started',
        priority: MessagePriority.LOW,
        sender: 'system',
        receiver: 'all',
        timestamp: new Date('2025-01-01'),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(customMessage);

      expect(baseMessage).toBeInstanceOf(SystemMessage);
      expect(baseMessage.content).toBe('Session started');
    });

    it('should handle JSON content', () => {
      const customMessage: QueuedMessage = {
        id: 'test-4',
        type: MessageType.TASK,
        content: { action: 'attack', target: 'goblin' } as any,
        priority: MessagePriority.HIGH,
        sender: 'player',
        receiver: 'dm',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(customMessage);

      expect(baseMessage.content).toBe('{"action":"attack","target":"goblin"}');
    });
  });

  describe('fromGameMessage', () => {
    it('should convert user role to HumanMessage', () => {
      const gameMessage: GameMessage = {
        id: 'game-1',
        role: 'user',
        content: 'I attack the goblin',
        timestamp: new Date('2025-01-01'),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(HumanMessage);
      expect(baseMessage.content).toBe('I attack the goblin');
      expect(baseMessage.additional_kwargs.id).toBe('game-1');
    });

    it('should convert assistant role to AIMessage', () => {
      const gameMessage: GameMessage = {
        id: 'game-2',
        role: 'assistant',
        content: 'Roll for initiative!',
        timestamp: new Date('2025-01-01'),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(AIMessage);
      expect(baseMessage.content).toBe('Roll for initiative!');
    });

    it('should convert system role to SystemMessage', () => {
      const gameMessage: GameMessage = {
        id: 'game-3',
        role: 'system',
        content: 'Combat begins',
        timestamp: new Date('2025-01-01'),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(SystemMessage);
      expect(baseMessage.content).toBe('Combat begins');
    });

    it('should preserve metadata', () => {
      const gameMessage: GameMessage = {
        id: 'game-4',
        role: 'user',
        content: 'Test message',
        timestamp: new Date('2025-01-01T12:00:00Z'),
        metadata: {
          custom: 'value',
          priority: 'HIGH',
        },
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage.additional_kwargs.custom).toBe('value');
      expect(baseMessage.additional_kwargs.priority).toBe('HIGH');
      expect(baseMessage.additional_kwargs.timestamp).toBe('2025-01-01T12:00:00.000Z');
    });
  });

  describe('fromBaseMessage', () => {
    it('should convert HumanMessage to QueuedMessage', () => {
      const humanMessage = new HumanMessage({
        content: 'Player input',
        additional_kwargs: {
          id: 'msg-1',
          sender: 'player',
          receiver: 'dm',
          priority: 'HIGH',
        },
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(humanMessage);

      expect(queuedMessage.type).toBe(MessageType.QUERY);
      expect(queuedMessage.content).toBe('Player input');
      expect(queuedMessage.id).toBe('msg-1');
      expect(queuedMessage.sender).toBe('player');
      expect(queuedMessage.priority).toBe('HIGH');
    });

    it('should convert AIMessage to QueuedMessage', () => {
      const aiMessage = new AIMessage({
        content: 'DM response',
        additional_kwargs: {
          id: 'msg-2',
          sender: 'dm',
        },
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(aiMessage);

      expect(queuedMessage.type).toBe(MessageType.RESPONSE);
      expect(queuedMessage.content).toBe('DM response');
    });

    it('should generate ID if missing', () => {
      const message = new HumanMessage({
        content: 'Test',
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(message);

      expect(queuedMessage.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
    });

    it('should set defaults for missing fields', () => {
      const message = new HumanMessage({
        content: 'Test',
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(message);

      expect(queuedMessage.priority).toBe('MEDIUM');
      expect(queuedMessage.sender).toBe('system');
      expect(queuedMessage.receiver).toBe('dm');
      expect(queuedMessage.retryCount).toBe(0);
      expect(queuedMessage.maxRetries).toBe(3);
      expect(queuedMessage.deliveryStatus.delivered).toBe(true);
    });
  });

  describe('toGameMessage', () => {
    it('should convert HumanMessage to user role', () => {
      const humanMessage = new HumanMessage({
        content: 'User message',
        additional_kwargs: {
          id: 'test-1',
          timestamp: '2025-01-01T00:00:00Z',
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(humanMessage);

      expect(gameMessage.role).toBe('user');
      expect(gameMessage.content).toBe('User message');
      expect(gameMessage.id).toBe('test-1');
    });

    it('should convert AIMessage to assistant role', () => {
      const aiMessage = new AIMessage({
        content: 'AI message',
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(aiMessage);

      expect(gameMessage.role).toBe('assistant');
      expect(gameMessage.content).toBe('AI message');
    });

    it('should convert SystemMessage to system role', () => {
      const systemMessage = new SystemMessage({
        content: 'System message',
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(systemMessage);

      expect(gameMessage.role).toBe('system');
      expect(gameMessage.content).toBe('System message');
    });
  });

  describe('array conversions', () => {
    it('should convert array of GameMessages to BaseMessages', () => {
      const gameMessages: GameMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      const baseMessages = LangGraphMessageAdapter.fromGameMessages(gameMessages);

      expect(baseMessages).toHaveLength(2);
      expect(baseMessages[0]).toBeInstanceOf(HumanMessage);
      expect(baseMessages[1]).toBeInstanceOf(AIMessage);
    });

    it('should convert array of BaseMessages to GameMessages', () => {
      const baseMessages = [
        new HumanMessage({ content: 'Hello' }),
        new AIMessage({ content: 'Hi there!' }),
      ];

      const gameMessages = LangGraphMessageAdapter.toGameMessages(baseMessages);

      expect(gameMessages).toHaveLength(2);
      expect(gameMessages[0].role).toBe('user');
      expect(gameMessages[1].role).toBe('assistant');
    });
  });
});
