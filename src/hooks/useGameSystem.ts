/**
 * Game System Hook
 *
 * Provides access to the current campaign's game system setting.
 * Returns the game system from the campaign context or defaults to D&D 5E.
 *
 * @module hooks/useGameSystem
 */

import { GameSystem } from '@/types/game-systems';
import { useCampaign } from '@/contexts/CampaignContext';

/**
 * Custom hook to access the current campaign's game system.
 *
 * Retrieves the game system setting from the active campaign context.
 * If no campaign is loaded or no game system is specified, defaults to D&D 5E.
 *
 * This hook is useful for components that need to adapt their behavior or display
 * based on the active game system (e.g., showing system-specific rules, data, or UI).
 *
 * @returns {GameSystem} The current campaign's game system or D&D 5E as default
 *
 * @example
 * ```typescript
 * function CharacterSheet() {
 *   const gameSystem = useGameSystem();
 *
 *   // Use the game system to conditionally render content
 *   if (gameSystem === GameSystem.DND5E) {
 *     return <DnD5eCharacterSheet />;
 *   }
 *
 *   return <GenericCharacterSheet />;
 * }
 * ```
 *
 * @example
 * ```typescript
 * function AbilityScoreDisplay() {
 *   const gameSystem = useGameSystem();
 *
 *   // Adapt display based on system
 *   const abilityScores = gameSystem === GameSystem.CAIRN
 *     ? ['STR', 'DEX', 'WIL']
 *     : ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
 *
 *   return <div>{/* render ability scores */}</div>;
 * }
 * ```
 */
export function useGameSystem(): GameSystem {
  const { state } = useCampaign();
  const campaign = state.campaign;

  // Return the campaign's game system if set, otherwise default to D&D 5E
  return (campaign?.gameSystem as GameSystem) ?? GameSystem.DND5E;
}
