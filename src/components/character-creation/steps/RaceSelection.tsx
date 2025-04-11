import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card } from '@/components/ui/card';
import { races } from '@/data/raceOptions';
import { CharacterRace } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';

const RaceSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();

  const handleRaceSelect = (race: CharacterRace) => {
    console.log('Selecting race:', race);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { race }
    });
    
    toast({
      title: "Race Selected",
      description: `You have chosen the ${race.name} race.`,
      duration: 1000,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4">Choose Your Race</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => {
          const isSelected = state.character?.race?.id === race.id;
          console.log(`Race ${race.id} selected:`, isSelected);
          
          return (
            <Card 
              key={race.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                isSelected ? 'border-primary bg-accent/10' : 'border-transparent'
              }`}
              onClick={() => handleRaceSelect(race)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleRaceSelect(race);
                }
              }}
            >
              <h3 className="text-xl font-semibold mb-2">{race.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{race.description}</p>
              <div className="text-sm">
                <p className="font-medium">Traits:</p>
                <ul className="list-disc list-inside">
                  {race.traits.map((trait, index) => (
                    <li key={index}>{trait}</li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RaceSelection;