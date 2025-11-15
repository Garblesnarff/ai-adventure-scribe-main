import { Check, Users, Zap, ArrowRight } from 'lucide-react';
import React from 'react';

import type { CharacterRace, Subrace } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import logger from '@/lib/logger';

/**
 * SubraceSelection component for choosing subraces when available
 * Only shown for races that have subrace options
 */
const SubraceSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const character = state.character;
  const currentRace = character?.race as CharacterRace | undefined;

  // If no race selected or no subraces available, don't show this step
  if (!currentRace || !currentRace.subraces || currentRace.subraces.length === 0) {
    return (
      <div className="text-center space-y-4">
        <Users className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Subrace Options</h2>
        <p className="text-muted-foreground">
          {currentRace
            ? `The ${currentRace.name} race does not have subrace variants.`
            : 'Please select a race first.'}
        </p>
        <p className="text-sm text-muted-foreground">
          You can proceed to the next step of character creation.
        </p>
      </div>
    );
  }

  const handleSubraceSelect = (subrace: Subrace) => {
    logger.info('Selecting subrace:', subrace);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { subrace },
    });

    toast({
      title: 'Subrace Selected',
      description: `You have chosen the ${subrace.name} subrace.`,
      duration: 1000,
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  const getAbilityScoreText = (abilityScoreIncrease: Partial<Record<string, number>>) => {
    return Object.entries(abilityScoreIncrease)
      .map(([ability, bonus]) => `${ability.charAt(0).toUpperCase() + ability.slice(1)} +${bonus}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your {currentRace.name} Subrace</h2>
        <p className="text-muted-foreground">
          Select a specialized variant of the {currentRace.name} race
        </p>
      </div>

      {/* Current Race Summary */}
      <Card className="p-4 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Selected Race: {currentRace.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{currentRace.description}</p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-orange-500" />
            <span>Base: {getAbilityScoreText(currentRace.abilityScoreIncrease)}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Choose subrace for additional bonuses</span>
        </div>
      </Card>

      {/* Subrace Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentRace.subraces.map((subrace) => {
          const isSelected = state.character?.subrace?.id === subrace.id;

          return (
            <Card
              key={subrace.id}
              className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:border-primary/50'
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
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
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

                {/* Additional Ability Score Increases */}
                {subrace.abilityScoreIncrease &&
                  Object.keys(subrace.abilityScoreIncrease).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <h4 className="font-semibold">Additional Ability Score Increases</h4>
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

                {/* Speed Modification */}
                {subrace.speed && subrace.speed !== currentRace.speed && (
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">Speed:</span> {subrace.speed} feet
                      <Badge variant="outline" className="ml-2 text-xs">
                        {subrace.speed > currentRace.speed ? 'Faster' : 'Different'}
                      </Badge>
                    </p>
                  </div>
                )}

                {/* Additional Languages */}
                {subrace.languages && subrace.languages.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm">Additional Languages</h4>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {subrace.languages.map((language, index) => (
                        <Badge key={index} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subrace Traits */}
                <div>
                  <h4 className="font-semibold mb-2">Subrace Traits</h4>
                  <div className="space-y-1">
                    {subrace.traits.map((trait, index) => (
                      <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                        <span className="font-medium">{trait.split(':')[0]}:</span>
                        <span className="text-muted-foreground ml-1">
                          {trait.split(':')[1] || trait}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cantrips */}
                {subrace.cantrips && subrace.cantrips.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Cantrips</h4>
                    <div className="flex flex-wrap gap-1">
                      {subrace.cantrips.map((cantrip, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {cantrip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weapon Proficiencies */}
                {subrace.weaponProficiencies && subrace.weaponProficiencies.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Weapon Proficiencies</h4>
                    <div className="flex flex-wrap gap-1">
                      {subrace.weaponProficiencies.map((weapon, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {weapon}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Armor Proficiencies */}
                {subrace.armorProficiencies && subrace.armorProficiencies.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Armor Proficiencies</h4>
                    <div className="flex flex-wrap gap-1">
                      {subrace.armorProficiencies.map((armor, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {armor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Subrace Summary */}
      {state.character?.subrace && (
        <Card className="p-4 bg-primary/5">
          <h3 className="font-semibold mb-2">Selected Subrace: {state.character.subrace.name}</h3>
          <p className="text-sm text-muted-foreground">
            You'll gain the subrace traits and bonuses shown above when you complete character
            creation.
          </p>
        </Card>
      )}
    </div>
  );
};

export default SubraceSelection;
