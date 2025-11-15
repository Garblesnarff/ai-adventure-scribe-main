import { useMemo } from 'react';

import type { Character, Ability, AbilityScores } from '@/types/character';
import type { CharacterStats } from '@/utils/character-calculations';

import logger from '@/lib/logger';
import { calculateAllCharacterStats } from '@/utils/character-calculations';

/**
 * Hook for calculating and memoizing character statistics
 * Provides real-time D&D 5e calculations for character sheets
 */
export const useCharacterStats = (character: Character | null): CharacterStats | null => {
  return useMemo(() => {
    if (!character) return null;

    try {
      return calculateAllCharacterStats(character);
    } catch (error) {
      logger.error('Error calculating character stats:', error);
      return null;
    }
  }, [
    character?.level,
    character?.class,
    character?.race,
    character?.abilityScores?.strength?.score,
    character?.abilityScores?.dexterity?.score,
    character?.abilityScores?.constitution?.score,
    character?.abilityScores?.intelligence?.score,
    character?.abilityScores?.wisdom?.score,
    character?.abilityScores?.charisma?.score,
    character?.abilityScores?.strength?.modifier,
    character?.abilityScores?.dexterity?.modifier,
    character?.abilityScores?.constitution?.modifier,
    character?.abilityScores?.intelligence?.modifier,
    character?.abilityScores?.wisdom?.modifier,
    character?.abilityScores?.charisma?.modifier,
  ]);
};

/**
 * Hook for getting specific calculated values from character stats
 * Useful for components that only need a few values
 */
export const useCharacterStatValue = <K extends keyof CharacterStats>(
  character: Character | null,
  statKey: K,
): CharacterStats[K] | null => {
  const stats = useCharacterStats(character);
  return stats ? stats[statKey] : null;
};

/**
 * Hook for checking if a character is a spellcaster
 */
export const useIsSpellcaster = (character: Character | null): boolean => {
  return useMemo(() => {
    if (!character?.class) return false;

    const spellcastingClasses = [
      'Wizard',
      'Sorcerer',
      'Warlock',
      'Bard',
      'Cleric',
      'Druid',
      'Paladin',
      'Ranger',
      'Eldritch Knight',
      'Arcane Trickster',
    ];

    return spellcastingClasses.includes(character.class.name);
  }, [character?.class?.name]);
};

/**
 * Hook for getting character level progression info
 */
export const useLevelProgression = (character: Character | null) => {
  return useMemo(() => {
    if (!character) return null;

    const currentLevel = character.level || 1;
    const currentXP = character.experience || 0;

    // D&D 5e XP thresholds
    const xpThresholds = [
      0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
      165000, 195000, 225000, 265000, 305000, 355000,
    ];

    const nextLevelXP = xpThresholds[currentLevel] || xpThresholds[19];
    const previousLevelXP = xpThresholds[currentLevel - 1] || 0;
    const progressXP = currentXP - previousLevelXP;
    const requiredXP = nextLevelXP - previousLevelXP;
    const progressPercent = currentLevel >= 20 ? 100 : (progressXP / requiredXP) * 100;

    return {
      currentLevel,
      currentXP,
      nextLevelXP,
      previousLevelXP,
      progressXP,
      requiredXP,
      progressPercent,
      canLevelUp: currentXP >= nextLevelXP && currentLevel < 20,
      isMaxLevel: currentLevel >= 20,
    };
  }, [character?.level, character?.experience]);
};

/**
 * Hook for getting character's effective ability scores (including racial bonuses)
 */
export const useEffectiveAbilityScores = (character: Character | null) => {
  return useMemo(() => {
    if (!character?.abilityScores) return null;

    const baseScores = character.abilityScores;
    const racialBonuses = {
      ...character.race?.abilityScoreIncrease,
      ...character.subrace?.abilityScoreIncrease,
    };

    const effectiveScores = (Object.entries(baseScores) as [keyof AbilityScores, Ability][]).reduce(
      (acc, [ability, data]) => {
        const racialBonus = racialBonuses[ability] || 0;
        const effectiveScore = data.score + racialBonus;

        acc[ability] = {
          ...data,
          score: effectiveScore,
          baseScore: data.score,
          racialBonus,
          modifier: Math.floor((effectiveScore - 10) / 2),
        };

        return acc;
      },
      {} as Record<keyof AbilityScores, Ability & { baseScore: number; racialBonus: number }>,
    );

    return effectiveScores;
  }, [
    character?.abilityScores,
    character?.race?.abilityScoreIncrease,
    character?.subrace?.abilityScoreIncrease,
  ]);
};
