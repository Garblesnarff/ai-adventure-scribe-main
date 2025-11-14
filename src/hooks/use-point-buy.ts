import { useState, useEffect } from 'react';

import type { AbilityScores } from '@/types/character';

import { useCharacter } from '@/contexts/CharacterContext';
import { calculateModifier, getPointCostDifference } from '@/utils/abilityScoreUtils';

/**
 * Custom hook for managing the point buy system in ability score selection
 * Handles point allocation, score changes, and state management
 * @returns Object containing remaining points and score change handler
 */
export const usePointBuy = () => {
  const { state, dispatch } = useCharacter();
  const [remainingPoints, setRemainingPoints] = useState(() => {
    return state.character?.remainingAbilityPoints ?? 27;
  });

  // Update context whenever remaining points change
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { remainingAbilityPoints: remainingPoints },
    });
  }, [remainingPoints, dispatch]);

  /**
   * Handles increasing or decreasing an ability score
   * @param ability - The ability score to modify
   * @param increase - Whether to increase or decrease the score
   */
  const handleScoreChange = (ability: keyof AbilityScores, increase: boolean) => {
    const currentScore = state.character?.abilityScores[ability].score || 8;
    const targetScore = increase ? currentScore + 1 : currentScore - 1;

    if ((increase && targetScore > 15) || (!increase && targetScore < 8)) {
      return;
    }

    const pointDifference = getPointCostDifference(
      increase ? currentScore : targetScore,
      increase ? targetScore : currentScore,
    );

    if (increase && remainingPoints < pointDifference) {
      return;
    }

    const newScores = {
      ...state.character?.abilityScores,
      [ability]: {
        score: targetScore,
        modifier: calculateModifier(targetScore),
        savingThrow: state.character?.abilityScores[ability].savingThrow || false,
      },
    };

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    setRemainingPoints((prev) => prev + (increase ? -pointDifference : pointDifference));
  };

  return {
    remainingPoints,
    handleScoreChange,
  };
};
