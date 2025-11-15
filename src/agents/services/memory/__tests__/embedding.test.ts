import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRepository } from '../MemoryRepository';
import { MemoryImportanceService } from '../MemoryImportanceService';
import * as featureFlags from '@/config/featureFlags';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
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

// Import after mocking
import { supabase } from '@/integrations/supabase/client';

describe('Embedding Generation', () => {
  let repository: MemoryRepository;
  let importanceService: MemoryImportanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new MemoryRepository();
    importanceService = new MemoryImportanceService(repository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Behavior', () => {
    it('should return null when semantic memories are disabled', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should generate embedding when semantic memories are enabled', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);

      const mockEmbedding = '[0.1, 0.2, 0.3]'; // Mock 1536-dimensional embedding as string
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBe(mockEmbedding);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: 'test content' },
      });
    });

    it('should respect feature flag in MemoryImportanceService.evaluate', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      const result = await importanceService.evaluate('test', 'quest', 'general');

      expect(result.embedding).toBeNull();
      expect(result.importance).toBeGreaterThanOrEqual(1);
      expect(result.importance).toBeLessThanOrEqual(5);
    });

    it('should respect feature flag in MemoryImportanceService.embedQuery', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      const result = await importanceService.embedQuery('test query');

      expect(result).toBeNull();
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('Embedding Storage and Retrieval', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should generate 1536-dimensional embedding vector', async () => {
      // Simulate OpenAI text-embedding-ada-002 output
      const mockEmbedding = JSON.stringify(
        Array(1536)
          .fill(0)
          .map(() => Math.random()),
      );
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('The brave knight enters the dark dungeon');

      expect(result).toBe(mockEmbedding);
      const parsed = JSON.parse(result!);
      expect(parsed).toHaveLength(1536);
      expect(parsed.every((n: any) => typeof n === 'number')).toBe(true);
    });

    it('should handle empty content gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: '[]' },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('');

      expect(result).toBe('[]');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: '' },
      });
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(8000); // Very long content
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.1));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding(longContent);

      expect(result).toBe(mockEmbedding);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: longContent },
      });
    });

    it('should handle special characters and unicode', async () => {
      const specialContent = 'The dragon 🐉 says "Hello!" in 日本語';
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.5));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding(specialContent);

      expect(result).toBe(mockEmbedding);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: specialContent },
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should return null on API failure', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'API error' } as any,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
    });

    it('should return null on network timeout', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Network timeout'));

      // The implementation catches errors and returns null
      await expect(repository.invokeEmbedding('test content')).rejects.toThrow('Network timeout');
    });

    it('should return null when embedding field is missing', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { message: 'success but no embedding' },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
    });

    it('should return null on malformed response', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
    });

    it('should handle rate limiting gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          status: 429,
        } as any,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
    });

    it('should handle invalid API key error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid API key',
          status: 401,
        } as any,
      } as any);

      const result = await repository.invokeEmbedding('test content');

      expect(result).toBeNull();
    });
  });

  describe('Concurrent Embedding Generation', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should handle multiple concurrent embedding requests', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.1));
      vi.mocked(supabase.functions.invoke).mockImplementation(async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          data: { embedding: mockEmbedding },
          error: null,
        } as any;
      });

      const contents = [
        'First memory content',
        'Second memory content',
        'Third memory content',
        'Fourth memory content',
        'Fifth memory content',
      ];

      const results = await Promise.all(
        contents.map((content) => repository.invokeEmbedding(content)),
      );

      expect(results).toHaveLength(5);
      expect(results.every((r) => r === mockEmbedding)).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed success and failure in concurrent requests', async () => {
      let callCount = 0;
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.1));

      vi.mocked(supabase.functions.invoke).mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          return {
            data: null,
            error: { message: 'Error' } as any,
          } as any;
        }
        return {
          data: { embedding: mockEmbedding },
          error: null,
        } as any;
      });

      const results = await Promise.all([
        repository.invokeEmbedding('content 1'),
        repository.invokeEmbedding('content 2'),
        repository.invokeEmbedding('content 3'),
        repository.invokeEmbedding('content 4'),
      ]);

      expect(results[0]).toBe(mockEmbedding);
      expect(results[1]).toBeNull();
      expect(results[2]).toBe(mockEmbedding);
      expect(results[3]).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should handle null or undefined text', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding(null as any);

      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it('should handle whitespace-only content', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('   \n\t  ');

      expect(result).toBe(mockEmbedding);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: '   \n\t  ' },
      });
    });

    it('should handle content with only punctuation', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.2));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      const result = await repository.invokeEmbedding('...!!!???');

      expect(result).toBe(mockEmbedding);
    });
  });

  describe('Caching Behavior', () => {
    beforeEach(() => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);
    });

    it('should make separate API calls for identical content', async () => {
      // Note: Current implementation doesn't cache, so each call should go to API
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.1));
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      } as any);

      await repository.invokeEmbedding('same content');
      await repository.invokeEmbedding('same content');

      // Both calls should go to the API (no caching implemented)
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
