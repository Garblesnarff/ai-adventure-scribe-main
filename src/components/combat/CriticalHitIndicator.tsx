/**
 * Critical Hit Indicator Component
 *
 * Displays information about critical hits including additional damage
 * and special effects from class features.
 */

import { ShieldAlert, Zap, Sword, Sparkles } from 'lucide-react';
import React from 'react';

import type { DiceRoll } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ===========================
// Component Props
// ===========================

interface CriticalHitIndicatorProps {
  isCritical: boolean;
  criticalEffects: string[];
  additionalDamage?: DiceRoll;
  description: string;
}

// ===========================
// Critical Hit Indicator Component
// ===========================

const CriticalHitIndicator: React.FC<CriticalHitIndicatorProps> = ({
  isCritical,
  criticalEffects,
  additionalDamage,
  description,
}) => {
  if (!isCritical) {
    return null;
  }

  return (
    <Card className="w-full border-2 border-yellow-500 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700">
          <ShieldAlert className="w-5 h-5" />
          Critical Hit!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-yellow-800 font-medium">{description}</p>

        {/* Additional Damage */}
        {additionalDamage && (
          <div className="p-3 bg-yellow-100 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" />
              Additional Critical Damage
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-yellow-900">
                {additionalDamage.keptResults.join(' + ')}
                {additionalDamage.modifier !== 0 && (
                  <span>
                    {' '}
                    {additionalDamage.modifier > 0 ? '+' : ''}
                    {additionalDamage.modifier}
                  </span>
                )}
              </span>
              <Badge variant="default" className="bg-yellow-600">
                {additionalDamage.total} Damage
              </Badge>
            </div>
          </div>
        )}

        {/* Special Effects */}
        {criticalEffects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              Special Effects
            </h4>
            <div className="space-y-2">
              {criticalEffects.map((effect, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-yellow-100 rounded">
                  <Sword className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">{effect}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Hit Reminder */}
        <div className="text-xs text-yellow-700 italic">
          Critical hits double the number of damage dice rolled.
        </div>
      </CardContent>
    </Card>
  );
};

export default CriticalHitIndicator;
