import type { AbilityScores } from '@/types/character';

export const races = [
  {
    id: 'dwarf',
    name: 'Dwarf',
    description:
      'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
    traits: ['Darkvision', 'Dwarven Resilience', 'Tool Proficiency'],
    abilityScoreIncrease: {
      constitution: 2,
    },
    speed: 25,
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'elf',
    name: 'Elf',
    description:
      'Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.',
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
    abilityScoreIncrease: {
      dexterity: 2,
    },
    speed: 30,
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description:
      'The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense.',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    abilityScoreIncrease: {
      dexterity: 2,
    },
    speed: 25,
    languages: ['Common', 'Halfling'],
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
      charisma: 1,
    },
    speed: 30,
    languages: ['Common', 'Choice of One'],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    description:
      'Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.',
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    abilityScoreIncrease: {
      strength: 2,
      charisma: 1,
    },
    speed: 30,
    languages: ['Common', 'Draconic'],
  },
];

export const classes = [
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat, skilled with a variety of weapons and armor.',
    hitDie: 10,
    primaryAbility: 'strength' as keyof AbilityScores,
    savingThrowProficiencies: ['strength', 'constitution'] as (keyof AbilityScores)[],
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
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'A scholarly magic-user capable of manipulating the structures of reality.',
    hitDie: 6,
    primaryAbility: 'intelligence' as keyof AbilityScores,
    savingThrowProficiencies: ['intelligence', 'wisdom'] as (keyof AbilityScores)[],
    skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    numSkillChoices: 2,
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    hitDie: 8,
    primaryAbility: 'dexterity' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'intelligence'] as (keyof AbilityScores)[],
    skillChoices: [
      'Acrobatics',
      'Athletics',
      'Deception',
      'Insight',
      'Intimidation',
      'Investigation',
      'Perception',
      'Performance',
      'Persuasion',
      'Sleight of Hand',
      'Stealth',
    ],
    numSkillChoices: 4,
  },
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A priestly champion who wields divine magic in service of a higher power.',
    hitDie: 8,
    primaryAbility: 'wisdom' as keyof AbilityScores,
    savingThrowProficiencies: ['wisdom', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    numSkillChoices: 2,
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'An inspiring magician whose power echoes the music of creation.',
    hitDie: 8,
    primaryAbility: 'charisma' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['Any'],
    numSkillChoices: 3,
  },
];
