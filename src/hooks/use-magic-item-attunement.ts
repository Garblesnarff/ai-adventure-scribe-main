/**
 * useMagicItemAttunement Hook
 *
 * Custom hook for managing magic item attunement state and operations
 */

import { useState, useCallback } from 'react';

import type { Character } from '@/types/character';

import logger from '@/lib/logger';
import { validateAttunementRequirements, getAttunedItemCount } from '@/utils/magicItemEffects';

interface AttunementResult {
  success: boolean;
  message: string;
}

export const useMagicItemAttunement = (
  character: Character,
  onCharacterUpdate: (updatedCharacter: Character) => void,
) => {
  const [isAttuning, setIsAttuning] = useState(false);

  /**
   * Attempt to attune to a magic item
   */
  const attuneToItem = useCallback(
    async (itemId: string): Promise<AttunementResult> => {
      setIsAttuning(true);

      try {
        // Find the item in character inventory
        const item = character.inventory?.find((invItem) => invItem.itemId === itemId);
        if (!item) {
          return { success: false, message: 'Item not found in inventory' };
        }

        // Check if already attuned
        if (item.isAttuned) {
          return { success: false, message: 'Item is already attuned' };
        }

        // Validate attunement requirements
        const validation = validateAttunementRequirements(character, item);
        if (!validation.canAttune) {
          return { success: false, message: validation.reason };
        }

        // Create updated character with attuned item
        const updatedCharacter = {
          ...character,
          inventory:
            character.inventory?.map((invItem) =>
              invItem.itemId === itemId ? { ...invItem, isAttuned: true } : invItem,
            ) || [],
        };

        // Update character
        onCharacterUpdate(updatedCharacter);

        return { success: true, message: `Successfully attuned to ${item.itemId}` };
      } catch (error) {
        logger.error('Error attuning to item:', error);
        return { success: false, message: 'Failed to attune to item' };
      } finally {
        setIsAttuning(false);
      }
    },
    [character, onCharacterUpdate],
  );

  /**
   * Remove attunement from a magic item
   */
  const removeAttunement = useCallback(
    async (itemId: string): Promise<AttunementResult> => {
      try {
        // Find the item in character inventory
        const item = character.inventory?.find((invItem) => invItem.itemId === itemId);
        if (!item) {
          return { success: false, message: 'Item not found in inventory' };
        }

        // Check if not attuned
        if (!item.isAttuned) {
          return { success: false, message: 'Item is not currently attuned' };
        }

        // Create updated character with removed attunement
        const updatedCharacter = {
          ...character,
          inventory:
            character.inventory?.map((invItem) =>
              invItem.itemId === itemId ? { ...invItem, isAttuned: false } : invItem,
            ) || [],
        };

        // Update character
        onCharacterUpdate(updatedCharacter);

        return { success: true, message: `Successfully removed attunement from ${item.itemId}` };
      } catch (error) {
        logger.error('Error removing attunement:', error);
        return { success: false, message: 'Failed to remove attunement' };
      }
    },
    [character, onCharacterUpdate],
  );

  /**
   * Get attunement status for an item
   */
  const getItemAttunementStatus = useCallback(
    (itemId: string) => {
      const item = character.inventory?.find((invItem) => invItem.itemId === itemId);
      if (!item) return { isAttuned: false, canAttune: false, reason: 'Item not found' };

      const validation = validateAttunementRequirements(character, item);
      return {
        isAttuned: item.isAttuned || false,
        canAttune: validation.canAttune,
        reason: validation.reason,
      };
    },
    [character],
  );

  /**
   * Get attunement summary
   */
  const getAttunementSummary = useCallback(() => {
    const attunedCount = getAttunedItemCount(character);
    return {
      attunedCount,
      maxAttunementSlots: 3,
      availableSlots: 3 - attunedCount,
      isAtCapacity: attunedCount >= 3,
    };
  }, [character]);

  return {
    // State
    isAttuning,

    // Actions
    attuneToItem,
    removeAttunement,
    getItemAttunementStatus,
    getAttunementSummary,

    // Derived values
    attunedItemCount: getAttunedItemCount(character),
    canAttuneToMoreItems: getAttunedItemCount(character) < 3,
  };
};
