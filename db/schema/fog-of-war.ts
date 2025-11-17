/**
 * Fog of War & Vision Schema
 *
 * Database tables for Foundry VTT-style fog of war and vision systems.
 * Includes per-user fog revelation tracking and vision-blocking shapes.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, index, boolean, unique } from 'drizzle-orm/pg-core';

import { scenes } from './scenes.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Fog of War Table
 * Tracks revealed areas per user per scene for fog of war exploration
 * Each user has their own fog of war state for each scene
 */
export const fogOfWar = pgTable(
  'fog_of_war',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // References auth.users(id)
    revealedAreas: jsonb('revealed_areas').notNull().$type<Array<{
      id: string;
      points: Array<{ x: number; y: number }>;
      revealedAt: string;
      revealedBy?: string;
      isPermanent: boolean;
    }>>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_fog_of_war_scene_id').on(table.sceneId),
    userIdIdx: index('idx_fog_of_war_user_id').on(table.userId),
    sceneUserUnique: unique('unique_fog_of_war_scene_user').on(table.sceneId, table.userId),
  })
);

/**
 * Vision Blocking Shapes Table
 * Stores walls, doors, windows, and terrain that block vision, movement, or light
 * These are scene-level elements that affect all tokens
 */
export const visionBlockingShapes = pgTable(
  'vision_blocking_shapes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    shapeType: text('shape_type').notNull().$type<'wall' | 'door' | 'window' | 'terrain'>(),
    pointsData: jsonb('points_data').notNull().$type<Array<{ x: number; y: number }>>(),
    blocksMovement: boolean('blocks_movement').default(true).notNull(),
    blocksVision: boolean('blocks_vision').default(true).notNull(),
    blocksLight: boolean('blocks_light').default(true).notNull(),
    isOneWay: boolean('is_one_way').default(false).notNull(),
    doorState: text('door_state').$type<'open' | 'closed' | 'locked'>(), // Only for doors
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    createdBy: text('created_by').notNull(), // References auth.users(id)
  },
  (table) => ({
    sceneIdIdx: index('idx_vision_blocking_shapes_scene_id').on(table.sceneId),
    createdByIdx: index('idx_vision_blocking_shapes_created_by').on(table.createdBy),
    shapeTypeIdx: index('idx_vision_blocking_shapes_shape_type').on(table.shapeType),
  })
);

// Define relations
export const fogOfWarRelations = relations(fogOfWar, ({ one }) => ({
  scene: one(scenes, {
    fields: [fogOfWar.sceneId],
    references: [scenes.id],
  }),
}));

export const visionBlockingShapesRelations = relations(visionBlockingShapes, ({ one }) => ({
  scene: one(scenes, {
    fields: [visionBlockingShapes.sceneId],
    references: [scenes.id],
  }),
}));

// Type exports
export type FogOfWar = InferSelectModel<typeof fogOfWar>;
export type NewFogOfWar = InferInsertModel<typeof fogOfWar>;
export type VisionBlockingShape = InferSelectModel<typeof visionBlockingShapes>;
export type NewVisionBlockingShape = InferInsertModel<typeof visionBlockingShapes>;
