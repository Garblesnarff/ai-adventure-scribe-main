import { Heart, Dice1, TrendingUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';

/**
 * HitPointsSelection component for determining maximum hit points
 * Allows rolling hit dice or taking the average value
 */
const HitPointsSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;
  const characterClass = character?.class;
  const level = character?.level || 1;
  const conModifier = character?.abilityScores?.constitution?.modifier || 0;

  const [method, setMethod] = useState<'roll' | 'average'>('average');
  const [rollResults, setRollResults] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  // Note: No early returns before hooks to satisfy rules-of-hooks

  const hitDie = characterClass?.hitDie ?? 0;
  const averagePerLevel = Math.floor(hitDie / 2) + 1;

  /**
   * Calculate maximum hit points based on method
   */
  const calculateHitPoints = (useRolls: boolean = false): number => {
    if (level === 1) {
      // First level always gets max hit die + con modifier
      return hitDie + conModifier;
    }

    const firstLevelHP = hitDie + conModifier;

    if (useRolls && rollResults.length >= level - 1) {
      // Use rolled values for subsequent levels
      const additionalHP = rollResults
        .slice(0, level - 1)
        .reduce((sum, roll) => sum + roll + conModifier, 0);
      return firstLevelHP + additionalHP;
    } else {
      // Use average values
      const additionalHP = (level - 1) * (averagePerLevel + conModifier);
      return firstLevelHP + additionalHP;
    }
  };

  /**
   * Roll a hit die
   */
  const rollHitDie = (): number => {
    return Math.floor(Math.random() * hitDie) + 1;
  };

  /**
   * Handle rolling hit dice for all levels beyond 1st
   */
  const handleRollHitDice = async () => {
    if (level === 1) {
      applyHitPoints();
      return;
    }

    setIsRolling(true);
    const newRolls: number[] = [];

    // Animate rolling each level
    for (let i = 0; i < level - 1; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const roll = rollHitDie();
      newRolls.push(roll);
      setRollResults([...newRolls]);
    }

    setIsRolling(false);

    toast({
      title: 'Hit Dice Rolled',
      description: `Rolled ${newRolls.join(', ')} on d${hitDie}s.`,
    });
  };

  /**
   * Apply hit points to character
   */
  const applyHitPoints = () => {
    const useRolls = method === 'roll';
    const maxHP = calculateHitPoints(useRolls);

    const hitPoints = {
      maximum: maxHP,
      current: maxHP,
      temporary: 0,
    };

    const hitDice = {
      total: level,
      remaining: level,
      type: `d${hitDie}`,
    };

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        hitPoints,
        hitDice,
      },
    });

    toast({
      title: 'Hit Points Set',
      description: `Maximum hit points: ${maxHP}`,
    });
  };

  // Auto-apply when method is average or when rolling is complete
  useEffect(() => {
    if (method === 'average') {
      applyHitPoints();
    } else if (method === 'roll' && rollResults.length >= Math.max(0, level - 1)) {
      applyHitPoints();
    }
  }, [method, rollResults, level]);

  const maxHPPreview = calculateHitPoints(method === 'roll');
  const hasRolls = rollResults.length >= Math.max(0, level - 1);

  return !characterClass ? (
    <div className="text-center space-y-4">
      <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
      <h2 className="text-2xl font-bold">Class Required</h2>
      <p className="text-muted-foreground">Please select a class first to determine hit points.</p>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Hit Points</h2>
        <p className="text-muted-foreground">Determine your character's maximum hit points</p>
      </div>

      {/* Hit Point Calculation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Hit Point Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Class:</span>
              <span>
                {characterClass.name} (d{hitDie})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Level:</span>
              <span>{level}</span>
            </div>
            <div className="flex justify-between">
              <span>Constitution Modifier:</span>
              <span>
                {conModifier >= 0 ? '+' : ''}
                {conModifier}
              </span>
            </div>
            <div className="flex justify-between">
              <span>1st Level HP:</span>
              <span>
                {hitDie} + {conModifier} = {hitDie + conModifier}
              </span>
            </div>
            {level > 1 && (
              <div className="flex justify-between">
                <span>Additional Levels:</span>
                <span>
                  {method === 'average'
                    ? `${level - 1} × (${averagePerLevel} + ${conModifier}) = ${(level - 1) * (averagePerLevel + conModifier)}`
                    : hasRolls
                      ? `${rollResults
                          .slice(0, level - 1)
                          .map((r) => `${r} + ${conModifier}`)
                          .join(
                            ' + ',
                          )} = ${rollResults.slice(0, level - 1).reduce((sum, roll) => sum + roll + conModifier, 0)}`
                      : 'Not rolled yet'}
                </span>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-semibold">
              <span>Maximum Hit Points:</span>
              <span className="text-red-600">{maxHPPreview}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method Selection */}
      {level > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Hit Point Method</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose how to determine hit points for levels beyond 1st
            </p>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={method}
              onValueChange={(value: 'roll' | 'average') => {
                setMethod(value);
                if (value === 'roll') {
                  setRollResults([]);
                }
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="average" id="average" />
                  <div className="flex-1">
                    <Label htmlFor="average" className="flex items-center gap-2 cursor-pointer">
                      <TrendingUp className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Take Average</div>
                        <div className="text-sm text-muted-foreground">
                          Reliable: {averagePerLevel} + Con modifier per level
                        </div>
                      </div>
                    </Label>
                  </div>
                  <Badge variant="secondary">Consistent</Badge>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="roll" id="roll" />
                  <div className="flex-1">
                    <Label htmlFor="roll" className="flex items-center gap-2 cursor-pointer">
                      <Dice1 className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Roll Hit Dice</div>
                        <div className="text-sm text-muted-foreground">
                          Risky: Roll d{hitDie} + Con modifier per level
                        </div>
                      </div>
                    </Label>
                  </div>
                  <Badge variant="outline">Variable</Badge>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Rolling Interface */}
      {method === 'roll' && level > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice1 className="w-5 h-5" />
              Roll Hit Dice
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Roll a d{hitDie} for each level beyond 1st
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Roll Results */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: level - 1 }, (_, i) => {
                  const roll = rollResults[i];
                  const isRolled = roll !== undefined;
                  const isCurrentlyRolling = isRolling && i === rollResults.length;

                  return (
                    <div
                      key={i}
                      className={`p-3 border rounded text-center ${
                        isRolled
                          ? 'border-primary bg-primary/10'
                          : isCurrentlyRolling
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 animate-pulse'
                            : 'border-muted'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">Level {i + 2}</div>
                      <div className="text-lg font-semibold">
                        {isCurrentlyRolling ? '🎲' : isRolled ? roll : '?'}
                      </div>
                      {isRolled && (
                        <div className="text-xs text-muted-foreground">+{conModifier} Con</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Roll Button */}
              <div className="flex justify-center">
                <Button onClick={handleRollHitDice} disabled={isRolling || hasRolls} size="lg">
                  {isRolling ? (
                    <>Rolling... 🎲</>
                  ) : hasRolls ? (
                    'Rolls Complete'
                  ) : (
                    `Roll ${level - 1} Hit Dice`
                  )}
                </Button>
              </div>

              {/* Reroll Option */}
              {hasRolls && !isRolling && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRollResults([]);
                      toast({
                        title: 'Rolls Reset',
                        description: 'You can now roll hit dice again.',
                      });
                    }}
                  >
                    Reroll All Dice
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final HP Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Final Hit Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">{maxHPPreview}</div>
            <div className="text-sm text-muted-foreground">Maximum Hit Points</div>
            <div className="text-xs text-muted-foreground mt-1">
              Hit Dice: {level}d{hitDie}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Apply Button (fallback) */}
      <div className="flex justify-center">
        <Button onClick={applyHitPoints} className="mt-4">
          Confirm Hit Points
        </Button>
      </div>
    </div>
  );
};

export default HitPointsSelection;
