/**
 * World-Building Schema
 *
 * Database tables for campaign world elements.
 * Includes NPCs, locations, quests, and AI agent memories.
 */

import { pgTable, uuid, text, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';

import { campaigns, gameSessions } from './game.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * NPCs Table
 * Non-player characters in campaigns
 */
export const npcs = pgTable(
  'npcs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    race: text('race'),
    occupation: text('occupation'),
    personality: text('personality'),
    description: text('description'),
    backstory: text('backstory'),
    relationship: text('relationship'), // Relationship to party
    location: text('location'),
    imageUrl: text('image_url'),
    voiceId: text('voice_id'),
    stats: jsonb('stats'), // Optional combat stats
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('idx_npcs_campaign_id').on(table.campaignId),
    nameIdx: index('idx_npcs_name').on(table.name),
  })
);

/**
 * Locations Table
 * Places and areas within campaigns
 */
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    locationType: text('location_type'), // 'city', 'dungeon', 'wilderness', etc.
    description: text('description'),
    population: integer('population'),
    climate: text('climate'),
    terrain: text('terrain'),
    notableFeatures: text('notable_features').array(),
    connectedLocations: text('connected_locations').array(), // Array of location IDs
    imageUrl: text('image_url'),
    mapUrl: text('map_url'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('idx_locations_campaign_id').on(table.campaignId),
    nameIdx: index('idx_locations_name').on(table.name),
  })
);

/**
 * Quests Table
 * Missions and objectives within campaigns
 */
export const quests = pgTable(
  'quests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    questGiver: text('quest_giver'), // NPC name or ID
    objectives: text('objectives').array(),
    rewards: text('rewards').array(),
    status: text('status').default('available'), // 'available', 'active', 'completed', 'failed'
    difficulty: text('difficulty'), // 'easy', 'medium', 'hard', 'deadly'
    questType: text('quest_type'), // 'main', 'side', 'personal'
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('idx_quests_campaign_id').on(table.campaignId),
    statusIdx: index('idx_quests_status').on(table.status),
  })
);

/**
 * Memories Table
 * Episodic memory for AI agents tracking campaign events
 */
export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }),
    memoryType: text('memory_type'), // 'event', 'character', 'location', 'item', etc.
    importance: integer('importance').default(5), // 1-10 scale
    content: text('content').notNull(),
    context: jsonb('context'),
    embedding: text('embedding'), // Vector embedding for semantic search
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('idx_memories_campaign_id').on(table.campaignId),
    sessionIdIdx: index('idx_memories_session_id').on(table.sessionId),
    memoryTypeIdx: index('idx_memories_memory_type').on(table.memoryType),
    importanceIdx: index('idx_memories_importance').on(table.importance),
  })
);

// Type exports for TypeScript inference
export type NPC = InferSelectModel<typeof npcs>;
export type NewNPC = InferInsertModel<typeof npcs>;

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

export type Quest = InferSelectModel<typeof quests>;
export type NewQuest = InferInsertModel<typeof quests>;

export type Memory = InferSelectModel<typeof memories>;
export type NewMemory = InferInsertModel<typeof memories>;
