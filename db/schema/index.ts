/**
 * Unified Schema Export
 *
 * Re-exports all tables, relations, and types from modular schema files.
 * This file serves as the single entry point for all schema definitions.
 */

// Export all blog tables and types
export * from './blog.js';

// Export all game tables and types
export * from './game.js';

// Export all reference tables and types
export * from './reference.js';

// Export all world-building tables and types
export * from './world.js';

// Export all combat tables and types
export * from './combat.js';

// Export all rest system tables and types
export * from './rest.js';

// Export all inventory tables and types
export * from './inventory.js';

// Export all progression tables and types
export * from './progression.js';

// Export all class features tables and types
export * from './class-features.js';

// Export all scenes and maps tables and types
export * from './scenes.js';

// Export all fog of war and vision tables and types
export * from './fog-of-war.js';

// Export all character permissions and folders tables and types
export * from './character-permissions.js';

// Export all drawings and measurements tables and types
export * from './drawings.js';

// Export all token tables and types
export * from './tokens.js';
