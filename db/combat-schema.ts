/**
 * Drizzle ORM Schema for Combat System
 *
 * Type-safe table definitions for D&D 5E combat initiative and turn order.
 * Includes combat_encounters and combat_participants tables with relations.
 */

import { pgTable, uuid, text, timestamp, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { gameSessions } from './session-schema.js';

/**
 * Combat Encounters Table
 * Stores active combat encounters linked to game sessions
 * Maps to Supabase combat_encounters table
 */
export const combatEncounters = pgTable(
  'combat_encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    currentRound: integer('current_round').notNull().default(1),
    currentTurnOrder: integer('current_turn_order').notNull().default(0),
    status: text('status').notNull().default('active'), // 'active', 'paused', 'completed'
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('idx_combat_encounters_session').on(table.sessionId),
    statusIdx: index('idx_combat_encounters_status').on(table.status),
  })
);

/**
 * Combat Participants Table
 * Stores participants in combat encounters with initiative and turn order
 * Maps to Supabase combat_participants table
 */
export const combatParticipants = pgTable(
  'combat_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => combatEncounters.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id'), // References characters(id)
    npcId: uuid('npc_id'), // References npcs(id)
    name: text('name').notNull(),
    initiative: integer('initiative').notNull(),
    initiativeModifier: integer('initiative_modifier').notNull().default(0),
    turnOrder: integer('turn_order').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    hpCurrent: integer('hp_current'),
    hpMax: integer('hp_max'),
    conditions: jsonb('conditions').default('[]'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    encounterIdIdx: index('idx_combat_participants_encounter').on(table.encounterId),
    turnOrderIdx: index('idx_combat_participants_turn_order').on(table.encounterId, table.turnOrder),
    characterIdIdx: index('idx_combat_participants_character').on(table.characterId),
    npcIdIdx: index('idx_combat_participants_npc').on(table.npcId),
  })
);

// Relations for relational query builder
export const combatEncountersRelations = relations(combatEncounters, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [combatEncounters.sessionId],
    references: [gameSessions.id],
  }),
  participants: many(combatParticipants),
}));

export const combatParticipantsRelations = relations(combatParticipants, ({ one }) => ({
  encounter: one(combatEncounters, {
    fields: [combatParticipants.encounterId],
    references: [combatEncounters.id],
  }),
}));

// Type exports for TypeScript inference
export type CombatEncounter = InferSelectModel<typeof combatEncounters>;
export type NewCombatEncounter = InferInsertModel<typeof combatEncounters>;

export type CombatParticipant = InferSelectModel<typeof combatParticipants>;
export type NewCombatParticipant = InferInsertModel<typeof combatParticipants>;
