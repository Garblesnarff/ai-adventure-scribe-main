import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AbilityScores } from '@/types/character';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateAbilityScores } from '@/utils/diceRolls';
import { calculateModifier } from '@/utils/abilityScoreUtils';

/**
 * Component for handling ability score selection in character creation
 * Implements both point-buy system and 4d6 drop lowest rolling
 */
const AbilityScoresSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [method, setMethod] = React.useState<'pointBuy' | 'roll'>('pointBuy');
  
  // Initialize remaining points from context or default value
  const [remainingPoints, setRemainingPoints] = React.useState(() => {
    return state.character?.remainingAbilityPoints ?? 27;
  });

  React.useEffect(() => {
    // Update context with remaining points whenever they change
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { remainingAbilityPoints: remainingPoints }
    });
  }, [remainingPoints, dispatch]);

  // Cost table for point-buy system
  const pointCost: { [key: number]: number } = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
  };

  /**
   * Handles increasing an ability score if points are available
   */
  const handleIncreaseScore = (ability: keyof AbilityScores) => {
    const currentScore = state.character?.abilityScores[ability].score || 8;
    if (currentScore < 15 && remainingPoints >= (pointCost[currentScore + 1] - pointCost[currentScore])) {
      const newScores = {
        ...state.character?.abilityScores,
        [ability]: {
          score: currentScore + 1,
          modifier: calculateModifier(currentScore + 1),
          savingThrow: state.character?.abilityScores[ability].savingThrow || false
        }
      };
      
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { abilityScores: newScores }
      });
      
      setRemainingPoints(prev => prev - (pointCost[currentScore + 1] - pointCost[currentScore]));
    }
  };

  /**
   * Handles decreasing an ability score and refunding points
   */
  const handleDecreaseScore = (ability: keyof AbilityScores) => {
    const currentScore = state.character?.abilityScores[ability].score || 8;
    if (currentScore > 8) {
      const newScores = {
        ...state.character?.abilityScores,
        [ability]: {
          score: currentScore - 1,
          modifier: calculateModifier(currentScore - 1),
          savingThrow: state.character?.abilityScores[ability].savingThrow || false
        }
      };
      
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { abilityScores: newScores }
      });
      
      setRemainingPoints(prev => prev + (pointCost[currentScore] - pointCost[currentScore - 1]));
    }
  };

  /**
   * Handles rolling new ability scores
   */
  const handleRollScores = () => {
    const rolledScores = generateAbilityScores();
    const newScores = { ...state.character?.abilityScores };
    
    abilities.forEach((ability, index) => {
      newScores[ability] = {
        score: rolledScores[index],
        modifier: calculateModifier(rolledScores[index]),
        savingThrow: state.character?.abilityScores[ability].savingThrow || false
      };
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores }
    });

    toast({
      title: "Ability Scores Rolled!",
      description: "New scores have been generated using 4d6 drop lowest.",
    });
  };

  const abilities: (keyof AbilityScores)[] = [
    'strength', 'dexterity', 'constitution',
    'intelligence', 'wisdom', 'charisma'
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Assign Ability Scores</h2>
      
      <Tabs defaultValue="pointBuy" className="w-full" onValueChange={(value) => setMethod(value as 'pointBuy' | 'roll')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pointBuy">Point Buy</TabsTrigger>
          <TabsTrigger value="roll">Roll</TabsTrigger>
        </TabsList>

        <TabsContent value="pointBuy">
          <p className="text-center text-muted-foreground mb-4">
            Points Remaining: {remainingPoints}
          </p>
        </TabsContent>

        <TabsContent value="roll">
          <div className="text-center mb-4">
            <Button onClick={handleRollScores} variant="secondary">
              Roll New Scores
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {abilities.map((ability) => (
          <Card key={ability} className="p-4">
            <h3 className="text-xl font-semibold capitalize mb-2">{ability}</h3>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecreaseScore(ability)}
                disabled={method === 'roll' || state.character?.abilityScores[ability].score === 8}
              >
                -
              </Button>
              <span className="text-2xl font-bold">
                {state.character?.abilityScores[ability].score || 8}
                <span className="text-sm ml-2 text-muted-foreground">
                  ({state.character?.abilityScores[ability].modifier >= 0 ? '+' : ''}
                  {state.character?.abilityScores[ability].modifier})
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleIncreaseScore(ability)}
                disabled={
                  method === 'roll' ||
                  state.character?.abilityScores[ability].score === 15 ||
                  remainingPoints < (pointCost[(state.character?.abilityScores[ability].score || 8) + 1] - 
                                   pointCost[state.character?.abilityScores[ability].score || 8])
                }
              >
                +
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AbilityScoresSelection;