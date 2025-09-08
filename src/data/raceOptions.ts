import { CharacterRace, Subrace } from '@/types/character';

/**
 * Defines the available base races in the game following D&D 5E rules.
 * Each base race includes common attributes, ability score increases, and racial traits.
 * Subraces provide additional specialization.
 */
export const baseRaces: CharacterRace[] = [
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
    traits: ['Darkvision', 'Dwarven Resilience', 'Tool Proficiency'],
    abilityScoreIncrease: {
      constitution: 2
    },
    speed: 25,
    languages: ['Common', 'Dwarvish'],
    subraces: [
      {
        id: 'hill-dwarf',
        name: 'Hill Dwarf',
        description: 'More resilient and intuitive, with extra hit points.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Dwarven Toughness']
      },
      {
        id: 'mountain-dwarf',
        name: 'Mountain Dwarf',
        description: 'Stronger and more accustomed to rugged life, with armor proficiency.',
        abilityScoreIncrease: {
          strength: 2
        },
        traits: ['Dwarven Armor Training']
      },
      {
        id: 'duergar',
        name: 'Duergar (Gray Dwarf)',
        description: 'A subrace from the Deep Caverns with innate magical abilities, including invisibility.',
        abilityScoreIncrease: {
          strength: 1,
          constitution: 1
        },
        traits: ['Duergar Magic', 'Duergar Resilience', 'Sunlight Sensitivity']
      }
    ]
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
    languages: ['Common', 'Elvish'],
    subraces: [
      {
        id: 'high-elf',
        name: 'High Elf',
        description: 'Masters of magic, they know an extra wizard cantrip.',
        abilityScoreIncrease: {
          intelligence: 1
        },
        traits: ['High Elf Cantrip', 'Weapon Training']
      },
      {
        id: 'wood-elf',
        name: 'Wood Elf',
        description: 'Stealthy and swift inhabitants of the forest.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Fleet of Foot', 'Mask of the Wild']
      },
      {
        id: 'drow',
        name: 'Drow (Dark Elf)',
        description: 'Native to the Deep Caverns, with superior darkvision and innate magic, but sunlight sensitivity.',
        abilityScoreIncrease: {
          charisma: 1
        },
        traits: ['Superior Darkvision', 'Sunlight Sensitivity', 'Drow Magic']
      },
      {
        id: 'eladrin',
        name: 'Eladrin',
        description: 'Elves native to the Feywild, who can teleport and whose moods align with the seasons.',
        abilityScoreIncrease: {
          charisma: 1
        },
        traits: ['Fey Step', 'Seasonal Traits']
      },
      {
        id: 'sea-elf',
        name: 'Sea Elf',
        description: 'Adapted for aquatic life, with a swim speed and the ability to breathe underwater.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Sea Elf Training', 'Child of the Sea']
      },
      {
        id: 'shadar-kai',
        name: 'Shadar-kai',
        description: 'Elves of the Shadow Realm, who are supernaturally resilient and can teleport.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Blessing of the Shadow Queen', 'Necrotic Resistance']
      }
    ]
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
    languages: ['Common', 'Halfling'],
    subraces: [
      {
        id: 'lightfoot-halfling',
        name: 'Lightfoot Halfling',
        description: 'Naturally stealthy and adept at hiding.',
        abilityScoreIncrease: {
          charisma: 1
        },
        traits: ['Naturally Stealthy']
      },
      {
        id: 'stout-halfling',
        name: 'Stout Halfling',
        description: 'Hardier than other halflings, with a resistance to poison.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Stout Resilience']
      }
    ]
  },
  {
    id: 'human',
    name: 'Human',
    description: 'Humans are the most adaptable and ambitious people among the common races.',
    traits: ['Versatile'],
    abilityScoreIncrease: {},
    speed: 30,
    languages: ['Common'],
    subraces: [
      {
        id: 'standard-human',
        name: 'Standard Human',
        description: 'The most adaptable and ambitious people among the common races.',
        abilityScoreIncrease: {
          strength: 1,
          dexterity: 1,
          constitution: 1,
          intelligence: 1,
          wisdom: 1,
          charisma: 1
        },
        traits: ['Versatile'],
        languages: ['Choice of One']
      },
      {
        id: 'variant-human',
        name: 'Variant Human',
        description: 'A more customizable version of human with a free feat at 1st level.',
        abilityScoreIncrease: {
          // Player chooses two different abilities to increase by 1
        },
        traits: ['Skills', 'Feat', 'Extra Language or Tool Proficiency'],
        languages: ['Choice of One or Tool Proficiency'],
        weaponProficiencies: [],
        armorProficiencies: []
      },
      {
        id: 'custom-lineage',
        name: 'Custom Lineage',
        description: 'A customizable lineage representing non-human ancestry or unique background.',
        abilityScoreIncrease: {
          // Player chooses one ability to increase by 2, or two abilities by 1 each
        },
        traits: ['Variable Size', 'Feat', 'Darkvision or Skill Proficiency'],
        languages: ['Common', 'Choice of One'],
        speed: 30
      }
    ]
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
    languages: ['Common', 'Draconic'],
    subraces: []
  },
  // Additional races with subraces
  {
    id: 'gnome',
    name: 'Gnome',
    description: 'Gnomes are whimsical, inventive creatures known for their curiosity and love of gadgets.',
    traits: ['Darkvision', 'Gnome Cunning'],
    abilityScoreIncrease: {
      intelligence: 2
    },
    speed: 25,
    languages: ['Common', 'Gnomish'],
    subraces: [
      {
        id: 'forest-gnome',
        name: 'Forest Gnome',
        description: 'Have a natural knack for illusion and communicating with small beasts.',
        abilityScoreIncrease: {
          dexterity: 1
        },
        traits: ['Natural Illusionist', 'Speak with Small Beasts']
      },
      {
        id: 'rock-gnome',
        name: 'Rock Gnome',
        description: 'Natural tinkerers and inventors with expertise in clockwork devices.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Artificer\'s Lore', 'Tinker']
      },
      {
        id: 'deep-gnome',
        name: 'Deep Gnome (Svirfneblin)',
        description: 'Dwellers of the Deep Caverns, with superior darkvision and natural stealth.',
        abilityScoreIncrease: {
          dexterity: 2
        },
        traits: ['Stone Camouflage', 'Gnome Cunning']
      }
    ]
  },
  {
    id: 'elementalborn',
    name: 'Elementalborn',
    description: 'Humanoids infused with elemental power.',
    traits: ['Elemental Traits'],
    abilityScoreIncrease: {},
    speed: 30,
    languages: ['Common', 'Primordial'],
    subraces: [
      {
        id: 'air-elementalborn',
        name: 'Air Elementalborn',
        description: 'Can hold their breath indefinitely and have innate levitation magic.',
        abilityScoreIncrease: {
          constitution: 1,
          dexterity: 1
        },
        traits: ['Unending Breath', 'Mingle with the Wind']
      },
      {
        id: 'earth-elementalborn',
        name: 'Earth Elementalborn',
        description: 'Possess extra strength and can traverse difficult terrain with ease.',
        abilityScoreIncrease: {
          constitution: 1,
          strength: 1
        },
        traits: ['Earth Walk', 'Merge with Stone']
      },
      {
        id: 'fire-elementalborn',
        name: 'Fire Elementalborn',
        description: 'Have a resistance to fire and can produce flames.',
        abilityScoreIncrease: {
          constitution: 1,
          intelligence: 1
        },
        traits: ['Darkvision', 'Fire Resistance', 'Reach to the Blaze']
      },
      {
        id: 'water-elementalborn',
        name: 'Water Elementalborn',
        description: 'Can breathe underwater, have a swim speed, and have a resistance to acid.',
        abilityScoreIncrease: {
          constitution: 1,
          wisdom: 1
        },
        traits: ['Amphibious', 'Swim Speed', 'Call to the Wave']
      }
    ]
  },
  {
    id: 'celestialborn',
    name: 'Celestialborn',
    description: 'Humanoids touched by celestial power.',
    traits: ['Celestial Revelation', 'Healing Hands', 'Light Cantrip'],
    abilityScoreIncrease: {
      charisma: 2
    },
    speed: 30,
    languages: ['Common', 'Celestial'],
    subraces: [
      {
        id: 'guardian-celestialborn',
        name: 'Guardian Celestialborn',
        description: 'Can manifest radiant, angelic wings for a short time.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Radiant Soul']
      },
      {
        id: 'radiant-celestialborn',
        name: 'Radiant Celestialborn',
        description: 'Can unleash a damaging aura of radiant light.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Radiant Consumption']
      },
      {
        id: 'shadow-celestialborn',
        name: 'Shadow Celestialborn',
        description: 'Can cause enemies to become frightened.',
        abilityScoreIncrease: {
          strength: 1
        },
        traits: ['Necrotic Shroud']
      }
    ]
  },
  {
    id: 'astralborn',
    name: 'Astralborn',
    description: 'Psionic humanoids from the astral realm.',
    traits: ['Psionic Resistance', 'Mental Discipline'],
    abilityScoreIncrease: {
      intelligence: 2
    },
    speed: 30,
    languages: ['Common', 'Astral'],
    subraces: [
      {
        id: 'astral-warrior',
        name: 'Astral Warrior',
        description: 'Fierce warriors with psionic abilities.',
        abilityScoreIncrease: {
          strength: 1
        },
        traits: ['Astral Knowledge', 'Warrior Psionics', 'Precise Strike']
      },
      {
        id: 'astral-monk',
        name: 'Astral Monk',
        description: 'Disciplined monks with psionic abilities.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Mental Discipline', 'Monk Psionics', 'Psychic Blades']
      }
    ]
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    description: 'Tieflings are the infernal bloodline of humans and fiends.',
    traits: ['Hellish Resistance', 'Infernal Legacy'],
    abilityScoreIncrease: {
      intelligence: 1,
      charisma: 2
    },
    speed: 30,
    languages: ['Common', 'Infernal'],
    subraces: [
      {
        id: 'standard-tiefling',
        name: 'Standard Tiefling',
        description: 'The Player\'s Handbook version with standard traits.',
        abilityScoreIncrease: {},
        traits: ['Thaumaturgy']
      }
      // Variants (e.g., Asmodeus, Baalzebul) can be added later with different spells
    ]
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    description: 'Half-elves combine what some say are the best qualities of their elf and human parents.',
    traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    abilityScoreIncrease: {
      charisma: 2
    },
    speed: 30,
    languages: ['Common', 'Elvish', 'One extra language of your choice'],
    subraces: []
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    description: 'Half-orcs most often live among orcs. Of the other races, humans are most likely to accept half-orcs.',
    traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
    abilityScoreIncrease: {
      strength: 2,
      constitution: 1
    },
    speed: 30,
    languages: ['Common', 'Orc'],
    subraces: []
  },
  {
    id: 'forest-giant',
    name: 'Forest Giant',
    description: 'Reclusive forest guardians who prefer to remain hidden among their woodlands.',
    traits: ['Forest Magic', 'Hidden Step', 'Powerful Build', 'Speech of Beast and Leaf'],
    abilityScoreIncrease: {
      wisdom: 2,
      strength: 1
    },
    speed: 30,
    languages: ['Common', 'Elvish', 'Giant'],
    subraces: []
  },
  {
    id: 'stone-giant',
    name: 'Stone Giant',
    description: 'Strong and reclusive, stone giants wander the mountain heights in nomadic tribes.',
    traits: ['Natural Athlete', 'Stone\'s Endurance', 'Powerful Build', 'Mountain Born'],
    abilityScoreIncrease: {
      strength: 2,
      constitution: 1
    },
    speed: 30,
    languages: ['Common', 'Giant'],
    subraces: []
  },
  {
    id: 'ravenfolk',
    name: 'Ravenfolk',
    description: 'Feathered folk who lost their wings long ago now live as cunning mimics.',
    traits: ['Expert Forgery', 'Raven Training', 'Mimicry'],
    abilityScoreIncrease: {
      dexterity: 2,
      wisdom: 1
    },
    speed: 30,
    languages: ['Common', 'Auran'],
    subraces: []
  },
  {
    id: 'lizardfolk',
    name: 'Lizardfolk',
    description: 'The lizardfolk possess an alien and inscrutable mindset, their desires and thoughts driven by a different logic.',
    traits: ['Bite', 'Cunning Artisan', 'Hold Breath', 'Hunter\'s Lore', 'Natural Armor', 'Hungry Jaws'],
    abilityScoreIncrease: {
      constitution: 2,
      wisdom: 1
    },
    speed: 30,
    languages: ['Common', 'Draconic'],
    subraces: []
  },
  {
    id: 'catfolk',
    name: 'Catfolk',
    description: 'Hailing from a strange and distant land, wandering tabaxi are catlike humanoids driven by curiosity.',
    traits: ['Feline Agility', 'Cat\'s Claws', 'Cat\'s Talents', 'Darkvision'],
    abilityScoreIncrease: {
      dexterity: 2,
      charisma: 1
    },
    speed: 30,
    languages: ['Common', 'Choice of One'],
    subraces: []
  },
  {
    id: 'seaborn',
    name: 'Seaborn',
    description: 'Guardians of the depths, seaborn have spread throughout the oceans, establishing protectorates.',
    traits: ['Amphibious', 'Control Air and Water', 'Emissary of the Sea', 'Guardians of the Depths'],
    abilityScoreIncrease: {
      strength: 1,
      constitution: 1,
      charisma: 1
    },
    speed: 30,
    languages: ['Common', 'Primordial'],
    subraces: []
  },
  {
    id: 'serpentfolk',
    name: 'Serpentfolk',
    description: 'The serpentine serpentfolk are utterly without emotion. They deal in absolutes and judge others by their strength and cunning.',
    traits: ['Darkvision', 'Innate Spellcasting', 'Magic Resistance', 'Poison Immunity'],
    abilityScoreIncrease: {
      charisma: 2,
      intelligence: 1
    },
    speed: 30,
    languages: ['Common', 'Abyssal', 'Draconic'],
    subraces: []
  }
  // Races without subraces like Half-Elf, Half-Orc, etc. can be added as needed with subraces: []
];

// Export as 'races' for backward compatibility
export const races = baseRaces;
