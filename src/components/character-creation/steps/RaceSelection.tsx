import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { baseRaces } from '@/data/raceOptions';
import { CharacterRace, Subrace } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { Check, Users, Zap, Globe } from 'lucide-react';

const RaceSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const [selectedBaseRace, setSelectedBaseRace] = useState<CharacterRace | null>(null);
  const [showSubraces, setShowSubraces] = useState(false);

  const handleBaseRaceSelect = (baseRace: CharacterRace) => {
    console.log('Selecting base race:', baseRace);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { race: baseRace, subrace: null }
    });
    setSelectedBaseRace(baseRace);
    if (baseRace.subraces && baseRace.subraces.length > 0) {
      setShowSubraces(true);
      toast({
        title: "Base Race Selected",
        description: `You have chosen ${baseRace.name}. Now select a subrace.`,
        duration: 1000,
      });
      // Auto-scroll to continue with subrace selection
      scrollToNavigation();
    } else {
      toast({
        title: "Race Selected",
        description: `You have chosen the ${baseRace.name} race.`,
        duration: 1000,
      });
      // Auto-scroll to navigation to proceed to next step
      scrollToNavigation();
    }
  };

  const handleSubraceSelect = (subrace: Subrace) => {
    console.log('Selecting subrace:', subrace);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { subrace }
    });
    setShowSubraces(false);
    toast({
      title: "Subrace Selected",
      description: `You have chosen ${subrace.name}.`,
      duration: 1000,
    });
    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Race</h2>
        <p className="text-muted-foreground">
          Your race determines ability score bonuses, traits, and cultural background
        </p>
      </div>
      
      <div className="space-y-6">
        {!showSubraces ? (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Choose Your Race</h2>
              <p className="text-muted-foreground">
                Your race determines ability score bonuses, traits, and cultural background
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {baseRaces.map((baseRace) => {
                const isSelected = state.character?.race?.id === baseRace.id;
                
                return (
                  <Card 
                    key={baseRace.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                      isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleBaseRaceSelect(baseRace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleBaseRaceSelect(baseRace);
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
                        <h3 className="text-2xl font-bold">{baseRace.name}</h3>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{baseRace.description}</p>
                      
                      {/* Ability Score Increases */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <h4 className="font-semibold">Ability Score Increases</h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                            <Badge key={ability} variant="secondary" className="capitalize">
                              {ability.substring(0, 3)} +{bonus}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Speed */}
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">Speed:</span> {baseRace.speed} feet
                        </p>
                      </div>
                      
                      {/* Languages */}
                      {baseRace.languages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <h4 className="font-semibold">Languages</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {baseRace.languages.map((language: string, index: number) => (
                              <Badge key={index} variant="outline">{language}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Racial Traits */}
                      <div>
                        <h4 className="font-semibold mb-2">Racial Traits</h4>
                        <div className="space-y-1">
                          {baseRace.traits.map((trait: string, index: number) => (
                            <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                              <span className="font-medium">{trait.split(':')[0]}:</span>
                              <span className="text-muted-foreground ml-1">
                                {trait.split(':')[1] || trait}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Subraces Indicator */}
                      {baseRace.subraces && baseRace.subraces.length > 0 && (
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          Has Subraces ({baseRace.subraces.length})
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Choose Your Subrace</h2>
              <p className="text-muted-foreground">
                Select a subrace for {selectedBaseRace?.name} to gain additional abilities
              </p>
              <Button 
                variant="outline" 
                onClick={() => { setShowSubraces(false); setSelectedBaseRace(null); }}
                className="mt-4"
              >
                Back to Base Races
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedBaseRace?.subraces?.map((subrace) => {
                const isSelected = state.character?.subrace?.id === subrace.id;
                
                return (
                  <Card 
                    key={subrace.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                      isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubraceSelect(subrace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSubraceSelect(subrace);
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
                        <h3 className="text-2xl font-bold">{subrace.name}</h3>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{subrace.description}</p>
                      
                      {/* Ability Score Increases */}
                      {Object.keys(subrace.abilityScoreIncrease).length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <h4 className="font-semibold">Subrace Ability Increases</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(subrace.abilityScoreIncrease).map(([ability, bonus]) => (
                              <Badge key={ability} variant="secondary" className="capitalize">
                                {ability.substring(0, 3)} +{bonus}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Speed Override */}
                      {subrace.speed && (
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Speed:</span> {subrace.speed} feet
                          </p>
                        </div>
                      )}
                      
                      {/* Subrace Traits */}
                      <div>
                        <h4 className="font-semibold mb-2">Subrace Traits</h4>
                        <div className="space-y-1">
                          {subrace.traits.map((trait: string, index: number) => (
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
          </>
        )}
      </div>
      
      {/* Selected Race/Subrace Summary */}
      {(state.character?.race || state.character?.subrace) && (
        <Card className="p-4 bg-primary/5">
          <h3 className="font-semibold mb-2">
            Selected: {state.character.subrace ? `${state.character.subrace.name} (${state.character.race?.name})` : state.character.race?.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            You'll gain the racial traits and ability score bonuses shown above when you complete character creation.
          </p>
        </Card>
      )}
    </div>
  );
};

export default RaceSelection;
