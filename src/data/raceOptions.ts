import { CharacterRace } from '@/types/character';

/**
 * Defines the available races in the game following D&D 5E rules.
 * Each race includes basic attributes, ability score increases, and racial traits.
 */
export const races: CharacterRace[] = [
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
    traits: ['Darkvision', 'Dwarven Resilience', 'Tool Proficiency'],
    abilityScoreIncrease: {
      constitution: 2
    },
    speed: 25,
    languages: ['Common', 'Dwarvish']
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.',
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
    abilityScoreIncrease: {
      dexterity: 2
    },
    speed: 30,
    languages: ['Common', 'Elvish']
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense.',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    abilityScoreIncrease: {
      dexterity: 2
    },
    speed: 25,
    languages: ['Common', 'Halfling']
  },
  {
    id: 'human',
    name: 'Human',
    description: 'Humans are the most adaptable and ambitious people among the common races.',
    traits: ['Versatile'],
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1
    },
    speed: 30,
    languages: ['Common', 'Choice of One']
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description: 'Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.',
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    abilityScoreIncrease: {
      strength: 2,
      charisma: 1
    },
    speed: 30,
    languages: ['Common', 'Draconic']
  }
];