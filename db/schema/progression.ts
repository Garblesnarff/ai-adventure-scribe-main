/**
 * Progression System Schema
 *
 * Database tables for D&D 5E experience points, leveling system, and character progression.
 * Implements PHB pg. 15 rules for XP thresholds and level advancement.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

import { characters , gameSessions } from './game.js';

import type { InferSelectModel, InferInsertModel} from 'drizzle-orm';

/**
 * Experience Events Table
 * Tracks all XP gains for characters with detailed source tracking
 */
export const experienceEvents = pgTable(
  'experience_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'set null' }),
    xpGained: integer('xp_gained').notNull(),
    source: text('source').notNull().$type<'combat' | 'quest' | 'roleplay' | 'milestone' | 'other'>(),
    description: text('description'),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index('idx_xp_events_character').on(table.characterId),
    sessionIdx: index('idx_xp_events_session').on(table.sessionId),
    sourceIdx: index('idx_xp_events_source').on(table.source),
    timestampIdx: index('idx_xp_events_timestamp').on(table.timestamp),
  })
);

/**
 * Level Progression Table
 * Tracks current level, XP, and progression for each character
 */
export const levelProgression = pgTable(
  'level_progression',
  {
    characterId: uuid('character_id').primaryKey().references(() => characters.id, { onDelete: 'cascade' }),
    currentLevel: integer('current_level').notNull().default(1),
    currentXp: integer('current_xp').notNull().default(0),
    xpToNextLevel: integer('xp_to_next_level').notNull(),
    totalXp: integer('total_xp').notNull().default(0),
    lastLevelUp: timestamp('last_level_up', { withTimezone: true, mode: 'date' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    levelIdx: index('idx_level_progression_level').on(table.currentLevel),
    updatedIdx: index('idx_level_progression_updated').on(table.updatedAt),
  })
);

// Define relations
export const experienceEventsRelations = relations(experienceEvents, ({ one }) => ({
  character: one(characters, {
    fields: [experienceEvents.characterId],
    references: [characters.id],
  }),
  session: one(gameSessions, {
    fields: [experienceEvents.sessionId],
    references: [gameSessions.id],
  }),
}));

export const levelProgressionRelations = relations(levelProgression, ({ one }) => ({
  character: one(characters, {
    fields: [levelProgression.characterId],
    references: [characters.id],
  }),
}));

// Type exports
export type ExperienceEvent = InferSelectModel<typeof experienceEvents>;
export type NewExperienceEvent = InferInsertModel<typeof experienceEvents>;
export type LevelProgression = InferSelectModel<typeof levelProgression>;
export type NewLevelProgression = InferInsertModel<typeof levelProgression>;
