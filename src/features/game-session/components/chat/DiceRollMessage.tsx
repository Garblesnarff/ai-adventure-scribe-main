/**
 * Dice Roll Message Component
 * Displays dice roll results in chat with visual flair
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dice6, Plus, Minus, ArrowUp, ArrowDown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { diceRoll, celebrate } from '@/utils/animations';

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
  className
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
    label
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
      const dropped = results.filter(r => !kept.includes(r));
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium">
              Kept: [{kept.join(', ')}]
            </span>
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

  const isCriticalSuccess = critical && naturalRoll === 20;
  const isCriticalFailure = critical === false && naturalRoll === 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn('w-full max-w-sm', className)}
    >
      <Card className={cn(
        'bg-gradient-to-br border-2 transition-all duration-300',
        isCriticalSuccess && 'from-green-50 to-emerald-100 border-green-400 shadow-lg shadow-green-500/30',
        isCriticalFailure && 'from-red-50 to-rose-100 border-red-400 shadow-lg shadow-red-500/30',
        !isCriticalSuccess && !isCriticalFailure && 'from-slate-50 to-blue-50 border-slate-200'
      )}>
        <div className="p-4 relative overflow-hidden">
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
          <motion.div
            className="flex gap-2 mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {advantage && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border border-green-300">
                <ArrowUp className="w-3 h-3 mr-1" />
                Advantage
              </Badge>
            )}
            {disadvantage && (
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border border-red-300">
                <ArrowDown className="w-3 h-3 mr-1" />
                Disadvantage
              </Badge>
            )}
          </motion.div>
        )}

        {/* Formula Display */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-lg font-mono font-medium text-slate-700">
              {formula}
            </div>
            <div className="text-xs text-muted-foreground">Formula</div>
          </motion.div>

          <motion.div
            className="text-xl text-slate-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >=</motion.div>

          <motion.div
            className="text-center relative"
            variants={isCriticalSuccess || isCriticalFailure ? celebrate : diceRoll.result}
            initial="hidden"
            animate="visible"
          >
            {isCriticalSuccess && (
              <motion.div
                className="absolute -top-2 -right-2"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: [0, 1.2, 1], rotate: 360 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </motion.div>
            )}
            {isCriticalFailure && (
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ x: [-2, 2, -2, 2, 0] }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Zap className="w-5 h-5 text-red-500" />
              </motion.div>
            )}
            <div className={cn('text-3xl font-bold', getResultColor())}>
              {total}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </motion.div>
        </div>

        {/* Individual Roll Results */}
        {formatIndividualRolls()}

        {/* Critical Hit/Miss Indicator */}
        {critical !== undefined && naturalRoll && (
          <motion.div
            className="mt-3 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
          >
            {critical ? (
              <Badge variant="default" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 text-sm px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Critical Success! (Natural {naturalRoll})
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-gradient-to-r from-red-600 to-rose-600 shadow-lg shadow-red-500/50 text-sm px-4 py-1.5">
                <Zap className="w-4 h-4 mr-1.5" />
                Critical Failure! (Natural {naturalRoll})
              </Badge>
            )}
          </motion.div>
        )}

        {/* Special d20 callouts */}
        {dieType === 20 && naturalRoll && !critical && (
          <motion.div
            className="mt-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {naturalRoll === 20 && (
              <Badge variant="outline" className="text-green-600 border-green-600 shadow-sm shadow-green-500/30">
                Natural 20!
              </Badge>
            )}
            {naturalRoll === 1 && (
              <Badge variant="outline" className="text-red-600 border-red-600 shadow-sm shadow-red-500/30">
                Natural 1...
              </Badge>
            )}
          </motion.div>
        )}

        {/* Sparkle effect overlay for critical success */}
        {isCriticalSuccess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-radial from-yellow-200/20 via-transparent to-transparent"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
              transition={{ duration: 1.2, delay: 0.5 }}
            />
          </div>
        )}
      </div>
    </Card>
    </motion.div>
  );
};