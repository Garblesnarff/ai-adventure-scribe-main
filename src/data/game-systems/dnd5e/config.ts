/**
 * D&D 5E Game System Configuration
 *
 * Configuration for Dungeons & Dragons 5th Edition, defining all system-specific
 * settings, ability scores, level ranges, and metadata.
 *
 * @module data/game-systems/dnd5e
 */

import {
  GameSystem,
  type GameSystemConfig,
  DND_ABILITY_SCORES,
} from '@/types/game-systems';

/**
 * Complete configuration for D&D 5th Edition.
 *
 * This configuration defines all the core parameters and metadata for D&D 5E,
 * including ability scores, level range, character creation options, and UI theming.
 *
 * Key Features:
 * - Full support for classes, races, backgrounds, spells, and feats
 * - Standard 6 ability scores (STR, DEX, CON, INT, WIS, CHA)
 * - Character levels 1-20
 * - Complexity rating of 3 (moderate tactical depth)
 * - OGL license with official SRD reference
 *
 * @constant
 * @type {GameSystemConfig}
 */
export const DND5E_CONFIG: GameSystemConfig = {
  /** Unique system identifier */
  id: GameSystem.DND5E,

  /** Full display name */
  name: 'Dungeons & Dragons 5th Edition',

  /** Short name for compact UI elements */
  shortName: 'D&D 5E',

  /** System description */
  description:
    "The world's most popular tabletop RPG. Fifth edition offers streamlined rules with deep tactical combat and character customization.",

  /** System icon/emoji */
  icon: '⚔️',

  /** License type - Open Game License */
  license: 'OGL',

  /** URL to the official Systems Reference Document */
  licenseUrl: 'https://dnd.wizards.com/resources/systems-reference-document',

  /** Complexity rating (1=simple, 5=complex) - D&D 5E is moderately complex */
  complexity: 3,

  /** Descriptive tags for categorization and filtering */
  tags: ['Fantasy', 'Tactical', 'High Magic', 'Modern D&D'],

  /** Genres that work well with D&D 5E */
  compatibleGenres: [
    'Traditional Fantasy',
    'High Fantasy',
    'Dark Fantasy',
    'Urban Fantasy',
  ],

  /** Character creation features */
  hasClasses: true,
  hasRaces: true,
  hasBackgrounds: true,
  hasSpells: true,
  hasFeats: true,

  /** Ability score configuration */
  abilityScores: {
    /** Standard D&D 6 ability scores */
    scores: DND_ABILITY_SCORES,

    /** Ability scores range from 1 to 20 (with magic items potentially going higher) */
    scoreRange: {
      min: 1,
      max: 20,
    },

    /** Average score for a typical commoner */
    averageScore: 10,

    /** Uses standard D&D modifier formula: (score - 10) / 2 rounded down */
    modifierFormula: 'standard',
  },

  /** Character level range */
  levelRange: {
    min: 1,
    max: 20,
  },

  /** Theme color - D&D iconic red */
  color: '#C41E3A',

  /** Background image for system selection */
  backgroundImage: '/images/game-systems/dnd5e-bg.jpg',
};
