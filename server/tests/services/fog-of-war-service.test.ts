/**
 * Fog of War Service Tests
 *
 * Tests for Foundry VTT fog of war operations including:
 * - Revealing areas with polygon data
 * - Batch reveal operations
 * - Concealing specific areas
 * - Batch conceal operations
 * - Getting revealed areas for a user
 * - Resetting fog of war
 * - Validation of polygon data
 * - Broadcast callbacks for WebSocket updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FogOfWarService } from '../../src/services/fog-of-war-service.js';
import {
  createTestCampaign,
  createTestScene,
  createTestFogOfWar,
  cleanupFoundryTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../factories/foundry-factories.js';
import { db } from '../../../db/client.js';
import { fogOfWar } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

describe('FogOfWarService', () => {
  let testCampaign: any;
  let testScene: any;

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();

    testCampaign = await createTestCampaign(TEST_USER_ID, { name: 'Test Campaign' });
    testScene = await createTestScene(TEST_USER_ID, testCampaign.id, { name: 'Test Scene' });
  });

  afterEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();
  });

  describe('revealArea', () => {
    it('should reveal a new area on the map', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        revealedBy: 'player1',
        isPermanent: true,
      };

      const revealedArea = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon);

      expect(revealedArea).toBeDefined();
      expect(revealedArea.id).toBeDefined();
      expect(revealedArea.points).toEqual(polygon.points);
      expect(revealedArea.revealedBy).toBe('player1');
      expect(revealedArea.isPermanent).toBe(true);
      expect(revealedArea.revealedAt).toBeDefined();

      // Verify fog record was created
      const fogRecord = await db.query.fogOfWar.findFirst({
        where: and(eq(fogOfWar.sceneId, testScene.id), eq(fogOfWar.userId, TEST_USER_ID)),
      });

      expect(fogRecord).toBeDefined();
      expect(fogRecord?.revealedAreas).toBeDefined();
      expect(Array.isArray(fogRecord?.revealedAreas)).toBe(true);
      expect((fogRecord?.revealedAreas as any[]).length).toBe(1);
    });

    it('should add to existing revealed areas', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon1 = {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      };

      const polygon2 = {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      };

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon1);
      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon2);

      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);

      expect(areas.length).toBe(2);
      expect(areas[0].points).toEqual(polygon1.points);
      expect(areas[1].points).toEqual(polygon2.points);
    });

    it('should call broadcast callback when provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      };

      const broadcastMock = vi.fn();

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fog:reveal',
          sceneId: testScene.id,
          userId: TEST_USER_ID,
          timestamp: expect.any(Number),
          data: expect.objectContaining({
            areas: expect.arrayContaining([
              expect.objectContaining({
                points: polygon.points,
              }),
            ]),
            userId: TEST_USER_ID,
          }),
        })
      );
    });

    it('should throw error for polygon with less than 3 points', async () => {
      if (!process.env.DATABASE_URL) return;

      const invalidPolygon = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      };

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, invalidPolygon)
      ).rejects.toThrow('at least 3 points');
    });

    it('should throw error for invalid point coordinates', async () => {
      if (!process.env.DATABASE_URL) return;

      const invalidPolygon = {
        points: [
          { x: 0, y: 0 },
          { x: 'invalid', y: 0 } as any,
          { x: 10, y: 10 },
        ],
      };

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, invalidPolygon)
      ).rejects.toThrow('numeric x and y coordinates');
    });

    it('should default isPermanent to true', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon = {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      };

      const area = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon);

      expect(area.isPermanent).toBe(true);
    });
  });

  describe('revealAreas', () => {
    it('should reveal multiple areas at once', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygons = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ],
        },
        {
          points: [
            { x: 10, y: 10 },
            { x: 15, y: 10 },
            { x: 15, y: 15 },
          ],
        },
        {
          points: [
            { x: 20, y: 20 },
            { x: 25, y: 20 },
            { x: 25, y: 25 },
          ],
        },
      ];

      const revealedAreas = await FogOfWarService.revealAreas(testScene.id, TEST_USER_ID, polygons);

      expect(revealedAreas.length).toBe(3);
      expect(revealedAreas[0].points).toEqual(polygons[0].points);
      expect(revealedAreas[1].points).toEqual(polygons[1].points);
      expect(revealedAreas[2].points).toEqual(polygons[2].points);

      // Verify all areas are in the database
      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(areas.length).toBe(3);
    });

    it('should return empty array when no areas provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await FogOfWarService.revealAreas(testScene.id, TEST_USER_ID, []);

      expect(result).toEqual([]);
    });

    it('should call broadcast callback with all areas', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygons = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ],
        },
        {
          points: [
            { x: 10, y: 10 },
            { x: 15, y: 10 },
            { x: 15, y: 15 },
          ],
        },
      ];

      const broadcastMock = vi.fn();

      await FogOfWarService.revealAreas(testScene.id, TEST_USER_ID, polygons, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fog:reveal',
          data: expect.objectContaining({
            areas: expect.arrayContaining([
              expect.objectContaining({ points: polygons[0].points }),
              expect.objectContaining({ points: polygons[1].points }),
            ]),
          }),
        })
      );
    });

    it('should throw error if any polygon is invalid', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygons = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ],
        },
        {
          points: [
            { x: 10, y: 10 },
            { x: 15, y: 10 },
          ], // Only 2 points - invalid
        },
      ];

      await expect(
        FogOfWarService.revealAreas(testScene.id, TEST_USER_ID, polygons)
      ).rejects.toThrow('at least 3 points');
    });
  });

  describe('concealArea', () => {
    it('should remove a specific revealed area by ID', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon1 = {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      };
      const polygon2 = {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      };

      const area1 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon1);
      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon2);

      const result = await FogOfWarService.concealArea(testScene.id, TEST_USER_ID, area1.id);

      expect(result).toBe(true);

      // Verify only polygon2 remains
      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(areas.length).toBe(1);
      expect(areas[0].points).toEqual(polygon2.points);
    });

    it('should return false if area ID not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await FogOfWarService.concealArea(
        testScene.id,
        TEST_USER_ID,
        'non-existent-id'
      );

      expect(result).toBe(false);
    });

    it('should return false if no fog record exists', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await FogOfWarService.concealArea(testScene.id, TEST_USER_ID, 'any-id');

      expect(result).toBe(false);
    });

    it('should call broadcast callback when area is concealed', async () => {
      if (!process.env.DATABASE_URL) return;

      const polygon = {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      };

      const area = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon);

      const broadcastMock = vi.fn();

      await FogOfWarService.concealArea(testScene.id, TEST_USER_ID, area.id, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fog:conceal',
          sceneId: testScene.id,
          userId: TEST_USER_ID,
          data: expect.objectContaining({
            areas: expect.arrayContaining([
              expect.objectContaining({
                id: area.id,
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('concealAreas', () => {
    it('should remove multiple revealed areas by IDs', async () => {
      if (!process.env.DATABASE_URL) return;

      const area1 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      const area2 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      const area3 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 20, y: 20 },
          { x: 25, y: 20 },
          { x: 25, y: 25 },
        ],
      });

      const concealedAreas = await FogOfWarService.concealAreas(
        testScene.id,
        TEST_USER_ID,
        [area1.id, area2.id]
      );

      expect(concealedAreas.length).toBe(2);
      expect(concealedAreas.map((a) => a.id)).toContain(area1.id);
      expect(concealedAreas.map((a) => a.id)).toContain(area2.id);

      // Verify only area3 remains
      const remainingAreas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(remainingAreas.length).toBe(1);
      expect(remainingAreas[0].id).toBe(area3.id);
    });

    it('should return empty array when no IDs provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await FogOfWarService.concealAreas(testScene.id, TEST_USER_ID, []);

      expect(result).toEqual([]);
    });

    it('should return empty array if no fog record exists', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await FogOfWarService.concealAreas(testScene.id, TEST_USER_ID, ['id1', 'id2']);

      expect(result).toEqual([]);
    });

    it('should call broadcast callback with concealed areas', async () => {
      if (!process.env.DATABASE_URL) return;

      const area1 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      const area2 = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      const broadcastMock = vi.fn();

      await FogOfWarService.concealAreas(
        testScene.id,
        TEST_USER_ID,
        [area1.id, area2.id],
        broadcastMock
      );

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fog:conceal',
          data: expect.objectContaining({
            areas: expect.arrayContaining([
              expect.objectContaining({ id: area1.id }),
              expect.objectContaining({ id: area2.id }),
            ]),
          }),
        })
      );
    });
  });

  describe('getRevealedAreas', () => {
    it('should return all revealed areas for a user in a scene', async () => {
      if (!process.env.DATABASE_URL) return;

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);

      expect(areas.length).toBe(2);
      expect(areas[0]).toHaveProperty('id');
      expect(areas[0]).toHaveProperty('points');
      expect(areas[0]).toHaveProperty('revealedAt');
      expect(areas[0]).toHaveProperty('isPermanent');
    });

    it('should return empty array if no fog record exists', async () => {
      if (!process.env.DATABASE_URL) return;

      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);

      expect(areas).toEqual([]);
    });

    it('should return user-specific fog data', async () => {
      if (!process.env.DATABASE_URL) return;

      // User 1 reveals an area
      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      // User 2 reveals a different area
      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID_2, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      // User 1 should only see their own revealed areas
      const user1Areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(user1Areas.length).toBe(1);
      expect(user1Areas[0].points[0].x).toBe(0);

      // User 2 should only see their own revealed areas
      const user2Areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID_2);
      expect(user2Areas.length).toBe(1);
      expect(user2Areas[0].points[0].x).toBe(10);
    });
  });

  describe('resetFogOfWar', () => {
    it('should clear all revealed areas for a user', async () => {
      if (!process.env.DATABASE_URL) return;

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      await FogOfWarService.resetFogOfWar(testScene.id, TEST_USER_ID);

      const areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(areas).toEqual([]);
    });

    it('should not throw error if no fog record exists', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.resetFogOfWar(testScene.id, TEST_USER_ID)
      ).resolves.toBeUndefined();
    });

    it('should only reset fog for specific user', async () => {
      if (!process.env.DATABASE_URL) return;

      // Both users reveal areas
      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID_2, {
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 15 },
        ],
      });

      // Reset only for User 1
      await FogOfWarService.resetFogOfWar(testScene.id, TEST_USER_ID);

      // User 1 should have no areas
      const user1Areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID);
      expect(user1Areas).toEqual([]);

      // User 2 should still have their areas
      const user2Areas = await FogOfWarService.getRevealedAreas(testScene.id, TEST_USER_ID_2);
      expect(user2Areas.length).toBe(1);
    });
  });

  describe('validation', () => {
    it('should reject polygon with less than 3 points', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 5 },
          ],
        })
      ).rejects.toThrow('at least 3 points');
    });

    it('should reject polygon with invalid coordinates', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
          points: [
            { x: 0, y: 0 },
            { x: null, y: 5 } as any,
            { x: 5, y: 5 },
          ],
        })
      ).rejects.toThrow('numeric x and y coordinates');
    });

    it('should reject polygon with missing x coordinate', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
          points: [
            { x: 0, y: 0 },
            { y: 5 } as any,
            { x: 5, y: 5 },
          ],
        })
      ).rejects.toThrow('numeric x and y coordinates');
    });

    it('should reject polygon with missing y coordinate', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
          points: [
            { x: 0, y: 0 },
            { x: 5 } as any,
            { x: 5, y: 5 },
          ],
        })
      ).rejects.toThrow('numeric x and y coordinates');
    });
  });

  describe('broadcast callback', () => {
    it('should call broadcast with correct message structure on reveal', async () => {
      if (!process.env.DATABASE_URL) return;

      const broadcastMock = vi.fn();

      const polygon = {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
        revealedBy: 'player1',
      };

      await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, polygon, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'fog:reveal',
        sceneId: testScene.id,
        userId: TEST_USER_ID,
        timestamp: expect.any(Number),
        data: {
          areas: expect.arrayContaining([
            expect.objectContaining({
              points: polygon.points,
              revealedBy: 'player1',
            }),
          ]),
          userId: TEST_USER_ID,
        },
      });
    });

    it('should call broadcast with correct message structure on conceal', async () => {
      if (!process.env.DATABASE_URL) return;

      const area = await FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      });

      const broadcastMock = vi.fn();

      await FogOfWarService.concealArea(testScene.id, TEST_USER_ID, area.id, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'fog:conceal',
        sceneId: testScene.id,
        userId: TEST_USER_ID,
        timestamp: expect.any(Number),
        data: {
          areas: [
            expect.objectContaining({
              id: area.id,
            }),
          ],
          userId: TEST_USER_ID,
        },
      });
    });

    it('should not throw if broadcast is not provided', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        FogOfWarService.revealArea(testScene.id, TEST_USER_ID, {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ],
        })
      ).resolves.toBeDefined();
    });
  });
});
