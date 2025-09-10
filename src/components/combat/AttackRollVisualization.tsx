/**
 * Attack Roll Visualization Component
 * 
 * Displays detailed information about attack rolls including modifiers,
 * advantage/disadvantage conditions, and roll results.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Swords, 
  Target, 
  Zap,
  ShieldAlert,
  ShieldCheck,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { DiceRoll } from '@/types/combat';

// ===========================
// Component Props
// ===========================

interface AttackRollVisualizationProps {
  attackerName: string;
  targetName: string;
  weaponName: string;
  attackBonus: number;
  modifiers: Array<{ name: string; value: number }>;
  conditions: string[];
  advantage: boolean;
  disadvantage: boolean;
  targetAC: number;
  roll?: DiceRoll;
  hit?: boolean;
  critical?: boolean;
  fumble?: boolean;
}

// ===========================
// Attack Roll Visualization Component
// ===========================

const AttackRollVisualization: React.FC<AttackRollVisualizationProps> = ({
  attackerName,
  targetName,
  weaponName,
  attackBonus,
  modifiers,
  conditions,
  advantage,
  disadvantage,
  targetAC,
  roll,
  hit,
  critical,
  fumble
}) => {
  // Calculate total modifier
  const totalModifier = modifiers.reduce((sum, mod) => sum + mod.value, 0);
  
  // Get roll result
  const rollResult = roll?.total || 0;
  const naturalRoll = roll?.naturalRoll || 0;
  
  // Determine roll status
  const isCritical = critical || naturalRoll === 20;
  const isFumble = fumble || naturalRoll === 1;
  const isHit = hit !== undefined ? hit : rollResult >= targetAC;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Attack Roll Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attack Summary */}
        <div className="text-center">
          <h3 className="font-bold text-lg">
            {attackerName} attacks {targetName} with {weaponName}
          </h3>
          <p className="text-sm text-muted-foreground">
            Target AC: {targetAC}
          </p>
        </div>
        
        {/* Advantage/Disadvantage Indicators */}
        {(advantage || disadvantage) && (
          <div className="flex justify-center gap-2">
            {advantage && (
              <Badge variant="default" className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                Advantage
              </Badge>
            )}
            {disadvantage && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3" />
                Disadvantage
              </Badge>
            )}
          </div>
        )}
        
        {/* Conditions */}
        {conditions.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Conditions: {conditions.join(', ')}
            </p>
          </div>
        )}
        
        {/* Modifier Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Modifiers</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {modifiers.map((modifier, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <span className="text-sm">{modifier.name}:</span>
                <span className="font-medium">
                  {modifier.value > 0 ? '+' : ''}{modifier.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-2 bg-primary/10 rounded font-bold">
              <span>Total:</span>
              <span>{totalModifier > 0 ? '+' : ''}{totalModifier}</span>
            </div>
          </div>
        </div>
        
        {/* Roll Visualization */}
        {roll && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Roll Result</h4>
            
            {/* Dice Visualization */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isCritical ? 'text-green-600' : 
                  isFumble ? 'text-red-600' : 
                  isHit ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {naturalRoll}
                </div>
                <div className="text-xs text-muted-foreground">Natural Roll</div>
              </div>
              
              <div className="text-2xl">+</div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {totalModifier > 0 ? '+' : ''}{totalModifier}
                </div>
                <div className="text-xs text-muted-foreground">Modifier</div>
              </div>
              
              <div className="text-2xl">=</div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isCritical ? 'text-green-600' : 
                  isFumble ? 'text-red-600' : 
                  isHit ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {rollResult}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
            
            {/* Result Indicator */}
            <div className="text-center">
              {isCritical ? (
                <Badge variant="default" className="text-lg py-2 px-4">
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  CRITICAL HIT!
                </Badge>
              ) : isFumble ? (
                <Badge variant="destructive" className="text-lg py-2 px-4">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  CRITICAL MISS!
                </Badge>
              ) : isHit ? (
                <Badge variant="default" className="text-lg py-2 px-4">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  HIT!
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-lg py-2 px-4">
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  MISS
                </Badge>
              )}
            </div>
            
            {/* Target AC Comparison */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Roll Result: {rollResult}</span>
                <span>Target AC: {targetAC}</span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(0, (rollResult / (targetAC + 10)) * 100))} 
                className="h-2"
              />
              <div className="text-center text-sm">
                {isCritical ? (
                  <span className="text-green-600 font-medium">Automatic Hit (Critical!) </span>
                ) : isFumble ? (
                  <span className="text-red-600 font-medium">Automatic Miss (Critical!) </span>
                ) : isHit ? (
                  <span className="text-blue-600 font-medium">Attack Hits! </span>
                ) : (
                  <span className="text-gray-600 font-medium">Attack Misses </span>
                )}
                by {Math.abs(rollResult - targetAC)} points
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttackRollVisualization;