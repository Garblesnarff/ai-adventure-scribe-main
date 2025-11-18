/**
 * Knave RPG System Configuration
 *
 * Knave is a classless OSR toolkit emphasizing equipment and simplicity.
 * Characters are defined by their ability scores and equipment rather than character classes.
 * It is highly compatible with classic D&D modules and other OSR content.
 *
 * @module data/game-systems/knave/config
 */

import type { GameSystemConfig } from '@/types/game-systems';
import { GameSystem, KNAVE_ABILITY_SCORES } from '@/types/game-systems';

/**
 * Complete configuration for the Knave RPG system.
 *
 * Knave is a lightweight, classless OSR system that removes character classes entirely,
 * allowing players to define their character through ability scores and equipment choices.
 * It was designed by Ben Milton and is released under Creative Commons Attribution license.
 *
 * Key Features:
 * - Classless character creation system
 * - Equipment-based character definition
 * - Compatible with classic D&D modules (B/X era)
 * - Simple mechanic: roll d20 and compare to ability scores
 * - Spells acquired as books and items rather than class features
 * - Fast character generation and play
 *
 * @constant
 * @type {GameSystemConfig}
 */
export const KNAVE_CONFIG: GameSystemConfig = {
  // System Identification
  id: GameSystem.KNAVE,
  name: 'Knave',
  shortName: 'Knave',

  // System Description
  description:
    'Classless OSR toolkit with high compatibility. Characters defined by equipment and ability scores. ' +
    'Simple, hackable, and works with classic D&D modules.',

  // Display Configuration
  icon: '🗡️',
  color: '#696969', // Dim gray for classless simplicity

  // License Information
  license: 'CC-BY',
  licenseUrl: 'https://questingbeast.itch.io/knave',

  // Complexity Rating (1 = simple, 5 = complex)
  complexity: 1,

  // Categorization Tags
  tags: ['OSR', 'Classless', 'Toolkit', 'Rules-Light', 'Compatible'],

  // Supported Genres
  compatibleGenres: ['Traditional Fantasy', 'Dark Fantasy'],

  // Feature Flags
  hasClasses: false,
  hasRaces: false,
  hasBackgrounds: false,
  hasSpells: true, // Spells acquired as books/items rather than class features
  hasFeats: false,

  // Ability Score Configuration
  abilityScores: {
    scores: KNAVE_ABILITY_SCORES,
    scoreRange: {
      min: 3,
      max: 18,
    },
    averageScore: 10,
    modifierFormula: 'standard',
  },

  // Level Range
  levelRange: {
    min: 1,
    max: 10,
  },
};
