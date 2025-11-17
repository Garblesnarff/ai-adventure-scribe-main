/**
 * Fog of War Service
 *
 * Manages user-specific fog of war revelation for scenes.
 * Each user has their own revealed areas per scene for exploration tracking.
 *
 * @module server/services/fog-of-war-service
 */

import { db } from '../../../db/client.js';
import { fogOfWar, type FogOfWar, type NewFogOfWar } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { InternalServerError, NotFoundError, ValidationError } from '../lib/errors.js';
import { randomUUID } from 'crypto';

/**
 * Type for a revealed area polygon
 */
export interface RevealedArea {
  id: string;
  points: Array<{ x: number; y: number }>;
  revealedAt: string;
  revealedBy?: string;
  isPermanent: boolean;
}

/**
 * Input type for revealing a new area
 */
export interface RevealAreaInput {
  points: Array<{ x: number; y: number }>;
  revealedBy?: string;
  isPermanent?: boolean;
}

/**
 * Callback type for WebSocket broadcast
 */
export type BroadcastCallback = (message: any) => void;

export class FogOfWarService {
  /**
   * Get all revealed areas for a user in a specific scene
   */
  static async getRevealedAreas(sceneId: string, userId: string): Promise<RevealedArea[]> {
    const fogRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!fogRecord) {
      // No fog of war record yet - return empty array
      return [];
    }

    return fogRecord.revealedAreas as RevealedArea[];
  }

  /**
   * Reveal a new area on the map for a user
   * Creates a fog of war record if one doesn't exist
   */
  static async revealArea(
    sceneId: string,
    userId: string,
    input: RevealAreaInput,
    broadcast?: BroadcastCallback
  ): Promise<RevealedArea> {
    // Validate points
    if (!input.points || input.points.length < 3) {
      throw new ValidationError('A polygon must have at least 3 points');
    }

    // Validate each point has x and y
    for (const point of input.points) {
      if (typeof point.x !== 'number' || typeof point.y !== 'number') {
        throw new ValidationError('Each point must have numeric x and y coordinates');
      }
    }

    // Create the new revealed area
    const newArea: RevealedArea = {
      id: randomUUID(),
      points: input.points,
      revealedAt: new Date().toISOString(),
      revealedBy: input.revealedBy,
      isPermanent: input.isPermanent ?? true,
    };

    // Try to find existing fog record
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (existingRecord) {
      // Add to existing revealed areas
      const updatedAreas = [...(existingRecord.revealedAreas as RevealedArea[]), newArea];

      const [updated] = await db
        .update(fogOfWar)
        .set({
          revealedAreas: updatedAreas,
          updatedAt: new Date(),
        })
        .where(eq(fogOfWar.id, existingRecord.id))
        .returning();

      if (!updated) {
        throw new InternalServerError('Failed to update fog of war');
      }
    } else {
      // Create new fog record
      await db
        .insert(fogOfWar)
        .values({
          sceneId,
          userId,
          revealedAreas: [newArea],
        });
    }

    // Broadcast to WebSocket if callback provided
    if (broadcast) {
      broadcast({
        type: 'fog:reveal',
        sceneId,
        userId,
        timestamp: Date.now(),
        data: {
          areas: [newArea],
          userId,
        },
      });
    }

    return newArea;
  }

  /**
   * Reveal multiple areas at once (batch operation)
   * More efficient than calling revealArea multiple times
   */
  static async revealAreas(
    sceneId: string,
    userId: string,
    inputs: RevealAreaInput[],
    broadcast?: BroadcastCallback
  ): Promise<RevealedArea[]> {
    if (inputs.length === 0) {
      return [];
    }

    const newAreas: RevealedArea[] = [];

    // Validate and create all areas
    for (const input of inputs) {
      // Validate points
      if (!input.points || input.points.length < 3) {
        throw new ValidationError('A polygon must have at least 3 points');
      }

      // Validate each point has x and y
      for (const point of input.points) {
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
          throw new ValidationError('Each point must have numeric x and y coordinates');
        }
      }

      newAreas.push({
        id: randomUUID(),
        points: input.points,
        revealedAt: new Date().toISOString(),
        revealedBy: input.revealedBy,
        isPermanent: input.isPermanent ?? true,
      });
    }

    // Try to find existing fog record
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (existingRecord) {
      // Add to existing revealed areas
      const updatedAreas = [...(existingRecord.revealedAreas as RevealedArea[]), ...newAreas];

      const [updated] = await db
        .update(fogOfWar)
        .set({
          revealedAreas: updatedAreas,
          updatedAt: new Date(),
        })
        .where(eq(fogOfWar.id, existingRecord.id))
        .returning();

      if (!updated) {
        throw new InternalServerError('Failed to update fog of war');
      }
    } else {
      // Create new fog record
      await db
        .insert(fogOfWar)
        .values({
          sceneId,
          userId,
          revealedAreas: newAreas,
        });
    }

    // Broadcast to WebSocket if callback provided
    if (broadcast) {
      broadcast({
        type: 'fog:reveal',
        sceneId,
        userId,
        timestamp: Date.now(),
        data: {
          areas: newAreas,
          userId,
        },
      });
    }

    return newAreas;
  }

  /**
   * Remove a specific revealed area by ID
   */
  static async concealArea(
    sceneId: string,
    userId: string,
    areaId: string,
    broadcast?: BroadcastCallback
  ): Promise<boolean> {
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!existingRecord) {
      return false;
    }

    const currentAreas = existingRecord.revealedAreas as RevealedArea[];
    const concealedArea = currentAreas.find((area) => area.id === areaId);
    const filteredAreas = currentAreas.filter((area) => area.id !== areaId);

    if (filteredAreas.length === currentAreas.length) {
      // Area ID not found
      return false;
    }

    await db
      .update(fogOfWar)
      .set({
        revealedAreas: filteredAreas,
        updatedAt: new Date(),
      })
      .where(eq(fogOfWar.id, existingRecord.id));

    // Broadcast to WebSocket if callback provided
    if (broadcast && concealedArea) {
      broadcast({
        type: 'fog:conceal',
        sceneId,
        userId,
        timestamp: Date.now(),
        data: {
          areas: [concealedArea],
          userId,
        },
      });
    }

    return true;
  }

  /**
   * Remove multiple revealed areas by IDs (batch operation)
   */
  static async concealAreas(
    sceneId: string,
    userId: string,
    areaIds: string[],
    broadcast?: BroadcastCallback
  ): Promise<RevealedArea[]> {
    if (areaIds.length === 0) {
      return [];
    }

    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!existingRecord) {
      return [];
    }

    const currentAreas = existingRecord.revealedAreas as RevealedArea[];
    const areaIdSet = new Set(areaIds);
    const concealedAreas = currentAreas.filter((area) => areaIdSet.has(area.id));
    const remainingAreas = currentAreas.filter((area) => !areaIdSet.has(area.id));

    if (concealedAreas.length === 0) {
      return [];
    }

    await db
      .update(fogOfWar)
      .set({
        revealedAreas: remainingAreas,
        updatedAt: new Date(),
      })
      .where(eq(fogOfWar.id, existingRecord.id));

    // Broadcast to WebSocket if callback provided
    if (broadcast) {
      broadcast({
        type: 'fog:conceal',
        sceneId,
        userId,
        timestamp: Date.now(),
        data: {
          areas: concealedAreas,
          userId,
        },
      });
    }

    return concealedAreas;
  }

  /**
   * Clear all revealed areas for a user in a scene (reset fog of war)
   */
  static async resetFogOfWar(sceneId: string, userId: string): Promise<void> {
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!existingRecord) {
      // Nothing to reset
      return;
    }

    await db
      .update(fogOfWar)
      .set({
        revealedAreas: [],
        updatedAt: new Date(),
      })
      .where(eq(fogOfWar.id, existingRecord.id));
  }

  /**
   * Merge and optimize overlapping revealed areas
   * This is a simplified version - a full implementation would use polygon union algorithms
   * For now, this just removes duplicate area IDs
   */
  static async mergeRevealedAreas(sceneId: string, userId: string): Promise<RevealedArea[]> {
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!existingRecord) {
      return [];
    }

    const currentAreas = existingRecord.revealedAreas as RevealedArea[];

    // Remove duplicate IDs and invalid areas
    const seenIds = new Set<string>();
    const mergedAreas = currentAreas.filter((area) => {
      if (!area.id || seenIds.has(area.id)) {
        return false;
      }
      seenIds.add(area.id);
      return true;
    });

    // Update if we removed any duplicates
    if (mergedAreas.length !== currentAreas.length) {
      await db
        .update(fogOfWar)
        .set({
          revealedAreas: mergedAreas,
          updatedAt: new Date(),
        })
        .where(eq(fogOfWar.id, existingRecord.id));
    }

    return mergedAreas;
  }

  /**
   * Get the entire fog of war record for a user in a scene
   */
  static async getFogOfWarRecord(sceneId: string, userId: string): Promise<FogOfWar | null> {
    const record = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    return record || null;
  }

  /**
   * Delete fog of war record for a user in a scene
   */
  static async deleteFogOfWar(sceneId: string, userId: string): Promise<boolean> {
    const existingRecord = await db.query.fogOfWar.findFirst({
      where: and(
        eq(fogOfWar.sceneId, sceneId),
        eq(fogOfWar.userId, userId)
      ),
    });

    if (!existingRecord) {
      return false;
    }

    await db
      .delete(fogOfWar)
      .where(eq(fogOfWar.id, existingRecord.id));

    return true;
  }
}
