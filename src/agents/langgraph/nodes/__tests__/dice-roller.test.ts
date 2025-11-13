/**
 * Tests for Dice Roller Node
 *
 * Comprehensive test suite for dice rolling functionality including:
 * - Standard rolls (d20, 2d6, etc.)
 * - Advantage/disadvantage mechanics
 * - Success determination vs DC/AC
 * - Edge cases and error handling
 *
 * @module agents/langgraph/nodes/__tests__/dice-roller.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rollDice } from '../dice-roller';
import type { DMState, DiceRollRequest, DiceRollResult } from '../../state';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';

// Mock the dice-roller library
vi.mock('@dice-roller/rpg-dice-roller', () => {
  return {
    DiceRoll: vi.fn(),
  };
});

// Mock the logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('rollDice', () => {
  let mockState: DMState;
  let mockDiceRoll: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock state
    mockState = {
      messages: [],
      playerInput: 'I attack the goblin',
      playerIntent: 'attack',
      rulesValidation: null,
      worldContext: {
        campaignId: 'test-campaign',
        sessionId: 'test-session',
        characterIds: ['char-1'],
      },
      response: null,
      requiresDiceRoll: null,
      error: null,
      metadata: {
        timestamp: new Date(),
        stepCount: 0,
      },
    };

    // Setup default dice roll mock
    mockDiceRoll = {
      total: 15,
      rolls: [{ sides: 20, value: 15 }],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Skip Behavior', () => {
    it('should skip rolling when requiresDiceRoll is null', async () => {
      mockState.requiresDiceRoll = null;

      const result = await rollDice(mockState);

      expect(result).toEqual({});
      expect(DiceRoll).not.toHaveBeenCalled();
    });

    it('should clear requiresDiceRoll after rolling', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'perception check',
        dc: 15,
      };

      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.requiresDiceRoll).toBeNull();
    });
  });

  describe('Standard Rolls', () => {
    it('should roll standard d20', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'athletics check',
        dc: 15,
      };

      mockDiceRoll.total = 18;
      mockDiceRoll.rolls = [{ sides: 20, value: 18 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('d20');
      expect(result.metadata?.lastDiceRoll).toMatchObject({
        formula: 'd20',
        total: 18,
        success: true,
        dc: 15,
        type: 'check',
      });
    });

    it('should roll 2d6 damage', async () => {
      mockState.requiresDiceRoll = {
        type: 'damage',
        formula: '2d6',
        reason: 'shortsword damage',
      };

      mockDiceRoll.total = 8;
      mockDiceRoll.rolls = [
        { sides: 6, value: 5 },
        { sides: 6, value: 3 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('2d6');
      expect(result.metadata?.lastDiceRoll).toMatchObject({
        formula: '2d6',
        total: 8,
        success: true, // Damage rolls always succeed
        type: 'damage',
      });
    });

    it('should roll with modifier (d20+5)', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20+5',
        reason: 'stealth check',
        dc: 20,
      };

      mockDiceRoll.total = 22; // 17 + 5
      mockDiceRoll.rolls = [{ sides: 20, value: 17 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('d20+5');
      expect(result.metadata?.lastDiceRoll).toMatchObject({
        formula: 'd20+5',
        total: 22,
        success: true,
        dc: 20,
      });
    });
  });

  describe('Advantage Mechanics', () => {
    it('should handle advantage (2d20kh1)', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'intimidation check',
        dc: 15,
        advantage: true,
      };

      mockDiceRoll.total = 18;
      mockDiceRoll.rolls = [
        { sides: 20, value: 18 },
        { sides: 20, value: 12 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('2d20kh1');
      expect(result.metadata?.lastDiceRoll?.formula).toBe('2d20kh1');
      expect(result.metadata?.lastDiceRoll?.total).toBe(18);
    });

    it('should handle advantage with modifier (2d20kh1+3)', async () => {
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+3',
        reason: 'longsword attack',
        ac: 16,
        advantage: true,
      };

      mockDiceRoll.total = 20; // 17 (kept) + 3
      mockDiceRoll.rolls = [
        { sides: 20, value: 17 },
        { sides: 20, value: 10 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('2d20kh1+3');
      expect(result.metadata?.lastDiceRoll?.success).toBe(true);
    });
  });

  describe('Disadvantage Mechanics', () => {
    it('should handle disadvantage (2d20kl1)', async () => {
      mockState.requiresDiceRoll = {
        type: 'save',
        formula: 'd20',
        reason: 'wisdom save',
        dc: 12,
        disadvantage: true,
      };

      mockDiceRoll.total = 8;
      mockDiceRoll.rolls = [
        { sides: 20, value: 15 },
        { sides: 20, value: 8 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('2d20kl1');
      expect(result.metadata?.lastDiceRoll?.formula).toBe('2d20kl1');
      expect(result.metadata?.lastDiceRoll?.total).toBe(8);
      expect(result.metadata?.lastDiceRoll?.success).toBe(false);
    });

    it('should handle disadvantage with modifier (2d20kl1-1)', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20-1',
        reason: 'strength check',
        dc: 10,
        disadvantage: true,
      };

      mockDiceRoll.total = 7; // 8 (kept) - 1
      mockDiceRoll.rolls = [
        { sides: 20, value: 8 },
        { sides: 20, value: 14 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('2d20kl1-1');
      expect(result.metadata?.lastDiceRoll?.success).toBe(false);
    });
  });

  describe('Success Determination', () => {
    describe('Ability Checks', () => {
      it('should determine success vs DC for ability checks', async () => {
        mockState.requiresDiceRoll = {
          type: 'check',
          formula: 'd20+4',
          reason: 'investigation check',
          dc: 15,
          skill: 'investigation',
        };

        mockDiceRoll.total = 16;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(true);
        expect(result.metadata?.lastDiceRoll?.dc).toBe(15);
      });

      it('should handle failed ability check', async () => {
        mockState.requiresDiceRoll = {
          type: 'check',
          formula: 'd20+2',
          reason: 'acrobatics check',
          dc: 18,
        };

        mockDiceRoll.total = 14;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(false);
      });

      it('should handle exactly meeting DC', async () => {
        mockState.requiresDiceRoll = {
          type: 'check',
          formula: 'd20+3',
          reason: 'perception check',
          dc: 15,
        };

        mockDiceRoll.total = 15;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(true);
      });
    });

    describe('Saving Throws', () => {
      it('should determine success vs DC for saves', async () => {
        mockState.requiresDiceRoll = {
          type: 'save',
          formula: 'd20+6',
          reason: 'dexterity save',
          dc: 14,
        };

        mockDiceRoll.total = 19;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(true);
        expect(result.metadata?.lastDiceRoll?.type).toBe('save');
      });

      it('should handle failed saving throw', async () => {
        mockState.requiresDiceRoll = {
          type: 'save',
          formula: 'd20+1',
          reason: 'constitution save',
          dc: 16,
        };

        mockDiceRoll.total = 12;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(false);
      });
    });

    describe('Attack Rolls', () => {
      it('should determine success vs AC for attacks', async () => {
        mockState.requiresDiceRoll = {
          type: 'attack',
          formula: 'd20+5',
          reason: 'shortbow attack',
          ac: 14,
        };

        mockDiceRoll.total = 18;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(true);
        expect(result.metadata?.lastDiceRoll?.ac).toBe(14);
        expect(result.metadata?.lastDiceRoll?.type).toBe('attack');
      });

      it('should handle missed attack', async () => {
        mockState.requiresDiceRoll = {
          type: 'attack',
          formula: 'd20+3',
          reason: 'dagger attack',
          ac: 17,
        };

        mockDiceRoll.total = 14;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(false);
      });

      it('should handle exactly meeting AC', async () => {
        mockState.requiresDiceRoll = {
          type: 'attack',
          formula: 'd20+4',
          reason: 'mace attack',
          ac: 15,
        };

        mockDiceRoll.total = 15;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll?.success).toBe(true);
      });
    });

    describe('No Target Number', () => {
      it('should handle check without DC', async () => {
        mockState.requiresDiceRoll = {
          type: 'check',
          formula: 'd20+2',
          reason: 'general ability check',
        };

        mockDiceRoll.total = 14;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll).toMatchObject({
          total: 14,
          success: false,
          dc: undefined,
        });
      });

      it('should handle attack without AC', async () => {
        mockState.requiresDiceRoll = {
          type: 'attack',
          formula: 'd20+3',
          reason: 'attack roll',
        };

        mockDiceRoll.total = 16;
        (DiceRoll as any).mockImplementation(() => mockDiceRoll);

        const result = await rollDice(mockState);

        expect(result.metadata?.lastDiceRoll).toMatchObject({
          total: 16,
          success: false,
          ac: undefined,
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle advantage + disadvantage canceling out', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20+2',
        reason: 'persuasion check',
        dc: 15,
        advantage: true,
        disadvantage: true,
      };

      mockDiceRoll.total = 17;
      mockDiceRoll.rolls = [{ sides: 20, value: 15 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      // Should use standard d20+2, not 2d20kh1+2 or 2d20kl1+2
      expect(DiceRoll).toHaveBeenCalledWith('d20+2');
      expect(result.metadata?.lastDiceRoll?.formula).toBe('d20+2');
    });

    it('should handle natural 20 (critical success)', async () => {
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+3',
        reason: 'greatsword attack',
        ac: 25, // Very high AC
      };

      mockDiceRoll.total = 23; // Natural 20 + 3
      mockDiceRoll.rolls = [{ sides: 20, value: 20 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      // Even though total (23) < AC (25), we could track nat 20s
      expect(result.metadata?.lastDiceRoll?.total).toBe(23);
      expect(result.metadata?.lastDiceRoll?.rolls[0].value).toBe(20);
    });

    it('should handle natural 1 (critical failure)', async () => {
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+10',
        reason: 'expert attack',
        ac: 5, // Very low AC
      };

      mockDiceRoll.total = 11; // Natural 1 + 10
      mockDiceRoll.rolls = [{ sides: 20, value: 1 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.metadata?.lastDiceRoll?.total).toBe(11);
      expect(result.metadata?.lastDiceRoll?.rolls[0].value).toBe(1);
      expect(result.metadata?.lastDiceRoll?.success).toBe(true); // Still hits due to modifier
    });

    it('should handle multiple dice types in one formula', async () => {
      mockState.requiresDiceRoll = {
        type: 'damage',
        formula: '1d8+1d6+3',
        reason: 'flame tongue damage',
      };

      mockDiceRoll.total = 12;
      mockDiceRoll.rolls = [
        { sides: 8, value: 5 },
        { sides: 6, value: 4 },
      ];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(DiceRoll).toHaveBeenCalledWith('1d8+1d6+3');
      expect(result.metadata?.lastDiceRoll?.total).toBe(12);
    });

    it('should preserve non-d20 formulas when advantage is specified', async () => {
      mockState.requiresDiceRoll = {
        type: 'damage',
        formula: '2d6+2',
        reason: 'greatsword damage',
        advantage: true, // Should not affect non-d20 rolls
      };

      mockDiceRoll.total = 9;
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      // Should not modify the formula for non-d20 rolls
      expect(DiceRoll).toHaveBeenCalledWith('2d6+2');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing formula', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: '',
        reason: 'invalid check',
        dc: 15,
      };

      const result = await rollDice(mockState);

      expect(result.error).toBe('Invalid dice roll: no formula specified');
      expect(result.requiresDiceRoll).toBeNull();
    });

    it('should handle invalid dice formula', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'not-a-valid-formula',
        reason: 'broken check',
        dc: 15,
      };

      (DiceRoll as any).mockImplementation(() => {
        throw new Error('Invalid notation');
      });

      const result = await rollDice(mockState);

      expect(result.error).toBe('Invalid dice formula: not-a-valid-formula');
      expect(result.requiresDiceRoll).toBeNull();
    });

    it('should handle dice roller library errors gracefully', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'test check',
        dc: 15,
      };

      (DiceRoll as any).mockImplementation(() => {
        throw new Error('Unexpected library error');
      });

      const result = await rollDice(mockState);

      expect(result.error).toBe('Invalid dice formula: d20');
      expect(result.requiresDiceRoll).toBeNull();
    });

    it('should handle unexpected errors', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'test check',
        dc: 15,
      };

      // Mock property access error
      Object.defineProperty(mockDiceRoll, 'total', {
        get() {
          throw new Error('Property access error');
        },
      });
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.error).toContain('Dice roll failed:');
      expect(result.requiresDiceRoll).toBeNull();
    });

    it('should clear requiresDiceRoll even on error', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'invalid',
        reason: 'error test',
      };

      (DiceRoll as any).mockImplementation(() => {
        throw new Error('Roll failed');
      });

      const result = await rollDice(mockState);

      expect(result.requiresDiceRoll).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Metadata Updates', () => {
    it('should increment step count', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'test check',
      };
      mockState.metadata!.stepCount = 5;

      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.metadata?.stepCount).toBe(6);
    });

    it('should preserve existing metadata', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20',
        reason: 'test check',
      };
      mockState.metadata = {
        timestamp: new Date('2024-01-01'),
        stepCount: 3,
        tokensUsed: 100,
      };

      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.metadata?.timestamp).toEqual(new Date('2024-01-01'));
      expect(result.metadata?.tokensUsed).toBe(100);
      expect(result.metadata?.stepCount).toBe(4);
    });

    it('should store lastDiceRoll in metadata', async () => {
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+7',
        reason: 'sword attack',
        ac: 15,
      };

      mockDiceRoll.total = 22;
      mockDiceRoll.rolls = [{ sides: 20, value: 15 }];
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      const lastRoll = result.metadata?.lastDiceRoll as DiceRollResult;
      expect(lastRoll).toBeDefined();
      expect(lastRoll.formula).toBe('d20+7');
      expect(lastRoll.total).toBe(22);
      expect(lastRoll.success).toBe(true);
      expect(lastRoll.ac).toBe(15);
      expect(lastRoll.type).toBe('attack');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiattack scenario', async () => {
      // First attack
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+5',
        reason: 'first attack',
        ac: 16,
      };

      mockDiceRoll.total = 18;
      (DiceRoll as any).mockImplementation(() => ({ ...mockDiceRoll }));

      const result1 = await rollDice(mockState);
      expect(result1.metadata?.lastDiceRoll?.success).toBe(true);

      // Second attack with disadvantage
      mockState.requiresDiceRoll = {
        type: 'attack',
        formula: 'd20+5',
        reason: 'second attack',
        ac: 16,
        disadvantage: true,
      };

      mockDiceRoll.total = 12;
      (DiceRoll as any).mockImplementation(() => ({ ...mockDiceRoll }));

      const result2 = await rollDice(mockState);
      expect(DiceRoll).toHaveBeenLastCalledWith('2d20kl1+5');
      expect(result2.metadata?.lastDiceRoll?.success).toBe(false);
    });

    it('should handle skill check with expertise (double proficiency)', async () => {
      mockState.requiresDiceRoll = {
        type: 'check',
        formula: 'd20+8', // Expertise could mean +8 modifier
        reason: 'thieves tools check',
        dc: 20,
        skill: 'thieves_tools',
      };

      mockDiceRoll.total = 24;
      (DiceRoll as any).mockImplementation(() => mockDiceRoll);

      const result = await rollDice(mockState);

      expect(result.metadata?.lastDiceRoll?.success).toBe(true);
      expect(result.metadata?.lastDiceRoll?.total).toBe(24);
    });

    it('should handle group check scenario', async () => {
      const groupDCs = [10, 12, 15];
      const results = [];

      for (const dc of groupDCs) {
        mockState.requiresDiceRoll = {
          type: 'check',
          formula: 'd20+3',
          reason: 'group stealth check',
          dc,
        };

        mockDiceRoll.total = 13;
        (DiceRoll as any).mockImplementation(() => ({ ...mockDiceRoll }));

        const result = await rollDice(mockState);
        results.push(result.metadata?.lastDiceRoll?.success);
      }

      expect(results).toEqual([true, true, false]);
    });
  });
});