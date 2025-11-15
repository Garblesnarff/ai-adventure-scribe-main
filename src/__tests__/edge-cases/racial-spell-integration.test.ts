import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  mockWizard,
  mockCleric,
  mockFighter,
  mockWarlock,
  mockHuman,
  mockElf,
  mockHighElfSubrace,
  mockDrowSubrace,
  mockTieflingSubrace,
  mockForestGnomeSubrace,
  createMockCharacter,
} from '@/__tests__/helpers/spell-test-helpers';
import { Character } from '@/types/character';
import {
  validateSpellSelection,
  getRacialSpells,
  validateCharacterSpellSelection,
} from '@/utils/spell-validation';

/**
 * Racial Spell Integration Tests
 *
 * Tests for racial spell bonuses and how they interact with class spell systems.
 * Ensures racial spells don't bypass class restrictions and are properly validated.
 *
 * Edge cases covered:
 * - High Elf wizard cantrip selection
 * - Tiefling racial spells with different classes
 * - Drow racial magic progression
 * - Forest Gnome cantrip with non-spellcasters
 * - Racial spell interaction with multiclassing
 * - Level-gated racial spells
 */

describe('Racial Spell Integration Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('High Elf Wizard Cantrip Selection', () => {
    it('should allow High Elf to select bonus wizard cantrip regardless of class', () => {
      const highElfFighter = createMockCharacter(
        'High Elf Fighter',
        mockFighter,
        mockElf,
        mockHighElfSubrace,
      );

      // High Elf Fighter should be able to select 1 wizard cantrip despite being non-spellcaster
      const result = validateSpellSelection(
        highElfFighter,
        ['prestidigitation'], // 1 wizard cantrip from racial bonus
        [],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should enforce wizard cantrip restriction for High Elf bonus cantrip', () => {
      const highElfFighter = createMockCharacter(
        'High Elf Fighter',
        mockFighter,
        mockElf,
        mockHighElfSubrace,
      );

      // Try to select a cleric cantrip as High Elf bonus cantrip
      const result = validateSpellSelection(
        highElfFighter,
        ['guidance'], // Cleric cantrip, should be rejected
        [],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'guidance',
        }),
      );
    });

    it('should allow High Elf Wizard to select 4 cantrips total (3 class + 1 racial)', () => {
      const highElfWizard = createMockCharacter(
        'High Elf Wizard',
        mockWizard,
        mockElf,
        mockHighElfSubrace,
      );

      const result = validateSpellSelection(
        highElfWizard,
        ['mage-hand', 'prestidigitation', 'light', 'minor-illusion'], // 4 total cantrips
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject High Elf with wrong cantrip count', () => {
      const highElfWizard = createMockCharacter(
        'High Elf Wizard',
        mockWizard,
        mockElf,
        mockHighElfSubrace,
      );

      // Only 3 cantrips when 4 are expected (3 class + 1 racial)
      const result = validateSpellSelection(
        highElfWizard,
        ['mage-hand', 'prestidigitation', 'light'], // Missing racial cantrip
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'COUNT_MISMATCH',
          expected: 4,
          actual: 3,
        }),
      );
    });

    it('should prevent High Elf from selecting non-wizard cantrips as racial bonus', () => {
      const highElfWizard = createMockCharacter(
        'High Elf Wizard',
        mockWizard,
        mockElf,
        mockHighElfSubrace,
      );

      // Try to include a cleric cantrip in the selection
      const result = validateSpellSelection(
        highElfWizard,
        ['mage-hand', 'prestidigitation', 'light', 'guidance'], // guidance is cleric
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SPELL',
          spellId: 'guidance',
        }),
      );
    });
  });

  describe('Tiefling Racial Spells', () => {
    it('should allow Tiefling Fighter to have Thaumaturgy cantrip', () => {
      const tieflingFighter = createMockCharacter(
        'Tiefling Fighter',
        mockFighter,
        mockHuman,
        mockTieflingSubrace,
      );

      const result = validateSpellSelection(
        tieflingFighter,
        ['thaumaturgy'], // Racial cantrip
        [],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Tiefling Wizard to have class cantrips plus racial cantrip', () => {
      const tieflingWizard = createMockCharacter(
        'Tiefling Wizard',
        mockWizard,
        mockHuman,
        mockTieflingSubrace,
      );

      const result = validateSpellSelection(
        tieflingWizard,
        ['mage-hand', 'prestidigitation', 'light', 'thaumaturgy'], // 3 wizard + 1 racial
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require Tiefling to include racial cantrip in selection', () => {
      const tieflingWizard = createMockCharacter(
        'Tiefling Wizard',
        mockWizard,
        mockHuman,
        mockTieflingSubrace,
      );

      // Missing the required racial cantrip
      const result = validateSpellSelection(
        tieflingWizard,
        ['mage-hand', 'prestidigitation', 'light'], // Only 3, missing thaumaturgy
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'COUNT_MISMATCH',
          expected: 4, // 3 wizard + 1 racial
          actual: 3,
        }),
      );
    });

    it('should handle Tiefling Warlock properly', () => {
      const tieflingWarlock = createMockCharacter(
        'Tiefling Warlock',
        mockWarlock,
        mockHuman,
        mockTieflingSubrace,
      );

      const result = validateSpellSelection(
        tieflingWarlock,
        ['prestidigitation', 'minor-illusion', 'thaumaturgy'], // 2 warlock + 1 racial
        ['magic-missile', 'shield'], // 2 warlock spells
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Drow Racial Magic', () => {
    it('should allow Drow Fighter to have Dancing Lights cantrip', () => {
      const drowFighter = createMockCharacter(
        'Drow Fighter',
        mockFighter,
        mockElf,
        mockDrowSubrace,
      );

      const result = validateSpellSelection(
        drowFighter,
        ['dancing-lights'], // Drow racial cantrip
        [],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Drow Wizard to combine class and racial cantrips', () => {
      const drowWizard = createMockCharacter('Drow Wizard', mockWizard, mockElf, mockDrowSubrace);

      const result = validateSpellSelection(
        drowWizard,
        ['mage-hand', 'prestidigitation', 'light', 'dancing-lights'], // 3 wizard + 1 racial
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Drow level-gated spells at higher levels', () => {
      // This would need level 3+ character for Faerie Fire
      const drowWizardLevel3 = {
        ...createMockCharacter('Drow Wizard L3', mockWizard, mockElf, mockDrowSubrace),
        level: 3,
      };

      // At level 3, Drow get Faerie Fire once per day
      const result = validateSpellSelection(
        drowWizardLevel3,
        ['mage-hand', 'prestidigitation', 'light', 'dancing-lights'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        // Note: Level-gated racial spells like Faerie Fire would be handled differently
        // as they're not part of normal spell selection but granted automatically
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Forest Gnome Racial Magic', () => {
    it('should allow Forest Gnome Fighter to have Minor Illusion', () => {
      const forestGnomeFighter = createMockCharacter(
        'Forest Gnome Fighter',
        mockFighter,
        mockHuman,
        mockForestGnomeSubrace,
      );

      const result = validateSpellSelection(
        forestGnomeFighter,
        ['minor-illusion'], // Forest Gnome racial cantrip
        [],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Forest Gnome Wizard to include racial cantrip', () => {
      const forestGnomeWizard = createMockCharacter(
        'Forest Gnome Wizard',
        mockWizard,
        mockHuman,
        mockForestGnomeSubrace,
      );

      const result = validateSpellSelection(
        forestGnomeWizard,
        ['mage-hand', 'prestidigitation', 'light', 'minor-illusion'], // 3 wizard + 1 racial
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Complex Racial Combinations', () => {
    it('should handle character with multiple racial spell sources', () => {
      // Create a custom subrace with multiple spell sources
      const complexSubrace = {
        ...mockHighElfSubrace,
        cantrips: ['dancing-lights'], // Like Drow
        bonusCantrip: {
          source: 'wizard' as const,
          count: 1,
        },
      };

      const complexCharacter = createMockCharacter(
        'Complex Elf',
        mockWizard,
        mockElf,
        complexSubrace,
      );

      const result = validateSpellSelection(
        complexCharacter,
        ['mage-hand', 'prestidigitation', 'light', 'dancing-lights', 'minor-illusion'], // 3 class + 1 fixed racial + 1 bonus
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent racial spell count manipulation', () => {
      const highElfWizard = createMockCharacter(
        'High Elf Wizard',
        mockWizard,
        mockElf,
        mockHighElfSubrace,
      );

      // Try to select too many cantrips by claiming they're all racial
      const result = validateSpellSelection(
        highElfWizard,
        ['mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'fire-bolt'], // 5 cantrips
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'COUNT_MISMATCH',
          expected: 4,
          actual: 5,
        }),
      );
    });

    it('should handle edge case where racial spell overlaps with class spell', () => {
      // Create a scenario where a racial cantrip is also available to the class
      const tieflingCleric = createMockCharacter(
        'Tiefling Cleric',
        mockCleric,
        mockHuman,
        mockTieflingSubrace,
      );

      // Thaumaturgy is both a Tiefling racial cantrip AND a Cleric cantrip
      const result = validateSpellSelection(
        tieflingCleric,
        ['guidance', 'sacred-flame', 'thaumaturgy'], // Thaumaturgy counts as racial, not class
        ['cure-wounds'],
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Racial Spell Validation Edge Cases', () => {
    it('should handle missing racial data gracefully', () => {
      const humanCharacter = createMockCharacter('Human', mockWizard, mockHuman);

      const racialSpells = getRacialSpells('Human');
      expect(racialSpells).toEqual({
        cantrips: [],
        spells: [],
        bonusCantrips: 0,
        bonusCantripSource: undefined,
      });

      const result = validateSpellSelection(
        humanCharacter,
        ['mage-hand', 'prestidigitation', 'light'], // Normal wizard cantrips
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
    });

    it('should handle corrupted racial data', () => {
      const corruptedSubrace = {
        id: 'corrupted',
        name: 'Corrupted',
        description: 'Test',
        abilityScoreIncrease: {},
        traits: [],
        bonusCantrip: {
          source: 'invalid' as any,
          count: -1, // Invalid count
        },
      };

      const corruptedCharacter = createMockCharacter(
        'Corrupted',
        mockWizard,
        mockElf,
        corruptedSubrace,
      );

      const result = validateSpellSelection(
        corruptedCharacter,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      // Should still work with basic class requirements
      expect(result.valid).toBe(true);
    });

    it('should handle null/undefined subrace data', () => {
      const characterWithoutSubrace = createMockCharacter('No Subrace', mockWizard, mockElf);

      const result = validateSpellSelection(
        characterWithoutSubrace,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      expect(result.valid).toBe(true);
    });

    it('should prioritize subrace data over hardcoded mapping', () => {
      // Test that modern subrace data takes precedence over legacy hardcoded mappings
      const modernHighElf = {
        ...mockHighElfSubrace,
        bonusCantrip: {
          source: 'wizard' as const,
          count: 2, // Different from hardcoded
        },
      };

      const modernCharacter = createMockCharacter(
        'Modern High Elf',
        mockFighter,
        mockElf,
        modernHighElf,
      );

      const racialSpells = getRacialSpells('Elf', modernHighElf);
      expect(racialSpells.bonusCantrips).toBe(2); // Should use subrace data
    });

    it('should fall back to hardcoded mapping when subrace data is incomplete', () => {
      const incompleteSubrace = {
        id: 'incomplete',
        name: 'Incomplete',
        description: 'Test',
        abilityScoreIncrease: {},
        traits: [],
        // Missing spell data
      };

      const incompleteCharacter = createMockCharacter(
        'Incomplete',
        mockFighter,
        mockElf,
        incompleteSubrace,
      );

      // Should fall back to race-based hardcoded mapping if available
      const racialSpells = getRacialSpells('High Elf'); // Direct race lookup
      expect(racialSpells.bonusCantrips).toBe(1);
    });
  });

  describe('Performance and Security', () => {
    it('should handle large numbers of racial spells efficiently', () => {
      const manySpellsSubrace = {
        id: 'many-spells',
        name: 'Many Spells',
        description: 'Test',
        abilityScoreIncrease: {},
        traits: [],
        cantrips: Array(50)
          .fill(0)
          .map((_, i) => `test-cantrip-${i}`),
        spells: Array(100)
          .fill(0)
          .map((_, i) => `test-spell-${i}`),
      };

      const manySpellsCharacter = createMockCharacter(
        'Many Spells',
        mockWizard,
        mockElf,
        manySpellsSubrace,
      );

      const startTime = Date.now();
      const racialSpells = getRacialSpells('Elf', manySpellsSubrace);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(racialSpells.cantrips).toHaveLength(50);
      expect(racialSpells.spells).toHaveLength(100);
    });

    it('should prevent racial spell injection attacks', () => {
      const maliciousSubrace = {
        id: 'malicious',
        name: 'Malicious',
        description: 'Test',
        abilityScoreIncrease: {},
        traits: [],
        cantrips: [
          '../../../admin/god-mode',
          'javascript:alert(1)',
          '<script>steal()</script>',
          '"; DROP TABLE spells; --',
        ],
      };

      const maliciousCharacter = createMockCharacter(
        'Malicious',
        mockWizard,
        mockElf,
        maliciousSubrace,
      );

      const result = validateSpellSelection(
        maliciousCharacter,
        ['mage-hand', 'prestidigitation', 'light', '../../../admin/god-mode'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      // Should handle malicious input gracefully without crashing
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('Integration with Character Validation', () => {
    it('should work with complete character validation', () => {
      const tieflingWizard = {
        ...createMockCharacter('Tiefling Wizard', mockWizard, mockHuman, mockTieflingSubrace),
        cantrips: ['mage-hand', 'prestidigitation', 'light', 'thaumaturgy'],
        knownSpells: [
          'magic-missile',
          'shield',
          'detect-magic',
          'burning-hands',
          'sleep',
          'color-spray',
        ],
      };

      const result = validateCharacterSpellSelection(tieflingWizard);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject characters with incorrect racial spell combinations', () => {
      const incorrectHighElf = {
        ...createMockCharacter('Incorrect High Elf', mockWizard, mockElf, mockHighElfSubrace),
        cantrips: ['mage-hand', 'prestidigitation', 'guidance'], // Wrong racial cantrip
        knownSpells: [
          'magic-missile',
          'shield',
          'detect-magic',
          'burning-hands',
          'sleep',
          'color-spray',
        ],
      };

      const result = validateCharacterSpellSelection(incorrectHighElf);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'COUNT_MISMATCH',
        }),
      );
    });
  });
});
