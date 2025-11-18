/**
 * Game Systems Type Definitions
 *
 * Comprehensive type definitions for multi-game-system architecture supporting
 * various tabletop RPG systems including D&D 5E, OSR games, and modern indie RPGs.
 */

/**
 * Enum representing all supported game systems.
 *
 * @enum {string}
 */
export enum GameSystem {
  /** Dungeons & Dragons 5th Edition */
  DND5E = 'dnd5e',
  /** Old-School Essentials Classic */
  OSE_CLASSIC = 'ose_classic',
  /** Old-School Essentials Advanced */
  OSE_ADVANCED = 'ose_advanced',
  /** Cairn RPG */
  CAIRN = 'cairn',
  /** Knave RPG */
  KNAVE = 'knave',
  /** Pathfinder 2nd Edition */
  PATHFINDER_2E = 'pathfinder2e',
  /** 13th Age */
  THIRTEENTH_AGE = '13th_age',
  /** Fate Core */
  FATE_CORE = 'fate_core',
  /** Mörk Borg */
  MORK_BORG = 'mork_borg',
}

/**
 * Represents a single ability score (attribute) in a game system.
 *
 * @interface AbilityScore
 * @property {string} id - Unique identifier (e.g., 'str', 'dex', 'wil')
 * @property {string} name - Full name of the ability (e.g., 'Strength', 'Willpower')
 * @property {string} abbreviation - Short form abbreviation (e.g., 'STR', 'WIL')
 * @property {string} description - Detailed description of what the ability represents
 */
export interface AbilityScore {
  /** Unique identifier for the ability score */
  id: string;
  /** Full name of the ability score */
  name: string;
  /** Standard abbreviation (typically 3 letters) */
  abbreviation: string;
  /** Description of what this ability score represents in gameplay */
  description: string;
}

/**
 * Configuration for ability scores in a specific game system.
 *
 * @interface AbilityScoreConfig
 * @property {AbilityScore[]} scores - Array of ability scores used in this system
 * @property {Object} scoreRange - Valid range for ability score values
 * @property {number} scoreRange.min - Minimum possible score value
 * @property {number} scoreRange.max - Maximum possible score value
 * @property {number} averageScore - Average/typical score for a normal character
 * @property {string} modifierFormula - Formula type used to calculate modifiers from scores
 */
export interface AbilityScoreConfig {
  /** The ability scores used in this game system */
  scores: AbilityScore[];
  /** Valid range for ability score values */
  scoreRange: {
    /** Minimum ability score value */
    min: number;
    /** Maximum ability score value */
    max: number;
  };
  /** Average ability score for a typical character */
  averageScore: number;
  /** Formula type for calculating ability modifiers */
  modifierFormula: 'standard' | 'ose' | 'cairn' | 'custom';
}

/**
 * Complete configuration for a game system.
 *
 * @interface GameSystemConfig
 * @property {GameSystem} id - Unique identifier for the game system
 * @property {string} name - Full display name of the game system
 * @property {string} shortName - Abbreviated name for UI elements
 * @property {string} description - Brief description of the game system
 * @property {string} icon - Icon identifier or emoji for the system
 * @property {string} license - Type of open license the system uses
 * @property {string} licenseUrl - URL to the full license text
 * @property {number} complexity - Complexity rating from 1 (simple) to 5 (complex)
 * @property {string[]} tags - Descriptive tags for categorization
 * @property {string[]} compatibleGenres - Genres this system works well with
 * @property {boolean} hasClasses - Whether the system uses character classes
 * @property {boolean} hasRaces - Whether the system uses character races/ancestries
 * @property {boolean} hasBackgrounds - Whether the system uses character backgrounds
 * @property {boolean} hasSpells - Whether the system includes magic spells
 * @property {boolean} hasFeats - Whether the system uses feats/abilities
 * @property {AbilityScoreConfig} abilityScores - Ability score configuration
 * @property {Object} levelRange - Valid character level range
 * @property {number} levelRange.min - Minimum character level
 * @property {number} levelRange.max - Maximum character level
 * @property {string} color - Theme color for UI elements (hex code)
 * @property {string} [backgroundImage] - Optional background image path
 */
export interface GameSystemConfig {
  /** Unique identifier for the game system */
  id: GameSystem;
  /** Full display name */
  name: string;
  /** Short name for compact displays */
  shortName: string;
  /** Brief description of the game system */
  description: string;
  /** Icon identifier or emoji */
  icon: string;
  /** License type */
  license: 'OGL' | 'CC-BY' | 'CC-BY-SA' | 'ORC' | 'Custom';
  /** URL to full license text */
  licenseUrl: string;
  /** Complexity rating (1 = simple, 5 = complex) */
  complexity: 1 | 2 | 3 | 4 | 5;
  /** Descriptive tags */
  tags: string[];
  /** Compatible game genres */
  compatibleGenres: string[];
  /** System uses character classes */
  hasClasses: boolean;
  /** System uses character races/ancestries */
  hasRaces: boolean;
  /** System uses character backgrounds */
  hasBackgrounds: boolean;
  /** System includes magic spells */
  hasSpells: boolean;
  /** System uses feats/special abilities */
  hasFeats: boolean;
  /** Ability score configuration */
  abilityScores: AbilityScoreConfig;
  /** Valid character level range */
  levelRange: {
    /** Minimum character level */
    min: number;
    /** Maximum character level */
    max: number;
  };
  /** Theme color (hex code) */
  color: string;
  /** Optional background image path */
  backgroundImage?: string;
}

/**
 * Standard D&D/d20 ability scores used in D&D 5E, OSE, Knave, and similar systems.
 *
 * @constant
 * @type {AbilityScore[]}
 */
export const DND_ABILITY_SCORES: AbilityScore[] = [
  {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    description: 'Physical power, athletic training, and ability to exert physical force',
  },
  {
    id: 'dex',
    name: 'Dexterity',
    abbreviation: 'DEX',
    description: 'Agility, reflexes, balance, and fine motor skills',
  },
  {
    id: 'con',
    name: 'Constitution',
    abbreviation: 'CON',
    description: 'Health, stamina, endurance, and vital force',
  },
  {
    id: 'int',
    name: 'Intelligence',
    abbreviation: 'INT',
    description: 'Reasoning, memory, logic, and analytical thinking',
  },
  {
    id: 'wis',
    name: 'Wisdom',
    abbreviation: 'WIS',
    description: 'Awareness, intuition, insight, and perceptiveness',
  },
  {
    id: 'cha',
    name: 'Charisma',
    abbreviation: 'CHA',
    description: 'Force of personality, persuasiveness, and leadership ability',
  },
];

/**
 * Old-School Essentials ability scores (identical to D&D).
 * OSE uses the same six ability scores as classic D&D and D&D 5E.
 *
 * @constant
 * @type {AbilityScore[]}
 */
export const OSE_ABILITY_SCORES: AbilityScore[] = [
  {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    description: 'Muscle power, physical might, and melee combat ability',
  },
  {
    id: 'dex',
    name: 'Dexterity',
    abbreviation: 'DEX',
    description: 'Agility, reflexes, speed, and ranged combat ability',
  },
  {
    id: 'con',
    name: 'Constitution',
    abbreviation: 'CON',
    description: 'Health, toughness, and resistance to harm',
  },
  {
    id: 'int',
    name: 'Intelligence',
    abbreviation: 'INT',
    description: 'Learning, reasoning, and knowledge',
  },
  {
    id: 'wis',
    name: 'Wisdom',
    abbreviation: 'WIS',
    description: 'Willpower, perception, and common sense',
  },
  {
    id: 'cha',
    name: 'Charisma',
    abbreviation: 'CHA',
    description: 'Personality, magnetism, and leadership',
  },
];

/**
 * Cairn ability scores - simplified three-ability system.
 * Cairn uses only STR, DEX, and WIL (Willpower) instead of the traditional six.
 *
 * @constant
 * @type {AbilityScore[]}
 */
export const CAIRN_ABILITY_SCORES: AbilityScore[] = [
  {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    description: 'Physical power, toughness, and ability to withstand physical harm',
  },
  {
    id: 'dex',
    name: 'Dexterity',
    abbreviation: 'DEX',
    description: 'Speed, agility, reflexes, and ability to avoid danger',
  },
  {
    id: 'wil',
    name: 'Willpower',
    abbreviation: 'WIL',
    description: 'Mental fortitude, awareness, and ability to resist mental effects',
  },
];

/**
 * Knave ability scores - uses standard d20 abilities.
 * Knave uses the traditional six ability scores with unique modifier mechanics.
 *
 * @constant
 * @type {AbilityScore[]}
 */
export const KNAVE_ABILITY_SCORES: AbilityScore[] = [
  {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    description: 'Brawn, muscle, and physical power',
  },
  {
    id: 'dex',
    name: 'Dexterity',
    abbreviation: 'DEX',
    description: 'Agility, grace, and nimbleness',
  },
  {
    id: 'con',
    name: 'Constitution',
    abbreviation: 'CON',
    description: 'Endurance, stamina, and good health',
  },
  {
    id: 'int',
    name: 'Intelligence',
    abbreviation: 'INT',
    description: 'Scholarship, memory, and reasoning',
  },
  {
    id: 'wis',
    name: 'Wisdom',
    abbreviation: 'WIS',
    description: 'Attentiveness, intuition, and insight',
  },
  {
    id: 'cha',
    name: 'Charisma',
    abbreviation: 'CHA',
    description: 'Confidence, eloquence, and leadership',
  },
];
