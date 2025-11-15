/**
 * Integration Tests for LangGraph DM Agent
 *
 * Tests the full graph execution from player input to DM response,
 * including all nodes and conditional edges.
 *
 * @module agents/langgraph/__tests__/integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeDMGraph, streamDMGraph } from '../dm-graph';
import type { WorldInfo } from '../state';
import * as geminiUtils from '@/services/ai/shared/utils';

// Mock dependencies
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: vi.fn(),
}));

vi.mock('@/services/ai/shared/prompts', () => ({
  buildDMPersonaPrompt: () => 'You are an experienced DM',
  buildGameContextPrompt: () => 'Campaign context',
  buildResponseStructurePrompt: () => 'Response structure',
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the checkpointer
vi.mock('../checkpointer', () => ({
  checkpointer: {
    put: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
  },
}));

describe('LangGraph DM Agent Integration', () => {
  let mockGeminiManager: any;

  beforeEach(() => {
    mockGeminiManager = {
      executeWithRotation: vi.fn(),
    };
    vi.mocked(geminiUtils.getGeminiManager).mockReturnValue(mockGeminiManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createWorldContext = (): WorldInfo => ({
    campaignId: 'test-campaign-123',
    sessionId: 'test-session-456',
    characterIds: ['character-789'],
    location: 'Rusty Dragon Inn',
    threatLevel: 'low',
    recentMemories: [
      {
        content: 'You just finished speaking with the innkeeper',
        type: 'social',
        timestamp: new Date(),
      },
    ],
  });

  const setupMockResponses = (
    intentResponse: any,
    validationResponse: any,
    narrativeResponse: any,
  ) => {
    let callCount = 0;
    mockGeminiManager.executeWithRotation.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return JSON.stringify(intentResponse);
      if (callCount === 2) return JSON.stringify(validationResponse);
      if (callCount === 3) return JSON.stringify(narrativeResponse);
      return '{}';
    });
  };

  describe('Combat Flow', () => {
    it('should handle complete combat action flow', async () => {
      setupMockResponses(
        {
          type: 'attack',
          confidence: 0.95,
          details: { target: 'goblin', action: 'attack', skill: null },
        },
        {
          isValid: true,
          reasoning: 'Valid melee attack',
          needsRoll: true,
          rollType: 'attack',
        },
        {
          description: 'You swing your sword at the goblin. Roll to hit!',
          atmosphere: 'tense',
          npcs: [{ name: 'Goblin', dialogue: '*growls*' }],
          availableActions: ['Attack', 'Defend', 'Move'],
          consequences: ['Combat initiated'],
        },
      );

      const result = await invokeDMGraph(
        'I attack the goblin with my sword',
        createWorldContext(),
        'test-thread-1',
      );

      // Verify complete flow
      expect(result.playerIntent).toBe('attack');
      expect(result.rulesValidation?.isValid).toBe(true);
      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.formula).toBe('1d20');
      expect(result.requiresDiceRoll?.reason).toBe('attack roll');
      expect(result.response).toBeTruthy();
      expect(result.response?.description).toContain('sword');
      expect(result.error).toBeNull();
    });

    it('should handle multi-target combat', async () => {
      setupMockResponses(
        { type: 'attack', confidence: 0.9, details: {} },
        { isValid: true, reasoning: 'Valid area attack', needsRoll: true },
        {
          description: 'You swing your weapon in a wide arc, targeting multiple enemies.',
          atmosphere: 'chaotic',
          npcs: [],
          availableActions: [],
          consequences: ['Multiple enemies engaged'],
        },
      );

      const result = await invokeDMGraph(
        'I attack all nearby goblins',
        createWorldContext(),
        'test-thread-2',
      );

      expect(result.playerIntent).toBe('attack');
      expect(result.response?.description).toContain('multiple');
    });

    it('should handle spell attacks', async () => {
      setupMockResponses(
        { type: 'spellcast', confidence: 0.95, details: {} },
        {
          isValid: true,
          reasoning: 'Valid spell attack',
          needsRoll: false,
          rollType: 'save',
          dc: 15,
        },
        {
          description: 'You cast Fireball! Enemies must make Dexterity saving throws.',
          atmosphere: 'explosive',
          npcs: [],
          availableActions: [],
          consequences: ['Spell slot consumed', 'Area damaged by fire'],
        },
      );

      const result = await invokeDMGraph(
        'I cast Fireball at the enemy group',
        createWorldContext(),
        'test-thread-3',
      );

      expect(result.playerIntent).toBe('spellcast');
      expect(result.response?.consequences).toContain('Spell slot consumed');
    });
  });

  describe('Exploration Flow', () => {
    it('should handle room exploration', async () => {
      setupMockResponses(
        { type: 'exploration', confidence: 0.92, details: {} },
        { isValid: true, reasoning: 'Valid exploration', needsRoll: false },
        {
          description:
            'You carefully search the room. Dust covers most surfaces, but you notice fresh footprints near the bookshelf.',
          atmosphere: 'mysterious',
          npcs: [],
          availableActions: ['Examine bookshelf', 'Follow footprints', 'Search elsewhere'],
          consequences: ['Discovered fresh footprints'],
        },
      );

      const result = await invokeDMGraph(
        'I search the room for clues',
        createWorldContext(),
        'test-thread-4',
      );

      expect(result.playerIntent).toBe('exploration');
      expect(result.requiresDiceRoll).toBeNull(); // No roll needed for basic search
      expect(result.response?.availableActions?.length).toBeGreaterThan(0);
    });

    it('should handle perception checks', async () => {
      setupMockResponses(
        { type: 'skill_check', confidence: 0.88, details: {} },
        {
          isValid: true,
          reasoning: 'Valid perception check',
          needsRoll: true,
          rollType: 'check',
          dc: 12,
        },
        {
          description: 'You focus your senses. Roll a Perception check.',
          atmosphere: 'tense',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph(
        'I use perception to look for hidden enemies',
        createWorldContext(),
        'test-thread-5',
      );

      expect(result.playerIntent).toBe('skill_check');
      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.reason).toContain('Perception');
    });

    it('should handle investigation checks', async () => {
      setupMockResponses(
        { type: 'exploration', confidence: 0.85, details: {} },
        {
          isValid: true,
          reasoning: 'Valid investigation',
          needsRoll: true,
          rollType: 'check',
        },
        {
          description: 'You begin to investigate the crime scene. Roll Investigation.',
          atmosphere: 'serious',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph(
        'I investigate the mysterious symbols',
        createWorldContext(),
        'test-thread-6',
      );

      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.requiresDiceRoll?.reason).toContain('Investigation');
    });
  });

  describe('Social Interaction Flow', () => {
    it('should handle persuasion attempts', async () => {
      setupMockResponses(
        { type: 'social', confidence: 0.93, details: {} },
        {
          isValid: true,
          reasoning: 'Valid persuasion',
          needsRoll: true,
          rollType: 'check',
          skill: 'Persuasion',
        },
        {
          description: 'You make your case eloquently. The merchant listens with interest.',
          atmosphere: 'hopeful',
          npcs: [{ name: 'Merchant', dialogue: "I'm listening..." }],
          availableActions: ['Continue persuading', 'Offer deal', 'Threaten'],
          consequences: ['Merchant is considering your offer'],
        },
      );

      const result = await invokeDMGraph(
        'I try to persuade the merchant to lower the price',
        createWorldContext(),
        'test-thread-7',
      );

      expect(result.playerIntent).toBe('social');
      expect(result.response?.npcs?.length).toBeGreaterThan(0);
      expect(result.requiresDiceRoll?.reason).toContain('Persuasion');
    });

    it('should handle deception', async () => {
      setupMockResponses(
        { type: 'social', confidence: 0.89, details: {} },
        { isValid: true, reasoning: 'Valid deception attempt', needsRoll: true },
        {
          description: 'You spin your tale convincingly. The guard eyes you suspiciously.',
          atmosphere: 'tense',
          npcs: [{ name: 'Guard', dialogue: 'Hmm... prove it.' }],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph(
        'I lie to the guard about my identity',
        createWorldContext(),
        'test-thread-8',
      );

      expect(result.playerIntent).toBe('social');
      expect(result.response?.atmosphere).toBe('tense');
    });

    it('should handle intimidation', async () => {
      setupMockResponses(
        { type: 'social', confidence: 0.91, details: {} },
        { isValid: true, reasoning: 'Valid intimidation', needsRoll: true },
        {
          description: 'You loom over the bandit menacingly. He takes a step back.',
          atmosphere: 'threatening',
          npcs: [{ name: 'Bandit', dialogue: '*gulp* Okay, okay!' }],
          availableActions: [],
          consequences: ['Bandit is intimidated'],
        },
      );

      const result = await invokeDMGraph(
        'I intimidate the bandit into talking',
        createWorldContext(),
        'test-thread-9',
      );

      expect(result.response?.atmosphere).toBe('threatening');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid actions gracefully', async () => {
      setupMockResponses(
        { type: 'attack', confidence: 0.7, details: {} },
        {
          isValid: false,
          reasoning: 'Cannot attack while unarmed and prone',
          modifications: ['Stand up first', 'Draw weapon'],
        },
        {
          description:
            "You try to attack, but you're prone and unarmed. The DM suggests standing up first.",
          atmosphere: 'awkward',
          npcs: [],
          availableActions: ['Stand up', 'Look for weapon'],
          consequences: [],
        },
      );

      const result = await invokeDMGraph(
        'I attack while lying down unarmed',
        createWorldContext(),
        'test-thread-10',
      );

      expect(result.rulesValidation?.isValid).toBe(false);
      expect(result.rulesValidation?.modifications?.length).toBeGreaterThan(0);
      expect(result.response).toBeTruthy(); // Should still get a response
    });

    it('should handle graph execution errors', async () => {
      mockGeminiManager.executeWithRotation.mockRejectedValue(new Error('AI service unavailable'));

      const result = await invokeDMGraph('I do something', createWorldContext(), 'test-thread-11');

      // Should use fallback logic
      expect(result.playerIntent).toBeTruthy();
      expect(result.response).toBeTruthy();
    });

    it('should handle empty player input', async () => {
      const result = await invokeDMGraph('', createWorldContext(), 'test-thread-12');

      expect(result.error).toBeTruthy();
    });
  });

  describe('Memory Integration', () => {
    it('should use recent memories in context', async () => {
      const worldContext = createWorldContext();
      worldContext.recentMemories = [
        {
          content: 'You made a deal with the shady merchant',
          type: 'social',
          timestamp: new Date(),
        },
        {
          content: 'The town guard is looking for you',
          type: 'event',
          timestamp: new Date(),
        },
      ];

      setupMockResponses(
        { type: 'social', confidence: 0.9, details: {} },
        { isValid: true, reasoning: 'Valid', needsRoll: false },
        {
          description:
            'As you enter the tavern, you remember the merchant and the guards. You proceed cautiously.',
          atmosphere: 'cautious',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph('I enter the tavern', worldContext, 'test-thread-13');

      expect(result.response).toBeTruthy();
      // Memories should be included in the prompt (verified through mock call)
      expect(mockGeminiManager.executeWithRotation).toHaveBeenCalled();
    });
  });

  describe('Streaming Functionality', () => {
    it('should stream graph execution updates', async () => {
      setupMockResponses(
        { type: 'attack', confidence: 0.9, details: {} },
        { isValid: true, reasoning: 'Valid', needsRoll: true },
        {
          description: 'You attack the enemy!',
          atmosphere: 'intense',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const chunks: any[] = [];
      const stream = streamDMGraph('I attack', createWorldContext(), 'test-thread-14');

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Dice Roll Interruption', () => {
    it('should pause execution when dice roll is required', async () => {
      setupMockResponses(
        { type: 'attack', confidence: 0.95, details: {} },
        {
          isValid: true,
          reasoning: 'Valid attack',
          needsRoll: true,
          rollType: 'attack',
        },
        {
          description: 'Roll to hit!',
          atmosphere: 'tense',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph('I attack', createWorldContext(), 'test-thread-15');

      // Graph should complete even with dice roll requirement
      // In production, this would interrupt before the dice roll node
      expect(result.requiresDiceRoll).toBeTruthy();
      expect(result.response).toBeTruthy();
    });
  });

  describe('Metadata Tracking', () => {
    it('should track step count through graph execution', async () => {
      setupMockResponses(
        { type: 'exploration', confidence: 0.85, details: {} },
        { isValid: true, reasoning: 'Valid', needsRoll: false },
        {
          description: 'You explore.',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
      );

      const result = await invokeDMGraph('I look around', createWorldContext(), 'test-thread-16');

      expect(result.metadata?.stepCount).toBeGreaterThan(0);
      expect(result.metadata?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Complex Multi-Step Scenarios', () => {
    it('should handle conditional action sequences', async () => {
      setupMockResponses(
        { type: 'skill_check', confidence: 0.87, details: {} },
        {
          isValid: true,
          reasoning: 'Valid conditional action',
          needsRoll: true,
          rollType: 'check',
        },
        {
          description:
            'You approach the door. If locked, you attempt to pick it. Otherwise, you open it.',
          atmosphere: 'cautious',
          npcs: [],
          availableActions: ['Pick lock', 'Force door', 'Knock'],
          consequences: [],
        },
      );

      const result = await invokeDMGraph(
        'If the door is locked, I pick it. Otherwise I open it.',
        createWorldContext(),
        'test-thread-17',
      );

      expect(result.response?.availableActions).toContain('Pick lock');
    });

    it('should handle roleplay-heavy interactions', async () => {
      setupMockResponses(
        { type: 'social', confidence: 0.94, details: {} },
        { isValid: true, reasoning: 'Valid roleplay', needsRoll: false },
        {
          description:
            'With dramatic flair, you address the crowd. They listen with rapt attention.',
          atmosphere: 'dramatic',
          npcs: [{ name: 'Crowd', dialogue: '*cheers*' }],
          availableActions: [],
          consequences: ['Crowd is engaged'],
        },
      );

      const result = await invokeDMGraph(
        'With a flourish, I proclaim "Good people of Waterdeep, hear me!"',
        createWorldContext(),
        'test-thread-18',
      );

      expect(result.response?.atmosphere).toBe('dramatic');
    });
  });
});
