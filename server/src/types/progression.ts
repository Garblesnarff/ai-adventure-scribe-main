/**
 * Progression System Type Definitions
 *
 * Type-safe interfaces for D&D 5E experience points, leveling system,
 * ability score improvements, and character progression tracking.
 */

/**
 * XP source discriminator
 */
export type XPSource = 'combat' | 'quest' | 'roleplay' | 'milestone' | 'other';

/**
 * Experience event representing an XP award
 */
export interface ExperienceEvent {
  id: string;
  characterId: string;
  sessionId: string | null;
  xpGained: number;
  source: XPSource;
  description: string | null;
  timestamp: Date;
}

/**
 * Level progression state for a character
 */
export interface LevelProgression {
  characterId: string;
  currentLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
  lastLevelUp: Date | null;
  updatedAt: Date;
}

/**
 * Result of awarding XP
 */
export interface AwardXPResult {
  newXp: number;
  totalXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
}

/**
 * Current progression status
 */
export interface ProgressionStatus {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  percentToNext: number;
  proficiencyBonus: number;
}

/**
 * Ability score improvement selection
 */
export interface AbilityScoreImprovement {
  ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
  increase: number; // +1 or +2
}

/**
 * Hit point increase on level-up
 */
export interface HitPointIncrease {
  roll: number;
  conModifier: number;
  totalGained: number;
}

/**
 * Class feature granted at a specific level
 */
export interface ClassFeature {
  name: string;
  level: number;
  description: string;
}

/**
 * Spell learning choice for spellcasters
 */
export interface SpellChoice {
  spellLevel: number;
  spellsKnown: number;
  cantripsKnown?: number;
}

/**
 * Options available when leveling up
 */
export interface LevelUpOptions {
  newLevel: number;
  hpIncrease: {
    dieType: string;
    conModifier: number;
    averageRoll: number;
  };
  hasAbilityScoreImprovement: boolean;
  abilityScoreOptions?: {
    maxIncrease: number; // Total +2 to distribute
    canTakeFeat: boolean;
  };
  classFeatures: ClassFeature[];
  spellChoices?: SpellChoice;
  proficiencyBonus: number;
}

/**
 * Input for performing a level-up
 */
export interface LevelUpInput {
  characterId: string;
  hpRoll?: number; // If not provided, uses average
  abilityScoreImprovements?: AbilityScoreImprovement[];
  featSelected?: string;
  classFeatures?: string[];
  spellsLearned?: string[];
}

/**
 * Result of a level-up
 */
export interface LevelUpResult {
  characterId: string;
  oldLevel: number;
  newLevel: number;
  hpIncrease: HitPointIncrease;
  abilityScoreImprovements?: AbilityScoreImprovement[];
  featSelected?: string;
  newClassFeatures: ClassFeature[];
  newSpells?: string[];
  proficiencyBonus: number;
  timestamp: Date;
}

/**
 * Input for awarding XP
 */
export interface AwardXPInput {
  characterId: string;
  xp: number;
  source: XPSource;
  description?: string;
  sessionId?: string;
}

/**
 * Input for milestone leveling
 */
export interface MilestoneLevelInput {
  characterId: string;
  level: number;
  reason?: string;
}

/**
 * XP history query parameters
 */
export interface XPHistoryQuery {
  characterId: string;
  sessionId?: string;
  limit?: number;
}

/**
 * D&D 5E XP thresholds by level (PHB pg. 15)
 */
export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

/**
 * Proficiency bonus by level (PHB pg. 15)
 */
export const PROFICIENCY_BONUS_TABLE: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

/**
 * Levels that grant Ability Score Improvement (PHB pg. 12)
 */
export const ASI_LEVELS = [4, 8, 12, 16, 19];

/**
 * Maximum ability score without magical enhancement
 */
export const MAX_ABILITY_SCORE = 20;

/**
 * Maximum character level
 */
export const MAX_LEVEL = 20;
