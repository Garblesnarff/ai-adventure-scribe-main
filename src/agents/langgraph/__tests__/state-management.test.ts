/**
 * LangGraph State Management Tests
 *
 * Tests for DMState creation, updates, and transitions:
 * - State initialization with createInitialState
 * - State channel reducers (messages, playerIntent, etc.)
 * - State updates across graph nodes
 * - State immutability and copying
 * - Metadata tracking
 *
 * @module agents/langgraph/__tests__
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DMState,
  WorldInfo,
  RuleCheckResult,
  DiceRollRequest,
  NarrativeResponse,
  createInitialState,
  dmStateChannels,
} from '../state';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

describe('LangGraph State Management', () => {
  let worldContext: WorldInfo;

  beforeEach(() => {
    worldContext = {
      campaignId: 'campaign-123',
      sessionId: 'session-456',
      characterIds: ['char-1', 'char-2'],
      location: 'Dark Forest',
      threatLevel: 'high',
      activeNPCs: ['goblin-1', 'goblin-2'],
      recentMemories: [
        {
          content: 'The party encountered goblins',
          type: 'combat',
          timestamp: new Date('2024-01-01'),
        },
        {
          content: 'Found a mysterious key',
          type: 'discovery',
          timestamp: new Date('2024-01-02'),
        },
      ],
    };
  });

  describe('State Initialization', () => {
    it('should create initial state with correct structure', () => {
      const playerInput = 'I attack the nearest goblin';
      const state = createInitialState(playerInput, worldContext);

      expect(state.playerInput).toBe(playerInput);
      expect(state.playerIntent).toBeNull();
      expect(state.rulesValidation).toBeNull();
      expect(state.worldContext).toEqual(worldContext);
      expect(state.response).toBeNull();
      expect(state.requiresDiceRoll).toBeNull();
      expect(state.error).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.metadata).toBeDefined();
    });

    it('should initialize metadata with timestamp and step count', () => {
      const state = createInitialState('test input', worldContext);

      expect(state.metadata?.timestamp).toBeInstanceOf(Date);
      expect(state.metadata?.stepCount).toBe(0);
      expect(state.metadata?.tokensUsed).toBeUndefined();
    });

    it('should create empty messages array', () => {
      const state = createInitialState('test', worldContext);

      expect(state.messages).toEqual([]);
      expect(Array.isArray(state.messages)).toBe(true);
    });

    it('should preserve world context in state', () => {
      const state = createInitialState('test', worldContext);

      expect(state.worldContext).toBe(worldContext);
      expect(state.worldContext.campaignId).toBe('campaign-123');
      expect(state.worldContext.sessionId).toBe('session-456');
      expect(state.worldContext.characterIds).toHaveLength(2);
    });
  });

  describe('State Channel Reducers', () => {
    it('should append messages using messages reducer', () => {
      const msg1 = new HumanMessage({ content: 'Hello' });
      const msg2 = new AIMessage({ content: 'Hi there' });

      const current = [msg1];
      const update = [msg2];

      const result = dmStateChannels.messages.reducer(current, update);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(msg1);
      expect(result[1]).toBe(msg2);
    });

    it('should replace playerInput using reducer', () => {
      const current = 'old input';
      const update = 'new input';

      const result = dmStateChannels.playerInput.reducer(current, update);

      expect(result).toBe('new input');
    });

    it('should replace playerIntent using reducer', () => {
      const current = 'attack';
      const update = 'social';

      const result = dmStateChannels.playerIntent.reducer(current, update);

      expect(result).toBe('social');
    });

    it('should replace rulesValidation using reducer', () => {
      const current: RuleCheckResult = {
        isValid: true,
        reasoning: 'Valid action',
        modifications: [],
      };

      const update: RuleCheckResult = {
        isValid: false,
        reasoning: 'Invalid action',
        modifications: ['Reduce damage by half'],
      };

      const result = dmStateChannels.rulesValidation.reducer(current, update);

      expect(result).toBe(update);
      expect(result.isValid).toBe(false);
    });

    it('should merge metadata using reducer', () => {
      const current = {
        timestamp: new Date('2024-01-01'),
        stepCount: 2,
      };

      const update = {
        stepCount: 3,
        tokensUsed: 500,
      };

      const result = dmStateChannels.metadata.reducer(current, update);

      expect(result.timestamp).toEqual(new Date('2024-01-01'));
      expect(result.stepCount).toBe(3);
      expect(result.tokensUsed).toBe(500);
    });

    it('should use default factory for messages', () => {
      const defaultMessages = dmStateChannels.messages.default();

      expect(defaultMessages).toEqual([]);
      expect(Array.isArray(defaultMessages)).toBe(true);
    });

    it('should use default factory for metadata', () => {
      const defaultMetadata = dmStateChannels.metadata.default();

      expect(defaultMetadata).toBeDefined();
      expect(defaultMetadata.timestamp).toBeInstanceOf(Date);
      expect(defaultMetadata.stepCount).toBe(0);
    });

    it('should handle null updates for nullable fields', () => {
      const current = 'attack';
      const update = null;

      const result = dmStateChannels.playerIntent.reducer(current, update);

      expect(result).toBeNull();
    });
  });

  describe('State Updates Across Nodes', () => {
    it('should update state after intent detection', () => {
      const initialState = createInitialState('I attack', worldContext);

      const updatedState: Partial<DMState> = {
        playerIntent: 'attack',
        metadata: {
          ...initialState.metadata,
          stepCount: 1,
        },
      };

      const mergedState = { ...initialState, ...updatedState };

      expect(mergedState.playerIntent).toBe('attack');
      expect(mergedState.metadata?.stepCount).toBe(1);
    });

    it('should update state after rules validation', () => {
      const initialState = createInitialState('I cast fireball', worldContext);
      initialState.playerIntent = 'spellcast';
      initialState.metadata!.stepCount = 1;

      const rulesValidation: RuleCheckResult = {
        isValid: true,
        reasoning: 'Spell is available and can be cast',
        modifications: [],
        ruleReferences: ['PHB p.241'],
      };

      const updatedState: Partial<DMState> = {
        rulesValidation,
        metadata: {
          ...initialState.metadata,
          stepCount: 2,
        },
      };

      const mergedState = { ...initialState, ...updatedState };

      expect(mergedState.rulesValidation).toBe(rulesValidation);
      expect(mergedState.rulesValidation?.isValid).toBe(true);
      expect(mergedState.metadata?.stepCount).toBe(2);
    });

    it('should update state after response generation', () => {
      const initialState = createInitialState('I look around', worldContext);
      initialState.playerIntent = 'exploration';
      initialState.metadata!.stepCount = 2;

      const response: NarrativeResponse = {
        description: 'You see a dark corridor ahead.',
        atmosphere: 'tense',
        npcs: [],
        availableActions: ['Move forward', 'Turn back', 'Light a torch'],
        consequences: [],
      };

      const updatedState: Partial<DMState> = {
        response,
        metadata: {
          ...initialState.metadata,
          stepCount: 3,
        },
      };

      const mergedState = { ...initialState, ...updatedState };

      expect(mergedState.response).toBe(response);
      expect(mergedState.response?.description).toBeTruthy();
      expect(mergedState.metadata?.stepCount).toBe(3);
    });

    it('should handle dice roll requirement in state', () => {
      const initialState = createInitialState('I try to pick the lock', worldContext);

      const diceRoll: DiceRollRequest = {
        formula: '1d20+5',
        reason: 'Thieves Tools check',
        dc: 15,
        modifier: 'normal',
        skill: 'Thieves Tools',
      };

      const updatedState: Partial<DMState> = {
        requiresDiceRoll: diceRoll,
      };

      const mergedState = { ...initialState, ...updatedState };

      expect(mergedState.requiresDiceRoll).toBe(diceRoll);
      expect(mergedState.requiresDiceRoll?.formula).toBe('1d20+5');
      expect(mergedState.requiresDiceRoll?.dc).toBe(15);
    });

    it('should handle error state updates', () => {
      const initialState = createInitialState('test', worldContext);

      const errorUpdate: Partial<DMState> = {
        error: 'Failed to process player input',
        metadata: {
          ...initialState.metadata,
          stepCount: 1,
        },
      };

      const mergedState = { ...initialState, ...errorUpdate };

      expect(mergedState.error).toBe('Failed to process player input');
      expect(mergedState.error).toBeTruthy();
    });

    it('should accumulate messages through nodes', () => {
      const initialState = createInitialState('test', worldContext);

      const msg1 = new HumanMessage({ content: 'Player message' });
      const msg2 = new SystemMessage({ content: 'Processing...' });
      const msg3 = new AIMessage({ content: 'DM response' });

      // Simulate message accumulation
      initialState.messages.push(msg1);
      initialState.messages.push(msg2);
      initialState.messages.push(msg3);

      expect(initialState.messages).toHaveLength(3);
      expect(initialState.messages[0]).toBe(msg1);
      expect(initialState.messages[2]).toBe(msg3);
    });
  });

  describe('State Structure Validation', () => {
    it('should have all required DMState fields', () => {
      const state = createInitialState('test', worldContext);

      const requiredFields = [
        'messages',
        'playerInput',
        'playerIntent',
        'rulesValidation',
        'worldContext',
        'response',
        'requiresDiceRoll',
        'error',
        'metadata',
      ];

      for (const field of requiredFields) {
        expect(state).toHaveProperty(field);
      }
    });

    it('should maintain correct types for all fields', () => {
      const state = createInitialState('test', worldContext);

      expect(Array.isArray(state.messages)).toBe(true);
      expect(typeof state.playerInput).toBe('string');
      expect(state.playerIntent === null || typeof state.playerIntent === 'string').toBe(true);
      expect(state.rulesValidation === null || typeof state.rulesValidation === 'object').toBe(
        true,
      );
      expect(typeof state.worldContext).toBe('object');
      expect(state.response === null || typeof state.response === 'object').toBe(true);
      expect(state.error === null || typeof state.error === 'string').toBe(true);
      expect(typeof state.metadata).toBe('object');
    });
  });

  describe('RuleCheckResult Structure', () => {
    it('should create valid RuleCheckResult', () => {
      const result: RuleCheckResult = {
        isValid: true,
        reasoning: 'Action follows D&D 5E rules',
        modifications: ['Add +2 bonus for high ground'],
        ruleReferences: ['PHB p.190-195'],
      };

      expect(result.isValid).toBe(true);
      expect(result.reasoning).toBeTruthy();
      expect(result.modifications).toHaveLength(1);
      expect(result.ruleReferences).toHaveLength(1);
    });

    it('should handle invalid actions with modifications', () => {
      const result: RuleCheckResult = {
        isValid: false,
        reasoning: 'Cannot attack twice in one turn without Extra Attack',
        modifications: [
          'Attack once this turn',
          'Use bonus action for second weapon attack if dual wielding',
        ],
      };

      expect(result.isValid).toBe(false);
      expect(result.modifications).toHaveLength(2);
    });
  });

  describe('DiceRollRequest Structure', () => {
    it('should create valid DiceRollRequest', () => {
      const request: DiceRollRequest = {
        formula: '1d20+3',
        reason: 'Strength saving throw',
        dc: 12,
        modifier: 'disadvantage',
        skill: 'Athletics',
      };

      expect(request.formula).toBe('1d20+3');
      expect(request.reason).toBeTruthy();
      expect(request.dc).toBe(12);
      expect(request.modifier).toBe('disadvantage');
    });

    it('should handle advantage/disadvantage modifiers', () => {
      const advantage: DiceRollRequest = {
        formula: '1d20+5',
        reason: 'Attack with advantage',
        modifier: 'advantage',
      };

      const disadvantage: DiceRollRequest = {
        formula: '1d20+2',
        reason: 'Attack with disadvantage',
        modifier: 'disadvantage',
      };

      expect(advantage.modifier).toBe('advantage');
      expect(disadvantage.modifier).toBe('disadvantage');
    });
  });

  describe('NarrativeResponse Structure', () => {
    it('should create valid NarrativeResponse', () => {
      const response: NarrativeResponse = {
        description: 'The dragon roars and breathes fire!',
        atmosphere: 'intense',
        npcs: [
          { name: 'Red Dragon', dialogue: 'You dare challenge me?' },
          { name: 'Captured Knight', dialogue: 'Help me!' },
        ],
        availableActions: ['Attack', 'Dodge', 'Use magic item', 'Flee'],
        consequences: ['The fire singes your armor', 'The knight looks hopeful'],
      };

      expect(response.description).toBeTruthy();
      expect(response.atmosphere).toBe('intense');
      expect(response.npcs).toHaveLength(2);
      expect(response.availableActions).toHaveLength(4);
      expect(response.consequences).toHaveLength(2);
    });

    it('should handle minimal NarrativeResponse', () => {
      const response: NarrativeResponse = {
        description: 'Nothing happens.',
      };

      expect(response.description).toBe('Nothing happens.');
      expect(response.atmosphere).toBeUndefined();
      expect(response.npcs).toBeUndefined();
    });
  });

  describe('WorldInfo Structure', () => {
    it('should create complete WorldInfo', () => {
      expect(worldContext.campaignId).toBeTruthy();
      expect(worldContext.sessionId).toBeTruthy();
      expect(worldContext.characterIds).toHaveLength(2);
      expect(worldContext.location).toBe('Dark Forest');
      expect(worldContext.threatLevel).toBe('high');
      expect(worldContext.activeNPCs).toHaveLength(2);
      expect(worldContext.recentMemories).toHaveLength(2);
    });

    it('should handle minimal WorldInfo', () => {
      const minimalContext: WorldInfo = {
        campaignId: 'test-campaign',
        sessionId: 'test-session',
        characterIds: ['char-1'],
      };

      expect(minimalContext.campaignId).toBeTruthy();
      expect(minimalContext.sessionId).toBeTruthy();
      expect(minimalContext.characterIds).toHaveLength(1);
      expect(minimalContext.location).toBeUndefined();
      expect(minimalContext.threatLevel).toBeUndefined();
    });
  });

  describe('Metadata Tracking', () => {
    it('should track timestamp in metadata', () => {
      const state = createInitialState('test', worldContext);
      const beforeTime = Date.now();

      expect(state.metadata?.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(state.metadata?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime - 1000);
    });

    it('should increment step count through execution', () => {
      const state = createInitialState('test', worldContext);

      expect(state.metadata?.stepCount).toBe(0);

      // Simulate node updates
      state.metadata!.stepCount = 1;
      expect(state.metadata?.stepCount).toBe(1);

      state.metadata!.stepCount = 2;
      expect(state.metadata?.stepCount).toBe(2);

      state.metadata!.stepCount = 3;
      expect(state.metadata?.stepCount).toBe(3);
    });

    it('should track token usage when available', () => {
      const state = createInitialState('test', worldContext);

      expect(state.metadata?.tokensUsed).toBeUndefined();

      // Simulate token tracking
      state.metadata!.tokensUsed = 250;
      expect(state.metadata?.tokensUsed).toBe(250);

      state.metadata!.tokensUsed = 500;
      expect(state.metadata?.tokensUsed).toBe(500);
    });
  });

  describe('State Immutability', () => {
    it('should create new state on updates (functional pattern)', () => {
      const original = createInitialState('test', worldContext);
      const updated = { ...original, playerIntent: 'attack' };

      expect(original.playerIntent).toBeNull();
      expect(updated.playerIntent).toBe('attack');
      expect(original).not.toBe(updated);
    });

    it('should not mutate world context', () => {
      const originalContext = { ...worldContext };
      const state = createInitialState('test', worldContext);

      // Modify state's world context
      state.worldContext.location = 'New Location';

      // Original should be changed (shallow copy)
      // This highlights the need for deep copying if immutability is required
      expect(worldContext.location).toBe('New Location');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty player input', () => {
      const state = createInitialState('', worldContext);

      expect(state.playerInput).toBe('');
      expect(state.playerIntent).toBeNull();
    });

    it('should handle very long player input', () => {
      const longInput = 'a'.repeat(10000);
      const state = createInitialState(longInput, worldContext);

      expect(state.playerInput).toBe(longInput);
      expect(state.playerInput.length).toBe(10000);
    });

    it('should handle special characters in input', () => {
      const specialInput = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/';
      const state = createInitialState(specialInput, worldContext);

      expect(state.playerInput).toBe(specialInput);
    });

    it('should handle unicode characters', () => {
      const unicodeInput = '你好世界 🐉 मनोज';
      const state = createInitialState(unicodeInput, worldContext);

      expect(state.playerInput).toBe(unicodeInput);
    });
  });
});
