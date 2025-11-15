import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRepository } from '../MemoryRepository';
import { MemoryService } from '../MemoryService';
import * as featureFlags from '@/config/featureFlags';
import type { Memory } from '@/components/game/memory/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock importance calculation
vi.mock('@/utils/memory/importance', () => ({
  calculateImportance: vi.fn(() => 3),
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';

describe('Semantic Search', () => {
  let repository: MemoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new MemoryRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RPC Function Integration', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should call match_memories RPC with correct parameters', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.5));
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await repository.matchMemories('session-123', mockEmbedding, 10, 0.7);

      expect(supabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: mockEmbedding,
        session_id: 'session-123',
        match_threshold: 0.7,
        match_count: 10,
      });
    });

    it('should return empty array when semantic search is disabled', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle missing RPC function gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          code: '42883', // PostgreSQL function not found
          message: 'function match_memories does not exist',
        } as any,
      } as any);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toEqual([]);
    });

    it('should handle PGRST202 error code (table/function not in cache)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Schema cache not ready',
        } as any,
      } as any);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toEqual([]);
    });

    it('should handle 404 status error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          status: 404,
          message: 'Not found',
        } as any,
      } as any);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toEqual([]);
    });

    it('should throw on unexpected errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          code: 'UNKNOWN',
          message: 'Unexpected database error',
        } as any,
      } as any);

      await expect(repository.matchMemories('session-123', 'embedding', 10, 0.7)).rejects.toThrow();
    });
  });

  describe('Similarity Scoring and Ranking', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should return memories ranked by similarity score', async () => {
      const mockMemories = [
        {
          id: '1',
          content: 'The knight found a magical sword',
          importance: 4,
          similarity: 0.95,
          session_id: 'session-123',
          type: 'item',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
        {
          id: '2',
          content: 'The knight entered the castle',
          importance: 3,
          similarity: 0.85,
          session_id: 'session-123',
          type: 'location',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
        {
          id: '3',
          content: 'The knight defeated the dragon',
          importance: 5,
          similarity: 0.75,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockMemories,
        error: null,
      } as any);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toHaveLength(3);
      // Verify memories are ordered by similarity (highest first)
      expect(result[0].similarity).toBe(0.95);
      expect(result[1].similarity).toBe(0.85);
      expect(result[2].similarity).toBe(0.75);
    });

    it('should filter memories below threshold', async () => {
      const mockMemories = [
        {
          id: '1',
          content: 'Highly relevant memory',
          importance: 4,
          similarity: 0.9,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
        {
          id: '2',
          content: 'Moderately relevant memory',
          importance: 3,
          similarity: 0.75,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockMemories,
        error: null,
      } as any);

      // Test with threshold 0.8 (should filter second memory)
      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.8);

      // Note: The filtering happens in the database RPC function
      // We're testing that the threshold parameter is passed correctly
      expect(supabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: 'embedding',
        session_id: 'session-123',
        match_threshold: 0.8,
        match_count: 10,
      });
    });

    it('should respect limit parameter', async () => {
      const mockMemories = Array(15)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          content: `Memory ${i}`,
          importance: 3,
          similarity: 0.9 - i * 0.05,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        }));

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockMemories.slice(0, 5), // Database would return only 5
        error: null,
      } as any);

      await repository.matchMemories('session-123', 'embedding', 5, 0.7);

      expect(supabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: 'embedding',
        session_id: 'session-123',
        match_threshold: 0.7,
        match_count: 5,
      });
    });
  });

  describe('Query Embedding Generation', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should generate query embedding before search', async () => {
      const mockQueryEmbedding = JSON.stringify(Array(1536).fill(0.5));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockQueryEmbedding },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await MemoryService.getRelevantMemories('session-123', 'find the magical sword', 10);

      // Verify embedding was generated
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: 'find the magical sword' },
      });

      // Verify RPC was called with the embedding
      expect(supabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: mockQueryEmbedding,
        session_id: 'session-123',
        match_threshold: 0.7,
        match_count: 10,
      });
    });

    it('should handle query embedding generation failure', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Failed to generate embedding' } as any,
      } as any);

      // Mock fallback query
      const mockFallbackData = [
        {
          id: '1',
          content: 'Fallback memory',
          importance: 4,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockFallbackData,
          error: null,
        }),
      } as any);

      const result = await MemoryService.getRelevantMemories('session-123', 'query', 10);

      // Should fall back to loadTopMemories
      expect(result).toHaveLength(1);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to top memories when semantic search is disabled', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      const mockMemories = [
        {
          id: '1',
          content: 'Important memory',
          importance: 5,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockMemories,
          error: null,
        }),
      } as any);

      const result = await MemoryService.getRelevantMemories('session-123', 'query', 10);

      expect(result).toHaveLength(1);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should fall back when no semantic matches found', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [], // No matches
        error: null,
      } as any);

      const mockMemories = [
        {
          id: '1',
          content: 'Fallback memory',
          importance: 4,
          session_id: 'session-123',
          type: 'event',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockMemories,
          error: null,
        }),
      } as any);

      const result = await MemoryService.getRelevantMemories('session-123', 'query', 10);

      expect(result).toHaveLength(1);
    });
  });

  describe('Empty and No Results Scenarios', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should return empty array when no memories exist', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const result = await MemoryService.getRelevantMemories('session-123', 'query', 10);

      expect(result).toEqual([]);
    });

    it('should handle empty query string', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0)) },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const result = await MemoryService.getRelevantMemories('session-123', '', 10);

      expect(result).toEqual([]);
    });

    it('should handle null data from RPC', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await repository.matchMemories('session-123', 'embedding', 10, 0.7);

      expect(result).toEqual([]);
    });
  });

  describe('Session Isolation', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should only return memories from the specified session', async () => {
      const sessionAMemory = {
        id: '1',
        content: 'Session A memory',
        importance: 4,
        similarity: 0.9,
        session_id: 'session-A',
        type: 'event',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [sessionAMemory],
        error: null,
      } as any);

      const result = await repository.matchMemories('session-A', 'embedding', 10, 0.7);

      expect(result).toHaveLength(1);
      expect(result[0].session_id).toBe('session-A');
      expect(supabase.rpc).toHaveBeenCalledWith('match_memories', {
        query_embedding: 'embedding',
        session_id: 'session-A',
        match_threshold: 0.7,
        match_count: 10,
      });
    });
  });

  describe('Different Threshold Values', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should use default threshold of 0.7', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await MemoryService.getRelevantMemories('session-123', 'query', 10);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'match_memories',
        expect.objectContaining({
          match_threshold: 0.7,
        }),
      );
    });

    it('should accept custom threshold values', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await repository.matchMemories('session-123', 'embedding', 10, 0.9);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'match_memories',
        expect.objectContaining({
          match_threshold: 0.9,
        }),
      );
    });

    it('should accept very low threshold for broader results', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await repository.matchMemories('session-123', 'embedding', 10, 0.3);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'match_memories',
        expect.objectContaining({
          match_threshold: 0.3,
        }),
      );
    });
  });
});
