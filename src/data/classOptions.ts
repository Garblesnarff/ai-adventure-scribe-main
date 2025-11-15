import type { CharacterClass, AbilityScores } from '@/types/character';

/**
 * Defines the available classes in the game following D&D 5E rules.
 * Each class includes core attributes like hit die, primary abilities, proficiencies, and spellcasting.
 */
export const classes: CharacterClass[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat, skilled with a variety of weapons and armor.',
    backgroundImage: '/images/classes/fighter-class-card-background.png',
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
    armorProficiencies: ['All armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    classFeatures: [
      {
        id: 'fighting-style',
        name: 'Fighting Style',
        description:
          'You adopt a particular style of fighting as your specialty. Choose one of the following options.',
        choices: {
          name: 'Fighting Style',
          options: [
            'Archery: +2 bonus to ranged weapon attacks',
            'Defense: +1 AC while wearing armor',
            'Dueling: +2 damage when wielding a one-handed weapon with no other weapon',
            'Great Weapon Fighting: Reroll 1s and 2s on damage dice for two-handed weapons',
            'Protection: Use reaction to impose disadvantage on attack against nearby ally (requires shield)',
            'Two-Weapon Fighting: Add ability modifier to damage of second attack',
          ],
          description:
            "You can't take the same Fighting Style option more than once, even if you get to choose again.",
        },
      },
      {
        id: 'second-wind',
        name: 'Second Wind',
        description:
          'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.',
      },
    ],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'A scholarly magic-user capable of manipulating the structures of reality.',
    backgroundImage: '/images/classes/wizard-class-card-background.png',
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
      spellbook: true,
    },
    classFeatures: [
      {
        id: 'arcane-recovery',
        name: 'Arcane Recovery',
        description:
          'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your wizard level (rounded up), and none of the slots can be 6th level or higher.',
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power.',
      },
    ],
  },
  {
    id: 'rogue',
    name: 'Rogue',
    description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    backgroundImage: '/images/classes/rogue-class-card-background.png',
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
    armorProficiencies: ['Light armor'],
    weaponProficiencies: [
      'Simple weapons',
      'Hand crossbows',
      'Longswords',
      'Rapiers',
      'Shortswords',
    ],
    toolProficiencies: ["Thieves' tools"],
    classFeatures: [
      {
        id: 'expertise',
        name: 'Expertise',
        description:
          "At 1st level, choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.",
      },
      {
        id: 'sneak-attack',
        name: 'Sneak Attack',
        description:
          "Beginning at 1st level, you know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.",
      },
      {
        id: 'thieves-cant',
        name: "Thieves' Cant",
        description:
          "During your rogue training you learned thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation.",
      },
    ],
  },
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A priestly champion who wields divine magic in service of a higher power.',
    backgroundImage: '/images/classes/cleric-class-card-background.png',
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
      ritualCasting: true,
    },
    classFeatures: [
      {
        id: 'divine-domain',
        name: 'Divine Domain',
        description:
          'Choose one domain related to your deity. Your choice grants you domain spells and other features when you choose it at 1st level.',
        choices: {
          name: 'Divine Domain',
          options: [
            'Life Domain: Focuses on healing and protection',
            'Light Domain: Harnesses the power of flame and radiance',
            'War Domain: Guides warriors in battle',
            'Storm Domain: Commands storms and lightning',
            'Nature Domain: Connects with the natural world',
          ],
          description:
            'Each domain provides additional spells and abilities that reflect the nature of your deity.',
        },
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description: 'As a conduit for divine power, you can cast cleric spells.',
      },
    ],
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'An inspiring magician whose power echoes the music of creation.',
    backgroundImage: '/images/classes/bard-class-card-background.png',
    hitDie: 8,
    primaryAbility: 'charisma' as keyof AbilityScores,
    savingThrowProficiencies: ['dexterity', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['Any'],
    numSkillChoices: 3,
    armorProficiencies: ['Light armor'],
    weaponProficiencies: [
      'Simple weapons',
      'Hand crossbows',
      'Longswords',
      'Rapiers',
      'Shortswords',
    ],
    toolProficiencies: ['Three musical instruments of your choice'],
    spellcasting: {
      ability: 'charisma' as keyof AbilityScores,
      cantripsKnown: 2,
      spellsKnown: 4,
      ritualCasting: false,
    },
    classFeatures: [
      {
        id: 'bardic-inspiration',
        name: 'Bardic Inspiration',
        description:
          'You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6.',
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music.',
      },
    ],
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'A fierce warrior of primitive background who can enter a battle rage.',
    backgroundImage: '/images/classes/barbarian-class-card-background.png',
    hitDie: 12,
    primaryAbility: 'strength' as keyof AbilityScores,
    savingThrowProficiencies: ['strength', 'constitution'] as (keyof AbilityScores)[],
    skillChoices: [
      'Animal Handling',
      'Athletics',
      'Intimidation',
      'Nature',
      'Perception',
      'Survival',
    ],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    classFeatures: [
      {
        id: 'rage',
        name: 'Rage',
        description:
          'In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action. While raging, you gain advantage on Strength checks and Strength saving throws, +2 damage to melee attacks using Strength, and resistance to bludgeoning, piercing, and slashing damage. You can rage once per long rest.',
      },
      {
        id: 'unarmored-defense',
        name: 'Unarmored Defense',
        description:
          'While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.',
      },
    ],
  },
  {
    id: 'druid',
    name: 'Druid',
    description: 'A priest of nature, wielding elemental forces and transforming into animals.',
    backgroundImage: '/images/classes/druid-class-card-background.png',
    hitDie: 8,
    primaryAbility: 'wisdom' as keyof AbilityScores,
    savingThrowProficiencies: ['intelligence', 'wisdom'] as (keyof AbilityScores)[],
    skillChoices: [
      'Arcana',
      'Animal Handling',
      'Insight',
      'Medicine',
      'Nature',
      'Perception',
      'Religion',
      'Survival',
    ],
    numSkillChoices: 2,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields (non-metal)'],
    weaponProficiencies: [
      'Clubs',
      'Daggers',
      'Darts',
      'Javelins',
      'Maces',
      'Quarterstaffs',
      'Scimitars',
      'Sickles',
      'Slings',
      'Spears',
    ],
    toolProficiencies: ['Herbalism kit'],
    spellcasting: {
      ability: 'wisdom' as keyof AbilityScores,
      cantripsKnown: 2,
      ritualCasting: true,
    },
    classFeatures: [
      {
        id: 'druidcraft',
        name: 'Druidcraft',
        description:
          "You know the druidcraft cantrip. It doesn't count against your number of cantrips known.",
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'Drawing on the divine essence of nature itself, you can cast spells to shape that essence to your will.',
      },
    ],
  },
  {
    id: 'monk',
    name: 'Monk',
    description:
      'A master of martial arts, harnessing inner power and achieving physical perfection.',
    backgroundImage: '/images/classes/monk-class-card-background.png',
    hitDie: 8,
    primaryAbility: 'dexterity' as keyof AbilityScores,
    savingThrowProficiencies: ['strength', 'dexterity'] as (keyof AbilityScores)[],
    skillChoices: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
    numSkillChoices: 2,
    armorProficiencies: [],
    weaponProficiencies: ['Simple weapons', 'Shortswords'],
    toolProficiencies: ["One type of artisan's tools or one musical instrument"],
    classFeatures: [
      {
        id: 'unarmored-defense-monk',
        name: 'Unarmored Defense',
        description:
          'While you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.',
      },
      {
        id: 'martial-arts',
        name: 'Martial Arts',
        description:
          'You gain the following benefits while unarmed or wielding only monk weapons and not wearing armor or wielding a shield: You can use Dexterity instead of Strength for attack and damage rolls, you can roll a d4 for damage instead of normal damage, and when you use Attack action with unarmed strike or monk weapon, you can make one unarmed strike as a bonus action.',
      },
    ],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    description:
      'A holy warrior bound to a sacred oath, wielding divine magic and martial prowess.',
    backgroundImage: '/images/classes/paladin-class-card-background.png',
    hitDie: 10,
    primaryAbility: 'strength' as keyof AbilityScores,
    savingThrowProficiencies: ['wisdom', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
    numSkillChoices: 2,
    armorProficiencies: ['All armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    classFeatures: [
      {
        id: 'divine-sense',
        name: 'Divine Sense',
        description:
          'You can use your action to detect good and evil. Until the end of your next turn, you know the location of any celestial, fiend, or undead within 60 feet that is not behind total cover. You can use this feature once per long rest.',
      },
      {
        id: 'lay-on-hands',
        name: 'Lay on Hands',
        description:
          'You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5. As an action, you can touch a creature and draw power from the pool to restore hit points to that creature.',
      },
    ],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'A warrior of the wilderness, skilled in tracking, survival, and combat.',
    backgroundImage: '/images/classes/ranger-class-card-background.png',
    hitDie: 10,
    primaryAbility: 'dexterity' as keyof AbilityScores,
    savingThrowProficiencies: ['strength', 'dexterity'] as (keyof AbilityScores)[],
    skillChoices: [
      'Animal Handling',
      'Athletics',
      'Insight',
      'Investigation',
      'Nature',
      'Perception',
      'Stealth',
      'Survival',
    ],
    numSkillChoices: 3,
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    classFeatures: [
      {
        id: 'favored-enemy',
        name: 'Favored Enemy',
        description:
          'Choose a type of favored enemy: beasts, fey, humanoids, monstrosities, or undead. You have advantage on Wisdom (Survival) checks to track your favored enemies, as well as on Intelligence checks to recall information about them.',
        choices: {
          name: 'Favored Enemy',
          options: [
            'Beasts: Natural animals and magical beasts',
            'Fey: Creatures from the Feywild',
            'Humanoids: People and human-like creatures',
            'Monstrosities: Frightening creatures of unnatural origin',
            'Undead: Once-living creatures brought to a horrifying state of undeath',
          ],
          description:
            'Choose the type of creature you have studied and learned to hunt effectively.',
        },
      },
      {
        id: 'natural-explorer',
        name: 'Natural Explorer',
        description:
          'Choose a favored terrain: forest, mountains, swamp, coast, desert, grassland, or underdark. When you make a Wisdom (Survival) check in your favored terrain, your proficiency bonus is doubled.',
        choices: {
          name: 'Favored Terrain',
          options: [
            'Forest: Woodlands and jungles',
            'Mountains: High peaks and alpine regions',
            'Swamp: Wetlands and marshes',
            'Coast: Beaches and coastal regions',
            'Desert: Arid wastelands and dunes',
            'Grassland: Plains and prairies',
            'Deep Caverns: Subterranean caverns and tunnels',
          ],
          description:
            'Choose the terrain where you are most at home and have learned to navigate expertly.',
        },
      },
    ],
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description:
      'A spellcaster who draws on inherent magic from a draconic or other exotic bloodline.',
    backgroundImage: '/images/classes/sorcerer-class-card-background.png',
    hitDie: 6,
    primaryAbility: 'charisma' as keyof AbilityScores,
    savingThrowProficiencies: ['constitution', 'charisma'] as (keyof AbilityScores)[],
    skillChoices: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
    numSkillChoices: 2,
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    spellcasting: {
      ability: 'charisma' as keyof AbilityScores,
      cantripsKnown: 4,
      spellsKnown: 2,
    },
    classFeatures: [
      {
        id: 'sorcerous-origin',
        name: 'Sorcerous Origin',
        description:
          'Choose a sorcerous origin, which describes the source of your innate magical power.',
        choices: {
          name: 'Sorcerous Origin',
          options: [
            'Draconic Bloodline: Your innate magic comes from draconic magic that was mingled with your blood',
            'Wild Magic: Your innate magic comes from the wild forces of chaos',
            'Divine Soul: Your magic derives from a divine source within you',
            'Storm Sorcery: Your innate magic comes from the power of elemental air',
            'Umbral Magic: Your innate magic comes from the Shadow Realm',
          ],
          description:
            'Your choice grants you features at 1st level and again at 6th, 14th, and 18th level.',
        },
      },
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic.',
      },
    ],
  },
  {
    id: 'warlock',
    name: 'Warlock',
    description: 'A wielder of magic derived from a bargain with an extraplanar entity.',
    backgroundImage: '/images/classes/warlock-class-card-background.png',
    hitDie: 8,
    primaryAbility: 'charisma' as keyof AbilityScores,
    savingThrowProficiencies: ['wisdom', 'charisma'] as (keyof AbilityScores)[],
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
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons'],
    spellcasting: {
      ability: 'charisma' as keyof AbilityScores,
      cantripsKnown: 2,
      spellsKnown: 2,
      pactMagic: true,
    },
    classFeatures: [
      {
        id: 'otherworldly-patron',
        name: 'Otherworldly Patron',
        description: 'You have struck a pact with an otherworldly being.',
        choices: {
          name: 'Otherworldly Patron',
          options: [
            'The Archfey: Your patron is a lord or lady of the fey',
            'The Fiend: Your patron is a fiend from the lower planes',
            'The Great Old One: Your patron is a mysterious entity whose nature is alien to the fabric of reality',
            'The Celestial: Your patron is a powerful being of the Upper Planes',
            'The Bladebound: Your patron is a mysterious entity from the Shadow Realm',
          ],
          description: 'Your choice of patron influences which spells you have access to.',
        },
      },
      {
        id: 'pact-magic',
        name: 'Pact Magic',
        description:
          'Your arcane research and the magic bestowed on you by your patron have given you facility with spells. You regain all expended spell slots when you finish a short or long rest.',
      },
    ],
  },
];
