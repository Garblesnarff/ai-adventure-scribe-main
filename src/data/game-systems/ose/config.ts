/**
 * Old-School Essentials Game System Configurations
 *
 * Configurations for both Classic Fantasy (B/X) and Advanced Fantasy variants
 * of Old-School Essentials. OSE is a modernized, clearly-written retro-clone
 * of the classic Basic/Expert D&D rules.
 *
 * @module data/game-systems/ose/config
 */

import { GameSystem, GameSystemConfig, OSE_ABILITY_SCORES } from '@/types/game-systems';

/**
 * Old-School Essentials - Classic Fantasy Configuration
 *
 * The core OSE experience featuring classic B/X D&D with modern clarity.
 * Uses race-as-class mechanics with 4 human classes and 3 demi-human classes.
 *
 * Features:
 * - 4 Human Classes: Cleric, Fighter, Magic-User, Thief
 * - 3 Race-as-Class Options: Dwarf, Elf, Halfling
 * - Levels 1-14 (classic B/X progression)
 * - OSE ability modifier system (bonuses start at 13+)
 * - Streamlined old-school gameplay
 *
 * @constant
 * @type {GameSystemConfig}
 */
export const OSE_CLASSIC_CONFIG: GameSystemConfig = {
  id: GameSystem.OSE_CLASSIC,
  name: 'Old-School Essentials (Classic Fantasy)',
  shortName: 'OSE Classic',
  description:
    'Classic B/X D&D rules with modern clarity. Features 4 human classes and 3 race-as-class options for streamlined old-school play.',
  icon: '📜',
  license: 'OGL',
  licenseUrl: 'https://oldschoolessentials.necroticgnome.com/srd/',
  complexity: 2,
  tags: ['OSR', 'Classic', 'B/X', 'Old School', 'Race-as-Class'],
  compatibleGenres: ['Traditional Fantasy', 'Dark Fantasy'],
  hasClasses: true,
  hasRaces: true,
  hasBackgrounds: false,
  hasSpells: true,
  hasFeats: false,
  abilityScores: {
    scores: OSE_ABILITY_SCORES,
    scoreRange: {
      min: 3,
      max: 18,
    },
    averageScore: 10,
    modifierFormula: 'ose',
  },
  levelRange: {
    min: 1,
    max: 14,
  },
  color: '#8B4513',
};

/**
 * Old-School Essentials - Advanced Fantasy Configuration
 *
 * Expanded OSE with separated race and class options for greater character variety.
 * Compatible with both Classic Fantasy and Advanced Fantasy supplements.
 *
 * Features:
 * - 13+ Classes: Including Acrobat, Barbarian, Bard, Knight, Ranger, and more
 * - 6+ Races: Drow, Duergar, Gnome, Half-Elf, Half-Orc, Svirfneblin
 * - Separated race/class system (not race-as-class)
 * - Levels 1-14 (classic B/X progression)
 * - OSE ability modifier system (bonuses start at 13+)
 * - Expanded options while maintaining OSR simplicity
 *
 * @constant
 * @type {GameSystemConfig}
 */
export const OSE_ADVANCED_CONFIG: GameSystemConfig = {
  id: GameSystem.OSE_ADVANCED,
  name: 'Old-School Essentials (Advanced Fantasy)',
  shortName: 'OSE Advanced',
  description:
    'Expanded OSE with 13+ classes, 6 additional races, and separated race/class options for greater character variety.',
  icon: '📚',
  license: 'OGL',
  licenseUrl: 'https://oldschoolessentials.necroticgnome.com/srd/',
  complexity: 2,
  tags: ['OSR', 'Advanced', 'B/X', 'Expanded Options'],
  compatibleGenres: ['Traditional Fantasy', 'Dark Fantasy', 'High Fantasy'],
  hasClasses: true,
  hasRaces: true,
  hasBackgrounds: false,
  hasSpells: true,
  hasFeats: false,
  abilityScores: {
    scores: OSE_ABILITY_SCORES,
    scoreRange: {
      min: 3,
      max: 18,
    },
    averageScore: 10,
    modifierFormula: 'ose',
  },
  levelRange: {
    min: 1,
    max: 14,
  },
  color: '#654321',
};
