import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { races } from '@/data/raceOptions';
import { CharacterRace } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';
import { Check, Users, Zap, Globe } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Race</h2>
        <p className="text-muted-foreground">
          Your race determines ability score bonuses, traits, and cultural background
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {races.map((race) => {
          const isSelected = state.character?.race?.id === race.id;
          
          return (
            <Card 
              key={race.id}
              className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
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
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-2xl font-bold">{race.name}</h3>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{race.description}</p>
                
                {/* Ability Score Increases */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <h4 className="font-semibold">Ability Score Increases</h4>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(race.abilityScoreIncrease).map(([ability, bonus]) => (
                      <Badge key={ability} variant="secondary" className="capitalize">
                        {ability.substring(0, 3)} +{bonus}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Speed */}
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Speed:</span> {race.speed} feet
                  </p>
                </div>
                
                {/* Languages */}
                {race.languages.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold">Languages</h4>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {race.languages.map((language, index) => (
                        <Badge key={index} variant="outline">{language}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Racial Traits */}
                <div>
                  <h4 className="font-semibold mb-2">Racial Traits</h4>
                  <div className="space-y-1">
                    {race.traits.map((trait, index) => (
                      <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                        <span className="font-medium">{trait.split(':')[0]}:</span>
                        <span className="text-muted-foreground ml-1">
                          {trait.split(':')[1] || trait}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Selected Race Summary */}
      {state.character?.race && (
        <Card className="p-4 bg-primary/5">
          <h3 className="font-semibold mb-2">Selected Race: {state.character.race.name}</h3>
          <p className="text-sm text-muted-foreground">
            You'll gain the racial traits and ability score bonuses shown above when you complete character creation.
          </p>
        </Card>
      )}
    </div>
  );
};

export default RaceSelection;