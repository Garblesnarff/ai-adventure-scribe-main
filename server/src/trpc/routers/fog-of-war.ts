/**
 * Fog of War Router
 *
 * tRPC procedures for managing user-specific fog of war revelation.
 * Each user has their own revealed areas per scene for exploration tracking.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { FogOfWarService } from '../../services/fog-of-war-service.js';
import { broadcastToScene } from '../../ws.js';

/**
 * Schema for a point (x, y coordinates)
 */
const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Schema for revealing a new area
 */
const revealAreaInputSchema = z.object({
  points: z.array(pointSchema).min(3, 'A polygon must have at least 3 points'),
  revealedBy: z.string().optional(),
  isPermanent: z.boolean().optional(),
});

/**
 * Fog of War router - all routes require authentication
 * User-specific operations - users can only access their own fog data
 */
export const fogOfWarRouter = router({
  /**
   * Get all revealed areas for the current user in a specific scene
   */
  getRevealed: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const revealedAreas = await FogOfWarService.getRevealedAreas(
          input.sceneId,
          ctx.user.userId
        );
        return { revealedAreas };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch revealed areas',
        });
      }
    }),

  /**
   * Reveal a new area on the map for the current user
   */
  reveal: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      polygon: revealAreaInputSchema,
      targetUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const targetUserId = input.targetUserId || ctx.user.userId;
        const revealedArea = await FogOfWarService.revealArea(
          input.sceneId,
          targetUserId,
          input.polygon,
          (message) => broadcastToScene(input.sceneId, message)
        );
        return { revealedArea };
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reveal area',
        });
      }
    }),

  /**
   * Reveal multiple areas at once (batch operation)
   */
  revealBatch: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      polygons: z.array(revealAreaInputSchema),
      targetUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const targetUserId = input.targetUserId || ctx.user.userId;
        const revealedAreas = await FogOfWarService.revealAreas(
          input.sceneId,
          targetUserId,
          input.polygons,
          (message) => broadcastToScene(input.sceneId, message)
        );
        return { revealedAreas };
      } catch (error: any) {
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reveal areas',
        });
      }
    }),

  /**
   * Remove a specific revealed area by ID
   */
  conceal: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      areaId: z.string().uuid(),
      targetUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const targetUserId = input.targetUserId || ctx.user.userId;
        const success = await FogOfWarService.concealArea(
          input.sceneId,
          targetUserId,
          input.areaId,
          (message) => broadcastToScene(input.sceneId, message)
        );

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Revealed area not found',
          });
        }

        return { success };
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to conceal area',
        });
      }
    }),

  /**
   * Remove multiple revealed areas by IDs (batch operation)
   */
  concealBatch: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      areaIds: z.array(z.string().uuid()),
      targetUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const targetUserId = input.targetUserId || ctx.user.userId;
        const concealedAreas = await FogOfWarService.concealAreas(
          input.sceneId,
          targetUserId,
          input.areaIds,
          (message) => broadcastToScene(input.sceneId, message)
        );
        return { concealedAreas };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to conceal areas',
        });
      }
    }),

  /**
   * Clear all revealed areas for the current user in a scene (reset fog of war)
   */
  reset: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await FogOfWarService.resetFogOfWar(input.sceneId, ctx.user.userId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reset fog of war',
        });
      }
    }),

  /**
   * Merge and optimize overlapping revealed areas
   */
  merge: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const mergedAreas = await FogOfWarService.mergeRevealedAreas(
          input.sceneId,
          ctx.user.userId
        );
        return { revealedAreas: mergedAreas };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to merge revealed areas',
        });
      }
    }),

  /**
   * Get the complete fog of war record for the current user in a scene
   */
  getRecord: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const record = await FogOfWarService.getFogOfWarRecord(
          input.sceneId,
          ctx.user.userId
        );
        return { record };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fog of war record',
        });
      }
    }),
});
