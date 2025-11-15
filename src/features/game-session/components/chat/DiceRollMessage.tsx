/**
 * Dice Roll Message Component
 * Displays dice roll results in chat with visual flair
 */

import { Dice6, Plus, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DiceRollData {
  formula: string;
  count: number;
  dieType: number;
  modifier: number;
  advantage: boolean;
  disadvantage: boolean;
  results: number[];
  keptResults?: number[];
  total: number;
  naturalRoll?: number;
  critical?: boolean;
  label?: string;
  timestamp: string;
}

interface DiceRollMessageProps {
  data: DiceRollData;
  playerName?: string;
  className?: string;
}

/**
 * Dice Roll Message Component for Chat
 * Displays dice roll results with visual styling similar to CombatMessage
 */
export const DiceRollMessage: React.FC<DiceRollMessageProps> = ({
  data,
  playerName,
  className,
}) => {
  const {
    formula,
    count,
    dieType,
    modifier,
    advantage,
    disadvantage,
    results,
    keptResults,
    total,
    naturalRoll,
    critical,
    label,
  } = data;

  // Determine result styling
  const getResultColor = () => {
    if (critical && naturalRoll === 20) return 'text-green-600 font-bold';
    if (critical === false && naturalRoll === 1) return 'text-red-600 font-bold';
    if (dieType === 20 && naturalRoll) {
      if (naturalRoll >= 15) return 'text-green-500';
      if (naturalRoll <= 5) return 'text-orange-500';
    }
    return 'text-blue-600';
  };

  const formatIndividualRolls = () => {
    if (advantage || disadvantage) {
      const kept = keptResults || results.slice(0, 1);
      const dropped = results.filter((r) => !kept.includes(r));

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium">Kept: [{kept.join(', ')}]</span>
            {dropped.length > 0 && (
              <span className="text-xs text-red-400 line-through">
                Dropped: [{dropped.join(', ')}]
              </span>
            )}
          </div>
        </div>
      );
    } else if (count > 1) {
      return (
        <div className="text-xs text-muted-foreground">
          Individual rolls: [{results.join(', ')}]
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={cn('w-full max-w-sm bg-slate-50 border-slate-200', className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Dice6 className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {playerName ? `${playerName} rolled` : 'Dice Roll'}
            {label && `: ${label}`}
          </span>
        </div>

        {/* Advantage/Disadvantage Badges */}
        {(advantage || disadvantage) && (
          <div className="flex gap-2 mb-3">
            {advantage && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                <ArrowUp className="w-2 h-2 mr-1" />
                Advantage
              </Badge>
            )}
            {disadvantage && (
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                <ArrowDown className="w-2 h-2 mr-1" />
                Disadvantage
              </Badge>
            )}
          </div>
        )}

        {/* Formula Display */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-mono font-medium text-slate-700">{formula}</div>
            <div className="text-xs text-muted-foreground">Formula</div>
          </div>

          <div className="text-xl text-slate-400">=</div>

          <div className="text-center">
            <div className={cn('text-2xl font-bold', getResultColor())}>{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Individual Roll Results */}
        {formatIndividualRolls()}

        {/* Critical Hit/Miss Indicator */}
        {critical !== undefined && naturalRoll && (
          <div className="mt-3 text-center">
            {critical ? (
              <Badge variant="default" className="bg-green-600 text-white">
                Critical Success! (Natural {naturalRoll})
              </Badge>
            ) : (
              <Badge variant="destructive">Critical Failure! (Natural {naturalRoll})</Badge>
            )}
          </div>
        )}

        {/* Special d20 callouts */}
        {dieType === 20 && naturalRoll && !critical && (
          <div className="mt-2 text-center">
            {naturalRoll === 20 && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Natural 20!
              </Badge>
            )}
            {naturalRoll === 1 && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Natural 1...
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
