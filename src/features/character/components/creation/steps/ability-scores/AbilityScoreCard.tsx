import React from 'react';

import type { AbilityScores } from '@/types/character';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { POINT_BUY_COSTS } from '@/utils/abilityScoreUtils';

interface AbilityScoreCardProps {
  ability: keyof AbilityScores;
  score: number;
  modifier: number;
  remainingPoints: number;
  onScoreChange: (ability: keyof AbilityScores, increase: boolean) => void;
  isRollMode?: boolean;
}

/**
 * Component for displaying and managing individual ability scores
 * Handles both point buy and roll methods
 */
const AbilityScoreCard: React.FC<AbilityScoreCardProps> = ({
  ability,
  score,
  modifier,
  remainingPoints,
  onScoreChange,
  isRollMode = false,
}) => {
  const isIncreaseDisabled =
    isRollMode ||
    score === 15 ||
    remainingPoints < POINT_BUY_COSTS[score + 1] - POINT_BUY_COSTS[score];
  const isDecreaseDisabled = isRollMode || score === 8;

  return (
    <Card className="p-4">
      <h3 className="text-xl font-semibold capitalize mb-2">{ability}</h3>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScoreChange(ability, false)}
          disabled={isDecreaseDisabled}
        >
          -
        </Button>
        <span className="text-2xl font-bold">
          {score}
          <span className="text-sm ml-2 text-muted-foreground">
            ({modifier >= 0 ? '+' : ''}
            {modifier})
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScoreChange(ability, true)}
          disabled={isIncreaseDisabled}
        >
          +
        </Button>
      </div>
    </Card>
  );
};

export default AbilityScoreCard;
