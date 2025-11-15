import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRepository } from '../MemoryRepository';
import * as featureFlags from '@/config/featureFlags';
import type { Memory } from '@/components/game/memory/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
      })),
      rpc: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';

describe('Memory Repository', () => {
  let repository: MemoryRepository;
  let mockInsert: any;
  let mockSelect: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockOrder: any;
  let mockLimit: any;
  let mockGte: any;
  let mockSingle: any;
  let mockRpc: any;
  let mockFunctionsInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new MemoryRepository();

    // Setup mock functions
    mockInsert = vi.fn();
    mockSelect = vi.fn();
    mockUpdate = vi.fn();
    mockEq = vi.fn();
    mockOrder = vi.fn();
    mockLimit = vi.fn();
    mockGte = vi.fn();
    mockSingle = vi.fn();
    mockRpc = vi.fn();
    mockFunctionsInvoke = vi.fn();

    // Setup default mock chains
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockOrder.mockReturnThis();
    mockLimit.mockReturnThis();
    mockGte.mockReturnThis();
    mockSingle.mockReturnThis();
    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnThis(),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      gte: mockGte,
      single: mockSingle,
    } as any);
    vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);
    vi.mocked(supabase.functions.invoke).mockImplementation(mockFunctionsInvoke as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Database Operations', () => {
    describe('insertMemories', () => {
      it('should insert single memory successfully', async () => {
        mockInsert.mockResolvedValue({
          data: null,
          error: null,
        });

        vi.mocked(supabase.from).mockReturnValue({
          insert: mockInsert,
        } as any);

        const memory = {
          session_id: 'session-123',
          type: 'quest',
          content: 'Find the ancient artifact',
          importance: 5,
          embedding: JSON.stringify(Array(1536).fill(0.5)),
          metadata: { category: 'main_quest' },
        };

        await repository.insertMemories([memory]);

        expect(mockInsert).toHaveBeenCalledWith([memory]);
      });

      it('should insert multiple memories in batch', async () => {
        mockInsert.mockResolvedValue({
          data: null,
          error: null,
        });

        const memories = Array(10)
          .fill(null)
          .map((_, i) => ({
            session_id: 'session-123',
            type: 'event',
            content: `Event ${i}`,
            importance: 3,
            embedding: JSON.stringify(Array(1536).fill(0.5)),
            metadata: null,
          }));

        await repository.insertMemories(memories);

        expect(mockInsert).toHaveBeenCalledWith(memories);
      });

      it('should handle empty array gracefully', async () => {
        await repository.insertMemories([]);

        expect(mockInsert).not.toHaveBeenCalled();
      });

      it('should throw error on insert failure', async () => {
        mockInsert.mockResolvedValue({
          data: null,
          error: { message: 'Insert failed', code: '23505' },
        });

        const memory = {
          session_id: 'session-123',
          type: 'quest',
          content: 'Test',
          importance: 3,
          embedding: null,
          metadata: null,
        };

        await expect(repository.insertMemories([memory])).rejects.toThrow();
      });

      it('should handle constraint violations', async () => {
        mockInsert.mockResolvedValue({
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
          },
        });

        const memory = {
          session_id: 'session-123',
          type: 'quest',
          content: 'Duplicate content',
          importance: 3,
          embedding: null,
          metadata: null,
        };

        await expect(repository.insertMemories([memory])).rejects.toThrow();
      });
    });

    describe('loadRecentMemories', () => {
      it('should load recent memories with default limit', async () => {
        const mockMemories = Array(5)
          .fill(null)
          .map((_, i) => ({
            id: `${i}`,
            session_id: 'session-123',
            type: 'event',
            content: `Recent memory ${i}`,
            importance: 3,
            created_at: new Date(Date.now() - i * 60000).toISOString(),
            updated_at: new Date().toISOString(),
            metadata: null,
          }));

        mockLimit.mockResolvedValue({
          data: mockMemories,
          error: null,
        });

        const results = await repository.loadRecentMemories('session-123');

        expect(results).toEqual(mockMemories);
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockEq).toHaveBeenCalledWith('session_id', 'session-123');
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(mockLimit).toHaveBeenCalledWith(5);
      });

      it('should load recent memories with custom limit', async () => {
        const mockMemories = Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `${i}`,
            session_id: 'session-123',
            type: 'event',
            content: `Memory ${i}`,
            importance: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: null,
          }));

        mockLimit.mockResolvedValue({
          data: mockMemories,
          error: null,
        });

        const results = await repository.loadRecentMemories('session-123', 10);

        expect(results).toHaveLength(10);
        expect(mockLimit).toHaveBeenCalledWith(10);
      });

      it('should handle empty results', async () => {
        mockLimit.mockResolvedValue({
          data: [],
          error: null,
        });

        const results = await repository.loadRecentMemories('session-123');

        expect(results).toEqual([]);
      });

      it('should throw error on query failure', async () => {
        mockLimit.mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        });

        await expect(repository.loadRecentMemories('session-123')).rejects.toThrow();
      });
    });

    describe('loadTopMemories', () => {
      it('should load memories ordered by importance', async () => {
        const mockMemories = [
          {
            id: '1',
            session_id: 'session-123',
            type: 'quest',
            content: 'High importance',
            importance: 5,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            metadata: null,
          },
          {
            id: '2',
            session_id: 'session-123',
            type: 'event',
            content: 'Medium importance',
            importance: 3,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            metadata: null,
          },
        ];

        mockLimit.mockResolvedValue({
          data: mockMemories,
          error: null,
        });

        const results = await repository.loadTopMemories('session-123', 10);

        expect(results).toEqual(mockMemories);
        expect(mockOrder).toHaveBeenCalledWith('importance', { ascending: false });
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      });

      it('should respect limit parameter', async () => {
        const mockMemories = Array(20)
          .fill(null)
          .map((_, i) => ({
            id: `${i}`,
            session_id: 'session-123',
            type: 'event',
            content: `Memory ${i}`,
            importance: 5 - Math.floor(i / 4),
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            metadata: null,
          }));

        mockLimit.mockResolvedValue({
          data: mockMemories.slice(0, 15),
          error: null,
        });

        await repository.loadTopMemories('session-123', 15);

        expect(mockLimit).toHaveBeenCalledWith(15);
      });
    });

    describe('loadFictionReadyMemories', () => {
      it('should load memories with high narrative weight', async () => {
        const mockMemories = [
          {
            id: '1',
            session_id: 'session-123',
            type: 'plot_point',
            content: 'Major plot reveal',
            importance: 5,
            narrative_weight: 9,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            metadata: null,
          },
          {
            id: '2',
            session_id: 'session-123',
            type: 'character_moment',
            content: 'Character development',
            importance: 4,
            narrative_weight: 8,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            metadata: null,
          },
        ];

        mockOrder.mockResolvedValue({
          data: mockMemories,
          error: null,
        });

        const results = await repository.loadFictionReadyMemories('session-123', 6);

        expect(results).toEqual(mockMemories);
        expect(mockGte).toHaveBeenCalledWith('narrative_weight', 6);
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
      });
    });

    describe('updateMemoryScores', () => {
      it('should update importance score', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        });

        mockUpdate.mockReturnValue({
          eq: mockEq,
        });

        vi.mocked(supabase.from).mockReturnValue({
          update: mockUpdate,
        } as any);

        await repository.updateMemoryScores('memory-123', {
          importance: 4,
        });

        expect(mockUpdate).toHaveBeenCalledWith({ importance: 4 });
        expect(mockEq).toHaveBeenCalledWith('id', 'memory-123');
      });

      it('should update narrative weight', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        });

        mockUpdate.mockReturnValue({
          eq: mockEq,
        });

        vi.mocked(supabase.from).mockReturnValue({
          update: mockUpdate,
        } as any);

        await repository.updateMemoryScores('memory-123', {
          narrative_weight: 7,
        });

        expect(mockUpdate).toHaveBeenCalledWith({ narrative_weight: 7 });
      });

      it('should update both scores simultaneously', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        });

        mockUpdate.mockReturnValue({
          eq: mockEq,
        });

        vi.mocked(supabase.from).mockReturnValue({
          update: mockUpdate,
        } as any);

        await repository.updateMemoryScores('memory-123', {
          importance: 5,
          narrative_weight: 9,
        });

        expect(mockUpdate).toHaveBeenCalledWith({
          importance: 5,
          narrative_weight: 9,
        });
      });

      it('should throw error on update failure', async () => {
        mockUpdate.mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        });

        await expect(
          repository.updateMemoryScores('memory-123', { importance: 4 }),
        ).rejects.toThrow();
      });
    });

    describe('fetchMemoryById', () => {
      it('should fetch memory by ID', async () => {
        const mockMemory = {
          importance: 4,
          narrative_weight: 7,
        };

        mockSingle.mockResolvedValue({
          data: mockMemory,
          error: null,
        });

        const result = await repository.fetchMemoryById('memory-123');

        expect(result).toEqual(mockMemory);
        expect(mockSelect).toHaveBeenCalledWith('importance, narrative_weight');
        expect(mockEq).toHaveBeenCalledWith('id', 'memory-123');
      });

      it('should return null when memory not found', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        });

        const result = await repository.fetchMemoryById('non-existent');

        expect(result).toBeNull();
      });

      it('should return null on error', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        });

        const result = await repository.fetchMemoryById('memory-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('RPC Function Calls', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should call match_memories RPC with correct parameters', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.5));
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await repository.matchMemories('session-123', mockEmbedding, 10, 0.7);

      expect(mockRpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: mockEmbedding,
        session_id: 'session-123',
        match_threshold: 0.7,
        match_count: 10,
      });
    });

    it('should return data from RPC call', async () => {
      const mockMemories = [
        {
          id: '1',
          content: 'Test memory',
          similarity: 0.9,
          session_id: 'session-123',
          type: 'event',
          importance: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      const results = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(results).toEqual(mockMemories);
    });

    it('should handle null data from RPC', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const results = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(results).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockInsert.mockRejectedValue(new Error('Connection timeout'));

      const memory = {
        session_id: 'session-123',
        type: 'event',
        content: 'Test',
        importance: 3,
        embedding: null,
        metadata: null,
      };

      await expect(repository.insertMemories([memory])).rejects.toThrow('Connection timeout');
    });

    it('should handle malformed data errors', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: {
          message: 'invalid input syntax for type json',
          code: '22P02',
        },
      });

      const memory = {
        session_id: 'session-123',
        type: 'event',
        content: 'Test',
        importance: 3,
        embedding: 'invalid json',
        metadata: null,
      };

      await expect(repository.insertMemories([memory])).rejects.toThrow();
    });

    it('should handle foreign key constraint violations', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: {
          message: 'insert or update on table "memories" violates foreign key constraint',
          code: '23503',
        },
      });

      const memory = {
        session_id: 'non-existent-session',
        type: 'event',
        content: 'Test',
        importance: 3,
        embedding: null,
        metadata: null,
      };

      await expect(repository.insertMemories([memory])).rejects.toThrow();
    });

    it('should handle RPC function not found errors gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          code: '42883',
          message: 'function match_memories does not exist',
        },
      });

      const results = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(results).toEqual([]);
    });

    it('should throw on unexpected RPC errors', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);

      mockRpc.mockResolvedValue({
        data: null,
        error: {
          code: 'UNEXPECTED',
          message: 'Something went wrong',
        },
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);

      await expect(repository.matchMemories('session-123', 'embedding', 10, 0.7)).rejects.toThrow();
    });
  });

  describe('Transaction Handling', () => {
    it('should handle successful batch insert as transaction', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memories = Array(100)
        .fill(null)
        .map((_, i) => ({
          session_id: 'session-123',
          type: 'event',
          content: `Memory ${i}`,
          importance: 3,
          embedding: JSON.stringify(Array(1536).fill(0.5)),
          metadata: null,
        }));

      await repository.insertMemories(memories);

      // All memories should be inserted in one call (transaction)
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(memories);
    });

    it('should rollback on partial insert failure', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: {
          message: 'Partial insert failed',
          code: '23505',
        },
      });

      const memories = Array(50)
        .fill(null)
        .map((_, i) => ({
          session_id: 'session-123',
          type: 'event',
          content: `Memory ${i}`,
          importance: 3,
          embedding: null,
          metadata: null,
        }));

      await expect(repository.insertMemories(memories)).rejects.toThrow();
    });
  });

  describe('Data Transformation', () => {
    it('should transform database memory to EnhancedMemory format', async () => {
      const dbMemory = {
        id: 'mem-123',
        type: 'quest',
        content: 'Find the artifact',
        created_at: '2024-01-01T00:00:00Z',
        importance: 5,
        metadata: {
          category: 'main_quest',
          context: JSON.stringify({
            location: 'Ancient Temple',
            npcs: ['High Priest'],
          }),
        },
      };

      const enhanced = await repository.transformDatabaseMemory(dbMemory);

      expect(enhanced).toEqual({
        id: 'mem-123',
        type: 'quest',
        content: 'Find the artifact',
        timestamp: '2024-01-01T00:00:00Z',
        importance: 5,
        category: 'main_quest',
        context: {
          location: 'Ancient Temple',
          npcs: ['High Priest'],
        },
        metadata: {
          category: 'main_quest',
          context: JSON.stringify({
            location: 'Ancient Temple',
            npcs: ['High Priest'],
          }),
        },
      });
    });

    it('should handle missing metadata gracefully', async () => {
      const dbMemory = {
        id: 'mem-123',
        type: 'event',
        content: 'Simple event',
        created_at: '2024-01-01T00:00:00Z',
        importance: 3,
        metadata: null,
      };

      const enhanced = await repository.transformDatabaseMemory(dbMemory);

      expect(enhanced.category).toBe('general');
      expect(enhanced.context).toEqual({});
      expect(enhanced.metadata).toEqual({});
    });

    it('should handle missing importance', async () => {
      const dbMemory = {
        id: 'mem-123',
        type: 'event',
        content: 'Event without importance',
        created_at: '2024-01-01T00:00:00Z',
        metadata: null,
      };

      const enhanced = await repository.transformDatabaseMemory(dbMemory);

      expect(enhanced.importance).toBe(0);
    });

    it('should handle malformed context JSON', async () => {
      const dbMemory = {
        id: 'mem-123',
        type: 'event',
        content: 'Event',
        created_at: '2024-01-01T00:00:00Z',
        importance: 3,
        metadata: {
          category: 'general',
          context: 'invalid json',
        },
      };

      // Current implementation throws on invalid JSON
      await expect(repository.transformDatabaseMemory(dbMemory)).rejects.toThrow();
    });
  });

  describe('Query Options', () => {
    it('should filter by category', async () => {
      const mockMemories = [
        {
          id: '1',
          type: 'npc',
          content: 'NPC memory',
          created_at: '2024-01-01T00:00:00Z',
          metadata: { category: 'npc' },
        },
      ];

      mockLimit.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      await repository.fetchMemories('session-123', {
        category: 'npc',
      });

      expect(mockEq).toHaveBeenCalledWith('metadata->category', 'npc');
    });

    it('should filter by timeframe', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      await repository.fetchMemories('session-123', {
        timeframe: 'recent',
      });

      // Should call gte with a timestamp from 30 minutes ago
      expect(mockGte).toHaveBeenCalled();
      const gteCall = mockGte.mock.calls[0];
      expect(gteCall[0]).toBe('created_at');
      expect(typeof gteCall[1]).toBe('string');
    });

    it('should apply limit', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      await repository.fetchMemories('session-123', {
        limit: 20,
      });

      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should combine multiple filters', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      await repository.fetchMemories('session-123', {
        category: 'quest',
        timeframe: 'recent',
        limit: 10,
      });

      expect(mockEq).toHaveBeenCalledWith('metadata->category', 'quest');
      expect(mockGte).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });
});
