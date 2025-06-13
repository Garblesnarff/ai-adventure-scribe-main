import { CharacterClass } from '@/types/character';
import { AbilityScores } from '@/types/character';

/**
 * Defines the available classes in the game following D&D 5E rules.
 * Each class includes core attributes like hit die, primary abilities, and proficiencies.
 */
export const classes: CharacterClass[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat, skilled with a variety of weapons and armor.',
    hitDie: 10,
    primaryAbility: 'strength' as keyof AbilityScores,
    savingThrowProficiencies: ['strength', 'constitution'] as (keyof AbilityScores)[],
    skillChoices: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
    numSkillChoices: 2
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'A scholarly magic-user capable of manipulating the structures of reality.',
    hitDie: 6,
    primaryAbility: 'intelligence' as keyof AbilityScores,
    savingThrowProficiencies: ['intelligence', 'wisdom'] as (keyof AbilityScores)[],
    skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    numSkillChoices: 2
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    hitDie: 8,
    primaryAbility: 'dexterity' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'intelligence'] as (keyof AbilityScores)[],
    skillChoices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    numSkillChoices: 4
  },
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A priestly champion who wields divine magic in service of a higher power.',
    hitDie: 8,
    primaryAbility: 'wisdom' as keyof AbilityScores,
    savingThrowProficiencies: ['wisdom', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    numSkillChoices: 2
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'An inspiring magician whose power echoes the music of creation.',
    hitDie: 8,
    primaryAbility: 'charisma' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['Any'],
    numSkillChoices: 3
  }
];