/**
 * Combat Schema
 *
 * Database tables for D&D 5E combat system including encounters, participants,
 * HP tracking, and damage logging.
 */

import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { gameSessions } from './game.js';
import { characters } from './game.js';

/**
 * Combat Encounters Table
 * Tracks combat encounters within game sessions
 */
export const combatEncounters = pgTable(
  'combat_encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    currentRound: integer('current_round').notNull().default(1),
    currentTurnParticipantId: uuid('current_turn_participant_id'),
    location: text('location'),
    difficulty: text('difficulty'),
    experienceAwarded: integer('experience_awarded'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('idx_combat_encounters_session').on(table.sessionId),
    statusIdx: index('idx_combat_encounters_status').on(table.status),
  })
);

/**
 * Combat Participants Table
 * Stores participants (PCs, NPCs, monsters) in combat encounters
 */
export const combatParticipants = pgTable(
  'combat_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id').notNull().references(() => combatEncounters.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    participantType: text('participant_type').notNull(),
    initiative: integer('initiative').notNull().default(0),
    armorClass: integer('armor_class').notNull().default(10),
    maxHp: integer('max_hp').notNull(),
    speed: integer('speed').notNull().default(30),
    damageResistances: text('damage_resistances').array().default([]),
    damageImmunities: text('damage_immunities').array().default([]),
    damageVulnerabilities: text('damage_vulnerabilities').array().default([]),
    multiclassInfo: text('multiclass_info'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    encounterIdx: index('idx_combat_participants_encounter').on(table.encounterId),
    characterIdx: index('idx_combat_participants_character').on(table.characterId),
    initiativeIdx: index('idx_combat_participants_initiative').on(table.encounterId, table.initiative),
  })
);

/**
 * Combat Participant Status Table
 * Tracks current HP, temp HP, consciousness, and death saves
 */
export const combatParticipantStatus = pgTable(
  'combat_participant_status',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id').notNull().references(() => combatParticipants.id, { onDelete: 'cascade' }),
    currentHp: integer('current_hp').notNull(),
    maxHp: integer('max_hp').notNull(),
    tempHp: integer('temp_hp').notNull().default(0),
    isConscious: boolean('is_conscious').notNull().default(true),
    deathSavesSuccesses: integer('death_saves_successes').notNull().default(0),
    deathSavesFailures: integer('death_saves_failures').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    participantIdx: index('idx_combat_participant_status_participant').on(table.participantId),
  })
);

/**
 * Combat Damage Log Table
 * Tracks all damage dealt during combat for analytics and history
 */
export const combatDamageLog = pgTable(
  'combat_damage_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id').notNull().references(() => combatEncounters.id, { onDelete: 'cascade' }),
    participantId: uuid('participant_id').notNull().references(() => combatParticipants.id, { onDelete: 'cascade' }),
    damageAmount: integer('damage_amount').notNull(),
    damageType: text('damage_type').notNull(),
    sourceParticipantId: uuid('source_participant_id').references(() => combatParticipants.id, { onDelete: 'set null' }),
    sourceDescription: text('source_description'),
    roundNumber: integer('round_number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    encounterIdx: index('idx_combat_damage_log_encounter').on(table.encounterId),
    participantIdx: index('idx_combat_damage_log_participant').on(table.participantId),
    roundIdx: index('idx_combat_damage_log_round').on(table.encounterId, table.roundNumber),
  })
);

// Define relations
export const combatEncountersRelations = relations(combatEncounters, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [combatEncounters.sessionId],
    references: [gameSessions.id],
  }),
  participants: many(combatParticipants),
  damageLog: many(combatDamageLog),
}));

export const combatParticipantsRelations = relations(combatParticipants, ({ one }) => ({
  encounter: one(combatEncounters, {
    fields: [combatParticipants.encounterId],
    references: [combatEncounters.id],
  }),
  character: one(characters, {
    fields: [combatParticipants.characterId],
    references: [characters.id],
  }),
  status: one(combatParticipantStatus, {
    fields: [combatParticipants.id],
    references: [combatParticipantStatus.participantId],
  }),
}));

export const combatParticipantStatusRelations = relations(combatParticipantStatus, ({ one }) => ({
  participant: one(combatParticipants, {
    fields: [combatParticipantStatus.participantId],
    references: [combatParticipants.id],
  }),
}));

export const combatDamageLogRelations = relations(combatDamageLog, ({ one }) => ({
  encounter: one(combatEncounters, {
    fields: [combatDamageLog.encounterId],
    references: [combatEncounters.id],
  }),
  participant: one(combatParticipants, {
    fields: [combatDamageLog.participantId],
    references: [combatParticipants.id],
  }),
  sourceParticipant: one(combatParticipants, {
    fields: [combatDamageLog.sourceParticipantId],
    references: [combatParticipants.id],
  }),
}));

// Type exports
export type CombatEncounter = InferSelectModel<typeof combatEncounters>;
export type NewCombatEncounter = InferInsertModel<typeof combatEncounters>;
export type CombatParticipant = InferSelectModel<typeof combatParticipants>;
export type NewCombatParticipant = InferInsertModel<typeof combatParticipants>;
export type CombatParticipantStatus = InferSelectModel<typeof combatParticipantStatus>;
export type NewCombatParticipantStatus = InferInsertModel<typeof combatParticipantStatus>;
export type CombatDamageLog = InferSelectModel<typeof combatDamageLog>;
export type NewCombatDamageLog = InferInsertModel<typeof combatDamageLog>;
