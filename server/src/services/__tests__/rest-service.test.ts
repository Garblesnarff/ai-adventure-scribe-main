/**
 * Rest Service Tests
 *
 * Comprehensive test suite for D&D 5E rest mechanics including short rests,
 * long rests, and hit dice management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestService } from '../rest-service.js';
import { db } from '../../../../db/client.js';
import {
  characters,
  characterStats,
  characterHitDice,
  restEvents,
} from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('RestService', () => {
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
        level: 5,
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
      await db.delete(characterHitDice).where(eq(characterHitDice.characterId, testCharacterId));
      await db.delete(restEvents).where(eq(restEvents.characterId, testCharacterId));
      await db.delete(characterStats).where(eq(characterStats.id, testCharacterStatsId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
  });

  describe('Hit Dice Management', () => {
    it('should get correct hit die type for each class', () => {
      expect(RestService.getHitDieType('Barbarian')).toBe('d12');
      expect(RestService.getHitDieType('Fighter')).toBe('d10');
      expect(RestService.getHitDieType('Paladin')).toBe('d10');
      expect(RestService.getHitDieType('Ranger')).toBe('d10');
      expect(RestService.getHitDieType('Bard')).toBe('d8');
      expect(RestService.getHitDieType('Cleric')).toBe('d8');
      expect(RestService.getHitDieType('Druid')).toBe('d8');
      expect(RestService.getHitDieType('Monk')).toBe('d8');
      expect(RestService.getHitDieType('Rogue')).toBe('d8');
      expect(RestService.getHitDieType('Warlock')).toBe('d8');
      expect(RestService.getHitDieType('Sorcerer')).toBe('d6');
      expect(RestService.getHitDieType('Wizard')).toBe('d6');
    });

    it('should initialize hit dice for a character', async () => {
      const hitDice = await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);

      expect(hitDice).toBeDefined();
      expect(hitDice.characterId).toBe(testCharacterId);
      expect(hitDice.className).toBe('Fighter');
      expect(hitDice.dieType).toBe('d10');
      expect(hitDice.totalDice).toBe(5);
      expect(hitDice.usedDice).toBe(0);
    });

    it('should update total dice when reinitializing', async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);
      const updated = await RestService.initializeHitDice(testCharacterId, 'Fighter', 6);

      expect(updated.totalDice).toBe(6);
    });

    it('should support multiclass hit dice', async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 3);
      await RestService.initializeHitDice(testCharacterId, 'Wizard', 2);

      const allHitDice = await RestService.getHitDice(testCharacterId);

      expect(allHitDice).toHaveLength(2);
      expect(allHitDice[0]!.className).toBe('Fighter');
      expect(allHitDice[0]!.dieType).toBe('d10');
      expect(allHitDice[0]!.totalDice).toBe(3);
      expect(allHitDice[1]!.className).toBe('Wizard');
      expect(allHitDice[1]!.dieType).toBe('d6');
      expect(allHitDice[1]!.totalDice).toBe(2);
    });

    it('should get available hit dice count', async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);

      const available = await RestService.getAvailableHitDiceCount(testCharacterId);
      expect(available).toBe(5);
    });

    it('should calculate hit dice for class correctly', () => {
      const result = RestService.calculateHitDiceForClass('Barbarian', 10);

      expect(result.dieType).toBe('d12');
      expect(result.count).toBe(10);
    });
  });

  describe('Spending Hit Dice', () => {
    beforeEach(async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);
    });

    it('should spend hit dice with CON modifier applied', async () => {
      // Pre-roll values for deterministic testing
      const preRolls = [8, 6]; // Roll 8 and 6 on d10
      const result = await RestService.spendHitDice(testCharacterId, 2, preRolls);

      // With CON +2: (8+2) + (6+2) = 20 HP
      expect(result.hitDiceSpent).toBe(2);
      expect(result.hpRestored).toBe(20);
      expect(result.rolls).toEqual([8, 6]);

      const remaining = await RestService.getAvailableHitDiceCount(testCharacterId);
      expect(remaining).toBe(3);
    });

    it('should apply minimum 1 HP per die even with negative CON modifier', async () => {
      // Update character to have very low CON (6 = -2 modifier)
      await db
        .update(characterStats)
        .set({ constitution: 6 })
        .where(eq(characterStats.id, testCharacterStatsId));

      // Roll a 1 on the die
      const preRolls = [1];
      const result = await RestService.spendHitDice(testCharacterId, 1, preRolls);

      // Minimum 1 HP even though 1 + (-2) = -1
      expect(result.hpRestored).toBeGreaterThanOrEqual(1);
    });

    it('should throw error when spending more dice than available', async () => {
      await expect(RestService.spendHitDice(testCharacterId, 10)).rejects.toThrow(
        'Cannot spend 10 hit dice. Only 5 available.'
      );
    });

    it('should allow spending 0 hit dice', async () => {
      const result = await RestService.spendHitDice(testCharacterId, 0);

      expect(result.hitDiceSpent).toBe(0);
      expect(result.hpRestored).toBe(0);
      expect(result.rolls).toEqual([]);
    });

    it('should throw error for negative hit dice', async () => {
      await expect(RestService.spendHitDice(testCharacterId, -1)).rejects.toThrow(
        'Cannot spend negative hit dice'
      );
    });

    it('should spend largest hit dice first in multiclass', async () => {
      // Add Wizard levels (d6)
      await RestService.initializeHitDice(testCharacterId, 'Wizard', 2);

      // Fighter has d10, Wizard has d6
      // Should spend d10s first
      const preRolls = [8, 7, 5]; // Three rolls
      const result = await RestService.spendHitDice(testCharacterId, 3, preRolls);

      expect(result.hitDiceSpent).toBe(3);
      // First 2 should be d10 (Fighter), third should be d6 (Wizard)
      // But we pre-rolled them all, so just check total
      expect(result.rolls).toHaveLength(3);

      const fighterDice = await db.query.characterHitDice.findFirst({
        where: eq(characterHitDice.className, 'Fighter'),
      });
      const wizardDice = await db.query.characterHitDice.findFirst({
        where: eq(characterHitDice.className, 'Wizard'),
      });

      // Should spend 2 Fighter dice and 1 Wizard die
      expect(fighterDice?.usedDice).toBe(2);
      expect(wizardDice?.usedDice).toBe(1);
    });
  });

  describe('Restoring Hit Dice (Long Rest)', () => {
    beforeEach(async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 6);
    });

    it('should restore half of total hit dice (rounded down)', async () => {
      // Spend all 6 dice
      await RestService.spendHitDice(testCharacterId, 6, [5, 5, 5, 5, 5, 5]);

      // Restore should give back 3 (half of 6)
      const restored = await RestService.restoreHitDice(testCharacterId);

      expect(restored).toBe(3);

      const available = await RestService.getAvailableHitDiceCount(testCharacterId);
      expect(available).toBe(3);
    });

    it('should restore minimum 1 hit die', async () => {
      // Character with only 1 hit die
      await db.delete(characterHitDice).where(eq(characterHitDice.characterId, testCharacterId));
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 1);

      // Spend the 1 die
      await RestService.spendHitDice(testCharacterId, 1, [5]);

      // Restore should give back 1 (minimum)
      const restored = await RestService.restoreHitDice(testCharacterId);

      expect(restored).toBe(1);
    });

    it('should not restore more than used dice', async () => {
      // Only spend 2 dice
      await RestService.spendHitDice(testCharacterId, 2, [5, 5]);

      // Try to restore (max is 3, but only 2 are used)
      const restored = await RestService.restoreHitDice(testCharacterId);

      expect(restored).toBe(2);
    });

    it('should restore 0 if no dice are used', async () => {
      const restored = await RestService.restoreHitDice(testCharacterId);

      expect(restored).toBe(0);
    });

    it('should restore largest dice first in multiclass', async () => {
      await RestService.initializeHitDice(testCharacterId, 'Wizard', 4);

      // Spend some from each class
      await RestService.spendHitDice(testCharacterId, 6, [5, 5, 5, 5, 5, 5]);

      // Restore (half of 10 = 5)
      const restored = await RestService.restoreHitDice(testCharacterId);

      expect(restored).toBe(5);

      // Should restore Fighter dice (d10) first
      const fighterDice = await db.query.characterHitDice.findFirst({
        where: eq(characterHitDice.className, 'Fighter'),
      });

      // Fighter should have most restored
      expect(fighterDice?.usedDice).toBeLessThanOrEqual(1);
    });
  });

  describe('Short Rest', () => {
    beforeEach(async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);
    });

    it('should complete short rest with 0 hit dice spent', async () => {
      const result = await RestService.takeShortRest(testCharacterId, 0);

      expect(result.restType).toBe('short');
      expect(result.characterId).toBe(testCharacterId);
      expect(result.hitDiceSpent).toBe(0);
      expect(result.hpRestored).toBe(0);
      expect(result.resourcesRestored).toBeDefined();
      expect(result.restEventId).toBeDefined();
    });

    it('should complete short rest with hit dice spent', async () => {
      const result = await RestService.takeShortRest(testCharacterId, 3);

      expect(result.restType).toBe('short');
      expect(result.hitDiceSpent).toBe(3);
      expect(result.hpRestored).toBeGreaterThan(0);
      expect(result.hitDiceRemaining).toBeDefined();

      // Verify rest event was created
      const events = await RestService.getRestHistory(testCharacterId);
      expect(events).toHaveLength(1);
      expect(events[0]!.restType).toBe('short');
      expect(events[0]!.hitDiceSpent).toBe(3);
    });

    it('should restore short rest features', async () => {
      const result = await RestService.takeShortRest(testCharacterId, 0);

      expect(result.resourcesRestored).toBeDefined();
      expect(result.resourcesRestored.length).toBeGreaterThan(0);
    });

    it('should record session ID if provided', async () => {
      const sessionId = 'test-session-id';
      const result = await RestService.takeShortRest(testCharacterId, 0, sessionId);

      const events = await RestService.getRestHistory(testCharacterId, sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]!.sessionId).toBe(sessionId);
    });

    it('should record notes if provided', async () => {
      const notes = 'Rested in the inn';
      const result = await RestService.takeShortRest(testCharacterId, 0, undefined, notes);

      const events = await RestService.getRestHistory(testCharacterId);
      expect(events[0]!.notes).toBe(notes);
    });
  });

  describe('Long Rest', () => {
    beforeEach(async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 6);
      // Spend all hit dice
      await RestService.spendHitDice(testCharacterId, 6, [5, 5, 5, 5, 5, 5]);
    });

    it('should complete long rest', async () => {
      const result = await RestService.takeLongRest(testCharacterId);

      expect(result.restType).toBe('long');
      expect(result.characterId).toBe(testCharacterId);
      expect(result.hitDiceRestored).toBe(3); // Half of 6
      expect(result.resourcesRestored).toBeDefined();
      expect(result.restEventId).toBeDefined();
    });

    it('should restore all resources on long rest', async () => {
      const result = await RestService.takeLongRest(testCharacterId);

      expect(result.resourcesRestored).toBeDefined();
      expect(result.resourcesRestored.length).toBeGreaterThan(0);

      // Should include HP, spell slots, hit dice, and class features
      const resourceTypes = result.resourcesRestored.map((r) => r.resourceType);
      expect(resourceTypes).toContain('hp');
      expect(resourceTypes).toContain('spell_slot');
      expect(resourceTypes).toContain('hit_dice');
      expect(resourceTypes).toContain('class_feature');
    });

    it('should create rest event with correct data', async () => {
      const result = await RestService.takeLongRest(testCharacterId);

      const events = await RestService.getRestHistory(testCharacterId);
      expect(events).toHaveLength(1);
      expect(events[0]!.restType).toBe('long');
      expect(events[0]!.interrupted).toBe(false);
      expect(events[0]!.completedAt).toBeDefined();
    });

    it('should record session ID if provided', async () => {
      const sessionId = 'test-session-id';
      const result = await RestService.takeLongRest(testCharacterId, sessionId);

      const events = await RestService.getRestHistory(testCharacterId, sessionId);
      expect(events).toHaveLength(1);
      expect(events[0]!.sessionId).toBe(sessionId);
    });

    it('should restore minimum 1 hit die', async () => {
      // Character with only 1 hit die
      await db.delete(characterHitDice).where(eq(characterHitDice.characterId, testCharacterId));
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 1);
      await RestService.spendHitDice(testCharacterId, 1, [5]);

      const result = await RestService.takeLongRest(testCharacterId);

      expect(result.hitDiceRestored).toBe(1);
    });
  });

  describe('Rest History', () => {
    beforeEach(async () => {
      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);
    });

    it('should retrieve rest history', async () => {
      await RestService.takeShortRest(testCharacterId, 1);
      await RestService.takeLongRest(testCharacterId);
      await RestService.takeShortRest(testCharacterId, 0);

      const history = await RestService.getRestHistory(testCharacterId);

      expect(history).toHaveLength(3);
      // Most recent first
      expect(history[0]!.restType).toBe('short');
      expect(history[1]!.restType).toBe('long');
      expect(history[2]!.restType).toBe('short');
    });

    it('should filter by session ID', async () => {
      await RestService.takeShortRest(testCharacterId, 1, 'session-1');
      await RestService.takeLongRest(testCharacterId, 'session-2');
      await RestService.takeShortRest(testCharacterId, 0, 'session-1');

      const history = await RestService.getRestHistory(testCharacterId, 'session-1');

      expect(history).toHaveLength(2);
      expect(history[0]!.sessionId).toBe('session-1');
      expect(history[1]!.sessionId).toBe('session-1');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await RestService.takeShortRest(testCharacterId, 0);
      }

      const history = await RestService.getRestHistory(testCharacterId, undefined, 5);

      expect(history).toHaveLength(5);
    });
  });

  describe('Edge Cases', () => {
    it('should throw error for non-existent character', async () => {
      await expect(
        RestService.takeShortRest('non-existent-id', 0)
      ).rejects.toThrow('Character non-existent-id not found');
    });

    it('should throw error when character has no stats', async () => {
      // Delete character stats
      await db.delete(characterStats).where(eq(characterStats.id, testCharacterStatsId));

      await RestService.initializeHitDice(testCharacterId, 'Fighter', 5);

      await expect(
        RestService.spendHitDice(testCharacterId, 1)
      ).rejects.toThrow('has no stats');
    });

    it('should handle character with no hit dice gracefully', async () => {
      const hitDice = await RestService.getHitDice(testCharacterId);
      expect(hitDice).toEqual([]);

      const available = await RestService.getAvailableHitDiceCount(testCharacterId);
      expect(available).toBe(0);
    });

    it('should handle restoring hit dice with no hit dice', async () => {
      const restored = await RestService.restoreHitDice(testCharacterId);
      expect(restored).toBe(0);
    });
  });

  describe('Restorable Resources', () => {
    it('should return correct resources for short rest', async () => {
      const resources = await RestService.getRestorableResources(testCharacterId, 'short');

      expect(resources.length).toBeGreaterThan(0);
      expect(resources.some((r) => r.resourceType === 'class_feature')).toBe(true);
    });

    it('should return correct resources for long rest', async () => {
      const resources = await RestService.getRestorableResources(testCharacterId, 'long');

      expect(resources.length).toBeGreaterThan(0);
      expect(resources.some((r) => r.resourceType === 'hp')).toBe(true);
      expect(resources.some((r) => r.resourceType === 'spell_slot')).toBe(true);
      expect(resources.some((r) => r.resourceType === 'hit_dice')).toBe(true);
      expect(resources.some((r) => r.resourceType === 'class_feature')).toBe(true);
    });
  });
});
