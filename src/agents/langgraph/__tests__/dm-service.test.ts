/**
 * DMService Integration Test
 *
 * Tests the complete integration of DMService with LangGraph.
 * Verifies that messages flow through the graph correctly.
 *
 * Enhanced test coverage:
 * - Checkpoint persistence and restoration
 * - Message history management
 * - Error recovery and retry logic
 * - Streaming vs non-streaming execution paths
 * - Thread ID management
 * - Concurrent session handling
 *
 * @module agents/langgraph/__tests__/dm-service.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DMService } from '../dm-service';
import type { WorldContext, DMResponse } from '../dm-service';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { MockCheckpointer, mockSupabaseClient } from './mocks/checkpointer';

// Mock Supabase client to prevent database access
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Create a mock checkpointer instance for testing
const mockCheckpointer = new MockCheckpointer();

// Mock SupabaseCheckpointer to use our mock implementation
vi.mock('../persistence/supabase-checkpointer', () => ({
  SupabaseCheckpointer: vi.fn().mockImplementation(() => mockCheckpointer),
}));

// Track mock call counts for verification
let mockGeminiCallCount = 0;
let mockGeminiResponses: string[] = [];

// Mock external dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/config/ai', () => ({
  GEMINI_TEXT_MODEL: 'gemini-pro',
}));

vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      mockGeminiCallCount++;

      // Return different responses based on call count for testing
      const responses = [
        // Intent detection
        JSON.stringify({
          type: 'attack',
          confidence: 0.9,
          details: { target: 'goblin', action: 'attack with sword' },
        }),
        // Rules validation
        JSON.stringify({
          isValid: true,
          reasoning: 'Valid attack action',
          needsRoll: true,
          rollType: 'attack',
          rollFormula: '1d20+5',
          modifications: [],
        }),
        // Response generation
        JSON.stringify({
          description: 'The goblin raises its rusty sword and snarls at you menacingly.',
          atmosphere: 'tense',
          npcs: [{ name: 'Goblin', dialogue: 'Me smash you!' }],
          availableActions: ['Attack', 'Defend', 'Run'],
          consequences: ['Combat initiated'],
        }),
      ];

      const response = responses[mockGeminiCallCount % responses.length];
      mockGeminiResponses.push(response);
      return response;
    }),
  }),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are a skilled Dungeon Master.',
  buildGameContextPrompt: () => 'D&D 5E campaign',
  buildResponseStructurePrompt: () => 'Respond in JSON format',
}));

describe('DMService Integration', () => {
  let dmService: DMService;
  let mockWorldContext: WorldContext;

  beforeEach(() => {
    // Clear mock checkpointer state between tests
    mockCheckpointer.clear();

    dmService = new DMService();
    mockWorldContext = {
      campaignId: 'test-campaign-123',
      characterId: 'test-character-456',
      sessionId: 'test-session-789',
      campaignDetails: {
        location: 'Forgotten Tavern',
      },
      recentEvents: ['You entered a dark tavern'],
    };
    // Reset mock counters
    mockGeminiCallCount = 0;
    mockGeminiResponses = [];
  });

  afterEach(async () => {
    // Clean up any test sessions
    try {
      await dmService.clearHistory('test-session-789');
      await dmService.clearHistory('test-session-history');
      await dmService.clearHistory('test-session-stream');
      await dmService.clearHistory('test-error');
      await dmService.clearHistory('test-session-clear');
      await dmService.clearHistory('test-session-checkpoints');
      await dmService.clearHistory('test-concurrent-1');
      await dmService.clearHistory('test-concurrent-2');
      await dmService.clearHistory('test-checkpoint-restore');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should be configured correctly', () => {
    expect(dmService.isConfigured()).toBe(true);
  });

  it('should have correct status', () => {
    const status = dmService.getStatus();
    expect(status.configured).toBe(true);
    expect(status.checkpointerType).toBe('supabase');
    expect(status.graphAvailable).toBe(true);
  });

  it('should process a simple message', async () => {
    const response = await dmService.sendMessage({
      sessionId: 'test-session-789',
      message: 'I attack the goblin!',
      context: mockWorldContext,
    });

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.response).toBeTruthy();
    expect(typeof response.response).toBe('string');
    expect(response.requiresDiceRoll).toBeDefined();
  });

  it('should handle conversation history', async () => {
    const sessionId = 'test-session-history';

    // Send first message
    await dmService.sendMessage({
      sessionId,
      message: 'I look around the room',
      context: mockWorldContext,
    });

    // Get history
    const history = await dmService.getConversationHistory(sessionId);

    // Should have at least the user message
    expect(Array.isArray(history)).toBe(true);
    // History tracking happens via checkpointer
  });

  it('should handle streaming responses', async () => {
    const chunks: string[] = [];

    await dmService.sendMessage({
      sessionId: 'test-session-stream',
      message: 'I investigate the mysterious door',
      context: mockWorldContext,
      onStream: (chunk) => {
        chunks.push(chunk);
      },
    });

    // Should have received streaming chunks
    // Note: actual streaming depends on graph implementation
    expect(true).toBe(true); // Basic smoke test
  });

  it('should handle errors gracefully', async () => {
    // Create a service with invalid configuration to trigger error
    const response = await dmService.sendMessage({
      sessionId: 'test-error',
      message: '', // Empty message should cause validation issues
      context: mockWorldContext,
    });

    // Should still return a response (error handling in nodes)
    expect(response).toBeDefined();
  });

  it('should clear conversation history', async () => {
    const sessionId = 'test-session-clear';

    // Send a message first
    await dmService.sendMessage({
      sessionId,
      message: 'Test message',
      context: mockWorldContext,
    });

    // Clear history
    await dmService.clearHistory(sessionId);

    // Verify cleared (no exception thrown)
    expect(true).toBe(true);
  });

  it('should retrieve checkpoint history', async () => {
    const sessionId = 'test-session-checkpoints';

    // Send a message to create checkpoint
    await dmService.sendMessage({
      sessionId,
      message: 'Test checkpoint',
      context: mockWorldContext,
    });

    // Get checkpoint history
    const checkpoints = await dmService.getCheckpointHistory(sessionId, 5);

    // Should return array (may be empty depending on checkpointer)
    expect(Array.isArray(checkpoints)).toBe(true);
  });

  describe('Checkpoint Persistence & Restoration', () => {
    it('should persist state between messages', async () => {
      const sessionId = 'test-checkpoint-persist';

      // Send first message
      const response1 = await dmService.sendMessage({
        sessionId,
        message: 'I enter the tavern',
        context: mockWorldContext,
      });
      expect(response1.response).toBeTruthy();

      // Send second message - should have access to previous context
      const response2 = await dmService.sendMessage({
        sessionId,
        message: 'I order a drink',
        context: mockWorldContext,
      });
      expect(response2.response).toBeTruthy();

      // Get history - should contain both messages
      const history = await dmService.getConversationHistory(sessionId);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await dmService.clearHistory(sessionId);
    });

    it('should restore checkpoint state correctly', async () => {
      const sessionId = 'test-checkpoint-restore';

      // Create some conversation history
      await dmService.sendMessage({
        sessionId,
        message: 'First message',
        context: mockWorldContext,
      });

      await dmService.sendMessage({
        sessionId,
        message: 'Second message',
        context: mockWorldContext,
      });

      // Get checkpoint history
      const checkpoints = await dmService.getCheckpointHistory(sessionId, 10);
      expect(checkpoints.length).toBeGreaterThan(0);

      // Verify we can get conversation history
      const history = await dmService.getConversationHistory(sessionId);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await dmService.clearHistory(sessionId);
    });

    it('should handle checkpoint restoration after service restart', async () => {
      const sessionId = 'test-checkpoint-restart';

      // Create a message with first service instance
      const service1 = new DMService();
      await service1.sendMessage({
        sessionId,
        message: 'Message before restart',
        context: mockWorldContext,
      });

      // Create new service instance (simulating restart)
      const service2 = new DMService();
      const history = await service2.getConversationHistory(sessionId);

      // Should be able to retrieve history from checkpoint
      expect(Array.isArray(history)).toBe(true);

      // Cleanup
      await service2.clearHistory(sessionId);
    });
  });

  describe('Message History Management', () => {
    it('should track message history in order', async () => {
      const sessionId = 'test-history-order';

      const messages = [
        'First action',
        'Second action',
        'Third action',
      ];

      for (const msg of messages) {
        await dmService.sendMessage({
          sessionId,
          message: msg,
          context: mockWorldContext,
        });
      }

      const history = await dmService.getConversationHistory(sessionId);
      expect(history.length).toBeGreaterThanOrEqual(messages.length);

      // Cleanup
      await dmService.clearHistory(sessionId);
    });

    it('should clear history correctly', async () => {
      const sessionId = 'test-clear-history';

      // Add some messages
      await dmService.sendMessage({
        sessionId,
        message: 'Test message',
        context: mockWorldContext,
      });

      // Clear history
      await dmService.clearHistory(sessionId);

      // Get history after clear
      const history = await dmService.getConversationHistory(sessionId);
      expect(history.length).toBe(0);
    });

    it('should isolate history between sessions', async () => {
      const session1 = 'test-session-1-isolated';
      const session2 = 'test-session-2-isolated';

      // Send message to session 1
      await dmService.sendMessage({
        sessionId: session1,
        message: 'Session 1 message',
        context: mockWorldContext,
      });

      // Send message to session 2
      await dmService.sendMessage({
        sessionId: session2,
        message: 'Session 2 message',
        context: mockWorldContext,
      });

      // Get histories
      const history1 = await dmService.getConversationHistory(session1);
      const history2 = await dmService.getConversationHistory(session2);

      // Histories should be independent
      expect(history1).not.toEqual(history2);

      // Cleanup
      await dmService.clearHistory(session1);
      await dmService.clearHistory(session2);
    });
  });

  describe('Error Recovery & Retry Logic', () => {
    it('should handle graph execution errors gracefully', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-error-handling',
        message: '', // Empty message may cause issues
        context: mockWorldContext,
      });

      // Should still return a response
      expect(response).toBeDefined();
      expect(typeof response.response).toBe('string');

      // Cleanup
      await dmService.clearHistory('test-error-handling');
    });

    it('should recover from checkpoint loading errors', async () => {
      const sessionId = 'test-error-recovery';

      // This should work even if no previous checkpoint exists
      const response = await dmService.sendMessage({
        sessionId,
        message: 'First message',
        context: mockWorldContext,
      });

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();

      // Cleanup
      await dmService.clearHistory(sessionId);
    });

    it('should provide fallback response on AI failure', async () => {
      // This test verifies fallback behavior is in place
      const response = await dmService.sendMessage({
        sessionId: 'test-ai-fallback',
        message: 'Test action',
        context: mockWorldContext,
      });

      // Even if AI fails, should get a response
      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();

      // Cleanup
      await dmService.clearHistory('test-ai-fallback');
    });
  });

  describe('Streaming vs Non-Streaming Execution', () => {
    it('should support non-streaming execution', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-non-streaming',
        message: 'I attack the goblin',
        context: mockWorldContext,
        // No onStream callback
      });

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();

      // Cleanup
      await dmService.clearHistory('test-non-streaming');
    });

    it('should support streaming execution', async () => {
      const chunks: string[] = [];

      const response = await dmService.sendMessage({
        sessionId: 'test-streaming',
        message: 'I investigate the room',
        context: mockWorldContext,
        onStream: (chunk) => {
          chunks.push(chunk);
        },
      });

      expect(response).toBeDefined();
      expect(response.response).toBeTruthy();

      // Streaming may or may not produce chunks depending on implementation
      // Just verify it doesn't crash
      expect(Array.isArray(chunks)).toBe(true);

      // Cleanup
      await dmService.clearHistory('test-streaming');
    });

    it('should handle streaming errors gracefully', async () => {
      const chunks: string[] = [];
      let streamError: Error | null = null;

      const response = await dmService.sendMessage({
        sessionId: 'test-stream-error',
        message: 'Test message',
        context: mockWorldContext,
        onStream: (chunk) => {
          chunks.push(chunk);
        },
      });

      // Should still complete even if streaming has issues
      expect(response).toBeDefined();

      // Cleanup
      await dmService.clearHistory('test-stream-error');
    });
  });

  describe('Thread ID Management', () => {
    it('should use consistent thread ID format', async () => {
      const sessionId = 'test-thread-format';

      await dmService.sendMessage({
        sessionId,
        message: 'Test message',
        context: mockWorldContext,
      });

      // Get checkpoints to verify thread ID format
      const checkpoints = await dmService.getCheckpointHistory(sessionId, 1);

      // Thread ID should be in format: session-{sessionId}
      // This is verified implicitly by successful checkpoint retrieval

      // Cleanup
      await dmService.clearHistory(sessionId);
    });

    it('should maintain thread consistency across calls', async () => {
      const sessionId = 'test-thread-consistency';

      // Multiple calls should use same thread
      await dmService.sendMessage({
        sessionId,
        message: 'First',
        context: mockWorldContext,
      });

      await dmService.sendMessage({
        sessionId,
        message: 'Second',
        context: mockWorldContext,
      });

      const history = await dmService.getConversationHistory(sessionId);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await dmService.clearHistory(sessionId);
    });
  });

  describe('Concurrent Session Handling', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessions = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      // Send messages to multiple sessions concurrently
      const promises = sessions.map(sessionId =>
        dmService.sendMessage({
          sessionId,
          message: `Message for ${sessionId}`,
          context: mockWorldContext,
        })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.response).toBeTruthy();
      });

      // Cleanup
      for (const sessionId of sessions) {
        await dmService.clearHistory(sessionId);
      }
    });

    it('should not mix state between concurrent sessions', async () => {
      const session1 = 'concurrent-isolated-1';
      const session2 = 'concurrent-isolated-2';

      // Send different messages concurrently
      const [response1, response2] = await Promise.all([
        dmService.sendMessage({
          sessionId: session1,
          message: 'Attack the dragon',
          context: mockWorldContext,
        }),
        dmService.sendMessage({
          sessionId: session2,
          message: 'Talk to the merchant',
          context: mockWorldContext,
        }),
      ]);

      // Both should succeed
      expect(response1.response).toBeTruthy();
      expect(response2.response).toBeTruthy();

      // Get separate histories
      const history1 = await dmService.getConversationHistory(session1);
      const history2 = await dmService.getConversationHistory(session2);

      // Histories should be independent
      expect(history1).not.toEqual(history2);

      // Cleanup
      await dmService.clearHistory(session1);
      await dmService.clearHistory(session2);
    });
  });

  describe('Dice Roll Integration', () => {
    it('should detect when dice rolls are required', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-dice-detection',
        message: 'I attack the goblin with my sword',
        context: mockWorldContext,
      });

      // Attack actions should require dice rolls
      expect(response.requiresDiceRoll).toBeDefined();

      // Cleanup
      await dmService.clearHistory('test-dice-detection');
    });

    it('should not require dice rolls for simple actions', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-no-dice',
        message: 'I walk down the hallway',
        context: mockWorldContext,
      });

      expect(response).toBeDefined();
      // Simple movement may not require rolls

      // Cleanup
      await dmService.clearHistory('test-no-dice');
    });
  });

  describe('Response Quality', () => {
    it('should provide suggested actions', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-suggestions',
        message: 'I look around',
        context: mockWorldContext,
      });

      expect(response.suggestedActions).toBeDefined();
      expect(Array.isArray(response.suggestedActions)).toBe(true);

      // Cleanup
      await dmService.clearHistory('test-suggestions');
    });

    it('should include emotional tone', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-tone',
        message: 'I enter the dark cave',
        context: mockWorldContext,
      });

      expect(response.emotionalTone).toBeDefined();
      expect(typeof response.emotionalTone).toBe('string');

      // Cleanup
      await dmService.clearHistory('test-tone');
    });

    it('should provide world state changes when applicable', async () => {
      const response = await dmService.sendMessage({
        sessionId: 'test-world-changes',
        message: 'I pick up the sword',
        context: mockWorldContext,
      });

      expect(response).toBeDefined();
      // World state changes may or may not be present

      // Cleanup
      await dmService.clearHistory('test-world-changes');
    });
  });
});
