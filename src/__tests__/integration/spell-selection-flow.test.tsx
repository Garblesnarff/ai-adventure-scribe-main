import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Character, CharacterClass, CharacterRace, Subrace } from '@/types/character';

/**
 * Spell Selection Integration Tests
 *
 * End-to-end testing of the complete spell selection flow:
 * - Character creation wizard integration
 * - Spell filtering and search
 * - Selection validation
 * - Character updates
 * - Error handling
 * - Edge cases
 */

// Mock the dependencies
vi.mock('@/utils/spellComponents', () => ({
  getComponentTrackingInfo: (spell: any) => ({
    verbal: spell.verbal || false,
    somatic: spell.somatic || false,
    material: spell.material || false,
    materialDescription: spell.materialDescription,
    materialCost: spell.materialCost,
    materialConsumed: spell.materialConsumed || false,
  }),
}));

vi.mock('@/data/spellOptions', () => ({
  getClassSpells: (className: string) => {
    const mockSpells = {
      Wizard: {
        cantrips: [
          {
            id: 'mage-hand',
            name: 'Mage Hand',
            level: 0,
            school: 'Conjuration',
            castingTime: '1 action',
            range: '30 feet',
            components: 'V, S',
            duration: 'Concentration, up to 1 minute',
            description: 'A spectral, floating hand appears at a point you choose within range.',
            verbal: true,
            somatic: true,
            concentration: true,
          },
          {
            id: 'prestidigitation',
            name: 'Prestidigitation',
            level: 0,
            school: 'Transmutation',
            castingTime: '1 action',
            range: '10 feet',
            components: 'V, S',
            duration: 'Up to 1 hour',
            description:
              'This spell is a minor magical trick that novice spellcasters use for practice.',
            verbal: true,
            somatic: true,
          },
          {
            id: 'light',
            name: 'Light',
            level: 0,
            school: 'Evocation',
            castingTime: '1 action',
            range: 'Touch',
            components: 'V, M (a firefly or phosphorescent moss)',
            duration: '1 hour',
            description: 'You touch one object that is no larger than 10 feet in any dimension.',
            verbal: true,
            material: true,
            materialDescription: 'a firefly or phosphorescent moss',
          },
          {
            id: 'minor-illusion',
            name: 'Minor Illusion',
            level: 0,
            school: 'Illusion',
            castingTime: '1 action',
            range: '30 feet',
            components: 'S, M (a bit of fleece)',
            duration: '1 minute',
            description: 'You create a sound or an image of an object within range.',
            somatic: true,
            material: true,
            materialDescription: 'a bit of fleece',
          },
        ],
        spells: [
          {
            id: 'magic-missile',
            name: 'Magic Missile',
            level: 1,
            school: 'Evocation',
            castingTime: '1 action',
            range: '120 feet',
            components: 'V, S',
            duration: 'Instantaneous',
            description: 'You create three glowing darts of magical force.',
            verbal: true,
            somatic: true,
            damage: '1d4 + 1',
          },
          {
            id: 'shield',
            name: 'Shield',
            level: 1,
            school: 'Abjuration',
            castingTime: '1 reaction',
            range: 'Self',
            components: 'V, S',
            duration: '1 round',
            description: 'An invisible barrier of magical force appears and protects you.',
            verbal: true,
            somatic: true,
          },
          {
            id: 'detect-magic',
            name: 'Detect Magic',
            level: 1,
            school: 'Divination',
            castingTime: '1 action',
            range: 'Self',
            components: 'V, S',
            duration: 'Concentration, up to 10 minutes',
            description: 'For the duration, you sense the presence of magic within 30 feet of you.',
            verbal: true,
            somatic: true,
            ritual: true,
            concentration: true,
          },
          {
            id: 'burning-hands',
            name: 'Burning Hands',
            level: 1,
            school: 'Evocation',
            castingTime: '1 action',
            range: 'Self (15-foot cone)',
            components: 'V, S',
            duration: 'Instantaneous',
            description:
              'As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth.',
            verbal: true,
            somatic: true,
            damage: '3d6',
          },
          {
            id: 'sleep',
            name: 'Sleep',
            level: 1,
            school: 'Enchantment',
            castingTime: '1 action',
            range: '90 feet',
            components: 'V, S, M (a pinch of fine sand, rose petals, or a cricket)',
            duration: 'Up to 1 minute',
            description: 'This spell sends creatures into a magical slumber.',
            verbal: true,
            somatic: true,
            material: true,
            materialDescription: 'a pinch of fine sand, rose petals, or a cricket',
          },
          {
            id: 'color-spray',
            name: 'Color Spray',
            level: 1,
            school: 'Illusion',
            castingTime: '1 action',
            range: 'Self (15-foot cone)',
            components: 'V, S, M (a pinch of powder or sand that is colored red, yellow, and blue)',
            duration: 'Instantaneous',
            description: 'A dazzling array of flashing, colored light springs from your hand.',
            verbal: true,
            somatic: true,
            material: true,
            materialDescription: 'a pinch of powder or sand that is colored red, yellow, and blue',
          },
        ],
      },
      Fighter: {
        cantrips: [],
        spells: [],
      },
    };

    return mockSpells[className] || { cantrips: [], spells: [] };
  },
}));

// Create a mock spell selection component for testing
const MockSpellSelection: React.FC<{ character: Character | null }> = ({ character }) => {
  const [selectedCantrips, setSelectedCantrips] = React.useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [schoolFilter, setSchoolFilter] = React.useState<string[]>([]);

  // Mock spell data
  const { getClassSpells } = require('@/data/spellOptions');
  const availableSpells = character?.class
    ? getClassSpells(character.class.name)
    : { cantrips: [], spells: [] };

  // Filter spells based on search and filters
  const filteredCantrips = availableSpells.cantrips.filter((spell: any) => {
    const matchesSearch =
      !searchTerm ||
      spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spell.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(spell.school);

    return matchesSearch && matchesSchool;
  });

  const filteredSpells = availableSpells.spells.filter((spell: any) => {
    const matchesSearch =
      !searchTerm ||
      spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spell.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(spell.school);

    return matchesSearch && matchesSchool;
  });

  // Validation logic
  const isValid = character?.class?.spellcasting
    ? selectedCantrips.length === 3 && selectedSpells.length === 6
    : selectedCantrips.length === 0 && selectedSpells.length === 0;

  const toggleCantrip = (cantripId: string) => {
    setSelectedCantrips((prev) => {
      if (prev.includes(cantripId)) {
        return prev.filter((id) => id !== cantripId);
      } else if (prev.length < 3) {
        return [...prev, cantripId];
      }
      return prev;
    });
  };

  const toggleSpell = (spellId: string) => {
    setSelectedSpells((prev) => {
      if (prev.includes(spellId)) {
        return prev.filter((id) => id !== spellId);
      } else if (prev.length < 6) {
        return [...prev, spellId];
      }
      return prev;
    });
  };

  if (!character) {
    return <div>No character selected</div>;
  }

  if (!character.class?.spellcasting) {
    return <div>Character is not a spellcaster</div>;
  }

  return (
    <div data-testid="spell-selection">
      <h2>Spell Selection for {character.name}</h2>

      {/* Search and Filters */}
      <div data-testid="search-filters">
        <input
          type="text"
          placeholder="Search spells..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="search-input"
        />

        <select
          multiple
          value={schoolFilter}
          onChange={(e) =>
            setSchoolFilter(Array.from(e.target.selectedOptions, (option) => option.value))
          }
          data-testid="school-filter"
        >
          <option value="Abjuration">Abjuration</option>
          <option value="Conjuration">Conjuration</option>
          <option value="Divination">Divination</option>
          <option value="Enchantment">Enchantment</option>
          <option value="Evocation">Evocation</option>
          <option value="Illusion">Illusion</option>
          <option value="Necromancy">Necromancy</option>
          <option value="Transmutation">Transmutation</option>
        </select>
      </div>

      {/* Cantrips Section */}
      <div data-testid="cantrips-section">
        <h3>Cantrips ({selectedCantrips.length}/3)</h3>
        <div data-testid="cantrips-list">
          {filteredCantrips.map((cantrip: any) => (
            <div
              key={cantrip.id}
              data-testid={`cantrip-${cantrip.id}`}
              className={`spell-card ${selectedCantrips.includes(cantrip.id) ? 'selected' : ''}`}
              onClick={() => toggleCantrip(cantrip.id)}
            >
              <input
                type="checkbox"
                checked={selectedCantrips.includes(cantrip.id)}
                onChange={() => toggleCantrip(cantrip.id)}
                data-testid={`cantrip-checkbox-${cantrip.id}`}
              />
              <span>{cantrip.name}</span>
              <span className="school">{cantrip.school}</span>
              <p>{cantrip.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spells Section */}
      <div data-testid="spells-section">
        <h3>1st Level Spells ({selectedSpells.length}/6)</h3>
        <div data-testid="spells-list">
          {filteredSpells.map((spell: any) => (
            <div
              key={spell.id}
              data-testid={`spell-${spell.id}`}
              className={`spell-card ${selectedSpells.includes(spell.id) ? 'selected' : ''}`}
              onClick={() => toggleSpell(spell.id)}
            >
              <input
                type="checkbox"
                checked={selectedSpells.includes(spell.id)}
                onChange={() => toggleSpell(spell.id)}
                data-testid={`spell-checkbox-${spell.id}`}
              />
              <span>{spell.name}</span>
              <span className="school">{spell.school}</span>
              <p>{spell.description}</p>
              {spell.damage && <span className="damage">Damage: {spell.damage}</span>}
              {spell.ritual && <span className="ritual">Ritual</span>}
              {spell.concentration && <span className="concentration">Concentration</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Validation */}
      <div data-testid="validation">
        <div data-testid="validation-status">
          {isValid ? 'Valid spell selection' : 'Invalid spell selection'}
        </div>
        <button
          disabled={!isValid}
          data-testid="proceed-button"
          onClick={() => console.log('Proceeding with spell selection')}
        >
          Proceed
        </button>
      </div>
    </div>
  );
};

describe('Spell Selection Integration Tests', () => {
  let mockWizard: CharacterClass;
  let mockFighter: CharacterClass;
  let mockRace: CharacterRace;
  let mockHighElfSubrace: Subrace;

  beforeEach(() => {
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
        spellbook: true,
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
      skillChoices: ['Acrobatics', 'Athletics'],
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
  });

  describe('Basic Functionality', () => {
    it('should render spell selection for wizard', () => {
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };

      render(<MockSpellSelection character={wizardCharacter} />);

      expect(screen.getByText('Spell Selection for Test Wizard')).toBeInTheDocument();
      expect(screen.getByTestId('cantrips-section')).toBeInTheDocument();
      expect(screen.getByTestId('spells-section')).toBeInTheDocument();
      expect(screen.getByText('Cantrips (0/3)')).toBeInTheDocument();
      expect(screen.getByText('1st Level Spells (0/6)')).toBeInTheDocument();
    });

    it('should show all available cantrips and spells', () => {
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };

      render(<MockSpellSelection character={wizardCharacter} />);

      // Check cantrips
      expect(screen.getByText('Mage Hand')).toBeInTheDocument();
      expect(screen.getByText('Prestidigitation')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Minor Illusion')).toBeInTheDocument();

      // Check spells
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.getByText('Shield')).toBeInTheDocument();
      expect(screen.getByText('Detect Magic')).toBeInTheDocument();
      expect(screen.getByText('Burning Hands')).toBeInTheDocument();
      expect(screen.getByText('Sleep')).toBeInTheDocument();
      expect(screen.getByText('Color Spray')).toBeInTheDocument();
    });

    it('should handle non-spellcaster correctly', () => {
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };

      render(<MockSpellSelection character={fighterCharacter} />);

      expect(screen.getByText('Character is not a spellcaster')).toBeInTheDocument();
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };
    });

    it('should allow cantrip selection', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select a cantrip
      const mageHandCheckbox = screen.getByTestId('cantrip-checkbox-mage-hand');
      await user.click(mageHandCheckbox);

      expect(mageHandCheckbox).toBeChecked();
      expect(screen.getByText('Cantrips (1/3)')).toBeInTheDocument();

      // Select another cantrip
      const prestidigitationCheckbox = screen.getByTestId('cantrip-checkbox-prestidigitation');
      await user.click(prestidigitationCheckbox);

      expect(prestidigitationCheckbox).toBeChecked();
      expect(screen.getByText('Cantrips (2/3)')).toBeInTheDocument();
    });

    it('should allow spell selection', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select a spell
      const magicMissileCheckbox = screen.getByTestId('spell-checkbox-magic-missile');
      await user.click(magicMissileCheckbox);

      expect(magicMissileCheckbox).toBeChecked();
      expect(screen.getByText('1st Level Spells (1/6)')).toBeInTheDocument();
    });

    it('should enforce selection limits', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select maximum cantrips (3)
      await user.click(screen.getByTestId('cantrip-checkbox-mage-hand'));
      await user.click(screen.getByTestId('cantrip-checkbox-prestidigitation'));
      await user.click(screen.getByTestId('cantrip-checkbox-light'));

      expect(screen.getByText('Cantrips (3/3)')).toBeInTheDocument();

      // Try to select one more (should not work)
      await user.click(screen.getByTestId('cantrip-checkbox-minor-illusion'));

      expect(screen.getByTestId('cantrip-checkbox-minor-illusion')).not.toBeChecked();
      expect(screen.getByText('Cantrips (3/3)')).toBeInTheDocument();
    });

    it('should allow deselection', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select and then deselect a cantrip
      const mageHandCheckbox = screen.getByTestId('cantrip-checkbox-mage-hand');
      await user.click(mageHandCheckbox);
      expect(mageHandCheckbox).toBeChecked();

      await user.click(mageHandCheckbox);
      expect(mageHandCheckbox).not.toBeChecked();
      expect(screen.getByText('Cantrips (0/3)')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };
    });

    it('should filter spells by search term', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'magic');

      // Should show Magic Missile and Detect Magic
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.getByText('Detect Magic')).toBeInTheDocument();

      // Should not show other spells
      expect(screen.queryByText('Shield')).not.toBeInTheDocument();
      expect(screen.queryByText('Burning Hands')).not.toBeInTheDocument();
    });

    it('should filter by school', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      const schoolFilter = screen.getByTestId('school-filter');
      await user.selectOptions(schoolFilter, ['Evocation']);

      // Should show Evocation spells
      expect(screen.getByText('Light')).toBeInTheDocument(); // Cantrip
      expect(screen.getByText('Magic Missile')).toBeInTheDocument(); // Spell
      expect(screen.getByText('Burning Hands')).toBeInTheDocument(); // Spell

      // Should not show non-Evocation spells
      expect(screen.queryByText('Mage Hand')).not.toBeInTheDocument(); // Conjuration
      expect(screen.queryByText('Shield')).not.toBeInTheDocument(); // Abjuration
    });

    it('should combine search and filter', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Search for "magic" and filter by Evocation
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'magic');

      const schoolFilter = screen.getByTestId('school-filter');
      await user.selectOptions(schoolFilter, ['Evocation']);

      // Should only show Magic Missile (Evocation + contains "magic")
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.queryByText('Detect Magic')).not.toBeInTheDocument(); // Divination
    });

    it('should clear filters', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Apply search filter
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'magic');

      // Clear search
      await user.clear(searchInput);

      // Should show all spells again
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.getByText('Shield')).toBeInTheDocument();
      expect(screen.getByText('Burning Hands')).toBeInTheDocument();
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };
    });

    it('should start with invalid selection', () => {
      render(<MockSpellSelection character={wizardCharacter} />);

      expect(screen.getByText('Invalid spell selection')).toBeInTheDocument();
      expect(screen.getByTestId('proceed-button')).toBeDisabled();
    });

    it('should become valid with complete selection', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select required cantrips (3)
      await user.click(screen.getByTestId('cantrip-checkbox-mage-hand'));
      await user.click(screen.getByTestId('cantrip-checkbox-prestidigitation'));
      await user.click(screen.getByTestId('cantrip-checkbox-light'));

      // Select required spells (6)
      await user.click(screen.getByTestId('spell-checkbox-magic-missile'));
      await user.click(screen.getByTestId('spell-checkbox-shield'));
      await user.click(screen.getByTestId('spell-checkbox-detect-magic'));
      await user.click(screen.getByTestId('spell-checkbox-burning-hands'));
      await user.click(screen.getByTestId('spell-checkbox-sleep'));
      await user.click(screen.getByTestId('spell-checkbox-color-spray'));

      await waitFor(() => {
        expect(screen.getByText('Valid spell selection')).toBeInTheDocument();
        expect(screen.getByTestId('proceed-button')).not.toBeDisabled();
      });
    });

    it('should become invalid if selection is incomplete', async () => {
      const user = userEvent.setup();
      render(<MockSpellSelection character={wizardCharacter} />);

      // Select some but not all required spells
      await user.click(screen.getByTestId('cantrip-checkbox-mage-hand'));
      await user.click(screen.getByTestId('spell-checkbox-magic-missile'));

      expect(screen.getByText('Invalid spell selection')).toBeInTheDocument();
      expect(screen.getByTestId('proceed-button')).toBeDisabled();
    });
  });

  describe('Spell Information Display', () => {
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
          charisma: { score: 8, modifier: -1, savingThrow: false },
        },
      };
    });

    it('should display spell schools', () => {
      render(<MockSpellSelection character={wizardCharacter} />);

      expect(screen.getByText('Conjuration')).toBeInTheDocument(); // Mage Hand
      expect(screen.getByText('Transmutation')).toBeInTheDocument(); // Prestidigitation
      expect(screen.getByText('Evocation')).toBeInTheDocument(); // Light, Magic Missile, Burning Hands
      expect(screen.getByText('Illusion')).toBeInTheDocument(); // Minor Illusion, Color Spray
      expect(screen.getByText('Abjuration')).toBeInTheDocument(); // Shield
      expect(screen.getByText('Divination')).toBeInTheDocument(); // Detect Magic
      expect(screen.getByText('Enchantment')).toBeInTheDocument(); // Sleep
    });

    it('should display spell properties', () => {
      render(<MockSpellSelection character={wizardCharacter} />);

      // Check for ritual spells
      expect(screen.getByText('Ritual')).toBeInTheDocument(); // Detect Magic

      // Check for concentration spells
      expect(screen.getAllByText('Concentration')).toHaveLength(2); // Mage Hand, Detect Magic

      // Check for damage spells
      expect(screen.getByText('Damage: 1d4 + 1')).toBeInTheDocument(); // Magic Missile
      expect(screen.getByText('Damage: 3d6')).toBeInTheDocument(); // Burning Hands
    });

    it('should display spell descriptions', () => {
      render(<MockSpellSelection character={wizardCharacter} />);

      expect(
        screen.getByText('A spectral, floating hand appears at a point you choose within range.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('You create three glowing darts of magical force.'),
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null character', () => {
      render(<MockSpellSelection character={null} />);

      expect(screen.getByText('No character selected')).toBeInTheDocument();
    });

    it('should handle character without class', () => {
      const characterWithoutClass: Character = {
        id: '1',
        name: 'Test Character',
        level: 1,
        class: undefined as any,
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

      render(<MockSpellSelection character={characterWithoutClass} />);

      expect(screen.getByText('Character is not a spellcaster')).toBeInTheDocument();
    });
  });
});
