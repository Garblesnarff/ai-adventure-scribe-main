import { describe, it, expect, beforeEach } from 'vitest';

import type { Character, CharacterClass, CharacterRace, Subrace } from '@/types/character';

import {
  validateSpellSelection,
  validateCharacterSpellSelection,
  getSpellcastingInfo,
  getRacialSpells,
  getMaxSpellCounts,
  isSpellValidForClass,
  getSpellValidationRules,
} from '@/utils/spell-validation';

// Helper function to create mock characters
function createMockCharacter(
  name: string,
  characterClass: CharacterClass,
  race: CharacterRace,
  subrace?: Subrace,
  level: number = 1,
  cantrips?: string[],
  knownSpells?: string[],
): Character {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    level,
    class: characterClass,
    race,
    subrace,
    cantrips,
    knownSpells,
    abilityScores: {
      strength: { score: 10, modifier: 0, savingThrow: false },
      dexterity: { score: 14, modifier: 2, savingThrow: false },
      constitution: { score: 13, modifier: 1, savingThrow: false },
      intelligence: {
        score: 15,
        modifier: 2,
        savingThrow: characterClass.savingThrowProficiencies.includes('intelligence'),
      },
      wisdom: {
        score: 12,
        modifier: 1,
        savingThrow: characterClass.savingThrowProficiencies.includes('wisdom'),
      },
      charisma: {
        score: 8,
        modifier: -1,
        savingThrow: characterClass.savingThrowProficiencies.includes('charisma'),
      },
    },
  };
}

/**
 * Spell Validation Logic Tests
 *
 * Comprehensive testing of D&D 5E spell validation rules:
 * - Class spell restrictions
 * - Spell count limits
 * - Known vs prepared mechanics
 * - Racial bonus spells
 * - Multiclass scenarios
 * - Edge cases and error conditions
 */

describe('Spell Validation System', () => {
  let mockWizard: CharacterClass;
  let mockCleric: CharacterClass;
  let mockBard: CharacterClass;
  let mockWarlock: CharacterClass;
  let mockFighter: CharacterClass;
  let mockRace: CharacterRace;
  let mockHighElfSubrace: Subrace;
  let mockTieflingSubrace: Subrace;

  beforeEach(() => {
    // Mock character classes
    mockWizard = {
      id: 'wizard',
      name: 'Wizard',
      description: 'A master of magic',
      hitDie: 6,
      primaryAbility: 'intelligence',
      savingThrowProficiencies: ['intelligence', 'wisdom'],
      skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'intelligence',
        cantripsKnown: 3,
        spellsKnown: 6,
        ritualCasting: true,
        spellbook: true,
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    mockCleric = {
      id: 'cleric',
      name: 'Cleric',
      description: 'Divine spellcaster',
      hitDie: 8,
      primaryAbility: 'wisdom',
      savingThrowProficiencies: ['wisdom', 'charisma'],
      skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'wisdom',
        cantripsKnown: 3,
        ritualCasting: true,
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    mockBard = {
      id: 'bard',
      name: 'Bard',
      description: 'Jack of all trades',
      hitDie: 8,
      primaryAbility: 'charisma',
      savingThrowProficiencies: ['dexterity', 'charisma'],
      skillChoices: ['Any'],
      numSkillChoices: 3,
      spellcasting: {
        ability: 'charisma',
        cantripsKnown: 2,
        spellsKnown: 4,
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    mockWarlock = {
      id: 'warlock',
      name: 'Warlock',
      description: 'Pact magic caster',
      hitDie: 8,
      primaryAbility: 'charisma',
      savingThrowProficiencies: ['wisdom', 'charisma'],
      skillChoices: [
        'Arcana',
        'Deception',
        'History',
        'Intimidation',
        'Investigation',
        'Nature',
        'Religion',
      ],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'charisma',
        cantripsKnown: 2,
        spellsKnown: 2,
        ritualCasting: false,
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    mockFighter = {
      id: 'fighter',
      name: 'Fighter',
      description: 'Warrior',
      hitDie: 10,
      primaryAbility: 'strength',
      savingThrowProficiencies: ['strength', 'constitution'],
      skillChoices: [
        'Acrobatics',
        'Animal Handling',
        'Athletics',
        'History',
        'Insight',
        'Intimidation',
        'Perception',
        'Survival',
      ],
      numSkillChoices: 2,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    mockRace = {
      id: 'human',
      name: 'Human',
      description: 'Versatile race',
      abilityScoreIncrease: {},
      speed: 30,
      traits: [],
      languages: ['Common'],
    };

    mockHighElfSubrace = {
      id: 'high-elf',
      name: 'High Elf',
      description: 'Elves with magical heritage',
      abilityScoreIncrease: { intelligence: 1 },
      traits: ['Elf Weapon Training', 'Cantrip'],
      bonusCantrip: {
        source: 'wizard',
        count: 1,
      },
    };

    mockTieflingSubrace = {
      id: 'tiefling',
      name: 'Tiefling',
      description: 'Fiendish heritage',
      abilityScoreIncrease: { charisma: 2, intelligence: 1 },
      traits: ['Infernal Legacy'],
      cantrips: ['thaumaturgy'],
    };
  });

  describe('getSpellcastingInfo', () => {
    it('should return correct info for Wizard at level 1', () => {
      const info = getSpellcastingInfo(mockWizard, 1);
      expect(info).toEqual({
        cantripsKnown: 3,
        spellsKnown: 6,
        spellsPrepared: undefined,
        hasSpellbook: true,
        isPactMagic: false,
        ritualCasting: true,
        spellcastingAbility: 'intelligence',
      });
    });

    it('should return correct info for Cleric at level 1', () => {
      const info = getSpellcastingInfo(mockCleric, 1);
      expect(info).toEqual({
        cantripsKnown: 3,
        spellsKnown: undefined,
        spellsPrepared: 1,
        hasSpellbook: false,
        isPactMagic: false,
        ritualCasting: true,
        spellcastingAbility: 'wisdom',
      });
    });

    it('should return correct info for Bard at level 1', () => {
      const info = getSpellcastingInfo(mockBard, 1);
      expect(info).toEqual({
        cantripsKnown: 2,
        spellsKnown: 4,
        spellsPrepared: undefined,
        hasSpellbook: false,
        isPactMagic: false,
        ritualCasting: false,
        spellcastingAbility: 'charisma',
      });
    });

    it('should return null for non-spellcasters', () => {
      const info = getSpellcastingInfo(mockFighter, 1);
      expect(info).toBeNull();
    });

    it('should return correct info for Warlock at level 1', () => {
      const info = getSpellcastingInfo(mockWarlock, 1);
      expect(info).toEqual({
        cantripsKnown: 2,
        spellsKnown: 2,
        spellsPrepared: undefined,
        hasSpellbook: false,
        isPactMagic: true,
        ritualCasting: false,
        spellcastingAbility: 'charisma',
      });
    });
  });

  describe('getRacialSpells', () => {
    it('should return empty for basic races', () => {
      const racialSpells = getRacialSpells('Human');
      expect(racialSpells).toEqual({
        cantrips: [],
        spells: [],
        bonusCantrips: 0,
        bonusCantripSource: undefined,
      });
    });

    it('should return High Elf bonus cantrip', () => {
      const racialSpells = getRacialSpells('Elf', mockHighElfSubrace);
      expect(racialSpells).toEqual({
        cantrips: [],
        spells: [],
        bonusCantrips: 1,
        bonusCantripSource: 'wizard',
      });
    });

    it('should return Tiefling racial cantrip', () => {
      const racialSpells = getRacialSpells('Tiefling', mockTieflingSubrace);
      expect(racialSpells).toEqual({
        cantrips: ['thaumaturgy'],
        spells: [],
        bonusCantrips: 0,
        bonusCantripSource: undefined,
      });
    });

    it('should fallback to hardcoded mapping', () => {
      const racialSpells = getRacialSpells('High Elf');
      expect(racialSpells.bonusCantrips).toBe(1);
      expect(racialSpells.bonusCantripSource).toBe('wizard');
    });

    it('should fallback to subrace mapping when provided (Drow)', () => {
      const drowSubrace: Subrace = {
        id: 'drow',
        name: 'Drow',
        description: 'Dark elf',
        abilityScoreIncrease: {},
        traits: [],
      };
      const racialSpells = getRacialSpells('Elf', drowSubrace);
      expect(racialSpells.cantrips).toContain('dancing-lights');
    });
  });

  describe('validateSpellSelection', () => {
    let wizardCharacter: Character;
    let clericCharacter: Character;
    let fighterCharacter: Character;
    let highElfWizard: Character;

    beforeEach(() => {
      wizardCharacter = {
        id: '1',
        name: 'Test Wizard',
        level: 1,
        class: mockWizard,
        race: mockRace,
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 13, modifier: 1, savingThrow: false },
          intelligence: { score: 15, modifier: 2, savingThrow: true },
          wisdom: { score: 12, modifier: 1, savingThrow: true },
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };

      clericCharacter = {
        ...wizardCharacter,
        class: mockCleric,
      };

      fighterCharacter = {
        ...wizardCharacter,
        class: mockFighter,
      };

      highElfWizard = {
        ...wizardCharacter,
        subrace: mockHighElfSubrace,
      };
    });

    describe('Spellcaster Validation', () => {
      it('should validate correct Wizard spell selection', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject too many cantrips', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light', 'minor-illusion'], // 4 instead of 3
          ['magic-missile', 'shield', 'detect-magic'],
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'COUNT_MISMATCH',
            expected: 3,
            actual: 4,
          }),
        );
      });

      it('should reject too few cantrips', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation'], // 2 instead of 3
          ['magic-missile', 'shield', 'detect-magic'],
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'COUNT_MISMATCH',
            expected: 3,
            actual: 2,
          }),
        );
      });

      it('should reject invalid cantrips for class', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'guidance'], // guidance is cleric cantrip
          ['magic-missile', 'shield', 'detect-magic'],
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'INVALID_SPELL',
            spellId: 'guidance',
          }),
        );
      });

      it('should reject too many spells known', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          Array(7).fill('magic-missile'), // 7 instead of 6, but this would be caught by unique validation
        );

        const spells = [
          'magic-missile',
          'shield',
          'detect-magic',
          'burning-hands',
          'sleep',
          'color-spray',
          'comprehend-languages',
        ];
        const result2 = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          spells,
        );

        expect(result2.valid).toBe(false);
        expect(result2.errors).toContainEqual(
          expect.objectContaining({
            type: 'COUNT_MISMATCH',
            expected: 6,
            actual: 7,
          }),
        );
      });

      it('should reject invalid 1st-level spells for class', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'cure-wounds', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ type: 'INVALID_SPELL', spellId: 'cure-wounds' }),
        );
      });

      it('should include pact magic warning for valid Warlock selection', () => {
        const warlockCharacter: Character = {
          id: 'wl-1',
          name: 'Test Warlock',
          level: 1,
          class: mockWarlock,
          race: mockRace,
          abilityScores: {
            strength: { score: 10, modifier: 0, savingThrow: false },
            dexterity: { score: 14, modifier: 2, savingThrow: false },
            constitution: { score: 13, modifier: 1, savingThrow: false },
            intelligence: { score: 12, modifier: 1, savingThrow: false },
            wisdom: { score: 10, modifier: 0, savingThrow: false },
            charisma: { score: 16, modifier: 3, savingThrow: true },
          },
        };

        const result = validateSpellSelection(
          warlockCharacter,
          ['eldritch-blast', 'prestidigitation'],
          ['unseen-servant', 'illusory-script'],
        );
        expect(result.valid).toBe(true);
        expect(result.warnings).toContain(
          'As a Warlock, you use Pact Magic. Your spell slots recharge on a short rest.',
        );
        expect(result.warnings).not.toContain(
          'Your class can cast spells as rituals if they have the ritual tag, without expending a spell slot.',
        );
      });
    });

    describe('Racial Spell Validation', () => {
      it('should validate High Elf bonus cantrip', () => {
        const result = validateSpellSelection(
          highElfWizard,
          ['mage-hand', 'prestidigitation', 'light', 'minor-illusion'], // 3 class + 1 racial
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid High Elf bonus cantrip', () => {
        const result = validateSpellSelection(
          highElfWizard,
          ['mage-hand', 'prestidigitation', 'light', 'guidance'], // guidance not wizard cantrip
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

      it('should validate Tiefling racial cantrip', () => {
        const tieflingCharacter = {
          ...wizardCharacter,
          subrace: mockTieflingSubrace,
        };

        const result = validateSpellSelection(
          tieflingCharacter,
          ['mage-hand', 'prestidigitation', 'light', 'thaumaturgy'], // 3 class + 1 racial
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Non-Spellcaster Validation', () => {
      it('should reject spells for non-spellcasters', () => {
        const result = validateSpellSelection(fighterCharacter, ['mage-hand'], ['magic-missile']);

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'LEVEL_REQUIREMENT',
          }),
        );
      });

      it('should allow racial spells for non-spellcasters', () => {
        const tieflingFighter = {
          ...fighterCharacter,
          subrace: mockTieflingSubrace,
        };

        const result = validateSpellSelection(tieflingFighter, ['thaumaturgy'], []);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate High Elf Fighter with wizard cantrip', () => {
        const highElfFighter = {
          ...fighterCharacter,
          subrace: mockHighElfSubrace,
        };

        const result = validateSpellSelection(
          highElfFighter,
          ['prestidigitation'], // wizard cantrip allowed
          [],
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject incorrect number of racial cantrips for non-spellcaster', () => {
        const tieflingFighter = {
          ...fighterCharacter,
          subrace: mockTieflingSubrace,
        };

        const tooMany = validateSpellSelection(tieflingFighter, ['thaumaturgy', 'guidance'], []);
        expect(tooMany.valid).toBe(false);
        expect(tooMany.errors).toContainEqual(expect.objectContaining({ type: 'COUNT_MISMATCH' }));

        const tooFew = validateSpellSelection(tieflingFighter, [], []);
        expect(tooFew.valid).toBe(false);
        expect(tooFew.errors).toContainEqual(expect.objectContaining({ type: 'COUNT_MISMATCH' }));
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing character gracefully', () => {
        // The validation function should handle null characters without crashing
        expect(() => {
          validateSpellSelection(null as any, ['mage-hand'], ['magic-missile']);
        }).not.toThrow();
      });

      it('should handle missing class gracefully', () => {
        const characterWithoutClass = {
          ...wizardCharacter,
          class: undefined,
        };

        const result = validateSpellSelection(characterWithoutClass as any, ['mage-hand'], []);

        expect(result.valid).toBe(false);
      });

      it('should handle missing race gracefully', () => {
        const characterWithoutRace = {
          ...wizardCharacter,
          race: undefined,
        };

        const result = validateSpellSelection(
          characterWithoutRace as any,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        expect(result.valid).toBe(true); // Should still validate class spells
      });

      it('should provide helpful warnings', () => {
        const result = validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        expect(result.warnings).toContain(
          'As a Wizard, these spells will be recorded in your spellbook. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.',
        );
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getMaxSpellCounts', () => {
      it('should return correct counts for Wizard', () => {
        const counts = getMaxSpellCounts(mockWizard, 1);
        expect(counts).toEqual({
          cantrips: 3,
          spells: 6,
        });
      });

      it('should return zero for non-spellcasters', () => {
        const counts = getMaxSpellCounts(mockFighter, 1);
        expect(counts).toEqual({
          cantrips: 0,
          spells: 0,
        });
      });

      it('should return prepared spell count for Cleric', () => {
        const counts = getMaxSpellCounts(mockCleric, 1);
        expect(counts).toEqual({ cantrips: 3, spells: 1 });
      });
    });

    describe('isSpellValidForClass', () => {
      it('should validate wizard cantrips correctly', () => {
        expect(isSpellValidForClass('mage-hand', mockWizard, true)).toBe(true);
        expect(isSpellValidForClass('guidance', mockWizard, true)).toBe(false);
      });

      it('should validate wizard spells correctly', () => {
        expect(isSpellValidForClass('magic-missile', mockWizard, false)).toBe(true);
        expect(isSpellValidForClass('cure-wounds', mockWizard, false)).toBe(false);
      });

      it('should check both lists when isCantrip is unspecified', () => {
        expect(isSpellValidForClass('mage-hand', mockWizard)).toBe(true);
        expect(isSpellValidForClass('magic-missile', mockWizard)).toBe(true);
        expect(isSpellValidForClass('cure-wounds', mockWizard)).toBe(false);
      });
    });

    describe('getSpellValidationRules', () => {
      it('should return wizard rules', () => {
        const rules = getSpellValidationRules(mockWizard);
        expect(rules).toContain('Must select exactly 3 cantrips.');
        expect(rules).toContain('Must select exactly 6 spells known.');
        expect(rules).toContain('Uses a spellbook to record spells. Can prepare spells daily.');
        expect(rules).toContain('Can cast ritual spells without expending spell slots.');
        expect(rules).toContain('Spellcasting ability: Intelligence.');
      });

      it('should return cleric rules', () => {
        const rules = getSpellValidationRules(mockCleric);
        expect(rules).toContain('Must select exactly 3 cantrips.');
        expect(rules).toContain('Can prepare 1 spell (minimum 1).');
        expect(rules).toContain('Can cast ritual spells without expending spell slots.');
        expect(rules).toContain('Spellcasting ability: Wisdom.');
      });

      it('should return non-spellcaster message', () => {
        const rules = getSpellValidationRules(mockFighter);
        expect(rules).toContain('Fighter is not a spellcasting class at 1st level.');
      });

      it('should include pact magic info for Warlock and omit ritual casting', () => {
        const rules = getSpellValidationRules(mockWarlock);
        expect(rules).toContain('Uses Pact Magic. Spell slots recharge on short rest.');
        expect(rules).not.toContain('Can cast ritual spells without expending spell slots.');
        expect(rules).toContain('Spellcasting ability: Charisma.');
      });
    });

    describe('validateCharacterSpellSelection', () => {
      it('should validate character with existing spells', () => {
        const mockWizardChar = createMockCharacter('Test Wizard', mockWizard, mockRace);
        const characterWithSpells = {
          ...mockWizardChar,
          cantrips: ['mage-hand', 'prestidigitation', 'light'],
          knownSpells: ['magic-missile', 'shield'],
        };

        const result = validateCharacterSpellSelection(characterWithSpells as any);
        expect(result.valid).toBe(false); // Not enough spells (needs 6)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'COUNT_MISMATCH',
          }),
        );
      });
    });
  });
});
