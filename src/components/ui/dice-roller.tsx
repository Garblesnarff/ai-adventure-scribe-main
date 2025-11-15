import { Dice6, Plus, Minus } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiceRollResult {
  total: number;
  rolls: number[];
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  timestamp: Date;
}

interface DiceRollerProps {
  dice: string; // e.g., "1d20", "2d6+3"
  modifier?: number;
  label?: string;
  className?: string;
  onRoll?: (result: DiceRollResult) => void;
  advantage?: boolean;
  disadvantage?: boolean;
  disabled?: boolean;
  displayOnly?: boolean;
}

/**
 * Interactive dice rolling component with advantage/disadvantage support
 * Mimics Roll20's click-to-roll functionality
 */
const DiceRoller: React.FC<DiceRollerProps> = ({
  dice,
  modifier = 0,
  label,
  className,
  onRoll,
  advantage = false,
  disadvantage = false,
  disabled = false,
  displayOnly = false,
}) => {
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const parseDiceString = (diceStr: string) => {
    // Parse strings like "1d20", "2d6+3", "1d8-1"
    const match = diceStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return { count: 1, sides: 20, mod: 0 };

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const mod = match[3] ? parseInt(match[3]) : 0;

    return { count, sides, mod };
  };

  const rollDice = (sides: number): number => {
    return Math.floor(Math.random() * sides) + 1;
  };

  const performRoll = async () => {
    if (disabled || isRolling) return;

    setIsRolling(true);

    // Add slight delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 200));

    const { count, sides, mod } = parseDiceString(dice);
    let rolls: number[] = [];

    // Handle advantage/disadvantage for d20 rolls
    if (sides === 20 && count === 1 && (advantage || disadvantage)) {
      const roll1 = rollDice(sides);
      const roll2 = rollDice(sides);

      if (advantage) {
        rolls = [Math.max(roll1, roll2)];
      } else {
        rolls = [Math.min(roll1, roll2)];
      }
    } else {
      // Normal rolling
      for (let i = 0; i < count; i++) {
        rolls.push(rollDice(sides));
      }
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0) + mod + modifier;

    const result: DiceRollResult = {
      total,
      rolls,
      modifier: mod + modifier,
      advantage,
      disadvantage,
      timestamp: new Date(),
    };

    setLastRoll(result);
    onRoll?.(result);
    setIsRolling(false);
  };

  const getResultColor = () => {
    if (!lastRoll) return '';

    // Highlight nat 1s and nat 20s for d20 rolls
    const { sides } = parseDiceString(dice);
    if (sides === 20 && lastRoll.rolls.length === 1) {
      if (lastRoll.rolls[0] === 20) return 'text-green-600 font-bold';
      if (lastRoll.rolls[0] === 1) return 'text-red-600 font-bold';
    }

    return '';
  };

  const baseContent = (
    <div className={cn('flex items-center gap-2', className)}>
      {displayOnly ? (
        <div className="flex items-center gap-1 px-2 py-1 border border-border rounded-sm bg-muted/60">
          <Dice6 className="w-3 h-3" />
          <span className="text-xs font-medium">{label || dice}</span>
          {modifier !== 0 && (
            <span className="text-xs">
              {modifier > 0 ? '+' : ''}
              {modifier}
            </span>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={performRoll}
          disabled={disabled || isRolling}
          className="flex items-center gap-1 hover:bg-primary/10"
        >
          <Dice6 className={cn('w-3 h-3', isRolling && 'animate-spin')} />
          {label || dice}
          {modifier !== 0 && (
            <span className="text-xs">
              {modifier > 0 ? '+' : ''}
              {modifier}
            </span>
          )}
        </Button>
      )}

      {/* Advantage/Disadvantage indicators */}
      {advantage && (
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
          <Plus className="w-2 h-2 mr-1" />
          ADV
        </Badge>
      )}
      {disadvantage && (
        <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
          <Minus className="w-2 h-2 mr-1" />
          DIS
        </Badge>
      )}

      {/* Last roll result */}
      {lastRoll && (
        <Badge variant="outline" className={cn('text-sm font-mono', getResultColor())}>
          {lastRoll.total}
        </Badge>
      )}
    </div>
  );

  if (displayOnly) {
    return baseContent;
  }

  return baseContent;
};

export default DiceRoller;
