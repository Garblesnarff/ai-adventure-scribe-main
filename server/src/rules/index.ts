/**
 * Rules Engine Router
 *
 * Main entry point for game system rules engines.
 * Routes rules resolution requests to the appropriate game system implementation.
 *
 * Supported game systems:
 * - dnd5e: D&D 5th Edition (SRD 5.1)
 * - ose_classic: Old School Essentials Classic Fantasy
 * - ose_advanced: Old School Essentials Advanced Fantasy
 * - cairn: Cairn RPG
 * - knave: Knave RPG
 */

import type { RulesActionRequest, RulesActionResult } from './state.js';

// Import all game system rules engines
import * as dnd5eEngine from './rules-engine.js';
import * as oseEngine from './ose/rules-engine.js';
import * as cairnEngine from './cairn/rules-engine.js';
import * as knaveEngine from './knave/rules-engine.js';

/**
 * Supported game systems
 */
export type GameSystem =
  | 'dnd5e'
  | 'ose_classic'
  | 'ose_advanced'
  | 'cairn'
  | 'knave';

/**
 * Resolve an action for a specific game system
 *
 * @param gameSystem - The game system to use for resolution
 * @param input - The rules action request containing action type, actors, and context
 * @returns The result of the action resolution
 * @throws Error if the game system is not supported or if resolution fails
 */
export function resolveActionForSystem(
  gameSystem: GameSystem | string,
  input: RulesActionRequest
): RulesActionResult {
  switch (gameSystem) {
    case 'dnd5e':
      return dnd5eEngine.resolveAction(input);

    case 'ose_classic':
    case 'ose_advanced':
      return oseEngine.resolveAction(input);

    case 'cairn':
      return cairnEngine.resolveAction(input);

    case 'knave':
      return knaveEngine.resolveAction(input);

    default:
      throw new Error(
        `Unsupported game system: ${gameSystem}. ` +
        `Supported systems: dnd5e, ose_classic, ose_advanced, cairn, knave`
      );
  }
}

/**
 * Check if a game system is supported
 */
export function isGameSystemSupported(gameSystem: string): boolean {
  return ['dnd5e', 'ose_classic', 'ose_advanced', 'cairn', 'knave'].includes(gameSystem);
}

/**
 * Get list of all supported game systems
 */
export function getSupportedGameSystems(): GameSystem[] {
  return ['dnd5e', 'ose_classic', 'ose_advanced', 'cairn', 'knave'];
}

// Export individual engines for direct use if needed
export { dnd5eEngine, oseEngine, cairnEngine, knaveEngine };

// Export types
export type { RulesActionRequest, RulesActionResult };

// Default export
export default {
  resolveActionForSystem,
  isGameSystemSupported,
  getSupportedGameSystems,
  dnd5eEngine,
  oseEngine,
  cairnEngine,
  knaveEngine,
};
