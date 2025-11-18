/**
 * Game System Registry and Factory Functions
 *
 * This module provides a centralized registry for game system providers and factory
 * functions to access them. It manages the registration and retrieval of game system
 * implementations (D&D 5e, Pathfinder, etc.) and their configurations.
 *
 * @module data/game-systems
 */

import type { GameSystem, GameSystemConfig } from '@/types/game-systems';
import { GameSystemProvider } from './base/GameSystemProvider';
import { DND5EProvider } from './dnd5e/provider';
import { OSEProvider } from './ose/provider';
import { CairnProvider } from './cairn/provider';
import { KnaveProvider } from './knave/provider';

/**
 * Internal registry mapping game system identifiers to their provider implementations.
 * This Map stores all registered game system providers and is used by the factory
 * functions to retrieve the appropriate provider for a given system.
 *
 * Registered Systems:
 * - DND5E: Dungeons & Dragons 5th Edition
 * - OSE_CLASSIC: Old-School Essentials (Classic Fantasy)
 * - OSE_ADVANCED: Old-School Essentials (Advanced Fantasy)
 * - CAIRN: Cairn RPG
 * - KNAVE: Knave RPG
 *
 * @private
 */
const systemRegistry = new Map<GameSystem, GameSystemProvider>([
  [GameSystem.DND5E, new DND5EProvider()],
  [GameSystem.OSE_CLASSIC, new OSEProvider('classic')],
  [GameSystem.OSE_ADVANCED, new OSEProvider('advanced')],
  [GameSystem.CAIRN, new CairnProvider()],
  [GameSystem.KNAVE, new KnaveProvider()],
]);

/**
 * Retrieves the provider implementation for a specific game system.
 *
 * This factory function looks up the game system provider in the registry and returns
 * it if found. If the system is not registered, it throws an error indicating that
 * the system is either not supported or has not been registered yet.
 *
 * @param system - The game system identifier (enum value)
 * @returns The game system provider for the specified system
 * @throws {Error} If no provider is registered for the specified game system
 *
 * @example
 * ```typescript
 * // Get the D&D 5e provider
 * const dnd5eProvider = getSystemProvider(GameSystem.DND5E);
 * const classes = dnd5eProvider.getClasses();
 * ```
 *
 * @example
 * ```typescript
 * // Handle missing system gracefully
 * try {
 *   const provider = getSystemProvider(GameSystem.UNKNOWN);
 * } catch (error) {
 *   console.error('System not available:', error.message);
 * }
 * ```
 */
export function getSystemProvider(system: GameSystem): GameSystemProvider {
  const provider = systemRegistry.get(system);

  if (!provider) {
    throw new Error(
      `Game system provider not found for: ${system}. ` +
        `Make sure the system is registered using registerSystem().`
    );
  }

  return provider;
}

/**
 * Retrieves all registered game system providers.
 *
 * This function returns an array of all game system providers that have been
 * registered in the system registry. Useful for displaying a list of available
 * game systems or performing operations across all systems.
 *
 * @returns Array of all registered game system providers
 *
 * @example
 * ```typescript
 * // Get all available systems
 * const allSystems = getAllSystems();
 * allSystems.forEach(provider => {
 *   console.log(provider.config.name);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Check if any systems are registered
 * if (getAllSystems().length === 0) {
 *   console.warn('No game systems registered');
 * }
 * ```
 */
export function getAllSystems(): GameSystemProvider[] {
  return Array.from(systemRegistry.values());
}

/**
 * Retrieves the configuration objects for all registered game systems.
 *
 * This function extracts and returns the configuration metadata from all registered
 * providers. The configurations contain information like system ID, name, version,
 * and available features, making this useful for displaying system selection menus
 * or comparing system capabilities.
 *
 * @returns Array of game system configuration objects from all registered providers
 *
 * @example
 * ```typescript
 * // Get all system configs for a dropdown menu
 * const configs = getSystemConfigs();
 * const options = configs.map(config => ({
 *   value: config.id,
 *   label: config.name,
 *   description: config.description
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // Find systems that support a specific feature
 * const systemsWithCantrips = getSystemConfigs()
 *   .filter(config => config.features?.hasCantrips);
 * ```
 */
export function getSystemConfigs(): GameSystemConfig[] {
  return getAllSystems().map((provider) => provider.config);
}

/**
 * Registers a game system provider in the system registry.
 *
 * This function adds a new game system provider to the registry, making it available
 * for use throughout the application. Each game system should be registered during
 * application initialization before any system-specific functionality is accessed.
 *
 * If a provider is already registered for the given system, it will be replaced
 * with the new provider (useful for testing or hot-reloading).
 *
 * @param system - The game system identifier (enum value)
 * @param provider - The game system provider implementation to register
 *
 * @example
 * ```typescript
 * // Register D&D 5e system
 * const dnd5eProvider = new DnD5eProvider();
 * registerSystem(GameSystem.DND5E, dnd5eProvider);
 * ```
 *
 * @example
 * ```typescript
 * // Register multiple systems during initialization
 * function initializeGameSystems() {
 *   registerSystem(GameSystem.DND5E, new DnD5eProvider());
 *   registerSystem(GameSystem.PATHFINDER2E, new Pathfinder2eProvider());
 *   registerSystem(GameSystem.CALL_OF_CTHULHU, new CallOfCthulhuProvider());
 * }
 * ```
 */
export function registerSystem(
  system: GameSystem,
  provider: GameSystemProvider
): void {
  systemRegistry.set(system, provider);
}

/**
 * Re-export the GameSystemProvider abstract class for convenience.
 * This allows consumers to import both the provider class and the registry
 * functions from the same module.
 */
export { GameSystemProvider };

/**
 * Re-export game system types for convenience.
 * This allows consumers to import types alongside the registry functions
 * without needing separate import statements.
 */
export type { GameSystem, GameSystemConfig } from '@/types/game-systems';
