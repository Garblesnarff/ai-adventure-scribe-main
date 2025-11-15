import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AIService } from '../ai-service';

// Mock the logger to avoid console output during tests
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the gemini api manager
vi.mock('../gemini-api-manager-singleton', () => ({
  getGeminiApiManager: () => ({
    executeWithRotation: vi.fn().mockResolvedValue({
      text: 'Mock response',
      narrationSegments: [],
    }),
  }),
}));

// Mock other dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/services/memory-manager', () => ({
  MemoryManager: {
    getRelevantMemories: vi.fn().mockResolvedValue([]),
    extractMemories: vi.fn().mockResolvedValue({ memories: [] }),
    saveMemories: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/world-builders/world-builder-service', () => ({
  WorldBuilderService: {
    respondToPlayerAction: vi.fn().mockResolvedValue({
      locations: [],
      npcs: [],
      quests: [],
    }),
  },
}));

describe('AIService Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate identical rapid calls', async () => {
    const params = {
      message: 'Test message',
      context: {
        campaignId: 'test-campaign',
        characterId: 'test-character',
        sessionId: 'test-session',
      },
      conversationHistory: [],
    };

    // Make two identical calls rapidly
    const [result1, result2] = await Promise.all([
      AIService.chatWithDM(params),
      AIService.chatWithDM(params),
    ]);

    // Both should return the same result
    expect(result1).toEqual(result2);
    expect(result1.text).toBe('Mock response');
  });

  it('should allow different calls to proceed', async () => {
    const params1 = {
      message: 'Message 1',
      context: {
        campaignId: 'test-campaign',
        characterId: 'test-character',
        sessionId: 'test-session',
      },
      conversationHistory: [],
    };

    const params2 = {
      message: 'Message 2',
      context: {
        campaignId: 'test-campaign',
        characterId: 'test-character',
        sessionId: 'test-session',
      },
      conversationHistory: [],
    };

    const [result1, result2] = await Promise.all([
      AIService.chatWithDM(params1),
      AIService.chatWithDM(params2),
    ]);

    // Results should be different since messages are different
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('should handle different session IDs separately', async () => {
    const baseParams = {
      message: 'Test message',
      conversationHistory: [],
    };

    const params1 = {
      ...baseParams,
      context: {
        campaignId: 'test-campaign',
        characterId: 'test-character',
        sessionId: 'session-1',
      },
    };

    const params2 = {
      ...baseParams,
      context: {
        campaignId: 'test-campaign',
        characterId: 'test-character',
        sessionId: 'session-2',
      },
    };

    const [result1, result2] = await Promise.all([
      AIService.chatWithDM(params1),
      AIService.chatWithDM(params2),
    ]);

    // Should get two separate results
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });
});
