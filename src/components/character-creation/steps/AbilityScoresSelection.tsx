import { Info, RotateCcw, Shuffle, AlertTriangle } from 'lucide-react';
import React, { useMemo } from 'react';

import type { AbilityScores } from '@/types/character';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { calculateModifier } from '@/utils/abilityScoreUtils';
import {
  generateAbilityScores,
  generateAbilityScoresDetailed,
  rerollSingleScoreDetailed,
  type Roll4d6Result,
  type AbilityScoreRollResult,
} from '@/utils/diceRolls';
import {
  calculateRacialBonuses,
  getTotalRacialBonus,
  formatRacialBonus,
  type AbilityScoreName,
} from '@/utils/racialAbilityBonuses';

/**
 * Component for handling ability score selection in character creation
 * Implements point-buy system, standard array, and 4d6 drop lowest rolling
 */
const AbilityScoresSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [method, setMethod] = React.useState<'pointBuy' | 'standardArray' | 'roll'>('pointBuy');
  const [rollHistory, setRollHistory] = React.useState<number[][]>([]);
  const [currentRollDetails, setCurrentRollDetails] = React.useState<AbilityScoreRollResult | null>(
    null,
  );

  // Initialize remaining points from context or default value
  const [remainingPoints, setRemainingPoints] = React.useState(() => {
    return state.character?.remainingAbilityPoints ?? 27;
  });

  React.useEffect(() => {
    // Update context with remaining points whenever they change
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { remainingAbilityPoints: remainingPoints },
    });
  }, [remainingPoints, dispatch]);

  // Cost table for point-buy system
  const pointCost: { [key: number]: number } = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };

  /**
   * Handles increasing an ability score if points are available
   */
  const handleIncreaseScore = (ability: keyof AbilityScores) => {
    const currentScore = state.character?.abilityScores?.[ability]?.score || 8;
    if (
      currentScore < 15 &&
      remainingPoints >= pointCost[currentScore + 1] - pointCost[currentScore]
    ) {
      const newScores: AbilityScores = {
        strength: { score: 8, modifier: -1, savingThrow: false },
        dexterity: { score: 8, modifier: -1, savingThrow: false },
        constitution: { score: 8, modifier: -1, savingThrow: false },
        intelligence: { score: 8, modifier: -1, savingThrow: false },
        wisdom: { score: 8, modifier: -1, savingThrow: false },
        charisma: { score: 8, modifier: -1, savingThrow: false },
        ...state.character?.abilityScores,
        [ability]: {
          score: currentScore + 1,
          modifier: calculateModifier(currentScore + 1),
          savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
        },
      };

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { abilityScores: newScores },
      });

      setRemainingPoints((prev) => prev - (pointCost[currentScore + 1] - pointCost[currentScore]));
    }
  };

  /**
   * Handles decreasing an ability score and refunding points
   */
  const handleDecreaseScore = (ability: keyof AbilityScores) => {
    const currentScore = state.character?.abilityScores?.[ability]?.score || 8;
    if (currentScore > 8) {
      const newScores: AbilityScores = {
        strength: { score: 8, modifier: -1, savingThrow: false },
        dexterity: { score: 8, modifier: -1, savingThrow: false },
        constitution: { score: 8, modifier: -1, savingThrow: false },
        intelligence: { score: 8, modifier: -1, savingThrow: false },
        wisdom: { score: 8, modifier: -1, savingThrow: false },
        charisma: { score: 8, modifier: -1, savingThrow: false },
        ...state.character?.abilityScores,
        [ability]: {
          score: currentScore - 1,
          modifier: calculateModifier(currentScore - 1),
          savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
        },
      };

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { abilityScores: newScores },
      });

      setRemainingPoints((prev) => prev + (pointCost[currentScore] - pointCost[currentScore - 1]));
    }
  };

  /**
   * Handles rolling new ability scores with detailed results
   */
  const handleRollScores = () => {
    const rollResult = generateAbilityScoresDetailed();
    const newScores: AbilityScores = {
      strength: { score: 8, modifier: -1, savingThrow: false },
      dexterity: { score: 8, modifier: -1, savingThrow: false },
      constitution: { score: 8, modifier: -1, savingThrow: false },
      intelligence: { score: 8, modifier: -1, savingThrow: false },
      wisdom: { score: 8, modifier: -1, savingThrow: false },
      charisma: { score: 8, modifier: -1, savingThrow: false },
      ...state.character?.abilityScores,
    };

    abilities.forEach((ability, index) => {
      newScores[ability] = {
        score: rollResult.scores[index],
        modifier: calculateModifier(rollResult.scores[index]),
        savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
      };
    });

    setRollHistory((prev) => [...prev, rollResult.scores]);
    setCurrentRollDetails(rollResult);

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    toast({
      title: 'Ability Scores Rolled!',
      description: 'New scores have been generated using 4d6 drop lowest.',
    });
  };

  /**
   * Handles rerolling a single ability score
   */
  const handleRerollSingleScore = (abilityIndex: number) => {
    if (!currentRollDetails) return;

    const currentScores = abilities.map(
      (ability) => state.character?.abilityScores?.[ability]?.score || 8,
    );
    const updatedResult = rerollSingleScoreDetailed(
      currentScores,
      currentRollDetails.details,
      abilityIndex,
    );

    const newScores: AbilityScores = {
      strength: { score: 8, modifier: -1, savingThrow: false },
      dexterity: { score: 8, modifier: -1, savingThrow: false },
      constitution: { score: 8, modifier: -1, savingThrow: false },
      intelligence: { score: 8, modifier: -1, savingThrow: false },
      wisdom: { score: 8, modifier: -1, savingThrow: false },
      charisma: { score: 8, modifier: -1, savingThrow: false },
      ...state.character?.abilityScores,
    };

    abilities.forEach((ability, index) => {
      newScores[ability] = {
        score: updatedResult.scores[index],
        modifier: calculateModifier(updatedResult.scores[index]),
        savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
      };
    });

    setCurrentRollDetails(updatedResult);

    // Update roll history with the new scores
    const newHistory = [...rollHistory];
    if (newHistory.length > 0) {
      newHistory[newHistory.length - 1] = updatedResult.scores;
      setRollHistory(newHistory);
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    toast({
      title: 'Score Rerolled!',
      description: `${abilities[abilityIndex]} has been rerolled.`,
    });
  };

  /**
   * Applies the standard array to ability scores
   */
  const handleStandardArray = () => {
    const standardArray = [15, 14, 13, 12, 10, 8];
    const newScores: AbilityScores = {
      strength: { score: 8, modifier: -1, savingThrow: false },
      dexterity: { score: 8, modifier: -1, savingThrow: false },
      constitution: { score: 8, modifier: -1, savingThrow: false },
      intelligence: { score: 8, modifier: -1, savingThrow: false },
      wisdom: { score: 8, modifier: -1, savingThrow: false },
      charisma: { score: 8, modifier: -1, savingThrow: false },
      ...state.character?.abilityScores,
    };

    abilities.forEach((ability, index) => {
      newScores[ability] = {
        score: standardArray[index],
        modifier: calculateModifier(standardArray[index]),
        savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
      };
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    toast({
      title: 'Standard Array Applied!',
      description: 'Scores set to: 15, 14, 13, 12, 10, 8',
    });
  };

  /**
   * Resets all ability scores to 8
   */
  const handleReset = () => {
    const newScores: AbilityScores = {
      strength: { score: 8, modifier: -1, savingThrow: false },
      dexterity: { score: 8, modifier: -1, savingThrow: false },
      constitution: { score: 8, modifier: -1, savingThrow: false },
      intelligence: { score: 8, modifier: -1, savingThrow: false },
      wisdom: { score: 8, modifier: -1, savingThrow: false },
      charisma: { score: 8, modifier: -1, savingThrow: false },
      ...state.character?.abilityScores,
    };

    abilities.forEach((ability) => {
      newScores[ability] = {
        score: 8,
        modifier: calculateModifier(8),
        savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
      };
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    setRemainingPoints(27);
    setRollHistory([]);
  };

  const abilities: (keyof AbilityScores)[] = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ];

  const getAbilityDescription = (ability: keyof AbilityScores) => {
    const descriptions = {
      strength: 'Physical power, athletic ability, melee attacks',
      dexterity: 'Agility, reflexes, ranged attacks, AC, initiative',
      constitution: 'Health, stamina, hit points, concentration',
      intelligence: 'Reasoning, memory, arcane magic, investigation',
      wisdom: 'Awareness, insight, divine magic, perception',
      charisma: 'Force of personality, leadership, social skills',
    };
    return descriptions[ability];
  };

  // Calculate racial bonuses (useMemo to avoid recalculation)
  const racialBonuses = useMemo(
    () =>
      calculateRacialBonuses(
        state.character?.race || null,
        state.character?.subrace || null,
        state.character?.racialAbilityChoices,
      ),
    [state.character?.race, state.character?.subrace, state.character?.racialAbilityChoices],
  );

  // Calculate final scores with racial bonuses applied
  const getFinalScore = (ability: keyof AbilityScores): number => {
    const baseScore = state.character?.abilityScores?.[ability]?.score || 8;
    const totalRacialBonus = getTotalRacialBonus(ability as AbilityScoreName, racialBonuses);
    // Cap at 20 per D&D 5E rules
    return Math.min(baseScore + totalRacialBonus, 20);
  };

  // Validate point buy: 27 points total
  const pointsUsed = useMemo(() => {
    if (method !== 'pointBuy') return 0;
    return abilities.reduce((total, ability) => {
      const score = state.character?.abilityScores?.[ability]?.score || 8;
      return total + (pointCost[score] || 0);
    }, 0);
  }, [method, state.character?.abilityScores]);

  const pointBuyValid = method !== 'pointBuy' || pointsUsed <= 27;

  // Validate standard array: must use exactly [15,14,13,12,10,8]
  const standardArrayValid = useMemo(() => {
    if (method !== 'standardArray') return true;
    const usedScores = abilities
      .map((ability) => state.character?.abilityScores?.[ability]?.score || 8)
      .sort((a, b) => b - a);
    const expectedArray = [15, 14, 13, 12, 10, 8];
    return JSON.stringify(usedScores) === JSON.stringify(expectedArray);
  }, [method, state.character?.abilityScores]);

  // Calculate total modifier bonus
  const totalModifier = abilities.reduce((total, ability) => {
    return total + (state.character?.abilityScores[ability].modifier || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Assign Ability Scores</h2>
        <p className="text-muted-foreground">Choose your method for generating ability scores</p>
      </div>

      <Tabs
        defaultValue="pointBuy"
        className="w-full"
        onValueChange={(value) => setMethod(value as 'pointBuy' | 'standardArray' | 'roll')}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pointBuy">Point Buy</TabsTrigger>
          <TabsTrigger value="standardArray">Standard Array</TabsTrigger>
          <TabsTrigger value="roll">Roll Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="pointBuy" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-info" />
              <h3 className="font-semibold">Point Buy System</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Distribute 27 points among your abilities. Scores range from 8-15, with higher scores
              costing more points.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-lg">
                Points Remaining: <Badge variant="outline">{remainingPoints}</Badge>
              </div>
              <Button onClick={handleReset} variant="ghost" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="standardArray" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-success" />
              <h3 className="font-semibold">Standard Array</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Use the standard D&D ability scores: 15, 14, 13, 12, 10, 8. Balanced and predictable.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {[15, 14, 13, 12, 10, 8].map((score, i) => (
                  <Badge key={i} variant="secondary">
                    {score}
                  </Badge>
                ))}
              </div>
              <Button onClick={handleStandardArray} variant="default">
                Apply Standard Array
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="roll" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-warning" />
              <h3 className="font-semibold">Roll 4d6 Drop Lowest</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Roll four six-sided dice, drop the lowest, for each ability. More random and
              potentially powerful.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button onClick={handleRollScores} variant="default">
                  <Shuffle className="w-4 h-4 mr-1" />
                  Roll New Scores
                </Button>
                <DiceRoller dice="4d6" label="Example Roll" />
              </div>
              <Button onClick={handleReset} variant="ghost" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            {/* Enhanced Roll Details Display */}
            {currentRollDetails && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Current Roll Details:</p>
                  <Badge variant="outline" className="text-xs">
                    {currentRollDetails.timestamp.toLocaleTimeString()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {abilities.map((ability, index) => {
                    const detail = currentRollDetails.details[index];
                    return (
                      <div key={ability} className="text-xs p-2 bg-muted/50 rounded border">
                        <div className="font-medium capitalize mb-1">{ability}</div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-muted-foreground">Rolls:</span>
                          <div className="flex gap-0.5">
                            {detail.rolls.map((roll, i) => (
                              <Badge
                                key={i}
                                variant={roll === detail.dropped ? 'destructive' : 'secondary'}
                                className="text-xs px-1 py-0 min-w-[1.5rem] h-5"
                              >
                                {roll}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <Badge variant="outline">{detail.total}</Badge>
                        </div>
                        <Button
                          onClick={() => handleRerollSingleScore(index)}
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1 h-6 text-xs"
                        >
                          Reroll
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rollHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2">Recent Rolls:</p>
                <div className="space-y-1">
                  {rollHistory.slice(-3).map((roll, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      Roll {rollHistory.length - 2 + i}: {roll.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Alerts */}
      {!pointBuyValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have exceeded your point budget! You have used {pointsUsed} points (maximum 27).
          </AlertDescription>
        </Alert>
      )}

      {!standardArrayValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Standard Array must use exactly: 15, 14, 13, 12, 10, 8 (each value once).
          </AlertDescription>
        </Alert>
      )}

      {/* Racial Bonus Info */}
      {racialBonuses.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your {state.character?.race?.name} grants racial ability bonuses that will be added to
            your base scores.
          </AlertDescription>
        </Alert>
      )}

      {/* Ability Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {abilities.map((ability) => {
          const baseScore = state.character?.abilityScores?.[ability]?.score || 8;
          const racialBonus = getTotalRacialBonus(ability as AbilityScoreName, racialBonuses);
          const finalScore = getFinalScore(ability);
          const modifier = calculateModifier(finalScore);
          const nextCost =
            method === 'pointBuy' ? pointCost[baseScore + 1] - pointCost[baseScore] : 0;

          return (
            <Card key={ability} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="text-lg font-bold capitalize">{ability}</h3>
                  <p className="text-xs text-muted-foreground">{getAbilityDescription(ability)}</p>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecreaseScore(ability)}
                    disabled={method !== 'pointBuy' || baseScore === 8}
                    className="w-8 h-8 p-0"
                  >
                    -
                  </Button>

                  <div className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">Base: {baseScore}</div>
                    {racialBonus > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300"
                      >
                        {formatRacialBonus(racialBonus)} racial
                      </Badge>
                    )}
                    <div className="text-3xl font-bold">{finalScore}</div>
                    <div
                      className={`text-sm font-medium ${
                        modifier > 0
                          ? 'text-green-600'
                          : modifier < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {modifier >= 0 ? '+' : ''}
                      {modifier}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncreaseScore(ability)}
                    disabled={
                      method !== 'pointBuy' || baseScore === 15 || remainingPoints < nextCost
                    }
                    className="w-8 h-8 p-0"
                  >
                    +
                  </Button>
                </div>

                {method === 'pointBuy' && baseScore < 15 && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      Next: {nextCost} point{nextCost !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Ability Score Summary</h3>
            <p className="text-sm text-muted-foreground">
              Total modifier bonus: {totalModifier >= 0 ? '+' : ''}
              {totalModifier}
            </p>
          </div>
          <div className="flex gap-4">
            {method === 'pointBuy' && (
              <Badge variant={remainingPoints === 0 ? 'default' : 'secondary'}>
                {remainingPoints} points left
              </Badge>
            )}
            <Badge variant="outline">
              {abilities.reduce(
                (total, ability) => total + (state.character?.abilityScores[ability].score || 8),
                0,
              )}{' '}
              total
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AbilityScoresSelection;
