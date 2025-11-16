/**
 * Drawing Service
 *
 * Handles scene drawing operations using Drizzle ORM.
 * Provides methods for creating, retrieving, updating, and deleting drawings.
 * Includes authorization checks to ensure only authorized users can modify drawings.
 *
 * @module server/services/drawing-service
 */

import { db } from '../../../db/client.js';
import { sceneDrawings, scenes, type SceneDrawing, type NewSceneDrawing } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { InternalServerError } from '../lib/errors.js';

/**
 * Data required to create a new drawing
 */
export interface CreateDrawingData {
  sceneId: string;
  drawingType: 'freehand' | 'line' | 'circle' | 'rectangle' | 'polygon' | 'text';
  pointsData: Array<{ x: number; y: number }>;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string | null;
  fillOpacity?: number;
  zIndex?: number;
  textContent?: string | null;
  fontSize?: number | null;
  fontFamily?: string | null;
}

export class DrawingService {
  /**
   * List all drawings for a specific scene
   */
  static async listDrawings(sceneId: string): Promise<SceneDrawing[]> {
    const drawings = await db
      .select()
      .from(sceneDrawings)
      .where(eq(sceneDrawings.sceneId, sceneId));

    return drawings;
  }

  /**
   * Create a new drawing on a scene
   */
  static async createDrawing(
    sceneId: string,
    userId: string,
    data: CreateDrawingData
  ): Promise<SceneDrawing> {
    // Verify the scene exists and get the owner
    const [scene] = await db
      .select({ userId: scenes.userId })
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      throw new InternalServerError('Scene not found');
    }

    // Create the drawing
    const [drawing] = await db
      .insert(sceneDrawings)
      .values({
        sceneId: data.sceneId,
        createdBy: userId,
        drawingType: data.drawingType,
        pointsData: data.pointsData as any,
        strokeColor: data.strokeColor,
        strokeWidth: data.strokeWidth,
        fillColor: data.fillColor ?? null,
        fillOpacity: data.fillOpacity ?? 0,
        zIndex: data.zIndex ?? 0,
        textContent: data.textContent ?? null,
        fontSize: data.fontSize ?? null,
        fontFamily: data.fontFamily ?? null,
      })
      .returning();

    if (!drawing) {
      throw new InternalServerError('Failed to create drawing');
    }

    return drawing;
  }

  /**
   * Update an existing drawing
   * Only the creator or scene owner can update
   */
  static async updateDrawing(
    drawingId: string,
    userId: string,
    updates: Partial<NewSceneDrawing>
  ): Promise<SceneDrawing | null> {
    // Get the drawing with scene info to check authorization
    const [existing] = await db
      .select({
        drawingId: sceneDrawings.id,
        createdBy: sceneDrawings.createdBy,
        sceneId: sceneDrawings.sceneId,
        sceneOwnerId: scenes.userId,
      })
      .from(sceneDrawings)
      .innerJoin(scenes, eq(sceneDrawings.sceneId, scenes.id))
      .where(eq(sceneDrawings.id, drawingId))
      .limit(1);

    if (!existing) {
      return null;
    }

    // Check authorization: creator or scene owner
    const isCreator = existing.createdBy === userId;
    const isSceneOwner = existing.sceneOwnerId === userId;

    if (!isCreator && !isSceneOwner) {
      throw new InternalServerError('Not authorized to update this drawing');
    }

    // Update the drawing
    const [updated] = await db
      .update(sceneDrawings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sceneDrawings.id, drawingId))
      .returning();

    return updated || null;
  }

  /**
   * Delete a drawing
   * Only the creator or scene owner can delete
   */
  static async deleteDrawing(drawingId: string, userId: string): Promise<boolean> {
    // Get the drawing with scene info to check authorization
    const [existing] = await db
      .select({
        drawingId: sceneDrawings.id,
        createdBy: sceneDrawings.createdBy,
        sceneId: sceneDrawings.sceneId,
        sceneOwnerId: scenes.userId,
      })
      .from(sceneDrawings)
      .innerJoin(scenes, eq(sceneDrawings.sceneId, scenes.id))
      .where(eq(sceneDrawings.id, drawingId))
      .limit(1);

    if (!existing) {
      return false;
    }

    // Check authorization: creator or scene owner (GM)
    const isCreator = existing.createdBy === userId;
    const isSceneOwner = existing.sceneOwnerId === userId;

    if (!isCreator && !isSceneOwner) {
      throw new InternalServerError('Not authorized to delete this drawing');
    }

    // Delete the drawing
    const result = await db
      .delete(sceneDrawings)
      .where(eq(sceneDrawings.id, drawingId))
      .returning({ id: sceneDrawings.id });

    return result.length > 0;
  }

  /**
   * Bulk delete multiple drawings
   * Only scene owner can bulk delete
   */
  static async bulkDeleteDrawings(
    sceneId: string,
    drawingIds: string[],
    userId: string
  ): Promise<number> {
    if (drawingIds.length === 0) {
      return 0;
    }

    // Verify user is the scene owner
    const [scene] = await db
      .select({ userId: scenes.userId })
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      throw new InternalServerError('Scene not found');
    }

    if (scene.userId !== userId) {
      throw new InternalServerError('Only scene owner can bulk delete drawings');
    }

    // Delete all specified drawings for this scene
    let deletedCount = 0;
    for (const drawingId of drawingIds) {
      const result = await db
        .delete(sceneDrawings)
        .where(
          and(
            eq(sceneDrawings.id, drawingId),
            eq(sceneDrawings.sceneId, sceneId)
          )
        )
        .returning({ id: sceneDrawings.id });

      if (result.length > 0) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get a single drawing by ID
   */
  static async getDrawingById(drawingId: string): Promise<SceneDrawing | null> {
    const [drawing] = await db
      .select()
      .from(sceneDrawings)
      .where(eq(sceneDrawings.id, drawingId))
      .limit(1);

    return drawing || null;
  }
}
