/**
 * Scenes Router
 *
 * tRPC procedures for scene management operations (Foundry VTT-style maps).
 * Handles CRUD operations for scenes, layers, and settings with proper authorization.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { SceneService } from '../../services/scene-service.js';

/**
 * Input schema for creating a new scene
 */
const createSceneSchema = z.object({
  name: z.string().min(1, 'Scene name is required').max(255),
  description: z.string().optional(),
  campaignId: z.string().uuid('Invalid campaign ID'),
  width: z.number().int().min(1).max(100).optional(),
  height: z.number().int().min(1).max(100).optional(),
  gridSize: z.number().int().min(1).max(50).optional(),
  gridType: z.enum(['square', 'hexagonal_horizontal', 'hexagonal_vertical', 'gridless']).optional(),
  gridColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  backgroundImageUrl: z.string().url().optional().or(z.literal('')),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
});

/**
 * Input schema for updating a scene
 */
const updateSceneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  width: z.number().int().min(1).max(100).optional(),
  height: z.number().int().min(1).max(100).optional(),
  gridSize: z.number().int().min(1).max(50).optional(),
  gridType: z.enum(['square', 'hexagonal_horizontal', 'hexagonal_vertical', 'gridless']).optional(),
  gridColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundImageUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Input schema for updating scene settings
 */
const updateSettingsSchema = z.object({
  enableFogOfWar: z.boolean().optional(),
  enableDynamicLighting: z.boolean().optional(),
  snapToGrid: z.boolean().optional(),
  gridOpacity: z.string().regex(/^\d\.\d{2}$/, 'Opacity must be in format 0.00').optional(),
  ambientLightLevel: z.string().regex(/^\d\.\d{2}$/, 'Light level must be in format 0.00').optional(),
  darknessLevel: z.string().regex(/^\d\.\d{2}$/, 'Darkness level must be in format 0.00').optional(),
  weatherEffects: z.string().optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
});

/**
 * Input schema for updating a scene layer
 */
const updateLayerSchema = z.object({
  layerType: z.enum(['background', 'grid', 'tokens', 'effects', 'drawings', 'ui']).optional(),
  zIndex: z.number().int().min(0).max(100).optional(),
  isVisible: z.boolean().optional(),
  opacity: z.string().regex(/^\d\.\d{2}$/, 'Opacity must be in format 0.00').optional(),
  locked: z.boolean().optional(),
});

/**
 * Scenes router - all routes require authentication
 */
export const scenesRouter = router({
  /**
   * List all scenes for a campaign
   */
  list: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const scenes = await SceneService.listScenesForCampaign(input.campaignId, ctx.user.userId);
        return scenes;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch scenes' });
      }
    }),

  /**
   * Get single scene by ID with settings and layers
   */
  getById: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const scene = await SceneService.getSceneById(input.sceneId, ctx.user.userId);

        if (!scene) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Scene not found' });
        }

        return scene;
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error;
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch scene' });
      }
    }),

  /**
   * Create new scene with default settings and layers
   */
  create: protectedProcedure
    .input(createSceneSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const scene = await SceneService.createScene(ctx.user.userId, input);
        return scene;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create scene'
        });
      }
    }),

  /**
   * Update an existing scene
   */
  update: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      updates: updateSceneSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const scene = await SceneService.updateScene(
          input.sceneId,
          ctx.user.userId,
          input.updates
        );
        return scene;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update scene'
        });
      }
    }),

  /**
   * Delete a scene and cascade to related records
   */
  delete: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const success = await SceneService.deleteScene(input.sceneId, ctx.user.userId);
        return { success };
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete scene'
        });
      }
    }),

  /**
   * Set a scene as the active scene for a campaign
   */
  setActive: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      campaignId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const scene = await SceneService.setActiveScene(
          input.sceneId,
          input.campaignId,
          ctx.user.userId
        );
        return scene;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to set active scene'
        });
      }
    }),

  /**
   * Update scene settings
   */
  updateSettings: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      settings: updateSettingsSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const settings = await SceneService.updateSettings(
          input.sceneId,
          ctx.user.userId,
          input.settings
        );
        return settings;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update scene settings'
        });
      }
    }),

  /**
   * Update a scene layer
   */
  updateLayer: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      layerId: z.string().uuid(),
      updates: updateLayerSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const layer = await SceneService.updateLayer(
          input.sceneId,
          input.layerId,
          ctx.user.userId,
          input.updates
        );
        return layer;
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error.statusCode === 403) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update layer'
        });
      }
    }),
});
