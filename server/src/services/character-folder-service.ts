/**
 * Character Folder Service
 *
 * Handles character folder operations for organizing characters.
 * Provides type-safe database queries for folder creation, updates,
 * deletion, and character movement between folders.
 *
 * @module server/services/character-folder-service
 */

import { db } from '../../../db/client.js';
import {
  characterFolders,
  characters,
  type CharacterFolder,
  type NewCharacterFolder,
} from '../../../db/schema/index.js';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { InternalServerError } from '../lib/errors.js';

export interface CreateFolderData {
  name: string;
  parentFolderId?: string | null;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface FolderWithChildren extends CharacterFolder {
  children: FolderWithChildren[];
  characterCount?: number;
}

export class CharacterFolderService {
  /**
   * Build a nested folder structure from flat list
   */
  private static buildFolderTree(
    folders: CharacterFolder[],
    parentId: string | null = null
  ): FolderWithChildren[] {
    return folders
      .filter(folder => folder.parentFolderId === parentId)
      .map(folder => ({
        ...folder,
        children: this.buildFolderTree(folders, folder.id),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get all folder IDs in a subtree (including the folder itself)
   */
  private static async getFolderSubtree(folderId: string): Promise<string[]> {
    const allFolders = await db.query.characterFolders.findMany({
      columns: { id: true, parentFolderId: true },
    });

    const subtree: string[] = [folderId];
    let currentLevel = [folderId];

    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];
      for (const folder of allFolders) {
        if (folder.parentFolderId && currentLevel.includes(folder.parentFolderId)) {
          subtree.push(folder.id);
          nextLevel.push(folder.id);
        }
      }
      currentLevel = nextLevel;
    }

    return subtree;
  }

  /**
   * List all folders for a user with nested structure
   */
  static async listFolders(userId: string): Promise<FolderWithChildren[]> {
    const folders = await db.query.characterFolders.findMany({
      where: eq(characterFolders.userId, userId),
      orderBy: [asc(characterFolders.sortOrder)],
    });

    // Get character counts for each folder
    const allCharacters = await db.query.characters.findMany({
      where: eq(characters.userId, userId),
      columns: { id: true, folderId: true },
    });

    const folderCounts = new Map<string, number>();
    for (const char of allCharacters) {
      if (char.folderId) {
        folderCounts.set(char.folderId, (folderCounts.get(char.folderId) || 0) + 1);
      }
    }

    const foldersWithCounts = folders.map(folder => ({
      ...folder,
      characterCount: folderCounts.get(folder.id) || 0,
    }));

    return this.buildFolderTree(foldersWithCounts);
  }

  /**
   * Create a new folder
   */
  static async createFolder(userId: string, data: CreateFolderData): Promise<CharacterFolder> {
    // Validate parent folder exists and belongs to user if specified
    if (data.parentFolderId) {
      const parentFolder = await db.query.characterFolders.findFirst({
        where: and(
          eq(characterFolders.id, data.parentFolderId),
          eq(characterFolders.userId, userId)
        ),
      });

      if (!parentFolder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent folder not found',
        });
      }
    }

    // Get next sort order if not provided
    let sortOrder = data.sortOrder ?? 0;
    if (data.sortOrder === undefined) {
      const existingFolders = await db.query.characterFolders.findMany({
        where: and(
          eq(characterFolders.userId, userId),
          data.parentFolderId
            ? eq(characterFolders.parentFolderId, data.parentFolderId)
            : isNull(characterFolders.parentFolderId)
        ),
        columns: { sortOrder: true },
      });

      sortOrder = existingFolders.length > 0
        ? Math.max(...existingFolders.map(f => f.sortOrder)) + 1
        : 0;
    }

    const [folder] = await db
      .insert(characterFolders)
      .values({
        userId,
        name: data.name,
        parentFolderId: data.parentFolderId || null,
        color: data.color || null,
        icon: data.icon || null,
        sortOrder,
      })
      .returning();

    if (!folder) {
      throw new InternalServerError('Failed to create folder');
    }

    return folder;
  }

  /**
   * Update a folder
   */
  static async updateFolder(
    folderId: string,
    userId: string,
    updates: Partial<CharacterFolder>
  ): Promise<CharacterFolder> {
    // Verify ownership
    const existingFolder = await db.query.characterFolders.findFirst({
      where: and(
        eq(characterFolders.id, folderId),
        eq(characterFolders.userId, userId)
      ),
    });

    if (!existingFolder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      });
    }

    // Prevent moving folder to be its own child
    if (updates.parentFolderId) {
      const subtree = await this.getFolderSubtree(folderId);
      if (subtree.includes(updates.parentFolderId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot move folder to be a child of itself',
        });
      }

      // Verify parent folder exists and belongs to user
      const parentFolder = await db.query.characterFolders.findFirst({
        where: and(
          eq(characterFolders.id, updates.parentFolderId),
          eq(characterFolders.userId, userId)
        ),
      });

      if (!parentFolder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent folder not found',
        });
      }
    }

    const [updated] = await db
      .update(characterFolders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(characterFolders.id, folderId),
        eq(characterFolders.userId, userId)
      ))
      .returning();

    if (!updated) {
      throw new InternalServerError('Failed to update folder');
    }

    return updated;
  }

  /**
   * Delete a folder (moves characters to parent or root)
   */
  static async deleteFolder(folderId: string, userId: string): Promise<boolean> {
    // Verify ownership
    const folder = await db.query.characterFolders.findFirst({
      where: and(
        eq(characterFolders.id, folderId),
        eq(characterFolders.userId, userId)
      ),
    });

    if (!folder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Folder not found',
      });
    }

    // Move all characters in this folder to the parent folder (or root if no parent)
    await db
      .update(characters)
      .set({ folderId: folder.parentFolderId })
      .where(eq(characters.folderId, folderId));

    // Move all subfolders to the parent folder (or root if no parent)
    await db
      .update(characterFolders)
      .set({ parentFolderId: folder.parentFolderId })
      .where(eq(characterFolders.parentFolderId, folderId));

    // Delete the folder
    const result = await db
      .delete(characterFolders)
      .where(and(
        eq(characterFolders.id, folderId),
        eq(characterFolders.userId, userId)
      ))
      .returning({ id: characterFolders.id });

    return result.length > 0;
  }

  /**
   * Move a character to a folder
   */
  static async moveCharacterToFolder(
    characterId: string,
    folderId: string | null,
    userId: string
  ): Promise<boolean> {
    // Verify character ownership
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ),
    });

    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Character not found',
      });
    }

    // If moving to a folder, verify it exists and belongs to user
    if (folderId) {
      const folder = await db.query.characterFolders.findFirst({
        where: and(
          eq(characterFolders.id, folderId),
          eq(characterFolders.userId, userId)
        ),
      });

      if (!folder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Folder not found',
        });
      }
    }

    // Move character
    const result = await db
      .update(characters)
      .set({
        folderId: folderId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ))
      .returning({ id: characters.id });

    return result.length > 0;
  }
}
