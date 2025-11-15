import { Sparkles, Zap, Users, Globe, Sword, Shield, Target, Book, Award } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';
import type { OptionSelection } from '@/types/enhancement-options';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnhancementDetailsProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * EnhancementDetails Component
 *
 * Displays all enhancement selections and their resulting effects for a character.
 * Shows enhancement selections, traits, skill bonuses, ability bonuses, languages,
 * equipment, resistances, and expertise in a well-organized card-based layout.
 */
const EnhancementDetails: React.FC<EnhancementDetailsProps> = ({ character }) => {
  const { enhancementSelections, enhancementEffects } = character;

  // Helper function to format ability bonus display
  const formatAbilityBonus = (abilityBonus: Record<string, number>) => {
    return Object.entries(abilityBonus).map(([ability, bonus]) => ({
      ability: ability.charAt(0).toUpperCase() + ability.slice(1),
      bonus: bonus > 0 ? `+${bonus}` : bonus.toString(),
    }));
  };

  // Helper function to render array as badges
  const renderArrayAsBadges = (
    items: string[],
    variant: 'default' | 'secondary' | 'outline' = 'outline',
  ) => {
    if (!items || items.length === 0) {
      return <span className="text-sm text-muted-foreground italic">None</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item, index) => (
          <Badge key={index} variant={variant} className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  };

  // Helper function to render selections
  const renderSelections = (selections: OptionSelection[]) => {
    if (!selections || selections.length === 0) {
      return <span className="text-sm text-muted-foreground italic">No enhancements selected</span>;
    }

    return (
      <div className="space-y-2">
        {selections.map((selection, index) => (
          <div key={index} className="rounded-md border border-input bg-background/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selection.optionId}</span>
              {selection.aiGenerated && (
                <Badge variant="secondary" className="text-xs">
                  AI Generated
                </Badge>
              )}
            </div>
            {selection.value && (
              <div className="mt-1 text-xs text-muted-foreground">
                {Array.isArray(selection.value)
                  ? selection.value.join(', ')
                  : selection.value.toString()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Don't render if no enhancement data exists
  if (!enhancementSelections && !enhancementEffects) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Enhancement Selections */}
      {enhancementSelections && enhancementSelections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Enhancement Selections
            </CardTitle>
          </CardHeader>
          <CardContent>{renderSelections(enhancementSelections)}</CardContent>
        </Card>
      )}

      {/* Enhancement Effects */}
      {enhancementEffects && (
        <div className="space-y-4">
          {/* Traits */}
          {enhancementEffects.traits && enhancementEffects.traits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Enhancement Traits
                </CardTitle>
              </CardHeader>
              <CardContent>{renderArrayAsBadges(enhancementEffects.traits, 'default')}</CardContent>
            </Card>
          )}

          {/* Skill Bonuses */}
          {enhancementEffects.skillBonus && enhancementEffects.skillBonus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Skill Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderArrayAsBadges(enhancementEffects.skillBonus, 'secondary')}
              </CardContent>
            </Card>
          )}

          {/* Ability Bonuses */}
          {enhancementEffects.abilityBonus &&
            Object.keys(enhancementEffects.abilityBonus).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    Ability Score Bonuses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formatAbilityBonus(enhancementEffects.abilityBonus).map(
                      ({ ability, bonus }, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded border bg-background/50"
                        >
                          <span className="text-sm font-medium">{ability}</span>
                          <Badge
                            variant={bonus.startsWith('+') ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {bonus}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Languages */}
          {enhancementEffects.languages && enhancementEffects.languages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>{renderArrayAsBadges(enhancementEffects.languages)}</CardContent>
            </Card>
          )}

          {/* Equipment */}
          {enhancementEffects.equipment && enhancementEffects.equipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="w-5 h-5 text-orange-500" />
                  Equipment
                </CardTitle>
              </CardHeader>
              <CardContent>{renderArrayAsBadges(enhancementEffects.equipment)}</CardContent>
            </Card>
          )}

          {/* Resistances */}
          {enhancementEffects.resistances && enhancementEffects.resistances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  Damage Resistances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderArrayAsBadges(enhancementEffects.resistances, 'secondary')}
              </CardContent>
            </Card>
          )}

          {/* Expertise */}
          {enhancementEffects.expertise && enhancementEffects.expertise.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="w-5 h-5 text-teal-500" />
                  Expertise (Double Proficiency)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderArrayAsBadges(enhancementEffects.expertise, 'default')}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Show message if no enhancement effects */}
      {enhancementEffects &&
        (!enhancementEffects.traits || enhancementEffects.traits.length === 0) &&
        (!enhancementEffects.skillBonus || enhancementEffects.skillBonus.length === 0) &&
        (!enhancementEffects.abilityBonus ||
          Object.keys(enhancementEffects.abilityBonus).length === 0) &&
        (!enhancementEffects.languages || enhancementEffects.languages.length === 0) &&
        (!enhancementEffects.equipment || enhancementEffects.equipment.length === 0) &&
        (!enhancementEffects.resistances || enhancementEffects.resistances.length === 0) &&
        (!enhancementEffects.expertise || enhancementEffects.expertise.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No enhancement effects currently active</p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default EnhancementDetails;
