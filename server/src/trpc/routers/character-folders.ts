/**
 * Character Folders Router
 *
 * tRPC procedures for character folder management including:
 * - Folder CRUD operations
 * - Moving characters between folders
 * - Nested folder hierarchy
 *
 * @module server/trpc/routers/character-folders
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { CharacterFolderService } from '../../services/character-folder-service.js';

/**
 * Folder creation/update schemas
 */
const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentFolderId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentFolderId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * Character folders router
 * Groups all folder-related procedures
 */
export const characterFoldersRouter = router({
  /**
   * List all folders for the current user
   * Returns nested folder structure
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterFolderService.listFolders(userId);
    }),

  /**
   * Create a new folder
   */
  create: protectedProcedure
    .input(createFolderSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.userId;
      return await CharacterFolderService.createFolder(userId, input);
    }),

  /**
   * Update a folder
   */
  update: protectedProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        updates: updateFolderSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { folderId, updates } = input;
      const userId = ctx.user.userId;

      return await CharacterFolderService.updateFolder(folderId, userId, updates);
    }),

  /**
   * Delete a folder
   * Characters in the folder are moved to the parent folder (or root)
   */
  delete: protectedProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { folderId } = input;
      const userId = ctx.user.userId;

      const success = await CharacterFolderService.deleteFolder(folderId, userId);
      return { success };
    }),

  /**
   * Move a character to a folder
   */
  moveCharacter: protectedProcedure
    .input(
      z.object({
        characterId: z.string().uuid(),
        folderId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { characterId, folderId } = input;
      const userId = ctx.user.userId;

      const success = await CharacterFolderService.moveCharacterToFolder(
        characterId,
        folderId,
        userId
      );
      return { success };
    }),
});

/**
 * Type export for client use
 */
export type CharacterFoldersRouter = typeof characterFoldersRouter;
