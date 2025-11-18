/**
 * Progression Service Tests
 *
 * Comprehensive test suite for D&D 5E experience points and leveling system.
 * Tests XP awards, level-ups, ability score improvements, and proficiency bonus calculations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressionService } from '../progression-service.js';
import { db } from '../../../../db/client.js';
import {
  characters,
  characterStats,
  levelProgression,
  experienceEvents,
} from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('ProgressionService', () => {
  let testCharacterId: string;
  let testCharacterStatsId: string;

  beforeEach(async () => {
    // Create a test character
    const [character] = await db
      .insert(characters)
      .values({
        userId: 'test-user',
        name: 'Test Character',
        class: 'Fighter',
        level: 1,
        race: 'Human',
      })
      .returning();
    testCharacterId = character!.id;

    // Create character stats
    const [stats] = await db
      .insert(characterStats)
      .values({
        characterId: testCharacterId,
        strength: 16,
        dexterity: 14,
        constitution: 14, // +2 modifier
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      })
      .returning();
    testCharacterStatsId = stats!.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testCharacterId) {
      await db.delete(experienceEvents).where(eq(experienceEvents.characterId, testCharacterId));
      await db.delete(levelProgression).where(eq(levelProgression.characterId, testCharacterId));
      await db.delete(characterStats).where(eq(characterStats.id, testCharacterStatsId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
  });

  describe('Proficiency Bonus Calculation', () => {
    it('should return +2 for levels 1-4', () => {
      expect(ProgressionService.calculateProficiencyBonus(1)).toBe(2);
      expect(ProgressionService.calculateProficiencyBonus(2)).toBe(2);
      expect(ProgressionService.calculateProficiencyBonus(3)).toBe(2);
      expect(ProgressionService.calculateProficiencyBonus(4)).toBe(2);
    });

    it('should return +3 for levels 5-8', () => {
      expect(ProgressionService.calculateProficiencyBonus(5)).toBe(3);
      expect(ProgressionService.calculateProficiencyBonus(6)).toBe(3);
      expect(ProgressionService.calculateProficiencyBonus(7)).toBe(3);
      expect(ProgressionService.calculateProficiencyBonus(8)).toBe(3);
    });

    it('should return +4 for levels 9-12', () => {
      expect(ProgressionService.calculateProficiencyBonus(9)).toBe(4);
      expect(ProgressionService.calculateProficiencyBonus(10)).toBe(4);
      expect(ProgressionService.calculateProficiencyBonus(11)).toBe(4);
      expect(ProgressionService.calculateProficiencyBonus(12)).toBe(4);
    });

    it('should return +5 for levels 13-16', () => {
      expect(ProgressionService.calculateProficiencyBonus(13)).toBe(5);
      expect(ProgressionService.calculateProficiencyBonus(14)).toBe(5);
      expect(ProgressionService.calculateProficiencyBonus(15)).toBe(5);
      expect(ProgressionService.calculateProficiencyBonus(16)).toBe(5);
    });

    it('should return +6 for levels 17-20', () => {
      expect(ProgressionService.calculateProficiencyBonus(17)).toBe(6);
      expect(ProgressionService.calculateProficiencyBonus(18)).toBe(6);
      expect(ProgressionService.calculateProficiencyBonus(19)).toBe(6);
      expect(ProgressionService.calculateProficiencyBonus(20)).toBe(6);
    });
  });

  describe('XP Thresholds', () => {
    it('should return correct XP for all 20 levels', () => {
      expect(ProgressionService.getXPForLevel(1)).toBe(0);
      expect(ProgressionService.getXPForLevel(2)).toBe(300);
      expect(ProgressionService.getXPForLevel(3)).toBe(900);
      expect(ProgressionService.getXPForLevel(4)).toBe(2700);
      expect(ProgressionService.getXPForLevel(5)).toBe(6500);
      expect(ProgressionService.getXPForLevel(6)).toBe(14000);
      expect(ProgressionService.getXPForLevel(7)).toBe(23000);
      expect(ProgressionService.getXPForLevel(8)).toBe(34000);
      expect(ProgressionService.getXPForLevel(9)).toBe(48000);
      expect(ProgressionService.getXPForLevel(10)).toBe(64000);
      expect(ProgressionService.getXPForLevel(11)).toBe(85000);
      expect(ProgressionService.getXPForLevel(12)).toBe(100000);
      expect(ProgressionService.getXPForLevel(13)).toBe(120000);
      expect(ProgressionService.getXPForLevel(14)).toBe(140000);
      expect(ProgressionService.getXPForLevel(15)).toBe(165000);
      expect(ProgressionService.getXPForLevel(16)).toBe(195000);
      expect(ProgressionService.getXPForLevel(17)).toBe(225000);
      expect(ProgressionService.getXPForLevel(18)).toBe(265000);
      expect(ProgressionService.getXPForLevel(19)).toBe(305000);
      expect(ProgressionService.getXPForLevel(20)).toBe(355000);
    });
  });

  describe('Ability Score Improvements', () => {
    it('should correctly identify ASI levels', () => {
      expect(ProgressionService.grantsAbilityScoreImprovement(4)).toBe(true);
      expect(ProgressionService.grantsAbilityScoreImprovement(8)).toBe(true);
      expect(ProgressionService.grantsAbilityScoreImprovement(12)).toBe(true);
      expect(ProgressionService.grantsAbilityScoreImprovement(16)).toBe(true);
      expect(ProgressionService.grantsAbilityScoreImprovement(19)).toBe(true);
    });

    it('should return false for non-ASI levels', () => {
      expect(ProgressionService.grantsAbilityScoreImprovement(1)).toBe(false);
      expect(ProgressionService.grantsAbilityScoreImprovement(3)).toBe(false);
      expect(ProgressionService.grantsAbilityScoreImprovement(5)).toBe(false);
      expect(ProgressionService.grantsAbilityScoreImprovement(10)).toBe(false);
      expect(ProgressionService.grantsAbilityScoreImprovement(20)).toBe(false);
    });
  });

  describe('Progression Initialization', () => {
    it('should initialize progression for a new character', async () => {
      const progression = await ProgressionService.initializeProgression(testCharacterId);

      expect(progression).toBeDefined();
      expect(progression.characterId).toBe(testCharacterId);
      expect(progression.currentLevel).toBe(1);
      expect(progression.currentXp).toBe(0);
      expect(progression.totalXp).toBe(0);
      expect(progression.xpToNextLevel).toBe(300);
    });

    it('should not duplicate progression if already exists', async () => {
      await ProgressionService.initializeProgression(testCharacterId);
      const second = await ProgressionService.initializeProgression(testCharacterId);

      expect(second.currentLevel).toBe(1);
    });
  });

  describe('XP Award', () => {
    it('should award XP correctly without leveling up', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        100,
        'combat',
        'Defeated goblins'
      );

      expect(result.newXp).toBe(100);
      expect(result.totalXp).toBe(100);
      expect(result.leveledUp).toBe(false);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(1);
    });

    it('should level up once when XP threshold is reached', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        300,
        'quest',
        'Completed quest'
      );

      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.levelsGained).toBe(1);
    });

    it('should level up multiple times with large XP award', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        10000,
        'milestone',
        'Major milestone'
      );

      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(5);
      expect(result.levelsGained).toBe(4);
    });

    it('should throw error for negative XP', async () => {
      await expect(
        ProgressionService.awardXP(testCharacterId, -100, 'combat')
      ).rejects.toThrow('Cannot award negative XP');
    });

    it('should log XP event', async () => {
      await ProgressionService.awardXP(
        testCharacterId,
        150,
        'roleplay',
        'Great roleplaying'
      );

      const history = await ProgressionService.getXPHistory(testCharacterId);
      expect(history.length).toBe(1);
      expect(history[0]!.xpGained).toBe(150);
      expect(history[0]!.source).toBe('roleplay');
    });
  });

  describe('Get Progression', () => {
    it('should return current progression status', async () => {
      await ProgressionService.awardXP(testCharacterId, 150, 'combat');

      const status = await ProgressionService.getProgression(testCharacterId);

      expect(status.level).toBe(1);
      expect(status.xp).toBe(150);
      expect(status.totalXp).toBe(150);
      expect(status.xpToNext).toBe(150); // 300 - 150
      expect(status.proficiencyBonus).toBe(2);
      expect(status.percentToNext).toBeGreaterThan(0);
    });

    it('should calculate percentage to next level correctly', async () => {
      await ProgressionService.awardXP(testCharacterId, 150, 'combat');

      const status = await ProgressionService.getProgression(testCharacterId);

      // 150 XP out of 300 needed = 50%
      expect(status.percentToNext).toBeCloseTo(50, 0);
    });
  });

  describe('Can Level Up', () => {
    it('should return false when not enough XP', async () => {
      await ProgressionService.awardXP(testCharacterId, 100, 'combat');

      const canLevel = await ProgressionService.canLevelUp(testCharacterId);
      expect(canLevel).toBe(false);
    });

    it('should return true when enough XP', async () => {
      await ProgressionService.awardXP(testCharacterId, 300, 'combat');

      const canLevel = await ProgressionService.canLevelUp(testCharacterId);
      expect(canLevel).toBe(true);
    });

    it('should return false at max level', async () => {
      await ProgressionService.setLevel(testCharacterId, 20);

      const canLevel = await ProgressionService.canLevelUp(testCharacterId);
      expect(canLevel).toBe(false);
    });
  });

  describe('Level Up', () => {
    beforeEach(async () => {
      // Award enough XP to level up
      await ProgressionService.awardXP(testCharacterId, 300, 'combat');
    });

    it('should level up character correctly', async () => {
      const result = await ProgressionService.levelUp({
        characterId: testCharacterId,
        hpRoll: 8,
      });

      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.hpIncrease.roll).toBe(8);
      expect(result.hpIncrease.conModifier).toBe(2);
      expect(result.hpIncrease.totalGained).toBe(10); // 8 + 2
      expect(result.proficiencyBonus).toBe(2);
    });

    it('should apply ability score improvements at level 4', async () => {
      // Level to 4
      await ProgressionService.setLevel(testCharacterId, 3);
      await ProgressionService.awardXP(testCharacterId, 2700, 'milestone');

      const result = await ProgressionService.levelUp({
        characterId: testCharacterId,
        hpRoll: 7,
        abilityScoreImprovements: [
          { ability: 'strength', increase: 2 },
        ],
      });

      expect(result.newLevel).toBe(4);
      expect(result.abilityScoreImprovements).toBeDefined();
      expect(result.abilityScoreImprovements![0]!.ability).toBe('strength');

      // Verify stats were updated
      const stats = await db.query.characterStats.findFirst({
        where: eq(characterStats.id, testCharacterStatsId),
      });
      expect(stats!.strength).toBe(18); // 16 + 2
    });

    it('should allow distributing +2 across two abilities', async () => {
      await ProgressionService.setLevel(testCharacterId, 3);
      await ProgressionService.awardXP(testCharacterId, 2700, 'milestone');

      const result = await ProgressionService.levelUp({
        characterId: testCharacterId,
        hpRoll: 6,
        abilityScoreImprovements: [
          { ability: 'strength', increase: 1 },
          { ability: 'dexterity', increase: 1 },
        ],
      });

      expect(result.abilityScoreImprovements?.length).toBe(2);

      const stats = await db.query.characterStats.findFirst({
        where: eq(characterStats.id, testCharacterStatsId),
      });
      expect(stats!.strength).toBe(17);
      expect(stats!.dexterity).toBe(15);
    });

    it('should throw error when exceeding +2 total increase', async () => {
      await ProgressionService.setLevel(testCharacterId, 3);
      await ProgressionService.awardXP(testCharacterId, 2700, 'milestone');

      await expect(
        ProgressionService.levelUp({
          characterId: testCharacterId,
          hpRoll: 6,
          abilityScoreImprovements: [
            { ability: 'strength', increase: 2 },
            { ability: 'dexterity', increase: 1 },
          ],
        })
      ).rejects.toThrow('Total ability score increase cannot exceed +2');
    });

    it('should enforce minimum 1 HP per level', async () => {
      const result = await ProgressionService.levelUp({
        characterId: testCharacterId,
        hpRoll: 1,
      });

      // Even with roll of 1 + CON modifier of 2, should get at least 1
      expect(result.hpIncrease.totalGained).toBeGreaterThanOrEqual(1);
    });

    it('should throw error at max level', async () => {
      await ProgressionService.setLevel(testCharacterId, 20);

      await expect(
        ProgressionService.levelUp({
          characterId: testCharacterId,
          hpRoll: 10,
        })
      ).rejects.toThrow('already at maximum level');
    });
  });

  describe('Milestone Leveling', () => {
    it('should set level directly', async () => {
      const result = await ProgressionService.setLevel(testCharacterId, 5, 'Story milestone');

      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(5);

      const progression = await ProgressionService.getProgression(testCharacterId);
      expect(progression.level).toBe(5);
      expect(progression.totalXp).toBe(6500); // XP for level 5
    });

    it('should throw error for invalid level', async () => {
      await expect(
        ProgressionService.setLevel(testCharacterId, 0)
      ).rejects.toThrow('Level must be between 1 and 20');

      await expect(
        ProgressionService.setLevel(testCharacterId, 21)
      ).rejects.toThrow('Level must be between 1 and 20');
    });
  });

  describe('XP History', () => {
    it('should retrieve XP history', async () => {
      await ProgressionService.awardXP(testCharacterId, 100, 'combat', 'Fight 1');
      await ProgressionService.awardXP(testCharacterId, 150, 'quest', 'Quest 1');
      await ProgressionService.awardXP(testCharacterId, 50, 'roleplay', 'RP bonus');

      const history = await ProgressionService.getXPHistory(testCharacterId);

      expect(history.length).toBe(3);
      // Should be in reverse chronological order
      expect(history[0]!.source).toBe('roleplay');
      expect(history[2]!.source).toBe('combat');
    });

    it('should limit history results', async () => {
      for (let i = 0; i < 10; i++) {
        await ProgressionService.awardXP(testCharacterId, 10, 'combat');
      }

      const history = await ProgressionService.getXPHistory(testCharacterId, undefined, 5);

      expect(history.length).toBe(5);
    });
  });

  describe('Level-Up Options', () => {
    it('should provide correct options for level 2', async () => {
      const options = await ProgressionService.getLevelUpOptions(testCharacterId, 2);

      expect(options.newLevel).toBe(2);
      expect(options.hpIncrease.dieType).toBe('d10'); // Fighter
      expect(options.hpIncrease.conModifier).toBe(2);
      expect(options.hasAbilityScoreImprovement).toBe(false);
      expect(options.proficiencyBonus).toBe(2);
    });

    it('should include ASI options at level 4', async () => {
      const options = await ProgressionService.getLevelUpOptions(testCharacterId, 4);

      expect(options.hasAbilityScoreImprovement).toBe(true);
      expect(options.abilityScoreOptions).toBeDefined();
      expect(options.abilityScoreOptions!.maxIncrease).toBe(2);
      expect(options.abilityScoreOptions!.canTakeFeat).toBe(true);
    });

    it('should calculate proficiency bonus correctly for level 5', async () => {
      const options = await ProgressionService.getLevelUpOptions(testCharacterId, 5);

      expect(options.proficiencyBonus).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leveling from 1 to 20 in one XP award', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        355000,
        'milestone',
        'Campaign completion'
      );

      expect(result.newLevel).toBe(20);
      expect(result.levelsGained).toBe(19);
    });

    it('should not exceed level 20', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        1000000,
        'milestone'
      );

      expect(result.newLevel).toBe(20);
    });

    it('should handle zero XP award', async () => {
      const result = await ProgressionService.awardXP(
        testCharacterId,
        0,
        'other'
      );

      expect(result.newXp).toBe(0);
      expect(result.leveledUp).toBe(false);
    });
  });

  describe('XP Table', () => {
    it('should return complete XP table', () => {
      const table = ProgressionService.getXPTable();

      expect(Object.keys(table).length).toBe(20);
      expect(table[1]).toBe(0);
      expect(table[20]).toBe(355000);
    });
  });

  describe('Performance', () => {
    it('should complete level-up in under 200ms', async () => {
      await ProgressionService.awardXP(testCharacterId, 300, 'combat');

      const startTime = Date.now();
      await ProgressionService.levelUp({
        characterId: testCharacterId,
        hpRoll: 8,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
