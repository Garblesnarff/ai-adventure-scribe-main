/**
 * Dice Roll Request Component
 * Displays when the DM requests a dice roll from the player
 */

import { Dice6, Zap, ArrowUp, ArrowDown, Target, AlertCircle, Info } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { DiceRollEmbed } from '@/components/DiceRollEmbed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCharacter } from '@/contexts/CharacterContext';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';
import { DiceEngine, type DiceRollResult } from '@/services/dice/DiceEngine';
import {
  calculateRollWithBreakdown,
  parseAbilityName,
  SKILL_ABILITIES,
  SKILL_ALIASES,
  type AbilityName,
} from '@/utils/characterModifiers';

export interface RollRequest {
  type: 'attack' | 'save' | 'check' | 'damage' | 'initiative' | 'skill_check';
  formula: string; // "1d20+5" or "1d20+modifier" or "1d20+str"
  purpose: string; // "Arcana check to understand the mechanism"
  dc?: number; // Target DC if applicable
  ac?: number; // Target AC for attacks
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number; // Base modifier if not in formula
}

interface DiceRollRequestProps {
  request: RollRequest;
  onRoll: (formula: string, advantage?: boolean, disadvantage?: boolean) => void;
  onManualResult: (result: number) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Interactive Dice Roll Request Component
 * Shows when DM requests a roll, allows player to roll or input manually
 */
export const DiceRollRequest: React.FC<DiceRollRequestProps> = ({
  request,
  onRoll,
  onManualResult,
  onCancel,
  className,
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualResult, setManualResult] = useState('');
  const [hasAdvantage, setHasAdvantage] = useState(request.advantage || false);
  const [hasDisadvantage, setHasDisadvantage] = useState(request.disadvantage || false);
  const [showDiceAnimation, setShowDiceAnimation] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const { state: characterState } = useCharacter();
  const character = characterState.character;

  // Calculate the actual roll formula with character modifiers
  const rollCalculation = useMemo(() => {
    // For damage rolls, ALWAYS use the exact formula from the DM - no modifier calculations
    if (request.type === 'damage') {
      return {
        formula: request.formula,
        breakdown: [request.formula],
        totalModifier: 0,
        isProficient: false,
      };
    }

    // If formula already has numbers (like "1d20+5"), use it as-is - no modifier calculations
    if (/\d+d\d+[+-]\d+/.test(request.formula)) {
      return {
        formula: request.formula,
        breakdown: [request.formula],
        totalModifier: 0,
        isProficient: false,
      };
    }

    if (!character) {
      return {
        formula: request.formula,
        breakdown: [request.formula],
        totalModifier: 0,
        isProficient: false,
      };
    }

    try {
      // Only calculate modifiers for ability checks, saves, attacks, and initiative
      let ability: AbilityName | undefined;
      let skillName: string | undefined;

      // Extract ability or skill from formula or purpose
      if (request.formula.includes('+str') || request.formula.includes('strength')) {
        ability = 'strength';
      } else if (request.formula.includes('+dex') || request.formula.includes('dexterity')) {
        ability = 'dexterity';
      } else if (request.formula.includes('+con') || request.formula.includes('constitution')) {
        ability = 'constitution';
      } else if (request.formula.includes('+int') || request.formula.includes('intelligence')) {
        ability = 'intelligence';
      } else if (request.formula.includes('+wis') || request.formula.includes('wisdom')) {
        ability = 'wisdom';
      } else if (request.formula.includes('+cha') || request.formula.includes('charisma')) {
        ability = 'charisma';
      } else {
        // Try to parse from purpose text
        const purposeLower = request.purpose.toLowerCase();

        // Check for skill names in purpose
        for (const [skill, skillAbility] of Object.entries(SKILL_ABILITIES)) {
          if (purposeLower.includes(skill)) {
            skillName = skill;
            ability = skillAbility;
            break;
          }
        }

        // Check for ability names in purpose
        if (!ability) {
          for (const abilityName of [
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
          ]) {
            if (
              purposeLower.includes(abilityName) ||
              purposeLower.includes(abilityName.slice(0, 3))
            ) {
              ability = abilityName as AbilityName;
              break;
            }
          }
        }
      }

      // Determine roll type and calculate
      let rollType: 'attack' | 'save' | 'check' | 'skill' | 'initiative' = 'check';

      if (request.type === 'skill_check' || skillName) {
        rollType = 'skill';
      } else if (request.type === 'save') {
        rollType = 'save';
      } else if (request.type === 'attack') {
        rollType = 'attack';
        ability = ability || 'strength'; // Default to strength for attacks
      } else if (request.type === 'initiative') {
        rollType = 'initiative';
        ability = 'dexterity';
      }

      return calculateRollWithBreakdown(character, rollType, ability, skillName);
    } catch (error) {
      logger.warn('Error calculating roll with character modifiers:', error);
      return {
        formula: request.formula,
        breakdown: [request.formula],
        totalModifier: 0,
        isProficient: false,
      };
    }
  }, [character, request]);

  const getTypeColor = () => {
    switch (request.type) {
      case 'attack':
        return 'border-red-200 bg-red-50';
      case 'save':
        return 'border-orange-200 bg-orange-50';
      case 'check':
        return 'border-blue-200 bg-blue-50';
      case 'skill_check':
        return 'border-blue-200 bg-blue-50';
      case 'damage':
        return 'border-purple-200 bg-purple-50';
      case 'initiative':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = () => {
    switch (request.type) {
      case 'attack':
        return <Target className="w-4 h-4" />;
      case 'save':
        return <AlertCircle className="w-4 h-4" />;
      case 'initiative':
        return <Zap className="w-4 h-4" />;
      default:
        return <Dice6 className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (request.type) {
      case 'attack':
        return 'Attack Roll';
      case 'save':
        return 'Saving Throw';
      case 'check':
        return 'Ability Check';
      case 'skill_check':
        return 'Skill Check';
      case 'damage':
        return 'Damage Roll';
      case 'initiative':
        return 'Initiative';
      default:
        return 'Dice Roll';
    }
  };

  const handleAutoRoll = () => {
    // Show the animated dice rolling
    setShowDiceAnimation(true);
    setIsRolling(true);
  };

  const handleDiceRollComplete = (result: number | any, details?: any) => {
    // After animation completes, submit the result
    setIsRolling(false);

    // Extract the total from DiceRollResult object if needed
    let totalResult: number;
    if (typeof result === 'number') {
      totalResult = result;
    } else if (result && typeof result === 'object' && 'total' in result) {
      totalResult = result.total;
    } else {
      logger.warn('Unexpected result type in handleDiceRollComplete:', result);
      totalResult = 0;
    }

    onManualResult(totalResult);
  };

  const handleManualSubmit = () => {
    const result = parseInt(manualResult);
    if (!isNaN(result) && result >= 1) {
      onManualResult(result);
    }
  };

  const toggleAdvantage = () => {
    if (hasAdvantage) {
      setHasAdvantage(false);
    } else {
      setHasAdvantage(true);
      setHasDisadvantage(false);
    }
  };

  const toggleDisadvantage = () => {
    if (hasDisadvantage) {
      setHasDisadvantage(false);
    } else {
      setHasDisadvantage(true);
      setHasAdvantage(false);
    }
  };

  return (
    <Card className={cn('w-full max-w-md mx-auto border-2 shadow-lg', getTypeColor(), className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <span className="font-semibold text-slate-700">{getTypeLabel()} Requested</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="mb-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>Purpose:</strong> {request.purpose}
          </p>
        </div>

        {/* Roll Details */}
        <div className="bg-white rounded-lg p-3 mb-4 border">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-mono font-bold text-slate-800">
              {rollCalculation.formula}
            </div>
            {(request.dc || request.ac) && (
              <Badge variant="outline" className="text-sm">
                {request.dc ? `DC ${request.dc}` : `AC ${request.ac}`}
              </Badge>
            )}
          </div>

          {/* Modifier Breakdown */}
          {rollCalculation.breakdown.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Info className="w-3 h-3" />
              <span>{rollCalculation.breakdown.join(' + ')}</span>
              {rollCalculation.isProficient && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Proficient
                </Badge>
              )}
            </div>
          )}

          {/* Advantage/Disadvantage Controls */}
          {request.type !== 'damage' && (
            <div className="flex gap-2 mt-3">
              <Button
                variant={hasAdvantage ? 'default' : 'outline'}
                size="sm"
                onClick={toggleAdvantage}
                className={cn(
                  'text-xs',
                  hasAdvantage
                    ? 'bg-green-600 text-white'
                    : 'text-green-600 border-green-600 hover:bg-green-50',
                )}
              >
                <ArrowUp className="w-3 h-3 mr-1" />
                Advantage
              </Button>
              <Button
                variant={hasDisadvantage ? 'default' : 'outline'}
                size="sm"
                onClick={toggleDisadvantage}
                className={cn(
                  'text-xs',
                  hasDisadvantage
                    ? 'bg-red-600 text-white'
                    : 'text-red-600 border-red-600 hover:bg-red-50',
                )}
              >
                <ArrowDown className="w-3 h-3 mr-1" />
                Disadvantage
              </Button>
            </div>
          )}
        </div>

        {/* Roll Actions */}
        {!manualMode ? (
          <div className="space-y-3">
            {showDiceAnimation ? (
              // Show animated dice rolling
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-200">
                <DiceRollEmbed
                  expression={rollCalculation.formula}
                  purpose={request.purpose}
                  onRoll={handleDiceRollComplete}
                  autoRoll={true}
                  showAnimation={true}
                  advantage={hasAdvantage && !hasDisadvantage}
                  disadvantage={hasDisadvantage && !hasAdvantage}
                />
              </div>
            ) : (
              // Show roll dice button
              <>
                <Button
                  onClick={handleAutoRoll}
                  disabled={isRolling}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  size="lg"
                >
                  <Dice6 className="w-4 h-4 mr-2" />
                  {isRolling ? 'Rolling...' : 'Roll Dice'}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setManualMode(true)}
                    disabled={isRolling}
                    className="flex-1 text-xs"
                    size="sm"
                  >
                    Enter Manually
                  </Button>
                  {onCancel && (
                    <Button
                      variant="ghost"
                      onClick={onCancel}
                      disabled={isRolling}
                      className="flex-1 text-xs"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Enter your roll result:</label>
              <Input
                type="number"
                value={manualResult}
                onChange={(e) => setManualResult(e.target.value)}
                placeholder="Enter total result..."
                className="text-center text-lg font-mono"
                min="1"
                max="100"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleManualSubmit}
                disabled={!manualResult || isNaN(parseInt(manualResult))}
                className="flex-1"
              >
                Submit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setManualMode(false);
                  setManualResult('');
                }}
                className="flex-1"
              >
                Back to Roll
              </Button>
            </div>
          </div>
        )}

        {/* Hint Text */}
        <p className="text-xs text-slate-500 mt-3 text-center">
          {manualMode
            ? 'Enter the total result of your dice roll'
            : "Click 'Roll Dice' to automatically roll, or 'Enter Manually' if you prefer to roll physical dice"}
        </p>
      </div>
    </Card>
  );
};
