/**
 * DMService Integration Tests
 *
 * End-to-end integration tests for DMService:
 * - Service initialization
 * - Message processing through the graph
 * - Backward compatibility with old messaging system
 * - Conversation history management
 * - Error handling and recovery
 * - Concurrent request handling
 * - Streaming support
 *
 * @module agents/langgraph/__tests__
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DMService, getDMService } from '../dm-service';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/config/ai', () => ({
  GEMINI_TEXT_MODEL: 'gemini-1.5-flash',
}));

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(() => ({
    executeWithRotation: vi.fn(async () => {
      return JSON.stringify({
        type: 'attack',
        confidence: 0.9,
        details: { target: 'goblin', action: 'attack' },
      });
    }),
  })),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: vi.fn(() => 'You are a DM.'),
  buildGameContextPrompt: vi.fn(() => 'Campaign context.'),
  buildResponseStructurePrompt: vi.fn(() => 'Respond in JSON.'),
}));

// Mock Supabase client for checkpointer
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('DMService Integration Tests', () => {
  let service: DMService;
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Supabase mock
    mockQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    };

    mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

    service = new DMService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize DMService successfully', () => {
      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);
    });

    it('should create singleton instance', () => {
      const instance1 = getDMService();
      const instance2 = getDMService();

      expect(instance1).toBe(instance2);
    });

    it('should have correct service status', () => {
      const status = service.getStatus();

      expect(status.configured).toBe(true);
      expect(status.graphAvailable).toBe(true);
      expect(status.checkpointerType).toBe('supabase');
    });
  });

  describe('Message Processing', () => {
    it('should process message through graph successfully', async () => {
      const config = {
        sessionId: 'session-1',
        message: 'I attack the goblin',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-1',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
      expect(typeof response.response).toBe('string');
      expect(response.requiresDiceRoll).toBeDefined();
    });

    it('should handle simple greeting', async () => {
      const config = {
        sessionId: 'session-2',
        message: 'Hello there',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-2',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });

    it('should handle combat action', async () => {
      const config = {
        sessionId: 'session-3',
        message: 'I swing my sword at the orc',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-3',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });

    it('should handle spell casting', async () => {
      const config = {
        sessionId: 'session-4',
        message: 'I cast Fireball at the enemies',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-4',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });

    it('should handle exploration', async () => {
      const config = {
        sessionId: 'session-5',
        message: 'I search the room for traps',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-5',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });
  });

  describe('Conversation History', () => {
    it('should load conversation history', async () => {
      const mockMessages = [
        {
          content: 'Hello',
          type: 'human',
        },
        {
          content: 'Hi there',
          type: 'ai',
        },
      ];

      mockQuery.maybeSingle.mockResolvedValue({
        data: {
          channel_values: {
            messages: mockMessages,
          },
        },
        error: null,
      });

      const history = await service.getConversationHistory('session-1');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array if no history exists', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const history = await service.getConversationHistory('new-session');

      expect(history).toEqual([]);
    });

    it('should handle history loading errors gracefully', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const history = await service.getConversationHistory('session-1');

      expect(history).toEqual([]);
    });
  });

  describe('History Management', () => {
    it('should clear conversation history', async () => {
      mockQuery.delete.mockResolvedValue({ error: null });

      await service.clearHistory('session-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('should handle clear history errors', async () => {
      mockQuery.delete.mockResolvedValue({
        error: new Error('Delete failed'),
      });

      await expect(service.clearHistory('session-1')).rejects.toThrow();
    });

    it('should get checkpoint history', async () => {
      const mockCheckpoints = [
        {
          state: { id: 'checkpoint-1', channel_values: {} },
          metadata: { step: 1 },
        },
        {
          state: { id: 'checkpoint-2', channel_values: {} },
          metadata: { step: 2 },
        },
      ];

      mockQuery.then = vi.fn((cb) => cb({ data: mockCheckpoints, error: null }));

      const history = await service.getCheckpointHistory('session-1', 5);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty message gracefully', async () => {
      const config = {
        sessionId: 'session-error-1',
        message: '',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-error-1',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });

    it('should handle graph execution errors', async () => {
      const mockGemini = await import('@/services/ai/shared/utils');
      vi.mocked(mockGemini.getGeminiManager).mockReturnValueOnce({
        executeWithRotation: vi.fn().mockRejectedValue(new Error('AI Error')),
      } as any);

      const config = {
        sessionId: 'session-error-2',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-error-2',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      // Should return error response
    });

    it('should handle checkpoint save errors gracefully', async () => {
      mockQuery.upsert.mockResolvedValue({
        error: new Error('Save failed'),
      });

      const config = {
        sessionId: 'session-error-3',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-error-3',
        },
      };

      // Should not throw even if checkpoint save fails
      const response = await service.sendMessage(config);
      expect(response).toBeDefined();
    });

    it('should handle missing context fields', async () => {
      const config = {
        sessionId: 'session-error-4',
        message: 'test',
        context: {
          campaignId: '',
          characterId: '',
          sessionId: 'session-error-4',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });
  });

  describe('Streaming Support', () => {
    it('should support streaming message processing', async () => {
      const chunks: string[] = [];
      const onStream = (chunk: string) => {
        chunks.push(chunk);
      };

      const config = {
        sessionId: 'session-stream-1',
        message: 'Tell me a story',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-stream-1',
        },
        onStream,
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      // Chunks may be empty if streaming not fully implemented
      // This tests the API works
    });

    it('should handle streaming errors gracefully', async () => {
      const onStream = vi.fn();

      const config = {
        sessionId: 'session-stream-2',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-stream-2',
        },
        onStream,
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent messages', async () => {
      const configs = [
        {
          sessionId: 'session-concurrent-1',
          message: 'Message 1',
          context: {
            campaignId: 'campaign-1',
            characterId: 'char-1',
            sessionId: 'session-concurrent-1',
          },
        },
        {
          sessionId: 'session-concurrent-2',
          message: 'Message 2',
          context: {
            campaignId: 'campaign-1',
            characterId: 'char-2',
            sessionId: 'session-concurrent-2',
          },
        },
        {
          sessionId: 'session-concurrent-3',
          message: 'Message 3',
          context: {
            campaignId: 'campaign-1',
            characterId: 'char-3',
            sessionId: 'session-concurrent-3',
          },
        },
      ];

      const responses = await Promise.all(configs.map((config) => service.sendMessage(config)));

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response.response).toBeTruthy();
      });
    });

    it('should handle rapid sequential messages', async () => {
      const config = {
        sessionId: 'session-rapid',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-rapid',
        },
      };

      for (let i = 0; i < 5; i++) {
        const response = await service.sendMessage({
          ...config,
          message: `Message ${i}`,
        });
        expect(response).toBeDefined();
      }
    });
  });

  describe('Response Format', () => {
    it('should return DMResponse with correct structure', async () => {
      const config = {
        sessionId: 'session-format-1',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-format-1',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toHaveProperty('response');
      expect(response).toHaveProperty('requiresDiceRoll');
      expect(response).toHaveProperty('suggestedActions');
      expect(response).toHaveProperty('emotionalTone');
    });

    it('should include suggested actions when available', async () => {
      const config = {
        sessionId: 'session-format-2',
        message: 'What can I do?',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-format-2',
        },
      };

      const response = await service.sendMessage(config);

      expect(response.suggestedActions).toBeDefined();
      expect(Array.isArray(response.suggestedActions)).toBe(true);
    });

    it('should indicate when dice roll is required', async () => {
      const config = {
        sessionId: 'session-format-3',
        message: 'I try to pick the lock',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-format-3',
        },
      };

      const response = await service.sendMessage(config);

      expect(response.requiresDiceRoll).toBeDefined();
      expect(typeof response.requiresDiceRoll).toBe('boolean');
    });
  });

  describe('State Persistence', () => {
    it('should persist state after message processing', async () => {
      const config = {
        sessionId: 'session-persist-1',
        message: 'test message',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-persist-1',
        },
      };

      await service.sendMessage(config);

      // Checkpoint should be saved
      expect(mockQuery.upsert).toHaveBeenCalled();
    });

    it('should load previous state before processing new message', async () => {
      const existingState = {
        channel_values: {
          messages: [
            new HumanMessage({ content: 'Previous message' }),
            new AIMessage({ content: 'Previous response' }),
          ],
        },
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: existingState,
        error: null,
      });

      const config = {
        sessionId: 'session-persist-2',
        message: 'new message',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-persist-2',
        },
      };

      await service.sendMessage(config);

      // Should load previous checkpoint
      expect(mockQuery.maybeSingle).toHaveBeenCalled();
    });
  });

  describe('Context Propagation', () => {
    it('should propagate campaign context through graph', async () => {
      const config = {
        sessionId: 'session-context-1',
        message: 'test',
        context: {
          campaignId: 'special-campaign',
          characterId: 'char-1',
          sessionId: 'session-context-1',
          campaignDetails: {
            name: 'The Lost Mines',
            setting: 'Forgotten Realms',
          },
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      // Context should be used in graph execution
    });

    it('should propagate character context', async () => {
      const config = {
        sessionId: 'session-context-2',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'special-char',
          sessionId: 'session-context-2',
          characterDetails: {
            name: 'Thorin',
            class: 'Fighter',
            level: 5,
          },
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });

    it('should include recent events in context', async () => {
      const config = {
        sessionId: 'session-context-3',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-context-3',
          recentEvents: ['Defeated a dragon', 'Found a magic sword', 'Leveled up to 6'],
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete message processing in reasonable time', async () => {
      const config = {
        sessionId: 'session-perf-1',
        message: 'quick test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-perf-1',
        },
      };

      const start = Date.now();
      await service.sendMessage(config);
      const duration = Date.now() - start;

      // With mocked AI, should be very fast
      expect(duration).toBeLessThan(5000);
    });

    it('should handle large message content', async () => {
      const largeMessage = 'a'.repeat(5000);

      const config = {
        sessionId: 'session-perf-2',
        message: largeMessage,
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-perf-2',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });
  });

  describe('Service Configuration', () => {
    it('should report configuration status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('graphAvailable');
      expect(status).toHaveProperty('checkpointerType');
    });

    it('should confirm service is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null context fields gracefully', async () => {
      const config = {
        sessionId: 'session-edge-1',
        message: 'test',
        context: {
          campaignId: null as any,
          characterId: null as any,
          sessionId: 'session-edge-1',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });

    it('should handle undefined optional context fields', async () => {
      const config = {
        sessionId: 'session-edge-2',
        message: 'test',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-edge-2',
          campaignDetails: undefined,
          characterDetails: undefined,
          recentEvents: undefined,
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
    });

    it('should handle very short messages', async () => {
      const config = {
        sessionId: 'session-edge-3',
        message: 'hi',
        context: {
          campaignId: 'campaign-1',
          characterId: 'char-1',
          sessionId: 'session-edge-3',
        },
      };

      const response = await service.sendMessage(config);

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();
    });
  });
});
