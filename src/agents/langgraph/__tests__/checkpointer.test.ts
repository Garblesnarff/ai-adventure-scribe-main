/**
 * LangGraph Checkpointer Tests
 *
 * Tests for state persistence using SupabaseCheckpointer:
 * - Checkpoint save/load operations
 * - Checkpoint creation with thread IDs
 * - State recovery from checkpoints
 * - Multiple checkpoint handling (history)
 * - Database integration (mocked Supabase)
 * - Serialization/deserialization
 *
 * @module agents/langgraph/__tests__
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SupabaseCheckpointer } from '../persistence/supabase-checkpointer';
import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('LangGraph Checkpointer', () => {
  let checkpointer: SupabaseCheckpointer;
  let mockFrom: any;
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain
    mockQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
    };

    mockFrom = vi.fn().mockReturnValue(mockQuery);
    mockSupabaseClient.from = mockFrom;

    checkpointer = new SupabaseCheckpointer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Checkpoint Save Operations', () => {
    it('should save checkpoint to Supabase', async () => {
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        channel_values: {
          messages: [
            new HumanMessage({ content: 'Hello' }),
            new AIMessage({ content: 'Hi there' }),
          ],
          playerInput: 'Hello',
          playerIntent: 'social',
        },
      };

      const metadata: CheckpointMetadata = {
        parent_checkpoint_id: null,
        source: 'update',
        step: 1,
        writes: {},
      };

      mockQuery.upsert.mockResolvedValue({ error: null });

      await checkpointer.put({ configurable: { thread_id: 'thread-1' } }, checkpoint, metadata);

      expect(mockFrom).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.upsert).toHaveBeenCalled();

      const upsertCall = mockQuery.upsert.mock.calls[0][0];
      expect(upsertCall.thread_id).toBe('thread-1');
      expect(upsertCall.checkpoint_id).toBe('checkpoint-1');
    });

    it('should throw error if thread_id is missing', async () => {
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        channel_values: {},
      };

      const metadata: CheckpointMetadata = {
        parent_checkpoint_id: null,
        source: 'update',
        step: 1,
        writes: {},
      };

      await expect(checkpointer.put({ configurable: {} }, checkpoint, metadata)).rejects.toThrow(
        'thread_id is required',
      );
    });

    it('should handle upsert errors gracefully', async () => {
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        channel_values: {},
      };

      const metadata: CheckpointMetadata = {
        parent_checkpoint_id: null,
        source: 'update',
        step: 1,
        writes: {},
      };

      mockQuery.upsert.mockResolvedValue({
        error: new Error('Database error'),
      });

      await expect(
        checkpointer.put({ configurable: { thread_id: 'thread-1' } }, checkpoint, metadata),
      ).rejects.toThrow();
    });

    it('should serialize checkpoint data correctly', async () => {
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        channel_values: {
          messages: [new HumanMessage({ content: 'Test' })],
          playerIntent: 'attack',
          metadata: {
            timestamp: new Date(),
            stepCount: 5,
          },
        },
      };

      const metadata: CheckpointMetadata = {
        parent_checkpoint_id: null,
        source: 'update',
        step: 1,
        writes: {},
      };

      mockQuery.upsert.mockResolvedValue({ error: null });

      await checkpointer.put({ configurable: { thread_id: 'thread-1' } }, checkpoint, metadata);

      const upsertCall = mockQuery.upsert.mock.calls[0][0];
      expect(upsertCall.state).toBeDefined();
      expect(upsertCall.metadata).toBe(metadata);
    });
  });

  describe('Checkpoint Load Operations', () => {
    it('should load latest checkpoint for thread', async () => {
      const storedCheckpoint = {
        id: 'db-row-1',
        thread_id: 'thread-1',
        checkpoint_id: 'checkpoint-1',
        state: {
          id: 'checkpoint-1',
          channel_values: {
            messages: [],
            playerInput: 'test',
          },
        },
        metadata: {},
        created_at: new Date().toISOString(),
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: storedCheckpoint,
        error: null,
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(mockFrom).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.eq).toHaveBeenCalledWith('thread_id', 'thread-1');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
      expect(result?.id).toBe('checkpoint-1');
    });

    it('should return undefined if no checkpoint exists', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'nonexistent-thread' },
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined if thread_id is missing', async () => {
      const result = await checkpointer.get({ configurable: {} });

      expect(result).toBeUndefined();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result).toBeUndefined();
    });

    it('should deserialize checkpoint data correctly', async () => {
      const storedCheckpoint = {
        id: 'db-row-1',
        thread_id: 'thread-1',
        checkpoint_id: 'checkpoint-1',
        state: {
          id: 'checkpoint-1',
          channel_values: {
            messages: [{ content: 'Test', type: 'human' }],
            playerIntent: 'exploration',
          },
        },
        metadata: { step: 3 },
        created_at: new Date().toISOString(),
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: storedCheckpoint,
        error: null,
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result).toBeDefined();
      expect(result?.channel_values).toBeDefined();
      expect(result?.channel_values.playerIntent).toBe('exploration');
    });
  });

  describe('Checkpoint List Operations', () => {
    it('should list all checkpoints for a thread', async () => {
      const checkpoints = [
        {
          id: 'db-row-1',
          thread_id: 'thread-1',
          checkpoint_id: 'checkpoint-1',
          state: { id: 'checkpoint-1', channel_values: {} },
          metadata: { step: 1 },
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'db-row-2',
          thread_id: 'thread-1',
          checkpoint_id: 'checkpoint-2',
          state: { id: 'checkpoint-2', channel_values: {} },
          metadata: { step: 2 },
          created_at: '2024-01-01T00:01:00Z',
        },
      ];

      mockQuery.maybeSingle = undefined; // Remove for list operation
      mockQuery.then = vi.fn((cb) => cb({ data: checkpoints, error: null }));

      const result = await checkpointer.list({
        configurable: { thread_id: 'thread-1' },
      });

      expect(mockFrom).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.eq).toHaveBeenCalledWith('thread_id', 'thread-1');
      expect(result).toHaveLength(2);
      expect(result[0].checkpoint.id).toBe('checkpoint-1');
      expect(result[1].checkpoint.id).toBe('checkpoint-2');
    });

    it('should respect limit parameter', async () => {
      const checkpoints = Array.from({ length: 10 }, (_, i) => ({
        id: `db-row-${i}`,
        thread_id: 'thread-1',
        checkpoint_id: `checkpoint-${i}`,
        state: { id: `checkpoint-${i}`, channel_values: {} },
        metadata: { step: i },
        created_at: new Date().toISOString(),
      }));

      mockQuery.then = vi.fn((cb) => cb({ data: checkpoints, error: null }));

      await checkpointer.list({ configurable: { thread_id: 'thread-1' } }, 5);

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array if no checkpoints exist', async () => {
      mockQuery.then = vi.fn((cb) => cb({ data: null, error: null }));

      const result = await checkpointer.list({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result).toEqual([]);
    });

    it('should handle database errors in list', async () => {
      mockQuery.then = vi.fn((cb) => cb({ data: null, error: new Error('DB error') }));

      const result = await checkpointer.list({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result).toEqual([]);
    });
  });

  describe('Checkpoint Deletion', () => {
    it('should delete specific checkpoint', async () => {
      mockQuery.delete.mockResolvedValue({ error: null });

      await checkpointer.deleteCheckpoint('thread-1', 'checkpoint-1');

      expect(mockFrom).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('thread_id', 'thread-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('checkpoint_id', 'checkpoint-1');
    });

    it('should delete all checkpoints for thread', async () => {
      mockQuery.delete.mockResolvedValue({ error: null });

      await checkpointer.deleteThread('thread-1');

      expect(mockFrom).toHaveBeenCalledWith('agent_checkpoints');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('thread_id', 'thread-1');
    });

    it('should handle deletion errors', async () => {
      mockQuery.delete.mockResolvedValue({ error: new Error('Delete failed') });

      await expect(checkpointer.deleteCheckpoint('thread-1', 'checkpoint-1')).rejects.toThrow();
    });
  });

  describe('State Recovery', () => {
    it('should recover complete state from checkpoint', async () => {
      const completeState = {
        id: 'checkpoint-full',
        channel_values: {
          messages: [new HumanMessage({ content: 'Hello' }), new AIMessage({ content: 'Hi' })],
          playerInput: 'Hello',
          playerIntent: 'social',
          rulesValidation: {
            isValid: true,
            reasoning: 'Valid greeting',
            modifications: [],
          },
          response: {
            description: 'The NPC waves back',
            atmosphere: 'friendly',
          },
          metadata: {
            timestamp: new Date(),
            stepCount: 3,
          },
        },
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: {
          id: 'db-row-1',
          thread_id: 'thread-1',
          checkpoint_id: 'checkpoint-full',
          state: completeState,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const recovered = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(recovered).toBeDefined();
      expect(recovered?.channel_values).toBeDefined();
      expect(recovered?.channel_values.playerInput).toBe('Hello');
      expect(recovered?.channel_values.playerIntent).toBe('social');
    });

    it('should handle partial state recovery', async () => {
      const partialState = {
        id: 'checkpoint-partial',
        channel_values: {
          playerInput: 'test',
          playerIntent: null,
        },
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: {
          state: partialState,
        },
        error: null,
      });

      const recovered = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(recovered?.channel_values.playerInput).toBe('test');
      expect(recovered?.channel_values.playerIntent).toBeNull();
    });
  });

  describe('Multiple Checkpoint Handling', () => {
    it('should maintain checkpoint history', async () => {
      const checkpoints = [
        {
          checkpoint_id: 'checkpoint-1',
          state: { id: 'checkpoint-1', channel_values: { step: 1 } },
          metadata: { step: 1 },
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          checkpoint_id: 'checkpoint-2',
          state: { id: 'checkpoint-2', channel_values: { step: 2 } },
          metadata: { step: 2 },
          created_at: '2024-01-01T00:01:00Z',
        },
        {
          checkpoint_id: 'checkpoint-3',
          state: { id: 'checkpoint-3', channel_values: { step: 3 } },
          metadata: { step: 3 },
          created_at: '2024-01-01T00:02:00Z',
        },
      ];

      mockQuery.then = vi.fn((cb) => cb({ data: checkpoints, error: null }));

      const history = await checkpointer.list({
        configurable: { thread_id: 'thread-1' },
      });

      expect(history).toHaveLength(3);
      expect(history[0].checkpoint.id).toBe('checkpoint-1');
      expect(history[1].checkpoint.id).toBe('checkpoint-2');
      expect(history[2].checkpoint.id).toBe('checkpoint-3');
    });

    it('should retrieve checkpoints in chronological order', async () => {
      mockQuery.then = vi.fn((cb) => cb({ data: [], error: null }));

      await checkpointer.list({
        configurable: { thread_id: 'thread-1' },
      });

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('Serialization and Deserialization', () => {
    it('should serialize complex state objects', async () => {
      const complexState: Checkpoint = {
        id: 'checkpoint-complex',
        channel_values: {
          messages: [
            new HumanMessage({ content: 'Test', additional_kwargs: { metadata: 'data' } }),
          ],
          worldContext: {
            campaignId: 'campaign-1',
            recentMemories: [{ content: 'Memory 1', type: 'event', timestamp: new Date() }],
          },
          metadata: {
            timestamp: new Date(),
            stepCount: 5,
            tokensUsed: 1000,
          },
        },
      };

      mockQuery.upsert.mockResolvedValue({ error: null });

      await checkpointer.put({ configurable: { thread_id: 'thread-1' } }, complexState, {
        parent_checkpoint_id: null,
        source: 'update',
        step: 1,
        writes: {},
      });

      const savedState = mockQuery.upsert.mock.calls[0][0].state;
      expect(savedState).toBeDefined();
      expect(savedState.channel_values).toBeDefined();
    });

    it('should deserialize complex state objects', async () => {
      const complexStoredState = {
        state: {
          id: 'checkpoint-1',
          channel_values: {
            worldContext: {
              campaignId: 'campaign-1',
              recentMemories: [
                { content: 'Test', type: 'event', timestamp: new Date().toISOString() },
              ],
            },
          },
        },
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: complexStoredState,
        error: null,
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result?.channel_values.worldContext).toBeDefined();
      expect(result?.channel_values.worldContext.campaignId).toBe('campaign-1');
    });
  });

  describe('Thread Management', () => {
    it('should isolate checkpoints by thread_id', async () => {
      // Save to thread-1
      mockQuery.upsert.mockResolvedValue({ error: null });
      await checkpointer.put(
        { configurable: { thread_id: 'thread-1' } },
        { id: 'checkpoint-1', channel_values: {} },
        { parent_checkpoint_id: null, source: 'update', step: 1, writes: {} },
      );

      // Load from thread-2
      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-2' },
      });

      expect(result).toBeUndefined();
    });

    it('should support multiple concurrent threads', async () => {
      mockQuery.upsert.mockResolvedValue({ error: null });

      const threads = ['thread-1', 'thread-2', 'thread-3'];

      for (const threadId of threads) {
        await checkpointer.put(
          { configurable: { thread_id: threadId } },
          { id: `checkpoint-${threadId}`, channel_values: {} },
          { parent_checkpoint_id: null, source: 'update', step: 1, writes: {} },
        );
      }

      expect(mockQuery.upsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery', () => {
    it('should handle corrupted checkpoint data', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: {
          state: null, // Corrupted data
        },
        error: null,
      });

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      mockQuery.maybeSingle.mockRejectedValue(new Error('Network timeout'));

      const result = await checkpointer.get({
        configurable: { thread_id: 'thread-1' },
      });

      expect(result).toBeUndefined();
    });
  });
});
