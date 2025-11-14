import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';

import type { Character } from '@/types/character';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

import { CharacterProvider } from '@/contexts/CharacterContext';

/**
 * Test Utilities for D&D Spell Selection System
 *
 * Provides comprehensive testing infrastructure for spell-related components and hooks.
 * Includes custom render function with all necessary providers and mock data generators.
 */

// Mock character data for testing
export const mockWizardCharacter: Character = {
  id: 'test-wizard',
  name: 'Test Wizard',
  class: {
    id: 'wizard',
    name: 'Wizard',
    description: 'A master of arcane magic',
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
      pactMagic: false,
    },
    classFeatures: [],
    armorProficiencies: [],
    weaponProficiencies: [],
  },
  race: {
    id: 'human',
    name: 'Human',
    description: 'Versatile and adaptable',
    abilityScoreIncrease: {},
    speed: 30,
    traits: [],
    languages: ['Common'],
  },
  level: 1,
};

export const mockClericCharacter: Character = {
  id: 'test-cleric',
  name: 'Test Cleric',
  class: {
    id: 'cleric',
    name: 'Cleric',
    description: 'A divine spellcaster',
    hitDie: 8,
    primaryAbility: 'wisdom',
    savingThrowProficiencies: ['wisdom', 'charisma'],
    skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    numSkillChoices: 2,
    spellcasting: {
      ability: 'wisdom',
      cantripsKnown: 3,
      spellsKnown: undefined,
      ritualCasting: true,
      spellbook: false,
      pactMagic: false,
    },
    classFeatures: [],
    armorProficiencies: [],
    weaponProficiencies: [],
  },
  race: {
    id: 'human',
    name: 'Human',
    description: 'Versatile and adaptable',
    abilityScoreIncrease: {},
    speed: 30,
    traits: [],
    languages: ['Common'],
  },
  level: 1,
};

export const mockFighterCharacter: Character = {
  id: 'test-fighter',
  name: 'Test Fighter',
  class: {
    id: 'fighter',
    name: 'Fighter',
    description: 'A martial warrior',
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
    // No spellcasting at level 1
    classFeatures: [],
    armorProficiencies: [],
    weaponProficiencies: [],
  },
  race: {
    id: 'human',
    name: 'Human',
    description: 'Versatile and adaptable',
    abilityScoreIncrease: {},
    speed: 30,
    traits: [],
    languages: ['Common'],
  },
  level: 1,
};

export const mockHighElfCharacter: Character = {
  id: 'test-high-elf',
  name: 'Test High Elf',
  class: {
    id: 'fighter',
    name: 'Fighter',
    description: 'A martial warrior',
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
  },
  race: {
    id: 'elf',
    name: 'Elf',
    description: 'Graceful and magical',
    abilityScoreIncrease: { dexterity: 2 },
    speed: 30,
    traits: [],
    languages: ['Common', 'Elvish'],
  },
  subrace: {
    id: 'high-elf',
    name: 'High Elf',
    description: 'Magically gifted elves',
    abilityScoreIncrease: { intelligence: 1 },
    traits: [],
    bonusCantrip: {
      source: 'wizard',
      count: 1,
    },
  },
  level: 1,
};

// Mock spell data
export const mockWizardSpells = [
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    description: 'A dart of magical force strikes its target.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    duration: '1 round',
    description: 'An invisible barrier of magical force appears.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
  },
  {
    id: 'detect-magic',
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    duration: 'Concentration, up to 10 minutes',
    description: 'You sense the presence of magic within 30 feet.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: true,
  },
];

export const mockWizardCantrips = [
  {
    id: 'mage-hand',
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false,
  },
  {
    id: 'prestidigitation',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '10 feet',
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
  },
  {
    id: 'minor-illusion',
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    castingTime: '1 action',
    range: '30 feet',
    duration: '1 minute',
    description: 'You create a sound or an image.',
    verbal: false,
    somatic: true,
    material: true,
    concentration: false,
    ritual: false,
  },
];

export const mockClericSpells = [
  {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'A creature you touch regains hit points.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
  },
  {
    id: 'healing-word',
    name: 'Healing Word',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'A creature you can see regains hit points.',
    verbal: true,
    somatic: false,
    material: false,
    concentration: false,
    ritual: false,
  },
  {
    id: 'bless',
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'You bless up to three creatures.',
    verbal: true,
    somatic: true,
    material: true,
    concentration: true,
    ritual: false,
  },
];

export const mockClericCantrips = [
  {
    id: 'guidance',
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false,
  },
  {
    id: 'light',
    name: 'Light',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: '1 hour',
    description: 'You touch one object.',
    verbal: true,
    somatic: false,
    material: true,
    concentration: false,
    ritual: false,
  },
  {
    id: 'sacred-flame',
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'Flame-like radiance descends.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
  },
];

// Custom render function with providers
interface AllProvidersProps {
  children: React.ReactNode;
  initialCharacter?: Character | null;
}

const AllProviders = ({ children, initialCharacter = null }: AllProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <CharacterProvider initialCharacter={initialCharacter}>{children}</CharacterProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialCharacter?: Character | null;
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { initialCharacter, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialCharacter={initialCharacter}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
};

// API Mock helpers
export const createApiSpellMock = (spell: any) => ({
  id: spell.id,
  name: spell.name,
  level: spell.level,
  school: spell.school,
  ritual: spell.ritual,
  concentration: spell.concentration,
  casting_time: spell.castingTime,
  range_text: spell.range,
  duration: spell.duration,
  description: spell.description,
  components_verbal: spell.verbal,
  components_somatic: spell.somatic,
  components_material: spell.material,
  material_components: spell.materialComponents || '',
  damage_effect: spell.damage ? 'damage' : null,
});

// Test assertion helpers
export const expectValidationError = (validation: any, errorType: string, message?: string) => {
  expect(validation.valid).toBe(false);
  expect(validation.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: errorType,
        ...(message && { message: expect.stringContaining(message) }),
      }),
    ]),
  );
};

export const expectValidationSuccess = (validation: any) => {
  expect(validation.valid).toBe(true);
  expect(validation.errors).toHaveLength(0);
};

// Export everything needed for tests
export * from '@testing-library/react';
export { customRender as render };
