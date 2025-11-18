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
import { useSystemProvider } from '@/hooks/useSystemProvider';
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
 * Supports different systems: D&D 5E (6 abilities), Cairn (3 abilities), OSE (6 abilities)
 * Adapts generation methods and modifier display based on system
 */
const AbilityScoresSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const provider = useSystemProvider();

  // Get system-specific ability configuration
  const systemAbilities = provider.config.abilityScores.scores;
  const modifierFormula = provider.config.abilityScores.modifierFormula;
  const scoreRange = provider.config.abilityScores.scoreRange;
  const systemName = provider.config.shortName;

  // Determine available methods based on system
  const availableMethods = useMemo(() => {
    const features = provider.getSystemFeatures();
    if (modifierFormula === 'cairn') {
      // Cairn only supports rolling (3d6, swap any two)
      return ['roll'] as const;
    }
    if (modifierFormula === 'ose') {
      // OSE supports rolling (3d6 in order) or standard array
      return ['standardArray', 'roll'] as const;
    }
    // D&D 5E supports all methods
    return ['pointBuy', 'standardArray', 'roll'] as const;
  }, [modifierFormula, provider]);

  const [method, setMethod] = React.useState<'pointBuy' | 'standardArray' | 'roll'>(
    availableMethods[0] as 'pointBuy' | 'standardArray' | 'roll'
  );
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
          modifier: calculateAbilityModifier(currentScore + 1),
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
          modifier: calculateAbilityModifier(currentScore - 1),
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
        modifier: calculateAbilityModifier(rollResult.scores[index]),
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
        modifier: calculateAbilityModifier(updatedResult.scores[index]),
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
   * Applies the standard array to ability scores (system-aware)
   */
  const handleStandardArray = () => {
    // Get standard array from system features or use default
    const features = provider.getSystemFeatures();
    const standardArray = features.standardArray || [15, 14, 13, 12, 10, 8];

    // For Cairn (3 abilities), use first 3 values
    const arrayToUse = standardArray.slice(0, abilities.length);

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
        score: arrayToUse[index],
        modifier: calculateAbilityModifier(arrayToUse[index]),
        savingThrow: state.character?.abilityScores?.[ability]?.savingThrow || false,
      };
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    toast({
      title: 'Standard Array Applied!',
      description: `Scores set to: ${arrayToUse.join(', ')}`,
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
        modifier: calculateAbilityModifier(8),
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

  // Map system ability IDs to character state keys
  const abilityIdToStateKey: Record<string, keyof AbilityScores> = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma',
    wil: 'wisdom', // Cairn's WIL maps to wisdom slot
  };

  // Generate dynamic abilities list from system config
  const abilities: (keyof AbilityScores)[] = useMemo(() => {
    return systemAbilities.map((ability) => abilityIdToStateKey[ability.id] || 'strength');
  }, [systemAbilities]);

  const getAbilityName = (abilityKey: keyof AbilityScores): string => {
    const ability = systemAbilities.find((a) => abilityIdToStateKey[a.id] === abilityKey);
    return ability?.name || abilityKey;
  };

  const getAbilityAbbreviation = (abilityKey: keyof AbilityScores): string => {
    const ability = systemAbilities.find((a) => abilityIdToStateKey[a.id] === abilityKey);
    return ability?.abbreviation || abilityKey.substring(0, 3).toUpperCase();
  };

  const getAbilityDescription = (abilityKey: keyof AbilityScores): string => {
    const ability = systemAbilities.find((a) => abilityIdToStateKey[a.id] === abilityKey);
    return ability?.description || '';
  };

  // Calculate modifier using system-specific formula
  const calculateAbilityModifier = (score: number): number => {
    return provider.calculateAbilityModifier(score);
  };

  // Check if system shows modifiers (Cairn doesn't use modifiers)
  const showModifiers = modifierFormula !== 'cairn';

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
    // Cap at maximum score from system config
    return Math.min(baseScore + totalRacialBonus, scoreRange.max);
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

  // Validate standard array: must use exactly the expected array for the system
  const standardArrayValid = useMemo(() => {
    if (method !== 'standardArray') return true;
    const features = provider.getSystemFeatures();
    const standardArray = features.standardArray || [15, 14, 13, 12, 10, 8];
    const expectedArray = standardArray.slice(0, abilities.length).sort((a, b) => b - a);
    const usedScores = abilities
      .map((ability) => state.character?.abilityScores?.[ability]?.score || 8)
      .sort((a, b) => b - a);
    return JSON.stringify(usedScores) === JSON.stringify(expectedArray);
  }, [method, state.character?.abilityScores, abilities.length, provider]);

  // Calculate total modifier bonus
  const totalModifier = abilities.reduce((total, ability) => {
    return total + (state.character?.abilityScores[ability].modifier || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Assign Ability Scores</h2>
        <p className="text-muted-foreground">
          {modifierFormula === 'cairn'
            ? 'Roll 3d6 for each ability score. You may swap any two scores.'
            : modifierFormula === 'ose'
              ? 'Choose your method for generating ability scores (3d6 in order or standard array)'
              : 'Choose your method for generating ability scores'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          System: {systemName} ({systemAbilities.length} abilities)
        </p>
      </div>

      <Tabs
        defaultValue={availableMethods[0]}
        className="w-full"
        onValueChange={(value) => setMethod(value as 'pointBuy' | 'standardArray' | 'roll')}
      >
        <TabsList className={`grid w-full grid-cols-${availableMethods.length}`}>
          {availableMethods.includes('pointBuy') && (
            <TabsTrigger value="pointBuy">Point Buy</TabsTrigger>
          )}
          {availableMethods.includes('standardArray') && (
            <TabsTrigger value="standardArray">Standard Array</TabsTrigger>
          )}
          {availableMethods.includes('roll') && (
            <TabsTrigger value="roll">Roll Scores</TabsTrigger>
          )}
        </TabsList>

        {availableMethods.includes('pointBuy') && (
          <TabsContent value="pointBuy" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-info" />
                <h3 className="font-semibold">Point Buy System</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Distribute 27 points among your abilities. Scores range from 8-15, with higher
                scores costing more points.
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
        )}

        {availableMethods.includes('standardArray') && (
          <TabsContent value="standardArray" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-success" />
                <h3 className="font-semibold">Standard Array</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {modifierFormula === 'ose'
                  ? 'Use the standard OSE ability scores: 15, 14, 13, 12, 10, 8. Balanced and predictable.'
                  : 'Use the standard D&D ability scores: 15, 14, 13, 12, 10, 8. Balanced and predictable.'}
              </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(() => {
                  const features = provider.getSystemFeatures();
                  const standardArray = features.standardArray || [15, 14, 13, 12, 10, 8];
                  const arrayToShow = standardArray.slice(0, abilities.length);
                  return arrayToShow.map((score, i) => (
                    <Badge key={i} variant="secondary">
                      {score}
                    </Badge>
                  ));
                })()}
              </div>
              <Button onClick={handleStandardArray} variant="default">
                Apply Standard Array
              </Button>
            </div>
          </Card>
        </TabsContent>
        )}

        {availableMethods.includes('roll') && (
          <TabsContent value="roll" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-warning" />
                <h3 className="font-semibold">
                  {modifierFormula === 'cairn'
                    ? 'Roll 3d6 for Each Ability'
                    : modifierFormula === 'ose'
                      ? 'Roll 3d6 in Order'
                      : 'Roll 4d6 Drop Lowest'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {modifierFormula === 'cairn'
                  ? 'Roll three six-sided dice for each ability. You may swap any two ability scores after rolling.'
                  : modifierFormula === 'ose'
                    ? 'Roll three six-sided dice for each ability in order (STR, DEX, CON, INT, WIS, CHA). Classic old-school method.'
                    : 'Roll four six-sided dice, drop the lowest, for each ability. More random and potentially powerful.'}
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
        )}
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
            Standard Array must use exactly: {(() => {
              const features = provider.getSystemFeatures();
              const standardArray = features.standardArray || [15, 14, 13, 12, 10, 8];
              return standardArray.slice(0, abilities.length).join(', ');
            })()} (each value once).
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
      <div className={`grid grid-cols-1 md:grid-cols-2 ${systemAbilities.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-4`}>
        {abilities.map((ability) => {
          const baseScore = state.character?.abilityScores?.[ability]?.score || 8;
          const racialBonus = getTotalRacialBonus(ability as AbilityScoreName, racialBonuses);
          const finalScore = getFinalScore(ability);
          const modifier = calculateAbilityModifier(finalScore);
          const nextCost =
            method === 'pointBuy' ? pointCost[baseScore + 1] - pointCost[baseScore] : 0;

          return (
            <Card key={ability} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="text-lg font-bold">{getAbilityName(ability)}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {getAbilityAbbreviation(ability)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{getAbilityDescription(ability)}</p>
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
                    {showModifiers && (
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
                    )}
                    {!showModifiers && (
                      <div className="text-xs text-muted-foreground">
                        Roll under {finalScore}
                      </div>
                    )}
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
              {showModifiers ? (
                <>
                  Total modifier bonus: {totalModifier >= 0 ? '+' : ''}
                  {totalModifier}
                </>
              ) : (
                <>Cairn uses roll-under saves (no modifiers)</>
              )}
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
