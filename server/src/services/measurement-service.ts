/**
 * Measurement Service
 *
 * Handles measurement template operations (AoE templates for spells and abilities).
 * Provides methods for creating, deleting templates, calculating affected tokens,
 * and cleaning up temporary templates.
 *
 * Includes geometry calculations for different template types:
 * - Sphere: distance from origin
 * - Cube: bounding box check
 * - Cone: angle and distance check
 * - Cylinder: 2D circle check
 * - Line: distance from line segment
 *
 * @module server/services/measurement-service
 */

import { db } from '../../../db/client.js';
import {
  measurementTemplates,
  tokens,
  scenes,
  type MeasurementTemplate,
  type NewMeasurementTemplate,
  type Token,
} from '../../../db/schema/index.js';
import { eq, and, lt } from 'drizzle-orm';
import { InternalServerError } from '../lib/errors.js';

/**
 * Data required to create a new measurement template
 */
export interface CreateTemplateData {
  sceneId: string;
  templateType: 'cone' | 'cube' | 'sphere' | 'cylinder' | 'line' | 'ray';
  originX: number;
  originY: number;
  direction: number; // Degrees
  distance: number; // In feet
  width?: number; // For line templates
  color?: string;
  opacity?: number;
  isTemporary?: boolean;
}

/**
 * Result of affected tokens calculation
 */
export interface AffectedTokensResult {
  templateId: string;
  tokenIds: string[];
  tokens: Array<{
    id: string;
    name: string;
    positionX: number;
    positionY: number;
  }>;
}

export class MeasurementService {
  /**
   * Create a new measurement template
   */
  static async createTemplate(
    sceneId: string,
    userId: string,
    data: CreateTemplateData
  ): Promise<MeasurementTemplate> {
    // Verify the scene exists
    const [scene] = await db
      .select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.id, sceneId))
      .limit(1);

    if (!scene) {
      throw new InternalServerError('Scene not found');
    }

    // Create the template
    const [template] = await db
      .insert(measurementTemplates)
      .values({
        sceneId: data.sceneId,
        createdBy: userId,
        templateType: data.templateType,
        originX: data.originX,
        originY: data.originY,
        direction: data.direction,
        distance: data.distance,
        width: data.width ?? null,
        color: data.color ?? '#FF0000',
        opacity: data.opacity ?? 0.5,
        isTemporary: data.isTemporary ?? true,
      })
      .returning();

    if (!template) {
      throw new InternalServerError('Failed to create template');
    }

    return template;
  }

  /**
   * Delete a measurement template
   * Only the creator or scene owner can delete
   */
  static async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    // Get the template with scene info to check authorization
    const [existing] = await db
      .select({
        templateId: measurementTemplates.id,
        createdBy: measurementTemplates.createdBy,
        sceneId: measurementTemplates.sceneId,
        sceneOwnerId: scenes.userId,
      })
      .from(measurementTemplates)
      .innerJoin(scenes, eq(measurementTemplates.sceneId, scenes.id))
      .where(eq(measurementTemplates.id, templateId))
      .limit(1);

    if (!existing) {
      return false;
    }

    // Check authorization: creator or scene owner
    const isCreator = existing.createdBy === userId;
    const isSceneOwner = existing.sceneOwnerId === userId;

    if (!isCreator && !isSceneOwner) {
      throw new InternalServerError('Not authorized to delete this template');
    }

    // Delete the template
    const result = await db
      .delete(measurementTemplates)
      .where(eq(measurementTemplates.id, templateId))
      .returning({ id: measurementTemplates.id });

    return result.length > 0;
  }

  /**
   * Calculate which tokens are affected by a template
   * Uses geometry calculations based on template type
   */
  static async calculateAffectedTokens(templateId: string): Promise<AffectedTokensResult> {
    // Get the template
    const [template] = await db
      .select()
      .from(measurementTemplates)
      .where(eq(measurementTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new InternalServerError('Template not found');
    }

    // Get all tokens in the same scene
    const sceneTokens = await db
      .select()
      .from(tokens)
      .where(eq(tokens.sceneId, template.sceneId));

    // Filter tokens based on template geometry
    const affectedTokens = sceneTokens.filter((token) => {
      return this.isTokenInTemplate(template, token);
    });

    return {
      templateId: template.id,
      tokenIds: affectedTokens.map((t) => t.id),
      tokens: affectedTokens.map((t) => ({
        id: t.id,
        name: t.name,
        positionX: parseFloat(String(t.positionX)),
        positionY: parseFloat(String(t.positionY)),
      })),
    };
  }

  /**
   * Check if a token is within a template's area
   */
  private static isTokenInTemplate(template: MeasurementTemplate, token: Token): boolean {
    const tokenX = parseFloat(String(token.positionX));
    const tokenY = parseFloat(String(token.positionY));
    const originX = parseFloat(String(template.originX));
    const originY = parseFloat(String(template.originY));
    const distance = parseFloat(String(template.distance));
    const direction = parseFloat(String(template.direction));

    switch (template.templateType) {
      case 'sphere':
        return this.isInSphere(tokenX, tokenY, originX, originY, distance);

      case 'cube':
        return this.isInCube(tokenX, tokenY, originX, originY, distance);

      case 'cone':
        return this.isInCone(tokenX, tokenY, originX, originY, distance, direction);

      case 'cylinder':
        return this.isInCylinder(tokenX, tokenY, originX, originY, distance);

      case 'line':
      case 'ray': {
        const width = template.width ? parseFloat(String(template.width)) : 5;
        return this.isInLine(tokenX, tokenY, originX, originY, distance, direction, width);
      }

      default:
        return false;
    }
  }

  /**
   * Check if point is within a sphere (circle in 2D)
   */
  private static isInSphere(
    x: number,
    y: number,
    originX: number,
    originY: number,
    radius: number
  ): boolean {
    const dx = x - originX;
    const dy = y - originY;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= radius * radius;
  }

  /**
   * Check if point is within a cube (square in 2D)
   */
  private static isInCube(
    x: number,
    y: number,
    originX: number,
    originY: number,
    size: number
  ): boolean {
    const halfSize = size / 2;
    return (
      x >= originX - halfSize &&
      x <= originX + halfSize &&
      y >= originY - halfSize &&
      y <= originY + halfSize
    );
  }

  /**
   * Check if point is within a cone
   * Uses angle from origin and distance check
   */
  private static isInCone(
    x: number,
    y: number,
    originX: number,
    originY: number,
    distance: number,
    direction: number,
    coneAngle: number = 90 // Default 90 degree cone
  ): boolean {
    const dx = x - originX;
    const dy = y - originY;
    const distanceToPoint = Math.sqrt(dx * dx + dy * dy);

    // Check if within distance
    if (distanceToPoint > distance) {
      return false;
    }

    // Calculate angle to point (in degrees)
    const angleToPoint = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Normalize angles to 0-360
    const normalizedDirection = ((direction % 360) + 360) % 360;
    const normalizedAngle = ((angleToPoint % 360) + 360) % 360;

    // Calculate angle difference
    let angleDiff = Math.abs(normalizedAngle - normalizedDirection);
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    // Check if within cone angle
    return angleDiff <= coneAngle / 2;
  }

  /**
   * Check if point is within a cylinder (circle in 2D, same as sphere)
   */
  private static isInCylinder(
    x: number,
    y: number,
    originX: number,
    originY: number,
    radius: number
  ): boolean {
    return this.isInSphere(x, y, originX, originY, radius);
  }

  /**
   * Check if point is within a line template
   * Calculates distance from point to line segment
   */
  private static isInLine(
    x: number,
    y: number,
    originX: number,
    originY: number,
    length: number,
    direction: number,
    width: number
  ): boolean {
    // Calculate end point of line based on direction and length
    const radians = (direction * Math.PI) / 180;
    const endX = originX + length * Math.cos(radians);
    const endY = originY + length * Math.sin(radians);

    // Calculate distance from point to line segment
    const distance = this.distanceToLineSegment(x, y, originX, originY, endX, endY);

    // Check if within width/2 of the line
    return distance <= width / 2;
  }

  /**
   * Calculate distance from a point to a line segment
   */
  private static distanceToLineSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Line segment is a point
      const dpx = px - x1;
      const dpy = py - y1;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    // Calculate projection of point onto line segment
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));

    // Calculate closest point on line segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    // Calculate distance to closest point
    const distX = px - closestX;
    const distY = py - closestY;
    return Math.sqrt(distX * distX + distY * distY);
  }

  /**
   * Clean up old temporary templates
   * Deletes templates older than the specified age (default 1 hour)
   */
  static async cleanupTemporaryTemplates(
    sceneId: string,
    maxAgeMinutes: number = 60
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const result = await db
      .delete(measurementTemplates)
      .where(
        and(
          eq(measurementTemplates.sceneId, sceneId),
          eq(measurementTemplates.isTemporary, true),
          lt(measurementTemplates.createdAt, cutoffDate)
        )
      )
      .returning({ id: measurementTemplates.id });

    return result.length;
  }

  /**
   * Get a single template by ID
   */
  static async getTemplateById(templateId: string): Promise<MeasurementTemplate | null> {
    const [template] = await db
      .select()
      .from(measurementTemplates)
      .where(eq(measurementTemplates.id, templateId))
      .limit(1);

    return template || null;
  }

  /**
   * List all templates for a scene
   */
  static async listTemplates(sceneId: string): Promise<MeasurementTemplate[]> {
    const templates = await db
      .select()
      .from(measurementTemplates)
      .where(eq(measurementTemplates.sceneId, sceneId));

    return templates;
  }
}
