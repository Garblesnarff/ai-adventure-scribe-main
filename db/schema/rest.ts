/**
 * Rest System Schema
 *
 * Database tables for D&D 5E rest mechanics including short rests, long rests,
 * and hit dice management for character recovery.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

import { characters , gameSessions } from './game.js';

import type { InferSelectModel, InferInsertModel} from 'drizzle-orm';

/**
 * Rest Events Table
 * Tracks all rest events (short and long) for characters
 */
export const restEvents = pgTable(
  'rest_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'set null' }),
    restType: text('rest_type').notNull().$type<'short' | 'long'>(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    hpRestored: integer('hp_restored'),
    hitDiceSpent: integer('hit_dice_spent'),
    resourcesRestored: text('resources_restored'), // JSON string
    interrupted: boolean('interrupted').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_rest_events_character').on(table.characterId),
    sessionIdx: index('idx_rest_events_session').on(table.sessionId),
    typeIdx: index('idx_rest_events_type').on(table.restType),
    completedIdx: index('idx_rest_events_completed').on(table.completedAt),
  })
);

/**
 * Character Hit Dice Table
 * Tracks hit dice per class for each character (supports multiclassing)
 */
export const characterHitDice = pgTable(
  'character_hit_dice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    className: text('class_name').notNull(),
    dieType: text('die_type').notNull().$type<'d6' | 'd8' | 'd10' | 'd12'>(),
    totalDice: integer('total_dice').notNull(),
    usedDice: integer('used_dice').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_hit_dice_character').on(table.characterId),
    classIdx: index('idx_hit_dice_class').on(table.className),
  })
);

// Define relations
export const restEventsRelations = relations(restEvents, ({ one }) => ({
  character: one(characters, {
    fields: [restEvents.characterId],
    references: [characters.id],
  }),
  session: one(gameSessions, {
    fields: [restEvents.sessionId],
    references: [gameSessions.id],
  }),
}));

export const characterHitDiceRelations = relations(characterHitDice, ({ one }) => ({
  character: one(characters, {
    fields: [characterHitDice.characterId],
    references: [characters.id],
  }),
}));

// Type exports
export type RestEvent = InferSelectModel<typeof restEvents>;
export type NewRestEvent = InferInsertModel<typeof restEvents>;
export type CharacterHitDice = InferSelectModel<typeof characterHitDice>;
export type NewCharacterHitDice = InferInsertModel<typeof characterHitDice>;
