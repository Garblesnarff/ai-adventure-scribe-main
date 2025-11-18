/**
 * System Provider Hook
 *
 * Provides access to the game system provider for the current campaign.
 * Returns a GameSystemProvider instance that offers system-specific data and calculations.
 *
 * @module hooks/useSystemProvider
 */

import { useMemo } from 'react';
import { getSystemProvider } from '@/data/game-systems';
import type { GameSystemProvider } from '@/data/game-systems';
import { useGameSystem } from './useGameSystem';

/**
 * Custom hook to access the game system provider for the current campaign.
 *
 * Returns a memoized GameSystemProvider instance that provides access to
 * system-specific data and rules calculations. The provider offers methods for:
 * - Retrieving character creation options (classes, races, backgrounds, etc.)
 * - Performing system-specific calculations (ability modifiers, hit points, etc.)
 * - Validating characters according to system rules
 * - Accessing equipment, spells, and other game content
 *
 * The provider is memoized based on the active game system, so it will only
 * re-instantiate when the game system changes.
 *
 * @returns {GameSystemProvider} The game system provider instance for the current system
 * @throws {Error} If no provider is registered for the current game system
 *
 * @example
 * ```typescript
 * function ClassSelection() {
 *   const provider = useSystemProvider();
 *   const classes = provider.getClasses();
 *
 *   if (!classes) {
 *     return <div>This system doesn't use character classes</div>;
 *   }
 *
 *   return (
 *     <select>
 *       {classes.map(cls => (
 *         <option key={cls.id} value={cls.id}>
 *           {cls.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * function AbilityScoreModifier({ score }: { score: number }) {
 *   const provider = useSystemProvider();
 *   const modifier = provider.calculateAbilityModifier(score);
 *
 *   return (
 *     <div>
 *       Score: {score} (modifier: {modifier >= 0 ? '+' : ''}{modifier})
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * function CharacterValidator({ character }) {
 *   const provider = useSystemProvider();
 *   const validation = provider.validateCharacter(character);
 *
 *   if (!validation.isValid) {
 *     return (
 *       <div>
 *         <h3>Validation Errors:</h3>
 *         <ul>
 *           {validation.errors.map((error, index) => (
 *             <li key={index}>{error}</li>
 *           ))}
 *         </ul>
 *       </div>
 *     );
 *   }
 *
 *   return <div>Character is valid!</div>;
 * }
 * ```
 */
export function useSystemProvider(): GameSystemProvider {
  const gameSystem = useGameSystem();

  // Memoize the provider based on the game system
  // This ensures we only re-instantiate when the system changes
  const provider = useMemo(() => {
    return getSystemProvider(gameSystem);
  }, [gameSystem]);

  return provider;
}
