/**
 * Characters Router
 *
 * tRPC procedures for character management including:
 * - Sharing and permissions
 * - Export/Import
 * - Character CRUD operations
 *
 * @module server/trpc/routers/characters
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { CharacterService } from '../../services/character-service.js';

/**
 * Permission level enum for validation
 */
const permissionLevelSchema = z.enum(['viewer', 'editor', 'owner']);

/**
 * Character export/import schemas
 */
const characterExportSchema = z.object({
  version: z.string(),
  character: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    race: z.string().nullable().optional(),
    class: z.string().nullable().optional(),
    level: z.number().optional(),
    alignment: z.string().nullable().optional(),
    experiencePoints: z.number().optional(),
    background: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    backgroundImage: z.string().nullable().optional(),
    appearance: z.string().nullable().optional(),
    personalityTraits: z.string().nullable().optional(),
    personalityNotes: z.string().nullable().optional(),
    backstoryElements: z.string().nullable().optional(),
    cantrips: z.string().nullable().optional(),
    knownSpells: z.string().nullable().optional(),
    preparedSpells: z.string().nullable().optional(),
    ritualSpells: z.string().nullable().optional(),
    visionTypes: z.array(z.string()).nullable().optional(),
    obscurement: z.string().nullable().optional(),
    isHidden: z.boolean().optional(),
  }),
  stats: z.object({
    strength: z.number().optional(),
    dexterity: z.number().optional(),
    constitution: z.number().optional(),
    intelligence: z.number().optional(),
    wisdom: z.number().optional(),
    charisma: z.number().optional(),
  }).nullable().optional(),
  exportedAt: z.string().optional(),
});

/**
 * Characters router
 * Groups all character-related procedures
 */
export const charactersRouter = router({
  /**
   * Share a character with another user
   */
  share: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        targetUserId: z.string(),
        permission: permissionLevelSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId, targetUserId, permission } = input;
      const userId = ctx.user.userId;

      return await CharacterService.shareCharacter(
        characterId,
        userId,
        targetUserId,
        permission
      );
    }),

  /**
   * Update permission for a user
   */
  updatePermission: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        targetUserId: z.string(),
        permission: permissionLevelSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId, targetUserId, permission } = input;
      const userId = ctx.user.userId;

      return await CharacterService.updatePermission(
        characterId,
        userId,
        targetUserId,
        permission
      );
    }),

  /**
   * Revoke permission from a user
   */
  revokePermission: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId, targetUserId } = input;
      const userId = ctx.user.userId;

      const success = await CharacterService.revokePermission(
        characterId,
        userId,
        targetUserId
      );

      return { success };
    }),

  /**
   * List characters shared with the current user
   */
  listShared: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterService.listSharedCharacters(userId);
    }),

  /**
   * List permissions for a character
   */
  listPermissions: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { characterId } = input;
      const userId = ctx.user.userId;

      return await CharacterService.listPermissions(characterId, userId);
    }),

  /**
   * Export character to JSON
   */
  export: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { characterId } = input;
      const userId = ctx.user.userId;

      return await CharacterService.exportCharacter(characterId, userId);
    }),

  /**
   * Import character from JSON
   */
  import: protectedProcedure
    .input(characterExportSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterService.importCharacter(userId, input);
    }),

  /**
   * List all characters for the current user
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterService.listForUser(userId);
    }),

  /**
   * Get a single character by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { characterId } = input;
      const userId = ctx.user.userId;

      return await CharacterService.getById(characterId, userId);
    }),

  /**
   * Create a new character
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        race: z.string().optional(),
        class: z.string().optional(),
        level: z.number().min(1).max(20).optional(),
        alignment: z.string().optional(),
        experiencePoints: z.number().optional(),
        background: z.string().optional(),
        imageUrl: z.string().optional(),
        avatarUrl: z.string().optional(),
        appearance: z.string().optional(),
        personalityTraits: z.string().optional(),
        backstoryElements: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterService.create(userId, input);
    }),

  /**
   * Update a character
   */
  update: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        race: z.string().optional(),
        class: z.string().optional(),
        level: z.number().min(1).max(20).optional(),
        alignment: z.string().optional(),
        experiencePoints: z.number().optional(),
        background: z.string().optional(),
        imageUrl: z.string().optional(),
        avatarUrl: z.string().optional(),
        appearance: z.string().optional(),
        personalityTraits: z.string().optional(),
        backstoryElements: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId, ...data } = input;
      const userId = ctx.user.userId;

      return await CharacterService.update(characterId, userId, data);
    }),

  /**
   * Delete a character
   */
  delete: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId } = input;
      const userId = ctx.user.userId;

      const success = await CharacterService.delete(characterId, userId);
      return { success };
    }),
});

/**
 * Type export for client use
 */
export type CharactersRouter = typeof charactersRouter;
