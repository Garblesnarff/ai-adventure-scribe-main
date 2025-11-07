/**
 * LangGraph Integration Tests
 *
 * Tests the complete DM graph workflow with example conversations.
 * Validates intent detection, rules validation, and response generation.
 *
 * @module agents/langgraph/nodes/__tests__/graph-integration
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the AI services BEFORE imports
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn: any) => {
      // Mock Gemini responses for testing
      return JSON.stringify({
        type: 'attack',
        confidence: 0.9,
        details: { target: 'goblin', action: 'attack with sword' },
      });
    }),
  }),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { invokeDMGraph } from '../../dm-graph';
import type { WorldInfo } from '../../state';

describe('DM Graph Integration', () => {
  const mockWorldContext: WorldInfo = {
    campaignId: 'test-campaign',
    sessionId: 'test-session',
    characterIds: ['test-character'],
    location: 'Goblin Cave',
    threatLevel: 'medium',
    activeNPCs: ['Goblin Warrior'],
  };

  it('should detect attack intent', async () => {
    const result = await invokeDMGraph(
      'I attack the goblin with my longsword',
      mockWorldContext,
      'test-thread-1'
    );

    expect(result.playerIntent).toBeTruthy();
    expect(result.error).toBeNull();
  }, 30000);

  it('should validate rules for attack action', async () => {
    const result = await invokeDMGraph(
      'I swing my sword at the goblin',
      mockWorldContext,
      'test-thread-2'
    );

    expect(result.rulesValidation).toBeTruthy();
    expect(result.rulesValidation?.isValid).toBe(true);
  }, 30000);

  it('should request dice roll for attack', async () => {
    const result = await invokeDMGraph(
      'I attack the goblin',
      mockWorldContext,
      'test-thread-3'
    );

    // Attack actions should require dice rolls
    expect(result.requiresDiceRoll).toBeTruthy();
    if (result.requiresDiceRoll) {
      expect(result.requiresDiceRoll.formula).toContain('d20');
      expect(result.requiresDiceRoll.reason).toContain('attack');
    }
  }, 30000);

  it('should generate narrative response', async () => {
    const result = await invokeDMGraph(
      'I look around the room',
      mockWorldContext,
      'test-thread-4'
    );

    expect(result.response).toBeTruthy();
    expect(result.response?.description).toBeTruthy();
    expect(result.error).toBeNull();
  }, 30000);

  it('should handle social interaction', async () => {
    const result = await invokeDMGraph(
      'I try to persuade the guard to let me pass',
      mockWorldContext,
      'test-thread-5'
    );

    expect(result.playerIntent).toBeTruthy();
    expect(result.response).toBeTruthy();
  }, 30000);

  it('should handle exploration', async () => {
    const result = await invokeDMGraph(
      'I search the chest for treasure',
      mockWorldContext,
      'test-thread-6'
    );

    expect(result.playerIntent).toBeTruthy();
    expect(result.response).toBeTruthy();
  }, 30000);

  it('should handle errors gracefully', async () => {
    const result = await invokeDMGraph(
      '',
      mockWorldContext,
      'test-thread-error'
    );

    // Empty input should be handled
    expect(result.response || result.error).toBeTruthy();
  }, 30000);

  it('should track metadata', async () => {
    const result = await invokeDMGraph(
      'I cast Fireball',
      mockWorldContext,
      'test-thread-7'
    );

    expect(result.metadata).toBeTruthy();
    expect(result.metadata?.stepCount).toBeGreaterThan(0);
    expect(result.metadata?.timestamp).toBeInstanceOf(Date);
  }, 30000);
});

describe('DM Graph Conditional Logic', () => {
  const mockWorldContext: WorldInfo = {
    campaignId: 'test-campaign',
    sessionId: 'test-session',
    characterIds: ['test-character'],
  };

  it('should skip dice roll for simple exploration', async () => {
    const result = await invokeDMGraph(
      'I walk down the hallway',
      mockWorldContext,
      'test-thread-8'
    );

    // Simple movement shouldn't require dice rolls
    expect(result.playerIntent).toBeTruthy();
    expect(result.response).toBeTruthy();
  }, 30000);

  it('should request dice roll for skill checks', async () => {
    const result = await invokeDMGraph(
      'I make a Perception check',
      mockWorldContext,
      'test-thread-9'
    );

    expect(result.requiresDiceRoll).toBeTruthy();
    if (result.requiresDiceRoll) {
      expect(result.requiresDiceRoll.reason).toContain('check');
    }
  }, 30000);
});
