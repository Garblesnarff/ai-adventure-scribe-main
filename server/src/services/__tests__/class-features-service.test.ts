/**
 * Class Features Service Tests
 *
 * Comprehensive test suite for D&D 5E class features system including feature library,
 * character features, subclass selection, and feature usage tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClassFeaturesService } from '../class-features-service.js';
import { db } from '../../../../db/client.js';
import {
  characters,
  classFeaturesLibrary,
  characterFeatures,
  characterSubclasses,
  featureUsageLog,
} from '../../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

describe('ClassFeaturesService', () => {
  let testCharacterId: string;
  let testFeatureIds: string[] = [];

  beforeEach(async () => {
    // Create a test character
    const [character] = await db
      .insert(characters)
      .values({
        userId: 'test-user',
        name: 'Test Fighter',
        class: 'Fighter',
        level: 5,
        race: 'Human',
      })
      .returning();
    testCharacterId = character!.id;

    // Create some test features
    const testFeatures = [
      {
        className: 'Fighter',
        subclassName: null,
        featureName: 'Test Second Wind',
        levelAcquired: 1,
        description: 'Regain HP as a bonus action',
        mechanicalEffects: 'Regain 1d10 + fighter level HP',
        usageType: 'bonus_action' as const,
        usesPerRest: 'short_rest' as const,
        usesCount: 1,
      },
      {
        className: 'Fighter',
        subclassName: null,
        featureName: 'Test Action Surge',
        levelAcquired: 2,
        description: 'Take an additional action',
        mechanicalEffects: 'Take one additional action on your turn',
        usageType: 'action' as const,
        usesPerRest: 'short_rest' as const,
        usesCount: 1,
      },
      {
        className: 'Fighter',
        subclassName: 'Champion',
        featureName: 'Test Improved Critical',
        levelAcquired: 3,
        description: 'Critical hits on 19-20',
        mechanicalEffects: 'Critical hits on 19-20',
        usageType: 'passive' as const,
        usesPerRest: 'at_will' as const,
        usesCount: null,
      },
      {
        className: 'Fighter',
        subclassName: null,
        featureName: 'Test Indomitable',
        levelAcquired: 9,
        description: 'Reroll failed save',
        mechanicalEffects: 'Reroll a failed saving throw',
        usageType: 'reaction' as const,
        usesPerRest: 'long_rest' as const,
        usesCount: 1,
      },
    ];

    const insertedFeatures = await db
      .insert(classFeaturesLibrary)
      .values(testFeatures)
      .returning();

    testFeatureIds = insertedFeatures.map((f) => f.id);
  });

  afterEach(async () => {
    // Clean up test data
    if (testCharacterId) {
      await db.delete(featureUsageLog).where(eq(featureUsageLog.characterId, testCharacterId));
      await db.delete(characterSubclasses).where(eq(characterSubclasses.characterId, testCharacterId));
      await db.delete(characterFeatures).where(eq(characterFeatures.characterId, testCharacterId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }

    // Clean up test features
    for (const featureId of testFeatureIds) {
      await db.delete(classFeaturesLibrary).where(eq(classFeaturesLibrary.id, featureId));
    }
    testFeatureIds = [];
  });

  describe('Feature Library Management', () => {
    it('should get all features', async () => {
      const features = await ClassFeaturesService.getFeaturesLibrary();
      expect(features.length).toBeGreaterThan(0);
    });

    it('should filter features by class name', async () => {
      const features = await ClassFeaturesService.getFeaturesLibrary({
        className: 'Fighter',
      });

      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.className).toBe('Fighter');
      });
    });

    it('should filter features by subclass', async () => {
      const features = await ClassFeaturesService.getFeaturesLibrary({
        className: 'Fighter',
        subclass: 'Champion',
      });

      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.className).toBe('Fighter');
        expect(f.subclassName).toBe('Champion');
      });
    });

    it('should filter features by level', async () => {
      const features = await ClassFeaturesService.getFeaturesLibrary({
        className: 'Fighter',
        level: 1,
      });

      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.className).toBe('Fighter');
        expect(f.levelAcquired).toBe(1);
      });
    });

    it('should get specific feature by ID', async () => {
      const feature = await ClassFeaturesService.getFeatureById(testFeatureIds[0]!);

      expect(feature).toBeDefined();
      expect(feature?.id).toBe(testFeatureIds[0]!);
      expect(feature?.featureName).toBe('Test Second Wind');
    });

    it('should return null for non-existent feature', async () => {
      const feature = await ClassFeaturesService.getFeatureById('non-existent-id');
      expect(feature).toBeNull();
    });

    it('should get features by class and level', async () => {
      const features = await ClassFeaturesService.getFeaturesByLevel('Fighter', 1);

      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.className).toBe('Fighter');
        expect(f.levelAcquired).toBe(1);
      });
    });

    it('should get correct subclass choice level', () => {
      expect(ClassFeaturesService.getSubclassChoiceLevel('Fighter')).toBe(3);
      expect(ClassFeaturesService.getSubclassChoiceLevel('Wizard')).toBe(2);
      expect(ClassFeaturesService.getSubclassChoiceLevel('Cleric')).toBe(1);
      expect(ClassFeaturesService.getSubclassChoiceLevel('Warlock')).toBe(1);
      expect(ClassFeaturesService.getSubclassChoiceLevel('Rogue')).toBe(3);
    });
  });

  describe('Character Feature Management', () => {
    it('should grant a feature to a character', async () => {
      const granted = await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });

      expect(granted).toBeDefined();
      expect(granted.characterId).toBe(testCharacterId);
      expect(granted.featureId).toBe(testFeatureIds[0]!);
      expect(granted.acquiredAtLevel).toBe(1);
      expect(granted.usesRemaining).toBe(1); // Test Second Wind has 1 use
      expect(granted.isActive).toBe(true);
    });

    it('should throw error when granting non-existent feature', async () => {
      await expect(
        ClassFeaturesService.grantFeature({
          characterId: testCharacterId,
          featureId: 'non-existent-feature',
          acquiredAtLevel: 1,
        })
      ).rejects.toThrow('Feature non-existent-feature not found');
    });

    it('should throw error when granting duplicate feature', async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });

      await expect(
        ClassFeaturesService.grantFeature({
          characterId: testCharacterId,
          featureId: testFeatureIds[0]!,
          acquiredAtLevel: 1,
        })
      ).rejects.toThrow('already granted');
    });

    it('should get all features for a character', async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!,
        acquiredAtLevel: 2,
      });

      const features = await ClassFeaturesService.getCharacterFeatures(testCharacterId);

      expect(features).toHaveLength(2);
      expect(features[0]!.featureId).toBe(testFeatureIds[0]!);
      expect(features[1]!.featureId).toBe(testFeatureIds[1]!);
    });

    it('should get feature usage information', async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });

      const usesRemaining = await ClassFeaturesService.getFeatureUsage(
        testCharacterId,
        testFeatureIds[0]!
      );

      expect(usesRemaining).toBe(1);
    });

    it('should throw error for non-existent character feature', async () => {
      await expect(
        ClassFeaturesService.getFeatureUsage(testCharacterId, testFeatureIds[0]!)
      ).rejects.toThrow('Feature not found for character');
    });

    it('should get character features with usage information', async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!,
        acquiredAtLevel: 2,
      });

      const result = await ClassFeaturesService.getCharacterFeaturesWithUsage(testCharacterId);

      expect(result.features).toHaveLength(2);
      expect(result.usesRemaining[testFeatureIds[0]!]).toBe(1);
      expect(result.usesRemaining[testFeatureIds[1]!]).toBe(1);
    });
  });

  describe('Feature Usage', () => {
    beforeEach(async () => {
      // Grant test features to character
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!, // Second Wind - short rest
        acquiredAtLevel: 1,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[2]!, // Improved Critical - passive
        acquiredAtLevel: 3,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[3]!, // Indomitable - long rest
        acquiredAtLevel: 9,
      });
    });

    it('should use a limited-use feature successfully', async () => {
      const result = await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });

      expect(result.success).toBe(true);
      expect(result.usesRemaining).toBe(0);
      expect(result.message).toContain('Test Second Wind used');
    });

    it('should fail to use feature with no uses remaining', async () => {
      // Use the feature once
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });

      // Try to use it again
      const result = await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No uses remaining');
    });

    it('should handle passive features (unlimited uses)', async () => {
      const result = await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[2]!, // Passive feature
      });

      expect(result.success).toBe(true);
      expect(result.usesRemaining).toBe(-1); // -1 indicates unlimited
    });

    it('should log feature usage', async () => {
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        context: 'Used in combat',
        sessionId: 'test-session',
      });

      const history = await ClassFeaturesService.getFeatureUsageHistory({
        characterId: testCharacterId,
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]!.featureId).toBe(testFeatureIds[0]!);
      expect(history[0]!.context).toBe('Used in combat');
    });

    it('should return error for non-existent feature', async () => {
      const result = await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: 'non-existent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Feature Restoration', () => {
    beforeEach(async () => {
      // Grant multiple features with different rest types
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!, // Second Wind - short rest
        acquiredAtLevel: 1,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!, // Action Surge - short rest
        acquiredAtLevel: 2,
      });
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[3]!, // Indomitable - long rest
        acquiredAtLevel: 9,
      });

      // Use all features
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!,
      });
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[3]!,
      });
    });

    it('should restore short rest features on short rest', async () => {
      const result = await ClassFeaturesService.restoreFeatures({
        characterId: testCharacterId,
        restType: 'short',
      });

      expect(result.restoredCount).toBeGreaterThan(0);
      expect(result.featuresRestored).toContain('Test Second Wind');
      expect(result.featuresRestored).toContain('Test Action Surge');
      expect(result.featuresRestored).not.toContain('Test Indomitable'); // Long rest only

      // Verify uses are restored
      const secondWindUses = await ClassFeaturesService.getFeatureUsage(
        testCharacterId,
        testFeatureIds[0]!
      );
      expect(secondWindUses).toBe(1);
    });

    it('should restore all features on long rest', async () => {
      const result = await ClassFeaturesService.restoreFeatures({
        characterId: testCharacterId,
        restType: 'long',
      });

      expect(result.restoredCount).toBeGreaterThan(0);
      expect(result.featuresRestored).toContain('Test Second Wind');
      expect(result.featuresRestored).toContain('Test Action Surge');
      expect(result.featuresRestored).toContain('Test Indomitable');

      // Verify all uses are restored
      const indomitableUses = await ClassFeaturesService.getFeatureUsage(
        testCharacterId,
        testFeatureIds[3]!
      );
      expect(indomitableUses).toBe(1);
    });
  });

  describe('Subclass Management', () => {
    it('should set a character subclass', async () => {
      const result = await ClassFeaturesService.setSubclass({
        characterId: testCharacterId,
        className: 'Fighter',
        subclassName: 'Champion',
        level: 3,
      });

      expect(result.subclass).toBe('Champion');
      expect(result.message).toContain('Champion');
    });

    it('should throw error for invalid subclass', async () => {
      await expect(
        ClassFeaturesService.setSubclass({
          characterId: testCharacterId,
          className: 'Fighter',
          subclassName: 'Invalid Subclass',
          level: 3,
        })
      ).rejects.toThrow('not a valid subclass');
    });

    it('should throw error when setting subclass too early', async () => {
      await expect(
        ClassFeaturesService.setSubclass({
          characterId: testCharacterId,
          className: 'Fighter',
          subclassName: 'Champion',
          level: 2, // Fighter chooses at 3
        })
      ).rejects.toThrow('chooses subclass at level');
    });

    it('should prevent changing subclass once set', async () => {
      await ClassFeaturesService.setSubclass({
        characterId: testCharacterId,
        className: 'Fighter',
        subclassName: 'Champion',
        level: 3,
      });

      await expect(
        ClassFeaturesService.setSubclass({
          characterId: testCharacterId,
          className: 'Fighter',
          subclassName: 'Battle Master',
          level: 3,
        })
      ).rejects.toThrow('already has subclass');
    });

    it('should get character subclass', async () => {
      await ClassFeaturesService.setSubclass({
        characterId: testCharacterId,
        className: 'Fighter',
        subclassName: 'Champion',
        level: 3,
      });

      const subclass = await ClassFeaturesService.getCharacterSubclass(
        testCharacterId,
        'Fighter'
      );

      expect(subclass).toBeDefined();
      expect(subclass?.subclassName).toBe('Champion');
      expect(subclass?.chosenAtLevel).toBe(3);
    });

    it('should return null for non-existent subclass', async () => {
      const subclass = await ClassFeaturesService.getCharacterSubclass(
        testCharacterId,
        'Fighter'
      );

      expect(subclass).toBeNull();
    });

    it('should get available subclasses for a class', () => {
      const result = ClassFeaturesService.getAvailableSubclasses('Fighter');

      expect(result.className).toBe('Fighter');
      expect(result.subclasses).toContain('Champion');
      expect(result.subclasses).toContain('Battle Master');
      expect(result.subclasses).toContain('Eldritch Knight');
    });
  });

  describe('Feature Usage History', () => {
    beforeEach(async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        acquiredAtLevel: 1,
      });
    });

    it('should get feature usage history', async () => {
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
        context: 'First use',
      });

      const history = await ClassFeaturesService.getFeatureUsageHistory({
        characterId: testCharacterId,
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]!.characterId).toBe(testCharacterId);
      expect(history[0]!.featureId).toBe(testFeatureIds[0]!);
    });

    it('should filter history by feature ID', async () => {
      await ClassFeaturesService.grantFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!,
        acquiredAtLevel: 2,
      });

      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });
      await ClassFeaturesService.useFeature({
        characterId: testCharacterId,
        featureId: testFeatureIds[1]!,
      });

      const history = await ClassFeaturesService.getFeatureUsageHistory({
        characterId: testCharacterId,
        featureId: testFeatureIds[0]!,
      });

      expect(history.length).toBeGreaterThan(0);
      history.forEach((entry) => {
        expect(entry.featureId).toBe(testFeatureIds[0]!);
      });
    });

    it('should limit history results', async () => {
      // Use feature multiple times
      for (let i = 0; i < 10; i++) {
        await ClassFeaturesService.logFeatureUsage(
          testCharacterId,
          testFeatureIds[0]!
        );
      }

      const history = await ClassFeaturesService.getFeatureUsageHistory({
        characterId: testCharacterId,
        limit: 5,
      });

      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Level-up Integration', () => {
    it('should grant all features for a level', async () => {
      const grantedFeatures = await ClassFeaturesService.grantFeaturesForLevel(
        testCharacterId,
        'Fighter',
        1
      );

      expect(grantedFeatures.length).toBeGreaterThan(0);
      grantedFeatures.forEach((feature) => {
        expect(feature.className).toBe('Fighter');
        expect(feature.levelAcquired).toBe(1);
      });
    });

    it('should not duplicate features when called multiple times', async () => {
      await ClassFeaturesService.grantFeaturesForLevel(
        testCharacterId,
        'Fighter',
        1
      );

      // Call again - should skip duplicates
      const secondCall = await ClassFeaturesService.grantFeaturesForLevel(
        testCharacterId,
        'Fighter',
        1
      );

      expect(secondCall.length).toBe(0); // No new features granted
    });
  });
});
