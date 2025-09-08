import { CharacterClass } from '@/types/character';
import { AbilityScores } from '@/types/character';

/**
 * Defines the available classes in the game following D&D 5E rules.
 * Each class includes core attributes like hit die, primary abilities, proficiencies, and spellcasting.
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
    numSkillChoices: 2,
    armorProficiencies: ['All armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    classFeatures: [
      {
        id: 'fighting-style',
        name: 'Fighting Style',
        description: 'You adopt a particular style of fighting as your specialty. Choose one of the following options.',
        choices: {
          name: 'Fighting Style',
          options: [
            'Archery: +2 bonus to ranged weapon attacks',
            'Defense: +1 AC while wearing armor',
            'Dueling: +2 damage when wielding a one-handed weapon with no other weapon',
            'Great Weapon Fighting: Reroll 1s and 2s on damage dice for two-handed weapons',
            'Protection: Use reaction to impose disadvantage on attack against nearby ally (requires shield)',
            'Two-Weapon Fighting: Add ability modifier to damage of second attack'
          ],
          description: 'You can\'t take the same Fighting Style option more than once, even if you get to choose again.'
        }
      },
      {
        id: 'second-wind',
        name: 'Second Wind',
        description: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.'
      }
    ]
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
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    spellcasting: {
      ability: 'intelligence' as keyof AbilityScores,
      cantripsKnown: 3,
      spellsKnown: 6,
      ritualCasting: true,
      spellbook: true
    },
    classFeatures: [
      {
        id: 'arcane-recovery',
        name: 'Arcane Recovery',
        description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your wizard level (rounded up), and none of the slots can be 6th level or higher.'
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description: 'As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power.'
      }
    ]
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    hitDie: 8,
    primaryAbility: 'dexterity' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'intelligence'] as (keyof AbilityScores)[],
    skillChoices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    numSkillChoices: 4,
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    toolProficiencies: ['Thieves\' tools'],
    classFeatures: [
      {
        id: 'expertise',
        name: 'Expertise',
        description: 'At 1st level, choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves\' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.'
      },
      {
        id: 'sneak-attack',
        name: 'Sneak Attack',
        description: 'Beginning at 1st level, you know how to strike subtly and exploit a foe\'s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.'
      },
      {
        id: 'thieves-cant',
        name: 'Thieves\' Cant',
        description: 'During your rogue training you learned thieves\' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation.'
      }
    ]
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
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons'],
    spellcasting: {
      ability: 'wisdom' as keyof AbilityScores,
      cantripsKnown: 3,
      ritualCasting: true
    },
    classFeatures: [
      {
        id: 'divine-domain',
        name: 'Divine Domain',
        description: 'Choose one domain related to your deity. Your choice grants you domain spells and other features when you choose it at 1st level.',
        choices: {
          name: 'Divine Domain',
          options: [
            'Life Domain: Focuses on healing and protection',
            'Light Domain: Harnesses the power of flame and radiance',
            'War Domain: Guides warriors in battle',
            'Tempest Domain: Commands storms and lightning',
            'Nature Domain: Connects with the natural world'
          ],
          description: 'Each domain provides additional spells and abilities that reflect the nature of your deity.'
        }
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description: 'As a conduit for divine power, you can cast cleric spells.'
      }
    ]
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
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    toolProficiencies: ['Three musical instruments of your choice'],
    spellcasting: {
      ability: 'charisma' as keyof AbilityScores,
      cantripsKnown: 2,
      spellsKnown: 4,
      ritualCasting: false
    },
    classFeatures: [
      {
        id: 'bardic-inspiration',
        name: 'Bardic Inspiration',
        description: 'You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6.'
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description: 'You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music.'
      }
    ]
  }
];