/**
 * Scenes & Maps Schema
 *
 * Database tables for Foundry VTT-style scene management.
 * Includes scenes (maps), scene layers, and scene settings.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, boolean, numeric, index } from 'drizzle-orm/pg-core';

import { campaigns } from './game.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Scenes Table
 * Visual maps/battlegrounds for campaigns with grid configuration
 */
export const scenes = pgTable(
  'scenes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // References auth.users(id)
    width: integer('width').notNull(), // Grid width in cells
    height: integer('height').notNull(), // Grid height in cells
    gridSize: integer('grid_size').default(5).notNull(), // Default 5ft squares
    gridType: text('grid_type').default('square').notNull(), // 'square', 'hexagonal_horizontal', 'hexagonal_vertical', 'gridless'
    gridColor: text('grid_color').default('#000000'), // Hex color
    backgroundImageUrl: text('background_image_url'),
    thumbnailUrl: text('thumbnail_url'),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    campaignIdIdx: index('idx_scenes_campaign_id').on(table.campaignId),
    userIdIdx: index('idx_scenes_user_id').on(table.userId),
    isActiveIdx: index('idx_scenes_is_active').on(table.isActive),
    nameIdx: index('idx_scenes_name').on(table.name),
  })
);

/**
 * Scene Layers Table
 * Visual layers for organizing scene content (background, tokens, effects, etc.)
 */
export const sceneLayers = pgTable(
  'scene_layers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    layerType: text('layer_type').notNull(), // 'background', 'grid', 'tokens', 'effects', 'drawings', 'ui'
    zIndex: integer('z_index').notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
    opacity: numeric('opacity', { precision: 3, scale: 2 }).default('1.00').notNull(), // 0.00 to 1.00
    locked: boolean('locked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_scene_layers_scene_id').on(table.sceneId),
    layerTypeIdx: index('idx_scene_layers_layer_type').on(table.layerType),
    zIndexIdx: index('idx_scene_layers_z_index').on(table.zIndex),
  })
);

/**
 * Scene Settings Table
 * Configuration for fog of war, lighting, grid settings, and environmental effects
 * One-to-one relationship with scenes
 */
export const sceneSettings = pgTable(
  'scene_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().unique().references(() => scenes.id, { onDelete: 'cascade' }),
    enableFogOfWar: boolean('enable_fog_of_war').default(false).notNull(),
    enableDynamicLighting: boolean('enable_dynamic_lighting').default(false).notNull(),
    snapToGrid: boolean('snap_to_grid').default(true).notNull(),
    gridOpacity: numeric('grid_opacity', { precision: 3, scale: 2 }).default('0.30').notNull(), // 0.00 to 1.00
    ambientLightLevel: numeric('ambient_light_level', { precision: 3, scale: 2 }).default('1.00').notNull(), // 0.00 to 1.00
    darknessLevel: numeric('darkness_level', { precision: 3, scale: 2 }).default('0.00').notNull(), // 0.00 to 1.00
    weatherEffects: text('weather_effects'),
    timeOfDay: text('time_of_day'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_scene_settings_scene_id').on(table.sceneId),
  })
);

// Define relations
export const scenesRelations = relations(scenes, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [scenes.campaignId],
    references: [campaigns.id],
  }),
  layers: many(sceneLayers),
  settings: one(sceneSettings, {
    fields: [scenes.id],
    references: [sceneSettings.sceneId],
  }),
}));

export const sceneLayersRelations = relations(sceneLayers, ({ one }) => ({
  scene: one(scenes, {
    fields: [sceneLayers.sceneId],
    references: [scenes.id],
  }),
}));

export const sceneSettingsRelations = relations(sceneSettings, ({ one }) => ({
  scene: one(scenes, {
    fields: [sceneSettings.sceneId],
    references: [scenes.id],
  }),
}));

// Type exports
export type Scene = InferSelectModel<typeof scenes>;
export type NewScene = InferInsertModel<typeof scenes>;
export type SceneLayer = InferSelectModel<typeof sceneLayers>;
export type NewSceneLayer = InferInsertModel<typeof sceneLayers>;
export type SceneSetting = InferSelectModel<typeof sceneSettings>;
export type NewSceneSetting = InferInsertModel<typeof sceneSettings>;
