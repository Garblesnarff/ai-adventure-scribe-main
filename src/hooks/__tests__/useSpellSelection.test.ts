import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellSelection } from '../useSpellSelection';
import { Character, CharacterClass, CharacterRace, Subrace } from '@/types/character';
import React from 'react';

/**
 * useSpellSelection Hook Tests
 *
 * Comprehensive testing of the spell selection hook:
 * - State management
 * - Spell filtering and searching
 * - Selection validation
 * - Character context integration
 * - Race and class interactions
 * - Edge cases and error handling
 */

// Mock the character context
const mockCharacterContext = {
  state: {
    character: null as Character | null
  },
  dispatch: vi.fn()
};

vi.mock('@/contexts/CharacterContext', () => ({
  useCharacter: () => mockCharacterContext
}));

// Mock spell data
vi.mock('@/data/spellOptions', () => ({
  getClassSpells: (className: string) => {
    const mockSpells = {
      Wizard: {
        cantrips: [
          { id: 'mage-hand', name: 'Mage Hand', level: 0, school: 'Conjuration', verbal: true, somatic: true },
          { id: 'prestidigitation', name: 'Prestidigitation', level: 0, school: 'Transmutation', verbal: true, somatic: true },
          { id: 'light', name: 'Light', level: 0, school: 'Evocation', verbal: true, material: true },
          { id: 'minor-illusion', name: 'Minor Illusion', level: 0, school: 'Illusion', somatic: true, material: true }
        ],
        spells: [
          { id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation', verbal: true, somatic: true },
          { id: 'shield', name: 'Shield', level: 1, school: 'Abjuration', verbal: true, somatic: true },
          { id: 'detect-magic', name: 'Detect Magic', level: 1, school: 'Divination', verbal: true, somatic: true, ritual: true },
          { id: 'burning-hands', name: 'Burning Hands', level: 1, school: 'Evocation', verbal: true, somatic: true, damage: '3d6' },
          { id: 'sleep', name: 'Sleep', level: 1, school: 'Enchantment', verbal: true, somatic: true, material: true },
          { id: 'color-spray', name: 'Color Spray', level: 1, school: 'Illusion', verbal: true, somatic: true, material: true }
        ]
      },
      Cleric: {
        cantrips: [
          { id: 'guidance', name: 'Guidance', level: 0, school: 'Divination', verbal: true, somatic: true },
          { id: 'sacred-flame', name: 'Sacred Flame', level: 0, school: 'Evocation', verbal: true, somatic: true },
          { id: 'thaumaturgy', name: 'Thaumaturgy', level: 0, school: 'Transmutation', verbal: true }
        ],
        spells: [
          { id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Evocation', verbal: true, somatic: true },
          { id: 'bless', name: 'Bless', level: 1, school: 'Enchantment', verbal: true, somatic: true, material: true }
        ]
      },
      Fighter: {
        cantrips: [],
        spells: []
      }
    };

    return mockSpells[className] || { cantrips: [], spells: [] };
  }
}));

describe('useSpellSelection Hook', () => {
  let mockWizard: CharacterClass;
  let mockCleric: CharacterClass;
  let mockFighter: CharacterClass;
  let mockRace: CharacterRace;
  let mockHighElfSubrace: Subrace;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockCharacterContext.dispatch.mockClear();

    // Mock character classes
    mockWizard = {
      id: 'wizard',
      name: 'Wizard',
      description: 'A master of magic',
      hitDie: 6,
      primaryAbility: 'intelligence',
      savingThrowProficiencies: ['intelligence', 'wisdom'],
      skillChoices: ['Arcana', 'History'],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'intelligence',
        cantripsKnown: 3,
        spellsKnown: 6,
        ritualCasting: true,
        spellbook: true
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: []
    };

    mockCleric = {
      id: 'cleric',
      name: 'Cleric',
      description: 'Divine spellcaster',
      hitDie: 8,
      primaryAbility: 'wisdom',
      savingThrowProficiencies: ['wisdom', 'charisma'],
      skillChoices: ['History', 'Insight'],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'wisdom',
        cantripsKnown: 3,
        ritualCasting: true
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: []
    };

    mockFighter = {
      id: 'fighter',
      name: 'Fighter',
      description: 'Warrior',
      hitDie: 10,
      primaryAbility: 'strength',
      savingThrowProficiencies: ['strength', 'constitution'],
      skillChoices: ['Acrobatics', 'Athletics'],
      numSkillChoices: 2,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: []
    };

    mockRace = {
      id: 'human',
      name: 'Human',
      description: 'Versatile race',
      abilityScoreIncrease: {},
      speed: 30,
      traits: [],
      languages: ['Common']
    };

    mockHighElfSubrace = {
      id: 'high-elf',
      name: 'High Elf',
      description: 'Elves with magical heritage',
      abilityScoreIncrease: { intelligence: 1 },
      traits: ['Elf Weapon Training', 'Cantrip'],
      bonusCantrip: {
        source: 'wizard',
        count: 1
      }
    };
  });

  // Wrapper component for providing context
  const createWrapper = (character: Character | null) => {
    mockCharacterContext.state.character = character;

    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(React.Fragment, null, children);
    };
  };

  describe('Initial State', () => {
    it('should initialize with empty selections for no character', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(null)
      });

      expect(result.current.character).toBeNull();
      expect(result.current.isSpellcaster).toBe(false);
      expect(result.current.selectedCantrips).toEqual([]);
      expect(result.current.selectedSpells).toEqual([]);
      expect(result.current.availableCantrips).toEqual([]);
      expect(result.current.availableSpells).toEqual([]);
    });

    it('should initialize with wizard character', () => {
      const wizardCharacter: Character = {
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
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };

      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      expect(result.current.character).toBe(wizardCharacter);
      expect(result.current.isSpellcaster).toBe(true);
      expect(result.current.spellcastingInfo).toEqual({
        cantripsKnown: 3,
        spellsKnown: 6,
        spellsPrepared: undefined,
        hasSpellbook: true,
        isPactMagic: false,
        ritualCasting: true,
        spellcastingAbility: 'intelligence'
      });
      expect(result.current.availableCantrips).toHaveLength(4);
      expect(result.current.availableSpells).toHaveLength(6);
    });

    it('should initialize with existing spell selections', () => {
      const wizardWithSpells: Character = {
        id: '1',
        name: 'Test Wizard',
        level: 1,
        class: mockWizard,
        race: mockRace,
        cantrips: ['mage-hand', 'prestidigitation'],
        knownSpells: ['magic-missile', 'shield'],
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 13, modifier: 1, savingThrow: false },
          intelligence: { score: 15, modifier: 2, savingThrow: true },
          wisdom: { score: 12, modifier: 1, savingThrow: true },
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };

      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardWithSpells)
      });

      expect(result.current.selectedCantrips).toEqual(['mage-hand', 'prestidigitation']);
      expect(result.current.selectedSpells).toEqual(['magic-missile', 'shield']);
    });
  });

  describe('Non-Spellcaster Characters', () => {
    it('should handle fighter correctly', () => {
      const fighterCharacter: Character = {
        id: '1',
        name: 'Test Fighter',
        level: 1,
        class: mockFighter,
        race: mockRace,
        abilityScores: {
          strength: { score: 15, modifier: 2, savingThrow: true },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 13, modifier: 1, savingThrow: true },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 12, modifier: 1, savingThrow: false },
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };

      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(fighterCharacter)
      });

      expect(result.current.isSpellcaster).toBe(false);
      expect(result.current.spellcastingInfo).toBeNull();
      expect(result.current.availableCantrips).toEqual([]);
      expect(result.current.availableSpells).toEqual([]);
    });

    it('should handle High Elf Fighter with racial cantrip', () => {
      const highElfFighter: Character = {
        id: '1',
        name: 'High Elf Fighter',
        level: 1,
        class: mockFighter,
        race: mockRace,
        subrace: mockHighElfSubrace,
        abilityScores: {
          strength: { score: 15, modifier: 2, savingThrow: true },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 13, modifier: 1, savingThrow: true },
          intelligence: { score: 12, modifier: 1, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };

      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(highElfFighter)
      });

      expect(result.current.racialSpells.bonusCantrips).toBe(1);
      expect(result.current.racialSpells.bonusCantripSource).toBe('wizard');
    });
  });

  describe('Spell Selection', () => {
    let wizardCharacter: Character;

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
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };
    });

    it('should toggle cantrip selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.toggleCantrip('mage-hand');
      });

      expect(result.current.selectedCantrips).toEqual(['mage-hand']);

      act(() => {
        result.current.toggleCantrip('mage-hand');
      });

      expect(result.current.selectedCantrips).toEqual([]);
    });

    it('should toggle spell selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.toggleSpell('magic-missile');
      });

      expect(result.current.selectedSpells).toEqual(['magic-missile']);

      act(() => {
        result.current.toggleSpell('magic-missile');
      });

      expect(result.current.selectedSpells).toEqual([]);
    });

    it('should respect cantrip selection limits', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Select maximum cantrips (3)
      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleCantrip('prestidigitation');
        result.current.toggleCantrip('light');
      });

      expect(result.current.selectedCantrips).toHaveLength(3);

      // Try to select one more (should be ignored)
      act(() => {
        result.current.toggleCantrip('minor-illusion');
      });

      expect(result.current.selectedCantrips).toHaveLength(3);
      expect(result.current.selectedCantrips).not.toContain('minor-illusion');
    });

    it('should respect spell selection limits', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Select maximum spells (6)
      act(() => {
        result.current.toggleSpell('magic-missile');
        result.current.toggleSpell('shield');
        result.current.toggleSpell('detect-magic');
        result.current.toggleSpell('burning-hands');
        result.current.toggleSpell('sleep');
        result.current.toggleSpell('color-spray');
      });

      expect(result.current.selectedSpells).toHaveLength(6);

      // Since we only have 6 spells in our mock data, we can't test exceeding the limit
      // but the logic should prevent selection beyond the limit
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleSpell('magic-missile');
      });

      expect(result.current.selectedCantrips).toHaveLength(1);
      expect(result.current.selectedSpells).toHaveLength(1);

      act(() => {
        result.current.clearSelections();
      });

      expect(result.current.selectedCantrips).toEqual([]);
      expect(result.current.selectedSpells).toEqual([]);
    });
  });

  describe('Filtering and Search', () => {
    let wizardCharacter: Character;

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
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };
    });

    it('should filter spells by search term', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.setSearchTerm('mage');
      });

      expect(result.current.searchTerm).toBe('mage');
      expect(result.current.filteredCantrips).toHaveLength(1);
      expect(result.current.filteredCantrips[0].id).toBe('mage-hand');
    });

    it('should filter spells by school', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.setFilters({
          schools: ['Evocation'],
          components: {
            verbal: false,
            somatic: false,
            material: false
          },
          properties: {
            concentration: false,
            ritual: false,
            damage: false
          }
        });
      });

      const evocationCantrips = result.current.filteredCantrips.filter(spell => spell.school === 'Evocation');
      const evocationSpells = result.current.filteredSpells.filter(spell => spell.school === 'Evocation');

      expect(evocationCantrips.length).toBeGreaterThan(0);
      expect(evocationSpells.length).toBeGreaterThan(0);
    });

    it('should filter spells by components', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.setFilters({
          schools: [],
          components: {
            verbal: true,
            somatic: false,
            material: false
          },
          properties: {
            concentration: false,
            ritual: false,
            damage: false
          }
        });
      });

      result.current.filteredCantrips.forEach(spell => {
        expect(spell.verbal).toBe(true);
      });

      result.current.filteredSpells.forEach(spell => {
        expect(spell.verbal).toBe(true);
      });
    });

    it('should filter spells by properties', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.setFilters({
          schools: [],
          components: {
            verbal: false,
            somatic: false,
            material: false
          },
          properties: {
            concentration: false,
            ritual: true,
            damage: false
          }
        });
      });

      result.current.filteredSpells.forEach(spell => {
        expect(spell.ritual).toBe(true);
      });
    });

    it('should combine multiple filters', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      act(() => {
        result.current.setSearchTerm('magic');
        result.current.setFilters({
          schools: ['Evocation'],
          components: {
            verbal: true,
            somatic: false,
            material: false
          },
          properties: {
            concentration: false,
            ritual: false,
            damage: false
          }
        });
      });

      // Should only show spells that match all criteria
      result.current.filteredSpells.forEach(spell => {
        expect(spell.name.toLowerCase().includes('magic') ||
               spell.description.toLowerCase().includes('magic')).toBe(true);
        expect(spell.school).toBe('Evocation');
        expect(spell.verbal).toBe(true);
      });
    });
  });

  describe('Validation', () => {
    let wizardCharacter: Character;

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
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };
    });

    it('should validate complete spell selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Select correct number of cantrips and spells
      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleCantrip('prestidigitation');
        result.current.toggleCantrip('light');

        result.current.toggleSpell('magic-missile');
        result.current.toggleSpell('shield');
        result.current.toggleSpell('detect-magic');
        result.current.toggleSpell('burning-hands');
        result.current.toggleSpell('sleep');
        result.current.toggleSpell('color-spray');
      });

      expect(result.current.validation.valid).toBe(true);
      expect(result.current.canProceed).toBe(true);
      expect(result.current.validation.errors).toHaveLength(0);
    });

    it('should invalidate incomplete spell selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Select only some cantrips and spells
      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleSpell('magic-missile');
      });

      expect(result.current.validation.valid).toBe(false);
      expect(result.current.canProceed).toBe(false);
      expect(result.current.validation.errors.length).toBeGreaterThan(0);
    });

    it('should provide helpful warnings', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Complete selection to get warnings
      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleCantrip('prestidigitation');
        result.current.toggleCantrip('light');

        result.current.toggleSpell('magic-missile');
        result.current.toggleSpell('shield');
        result.current.toggleSpell('detect-magic');
        result.current.toggleSpell('burning-hands');
        result.current.toggleSpell('sleep');
        result.current.toggleSpell('color-spray');
      });

      expect(result.current.validation.warnings.length).toBeGreaterThan(0);
      expect(result.current.validation.warnings.some(warning =>
        warning.includes('spellbook')
      )).toBe(true);
    });
  });

  describe('Character Updates', () => {
    let wizardCharacter: Character;

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
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };
    });

    it('should update character with valid spell selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Make valid selection
      act(() => {
        result.current.toggleCantrip('mage-hand');
        result.current.toggleCantrip('prestidigitation');
        result.current.toggleCantrip('light');

        result.current.toggleSpell('magic-missile');
        result.current.toggleSpell('shield');
        result.current.toggleSpell('detect-magic');
        result.current.toggleSpell('burning-hands');
        result.current.toggleSpell('sleep');
        result.current.toggleSpell('color-spray');
      });

      act(() => {
        result.current.updateCharacterSpells();
      });

      expect(mockCharacterContext.dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CHARACTER',
        payload: {
          cantrips: ['mage-hand', 'prestidigitation', 'light'],
          knownSpells: ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray']
        }
      });
    });

    it('should not update character with invalid spell selection', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      // Make incomplete selection
      act(() => {
        result.current.toggleCantrip('mage-hand');
      });

      act(() => {
        result.current.updateCharacterSpells();
      });

      expect(mockCharacterContext.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle character change', () => {
      const wizardCharacter: Character = {
        id: '1',
        name: 'Test Wizard',
        level: 1,
        class: mockWizard,
        race: mockRace,
        cantrips: ['mage-hand'],
        knownSpells: ['magic-missile'],
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 13, modifier: 1, savingThrow: false },
          intelligence: { score: 15, modifier: 2, savingThrow: true },
          wisdom: { score: 12, modifier: 1, savingThrow: true },
          charisma: { score: 8, modifier: -1, savingThrow: false }
        }
      };

      const { result, rerender } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(wizardCharacter)
      });

      expect(result.current.selectedCantrips).toEqual(['mage-hand']);
      expect(result.current.selectedSpells).toEqual(['magic-missile']);

      // Change to different character
      const newCharacter: Character = {
        ...wizardCharacter,
        id: '2',
        cantrips: ['prestidigitation'],
        knownSpells: ['shield']
      };

      mockCharacterContext.state.character = newCharacter;
      rerender();

      expect(result.current.selectedCantrips).toEqual(['prestidigitation']);
      expect(result.current.selectedSpells).toEqual(['shield']);
    });

    it('should handle missing character gracefully', () => {
      const { result } = renderHook(() => useSpellSelection(), {
        wrapper: createWrapper(null)
      });

      expect(result.current.character).toBeNull();
      expect(result.current.validation.valid).toBe(false);
      expect(result.current.canProceed).toBe(false);

      // Should not crash when trying to update character
      act(() => {
        result.current.updateCharacterSpells();
      });

      expect(mockCharacterContext.dispatch).not.toHaveBeenCalled();
    });
  });
});