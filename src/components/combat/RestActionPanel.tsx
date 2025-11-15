/**
 * Rest Action Panel Component
 *
 * Provides UI for taking short and long rests during combat with options for
 * hit dice selection and other rest-related choices.
 *
 * Dependencies:
 * - useCombat from '@/contexts/CombatContext'
 * - shadcn/ui components for UI
 *
 * Usage: Used within CombatActionPanel when 'short_rest' or 'long_rest' is selected
 *
 * @author AI Dungeon Master Team
 */

import { Coffee, Moon } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCombat } from '@/contexts/CombatContext';

// ===========================
// Props Interface
// ===========================
interface RestActionPanelProps {
  restType: 'short' | 'long';
  onRestSubmit: (hitDiceToRoll: number) => void;
  onCancel: () => void;
  className?: string;
}

// ===========================
// Main Component
// ===========================
const RestActionPanel: React.FC<RestActionPanelProps> = ({
  restType,
  onRestSubmit,
  onCancel,
  className = '',
}) => {
  const { state } = useCombat();
  const { activeEncounter } = state;

  const [hitDiceToRoll, setHitDiceToRoll] = useState<number>(1);

  if (!activeEncounter) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">
            {restType === 'short' ? 'Short Rest' : 'Long Rest'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No active combat encounter</p>
        </CardContent>
      </Card>
    );
  }

  const currentParticipant = activeEncounter.participants.find(
    (p) => p.id === activeEncounter.currentTurnParticipantId,
  );

  if (!currentParticipant) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">
            {restType === 'short' ? 'Short Rest' : 'Long Rest'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No active participant</p>
        </CardContent>
      </Card>
    );
  }

  const maxHitDice = currentParticipant.hitDice?.current || 0;

  const handleHitDiceChange = (value: string) => {
    const num = parseInt(value) || 0;
    setHitDiceToRoll(Math.max(0, Math.min(num, maxHitDice)));
  };

  const handleSubmit = () => {
    onRestSubmit(hitDiceToRoll);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          {restType === 'short' ? (
            <Coffee className="w-5 h-5 text-amber-600" />
          ) : (
            <Moon className="w-5 h-5 text-blue-600" />
          )}
          <CardTitle className="text-red-700">
            {restType === 'short' ? 'Short Rest' : 'Long Rest'}
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600">{currentParticipant.name}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {restType === 'short' && (
          <div className="space-y-2">
            <Label htmlFor="hitDice">Hit Dice to Roll</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="hitDice"
                type="number"
                min="0"
                max={maxHitDice}
                value={hitDiceToRoll}
                onChange={(e) => handleHitDiceChange(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-gray-500">/ {maxHitDice} available</span>
            </div>
            <p className="text-sm text-gray-500">
              Roll hit dice to recover hit points during short rest
            </p>
          </div>
        )}

        {restType === 'long' && (
          <div className="text-sm text-gray-600">
            <p>During a long rest, you will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Recover all hit points</li>
              <li>Recover all hit dice</li>
              <li>Restore all spell slots</li>
              <li>Reset class features</li>
              <li>Remove most conditions</li>
            </ul>
          </div>
        )}

        <div className="flex space-x-2 pt-4">
          <Button
            onClick={handleSubmit}
            className={
              restType === 'short'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            Take {restType === 'short' ? 'Short' : 'Long'} Rest
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestActionPanel;
