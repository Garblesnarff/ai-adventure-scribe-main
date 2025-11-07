/**
 * LangGraph Compilation Tests
 *
 * Verifies that the DM graph compiles successfully and
 * basic invocation works.
 *
 * @module agents/langgraph/__tests__/graph-compilation
 */

import { describe, it, expect } from 'vitest';
import { dmGraph, invokeDMGraph } from '../dm-graph';
import { createInitialState } from '../state';

describe('LangGraph DM Graph', () => {
  describe('Graph Compilation', () => {
    it('should compile the DM graph successfully', () => {
      expect(dmGraph).toBeDefined();
      expect(typeof dmGraph.invoke).toBe('function');
      expect(typeof dmGraph.stream).toBe('function');
    });
  });

  describe('State Creation', () => {
    it('should create initial state correctly', () => {
      const worldContext = {
        campaignId: 'test_campaign',
        sessionId: 'test_session',
        characterIds: ['char_1'],
      };

      const state = createInitialState('I attack the goblin', worldContext);

      expect(state.playerInput).toBe('I attack the goblin');
      expect(state.worldContext).toEqual(worldContext);
      expect(state.playerIntent).toBeNull();
      expect(state.response).toBeNull();
      expect(state.error).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.metadata?.stepCount).toBe(0);
    });
  });

  describe('Graph Invocation', () => {
    it('should invoke the graph without errors', async () => {
      const worldContext = {
        campaignId: 'test_campaign',
        sessionId: 'test_session',
        characterIds: ['char_1'],
      };

      const result = await invokeDMGraph(
        'I search for traps',
        worldContext,
        'test_thread'
      );

      expect(result).toBeDefined();
      expect(result.playerInput).toBe('I search for traps');
      expect(result.metadata?.stepCount).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid input
      const result = await invokeDMGraph(
        '',
        null,
        'test_thread'
      );

      // Should not throw, but may have error state
      expect(result).toBeDefined();
    });
  });
});
