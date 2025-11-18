/**
 * Old-School Essentials (OSE) Classic Fantasy Class Definitions
 *
 * This module defines the 7 core classes available in OSE Classic Fantasy:
 * - 4 Human Classes: Cleric, Fighter, Magic-User, Thief
 * - 3 Race-as-Class: Dwarf, Elf, Halfling
 *
 * OSE uses a different system than D&D 5E:
 * - Prime requisites grant XP bonuses (not skill proficiencies)
 * - Saving throws are category-based (Death, Wands, Paralysis, Breath, Spells)
 * - No skill system - abilities are specific class features
 * - Maximum level typically 14
 * - Hit dice vary by class (d4, d6, or d8)
 *
 * @see https://oldschoolessentials.necroticgnome.com/
 */

/**
 * OSE-specific ability score abbreviations for prime requisites
 */
export type OSEAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

/**
 * OSE saving throw categories
 */
export type OSESavingThrowCategory =
  | 'death'
  | 'wands'
  | 'paralysis'
  | 'breath'
  | 'spells';

/**
 * Spellcasting information for OSE classes
 */
export interface OSESpellcasting {
  /** Type of magic: divine (Cleric) or arcane (Magic-User, Elf) */
  type: 'divine' | 'arcane';
  /** Maximum spell level accessible to this class */
  maxLevel: number;
  /** Number of spell slots per level (varies by character level) */
  spellProgression?: Record<number, number[]>;
}

/**
 * OSE Class Definition
 * Represents a character class in Old-School Essentials Classic Fantasy
 */
export interface OSEClass {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name of the class */
  name: string;
  /** Detailed description of the class */
  description: string;
  /** Hit die type (4, 6, or 8) */
  hitDie: number;
  /** Prime requisite ability scores (affects XP bonus) */
  primeRequisite: OSEAbility[];
  /** Maximum level for this class */
  maxLevel: number;
  /** List of special abilities granted by this class */
  abilities: string[];
  /** Armor proficiency description */
  armorProficiency: string;
  /** Weapon restrictions, if any */
  weaponRestrictions?: string;
  /** Spellcasting capability, if applicable */
  spellcasting?: OSESpellcasting;
  /** Whether this is a race-as-class (Dwarf, Elf, Halfling) */
  isRaceClass: boolean;
  /** XP requirements for leveling */
  xpRequirements?: number[];
  /** Base saving throw values at level 1 */
  baseSavingThrows?: Record<OSESavingThrowCategory, number>;
  /** Attack bonus progression */
  attackBonus?: string;
}

/**
 * OSE Classic Fantasy Classes
 * Complete list of all 7 classes available in the core rules
 */
export const OSE_CLASSIC_CLASSES: OSEClass[] = [
  // ============================================================================
  // HUMAN CLASSES
  // ============================================================================

  {
    id: 'cleric',
    name: 'Cleric',
    description:
      'A holy warrior blessed by a deity with divine magic. Clerics can cast divine spells, turn undead, and fight in melee combat. They are forbidden from using edged or pointed weapons, but may use any armor. Clerics are the primary healers in an adventuring party.',
    hitDie: 6,
    primeRequisite: ['WIS'],
    maxLevel: 14,
    abilities: [
      'Divine spellcasting (spell levels 1-5)',
      'Turn undead',
      'Combat capability in armor',
      'No edged/pointed weapons',
      '+5% XP if WIS 13-15, +10% XP if WIS 16+',
    ],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: 'No edged or pointed weapons (club, mace, sling, staff, warhammer only)',
    spellcasting: {
      type: 'divine',
      maxLevel: 5,
      spellProgression: {
        1: [],
        2: [1],
        3: [2],
        4: [2, 1],
        5: [2, 2],
        6: [2, 2, 1, 1],
        7: [2, 2, 2, 1, 1],
        8: [3, 3, 2, 2, 1],
        9: [3, 3, 3, 2, 2],
        10: [4, 4, 3, 3, 2],
        11: [4, 4, 4, 3, 3],
        12: [5, 5, 4, 4, 3],
        13: [5, 5, 5, 4, 4],
        14: [6, 5, 5, 5, 4],
      },
    },
    isRaceClass: false,
    xpRequirements: [0, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 200000, 300000, 400000, 500000, 600000, 700000],
    baseSavingThrows: {
      death: 11,
      wands: 12,
      paralysis: 14,
      breath: 16,
      spells: 15,
    },
    attackBonus: '+0 at level 1-4, +2 at level 5-8, +5 at level 9-12, +7 at level 13-14',
  },

  {
    id: 'fighter',
    name: 'Fighter',
    description:
      'A warrior trained in battle and the use of arms. Fighters have the best combat abilities and can use all weapons and armor. They are the toughest class with the best hit dice, making them essential front-line combatants.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 14,
    abilities: [
      'Use all weapons and armor',
      'Best combat progression',
      'Stronghold at 9th level',
      '+5% XP if STR 13-15, +10% XP if STR 16+',
    ],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: undefined,
    isRaceClass: false,
    xpRequirements: [0, 2000, 4000, 8000, 16000, 32000, 64000, 120000, 240000, 360000, 480000, 600000, 720000, 840000],
    baseSavingThrows: {
      death: 12,
      wands: 13,
      paralysis: 14,
      breath: 15,
      spells: 16,
    },
    attackBonus: '+0 at level 1-3, +2 at level 4-6, +5 at level 7-9, +7 at level 10-12, +9 at level 13-14',
  },

  {
    id: 'magic-user',
    name: 'Magic-User',
    description:
      'A studier of arcane magic and occult lore. Magic-Users can cast powerful arcane spells but are physically weak, with the poorest hit dice and combat abilities. They are restricted in armor and weapons but wield devastating magical power.',
    hitDie: 4,
    primeRequisite: ['INT'],
    maxLevel: 14,
    abilities: [
      'Arcane spellcasting (spell levels 1-6)',
      'Magical research',
      'Create magic items',
      'Tower at 11th level',
      '+5% XP if INT 13-15, +10% XP if INT 16+',
    ],
    armorProficiency: 'None',
    weaponRestrictions: 'Dagger only',
    spellcasting: {
      type: 'arcane',
      maxLevel: 6,
      spellProgression: {
        1: [1],
        2: [2],
        3: [2, 1],
        4: [2, 2],
        5: [2, 2, 1],
        6: [2, 2, 2],
        7: [3, 2, 2, 1],
        8: [3, 3, 2, 2],
        9: [3, 3, 3, 2, 1],
        10: [4, 3, 3, 3, 2],
        11: [4, 4, 3, 3, 3],
        12: [4, 4, 4, 3, 3, 1],
        13: [5, 4, 4, 4, 3, 2],
        14: [5, 5, 4, 4, 4, 3],
      },
    },
    isRaceClass: false,
    xpRequirements: [0, 2500, 5000, 10000, 20000, 40000, 80000, 150000, 300000, 450000, 600000, 750000, 900000, 1050000],
    baseSavingThrows: {
      death: 13,
      wands: 14,
      paralysis: 13,
      breath: 16,
      spells: 15,
    },
    attackBonus: '+0 at level 1-5, +2 at level 6-10, +5 at level 11-14',
  },

  {
    id: 'thief',
    name: 'Thief',
    description:
      'A skilled rogue and treasure hunter. Thieves have unique skills for stealth, climbing, finding and removing traps, picking locks, and backstabbing opponents. They are lightly armored but excel at reconnaissance and surprise attacks.',
    hitDie: 4,
    primeRequisite: ['DEX'],
    maxLevel: 14,
    abilities: [
      'Backstab (double damage, +4 to hit)',
      'Climb sheer surfaces (87% at 1st level)',
      'Find traps (10% at 1st level, +5% per level)',
      'Hide in shadows (10% at 1st level, +5% per level)',
      'Move silently (20% at 1st level, +5% per level)',
      'Open locks (15% at 1st level, +5% per level)',
      'Pick pockets (20% at 1st level, +5% per level)',
      'Remove traps (10% at 1st level, +5% per level)',
      'Read languages (80% at 4th level)',
      'Use scrolls (at 10th level)',
      '+5% XP if DEX 13-15, +10% XP if DEX 16+',
    ],
    armorProficiency: 'Leather armor only, no shields',
    weaponRestrictions: undefined,
    isRaceClass: false,
    xpRequirements: [0, 1200, 2400, 4800, 9600, 20000, 40000, 80000, 160000, 280000, 400000, 520000, 640000, 760000],
    baseSavingThrows: {
      death: 13,
      wands: 14,
      paralysis: 13,
      breath: 16,
      spells: 15,
    },
    attackBonus: '+0 at level 1-4, +2 at level 5-8, +5 at level 9-12, +7 at level 13-14',
  },

  // ============================================================================
  // RACE-AS-CLASS (DEMI-HUMANS)
  // ============================================================================

  {
    id: 'dwarf',
    name: 'Dwarf',
    description:
      'A stout, bearded demi-human who dwells underground. Dwarves are sturdy warriors with exceptional combat abilities and special talents for detecting construction tricks. They are resistant to magic and have infravision.',
    hitDie: 8,
    primeRequisite: ['STR'],
    maxLevel: 12,
    abilities: [
      'Detect construction tricks (1-2 on d6)',
      'Detect room traps (1-2 on d6)',
      'Infravision 60 feet',
      'Resist magic (+4 to saves vs magic)',
      'Listen at doors (1-2 on d6)',
      'Speak Common, Dwarvish, Gnomish, Goblin, Kobold',
      '+5% XP if STR 13-15, +10% XP if STR 16+',
    ],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: 'Cannot use long bows or two-handed swords',
    isRaceClass: true,
    xpRequirements: [0, 2200, 4400, 8800, 17000, 35000, 70000, 140000, 270000, 400000, 530000, 660000],
    baseSavingThrows: {
      death: 8,
      wands: 9,
      paralysis: 10,
      breath: 13,
      spells: 12,
    },
    attackBonus: '+0 at level 1-3, +2 at level 4-6, +5 at level 7-9, +7 at level 10-12',
  },

  {
    id: 'elf',
    name: 'Elf',
    description:
      'A slender, fey demi-human attuned to nature and magic. Elves are unique in combining the martial prowess of fighters with arcane spellcasting. They have keen senses, infravision, and immunity to ghoul paralysis.',
    hitDie: 6,
    primeRequisite: ['STR', 'INT'],
    maxLevel: 10,
    abilities: [
      'Arcane spellcasting (spell levels 1-5)',
      'Combat abilities (as Fighter)',
      'Detect secret doors (1-2 on d6)',
      'Infravision 60 feet',
      'Immunity to ghoul paralysis',
      'Listen at doors (1-2 on d6)',
      'Speak Common, Elvish, Gnoll, Hobgoblin, Orcish',
      '+5% XP if STR and INT both 13-15, +10% XP if STR and INT both 16+',
    ],
    armorProficiency: 'All armor and shields',
    weaponRestrictions: undefined,
    spellcasting: {
      type: 'arcane',
      maxLevel: 5,
      spellProgression: {
        1: [1],
        2: [2],
        3: [2, 1],
        4: [2, 2],
        5: [2, 2, 1],
        6: [2, 2, 2],
        7: [3, 2, 2, 1],
        8: [3, 3, 2, 2],
        9: [3, 3, 3, 2, 1],
        10: [3, 3, 3, 3, 2],
      },
    },
    isRaceClass: true,
    xpRequirements: [0, 4000, 8000, 16000, 32000, 64000, 120000, 250000, 400000, 600000],
    baseSavingThrows: {
      death: 12,
      wands: 13,
      paralysis: 13,
      breath: 15,
      spells: 15,
    },
    attackBonus: '+0 at level 1-3, +2 at level 4-6, +5 at level 7-9, +7 at level 10',
  },

  {
    id: 'halfling',
    name: 'Halfling',
    description:
      'A small, peaceful demi-human who loves comfort and good food. Despite their size, halflings are brave adventurers with excellent accuracy in ranged combat and a natural ability to hide. They are resistant to magic.',
    hitDie: 6,
    primeRequisite: ['STR', 'DEX'],
    maxLevel: 8,
    abilities: [
      'Bonus to missile attacks (+1)',
      'Defensive bonus (+2 AC vs large opponents)',
      'Hide in woods/undergrowth (90% chance)',
      'Hide in shadows/behind cover (2-in-6 chance)',
      'Initiative bonus (+1)',
      'Listen at doors (1-2 on d6)',
      'Resist magic (+4 to saves vs magic)',
      'Speak Common, Halfling',
      '+5% XP if STR and DEX both 13-15, +10% XP if STR and DEX both 16+',
    ],
    armorProficiency: 'All armor and shields (armor must be tailored for small size)',
    weaponRestrictions: 'Cannot use long bows or two-handed swords',
    isRaceClass: true,
    xpRequirements: [0, 2000, 4000, 8000, 16000, 32000, 64000, 120000],
    baseSavingThrows: {
      death: 8,
      wands: 9,
      paralysis: 10,
      breath: 13,
      spells: 12,
    },
    attackBonus: '+0 at level 1-3, +2 at level 4-6, +5 at level 7-8',
  },
];

/**
 * Helper function to get a class by ID
 */
export function getOSEClassById(id: string): OSEClass | undefined {
  return OSE_CLASSIC_CLASSES.find((cls) => cls.id === id);
}

/**
 * Helper function to get all human classes
 */
export function getHumanClasses(): OSEClass[] {
  return OSE_CLASSIC_CLASSES.filter((cls) => !cls.isRaceClass);
}

/**
 * Helper function to get all race-as-class options
 */
export function getRaceClasses(): OSEClass[] {
  return OSE_CLASSIC_CLASSES.filter((cls) => cls.isRaceClass);
}

/**
 * Helper function to get classes by prime requisite
 */
export function getClassesByPrimeRequisite(ability: OSEAbility): OSEClass[] {
  return OSE_CLASSIC_CLASSES.filter((cls) => cls.primeRequisite.includes(ability));
}

/**
 * Helper function to get spellcasting classes
 */
export function getSpellcastingClasses(): OSEClass[] {
  return OSE_CLASSIC_CLASSES.filter((cls) => cls.spellcasting !== undefined);
}

/**
 * Helper function to calculate XP bonus based on prime requisite score
 * @param score - The ability score (3-18)
 * @returns XP bonus percentage (0, 5, or 10)
 */
export function calculateXPBonus(score: number): number {
  if (score >= 16) return 10;
  if (score >= 13) return 5;
  return 0;
}

/**
 * Helper function to get saving throw at a given level
 * Saving throws improve every 4 levels for most classes
 * @param baseClass - The OSE class
 * @param level - Character level (1-14)
 * @param category - Saving throw category
 * @returns The saving throw target number
 */
export function getSavingThrow(
  baseClass: OSEClass,
  level: number,
  category: OSESavingThrowCategory
): number {
  if (!baseClass.baseSavingThrows) return 15; // Default if not specified

  const baseSave = baseClass.baseSavingThrows[category];
  const improvement = Math.floor((level - 1) / 4);

  // Saving throws get better (lower number) as you level
  return Math.max(2, baseSave - improvement);
}

/**
 * Helper function to get attack bonus at a given level
 * @param baseClass - The OSE class
 * @param level - Character level (1-14)
 * @returns Attack bonus as a number
 */
export function getAttackBonus(baseClass: OSEClass, level: number): number {
  // Attack bonus progression varies by class
  // Fighters and dwarves: +2 every 3 levels
  // Clerics and thieves: +2 every 4 levels
  // Magic-users: +2 every 5 levels
  // Elves: +2 every 3 levels (fighter progression)
  // Halflings: +2 every 3 levels

  if (baseClass.id === 'fighter' || baseClass.id === 'dwarf' || baseClass.id === 'elf' || baseClass.id === 'halfling') {
    return Math.floor((level - 1) / 3) * 2;
  } else if (baseClass.id === 'cleric' || baseClass.id === 'thief') {
    return Math.floor((level - 1) / 4) * 2;
  } else if (baseClass.id === 'magic-user') {
    return Math.floor((level - 1) / 5) * 2;
  }

  return 0;
}

/**
 * Helper function to get spell slots at a given level
 * @param baseClass - The OSE class
 * @param level - Character level
 * @returns Array of spell slots per spell level, or empty array if no spellcasting
 */
export function getSpellSlots(baseClass: OSEClass, level: number): number[] {
  if (!baseClass.spellcasting?.spellProgression) return [];

  return baseClass.spellcasting.spellProgression[level] || [];
}

/**
 * Type guard to check if a class can cast spells
 */
export function isSpellcaster(baseClass: OSEClass): baseClass is OSEClass & { spellcasting: OSESpellcasting } {
  return baseClass.spellcasting !== undefined;
}

/**
 * Type guard to check if a class is a race-as-class
 */
export function isRaceClass(baseClass: OSEClass): boolean {
  return baseClass.isRaceClass;
}
