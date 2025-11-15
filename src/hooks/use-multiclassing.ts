/**
 * useMulticlassing Hook
 *
 * Custom hook for managing multiclassing state and operations
 */

import { useState, useCallback } from 'react';

import type { Character, CharacterClass } from '@/types/character';
import type { MulticlassValidationResult } from '@/utils/multiclassing';

import logger from '@/lib/logger';
import {
  validateMulticlass,
  calculateMulticlassProficiencies,
  calculateMulticlassHitPoints,
  calculateMulticlassSpellcasting,
  getMulticlassFeatures,
  addMulticlass,
  levelUpClass,
} from '@/utils/multiclassing';

interface MulticlassingResult {
  success: boolean;
  message: string;
  character?: Character;
}

export const useMulticlassing = (
  character: Character,
  onCharacterUpdate: (updatedCharacter: Character) => void,
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<MulticlassValidationResult | null>(null);

  /**
   * Validate if character can multiclass into a new class
   */
  const validateNewClass = useCallback(
    async (newClass: CharacterClass): Promise<MulticlassValidationResult> => {
      setIsProcessing(true);

      try {
        const result = validateMulticlass(character, newClass);
        setValidationResult(result);
        return result;
      } catch (error) {
        logger.error('Error validating multiclass:', error);
        const errorResult: MulticlassValidationResult = {
          canMulticlass: false,
          requirements: ['Error validating multiclass requirements'],
          missingRequirements: ['Error validating multiclass requirements'],
        };
        setValidationResult(errorResult);
        return errorResult;
      } finally {
        setIsProcessing(false);
      }
    },
    [character],
  );

  /**
   * Add a new class to the character (multiclass)
   */
  const addNewClass = useCallback(
    async (newClass: CharacterClass, levels: number = 1): Promise<MulticlassingResult> => {
      setIsProcessing(true);

      try {
        // First validate
        const validation = validateMulticlass(character, newClass);
        if (!validation.canMulticlass) {
          return {
            success: false,
            message: `Cannot multiclass: ${validation.missingRequirements.join(', ')}`,
          };
        }

        // Add the new class
        const updatedCharacter = addMulticlass(character, newClass, levels);

        // Update character
        onCharacterUpdate(updatedCharacter);

        return {
          success: true,
          message: `Successfully added ${newClass.name} class at level ${levels}`,
          character: updatedCharacter,
        };
      } catch (error) {
        logger.error('Error adding new class:', error);
        return {
          success: false,
          message: 'Failed to add new class',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [character, onCharacterUpdate],
  );

  /**
   * Level up a specific class
   */
  const levelUpSpecificClass = useCallback(
    async (classId: string): Promise<MulticlassingResult> => {
      setIsProcessing(true);

      try {
        const updatedCharacter = levelUpClass(character, classId);

        // Update character
        onCharacterUpdate(updatedCharacter);

        const className =
          updatedCharacter.classLevels?.find((cls) => cls.classId === classId)?.className ||
          'Unknown';

        return {
          success: true,
          message: `Successfully leveled up ${className}`,
          character: updatedCharacter,
        };
      } catch (error) {
        logger.error('Error leveling up class:', error);
        return {
          success: false,
          message: 'Failed to level up class',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [character, onCharacterUpdate],
  );

  /**
   * Get multiclass proficiencies
   */
  const getProficiencies = useCallback(() => {
    return calculateMulticlassProficiencies(character);
  }, [character]);

  /**
   * Get multiclass hit points
   */
  const getHitPoints = useCallback(() => {
    return calculateMulticlassHitPoints(character);
  }, [character]);

  /**
   * Get multiclass spellcasting info
   */
  const getSpellcasting = useCallback(() => {
    return calculateMulticlassSpellcasting(character);
  }, [character]);

  /**
   * Get all multiclass features
   */
  const getFeatures = useCallback(() => {
    return getMulticlassFeatures(character);
  }, [character]);

  /**
   * Check if character is multiclassed
   */
  const isMulticlassed = useCallback(() => {
    return (character.classLevels?.length || 0) > 1;
  }, [character]);

  /**
   * Get class level by class ID
   */
  const getClassLevel = useCallback(
    (classId: string) => {
      if (!character.classLevels) return 0;
      const classLevel = character.classLevels.find((cls) => cls.classId === classId);
      return classLevel ? classLevel.level : 0;
    },
    [character],
  );

  /**
   * Get total character level
   */
  const getTotalLevel = useCallback(() => {
    if (character.classLevels && character.classLevels.length > 0) {
      return character.classLevels.reduce((sum, cls) => sum + cls.level, 0);
    }
    return character.level || 1;
  }, [character]);

  return {
    // State
    isProcessing,
    validationResult,

    // Validation
    validateNewClass,

    // Actions
    addNewClass,
    levelUpSpecificClass,

    // Calculations
    getProficiencies,
    getHitPoints,
    getSpellcasting,
    getFeatures,

    // Utilities
    isMulticlassed,
    getClassLevel,
    getTotalLevel,
  };
};
