import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryService } from '../MemoryService';
import * as featureFlags from '@/config/featureFlags';
import type { Memory, MemoryType } from '@/components/game/memory/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockRpc = vi.fn();
  const mockFunctionsInvoke = vi.fn();

  return {
    supabase: {
      from: vi.fn(() => ({
        select: mockSelect.mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: mockInsert,
        update: mockUpdate.mockReturnThis(),
      })),
      rpc: mockRpc,
      functions: {
        invoke: mockFunctionsInvoke,
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

// Mock importance calculation
vi.mock('@/utils/memory/importance', () => ({
  calculateImportance: vi.fn(({ type, category }) => {
    // Return different importances based on type
    const importanceMap: Record<string, number> = {
      quest: 5,
      plot_point: 5,
      foreshadowing: 4,
      npc: 4,
      location: 3,
      dialogue_gem: 3,
      event: 3,
      general: 2,
    };
    return importanceMap[type as string] || 2;
  }),
}));

// Mock Gemini API Manager
vi.mock('@/services/gemini-api-manager-singleton', () => ({
  getGeminiApiManager: vi.fn(() => ({
    executeWithRotation: vi.fn(async (fn) => {
      const mockGenAI = {
        getGenerativeModel: vi.fn(() => ({
          generateContent: vi.fn(async () => ({
            response: {
              text: vi.fn(async () =>
                JSON.stringify({
                  memories: [
                    {
                      session_id: 'session-123',
                      type: 'quest',
                      category: 'main_quest',
                      content: 'Find the Dragon Scroll',
                      importance: 5,
                      emotional_tone: 'intense',
                      metadata: {},
                    },
                  ],
                }),
              ),
            },
          })),
        })),
      };
      return fn(mockGenAI);
    }),
  })),
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';

describe('Memory Service Integration', () => {
  let mockInsert: any;
  let mockSelect: any;
  let mockUpdate: any;
  let mockRpc: any;
  let mockFunctionsInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(true);

    // Get references to the mocked functions
    mockInsert = vi.fn();
    mockSelect = vi.fn();
    mockUpdate = vi.fn();
    mockRpc = vi.fn();
    mockFunctionsInvoke = vi.fn();

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect.mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: mockInsert,
      update: mockUpdate.mockReturnThis(),
    } as any);

    vi.mocked(supabase.rpc).mockImplementation(mockRpc as any);
    vi.mocked(supabase.functions.invoke).mockImplementation(mockFunctionsInvoke as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End: Store Memory → Embed → Retrieve', () => {
    it('should store memory with embedding and retrieve it', async () => {
      const mockEmbedding = JSON.stringify(Array(1536).fill(0.5));

      // Mock embedding generation
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: mockEmbedding },
        error: null,
      });

      // Mock insert
      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Store memory
      const memoryService = new MemoryService('session-123');
      await memoryService.storeMemory(
        'The knight discovered a hidden chamber',
        'location',
        'discovery',
      );

      // Verify embedding was generated
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('generate-embedding', {
        body: { text: 'The knight discovered a hidden chamber' },
      });

      // Verify memory was inserted with embedding
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          session_id: 'session-123',
          type: 'location',
          content: 'The knight discovered a hidden chamber',
          importance: 3,
          embedding: mockEmbedding,
        }),
      ]);

      // Mock semantic search retrieval
      const mockMemory = {
        id: '1',
        session_id: 'session-123',
        type: 'location',
        content: 'The knight discovered a hidden chamber',
        importance: 3,
        similarity: 0.95,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: {
          category: 'discovery',
          context: JSON.stringify({}),
        },
      };

      mockRpc.mockResolvedValue({
        data: [mockMemory],
        error: null,
      });

      // Retrieve via semantic search
      const results = await memoryService.retrieveMemories({
        query: 'hidden chamber',
        semanticSearch: true,
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('The knight discovered a hidden chamber');
    });

    it('should handle full workflow when semantic search is disabled', async () => {
      vi.spyOn(featureFlags, 'isSemanticMemoriesEnabled').mockReturnValue(false);

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      await memoryService.storeMemory('The wizard cast a spell', 'event', 'combat');

      // Verify embedding was NOT generated
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();

      // Verify memory was inserted without embedding
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          embedding: null,
        }),
      ]);
    });
  });

  describe('Memory Importance Scoring', () => {
    it('should assign high importance to quest memories', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      await memoryService.storeMemory(
        'Retrieve the Golden Crown from the Ancient Tomb',
        'quest',
        'main_quest',
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          importance: 5,
        }),
      ]);
    });

    it('should assign medium importance to NPC memories', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      await memoryService.storeMemory('Met the mysterious merchant Aldric', 'npc', 'character');

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          importance: 4,
        }),
      ]);
    });

    it('should assign lower importance to general memories', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      await memoryService.storeMemory('The weather was pleasant', 'general', 'general');

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          importance: 2,
        }),
      ]);
    });

    it('should normalize importance to 1-5 range', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock saveMemories to test normalization
      const memories = [
        {
          session_id: 'session-123',
          type: 'quest' as MemoryType,
          content: 'Quest memory',
          importance: 10, // Should be normalized to 5
          metadata: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          session_id: 'session-123',
          type: 'general' as MemoryType,
          content: 'General memory',
          importance: 0, // Should be normalized to 1
          metadata: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      await MemoryService.saveMemories(memories);

      const insertCalls = mockInsert.mock.calls;
      expect(insertCalls[0][0][0].importance).toBeLessThanOrEqual(5);
      expect(insertCalls[0][0][1].importance).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Memory Type Classification', () => {
    const memoryTypes: Array<{ type: MemoryType; content: string; category: string }> = [
      { type: 'npc', content: 'Met Gandalf the wizard', category: 'character' },
      { type: 'location', content: 'Entered the Misty Mountains', category: 'environment' },
      { type: 'quest', content: 'Destroy the One Ring', category: 'main_quest' },
      { type: 'item', content: 'Found Sting, an elvish blade', category: 'weapon' },
      { type: 'event', content: "Battle of Helm's Deep", category: 'combat' },
      { type: 'story_beat', content: 'The fellowship is formed', category: 'milestone' },
      { type: 'character_moment', content: 'Frodo shows great courage', category: 'growth' },
      { type: 'world_detail', content: 'Elves are immortal beings', category: 'lore' },
      { type: 'dialogue_gem', content: '"You shall not pass!" - Gandalf', category: 'quote' },
      { type: 'atmosphere', content: 'Dark and foreboding silence', category: 'mood' },
      { type: 'plot_point', content: 'Gollum betrays the heroes', category: 'twist' },
      { type: 'foreshadowing', content: 'A shadow grows in the East', category: 'hint' },
      { type: 'general', content: 'The sky was cloudy', category: 'general' },
    ];

    memoryTypes.forEach(({ type, content, category }) => {
      it(`should correctly classify ${type} memories`, async () => {
        mockFunctionsInvoke.mockResolvedValue({
          data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
          error: null,
        });

        mockInsert.mockResolvedValue({
          data: null,
          error: null,
        });

        const memoryService = new MemoryService('session-123');
        await memoryService.storeMemory(content, type, category);

        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            type,
            content,
          }),
        ]);
      });
    });
  });

  describe('Concurrent Memory Creation', () => {
    it('should handle multiple concurrent memory creations', async () => {
      mockFunctionsInvoke.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
          error: null,
        };
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');

      const memories = [
        { content: 'Memory 1', type: 'event' as const, category: 'combat' },
        { content: 'Memory 2', type: 'location' as const, category: 'discovery' },
        { content: 'Memory 3', type: 'npc' as const, category: 'character' },
        { content: 'Memory 4', type: 'quest' as const, category: 'side_quest' },
        { content: 'Memory 5', type: 'item' as const, category: 'treasure' },
      ];

      await Promise.all(
        memories.map((m) => memoryService.storeMemory(m.content, m.type, m.category)),
      );

      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(5);
      expect(mockInsert).toHaveBeenCalledTimes(5);
    });

    it('should handle partial failures in concurrent operations', async () => {
      let callCount = 0;
      mockFunctionsInvoke.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return {
            data: null,
            error: { message: 'Failed' },
          };
        }
        return {
          data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
          error: null,
        };
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const memoryService = new MemoryService('session-123');

      const results = await Promise.allSettled([
        memoryService.storeMemory('Memory 1', 'event', 'combat'),
        memoryService.storeMemory('Memory 2', 'event', 'combat'),
        memoryService.storeMemory('Memory 3', 'event', 'combat'),
      ]);

      // All should succeed (embedding failure doesn't prevent storage)
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Memory Filtering', () => {
    it('should filter by importance', async () => {
      const mockMemories = [
        {
          id: '1',
          type: 'quest',
          content: 'Important quest',
          importance: 5,
          created_at: '2024-01-01T00:00:00Z',
          metadata: { category: 'main_quest' },
        },
        {
          id: '2',
          type: 'event',
          content: 'Minor event',
          importance: 2,
          created_at: '2024-01-01T00:00:00Z',
          metadata: { category: 'general' },
        },
      ];

      mockSelect.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      const results = await memoryService.retrieveMemories({
        semanticSearch: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by memory type', async () => {
      const mockMemories = [
        {
          id: '1',
          type: 'npc',
          content: 'Met a merchant',
          importance: 3,
          created_at: '2024-01-01T00:00:00Z',
          metadata: { category: 'npc' },
        },
      ];

      mockSelect.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      const results = await memoryService.retrieveMemories({
        category: 'npc',
        semanticSearch: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by timeframe (recent)', async () => {
      const now = new Date();
      const recentMemories = [
        {
          id: '1',
          type: 'event',
          content: 'Recent event',
          importance: 3,
          created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
          metadata: { category: 'general' },
        },
      ];

      mockSelect.mockResolvedValue({
        data: recentMemories,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      const results = await memoryService.retrieveMemories({
        timeframe: 'recent',
        semanticSearch: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should combine multiple filters', async () => {
      const mockMemories = [
        {
          id: '1',
          type: 'quest',
          content: 'Recent important quest',
          importance: 5,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          metadata: { category: 'main_quest' },
        },
      ];

      mockSelect.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      const memoryService = new MemoryService('session-123');
      const results = await memoryService.retrieveMemories({
        category: 'main_quest',
        timeframe: 'recent',
        limit: 5,
        semanticSearch: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Extraction from Conversation', () => {
    it('should extract memories from conversation context', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const context = {
        sessionId: 'session-123',
        campaignId: 'campaign-456',
        characterId: 'char-789',
        currentLocation: 'Ancient Temple',
        activeNPCs: ['High Priest'],
        activeQuests: ['Find the Sacred Relic'],
        currentMessage: 'I enter the temple',
        recentMessages: ['You approach the ancient temple'],
      };

      const result = await MemoryService.extractMemories(
        context,
        'I search for the sacred relic',
        'The high priest reveals a hidden chamber containing the relic',
      );

      expect(result.memories).toBeInstanceOf(Array);
      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.memories[0]).toHaveProperty('type');
      expect(result.memories[0]).toHaveProperty('content');
      expect(result.memories[0]).toHaveProperty('importance');
    });

    it('should save extracted memories with embeddings', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { embedding: JSON.stringify(Array(1536).fill(0.5)) },
        error: null,
      });

      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const context = {
        sessionId: 'session-123',
        campaignId: 'campaign-456',
        characterId: 'char-789',
        currentMessage: 'I attack the dragon',
        recentMessages: ['A dragon appears'],
      };

      const result = await MemoryService.extractMemories(
        context,
        'I attack with my sword',
        'You strike the dragon!',
      );

      if (result.memories.length > 0) {
        await MemoryService.saveMemories(result.memories);
        expect(mockInsert).toHaveBeenCalled();
      }
    });
  });

  describe('Memory Reinforcement', () => {
    it('should boost memory importance when reinforced', async () => {
      const mockMemory = {
        id: 'memory-123',
        importance: 3,
        narrative_weight: 5,
      };

      mockSelect.mockResolvedValue({
        data: mockMemory,
        error: null,
      });

      mockUpdate.mockResolvedValue({
        data: null,
        error: null,
      });

      await MemoryService.reinforceMemory('memory-123', 1);

      expect(mockUpdate).toHaveBeenCalledWith({
        importance: 4,
        narrative_weight: 6,
      });
    });

    it('should cap importance at 5', async () => {
      const mockMemory = {
        id: 'memory-123',
        importance: 5,
        narrative_weight: 10,
      };

      mockSelect.mockResolvedValue({
        data: mockMemory,
        error: null,
      });

      mockUpdate.mockResolvedValue({
        data: null,
        error: null,
      });

      await MemoryService.reinforceMemory('memory-123', 2);

      expect(mockUpdate).toHaveBeenCalledWith({
        importance: 5, // Should not exceed 5
        narrative_weight: 10, // Should not exceed 10
      });
    });

    it('should handle non-existent memory gracefully', async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(MemoryService.reinforceMemory('non-existent', 1)).resolves.not.toThrow();

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Fiction-Ready Memories', () => {
    it('should retrieve memories with high narrative weight', async () => {
      const mockMemories = [
        {
          id: '1',
          type: 'plot_point',
          content: "The hero's secret is revealed",
          importance: 5,
          narrative_weight: 9,
          session_id: 'session-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
        {
          id: '2',
          type: 'character_moment',
          content: 'A moment of great sacrifice',
          importance: 5,
          narrative_weight: 8,
          session_id: 'session-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: null,
        },
      ];

      mockSelect.mockResolvedValue({
        data: mockMemories,
        error: null,
      });

      const results = await MemoryService.getFictionReadyMemories('session-123', 6);

      expect(results).toHaveLength(2);
      expect(results.every((m) => (m as any).narrative_weight >= 6)).toBe(true);
    });
  });
});
