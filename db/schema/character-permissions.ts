/**
 * Character Permissions and Folders Schema
 *
 * Database tables for character sharing, permissions, and organization.
 * Part of Phase 1.5 - Foundry VTT integration.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, boolean, integer, index, unique, pgEnum } from 'drizzle-orm/pg-core';

import { characters } from './game.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Enums
 */
export const permissionLevelEnum = pgEnum('permission_level', ['viewer', 'editor', 'owner']);

/**
 * Character Permissions Table
 * Manages granular permissions for character sharing
 */
export const characterPermissions = pgTable(
  'character_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // References auth.users(id)
    permissionLevel: permissionLevelEnum('permission_level').notNull().default('viewer'),
    canControlToken: boolean('can_control_token').notNull().default(false),
    canEditSheet: boolean('can_edit_sheet').notNull().default(false),
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    grantedBy: text('granted_by').notNull(), // References auth.users(id)
  },
  (table) => ({
    characterIdIdx: index('idx_character_permissions_character_id').on(table.characterId),
    userIdIdx: index('idx_character_permissions_user_id').on(table.userId),
    uniqueCharacterUser: unique('unique_character_user_permission').on(table.characterId, table.userId),
  })
);

/**
 * Character Folders Table
 * Organizes characters into folders with support for nesting
 */
export const characterFolders = pgTable(
  'character_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // References auth.users(id)
    name: text('name').notNull(),
    parentFolderId: uuid('parent_folder_id'), // Self-reference for nesting
    color: text('color'), // Hex color code
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_character_folders_user_id').on(table.userId),
    parentFolderIdIdx: index('idx_character_folders_parent_folder_id').on(table.parentFolderId),
    sortOrderIdx: index('idx_character_folders_sort_order').on(table.userId, table.sortOrder),
  })
);

// Define relations
export const characterPermissionsRelations = relations(characterPermissions, ({ one }) => ({
  character: one(characters, {
    fields: [characterPermissions.characterId],
    references: [characters.id],
  }),
}));

export const characterFoldersRelations = relations(characterFolders, ({ one, many }) => ({
  parentFolder: one(characterFolders, {
    fields: [characterFolders.parentFolderId],
    references: [characterFolders.id],
    relationName: 'folder_hierarchy',
  }),
  subFolders: many(characterFolders, {
    relationName: 'folder_hierarchy',
  }),
  characters: many(characters),
}));

// Type exports
export type CharacterPermission = InferSelectModel<typeof characterPermissions>;
export type NewCharacterPermission = InferInsertModel<typeof characterPermissions>;
export type CharacterFolder = InferSelectModel<typeof characterFolders>;
export type NewCharacterFolder = InferInsertModel<typeof characterFolders>;
export type PermissionLevel = 'viewer' | 'editor' | 'owner';
