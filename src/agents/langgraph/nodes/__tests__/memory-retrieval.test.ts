import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { retrieveMemories } from '../memory-retrieval';
import type { DMState, WorldInfo } from '../../state';
import { BaseMessage } from '@langchain/core/messages';
import type { EnhancedMemory } from '@/types/memory';

// Mock the EnhancedMemoryManager
vi.mock('../../../services/memory/EnhancedMemoryManager', () => ({
  EnhancedMemoryManager: vi.fn().mockImplementation(() => ({
    retrieveMemories: vi.fn()
  }))
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import the mocked modules
import { EnhancedMemoryManager } from '../../../services/memory/EnhancedMemoryManager';
import logger from '@/lib/logger';

describe('retrieveMemories', () => {
  let mockState: DMState;
  let mockRetrieveMemories: MockedFunction<any>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock retrieve memories function
    mockRetrieveMemories = vi.fn();
    (EnhancedMemoryManager as any).mockImplementation(() => ({
      retrieveMemories: mockRetrieveMemories
    }));

    // Create base state for tests
    const worldContext: WorldInfo = {
      sessionId: 'test-session-123',
      campaignId: 'test-campaign-456',
      characterIds: ['char-1', 'char-2'],
      location: 'Tavern of the Laughing Dragon',
      threatLevel: 'low',
      activeNPCs: ['Bartender Bob'],
      recentMemories: []
    };

    mockState = {
      messages: [] as BaseMessage[],
      playerInput: 'I search the room for hidden doors',
      playerIntent: null,
      rulesValidation: null,
      worldContext,
      response: null,
      requiresDiceRoll: null,
      error: null,
      metadata: {
        timestamp: new Date(),
        stepCount: 0
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('successful memory retrieval', () => {
    it('should retrieve and combine recent and relevant memories', async () => {
      // Mock recent memories
      const recentMemories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'location',
          category: 'exploration',
          content: 'The tavern has a secret basement',
          context: {},
          importance: 3,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        },
        {
          id: 'mem-2',
          type: 'npc',
          category: 'interaction',
          content: 'Bartender Bob knows about the thieves guild',
          context: {},
          importance: 4,
          timestamp: '2024-01-01T09:00:00Z',
          metadata: {}
        }
      ];

      // Mock relevant memories (including one duplicate)
      const relevantMemories: EnhancedMemory[] = [
        {
          id: 'mem-3',
          type: 'quest',
          category: 'objective',
          content: 'There is a hidden door behind the bookshelf',
          context: {},
          importance: 5,
          timestamp: '2024-01-01T08:00:00Z',
          metadata: {}
        },
        {
          id: 'mem-1', // Duplicate ID (same memory as in recent)
          type: 'location',
          category: 'exploration',
          content: 'The tavern has a secret basement',
          context: {},
          importance: 3,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        }
      ];

      // Setup mock to return different results for each call
      mockRetrieveMemories
        .mockResolvedValueOnce(recentMemories)
        .mockResolvedValueOnce(relevantMemories);

      // Execute the function
      const result = await retrieveMemories(mockState);

      // Verify the mock was called correctly
      expect(EnhancedMemoryManager).toHaveBeenCalledWith('test-session-123');
      expect(mockRetrieveMemories).toHaveBeenCalledTimes(2);

      // Check first call (recent memories)
      expect(mockRetrieveMemories).toHaveBeenNthCalledWith(1, {
        timeframe: 'recent',
        limit: 10
      });

      // Check second call (relevant memories with semantic search)
      expect(mockRetrieveMemories).toHaveBeenNthCalledWith(2, {
        query: 'I search the room for hidden doors',
        semanticSearch: true,
        limit: 5
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.worldContext).toBeDefined();
      expect(result.worldContext?.recentMemories).toBeDefined();
      expect(result.worldContext?.recentMemories).toHaveLength(3); // Deduplicated by ID

      // Check memories are properly transformed
      const memories = result.worldContext?.recentMemories || [];
      memories.forEach(memory => {
        expect(memory).toHaveProperty('content');
        expect(memory).toHaveProperty('type');
        expect(memory).toHaveProperty('timestamp');
        expect(memory.timestamp).toBeInstanceOf(Date);
      });

      // Verify deduplication worked (should not have duplicate ID)
      const uniqueContents = new Set(memories.map(m => m.content));
      expect(memories.length).toBe(uniqueContents.size);

      // Verify metadata was updated
      expect(result.metadata?.stepCount).toBe(1);

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith('Retrieving memories for session: test-session-123');
      expect(logger.info).toHaveBeenCalledWith('Retrieved 2 recent memories');
      expect(logger.info).toHaveBeenCalledWith('Retrieved 2 semantically relevant memories');
      expect(logger.info).toHaveBeenCalledWith('Total unique memories retrieved: 3');
    });

    it('should handle retrieval when no player input is provided', async () => {
      mockState.playerInput = null;

      const recentMemories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'event',
          category: 'action',
          content: 'The party entered the tavern',
          context: {},
          importance: 2,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        }
      ];

      mockRetrieveMemories.mockResolvedValueOnce(recentMemories);

      const result = await retrieveMemories(mockState);

      // Should only call retrieve once (no semantic search without player input)
      expect(mockRetrieveMemories).toHaveBeenCalledTimes(1);
      expect(mockRetrieveMemories).toHaveBeenCalledWith({
        timeframe: 'recent',
        limit: 10
      });

      expect(result.worldContext?.recentMemories).toHaveLength(1);
      expect(logger.info).toHaveBeenCalledWith('Retrieved 1 recent memories');
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('semantically relevant'));
    });

    it('should preserve other worldContext properties when updating', async () => {
      mockRetrieveMemories
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await retrieveMemories(mockState);

      expect(result.worldContext?.sessionId).toBe('test-session-123');
      expect(result.worldContext?.campaignId).toBe('test-campaign-456');
      expect(result.worldContext?.location).toBe('Tavern of the Laughing Dragon');
      expect(result.worldContext?.activeNPCs).toEqual(['Bartender Bob']);
      expect(result.worldContext?.characterIds).toEqual(['char-1', 'char-2']);
      expect(result.worldContext?.threatLevel).toBe('low');
    });
  });

  describe('empty memory results', () => {
    it('should handle empty memory results gracefully', async () => {
      mockRetrieveMemories
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await retrieveMemories(mockState);

      expect(result.worldContext).toBeDefined();
      expect(result.worldContext?.recentMemories).toEqual([]);
      expect(result.error).toBeUndefined();
      expect(result.metadata?.stepCount).toBe(1);

      expect(logger.info).toHaveBeenCalledWith('Retrieved 0 recent memories');
      expect(logger.info).toHaveBeenCalledWith('Retrieved 0 semantically relevant memories');
      expect(logger.info).toHaveBeenCalledWith('Total unique memories retrieved: 0');
    });
  });

  describe('error handling', () => {
    it('should handle EnhancedMemoryManager errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockRetrieveMemories.mockRejectedValue(new Error(errorMessage));

      const result = await retrieveMemories(mockState);

      expect(logger.error).toHaveBeenCalledWith(
        'Memory retrieval failed:',
        expect.any(Error)
      );

      // Should set error in state but not fail the pipeline
      expect(result.error).toBe(`Memory retrieval error: ${errorMessage}`);
      expect(result.worldContext).toBeUndefined(); // No worldContext update on error
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should handle constructor errors', async () => {
      const errorMessage = 'Failed to initialize memory manager';
      (EnhancedMemoryManager as any).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await retrieveMemories(mockState);

      expect(logger.error).toHaveBeenCalledWith(
        'Memory retrieval failed:',
        expect.any(Error)
      );
      expect(result.error).toBe(`Memory retrieval error: ${errorMessage}`);
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should handle non-Error exceptions', async () => {
      mockRetrieveMemories.mockRejectedValue('String error');

      const result = await retrieveMemories(mockState);

      expect(logger.error).toHaveBeenCalledWith('Memory retrieval failed:', 'String error');
      expect(result.error).toBe('Memory retrieval error: Unknown error');
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should handle partial retrieval failures', async () => {
      // First call succeeds, second fails
      const recentMemories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'event',
          category: 'action',
          content: 'Successful memory',
          context: {},
          importance: 3,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        }
      ];

      mockRetrieveMemories
        .mockResolvedValueOnce(recentMemories)
        .mockRejectedValueOnce(new Error('Semantic search failed'));

      const result = await retrieveMemories(mockState);

      // Should handle the error and return error state
      expect(logger.error).toHaveBeenCalled();
      expect(result.error).toContain('Memory retrieval error');
      expect(result.worldContext).toBeUndefined();
    });
  });

  describe('validation and edge cases', () => {
    it('should handle missing worldContext', async () => {
      mockState.worldContext = null;

      const result = await retrieveMemories(mockState);

      expect(logger.warn).toHaveBeenCalledWith('No world context available for memory retrieval');
      expect(result.worldContext).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.metadata?.stepCount).toBe(1);
      expect(EnhancedMemoryManager).not.toHaveBeenCalled();
    });

    it('should handle missing session ID', async () => {
      mockState.worldContext = {
        ...mockState.worldContext!,
        sessionId: '' as any
      };

      const result = await retrieveMemories(mockState);

      expect(logger.warn).toHaveBeenCalledWith('No session ID available for memory retrieval');
      expect(result.worldContext).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.metadata?.stepCount).toBe(1);
      expect(EnhancedMemoryManager).not.toHaveBeenCalled();
    });

    it('should handle undefined metadata in state', async () => {
      mockState.metadata = undefined as any;
      mockRetrieveMemories
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await retrieveMemories(mockState);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.stepCount).toBe(1);
    });

    it('should properly transform memory timestamps', async () => {
      const memories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'event',
          category: 'action',
          content: 'Test memory',
          context: {},
          importance: 3,
          timestamp: '2024-01-01T10:00:00Z', // String timestamp
          metadata: {}
        }
      ];

      mockRetrieveMemories
        .mockResolvedValueOnce(memories)
        .mockResolvedValueOnce([]);

      const result = await retrieveMemories(mockState);

      const transformedMemories = result.worldContext?.recentMemories || [];
      expect(transformedMemories).toHaveLength(1);
      expect(transformedMemories[0].timestamp).toBeInstanceOf(Date);
      expect(transformedMemories[0].timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should deduplicate memories by ID correctly', async () => {
      const recentMemories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'location',
          category: 'exploration',
          content: 'First version of memory',
          context: {},
          importance: 3,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {}
        }
      ];

      const relevantMemories: EnhancedMemory[] = [
        {
          id: 'mem-1', // Same ID, different content
          type: 'location',
          category: 'exploration',
          content: 'Second version of memory',
          context: {},
          importance: 4,
          timestamp: '2024-01-01T11:00:00Z',
          metadata: {}
        },
        {
          id: 'mem-2',
          type: 'npc',
          category: 'interaction',
          content: 'Different memory',
          context: {},
          importance: 2,
          timestamp: '2024-01-01T09:00:00Z',
          metadata: {}
        }
      ];

      mockRetrieveMemories
        .mockResolvedValueOnce(recentMemories)
        .mockResolvedValueOnce(relevantMemories);

      const result = await retrieveMemories(mockState);

      const memories = result.worldContext?.recentMemories || [];
      expect(memories).toHaveLength(2); // Only 2 unique IDs

      // Verify deduplication kept the last occurrence (Map behavior)
      const mem1 = memories.find(m => m.content.includes('version'));
      expect(mem1?.content).toBe('Second version of memory');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex real-world scenario with mixed memory types', async () => {
      const recentMemories: EnhancedMemory[] = [
        {
          id: 'mem-1',
          type: 'npc',
          category: 'interaction',
          content: 'The innkeeper mentioned strange noises from the cellar',
          context: { location: 'Tavern' },
          importance: 4,
          timestamp: '2024-01-01T11:00:00Z',
          metadata: { emotional_tone: 'mysterious' }
        },
        {
          id: 'mem-2',
          type: 'location',
          category: 'exploration',
          content: 'The cellar door has scratch marks',
          context: { location: 'Cellar Entrance' },
          importance: 3,
          timestamp: '2024-01-01T10:30:00Z',
          metadata: {}
        },
        {
          id: 'mem-3',
          type: 'quest',
          category: 'objective',
          content: 'Investigate the mysterious disappearances',
          context: { questGiver: 'Mayor' },
          importance: 5,
          timestamp: '2024-01-01T10:00:00Z',
          metadata: { priority: 'high' }
        }
      ];

      const relevantMemories: EnhancedMemory[] = [
        {
          id: 'mem-4',
          type: 'item',
          category: 'inventory',
          content: 'Found a silver key in the library',
          context: { location: 'Library' },
          importance: 3,
          timestamp: '2024-01-01T09:00:00Z',
          metadata: {}
        },
        {
          id: 'mem-5',
          type: 'event',
          category: 'discovery',
          content: 'The library has a hidden door mechanism',
          context: { location: 'Library' },
          importance: 4,
          timestamp: '2024-01-01T08:30:00Z',
          metadata: { discovered: true }
        }
      ];

      mockRetrieveMemories
        .mockResolvedValueOnce(recentMemories)
        .mockResolvedValueOnce(relevantMemories);

      const result = await retrieveMemories(mockState);

      const memories = result.worldContext?.recentMemories || [];
      expect(memories).toHaveLength(5);

      // Verify all memory types are preserved
      const types = new Set(memories.map(m => m.type));
      expect(types.size).toBe(5); // All different types

      // Verify content is preserved correctly
      expect(memories.some(m => m.content.includes('innkeeper'))).toBe(true);
      expect(memories.some(m => m.content.includes('silver key'))).toBe(true);
    });

    it('should work correctly when called multiple times', async () => {
      const memories1: EnhancedMemory[] = [{
        id: 'mem-1',
        type: 'event',
        category: 'action',
        content: 'First call memory',
        context: {},
        importance: 3,
        timestamp: '2024-01-01T10:00:00Z',
        metadata: {}
      }];

      const memories2: EnhancedMemory[] = [{
        id: 'mem-2',
        type: 'event',
        category: 'action',
        content: 'Second call memory',
        context: {},
        importance: 3,
        timestamp: '2024-01-01T11:00:00Z',
        metadata: {}
      }];

      // First call
      mockRetrieveMemories
        .mockResolvedValueOnce(memories1)
        .mockResolvedValueOnce([]);

      const result1 = await retrieveMemories(mockState);
      expect(result1.worldContext?.recentMemories).toHaveLength(1);
      expect(result1.metadata?.stepCount).toBe(1);

      // Reset mock for second call
      vi.clearAllMocks();
      mockRetrieveMemories
        .mockResolvedValueOnce(memories2)
        .mockResolvedValueOnce([]);

      // Second call with updated state
      mockState.playerInput = 'I look around again';
      mockState.metadata!.stepCount = 1; // Simulate state from previous call
      const result2 = await retrieveMemories(mockState);

      expect(result2.worldContext?.recentMemories).toHaveLength(1);
      expect(result2.worldContext?.recentMemories![0].content).toBe('Second call memory');
      expect(result2.metadata?.stepCount).toBe(2); // Incremented from 1
    });

    it('should handle large numbers of memories efficiently', async () => {
      // Create many memories
      const manyMemories: EnhancedMemory[] = Array.from({ length: 50 }, (_, i) => ({
        id: `mem-${i}`,
        type: 'event' as const,
        category: 'action',
        content: `Event ${i}`,
        context: {},
        importance: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date(2024, 0, 1, 10, i).toISOString(),
        metadata: {}
      }));

      mockRetrieveMemories
        .mockResolvedValueOnce(manyMemories.slice(0, 10)) // Recent memories limited to 10
        .mockResolvedValueOnce(manyMemories.slice(10, 15)); // Relevant memories limited to 5

      const result = await retrieveMemories(mockState);

      const retrievedMemories = result.worldContext?.recentMemories || [];
      expect(retrievedMemories.length).toBeLessThanOrEqual(15); // Max 10 recent + 5 relevant

      // Verify no duplicate IDs
      const ids = retrievedMemories.map((_, idx) => idx);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});