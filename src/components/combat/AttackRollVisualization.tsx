/**
 * Attack Roll Visualization Component
 *
 * Displays detailed information about attack rolls including modifiers,
 * advantage/disadvantage conditions, and roll results. Now integrated
 * with the enhanced attack system from attackUtils.ts.
 */

import { Swords, Target, Zap, ShieldAlert, ShieldCheck, ArrowUp, ArrowDown } from 'lucide-react';
import React from 'react';

import type { Equipment } from '@/data/equipmentOptions';
import type { DiceRoll, DamageType } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// ===========================
// Component Props
// ===========================

export interface AttackResult {
  resolution: {
    hit: boolean;
    roll: DiceRoll;
    acHit: number;
    criticalHit?: boolean;
    criticalFail?: boolean;
    advantage: boolean;
    disadvantage: boolean;
  };
  damage: {
    rolls: DiceRoll[];
    totalBeforeResistance: number;
    totalAfterResistance: number;
    damageType: DamageType;
    resistances: DamageType[];
    vulnerabilities: DamageType[];
    immunities: DamageType[];
  } | null;
  targetReducedHp?: number;
  totalDamageDealt?: number;
}

interface AttackRollVisualizationProps {
  attackerName: string;
  targetName: string;
  weapon: Equipment | null; // Enhanced to use full Equipment object
  attackResult: AttackResult;
}

// ===========================
// Damage Display Component
// ===========================

interface DamageDisplayProps {
  damageRolls: DiceRoll[];
  totalDamage: number;
  damageType: DamageType;
  resistances?: DamageType[];
  vulnerabilities?: DamageType[];
  immunities?: DamageType[];
}

const DamageDisplay: React.FC<DamageDisplayProps> = ({
  damageRolls,
  totalDamage,
  damageType,
  resistances = [],
  vulnerabilities = [],
  immunities = [],
}) => {
  const getDamageColor = (type: DamageType) => {
    const colorMap: Record<string, string> = {
      force: 'text-blue-600',
      fire: 'text-red-600',
      cold: 'text-blue-500',
      lightning: 'text-yellow-500',
      poison: 'text-green-600',
      necrotic: 'text-purple-600',
      radiant: 'text-yellow-600',
      slashing: 'text-red-700',
      piercing: 'text-gray-700',
      bludgeoning: 'text-orange-600',
    };
    return colorMap[type] || 'text-gray-600';
  };

  const hasModifiers =
    resistances.length > 0 || vulnerabilities.length > 0 || immunities.length > 0;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Damage Rolls</h4>

      {/* Damage Breakdown */}
      <div className="grid gap-2">
        {damageRolls.map((roll, index) => (
          <div key={index} className="text-sm flex items-center justify-between">
            <span>
              {roll.count}d{roll.dieType}
              {roll.modifier > 0 && <span className="text-green-600"> +{roll.modifier}</span>}
            </span>
            <div className="text-right">
              {roll.results?.join(', ')} = {roll.total}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Final Damage Result */}
      <div className="flex items-center justify-between font-medium">
        <span>Total {damageType} Damage:</span>
        <span className={`font-bold ${getDamageColor(damageType)}`}>{totalDamage}</span>
      </div>

      {/* Damage Modifiers */}
      {hasModifiers && (
        <div className="space-y-1 text-sm">
          {resistances.length > 0 && (
            <div className="text-red-600">
              <ShieldAlert className="w-3 h-3 inline mr-1" />
              Resistance to {resistances.join(', ')}
            </div>
          )}
          {vulnerabilities.length > 0 && (
            <div className="text-orange-600">
              <Zap className="w-3 h-3 inline mr-1" />
              Vulnerable to {vulnerabilities.join(', ')}
            </div>
          )}
          {immunities.length > 0 && (
            <div className="text-gray-400">
              <ShieldCheck className="w-3 h-3 inline mr-1" />
              Immune to {immunities.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AttackRollVisualization: React.FC<AttackRollVisualizationProps> = ({
  attackerName,
  targetName,
  weapon,
  attackResult,
}) => {
  const { resolution, damage, targetReducedHp, totalDamageDealt } = attackResult;
  const { hit, roll, acHit, criticalHit, criticalFail, advantage, disadvantage } = resolution;

  const weaponName = weapon?.name || 'unarmed strike';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Attack Resolution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attack Summary */}
        <div className="text-center">
          <h3 className="font-bold text-lg">
            {attackerName} attacks {targetName} with {weaponName}
          </h3>
          <p className="text-sm text-muted-foreground">Target AC: {acHit}</p>
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

        {/* Roll Visualization */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Roll Result</h4>

          {/* Dice Visualization */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  criticalHit
                    ? 'text-green-600'
                    : criticalFail
                      ? 'text-red-600'
                      : hit
                        ? 'text-blue-600'
                        : 'text-gray-600'
                }`}
              >
                {roll.naturalRoll}
              </div>
              <div className="text-xs text-muted-foreground">Natural Roll</div>
            </div>

            <div className="text-2xl">+</div>

            <div className="text-center">
              <div className="text-2xl font-bold">
                {(roll.modifier > 0 ? '+' : '') + roll.modifier}
              </div>
              <div className="text-xs text-muted-foreground">Modifier</div>
            </div>

            <div className="text-2xl">=</div>

            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  criticalHit
                    ? 'text-green-600'
                    : criticalFail
                      ? 'text-red-600'
                      : hit
                        ? 'text-blue-600'
                        : 'text-gray-600'
                }`}
              >
                {roll.total}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Result Indicator */}
          <div className="text-center">
            {criticalHit ? (
              <Badge variant="default" className="text-lg py-2 px-4">
                <ShieldAlert className="w-5 h-5 mr-2" />
                CRITICAL HIT! Automatic Hit
              </Badge>
            ) : criticalFail ? (
              <Badge variant="destructive" className="text-lg py-2 px-4">
                <ShieldCheck className="w-5 h-5 mr-2" />
                CRITICAL MISS! Automatic Miss
              </Badge>
            ) : hit ? (
              <Badge variant="default" className="text-lg py-2 px-4">
                <ShieldCheck className="w-5 h-5 mr-2" />
                HIT! ({roll.total} ≥ {acHit})
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-lg py-2 px-4">
                <ShieldAlert className="w-5 h-5 mr-2" />
                MISS! ({roll.total} &lt; {acHit})
              </Badge>
            )}
          </div>

          {/* HP Result */}
          {targetReducedHp !== undefined &&
            totalDamageDealt !== undefined &&
            totalDamageDealt > 0 && (
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-sm font-medium text-blue-900">
                  Target HP reduced to {targetReducedHp}
                  {totalDamageDealt > 0 ? <> ({totalDamageDealt} damage dealt)</> : null}
                </div>
              </div>
            )}
        </div>

        {/* Damage Display */}
        {damage && (
          <DamageDisplay
            damageRolls={damage.rolls}
            totalDamage={damage.totalAfterResistance}
            damageType={damage.damageType}
            resistances={damage.resistances}
            vulnerabilities={damage.vulnerabilities}
            immunities={damage.immunities}
          />
        )}

        {/* Miss Message */}
        {!damage && hit && (
          <div className="text-center text-gray-500 text-sm">
            Attack hit but no damage was dealt
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttackRollVisualization;
