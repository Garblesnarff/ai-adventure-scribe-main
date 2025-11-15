/**
 * useDowntimeActivities Hook
 *
 * Custom hook for managing downtime activities state and operations
 */

import { useState, useCallback } from 'react';

import type { Character } from '@/types/character';
import type { DowntimeActivity, DowntimeResult } from '@/types/downtimeActivities';

import logger from '@/lib/logger';
import {
  performDowntimeActivity,
  checkDowntimePrerequisites,
  getAvailableDowntimeActivities,
} from '@/utils/downtimeActivities';

interface UseDowntimeActivitiesProps {
  character: Character;
  onCharacterUpdate: (updatedCharacter: Character) => void;
}

export const useDowntimeActivities = ({
  character,
  onCharacterUpdate,
}: UseDowntimeActivitiesProps) => {
  const [isPerformingActivity, setIsPerformingActivity] = useState(false);
  const [lastResult, setLastResult] = useState<DowntimeResult | null>(null);
  const [availableActivities, setAvailableActivities] = useState<DowntimeActivity[]>([]);

  /**
   * Perform a downtime activity
   */
  const performActivity = useCallback(
    async (activity: DowntimeActivity): Promise<DowntimeResult> => {
      setIsPerformingActivity(true);

      try {
        // Perform the activity
        const result = performDowntimeActivity(character, activity);

        // Update character if activity was completed
        if (result.activityCompleted) {
          // Create updated character with changes applied
          const updatedCharacter = { ...character };

          // Apply gold changes
          if (updatedCharacter.gold !== undefined) {
            updatedCharacter.gold -= result.goldSpent || 0;
            updatedCharacter.gold += result.materialsUsed || 0;
            if (result.outcome?.goldRecovery) {
              updatedCharacter.gold += result.outcome.goldRecovery;
            }
          }

          // Apply experience changes
          if (updatedCharacter.experience !== undefined && result.outcome?.experienceGained) {
            updatedCharacter.experience += result.outcome.experienceGained;
          }

          // Apply item changes
          if (result.outcome?.itemsGained && updatedCharacter.inventory) {
            updatedCharacter.inventory = [
              ...updatedCharacter.inventory,
              ...result.outcome.itemsGained,
            ];
          }

          // Update character
          onCharacterUpdate(updatedCharacter);
        }

        // Store result
        setLastResult(result);

        return result;
      } catch (error) {
        logger.error('Error performing downtime activity:', error);
        const errorResult: DowntimeResult = {
          success: false,
          activityCompleted: false,
          message: 'An error occurred while performing the activity',
          goldSpent: 0,
          materialsUsed: 0,
          daysSpent: 0,
        };
        setLastResult(errorResult);
        return errorResult;
      } finally {
        setIsPerformingActivity(false);
      }
    },
    [character, onCharacterUpdate],
  );

  /**
   * Check if a character can perform an activity
   */
  const canPerformActivity = useCallback(
    (activity: DowntimeActivity): { canPerform: boolean; reason?: string } => {
      return checkDowntimePrerequisites(character, activity);
    },
    [character],
  );

  /**
   * Refresh the list of available activities
   */
  const refreshAvailableActivities = useCallback(
    (allActivities: DowntimeActivity[]) => {
      const available = getAvailableDowntimeActivities(character, allActivities);
      setAvailableActivities(available);
    },
    [character],
  );

  /**
   * Get activity by ID
   */
  const getActivityById = useCallback(
    (activities: DowntimeActivity[], id: string): DowntimeActivity | undefined => {
      return activities.find((activity) => activity.id === id);
    },
    [],
  );

  return {
    // State
    isPerformingActivity,
    lastResult,
    availableActivities,

    // Actions
    performActivity,
    canPerformActivity,
    refreshAvailableActivities,
    getActivityById,
  };
};
