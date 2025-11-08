/**
 * Drizzle ORM Schema for Game Sessions
 *
 * Type-safe table definitions for game session management.
 * Includes game_sessions and dialogue_history tables with relations.
 */
import { pgTable, uuid, text, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
/**
 * Game Sessions Table
 * Stores active game session instances for campaigns/characters
 * Maps to existing Supabase game_sessions table
 */
export const gameSessions = pgTable('game_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id'), // References campaigns(id)
    characterId: uuid('character_id'), // References characters(id)
    sessionNumber: integer('session_number'),
    status: text('status'),
    startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).defaultNow(),
    endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }),
    summary: text('summary'),
    turnCount: integer('turn_count').default(0),
    currentSceneDescription: text('current_scene_description'),
    sessionNotes: text('session_notes'),
    sessionState: jsonb('session_state'), // JSONB column for session state storage
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    campaignIdIdx: index('idx_game_sessions_campaign_id').on(table.campaignId),
    characterIdIdx: index('idx_game_sessions_character_id').on(table.characterId),
    statusIdx: index('idx_game_sessions_status').on(table.status),
}));
/**
 * Dialogue History Table
 * Stores message history for game sessions
 * Maps to existing Supabase dialogue_history table
 */
export const dialogueHistory = pgTable('dialogue_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
        .notNull()
        .references(() => gameSessions.id, { onDelete: 'cascade' }),
    speakerType: text('speaker_type'),
    speakerId: uuid('speaker_id'),
    message: text('message').notNull(),
    context: jsonb('context'),
    images: jsonb('images'),
    sequenceNumber: integer('sequence_number'), // For proper ordering with concurrent inserts
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    sessionIdIdx: index('idx_dialogue_history_session_id').on(table.sessionId),
    timestampIdx: index('idx_dialogue_history_timestamp').on(table.timestamp),
    // Composite index for efficient message history queries
    sessionTimestampIdx: index('idx_dialogue_history_session_timestamp').on(table.sessionId, table.timestamp),
    sessionSequenceIdx: index('idx_dialogue_history_session_sequence').on(table.sessionId, table.sequenceNumber),
}));
// Relations for relational query builder
export const gameSessionsRelations = relations(gameSessions, ({ many }) => ({
    messages: many(dialogueHistory),
}));
export const dialogueHistoryRelations = relations(dialogueHistory, ({ one }) => ({
    session: one(gameSessions, {
        fields: [dialogueHistory.sessionId],
        references: [gameSessions.id],
    }),
}));
