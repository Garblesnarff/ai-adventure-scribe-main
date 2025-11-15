import React from 'react';

import AbilityScoreCard from './AbilityScoreCard';

import type { AbilityScores } from '@/types/character';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { usePointBuy } from '@/hooks/usePointBuy';
import { calculateModifier } from '@/utils/abilityScoreUtils';
import { generateAbilityScores } from '@/utils/diceRolls';

/**
 * Component for handling ability score selection in character creation
 * Implements both point-buy system and 4d6 drop lowest rolling
 */
const AbilityScoresSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [method, setMethod] = React.useState<'pointBuy' | 'roll'>('pointBuy');
  const { remainingPoints, handleScoreChange } = usePointBuy();

  // Array of ability score types for iteration
  const abilities: (keyof AbilityScores)[] = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ];

  /**
   * Handles rolling new ability scores using 4d6 drop lowest method
   * Updates character state with new scores and displays toast notification
   */
  const handleRollScores = () => {
    const rolledScores = generateAbilityScores();
    const newScores = { ...state.character?.abilityScores };

    abilities.forEach((ability, index) => {
      newScores[ability] = {
        score: rolledScores[index],
        modifier: calculateModifier(rolledScores[index]),
        savingThrow: state.character?.abilityScores[ability].savingThrow || false,
      };
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { abilityScores: newScores },
    });

    toast({
      title: 'Ability Scores Rolled!',
      description: 'New scores have been generated using 4d6 drop lowest.',
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Assign Ability Scores</h2>

      <Tabs
        defaultValue="pointBuy"
        className="w-full"
        onValueChange={(value) => setMethod(value as 'pointBuy' | 'roll')}
      >
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
          <AbilityScoreCard
            key={ability}
            ability={ability}
            score={state.character?.abilityScores[ability].score || 8}
            modifier={state.character?.abilityScores[ability].modifier || -1}
            remainingPoints={remainingPoints}
            onScoreChange={handleScoreChange}
            isRollMode={method === 'roll'}
          />
        ))}
      </div>
    </div>
  );
};

export default AbilityScoresSelection;
