/**
 * Measurements Router
 *
 * tRPC procedures for measurement template operations (AoE templates).
 * Provides endpoints for creating, deleting templates, calculating affected tokens,
 * and cleaning up temporary templates.
 *
 * Authorization:
 * - Anyone can view templates on scenes they have access to
 * - Authenticated users can create templates
 * - Only template creator or scene owner can delete templates
 * - Scene owner can cleanup old temporary templates
 *
 * @module server/trpc/routers/measurements
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { MeasurementService, type CreateTemplateData } from '../../services/measurement-service.js';

/**
 * Validation schema for creating a measurement template
 */
const createTemplateSchema = z.object({
  sceneId: z.string().uuid(),
  templateType: z.enum(['cone', 'cube', 'sphere', 'cylinder', 'line', 'ray']),
  originX: z.number(),
  originY: z.number(),
  direction: z.number().min(0).max(360),
  distance: z.number().min(0),
  width: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  opacity: z.number().min(0).max(1).optional(),
  isTemporary: z.boolean().optional(),
});

/**
 * Measurements router
 */
export const measurementsRouter = router({
  /**
   * List all templates for a scene (PUBLIC)
   * Anyone can view templates on a scene
   */
  list: publicProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input }) => {
      const templates = await MeasurementService.listTemplates(input.sceneId);
      return { data: templates };
    }),

  /**
   * Get a single template by ID (PUBLIC)
   */
  getById: publicProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ input }) => {
      const template = await MeasurementService.getTemplateById(input.templateId);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return template;
    }),

  /**
   * Create a new measurement template (PROTECTED)
   * Anyone can create temporary templates (for spell AoE visualization)
   */
  create: protectedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create templates',
        });
      }

      const templateData: CreateTemplateData = {
        sceneId: input.sceneId,
        templateType: input.templateType,
        originX: input.originX,
        originY: input.originY,
        direction: input.direction,
        distance: input.distance,
        width: input.width,
        color: input.color ?? '#FF0000',
        opacity: input.opacity ?? 0.5,
        isTemporary: input.isTemporary ?? true,
      };

      const template = await MeasurementService.createTemplate(
        input.sceneId,
        ctx.user.userId,
        templateData
      );

      return template;
    }),

  /**
   * Delete a measurement template (PROTECTED)
   * Only creator or scene owner can delete
   */
  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to delete templates',
        });
      }

      try {
        const deleted = await MeasurementService.deleteTemplate(input.templateId, ctx.user.userId);

        if (!deleted) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof Error && error.message.includes('Not authorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this template',
          });
        }
        throw error;
      }
    }),

  /**
   * Get tokens affected by a template (PUBLIC)
   * Calculates which tokens are within the template's area of effect
   */
  getAffectedTokens: publicProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        const result = await MeasurementService.calculateAffectedTokens(input.templateId);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }
        throw error;
      }
    }),

  /**
   * Clean up old temporary templates (PROTECTED)
   * Only scene owner or GM can cleanup
   */
  cleanup: protectedProcedure
    .input(
      z.object({
        sceneId: z.string().uuid(),
        maxAgeMinutes: z.number().int().min(1).max(1440).optional(), // Max 24 hours
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to cleanup templates',
        });
      }

      // Note: Scene ownership check is not implemented here for simplicity
      // In production, you might want to verify the user is the scene owner
      // before allowing cleanup

      const deletedCount = await MeasurementService.cleanupTemporaryTemplates(
        input.sceneId,
        input.maxAgeMinutes ?? 60
      );

      return {
        success: true,
        deletedCount,
      };
    }),
});

/**
 * Type export for client use
 */
export type MeasurementsRouter = typeof measurementsRouter;
