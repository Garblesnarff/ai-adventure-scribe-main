/**
 * Tokens Schema
 *
 * Database tables for Foundry VTT token integration.
 * Includes token entities, default configurations, and character-token associations.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, boolean, numeric, index, primaryKey } from 'drizzle-orm/pg-core';

import { characters } from './game.js';
import { scenes } from './scenes.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Tokens Table
 * Stores virtual tabletop tokens representing characters, NPCs, monsters, and objects
 */
export const tokens = pgTable(
  'tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // References
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'), // Links to character or monster ID
    createdBy: uuid('created_by').notNull(), // References auth.users(id)

    // Basic info
    name: text('name').notNull(),
    tokenType: text('token_type').notNull(), // 'character', 'npc', 'monster', 'object'

    // Position and transform
    positionX: numeric('position_x', { precision: 10, scale: 2 }).notNull(),
    positionY: numeric('position_y', { precision: 10, scale: 2 }).notNull(),
    rotation: numeric('rotation', { precision: 6, scale: 2 }).default('0'), // degrees
    elevation: numeric('elevation', { precision: 8, scale: 2 }).default('0'),

    // Size
    sizeWidth: numeric('size_width', { precision: 6, scale: 2 }).notNull(), // grid squares
    sizeHeight: numeric('size_height', { precision: 6, scale: 2 }).notNull(), // grid squares
    gridSize: text('grid_size').notNull(), // 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'

    // Appearance
    imageUrl: text('image_url'),
    avatarUrl: text('avatar_url'),
    tintColor: text('tint_color'), // hex color
    scale: numeric('scale', { precision: 4, scale: 2 }).default('1.0'),
    opacity: numeric('opacity', { precision: 3, scale: 2 }).default('1.0'), // 0-1

    // Border
    borderColor: text('border_color'), // hex color
    borderWidth: integer('border_width').default(2),

    // Nameplate
    showNameplate: boolean('show_nameplate').default(true),
    nameplatePosition: text('nameplate_position').default('bottom'), // 'top', 'bottom'

    // Vision
    visionEnabled: boolean('vision_enabled').default(false),
    visionRange: numeric('vision_range', { precision: 8, scale: 2 }), // in feet
    visionAngle: numeric('vision_angle', { precision: 6, scale: 2 }), // degrees, 360 for full circle
    nightVision: boolean('night_vision').default(false),
    darkvisionRange: numeric('darkvision_range', { precision: 8, scale: 2 }), // in feet

    // Lighting
    emitsLight: boolean('emits_light').default(false),
    lightRange: numeric('light_range', { precision: 8, scale: 2 }), // in feet
    lightAngle: numeric('light_angle', { precision: 6, scale: 2 }), // degrees
    lightColor: text('light_color'), // hex color
    lightIntensity: numeric('light_intensity', { precision: 3, scale: 2 }), // 0-1
    dimLightRange: numeric('dim_light_range', { precision: 8, scale: 2 }), // in feet
    brightLightRange: numeric('bright_light_range', { precision: 8, scale: 2 }), // in feet

    // State
    isLocked: boolean('is_locked').default(false),
    isHidden: boolean('is_hidden').default(false),
    isVisible: boolean('is_visible').default(true),

    // Movement
    movementSpeed: integer('movement_speed'), // in feet
    hasFlying: boolean('has_flying').default(false),
    hasSwimming: boolean('has_swimming').default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_tokens_scene_id').on(table.sceneId),
    actorIdIdx: index('idx_tokens_actor_id').on(table.actorId),
    createdByIdx: index('idx_tokens_created_by').on(table.createdBy),
    tokenTypeIdx: index('idx_tokens_token_type').on(table.tokenType),
  })
);

/**
 * Token Configurations Table
 * Stores default token appearance and behavior settings for characters and monsters
 */
export const tokenConfigurations = pgTable(
  'token_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // References
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }),
    monsterId: uuid('monster_id'), // For future monster table

    // Size
    sizeWidth: numeric('size_width', { precision: 6, scale: 2 }).default('1.0'), // grid squares
    sizeHeight: numeric('size_height', { precision: 6, scale: 2 }).default('1.0'), // grid squares
    gridSize: text('grid_size').default('medium'), // 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'

    // Appearance
    imageUrl: text('image_url'),
    avatarUrl: text('avatar_url'),
    tintColor: text('tint_color'), // hex color
    scale: numeric('scale', { precision: 4, scale: 2 }).default('1.0'),
    opacity: numeric('opacity', { precision: 3, scale: 2 }).default('1.0'), // 0-1

    // Border
    borderColor: text('border_color'), // hex color
    borderWidth: integer('border_width').default(2),

    // Nameplate
    showNameplate: boolean('show_nameplate').default(true),
    nameplatePosition: text('nameplate_position').default('bottom'), // 'top', 'bottom'

    // Vision
    visionEnabled: boolean('vision_enabled').default(false),
    visionRange: numeric('vision_range', { precision: 8, scale: 2 }), // in feet
    visionAngle: numeric('vision_angle', { precision: 6, scale: 2 }), // degrees, 360 for full circle
    nightVision: boolean('night_vision').default(false),
    darkvisionRange: numeric('darkvision_range', { precision: 8, scale: 2 }), // in feet

    // Lighting
    emitsLight: boolean('emits_light').default(false),
    lightRange: numeric('light_range', { precision: 8, scale: 2 }), // in feet
    lightAngle: numeric('light_angle', { precision: 6, scale: 2 }), // degrees
    lightColor: text('light_color'), // hex color
    lightIntensity: numeric('light_intensity', { precision: 3, scale: 2 }), // 0-1
    dimLightRange: numeric('dim_light_range', { precision: 8, scale: 2 }), // in feet
    brightLightRange: numeric('bright_light_range', { precision: 8, scale: 2 }), // in feet

    // Movement
    movementSpeed: integer('movement_speed'), // in feet
    hasFlying: boolean('has_flying').default(false),
    hasSwimming: boolean('has_swimming').default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdIdx: index('idx_token_configs_character_id').on(table.characterId),
    monsterIdIdx: index('idx_token_configs_monster_id').on(table.monsterId),
  })
);

/**
 * Character Tokens Junction Table
 * Many-to-many relationship between characters and tokens
 */
export const characterTokens = pgTable(
  'character_tokens',
  {
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    tokenId: uuid('token_id').notNull().references(() => tokens.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.tokenId] }),
    characterIdIdx: index('idx_character_tokens_character_id').on(table.characterId),
    tokenIdIdx: index('idx_character_tokens_token_id').on(table.tokenId),
  })
);

// =====================================================
// RELATIONS
// =====================================================

export const tokensRelations = relations(tokens, ({ one, many }) => ({
  scene: one(scenes, {
    fields: [tokens.sceneId],
    references: [scenes.id],
  }),
  characterTokens: many(characterTokens),
}));

export const tokenConfigurationsRelations = relations(tokenConfigurations, ({ one }) => ({
  character: one(characters, {
    fields: [tokenConfigurations.characterId],
    references: [characters.id],
  }),
}));

export const characterTokensRelations = relations(characterTokens, ({ one }) => ({
  character: one(characters, {
    fields: [characterTokens.characterId],
    references: [characters.id],
  }),
  token: one(tokens, {
    fields: [characterTokens.tokenId],
    references: [tokens.id],
  }),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type Token = InferSelectModel<typeof tokens>;
export type NewToken = InferInsertModel<typeof tokens>;

export type TokenConfiguration = InferSelectModel<typeof tokenConfigurations>;
export type NewTokenConfiguration = InferInsertModel<typeof tokenConfigurations>;

export type CharacterToken = InferSelectModel<typeof characterTokens>;
export type NewCharacterToken = InferInsertModel<typeof characterTokens>;
