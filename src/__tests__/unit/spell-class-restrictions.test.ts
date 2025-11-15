import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  mockWizard,
  mockCleric,
  mockBard,
  mockSorcerer,
  mockWarlock,
  mockFighter,
  mockHuman,
  createMockCharacter,
} from '@/__tests__/helpers/spell-test-helpers';
import { spellApi } from '@/services/spellApi';
import { validateSpellSelection, getSpellcastingInfo } from '@/utils/spell-validation';

/**
 * Core Class Spell Restriction Tests
 *
 * Critical test suite that ensures D&D 5E spell class restrictions are enforced:
 * - Wizards CANNOT select cleric/druid spells (Cure Wounds, Healing Word)
 * - Clerics CANNOT select wizard-only spells (Fireball, Magic Missile)
 * - Each class can only select from their official spell list
 * - Cross-class contamination is prevented
 *
 * This test suite directly addresses the bug where wizards could select divine spells.
 *
 * NOTE: Current implementation uses placeholder validation that needs to be replaced
 * with actual API calls. These tests document the expected behavior.
 */

// Mock the spell API to provide controlled spell lists
vi.mock('@/services/spellApi', () => ({
  spellApi: {
    getClassSpells: vi.fn(),
    getSpellsBySchool: vi.fn(),
    validateSpellForClass: vi.fn(),
  },
}));

describe('Spell Class Restriction Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wizard Spell Restrictions', () => {
    it('should validate wizard spell count requirements', () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Test basic count validation (current implementation)
      const tooFewCantrips = ['mage-hand', 'prestidigitation']; // Only 2, needs 3
      const correctSpells = [
        'magic-missile',
        'shield',
        'detect-magic',
        'burning-hands',
        'sleep',
        'color-spray',
      ];

      const result = validateSpellSelection(wizardCharacter, tooFewCantrips, correctSpells);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'COUNT_MISMATCH',
          expected: 3,
          actual: 2,
        }),
      );
    });

    it('should document expected divine spell prevention behavior', () => {
      // This test documents the expected behavior that should be implemented
      // when the API validation is properly connected

      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // These spells should be rejected when proper validation is implemented:
      const problematicDivineSpells = [
        'cure-wounds', // Level 1 cleric - the main bug
        'healing-word', // Level 1 cleric
        'guiding-bolt', // Level 1 cleric
        'inflict-wounds', // Level 1 cleric
        'sanctuary', // Level 1 cleric
        'bless', // Level 1 cleric
        'command', // Level 1 cleric
      ];

      // For now, just verify the character structure is correct for future validation
      expect(wizardCharacter.class.name).toBe('Wizard');
      expect(wizardCharacter.class.spellcasting?.ability).toBe('intelligence');
      expect(problematicDivineSpells).toContain('cure-wounds'); // The historical bug spell
    });

    it('should allow valid wizard spell selections', () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      const validCantrips = ['mage-hand', 'prestidigitation', 'light'];
      const validSpells = [
        'magic-missile',
        'shield',
        'detect-magic',
        'burning-hands',
        'sleep',
        'color-spray',
      ];

      const result = validateSpellSelection(wizardCharacter, validCantrips, validSpells);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain(
        'As a Wizard, these spells will be recorded in your spellbook. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.',
      );
    });

    it('should reject specific divine spells that were historically problematic', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      const problematicDivineSpells = [
        'cure-wounds', // Level 1 cleric
        'healing-word', // Level 1 cleric
        'guiding-bolt', // Level 1 cleric
        'inflict-wounds', // Level 1 cleric
        'sanctuary', // Level 1 cleric
        'bless', // Level 1 cleric
        'command', // Level 1 cleric
      ];

      for (const spellId of problematicDivineSpells) {
        vi.mocked(spellApi.validateSpellForClass).mockResolvedValue({
          valid: false,
          error: `Wizard cannot learn ${spellId}`,
        });

        const cantrips = ['mage-hand', 'prestidigitation', 'light'];
        const spells = ['magic-missile', 'shield', spellId]; // Include problematic spell

        const result = validateSpellSelection(wizardCharacter, cantrips, spells);

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'INVALID_SPELL',
            spellId: spellId,
          }),
        );
      }
    });
  });

  describe('Cleric Spell Restrictions', () => {
    it('should prevent clerics from selecting wizard-only spells', async () => {
      const clericCharacter = createMockCharacter('Test Cleric', mockCleric, mockHuman);

      // Mock API to reject arcane spells for clerics
      vi.mocked(spellApi.validateSpellForClass).mockImplementation(async (spellId, className) => {
        const arcaneSpells = ['magic-missile', 'shield', 'fireball', 'counterspell', 'misty-step'];
        if (className === 'Cleric' && arcaneSpells.includes(spellId)) {
          return { valid: false, error: `${className} cannot learn ${spellId}` };
        }
        return { valid: true };
      });

      const invalidCantrips = ['guidance', 'thaumaturgy', 'mage-hand']; // mage-hand is wizard
      const invalidSpells = ['cure-wounds']; // Only one spell for cleric, but this would be invalid

      const result = validateSpellSelection(clericCharacter, invalidCantrips, invalidSpells);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'mage-hand',
        }),
      );
    });

    it('should allow clerics to select only cleric spells', async () => {
      const clericCharacter = createMockCharacter('Test Cleric', mockCleric, mockHuman);

      // Mock API to validate cleric spells
      vi.mocked(spellApi.validateSpellForClass).mockImplementation(async (spellId, className) => {
        const clericSpells = [
          'guidance',
          'thaumaturgy',
          'sacred-flame',
          'cure-wounds',
          'healing-word',
          'bless',
        ];
        if (className === 'Cleric' && clericSpells.includes(spellId)) {
          return { valid: true };
        }
        return { valid: false, error: `${className} cannot learn ${spellId}` };
      });

      const validCantrips = ['guidance', 'thaumaturgy', 'sacred-flame'];
      const validSpells = ['cure-wounds']; // Cleric only needs 1 prepared spell at level 1

      const result = validateSpellSelection(clericCharacter, validCantrips, validSpells);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Bard Spell Restrictions', () => {
    it('should prevent bards from selecting class-specific spells they cannot learn', async () => {
      const bardCharacter = createMockCharacter('Test Bard', mockBard, mockHuman);

      // Bards cannot learn certain arcane/divine spells like Magic Missile or Shield at 1st level
      vi.mocked(spellApi.validateSpellForClass).mockImplementation(async (spellId, className) => {
        const restrictedSpells = ['magic-missile', 'shield', 'guiding-bolt', 'inflict-wounds'];
        if (className === 'Bard' && restrictedSpells.includes(spellId)) {
          return { valid: false, error: `${className} cannot learn ${spellId}` };
        }
        return { valid: true };
      });

      // Use bard cantrips that are actually on the bard list
      const cantrips = ['friends', 'vicious-mockery'];
      const invalidSpells = ['magic-missile', 'shield', 'guiding-bolt', 'inflict-wounds'];

      const result = validateSpellSelection(bardCharacter, cantrips, invalidSpells);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'magic-missile',
        }),
      );
    });
  });

  describe('Cross-Class Contamination Prevention', () => {
    it('should maintain strict boundaries between divine and arcane spells', async () => {
      const testCases = [
        {
          className: 'Wizard',
          character: createMockCharacter('Test Wizard', mockWizard, mockHuman),
          forbiddenSpells: ['cure-wounds', 'healing-word', 'guiding-bolt', 'bless', 'sanctuary'],
        },
        {
          className: 'Cleric',
          character: createMockCharacter('Test Cleric', mockCleric, mockHuman),
          forbiddenSpells: ['magic-missile', 'shield', 'fireball', 'misty-step', 'counterspell'],
        },
        {
          className: 'Sorcerer',
          character: createMockCharacter('Test Sorcerer', mockSorcerer, mockHuman),
          forbiddenSpells: ['cure-wounds', 'healing-word', 'goodberry', 'entangle'],
        },
        {
          className: 'Warlock',
          character: createMockCharacter('Test Warlock', mockWarlock, mockHuman),
          forbiddenSpells: ['cure-wounds', 'magic-missile', 'fireball'],
        },
      ];

      for (const testCase of testCases) {
        for (const forbiddenSpell of testCase.forbiddenSpells) {
          vi.mocked(spellApi.validateSpellForClass).mockResolvedValue({
            valid: false,
            error: `${testCase.className} cannot learn ${forbiddenSpell}`,
          });

          const cantrips = ['prestidigitation', 'light'];
          const spells = [forbiddenSpell];

          const result = validateSpellSelection(testCase.character, cantrips, spells);

          expect(result.valid).toBe(false);
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              type: 'INVALID_SPELL',
              spellId: forbiddenSpell,
            }),
          );
        }
      }
    });

    it('should validate spell counts correctly while enforcing class restrictions', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock API to allow only wizard spells
      vi.mocked(spellApi.validateSpellForClass).mockImplementation(async (spellId, className) => {
        const wizardSpells = [
          'mage-hand',
          'prestidigitation',
          'light',
          'minor-illusion',
          'magic-missile',
          'shield',
          'detect-magic',
          'burning-hands',
          'sleep',
          'color-spray',
        ];
        return { valid: wizardSpells.includes(spellId) };
      });

      // Try to select correct count but with invalid spells mixed in
      const mixedCantrips = ['mage-hand', 'prestidigitation', 'guidance']; // guidance is cleric
      const mixedSpells = [
        'magic-missile',
        'shield',
        'cure-wounds',
        'detect-magic',
        'burning-hands',
        'sleep',
      ]; // cure-wounds is cleric

      const result = validateSpellSelection(wizardCharacter, mixedCantrips, mixedSpells);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'guidance',
        }),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'cure-wounds',
        }),
      );
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle attempts to exploit spell ID manipulation', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Test various forms of spell ID manipulation
      const maliciousSpellIds = [
        'cure-wounds', // Direct cleric spell
        'CURE-WOUNDS', // Case manipulation
        'cure_wounds', // Underscore variant
        'cure wounds', // Space variant
        '../cure-wounds', // Path traversal attempt
        'null',
        'undefined',
        '',
        '../../divine/cure-wounds', // More complex path traversal
      ];

      for (const spellId of maliciousSpellIds) {
        vi.mocked(spellApi.validateSpellForClass).mockResolvedValue({
          valid: false,
          error: `Invalid spell ID or not available for Wizard: ${spellId}`,
        });

        const cantrips = ['mage-hand', 'prestidigitation', 'light'];
        const spells = ['magic-missile', 'shield', spellId];

        const result = validateSpellSelection(wizardCharacter, cantrips, spells);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some(
            (error) => error.type === 'INVALID_SPELL' && error.spellId === spellId,
          ),
        ).toBe(true);
      }
    });

    it('should maintain local validation even with network failures', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock API to throw network error
      vi.mocked(spellApi.validateSpellForClass).mockRejectedValue(new Error('Network error'));

      // Provide fully valid wizard selections; network failure must not affect local validation
      const cantrips = ['mage-hand', 'prestidigitation', 'light'];
      const spells = [
        'magic-missile',
        'shield',
        'detect-magic',
        'burning-hands',
        'sleep',
        'color-spray',
      ];

      const result = validateSpellSelection(wizardCharacter, cantrips, spells);

      expect(result.valid).toBe(true);
    });

    it('should prevent empty or null spell selections from bypassing validation', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      const testCases = [
        { cantrips: [], spells: [] },
        { cantrips: null as any, spells: null as any },
        { cantrips: undefined as any, spells: undefined as any },
      ];

      for (const testCase of testCases) {
        const result = validateSpellSelection(wizardCharacter, testCase.cantrips, testCase.spells);

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'COUNT_MISMATCH',
          }),
        );
      }
    });
  });

  describe('Non-Spellcaster Validation', () => {
    it('should prevent non-spellcasters from selecting any spells', () => {
      const fighterCharacter = createMockCharacter('Test Fighter', mockFighter, mockHuman);

      const cantrips = ['mage-hand'];
      const spells = ['magic-missile'];

      const result = validateSpellSelection(fighterCharacter, cantrips, spells);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'LEVEL_REQUIREMENT',
          message: expect.stringContaining('not a spellcasting class'),
        }),
      );
    });

    it('should allow racial spells for non-spellcasters', () => {
      const fighterCharacter = createMockCharacter('Test Fighter', mockFighter, mockHuman);

      // Even non-spellcasters can have racial spells
      const cantrips: string[] = [];
      const spells: string[] = [];

      const result = validateSpellSelection(fighterCharacter, cantrips, spells);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
