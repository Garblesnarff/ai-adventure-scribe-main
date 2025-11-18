/**
 * Progression Service
 *
 * Implements D&D 5E experience points and leveling system.
 * Follows PHB pg. 15 rules for XP thresholds and level advancement.
 *
 * @module server/services/progression-service
 */

import { db } from '../../../db/client.js';
import {
  experienceEvents,
  levelProgression,
  characters,
  characterStats,
  type ExperienceEvent,
  type LevelProgression,
} from '../../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import type {
  XPSource,
  AwardXPResult,
  ProgressionStatus,
  LevelUpOptions,
  LevelUpInput,
  LevelUpResult,
  AbilityScoreImprovement,
  HitPointIncrease,
  ClassFeature,
  XP_TABLE,
  PROFICIENCY_BONUS_TABLE,
  ASI_LEVELS,
  MAX_ABILITY_SCORE,
  MAX_LEVEL,
} from '../types/progression.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

/**
 * D&D 5E XP thresholds by level (PHB pg. 15)
 */
const XP_THRESHOLDS: Record<number, number> = {
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
const PROFICIENCY_BONUSES: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

/**
 * Levels that grant Ability Score Improvement (PHB pg. 12)
 */
const ASI_LEVEL_LIST = [4, 8, 12, 16, 19];

/**
 * Hit dice by class
 */
const HIT_DICE_BY_CLASS: Record<string, string> = {
  'Barbarian': 'd12',
  'Fighter': 'd10',
  'Paladin': 'd10',
  'Ranger': 'd10',
  'Bard': 'd8',
  'Cleric': 'd8',
  'Druid': 'd8',
  'Monk': 'd8',
  'Rogue': 'd8',
  'Warlock': 'd8',
  'Sorcerer': 'd6',
  'Wizard': 'd6',
};

/**
 * Progression Service
 */
export class ProgressionService {
  /**
   * Calculate proficiency bonus for a given level
   * PHB pg. 15: +2 (levels 1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20)
   */
  static calculateProficiencyBonus(level: number): number {
    if (level < 1) return 2;
    if (level > 20) return 6;
    return PROFICIENCY_BONUSES[level] || 2;
  }

  /**
   * Get XP threshold for a specific level
   */
  static getXPForLevel(level: number): number {
    if (level < 1) return 0;
    if (level > 20) return XP_THRESHOLDS[20] ?? 0;
    return XP_THRESHOLDS[level] ?? 0;
  }

  /**
   * Calculate level from total XP
   */
  static calculateLevelFromXP(totalXp: number): number {
    for (let level = 20; level >= 1; level--) {
      const threshold = XP_THRESHOLDS[level];
      if (threshold !== undefined && totalXp >= threshold) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Calculate XP needed for next level
   */
  static calculateXPToNextLevel(currentLevel: number, currentXp: number): number {
    if (currentLevel >= 20) return 0;
    const nextLevelXP = this.getXPForLevel(currentLevel + 1);
    return nextLevelXP - currentXp;
  }

  /**
   * Check if a level grants ASI
   */
  static grantsAbilityScoreImprovement(level: number): boolean {
    return ASI_LEVEL_LIST.includes(level);
  }

  /**
   * Calculate Constitution modifier
   */
  private static calculateConModifier(constitution: number): number {
    return Math.floor((constitution - 10) / 2);
  }

  /**
   * Get hit die type for a class
   */
  private static getHitDieType(className: string): string {
    return HIT_DICE_BY_CLASS[className] || 'd8';
  }

  /**
   * Roll a hit die or use average
   */
  private static rollHitDie(dieType: string, useAverage: boolean = false): number {
    const dieSize = parseInt(dieType.substring(1));
    if (useAverage) {
      return Math.floor(dieSize / 2) + 1;
    }
    return Math.floor(Math.random() * dieSize) + 1;
  }

  /**
   * Initialize progression for a new character
   */
  static async initializeProgression(characterId: string): Promise<LevelProgression> {
    // Check if progression already exists
    const existing = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    if (existing) {
      return existing;
    }

    // Create new progression
    const [progression] = await db
      .insert(levelProgression)
      .values({
        characterId,
        currentLevel: 1,
        currentXp: 0,
        xpToNextLevel: XP_THRESHOLDS[2] ?? 300, // 300 XP to level 2
        totalXp: 0,
      })
      .returning();

    if (!progression) {
      throw new Error('Failed to create progression');
    }

    return progression;
  }

  /**
   * Get current progression for a character
   */
  static async getProgression(characterId: string): Promise<ProgressionStatus> {
    let progression = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    // Initialize if doesn't exist
    if (!progression) {
      progression = await this.initializeProgression(characterId);
    }

    const percentToNext = progression.currentLevel >= 20
      ? 100
      : (progression.currentXp / (progression.currentXp + progression.xpToNextLevel)) * 100;

    return {
      level: progression.currentLevel,
      xp: progression.currentXp,
      xpToNext: progression.xpToNextLevel,
      totalXp: progression.totalXp,
      percentToNext: Math.round(percentToNext * 100) / 100,
      proficiencyBonus: this.calculateProficiencyBonus(progression.currentLevel),
    };
  }

  /**
   * Check if character can level up
   */
  static async canLevelUp(characterId: string): Promise<boolean> {
    const progression = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    if (!progression) return false;
    if (progression.currentLevel >= 20) return false;

    return progression.xpToNextLevel <= 0;
  }

  /**
   * Award XP to a character
   * Returns info about level-ups if they occurred
   */
  static async awardXP(
    characterId: string,
    xp: number,
    source: XPSource,
    description?: string,
    sessionId?: string
  ): Promise<AwardXPResult> {
    if (xp < 0) {
      throw new ValidationError('Cannot award negative XP', { xp });
    }

    // Get or create progression
    let progression = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    if (!progression) {
      progression = await this.initializeProgression(characterId);
    }

    const oldLevel = progression.currentLevel;
    const newTotalXp = progression.totalXp + xp;
    const newLevel = this.calculateLevelFromXP(newTotalXp);
    const levelsGained = newLevel - oldLevel;

    // Update progression
    const [updatedProgression] = await db
      .update(levelProgression)
      .set({
        currentLevel: newLevel,
        currentXp: newTotalXp,
        totalXp: newTotalXp,
        xpToNextLevel: this.calculateXPToNextLevel(newLevel, newTotalXp),
        lastLevelUp: levelsGained > 0 ? new Date() : progression.lastLevelUp,
        updatedAt: new Date(),
      })
      .where(eq(levelProgression.characterId, characterId))
      .returning();

    if (!updatedProgression) {
      throw new Error('Failed to update progression');
    }

    // Also update character level
    if (levelsGained > 0) {
      await db
        .update(characters)
        .set({
          level: newLevel,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, characterId));
    }

    // Log XP event
    await db.insert(experienceEvents).values({
      characterId,
      sessionId: sessionId || null,
      xpGained: xp,
      source,
      description: description || null,
    });

    return {
      newXp: updatedProgression.currentXp,
      totalXp: updatedProgression.totalXp,
      leveledUp: levelsGained > 0,
      oldLevel,
      newLevel,
      levelsGained,
    };
  }

  /**
   * Get XP history for a character
   */
  static async getXPHistory(
    characterId: string,
    sessionId?: string,
    limit: number = 50
  ): Promise<ExperienceEvent[]> {
    const conditions = [eq(experienceEvents.characterId, characterId)];

    if (sessionId) {
      conditions.push(eq(experienceEvents.sessionId, sessionId));
    }

    const history = await db.query.experienceEvents.findMany({
      where: conditions.length > 1 ? and(...conditions) : conditions[0],
      orderBy: [desc(experienceEvents.timestamp)],
      limit,
    });

    return history;
  }

  /**
   * Get level-up options for a character at a new level
   */
  static async getLevelUpOptions(
    characterId: string,
    newLevel: number
  ): Promise<LevelUpOptions> {
    // Get character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        stats: true,
      },
    });

    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    if (!character.stats) {
      throw new BusinessLogicError('Character has no stats', { characterId });
    }

    const className = character.class || 'Fighter';
    const dieType = this.getHitDieType(className);
    const dieSize = parseInt(dieType.substring(1));
    const conModifier = this.calculateConModifier(character.stats.constitution);
    const averageRoll = Math.floor(dieSize / 2) + 1;

    const hasASI = this.grantsAbilityScoreImprovement(newLevel);

    // Placeholder class features (would be expanded with full class data)
    const classFeatures: ClassFeature[] = [];
    if (newLevel === 2) {
      classFeatures.push({
        name: 'Class Feature (Level 2)',
        level: 2,
        description: 'Gain your level 2 class feature',
      });
    }

    return {
      newLevel,
      hpIncrease: {
        dieType,
        conModifier,
        averageRoll,
      },
      hasAbilityScoreImprovement: hasASI,
      abilityScoreOptions: hasASI ? {
        maxIncrease: 2,
        canTakeFeat: true,
      } : undefined,
      classFeatures,
      proficiencyBonus: this.calculateProficiencyBonus(newLevel),
    };
  }

  /**
   * Perform a level-up for a character
   */
  static async levelUp(input: LevelUpInput): Promise<LevelUpResult> {
    const { characterId, hpRoll, abilityScoreImprovements, featSelected, classFeatures, spellsLearned } = input;

    // Get character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        stats: true,
      },
    });

    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    if (!character.stats) {
      throw new BusinessLogicError('Character has no stats', { characterId });
    }

    const progression = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    if (!progression) {
      throw new NotFoundError('Progression for character', characterId);
    }

    const oldLevel = progression.currentLevel;
    const newLevel = oldLevel + 1;

    if (newLevel > 20) {
      throw new BusinessLogicError('Character is already at maximum level (20)', {
        characterId,
        currentLevel: oldLevel,
      });
    }

    // Calculate HP increase
    const className = character.class || 'Fighter';
    const dieType = this.getHitDieType(className);
    const conModifier = this.calculateConModifier(character.stats.constitution);
    const roll = hpRoll || this.rollHitDie(dieType, true);
    const hpGained = Math.max(1, roll + conModifier);

    const hpIncrease: HitPointIncrease = {
      roll,
      conModifier,
      totalGained: hpGained,
    };

    // Apply ability score improvements
    let updatedStats = { ...character.stats };
    if (abilityScoreImprovements && abilityScoreImprovements.length > 0) {
      const totalIncrease = abilityScoreImprovements.reduce((sum, asi) => sum + asi.increase, 0);
      if (totalIncrease > 2) {
        throw new ValidationError('Total ability score increase cannot exceed +2', {
          totalIncrease,
          abilityScoreImprovements,
        });
      }

      for (const asi of abilityScoreImprovements) {
        const currentValue = updatedStats[asi.ability];
        const newValue = Math.min(20, currentValue + asi.increase);
        updatedStats[asi.ability] = newValue;
      }

      // Update stats in database
      await db
        .update(characterStats)
        .set({
          strength: updatedStats.strength,
          dexterity: updatedStats.dexterity,
          constitution: updatedStats.constitution,
          intelligence: updatedStats.intelligence,
          wisdom: updatedStats.wisdom,
          charisma: updatedStats.charisma,
          updatedAt: new Date(),
        })
        .where(eq(characterStats.id, character.stats.id));
    }

    // Update character level and XP
    const newTotalXp = this.getXPForLevel(newLevel);
    await db
      .update(characters)
      .set({
        level: newLevel,
        experiencePoints: newTotalXp,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, characterId));

    // Update progression
    await db
      .update(levelProgression)
      .set({
        currentLevel: newLevel,
        currentXp: newTotalXp,
        totalXp: newTotalXp,
        xpToNextLevel: this.calculateXPToNextLevel(newLevel, newTotalXp),
        lastLevelUp: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(levelProgression.characterId, characterId));

    // Get class features for this level (placeholder)
    const newClassFeatures: ClassFeature[] = [];
    if (this.grantsAbilityScoreImprovement(newLevel)) {
      newClassFeatures.push({
        name: 'Ability Score Improvement',
        level: newLevel,
        description: 'Increase one ability score by 2, or two ability scores by 1 each',
      });
    }

    return {
      characterId,
      oldLevel,
      newLevel,
      hpIncrease,
      abilityScoreImprovements,
      featSelected,
      newClassFeatures,
      newSpells: spellsLearned,
      proficiencyBonus: this.calculateProficiencyBonus(newLevel),
      timestamp: new Date(),
    };
  }

  /**
   * Set character level directly (milestone leveling)
   */
  static async setLevel(
    characterId: string,
    level: number,
    reason?: string
  ): Promise<{ oldLevel: number; newLevel: number }> {
    if (level < 1 || level > 20) {
      throw new ValidationError('Level must be between 1 and 20', { level });
    }

    // Get current progression
    let progression = await db.query.levelProgression.findFirst({
      where: eq(levelProgression.characterId, characterId),
    });

    if (!progression) {
      progression = await this.initializeProgression(characterId);
    }

    const oldLevel = progression.currentLevel;
    const newTotalXp = this.getXPForLevel(level);

    // Update progression
    await db
      .update(levelProgression)
      .set({
        currentLevel: level,
        currentXp: newTotalXp,
        totalXp: newTotalXp,
        xpToNextLevel: this.calculateXPToNextLevel(level, newTotalXp),
        lastLevelUp: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(levelProgression.characterId, characterId));

    // Update character
    await db
      .update(characters)
      .set({
        level,
        experiencePoints: newTotalXp,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, characterId));

    // Log milestone event
    await db.insert(experienceEvents).values({
      characterId,
      xpGained: 0,
      source: 'milestone',
      description: reason || `Milestone level set to ${level}`,
    });

    return { oldLevel, newLevel: level };
  }

  /**
   * Get XP table
   */
  static getXPTable(): Record<number, number> {
    return { ...XP_THRESHOLDS };
  }
}
