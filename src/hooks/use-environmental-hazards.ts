/**
 * useEnvironmentalHazards Hook
 *
 * Custom hook for managing environmental hazards in the UI
 */

import { useState, useCallback } from 'react';

import type { Character } from '@/types/character';
import type {
  EnvironmentalHazard,
  HazardDetectionResult,
  HazardSaveResult,
} from '@/types/environmentalHazards';

import logger from '@/lib/logger';
import {
  detectHazard,
  interactWithHazard,
  applyHazardEffects,
  hazardManager,
} from '@/utils/environmentalHazards';

interface HazardInteraction {
  hazardId: string;
  characterId: string;
  detected: boolean;
  triggered: boolean;
  detectionResult?: HazardDetectionResult;
  saveResult?: HazardSaveResult;
}

export const useEnvironmentalHazards = (character: Character) => {
  const [activeHazards, setActiveHazards] = useState<EnvironmentalHazard[]>([]);
  const [hazardInteractions, setHazardInteractions] = useState<HazardInteraction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Add a new environmental hazard
   */
  const addHazard = useCallback((hazard: EnvironmentalHazard) => {
    setActiveHazards((prev) => {
      // Check if hazard already exists
      if (prev.some((h) => h.id === hazard.id)) {
        return prev;
      }
      return [...prev, hazard];
    });
  }, []);

  /**
   * Remove an environmental hazard
   */
  const removeHazard = useCallback((hazardId: string) => {
    setActiveHazards((prev) => prev.filter((h) => h.id !== hazardId));
    setHazardInteractions((prev) => prev.filter((i) => i.hazardId !== hazardId));
  }, []);

  /**
   * Detect a hazard
   */
  const detectHazardById = useCallback(
    async (hazardId: string): Promise<HazardDetectionResult> => {
      setIsProcessing(true);

      try {
        const hazard = activeHazards.find((h) => h.id === hazardId);
        if (!hazard) {
          return {
            detected: false,
            description: 'Hazard not found.',
          };
        }

        const result = detectHazard(character, hazard);

        // Update interactions
        setHazardInteractions((prev) => {
          const existing = prev.find(
            (i) => i.hazardId === hazardId && i.characterId === character.id,
          );
          if (existing) {
            return prev.map((i) =>
              i.hazardId === hazardId && i.characterId === character.id
                ? { ...i, detected: result.detected, detectionResult: result }
                : i,
            );
          } else {
            return [
              ...prev,
              {
                hazardId,
                characterId: character.id || '',
                detected: result.detected,
                triggered: false,
                detectionResult: result,
              },
            ];
          }
        });

        return result;
      } catch (error) {
        logger.error('Error detecting hazard:', error);
        return {
          detected: false,
          description: 'Error detecting hazard.',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [activeHazards, character],
  );

  /**
   * Trigger/interact with a hazard
   */
  const triggerHazard = useCallback(
    async (hazardId: string): Promise<HazardSaveResult> => {
      setIsProcessing(true);

      try {
        const hazard = activeHazards.find((h) => h.id === hazardId);
        if (!hazard) {
          return {
            saved: false,
            description: 'Hazard not found.',
          };
        }

        const result = interactWithHazard(character, hazard);

        // Update interactions
        setHazardInteractions((prev) => {
          const existing = prev.find(
            (i) => i.hazardId === hazardId && i.characterId === character.id,
          );
          if (existing) {
            return prev.map((i) =>
              i.hazardId === hazardId && i.characterId === character.id
                ? { ...i, triggered: true, saveResult: result }
                : i,
            );
          } else {
            return [
              ...prev,
              {
                hazardId,
                characterId: character.id || '',
                detected: false,
                triggered: true,
                saveResult: result,
              },
            ];
          }
        });

        return result;
      } catch (error) {
        logger.error('Error triggering hazard:', error);
        return {
          saved: false,
          description: 'Error triggering hazard.',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [activeHazards, character],
  );

  /**
   * Apply hazard effects to character
   */
  const applyHazardEffectsToCharacter = useCallback(
    (hazardId: string, saveResult: HazardSaveResult): Character => {
      const hazard = activeHazards.find((h) => h.id === hazardId);
      if (!hazard) {
        return character;
      }

      return applyHazardEffects(character, hazard, saveResult);
    },
    [activeHazards, character],
  );

  /**
   * Get hazard by ID
   */
  const getHazardById = useCallback(
    (hazardId: string): EnvironmentalHazard | undefined => {
      return activeHazards.find((h) => h.id === hazardId);
    },
    [activeHazards],
  );

  /**
   * Get interaction status for a hazard
   */
  const getHazardInteractionStatus = useCallback(
    (hazardId: string) => {
      const interaction = hazardInteractions.find(
        (i) => i.hazardId === hazardId && i.characterId === character.id,
      );

      return {
        detected: interaction?.detected || false,
        triggered: interaction?.triggered || false,
        detectionResult: interaction?.detectionResult,
        saveResult: interaction?.saveResult,
      };
    },
    [hazardInteractions, character.id],
  );

  /**
   * Clear all hazard interactions (for resetting)
   */
  const clearInteractions = useCallback(() => {
    setHazardInteractions([]);
  }, []);

  /**
   * Get all hazards that have been detected but not triggered
   */
  const getDetectedHazards = useCallback((): EnvironmentalHazard[] => {
    return activeHazards.filter((hazard) => {
      const interaction = hazardInteractions.find(
        (i) => i.hazardId === hazard.id && i.characterId === character.id,
      );
      return interaction?.detected && !interaction.triggered;
    });
  }, [activeHazards, hazardInteractions, character.id]);

  return {
    // State
    activeHazards,
    hazardInteractions,
    isProcessing,

    // Actions
    addHazard,
    removeHazard,
    detectHazardById,
    triggerHazard,
    applyHazardEffectsToCharacter,
    getHazardById,
    getHazardInteractionStatus,
    clearInteractions,
    getDetectedHazards,

    // Utilities
    hazardManager,
  };
};
