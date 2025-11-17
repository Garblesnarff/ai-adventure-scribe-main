/**
 * Tokens Router
 *
 * tRPC procedures for token CRUD operations, character linking,
 * vision/light configuration, and default token settings.
 *
 * Tokens represent characters, NPCs, monsters, and objects on Foundry VTT scenes.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { TokenService } from '../../services/token-service.js';
import { broadcastToScene } from '../../ws.js';
import type { Token } from '../../../../db/schema/index.js';

/**
 * Zod validation schemas
 */

// Token creation schema
const createTokenSchema = z.object({
  sceneId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  tokenType: z.enum(['character', 'npc', 'monster', 'object']),
  positionX: z.number(),
  positionY: z.number(),
  imageUrl: z.string().url().optional(),
  sizeWidth: z.number().positive().optional(),
  sizeHeight: z.number().positive().optional(),
  gridSize: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']).optional(),
  visionEnabled: z.boolean().optional(),
  visionRange: z.number().nonnegative().optional(),
  emitsLight: z.boolean().optional(),
  lightRange: z.number().nonnegative().optional(),
  lightColor: z.string().optional(),
});

// Token update schema
const updateTokenSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tokenType: z.enum(['character', 'npc', 'monster', 'object']).optional(),
  positionX: z.string().optional(),
  positionY: z.string().optional(),
  rotation: z.string().optional(),
  elevation: z.string().optional(),
  imageUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  sizeWidth: z.string().optional(),
  sizeHeight: z.string().optional(),
  gridSize: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']).optional(),
  tintColor: z.string().optional(),
  scale: z.string().optional(),
  opacity: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  showNameplate: z.boolean().optional(),
  nameplatePosition: z.enum(['top', 'bottom']).optional(),
  isLocked: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  movementSpeed: z.number().optional(),
  hasFlying: z.boolean().optional(),
  hasSwimming: z.boolean().optional(),
});

// Vision configuration schema
const visionConfigSchema = z.object({
  visionEnabled: z.boolean().optional(),
  visionRange: z.number().nonnegative().optional(),
  visionAngle: z.number().min(0).max(360).optional(),
  nightVision: z.boolean().optional(),
  darkvisionRange: z.number().nonnegative().optional(),
});

// Light configuration schema
const lightConfigSchema = z.object({
  emitsLight: z.boolean().optional(),
  lightRange: z.number().nonnegative().optional(),
  lightAngle: z.number().min(0).max(360).optional(),
  lightColor: z.string().optional(),
  lightIntensity: z.number().min(0).max(1).optional(),
  dimLightRange: z.number().nonnegative().optional(),
  brightLightRange: z.number().nonnegative().optional(),
});

// Default token configuration schema
const defaultConfigSchema = z.object({
  imageUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  sizeWidth: z.string().optional(),
  sizeHeight: z.string().optional(),
  gridSize: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']).optional(),
  tintColor: z.string().optional(),
  scale: z.string().optional(),
  opacity: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  showNameplate: z.boolean().optional(),
  nameplatePosition: z.enum(['top', 'bottom']).optional(),
  visionEnabled: z.boolean().optional(),
  visionRange: z.string().optional(),
  visionAngle: z.string().optional(),
  nightVision: z.boolean().optional(),
  darkvisionRange: z.string().optional(),
  emitsLight: z.boolean().optional(),
  lightRange: z.string().optional(),
  lightAngle: z.string().optional(),
  lightColor: z.string().optional(),
  lightIntensity: z.string().optional(),
  dimLightRange: z.string().optional(),
  brightLightRange: z.string().optional(),
  movementSpeed: z.number().optional(),
  hasFlying: z.boolean().optional(),
  hasSwimming: z.boolean().optional(),
});

/**
 * Tokens tRPC router
 */
export const tokensRouter = router({
  /**
   * List all tokens for a scene
   */
  list: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tokens = await TokenService.listTokensForScene(input.sceneId, ctx.user.userId);
      return tokens;
    }),

  /**
   * Get single token by ID
   */
  getById: protectedProcedure
    .input(z.object({ tokenId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const token = await TokenService.getTokenById(input.tokenId, ctx.user.userId);
      return token;
    }),

  /**
   * Create a new token
   */
  create: protectedProcedure.input(createTokenSchema).mutation(async ({ input, ctx }) => {
    const token = await TokenService.createToken(input.sceneId, ctx.user.userId, input);
    return token;
  }),

  /**
   * Update an existing token
   */
  update: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        updates: updateTokenSchema,
        optimisticId: z.string().optional(), // For client reconciliation
      })
    )
    .mutation(async ({ input, ctx }) => {
      const token = await TokenService.updateToken(
        input.tokenId,
        ctx.user.userId,
        input.updates,
        (sceneId: string, updatedToken: Token) => {
          // Broadcast token update to scene room
          broadcastToScene(sceneId, {
            type: 'token:update',
            sceneId,
            userId: ctx.user.userId,
            timestamp: Date.now(),
            data: {
              tokenId: updatedToken.id,
              positionX: parseFloat(updatedToken.positionX),
              positionY: parseFloat(updatedToken.positionY),
              rotation: updatedToken.rotation ? parseFloat(updatedToken.rotation) : 0,
              optimisticId: input.optimisticId,
              updates: input.updates,
            },
          });
        }
      );
      return token;
    }),

  /**
   * Delete a token
   */
  delete: protectedProcedure
    .input(z.object({ tokenId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const success = await TokenService.deleteToken(input.tokenId, ctx.user.userId);
      return { success };
    }),

  /**
   * Move a token to a new position
   */
  move: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        x: z.number(),
        y: z.number(),
        optimisticId: z.string().optional(), // For client reconciliation
      })
    )
    .mutation(async ({ input, ctx }) => {
      const token = await TokenService.moveToken(
        input.tokenId,
        ctx.user.userId,
        input.x,
        input.y,
        (sceneId: string, updatedToken: Token) => {
          // Broadcast token move to scene room
          broadcastToScene(sceneId, {
            type: 'token:update',
            sceneId,
            userId: ctx.user.userId,
            timestamp: Date.now(),
            data: {
              tokenId: updatedToken.id,
              positionX: parseFloat(updatedToken.positionX),
              positionY: parseFloat(updatedToken.positionY),
              optimisticId: input.optimisticId,
            },
          });
        }
      );
      return token;
    }),

  /**
   * Link a token to a character
   */
  linkToCharacter: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        characterId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await TokenService.linkToCharacter(
        input.tokenId,
        input.characterId,
        ctx.user.userId
      );
      return { success };
    }),

  /**
   * Unlink a token from a character
   */
  unlinkFromCharacter: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        characterId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await TokenService.unlinkFromCharacter(
        input.tokenId,
        input.characterId,
        ctx.user.userId
      );
      return { success };
    }),

  /**
   * Get all tokens for a character
   */
  getForCharacter: protectedProcedure
    .input(z.object({ characterId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tokens = await TokenService.getTokensForCharacter(input.characterId, ctx.user.userId);
      return tokens;
    }),

  /**
   * Update token vision configuration
   */
  updateVision: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        visionConfig: visionConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const token = await TokenService.updateVision(
        input.tokenId,
        ctx.user.userId,
        input.visionConfig
      );
      return token;
    }),

  /**
   * Update token light configuration
   */
  updateLight: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
        lightConfig: lightConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const token = await TokenService.updateLight(
        input.tokenId,
        ctx.user.userId,
        input.lightConfig
      );
      return token;
    }),

  /**
   * Get default token configuration for a character
   */
  getDefaultConfig: protectedProcedure
    .input(z.object({ characterId: z.string().uuid() }))
    .query(async ({ input }) => {
      const config = await TokenService.getDefaultTokenConfig(input.characterId);
      return config;
    }),

  /**
   * Update default token configuration for a character
   */
  updateDefaultConfig: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        config: defaultConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const config = await TokenService.updateDefaultTokenConfig(
        input.characterId,
        ctx.user.userId,
        input.config
      );
      return config;
    }),

  /**
   * Apply default configuration to a token
   */
  applyDefaultConfig: protectedProcedure
    .input(z.object({ tokenId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const token = await TokenService.applyDefaultConfig(input.tokenId, ctx.user.userId);
      return token;
    }),
});

/**
 * Type export for client use
 */
export type TokensRouter = typeof tokensRouter;
