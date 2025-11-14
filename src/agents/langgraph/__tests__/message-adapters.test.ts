/**
 * LangGraph Message Adapter Tests
 *
 * Tests for bidirectional message conversion:
 * - GameMessage → BaseMessage conversion
 * - BaseMessage → GameMessage conversion
 * - QueuedMessage → BaseMessage conversion
 * - BaseMessage → QueuedMessage conversion
 * - Metadata preservation
 * - Edge cases (missing fields, special characters, unicode)
 *
 * @module agents/langgraph/__tests__
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LangGraphMessageAdapter, GameMessage } from '../adapters/message-adapter';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { MessageType, MessagePriority, QueuedMessage } from '../../messaging/types';

describe('LangGraph Message Adapter', () => {
  describe('GameMessage to BaseMessage Conversion', () => {
    it('should convert user GameMessage to HumanMessage', () => {
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'I attack the goblin',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        metadata: {
          characterId: 'char-123',
        },
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(HumanMessage);
      expect(baseMessage.content).toBe('I attack the goblin');
      expect(baseMessage.additional_kwargs?.id).toBe('msg-1');
      expect(baseMessage.additional_kwargs?.characterId).toBe('char-123');
    });

    it('should convert assistant GameMessage to AIMessage', () => {
      const gameMessage: GameMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'You strike the goblin with your sword',
        timestamp: new Date('2024-01-01T12:00:01Z'),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(AIMessage);
      expect(baseMessage.content).toBe('You strike the goblin with your sword');
      expect(baseMessage.additional_kwargs?.id).toBe('msg-2');
    });

    it('should convert system GameMessage to SystemMessage', () => {
      const gameMessage: GameMessage = {
        id: 'msg-3',
        role: 'system',
        content: 'Initiative order updated',
        timestamp: new Date('2024-01-01T12:00:02Z'),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(SystemMessage);
      expect(baseMessage.content).toBe('Initiative order updated');
    });

    it('should preserve timestamp in metadata', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const gameMessage: GameMessage = {
        id: 'msg-4',
        role: 'user',
        content: 'Test',
        timestamp,
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage.additional_kwargs?.timestamp).toBe(timestamp.toISOString());
    });

    it('should preserve custom metadata', () => {
      const gameMessage: GameMessage = {
        id: 'msg-5',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
        metadata: {
          sessionId: 'session-123',
          campaignId: 'campaign-456',
          customField: 'customValue',
        },
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage.additional_kwargs?.sessionId).toBe('session-123');
      expect(baseMessage.additional_kwargs?.campaignId).toBe('campaign-456');
      expect(baseMessage.additional_kwargs?.customField).toBe('customValue');
    });

    it('should handle empty metadata', () => {
      const gameMessage: GameMessage = {
        id: 'msg-6',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage.additional_kwargs?.id).toBe('msg-6');
    });

    it('should handle unknown roles as SystemMessage', () => {
      const gameMessage: GameMessage = {
        id: 'msg-7',
        role: 'unknown' as any,
        content: 'Test',
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(baseMessage).toBeInstanceOf(SystemMessage);
      expect(baseMessage.additional_kwargs?.originalRole).toBe('unknown');
    });
  });

  describe('BaseMessage to GameMessage Conversion', () => {
    it('should convert HumanMessage to user GameMessage', () => {
      const baseMessage = new HumanMessage({
        content: 'Hello',
        additional_kwargs: {
          id: 'msg-1',
          timestamp: new Date('2024-01-01').toISOString(),
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.role).toBe('user');
      expect(gameMessage.content).toBe('Hello');
      expect(gameMessage.id).toBe('msg-1');
      expect(gameMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should convert AIMessage to assistant GameMessage', () => {
      const baseMessage = new AIMessage({
        content: 'The goblin falls',
        additional_kwargs: {
          id: 'msg-2',
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.role).toBe('assistant');
      expect(gameMessage.content).toBe('The goblin falls');
    });

    it('should convert SystemMessage to system GameMessage', () => {
      const baseMessage = new SystemMessage({
        content: 'Combat ended',
        additional_kwargs: {
          id: 'msg-3',
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.role).toBe('system');
      expect(gameMessage.content).toBe('Combat ended');
    });

    it('should generate ID if not provided', () => {
      const baseMessage = new HumanMessage({
        content: 'Test',
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.id).toBeTruthy();
      expect(gameMessage.id).toMatch(/^msg-/);
    });

    it('should convert timestamp string to Date', () => {
      const timestampStr = '2024-01-01T12:00:00Z';
      const baseMessage = new HumanMessage({
        content: 'Test',
        additional_kwargs: {
          timestamp: timestampStr,
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.timestamp).toBeInstanceOf(Date);
      expect(gameMessage.timestamp.toISOString()).toBe(timestampStr);
    });

    it('should use current timestamp if not provided', () => {
      const baseMessage = new HumanMessage({
        content: 'Test',
      });

      const before = Date.now();
      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);
      const after = Date.now();

      expect(gameMessage.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(gameMessage.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should preserve metadata', () => {
      const baseMessage = new HumanMessage({
        content: 'Test',
        additional_kwargs: {
          sender: 'player-1',
          receiver: 'dm-agent',
          priority: 'HIGH',
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(gameMessage.metadata?.sender).toBe('player-1');
      expect(gameMessage.metadata?.receiver).toBe('dm-agent');
      expect(gameMessage.metadata?.priority).toBe('HIGH');
    });
  });

  describe('QueuedMessage to BaseMessage Conversion', () => {
    it('should convert QUERY message to HumanMessage', () => {
      const queuedMessage: QueuedMessage = {
        id: 'msg-1',
        type: MessageType.QUERY,
        content: 'What is my HP?',
        priority: MessagePriority.MEDIUM,
        sender: 'player',
        receiver: 'dm',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: false,
          timestamp: new Date(),
          attempts: 0,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage).toBeInstanceOf(HumanMessage);
      expect(baseMessage.content).toBe('What is my HP?');
      expect(baseMessage.additional_kwargs?.sender).toBe('player');
    });

    it('should convert TASK message to HumanMessage', () => {
      const queuedMessage: QueuedMessage = {
        id: 'msg-2',
        type: MessageType.TASK,
        content: { action: 'roll_dice', formula: '1d20' },
        priority: MessagePriority.HIGH,
        sender: 'dm',
        receiver: 'dice-roller',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: false,
          timestamp: new Date(),
          attempts: 0,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage).toBeInstanceOf(HumanMessage);
      expect(typeof baseMessage.content).toBe('string');
      expect(baseMessage.content).toContain('roll_dice');
    });

    it('should convert RESPONSE message to AIMessage', () => {
      const queuedMessage: QueuedMessage = {
        id: 'msg-3',
        type: MessageType.RESPONSE,
        content: 'Your HP is 45',
        priority: MessagePriority.MEDIUM,
        sender: 'dm',
        receiver: 'player',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage).toBeInstanceOf(AIMessage);
      expect(baseMessage.content).toBe('Your HP is 45');
    });

    it('should convert STATE_UPDATE to SystemMessage', () => {
      const queuedMessage: QueuedMessage = {
        id: 'msg-4',
        type: MessageType.STATE_UPDATE,
        content: { hp: 45, maxHp: 50 },
        priority: MessagePriority.LOW,
        sender: 'system',
        receiver: 'all',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: true,
          timestamp: new Date(),
          attempts: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage).toBeInstanceOf(SystemMessage);
    });

    it('should preserve all metadata fields', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const queuedMessage: QueuedMessage = {
        id: 'msg-5',
        type: MessageType.QUERY,
        content: 'Test',
        priority: MessagePriority.HIGH,
        sender: 'sender-1',
        receiver: 'receiver-1',
        timestamp,
        deliveryStatus: {
          delivered: false,
          timestamp,
          attempts: 2,
        },
        retryCount: 1,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage.additional_kwargs?.id).toBe('msg-5');
      expect(baseMessage.additional_kwargs?.sender).toBe('sender-1');
      expect(baseMessage.additional_kwargs?.receiver).toBe('receiver-1');
      expect(baseMessage.additional_kwargs?.priority).toBe('HIGH');
      expect(baseMessage.additional_kwargs?.retryCount).toBe(1);
    });
  });

  describe('BaseMessage to QueuedMessage Conversion', () => {
    it('should convert HumanMessage to QUERY QueuedMessage', () => {
      const baseMessage = new HumanMessage({
        content: 'Test query',
        additional_kwargs: {
          id: 'msg-1',
          sender: 'player',
          receiver: 'dm',
        },
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(baseMessage);

      expect(queuedMessage.type).toBe(MessageType.QUERY);
      expect(queuedMessage.content).toBe('Test query');
      expect(queuedMessage.sender).toBe('player');
      expect(queuedMessage.receiver).toBe('dm');
    });

    it('should convert AIMessage to RESPONSE QueuedMessage', () => {
      const baseMessage = new AIMessage({
        content: 'Test response',
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(baseMessage);

      expect(queuedMessage.type).toBe(MessageType.RESPONSE);
      expect(queuedMessage.content).toBe('Test response');
    });

    it('should convert SystemMessage to STATE_UPDATE QueuedMessage', () => {
      const baseMessage = new SystemMessage({
        content: 'State updated',
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(baseMessage);

      expect(queuedMessage.type).toBe(MessageType.STATE_UPDATE);
    });

    it('should use default values for missing fields', () => {
      const baseMessage = new HumanMessage({
        content: 'Test',
      });

      const queuedMessage = LangGraphMessageAdapter.fromBaseMessage(baseMessage);

      expect(queuedMessage.id).toBeTruthy();
      expect(queuedMessage.priority).toBe('MEDIUM');
      expect(queuedMessage.sender).toBe('system');
      expect(queuedMessage.receiver).toBe('dm');
      expect(queuedMessage.deliveryStatus.delivered).toBe(true);
      expect(queuedMessage.retryCount).toBe(0);
      expect(queuedMessage.maxRetries).toBe(3);
    });
  });

  describe('Array Conversion Methods', () => {
    it('should convert array of GameMessages to BaseMessages', () => {
      const gameMessages: GameMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi',
          timestamp: new Date(),
        },
        {
          id: 'msg-3',
          role: 'system',
          content: 'Status',
          timestamp: new Date(),
        },
      ];

      const baseMessages = LangGraphMessageAdapter.fromGameMessages(gameMessages);

      expect(baseMessages).toHaveLength(3);
      expect(baseMessages[0]).toBeInstanceOf(HumanMessage);
      expect(baseMessages[1]).toBeInstanceOf(AIMessage);
      expect(baseMessages[2]).toBeInstanceOf(SystemMessage);
    });

    it('should convert array of BaseMessages to GameMessages', () => {
      const baseMessages = [
        new HumanMessage({ content: 'Hello' }),
        new AIMessage({ content: 'Hi' }),
        new SystemMessage({ content: 'Status' }),
      ];

      const gameMessages = LangGraphMessageAdapter.toGameMessages(baseMessages);

      expect(gameMessages).toHaveLength(3);
      expect(gameMessages[0].role).toBe('user');
      expect(gameMessages[1].role).toBe('assistant');
      expect(gameMessages[2].role).toBe('system');
    });

    it('should handle empty arrays', () => {
      expect(LangGraphMessageAdapter.fromGameMessages([])).toEqual([]);
      expect(LangGraphMessageAdapter.toGameMessages([])).toEqual([]);
    });

    it('should preserve order in array conversion', () => {
      const gameMessages: GameMessage[] = [
        { id: 'msg-1', role: 'user', content: 'First', timestamp: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Second', timestamp: new Date() },
        { id: 'msg-3', role: 'user', content: 'Third', timestamp: new Date() },
      ];

      const baseMessages = LangGraphMessageAdapter.fromGameMessages(gameMessages);
      const backToGame = LangGraphMessageAdapter.toGameMessages(baseMessages);

      expect(backToGame[0].content).toBe('First');
      expect(backToGame[1].content).toBe('Second');
      expect(backToGame[2].content).toBe('Third');
    });
  });

  describe('Edge Cases', () => {
    it('should handle messages with special characters', () => {
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
      const backToGame = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(backToGame.content).toBe(gameMessage.content);
    });

    it('should handle messages with unicode characters', () => {
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: '你好世界 🐉 مرحبا Привет',
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
      const backToGame = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(backToGame.content).toBe(gameMessage.content);
    });

    it('should handle very long messages', () => {
      const longContent = 'a'.repeat(10000);
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: longContent,
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
      const backToGame = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(backToGame.content).toBe(longContent);
      expect(backToGame.content.length).toBe(10000);
    });

    it('should handle empty content', () => {
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: '',
        timestamp: new Date(),
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
      const backToGame = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(backToGame.content).toBe('');
    });

    it('should handle complex object content in QueuedMessage', () => {
      const complexContent = {
        action: 'cast_spell',
        spellName: 'Fireball',
        level: 3,
        targets: ['goblin-1', 'goblin-2'],
        metadata: {
          position: { x: 10, y: 20 },
        },
      };

      const queuedMessage: QueuedMessage = {
        id: 'msg-1',
        type: MessageType.TASK,
        content: complexContent,
        priority: MessagePriority.HIGH,
        sender: 'player',
        receiver: 'spell-system',
        timestamp: new Date(),
        deliveryStatus: {
          delivered: false,
          timestamp: new Date(),
          attempts: 0,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const baseMessage = LangGraphMessageAdapter.toBaseMessage(queuedMessage);

      expect(baseMessage.content).toBeTruthy();
      expect(typeof baseMessage.content).toBe('string');
      expect(baseMessage.content).toContain('Fireball');
    });

    it('should handle missing optional metadata fields', () => {
      const gameMessage: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
        metadata: undefined,
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
      const backToGame = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(backToGame).toBeDefined();
      expect(backToGame.content).toBe('Test');
    });
  });

  describe('Bidirectional Conversion Integrity', () => {
    it('should maintain data integrity in GameMessage round-trip', () => {
      const original: GameMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'I attack the dragon',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        metadata: {
          characterId: 'char-123',
          sessionId: 'session-456',
        },
      };

      const baseMessage = LangGraphMessageAdapter.fromGameMessage(original);
      const roundTrip = LangGraphMessageAdapter.toGameMessage(baseMessage);

      expect(roundTrip.id).toBe(original.id);
      expect(roundTrip.role).toBe(original.role);
      expect(roundTrip.content).toBe(original.content);
      expect(roundTrip.timestamp.toISOString()).toBe(original.timestamp.toISOString());
      expect(roundTrip.metadata?.characterId).toBe(original.metadata?.characterId);
      expect(roundTrip.metadata?.sessionId).toBe(original.metadata?.sessionId);
    });

    it('should maintain data integrity in BaseMessage round-trip', () => {
      const original = new HumanMessage({
        content: 'Test message',
        additional_kwargs: {
          id: 'msg-1',
          timestamp: new Date('2024-01-01').toISOString(),
          customField: 'customValue',
        },
      });

      const gameMessage = LangGraphMessageAdapter.toGameMessage(original);
      const roundTrip = LangGraphMessageAdapter.fromGameMessage(gameMessage);

      expect(roundTrip.content).toBe(original.content);
      expect(roundTrip.additional_kwargs?.id).toBe('msg-1');
      expect(roundTrip.additional_kwargs?.customField).toBe('customValue');
    });
  });
});
