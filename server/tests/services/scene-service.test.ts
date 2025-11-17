/**
 * Scene Service Tests
 *
 * Tests for Foundry VTT scene management operations including:
 * - Creating scenes with default layers
 * - Retrieving scenes with settings and layers
 * - Updating scene properties
 * - Deleting scenes and cascading
 * - Listing scenes for a campaign
 * - Authorization checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SceneService } from '../../src/services/scene-service.js';
import {
  createTestCampaign,
  createTestScene,
  cleanupFoundryTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../factories/foundry-factories.js';
import { db } from '../../../db/client.js';
import { scenes, sceneLayers, sceneSettings } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('SceneService', () => {
  let testCampaign: any;
  let testCampaign2: any;

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();
    testCampaign = await createTestCampaign(TEST_USER_ID, { name: 'Test Campaign 1' });
    testCampaign2 = await createTestCampaign(TEST_USER_ID_2, { name: 'Test Campaign 2' });
  });

  afterEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();
  });

  describe('createScene', () => {
    it('should create a scene with default layers', async () => {
      if (!process.env.DATABASE_URL) return;

      const sceneData = {
        name: 'Dungeon Level 1',
        description: 'A dark and scary dungeon',
        campaignId: testCampaign.id,
        width: 30,
        height: 30,
        gridSize: 5,
        gridType: 'square',
        gridColor: '#000000',
      };

      const scene = await SceneService.createScene(TEST_USER_ID, sceneData);

      expect(scene).toBeDefined();
      expect(scene.id).toBeDefined();
      expect(scene.name).toBe('Dungeon Level 1');
      expect(scene.description).toBe('A dark and scary dungeon');
      expect(scene.campaignId).toBe(testCampaign.id);
      expect(scene.userId).toBe(TEST_USER_ID);
      expect(scene.width).toBe(30);
      expect(scene.height).toBe(30);
      expect(scene.gridSize).toBe(5);
      expect(scene.gridType).toBe('square');
      expect(scene.isActive).toBe(false);

      // Verify default layers were created
      const layers = await db.query.sceneLayers.findMany({
        where: eq(sceneLayers.sceneId, scene.id),
      });

      expect(layers.length).toBeGreaterThanOrEqual(6);
      expect(layers.some((l) => l.layerType === 'background')).toBe(true);
      expect(layers.some((l) => l.layerType === 'grid')).toBe(true);
      expect(layers.some((l) => l.layerType === 'tokens')).toBe(true);
      expect(layers.some((l) => l.layerType === 'effects')).toBe(true);

      // Verify default settings were created
      const settings = await db.query.sceneSettings.findFirst({
        where: eq(sceneSettings.sceneId, scene.id),
      });

      expect(settings).toBeDefined();
      expect(settings?.enableFogOfWar).toBe(false);
      expect(settings?.enableDynamicLighting).toBe(false);
      expect(settings?.snapToGrid).toBe(true);
    });

    it('should create scene with minimal data using defaults', async () => {
      if (!process.env.DATABASE_URL) return;

      const sceneData = {
        name: 'Minimal Scene',
        campaignId: testCampaign.id,
      };

      const scene = await SceneService.createScene(TEST_USER_ID, sceneData);

      expect(scene).toBeDefined();
      expect(scene.name).toBe('Minimal Scene');
      expect(scene.width).toBe(20); // default
      expect(scene.height).toBe(20); // default
      expect(scene.gridSize).toBe(5); // default
      expect(scene.gridType).toBe('square'); // default
      expect(scene.gridColor).toBe('#000000'); // default
    });

    it('should throw error if campaign not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const sceneData = {
        name: 'Invalid Scene',
        campaignId: '00000000-0000-0000-0000-000000000000',
      };

      await expect(SceneService.createScene(TEST_USER_ID, sceneData)).rejects.toThrow('Campaign');
    });

    it('should throw error if user does not own campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const sceneData = {
        name: 'Unauthorized Scene',
        campaignId: testCampaign2.id, // owned by TEST_USER_ID_2
      };

      await expect(SceneService.createScene(TEST_USER_ID, sceneData)).rejects.toThrow();
    });
  });

  describe('getSceneById', () => {
    it('should return scene with settings and layers', async () => {
      if (!process.env.DATABASE_URL) return;

      const createdScene = await SceneService.createScene(TEST_USER_ID, {
        name: 'Retrievable Scene',
        campaignId: testCampaign.id,
      });

      const scene = await SceneService.getSceneById(createdScene.id, TEST_USER_ID);

      expect(scene).toBeDefined();
      expect(scene?.id).toBe(createdScene.id);
      expect(scene?.name).toBe('Retrievable Scene');
      expect(scene?.settings).toBeDefined();
      expect(scene?.layers).toBeDefined();
      expect(scene?.layers.length).toBeGreaterThan(0);

      // Verify layers are ordered by zIndex
      const zIndices = scene!.layers.map((l) => l.zIndex);
      const sortedZIndices = [...zIndices].sort((a, b) => a - b);
      expect(zIndices).toEqual(sortedZIndices);
    });

    it('should return null for non-existent scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.getSceneById('00000000-0000-0000-0000-000000000000', TEST_USER_ID);

      expect(scene).toBeNull();
    });

    it('should return null when user tries to access another users scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene1 = await SceneService.createScene(TEST_USER_ID, {
        name: 'User 1 Scene',
        campaignId: testCampaign.id,
      });

      const result = await SceneService.getSceneById(scene1.id, TEST_USER_ID_2);

      expect(result).toBeNull();
    });
  });

  describe('updateScene', () => {
    it('should update scene properties', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'Original Name',
        description: 'Original Description',
        campaignId: testCampaign.id,
      });

      const updated = await SceneService.updateScene(scene.id, TEST_USER_ID, {
        name: 'Updated Name',
        description: 'Updated Description',
        width: 40,
        height: 40,
        isActive: true,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(updated.width).toBe(40);
      expect(updated.height).toBe(40);
      expect(updated.isActive).toBe(true);
      expect(updated.id).toBe(scene.id);
    });

    it('should update only provided fields', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'Original',
        description: 'Original Description',
        campaignId: testCampaign.id,
        width: 20,
      });

      const updated = await SceneService.updateScene(scene.id, TEST_USER_ID, {
        name: 'Partially Updated',
      });

      expect(updated.name).toBe('Partially Updated');
      expect(updated.description).toBe('Original Description');
      expect(updated.width).toBe(20);
    });

    it('should throw error if scene not found', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        SceneService.updateScene('00000000-0000-0000-0000-000000000000', TEST_USER_ID, {
          name: 'Updated',
        })
      ).rejects.toThrow('Scene');
    });

    it('should throw error if user does not own scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'User 1 Scene',
        campaignId: testCampaign.id,
      });

      await expect(
        SceneService.updateScene(scene.id, TEST_USER_ID_2, {
          name: 'Hacked',
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteScene', () => {
    it('should delete scene and cascade to related records', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene to Delete',
        campaignId: testCampaign.id,
      });

      const sceneId = scene.id;

      const result = await SceneService.deleteScene(sceneId, TEST_USER_ID);

      expect(result).toBe(true);

      // Verify scene is deleted
      const deletedScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneId),
      });
      expect(deletedScene).toBeUndefined();

      // Verify layers are deleted (cascade)
      const layers = await db.query.sceneLayers.findMany({
        where: eq(sceneLayers.sceneId, sceneId),
      });
      expect(layers.length).toBe(0);

      // Verify settings are deleted (cascade)
      const settings = await db.query.sceneSettings.findFirst({
        where: eq(sceneSettings.sceneId, sceneId),
      });
      expect(settings).toBeUndefined();
    });

    it('should throw error if scene not found', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        SceneService.deleteScene('00000000-0000-0000-0000-000000000000', TEST_USER_ID)
      ).rejects.toThrow('Scene');
    });

    it('should throw error if user does not own scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'User 1 Scene',
        campaignId: testCampaign.id,
      });

      await expect(SceneService.deleteScene(scene.id, TEST_USER_ID_2)).rejects.toThrow();
    });
  });

  describe('listScenesForCampaign', () => {
    it('should return all scenes for a campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene 1',
        campaignId: testCampaign.id,
      });
      await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene 2',
        campaignId: testCampaign.id,
      });
      await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene 3',
        campaignId: testCampaign.id,
      });

      const sceneList = await SceneService.listScenesForCampaign(testCampaign.id, TEST_USER_ID);

      expect(sceneList.length).toBe(3);
      expect(sceneList.every((s) => s.campaignId === testCampaign.id)).toBe(true);
      expect(sceneList.every((s) => s.userId === TEST_USER_ID)).toBe(true);

      const names = sceneList.map((s) => s.name);
      expect(names).toContain('Scene 1');
      expect(names).toContain('Scene 2');
      expect(names).toContain('Scene 3');
    });

    it('should return empty array for campaign with no scenes', async () => {
      if (!process.env.DATABASE_URL) return;

      const sceneList = await SceneService.listScenesForCampaign(testCampaign.id, TEST_USER_ID);

      expect(sceneList.length).toBe(0);
    });

    it('should throw error if campaign not found', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        SceneService.listScenesForCampaign('00000000-0000-0000-0000-000000000000', TEST_USER_ID)
      ).rejects.toThrow('Campaign');
    });

    it('should throw error if user does not own campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        SceneService.listScenesForCampaign(testCampaign2.id, TEST_USER_ID)
      ).rejects.toThrow();
    });
  });

  describe('authorization', () => {
    it('should prevent users from accessing other users scenes', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene1 = await SceneService.createScene(TEST_USER_ID, {
        name: 'User 1 Scene',
        campaignId: testCampaign.id,
      });

      // User 2 should not be able to get User 1's scene
      const getResult = await SceneService.getSceneById(scene1.id, TEST_USER_ID_2);
      expect(getResult).toBeNull();

      // User 2 should not be able to update User 1's scene
      await expect(
        SceneService.updateScene(scene1.id, TEST_USER_ID_2, { name: 'Hacked' })
      ).rejects.toThrow();

      // User 2 should not be able to delete User 1's scene
      await expect(SceneService.deleteScene(scene1.id, TEST_USER_ID_2)).rejects.toThrow();

      // Verify scene still exists and is unchanged
      const verifyScene = await SceneService.getSceneById(scene1.id, TEST_USER_ID);
      expect(verifyScene?.name).toBe('User 1 Scene');
    });
  });

  describe('setActiveScene', () => {
    it('should set a scene as active and deactivate others', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene1 = await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene 1',
        campaignId: testCampaign.id,
      });
      const scene2 = await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene 2',
        campaignId: testCampaign.id,
      });

      // Set scene1 as active
      const activeScene = await SceneService.setActiveScene(scene1.id, testCampaign.id, TEST_USER_ID);

      expect(activeScene.id).toBe(scene1.id);
      expect(activeScene.isActive).toBe(true);

      // Verify scene2 is inactive
      const inactiveScene = await SceneService.getSceneById(scene2.id, TEST_USER_ID);
      expect(inactiveScene?.isActive).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update scene settings', async () => {
      if (!process.env.DATABASE_URL) return;

      const scene = await SceneService.createScene(TEST_USER_ID, {
        name: 'Scene with Settings',
        campaignId: testCampaign.id,
      });

      const settings = await SceneService.updateSettings(scene.id, TEST_USER_ID, {
        enableFogOfWar: true,
        enableDynamicLighting: true,
        ambientLightLevel: '0.50',
        darknessLevel: '0.75',
      });

      expect(settings.enableFogOfWar).toBe(true);
      expect(settings.enableDynamicLighting).toBe(true);
      expect(settings.ambientLightLevel).toBe('0.50');
      expect(settings.darknessLevel).toBe('0.75');
    });
  });
});
