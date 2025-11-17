/**
 * Drawings & Measurements Schema
 *
 * Database tables for Foundry VTT-style drawing tools and measurement templates.
 * Includes freehand drawings, shapes, text annotations, and spell/ability area templates.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, boolean, real, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

import { scenes } from './scenes.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Drawing Type Enum
 * Types of drawings that can be created on scenes
 */
export const drawingTypeEnum = pgEnum('drawing_type', [
  'freehand',
  'line',
  'circle',
  'rectangle',
  'polygon',
  'text',
]);

/**
 * Template Type Enum
 * Types of measurement templates for spells and abilities
 */
export const templateTypeEnum = pgEnum('template_type', [
  'cone',
  'cube',
  'sphere',
  'cylinder',
  'line',
  'ray',
]);

/**
 * Scene Drawings Table
 * User-created drawings and annotations on scenes (maps)
 */
export const sceneDrawings = pgTable(
  'scene_drawings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull(), // References auth.users(id)

    // Drawing configuration
    drawingType: drawingTypeEnum('drawing_type').notNull(),
    pointsData: jsonb('points_data').notNull(), // Array of {x, y} coordinates
    strokeColor: text('stroke_color').notNull(), // Hex color
    strokeWidth: integer('stroke_width').notNull(),
    fillColor: text('fill_color'), // Hex color, nullable
    fillOpacity: real('fill_opacity').default(0).notNull(), // 0-1
    zIndex: integer('z_index').default(0).notNull(),

    // Text-specific properties
    textContent: text('text_content'), // For 'text' type
    fontSize: integer('font_size'), // For 'text' type
    fontFamily: text('font_family'), // For 'text' type

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_scene_drawings_scene_id').on(table.sceneId),
    createdByIdx: index('idx_scene_drawings_created_by').on(table.createdBy),
    drawingTypeIdx: index('idx_scene_drawings_drawing_type').on(table.drawingType),
  })
);

/**
 * Measurement Templates Table
 * Area-of-effect templates for spells and abilities (cones, spheres, etc.)
 */
export const measurementTemplates = pgTable(
  'measurement_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull(), // References auth.users(id)

    // Template configuration
    templateType: templateTypeEnum('template_type').notNull(),
    originX: real('origin_x').notNull(), // Grid coordinates
    originY: real('origin_y').notNull(), // Grid coordinates
    direction: real('direction').notNull(), // Degrees, for directional templates
    distance: real('distance').notNull(), // Radius or length in feet
    width: real('width'), // For line templates, in feet

    // Visual properties
    color: text('color').default('#FF0000').notNull(), // Hex color
    opacity: real('opacity').default(0.5).notNull(), // 0-1

    // Lifecycle
    isTemporary: boolean('is_temporary').default(true).notNull(), // Auto-delete after use

    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sceneIdIdx: index('idx_measurement_templates_scene_id').on(table.sceneId),
    createdByIdx: index('idx_measurement_templates_created_by').on(table.createdBy),
    templateTypeIdx: index('idx_measurement_templates_template_type').on(table.templateType),
    isTemporaryIdx: index('idx_measurement_templates_is_temporary').on(table.isTemporary),
  })
);

// =====================================================
// RELATIONS
// =====================================================

export const sceneDrawingsRelations = relations(sceneDrawings, ({ one }) => ({
  scene: one(scenes, {
    fields: [sceneDrawings.sceneId],
    references: [scenes.id],
  }),
}));

export const measurementTemplatesRelations = relations(measurementTemplates, ({ one }) => ({
  scene: one(scenes, {
    fields: [measurementTemplates.sceneId],
    references: [scenes.id],
  }),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type SceneDrawing = InferSelectModel<typeof sceneDrawings>;
export type NewSceneDrawing = InferInsertModel<typeof sceneDrawings>;

export type MeasurementTemplate = InferSelectModel<typeof measurementTemplates>;
export type NewMeasurementTemplate = InferInsertModel<typeof measurementTemplates>;
