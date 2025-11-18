/**
 * OSE Class Data for MCP Resources
 * Based on the OSE Classic and Advanced Fantasy classes
 */

export interface OSEClass {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primeRequisite: string[];
  maxLevel: number;
  abilities: string[];
  armorProficiency: string;
  weaponRestrictions?: string;
  spellcasting?: {
    type: 'divine' | 'arcane';
    maxLevel: number;
  };
  isRaceClass: boolean;
  category: 'classic' | 'advanced';
}

export const OSE_CLASSIC_CLASSES: OSEClass[] = [
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'A holy warrior blessed by a deity with divine magic. Clerics can cast divine spells, turn undead, and fight in melee combat.',
    hitDie: 6,
    primeRequisite: ['WIS'],
    maxLevel: 14,
    abilities: ['Divine spellcasting (1-5)', 'Turn undead', 'Combat capable', 'No edged weapons'],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: 'No edged or pointed weapons',
    spellcasting: { type: 'divine', maxLevel: 5 },
    isRaceClass: false,
    category: 'classic'
  },
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A warrior trained in battle and the use of arms. Fighters have the best combat abilities and can use all weapons and armor.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 14,
    abilities: ['All weapons and armor', 'Best combat progression', 'Stronghold at 9th level'],
    armorProficiency: 'All armor and shields',
    isRaceClass: false,
    category: 'classic'
  },
  {
    id: 'magic-user',
    name: 'Magic-User',
    description: 'A studier of arcane magic and occult lore. Magic-Users can cast powerful arcane spells but are physically weak.',
    hitDie: 4,
    primeRequisite: ['INT'],
    maxLevel: 14,
    abilities: ['Arcane spellcasting (1-6)', 'Magical research', 'Create magic items', 'Tower at 11th level'],
    armorProficiency: 'None',
    weaponRestrictions: 'Dagger only',
    spellcasting: { type: 'arcane', maxLevel: 6 },
    isRaceClass: false,
    category: 'classic'
  },
  {
    id: 'thief',
    name: 'Thief',
    description: 'A skilled rogue and treasure hunter with unique abilities for stealth, climbing, and backstabbing.',
    hitDie: 4,
    primeRequisite: ['DEX'],
    maxLevel: 14,
    abilities: ['Backstab', 'Climb sheer surfaces', 'Find/remove traps', 'Hide in shadows', 'Move silently', 'Open locks', 'Pick pockets'],
    armorProficiency: 'Leather armor only, no shields',
    isRaceClass: false,
    category: 'classic'
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'A stout, bearded demi-human who dwells underground. Sturdy warriors with exceptional abilities.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 12,
    abilities: ['Detect construction tricks', 'Infravision 60ft', 'Resist magic (+4 saves)', 'Listen at doors'],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: 'No long bows or two-handed swords',
    isRaceClass: true,
    category: 'classic'
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'A slender, fey demi-human combining martial prowess with arcane spellcasting.',
    hitDie: 6,
    primeRequisite: ['STR', 'INT'],
    maxLevel: 10,
    abilities: ['Arcane spellcasting (1-5)', 'Fighter combat', 'Detect secret doors', 'Infravision 60ft', 'Immunity to ghoul paralysis'],
    armorProficiency: 'All armor and shields',
    spellcasting: { type: 'arcane', maxLevel: 5 },
    isRaceClass: true,
    category: 'classic'
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'A small, peaceful demi-human with excellent accuracy in ranged combat and natural hiding abilities.',
    hitDie: 6,
    primeRequisite: ['STR', 'DEX'],
    maxLevel: 8,
    abilities: ['Missile attack bonus (+1)', 'Defensive bonus vs large foes (+2 AC)', 'Hide outdoors (90%)', 'Initiative bonus (+1)', 'Resist magic (+4 saves)'],
    armorProficiency: 'All armor and shields (small-sized)',
    weaponRestrictions: 'No long bows or two-handed swords',
    isRaceClass: true,
    category: 'classic'
  }
];

export const OSE_ADVANCED_CLASSES: OSEClass[] = [
  {
    id: 'acrobat',
    name: 'Acrobat',
    description: 'A nimble performer and tumbler with exceptional agility and defensive abilities.',
    hitDie: 4,
    primeRequisite: ['DEX'],
    maxLevel: 14,
    abilities: ['Defensive fighting', 'Evasion', 'Climb walls', 'Fall reduction', 'Acrobatic feats'],
    armorProficiency: 'Leather armor only',
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'A fierce warrior from uncivilized lands with exceptional physical prowess.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 14,
    abilities: ['Rage', 'Outdoor survival', 'Danger sense', 'Illiterate', 'Resist magic'],
    armorProficiency: 'Light and medium armor',
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'bard',
    name: 'Bard',
    description: 'A musician and storyteller with limited spellcasting and versatile abilities.',
    hitDie: 6,
    primeRequisite: ['DEX', 'CHA'],
    maxLevel: 14,
    abilities: ['Arcane spellcasting (1-6)', 'Musical charm', 'Lore knowledge', 'Jack of all trades'],
    armorProficiency: 'Light armor and shields',
    spellcasting: { type: 'arcane', maxLevel: 6 },
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'druid',
    name: 'Druid',
    description: 'A priest of nature with divine magic and the ability to shapeshift.',
    hitDie: 6,
    primeRequisite: ['WIS'],
    maxLevel: 14,
    abilities: ['Divine spellcasting (1-7)', 'Shapeshift', 'Nature knowledge', 'Woodland stride', 'Speak with animals'],
    armorProficiency: 'Light armor and shields (natural materials only)',
    weaponRestrictions: 'Natural weapons only',
    spellcasting: { type: 'divine', maxLevel: 7 },
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'knight',
    name: 'Knight',
    description: 'A mounted warrior of noble bearing with exceptional combat skills.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 14,
    abilities: ['Mounted combat', 'Lance charge', 'Code of honor', 'Leadership', 'Estate at 9th level'],
    armorProficiency: 'All armor and shields',
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'illusionist',
    name: 'Illusionist',
    description: 'A specialist in illusion magic, creating phantasms and deceiving the senses.',
    hitDie: 4,
    primeRequisite: ['INT'],
    maxLevel: 14,
    abilities: ['Illusion spellcasting (1-7)', 'Detect illusions', 'Magical research'],
    armorProficiency: 'None',
    weaponRestrictions: 'Dagger only',
    spellcasting: { type: 'arcane', maxLevel: 7 },
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'A holy warrior dedicated to righteousness with divine powers and healing abilities.',
    hitDie: 8,
    primeRequisite: ['STR', 'WIS'],
    maxLevel: 14,
    abilities: ['Divine spellcasting (1-4)', 'Lay on hands', 'Detect evil', 'Turn undead', 'Divine mount', 'Code of conduct'],
    armorProficiency: 'All armor and shields',
    spellcasting: { type: 'divine', maxLevel: 4 },
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'A wilderness warrior skilled in tracking, survival, and fighting evil creatures.',
    hitDie: 8,
    primeRequisite: ['STR', 'WIS'],
    maxLevel: 14,
    abilities: ['Track', 'Wilderness survival', 'Favored enemy', 'Two-weapon fighting', 'Limited divine spellcasting'],
    armorProficiency: 'All armor and shields',
    spellcasting: { type: 'divine', maxLevel: 3 },
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'A professional killer with deadly skills in poison, disguise, and silent death.',
    hitDie: 6,
    primeRequisite: ['DEX'],
    maxLevel: 14,
    abilities: ['Assassination', 'Poison use', 'Disguise', 'Thief skills', 'Climb walls'],
    armorProficiency: 'Leather armor only',
    isRaceClass: false,
    category: 'advanced'
  },
  {
    id: 'drow',
    name: 'Drow',
    description: 'A dark elf from the underworld with innate magical abilities and light sensitivity.',
    hitDie: 6,
    primeRequisite: ['STR', 'INT'],
    maxLevel: 10,
    abilities: ['Arcane spellcasting (1-5)', 'Innate magic', 'Superior darkvision 120ft', 'Light sensitivity', 'Magic resistance'],
    armorProficiency: 'All armor and shields',
    spellcasting: { type: 'arcane', maxLevel: 5 },
    isRaceClass: true,
    category: 'advanced'
  },
  {
    id: 'duergar',
    name: 'Duergar',
    description: 'A gray dwarf from the depths with psionic abilities and resilience.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 12,
    abilities: ['Detect construction', 'Darkvision 120ft', 'Enlarge/invisibility (psionics)', 'Magic resistance', 'Light sensitivity'],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: 'No long bows or two-handed swords',
    isRaceClass: true,
    category: 'advanced'
  },
  {
    id: 'gnome',
    name: 'Gnome',
    description: 'A small, clever fey creature with illusion magic and inventive tendencies.',
    hitDie: 6,
    primeRequisite: ['INT'],
    maxLevel: 8,
    abilities: ['Illusion spellcasting (1-4)', 'Speak with burrowing animals', 'Detect illusions', 'Infravision 60ft'],
    armorProficiency: 'All armor and shields (small-sized)',
    weaponRestrictions: 'Small weapons only',
    spellcasting: { type: 'arcane', maxLevel: 4 },
    isRaceClass: true,
    category: 'advanced'
  },
  {
    id: 'svirfneblin',
    name: 'Svirfneblin',
    description: 'A deep gnome from the underworld with exceptional stealth and stone magic.',
    hitDie: 6,
    primeRequisite: ['STR'],
    maxLevel: 8,
    abilities: ['Hide in stone (90%)', 'Darkvision 120ft', 'Magic resistance', 'Detect stonework', 'Earth magic'],
    armorProficiency: 'All armor and shields (small-sized)',
    weaponRestrictions: 'Small weapons only',
    isRaceClass: true,
    category: 'advanced'
  }
];

export const ALL_OSE_CLASSES = [...OSE_CLASSIC_CLASSES, ...OSE_ADVANCED_CLASSES];

export function getClassById(id: string): OSEClass | undefined {
  return ALL_OSE_CLASSES.find(cls => cls.id === id);
}

export function getClassesByCategory(category: 'classic' | 'advanced'): OSEClass[] {
  return ALL_OSE_CLASSES.filter(cls => cls.category === category);
}
