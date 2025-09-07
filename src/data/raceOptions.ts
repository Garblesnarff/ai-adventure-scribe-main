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
        description: 'A subrace from the Underdark with innate magical abilities, including invisibility.',
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
        description: 'Native to the Underdark, with superior darkvision and innate magic, but sunlight sensitivity.',
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
        description: 'Elves of the Shadowfell, who are supernaturally resilient and can teleport.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Blessing of the Raven Queen', 'Necrotic Resistance']
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
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1
    },
    speed: 30,
    languages: ['Common', 'Choice of One'],
    subraces: []
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
        description: 'Dwellers of the Underdark, with superior darkvision and natural stealth.',
        abilityScoreIncrease: {
          dexterity: 2
        },
        traits: ['Stone Camouflage', 'Gnome Cunning']
      }
    ]
  },
  {
    id: 'genasi',
    name: 'Genasi',
    description: 'Humanoids infused with elemental power.',
    traits: ['Elemental Traits'],
    abilityScoreIncrease: {},
    speed: 30,
    languages: ['Common', 'Primordial'],
    subraces: [
      {
        id: 'air-genasi',
        name: 'Air Genasi',
        description: 'Can hold their breath indefinitely and have innate levitation magic.',
        abilityScoreIncrease: {
          constitution: 1,
          dexterity: 1
        },
        traits: ['Unending Breath', 'Mingle with the Wind']
      },
      {
        id: 'earth-genasi',
        name: 'Earth Genasi',
        description: 'Possess extra strength and can traverse difficult terrain with ease.',
        abilityScoreIncrease: {
          constitution: 1,
          strength: 1
        },
        traits: ['Earth Walk', 'Merge with Stone']
      },
      {
        id: 'fire-genasi',
        name: 'Fire Genasi',
        description: 'Have a resistance to fire and can produce flames.',
        abilityScoreIncrease: {
          constitution: 1,
          intelligence: 1
        },
        traits: ['Darkvision', 'Fire Resistance', 'Reach to the Blaze']
      },
      {
        id: 'water-genasi',
        name: 'Water Genasi',
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
    id: 'aasimar',
    name: 'Aasimar',
    description: 'Humanoids with a celestial touch.',
    traits: ['Celestial Revelation', 'Healing Hands', 'Light Cantrip'],
    abilityScoreIncrease: {
      charisma: 2
    },
    speed: 30,
    languages: ['Common', 'Celestial'],
    subraces: [
      {
        id: 'protector-aasimar',
        name: 'Protector Aasimar',
        description: 'Can manifest radiant, angelic wings for a short time.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Radiant Soul']
      },
      {
        id: 'scourge-aasimar',
        name: 'Scourge Aasimar',
        description: 'Can unleash a damaging aura of radiant light.',
        abilityScoreIncrease: {
          constitution: 1
        },
        traits: ['Radiant Consumption']
      },
      {
        id: 'fallen-aasimar',
        name: 'Fallen Aasimar',
        description: 'Can cause enemies to become frightened.',
        abilityScoreIncrease: {
          strength: 1
        },
        traits: ['Necrotic Shroud']
      }
    ]
  },
  {
    id: 'gith',
    name: 'Gith',
    description: 'Psionic humanoids from the Astral Plane.',
    traits: ['Psionic Resistance', 'Mental Discipline'],
    abilityScoreIncrease: {
      intelligence: 2
    },
    speed: 30,
    languages: ['Common', 'Gith'],
    subraces: [
      {
        id: 'githyanki',
        name: 'Githyanki',
        description: 'Fierce warriors with psionic abilities.',
        abilityScoreIncrease: {
          strength: 1
        },
        traits: ['Astral Knowledge', 'Githyanki Psionics', 'Decapitating Swipe']
      },
      {
        id: 'githzerai',
        name: 'Githzerai',
        description: 'Disciplined monks with psionic abilities.',
        abilityScoreIncrease: {
          wisdom: 1
        },
        traits: ['Mental Discipline', 'Githzerai Psionics', 'Psychic Blades']
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
  }
  // Races without subraces like Half-Elf, Half-Orc, etc. can be added as needed with subraces: []
];
