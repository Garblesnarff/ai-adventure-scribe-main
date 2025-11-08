/**
 * Game Core Schema
 *
 * Database tables for core D&D game elements.
 * Includes campaigns, characters, character stats, and game sessions.
 */
import { pgTable, uuid, text, timestamp, jsonb, index, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
/**
 * Campaigns Table
 * Stores D&D campaign configurations and settings
 */
export const campaigns = pgTable('campaigns', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // References auth.users(id)
    name: text('name').notNull(),
    description: text('description'),
    genre: text('genre'),
    difficultyLevel: text('difficulty_level'),
    campaignLength: text('campaign_length'),
    tone: text('tone'),
    era: text('era'),
    location: text('location'),
    atmosphere: text('atmosphere'),
    settingDetails: jsonb('setting_details'),
    thematicElements: jsonb('thematic_elements'),
    status: text('status').default('active').notNull(),
    backgroundImage: text('background_image'),
    artStyle: text('art_style'),
    styleConfig: jsonb('style_config'),
    rulesConfig: jsonb('rules_config'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('idx_campaigns_user_id').on(table.userId),
    statusIdx: index('idx_campaigns_status').on(table.status),
}));
/**
 * Characters Table
 * Stores D&D character sheets with all attributes, spells, and metadata
 */
export const characters = pgTable('characters', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // References auth.users(id) - stored as text in Supabase
    campaignId: uuid('campaign_id'), // References campaigns table
    name: text('name').notNull(),
    description: text('description'),
    race: text('race'),
    class: text('class'),
    level: integer('level').default(1).notNull(),
    alignment: text('alignment'),
    experiencePoints: integer('experience_points').default(0),
    background: text('background'),
    // AI-generated content
    imageUrl: text('image_url'),
    avatarUrl: text('avatar_url'),
    backgroundImage: text('background_image'),
    appearance: text('appearance'),
    personalityTraits: text('personality_traits'),
    personalityNotes: text('personality_notes'),
    backstoryElements: text('backstory_elements'),
    // Spell data (comma-separated text fields)
    cantrips: text('cantrips'),
    knownSpells: text('known_spells'),
    preparedSpells: text('prepared_spells'),
    ritualSpells: text('ritual_spells'),
    // Vision and stealth
    visionTypes: text('vision_types').array(),
    obscurement: text('obscurement'),
    isHidden: boolean('is_hidden').default(false),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    userIdIdx: index('idx_characters_user_id').on(table.userId),
    campaignIdIdx: index('idx_characters_campaign_id').on(table.campaignId),
    nameIdx: index('idx_characters_name').on(table.name),
    createdAtIdx: index('idx_characters_created_at').on(table.createdAt),
}));
/**
 * Character Stats Table
 * Stores ability scores and related statistics for characters
 */
export const characterStats = pgTable('character_stats', {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    strength: integer('strength').default(10).notNull(),
    dexterity: integer('dexterity').default(10).notNull(),
    constitution: integer('constitution').default(10).notNull(),
    intelligence: integer('intelligence').default(10).notNull(),
    wisdom: integer('wisdom').default(10).notNull(),
    charisma: integer('charisma').default(10).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    characterIdIdx: index('idx_character_stats_character_id').on(table.characterId),
}));
/**
 * Game Sessions Table
 * Individual play sessions within campaigns
 */
export const gameSessions = pgTable('game_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    sessionNumber: integer('session_number'),
    startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }),
    endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }),
    status: text('status').default('active'),
    currentSceneDescription: text('current_scene_description'),
    summary: text('summary'),
    sessionNotes: text('session_notes'),
    turnCount: integer('turn_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    campaignIdIdx: index('idx_game_sessions_campaign_id').on(table.campaignId),
    characterIdIdx: index('idx_game_sessions_character_id').on(table.characterId),
    statusIdx: index('idx_game_sessions_status').on(table.status),
}));
/**
 * Dialogue History Table
 * Chat messages during game sessions
 */
export const dialogueHistory = pgTable('dialogue_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }),
    speakerType: text('speaker_type'), // 'player', 'dm', 'npc'
    speakerId: uuid('speaker_id'), // References character or npc
    message: text('message').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow(),
    context: jsonb('context'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    sessionIdIdx: index('idx_dialogue_history_session_id').on(table.sessionId),
    timestampIdx: index('idx_dialogue_history_timestamp').on(table.timestamp),
}));
// Define relations
export const charactersRelations = relations(characters, ({ one, many }) => ({
    campaign: one(campaigns, {
        fields: [characters.campaignId],
        references: [campaigns.id],
    }),
    stats: one(characterStats, {
        fields: [characters.id],
        references: [characterStats.characterId],
    }),
}));
export const campaignsRelations = relations(campaigns, ({ many }) => ({
    characters: many(characters),
}));
export const characterStatsRelations = relations(characterStats, ({ one }) => ({
    character: one(characters, {
        fields: [characterStats.characterId],
        references: [characters.id],
    }),
}));
