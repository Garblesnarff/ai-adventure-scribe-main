/**
 * Test Setup
 *
 * Database setup and teardown utilities for integration tests.
 * Provides functions to clean up test data and reset database state.
 */

import { db } from '../../../../db/client.js';
import { sql } from 'drizzle-orm';

/**
 * Setup test database
 * Run any necessary initialization before tests
 */
export async function setupTestDatabase() {
  // Ensure database connection is established
  // Any setup operations can go here
  console.log('Test database setup complete');
}

/**
 * Teardown test database
 * Clean up all test data from relevant tables
 */
export async function teardownTestDatabase() {
  try {
    // Clean up in reverse order of foreign key dependencies
    await db.execute(sql`TRUNCATE TABLE combat_participant_conditions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE combat_damage_log CASCADE`);
    await db.execute(sql`TRUNCATE TABLE combat_participant_status CASCADE`);
    await db.execute(sql`TRUNCATE TABLE combat_participants CASCADE`);
    await db.execute(sql`TRUNCATE TABLE combat_encounters CASCADE`);
    await db.execute(sql`TRUNCATE TABLE weapon_attacks CASCADE`);
    await db.execute(sql`TRUNCATE TABLE creature_stats CASCADE`);

    // Spell slots and rest
    await db.execute(sql`TRUNCATE TABLE character_spell_slots CASCADE`);
    await db.execute(sql`TRUNCATE TABLE spell_slot_usage_log CASCADE`);
    await db.execute(sql`TRUNCATE TABLE character_hit_dice CASCADE`);
    await db.execute(sql`TRUNCATE TABLE rest_events CASCADE`);

    // Progression
    await db.execute(sql`TRUNCATE TABLE experience_events CASCADE`);
    await db.execute(sql`TRUNCATE TABLE level_progression CASCADE`);
    await db.execute(sql`TRUNCATE TABLE class_features_progression CASCADE`);

    // Character stats and inventory
    await db.execute(sql`TRUNCATE TABLE character_stats CASCADE`);
    await db.execute(sql`TRUNCATE TABLE character_inventory CASCADE`);

    // Characters and sessions
    await db.execute(sql`TRUNCATE TABLE characters CASCADE`);
    await db.execute(sql`TRUNCATE TABLE game_sessions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE campaigns CASCADE`);
    await db.execute(sql`TRUNCATE TABLE npcs CASCADE`);

    console.log('Test database teardown complete');
  } catch (error) {
    console.error('Error during database teardown:', error);
    throw error;
  }
}

/**
 * Reset database state
 * Teardown and setup in one operation
 */
export async function resetDatabase() {
  await teardownTestDatabase();
  await setupTestDatabase();
}

/**
 * Clean up specific tables
 * Useful for cleaning up between individual tests
 */
export async function cleanupTables(...tableNames: string[]) {
  for (const tableName of tableNames) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableName} CASCADE`));
  }
}
