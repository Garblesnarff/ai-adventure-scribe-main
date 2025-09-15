/**
 * Dice Roll Request Component
 * Displays when the DM requests a dice roll from the player
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dice6, Zap, ArrowUp, ArrowDown, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RollRequest {
  type: 'attack' | 'save' | 'check' | 'damage' | 'initiative' | 'skill_check';
  formula: string;  // "1d20+5"
  purpose: string;  // "Arcana check to understand the mechanism"
  dc?: number;      // Target DC if applicable
  ac?: number;      // Target AC for attacks
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
  className
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualResult, setManualResult] = useState('');
  const [hasAdvantage, setHasAdvantage] = useState(request.advantage || false);
  const [hasDisadvantage, setHasDisadvantage] = useState(request.disadvantage || false);

  const getTypeColor = () => {
    switch (request.type) {
      case 'attack': return 'border-red-200 bg-red-50';
      case 'save': return 'border-orange-200 bg-orange-50';
      case 'check': return 'border-blue-200 bg-blue-50';
      case 'skill_check': return 'border-blue-200 bg-blue-50';
      case 'damage': return 'border-purple-200 bg-purple-50';
      case 'initiative': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = () => {
    switch (request.type) {
      case 'attack': return <Target className="w-4 h-4" />;
      case 'save': return <AlertCircle className="w-4 h-4" />;
      case 'initiative': return <Zap className="w-4 h-4" />;
      default: return <Dice6 className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (request.type) {
      case 'attack': return 'Attack Roll';
      case 'save': return 'Saving Throw';
      case 'check': return 'Ability Check';
      case 'skill_check': return 'Skill Check';
      case 'damage': return 'Damage Roll';
      case 'initiative': return 'Initiative';
      default: return 'Dice Roll';
    }
  };

  const handleAutoRoll = () => {
    // Apply advantage/disadvantage rules
    const finalAdvantage = hasAdvantage && !hasDisadvantage;
    const finalDisadvantage = hasDisadvantage && !hasAdvantage;
    
    onRoll(request.formula, finalAdvantage, finalDisadvantage);
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
              {request.formula}
            </div>
            {(request.dc || request.ac) && (
              <Badge variant="outline" className="text-sm">
                {request.dc ? `DC ${request.dc}` : `AC ${request.ac}`}
              </Badge>
            )}
          </div>
          
          {/* Advantage/Disadvantage Controls */}
          {request.type !== 'damage' && (
            <div className="flex gap-2 mt-3">
              <Button
                variant={hasAdvantage ? "default" : "outline"}
                size="sm"
                onClick={toggleAdvantage}
                className={cn(
                  "text-xs",
                  hasAdvantage ? "bg-green-600 text-white" : "text-green-600 border-green-600 hover:bg-green-50"
                )}
              >
                <ArrowUp className="w-3 h-3 mr-1" />
                Advantage
              </Button>
              <Button
                variant={hasDisadvantage ? "default" : "outline"}
                size="sm"
                onClick={toggleDisadvantage}
                className={cn(
                  "text-xs",
                  hasDisadvantage ? "bg-red-600 text-white" : "text-red-600 border-red-600 hover:bg-red-50"
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
            <Button
              onClick={handleAutoRoll}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              size="lg"
            >
              <Dice6 className="w-4 h-4 mr-2" />
              Roll Dice
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setManualMode(true)}
                className="flex-1 text-xs"
                size="sm"
              >
                Enter Manually
              </Button>
              {onCancel && (
                <Button
                  variant="ghost"
                  onClick={onCancel}
                  className="flex-1 text-xs"
                  size="sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">
                Enter your roll result:
              </label>
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
            ? "Enter the total result of your dice roll"
            : "Click 'Roll Dice' to automatically roll, or 'Enter Manually' if you prefer to roll physical dice"
          }
        </p>
      </div>
    </Card>
  );
};