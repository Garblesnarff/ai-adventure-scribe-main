/**
 * Class Features Schema
 *
 * Database tables for D&D 5E class features system including feature library,
 * character features, subclass tracking, and feature usage logging.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

import { characters , gameSessions } from './game.js';

import type { InferSelectModel, InferInsertModel} from 'drizzle-orm';

/**
 * Class Features Library Table
 * Stores all available class features from D&D 5E PHB
 */
export const classFeaturesLibrary = pgTable(
  'class_features_library',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    className: text('class_name').notNull(),
    subclassName: text('subclass_name'),
    featureName: text('feature_name').notNull(),
    levelAcquired: integer('level_acquired').notNull(),
    description: text('description').notNull(),
    mechanicalEffects: text('mechanical_effects'),
    usageType: text('usage_type').$type<'passive' | 'action' | 'bonus_action' | 'reaction' | 'limited_use'>(),
    usesPerRest: text('uses_per_rest').$type<'at_will' | 'short_rest' | 'long_rest' | 'other'>(),
    usesCount: integer('uses_count'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    classIdx: index('idx_class_features_class').on(table.className, table.levelAcquired),
    subclassIdx: index('idx_class_features_subclass').on(table.subclassName),
  })
);

/**
 * Character Features Table
 * Tracks features granted to individual characters
 */
export const characterFeatures = pgTable(
  'character_features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    featureId: uuid('feature_id').notNull().references(() => classFeaturesLibrary.id, { onDelete: 'cascade' }),
    usesRemaining: integer('uses_remaining'),
    isActive: boolean('is_active').notNull().default(true),
    acquiredAtLevel: integer('acquired_at_level').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_character_features_character').on(table.characterId),
    featureIdx: index('idx_character_features_feature').on(table.featureId),
  })
);

/**
 * Character Subclasses Table
 * Tracks subclass choices for characters (permanent once chosen)
 */
export const characterSubclasses = pgTable(
  'character_subclasses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    className: text('class_name').notNull(),
    subclassName: text('subclass_name').notNull(),
    chosenAtLevel: integer('chosen_at_level').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_character_subclasses_character').on(table.characterId),
  })
);

/**
 * Feature Usage Log Table
 * Tracks when and how features are used during gameplay
 */
export const featureUsageLog = pgTable(
  'feature_usage_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    featureId: uuid('feature_id').notNull().references(() => classFeaturesLibrary.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'set null' }),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    context: text('context'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_feature_usage_character').on(table.characterId),
    featureIdx: index('idx_feature_usage_feature').on(table.featureId),
    sessionIdx: index('idx_feature_usage_session').on(table.sessionId),
  })
);

// Define relations
export const classFeaturesLibraryRelations = relations(classFeaturesLibrary, ({ many }) => ({
  characterFeatures: many(characterFeatures),
  usageLogs: many(featureUsageLog),
}));

export const characterFeaturesRelations = relations(characterFeatures, ({ one }) => ({
  character: one(characters, {
    fields: [characterFeatures.characterId],
    references: [characters.id],
  }),
  feature: one(classFeaturesLibrary, {
    fields: [characterFeatures.featureId],
    references: [classFeaturesLibrary.id],
  }),
}));

export const characterSubclassesRelations = relations(characterSubclasses, ({ one }) => ({
  character: one(characters, {
    fields: [characterSubclasses.characterId],
    references: [characters.id],
  }),
}));

export const featureUsageLogRelations = relations(featureUsageLog, ({ one }) => ({
  character: one(characters, {
    fields: [featureUsageLog.characterId],
    references: [characters.id],
  }),
  feature: one(classFeaturesLibrary, {
    fields: [featureUsageLog.featureId],
    references: [classFeaturesLibrary.id],
  }),
  session: one(gameSessions, {
    fields: [featureUsageLog.sessionId],
    references: [gameSessions.id],
  }),
}));

// Type exports
export type ClassFeatureLibrary = InferSelectModel<typeof classFeaturesLibrary>;
export type NewClassFeatureLibrary = InferInsertModel<typeof classFeaturesLibrary>;
export type CharacterFeature = InferSelectModel<typeof characterFeatures>;
export type NewCharacterFeature = InferInsertModel<typeof characterFeatures>;
export type CharacterSubclass = InferSelectModel<typeof characterSubclasses>;
export type NewCharacterSubclass = InferInsertModel<typeof characterSubclasses>;
export type FeatureUsageLog = InferSelectModel<typeof featureUsageLog>;
export type NewFeatureUsageLog = InferInsertModel<typeof featureUsageLog>;
