/**
 * Vision Blockers Router
 *
 * tRPC procedures for managing vision-blocking shapes (walls, doors, windows, terrain).
 * These shapes affect line of sight, movement, and lighting calculations.
 * All mutations require GM ownership of the scene.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { VisionBlockerService } from '../../services/vision-blocker-service.js';

/**
 * Schema for a point (x, y coordinates)
 */
const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Schema for creating a vision blocker
 */
const createVisionBlockerSchema = z.object({
  shapeType: z.enum(['wall', 'door', 'window', 'terrain']),
  pointsData: z.array(pointSchema).min(2, 'A vision blocker must have at least 2 points'),
  blocksMovement: z.boolean().optional(),
  blocksVision: z.boolean().optional(),
  blocksLight: z.boolean().optional(),
  isOneWay: z.boolean().optional(),
  doorState: z.enum(['open', 'closed', 'locked']).optional(),
});

/**
 * Schema for updating a vision blocker
 */
const updateVisionBlockerSchema = z.object({
  shapeType: z.enum(['wall', 'door', 'window', 'terrain']).optional(),
  pointsData: z.array(pointSchema).min(2).optional(),
  blocksMovement: z.boolean().optional(),
  blocksVision: z.boolean().optional(),
  blocksLight: z.boolean().optional(),
  isOneWay: z.boolean().optional(),
  doorState: z.enum(['open', 'closed', 'locked']).optional(),
});

/**
 * Vision Blockers router - all routes require authentication
 * Mutations require GM ownership (scene.userId === ctx.user.userId)
 */
export const visionBlockersRouter = router({
  /**
   * List all vision blockers for a scene
   */
  list: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        const blockers = await VisionBlockerService.listVisionBlockers(input.sceneId);
        return { blockers };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch vision blockers',
        });
      }
    }),

  /**
   * Get a single vision blocker by ID
   */
  get: protectedProcedure
    .input(z.object({ blockerId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        const blocker = await VisionBlockerService.getVisionBlocker(input.blockerId);

        if (!blocker) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vision blocker not found',
          });
        }

        return { blocker };
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch vision blocker',
        });
      }
    }),

  /**
   * Create a new vision blocker (GM only)
   */
  create: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      data: createVisionBlockerSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const blocker = await VisionBlockerService.createVisionBlocker(
          input.sceneId,
          ctx.user.userId,
          input.data
        );
        return { blocker };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create vision blocker',
        });
      }
    }),

  /**
   * Update an existing vision blocker (GM only)
   */
  update: protectedProcedure
    .input(z.object({
      blockerId: z.string().uuid(),
      updates: updateVisionBlockerSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const blocker = await VisionBlockerService.updateVisionBlocker(
          input.blockerId,
          ctx.user.userId,
          input.updates
        );
        return { blocker };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update vision blocker',
        });
      }
    }),

  /**
   * Delete a vision blocker (GM only)
   */
  delete: protectedProcedure
    .input(z.object({ blockerId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const success = await VisionBlockerService.deleteVisionBlocker(
          input.blockerId,
          ctx.user.userId
        );

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vision blocker not found',
          });
        }

        return { success };
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error;
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete vision blocker',
        });
      }
    }),

  /**
   * Toggle a door's state between open/closed (GM only)
   */
  toggleDoor: protectedProcedure
    .input(z.object({ blockerId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const blocker = await VisionBlockerService.toggleDoor(
          input.blockerId,
          ctx.user.userId
        );
        return { blocker };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to toggle door',
        });
      }
    }),

  /**
   * Bulk create multiple vision blockers (GM only)
   */
  bulkCreate: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      blockers: z.array(createVisionBlockerSchema).min(1, 'Must provide at least one blocker'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const blockers = await VisionBlockerService.bulkCreateBlockers(
          input.sceneId,
          ctx.user.userId,
          input.blockers
        );
        return { blockers, count: blockers.length };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        if (error.statusCode === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk create vision blockers',
        });
      }
    }),

  /**
   * List all doors in a scene
   */
  listDoors: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        const doors = await VisionBlockerService.listDoors(input.sceneId);
        return { doors };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch doors',
        });
      }
    }),

  /**
   * Delete all vision blockers for a scene (GM only)
   */
  deleteAll: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const count = await VisionBlockerService.deleteAllBlockersForScene(
          input.sceneId,
          ctx.user.userId
        );
        return { success: true, deletedCount: count };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete all vision blockers',
        });
      }
    }),
});
