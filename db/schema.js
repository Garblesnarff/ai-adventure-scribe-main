/**
 * Drizzle ORM Schema Definitions (Backward Compatibility)
 *
 * This file re-exports from the modular schema structure for backward compatibility.
 * New code should import from './schema' (which points to './schema/index.ts').
 *
 * The schema has been split into logical modules:
 * - schema/blog.ts: Blog CMS tables
 * - schema/game.ts: Core game tables (campaigns, characters, sessions)
 * - schema/reference.ts: D&D reference data (classes, races, spells)
 * - schema/world.ts: World-building tables (NPCs, locations, quests, memories)
 */
export * from './schema/index';
