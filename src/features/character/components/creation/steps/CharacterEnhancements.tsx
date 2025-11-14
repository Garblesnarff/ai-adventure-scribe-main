/**
 * Character Enhancements Step
 *
 * Allows users to select enhancement options that make their character
 * unique and interesting during the character creation process.
 */

import { Sparkles, Info, CheckCircle } from 'lucide-react';
import React from 'react';

import type { OptionSelection } from '@/types/enhancement-options';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancementPanel } from '@/components/ui/enhancement-panel';
import { Separator } from '@/components/ui/separator';
import { useCharacter } from '@/contexts/CharacterContext';
import {
  EnhancementOption,
  CHARACTER_ENHANCEMENTS,
  checkOptionAvailability,
} from '@/types/enhancement-options';

interface CharacterEnhancementsProps {
  isOptional?: boolean;
}

export default function CharacterEnhancements({ isOptional = true }: CharacterEnhancementsProps) {
  const { state, dispatch } = useCharacter();
  const [selections, setSelections] = React.useState<OptionSelection[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Load existing selections from character data
  React.useEffect(() => {
    if (state.character?.enhancementSelections) {
      setSelections(state.character.enhancementSelections);
    }
  }, [state.character?.enhancementSelections]);

  // Update character data when selections change
  React.useEffect(() => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { enhancementSelections: selections },
    });
  }, [selections, dispatch]);

  // Calculate enhancement effects and apply them to character
  React.useEffect(() => {
    if (selections.length === 0) return;

    const effects = {
      traits: [] as string[],
      skillBonus: [] as string[],
      abilityBonus: {} as Record<string, number>,
      languages: [] as string[],
      equipment: [] as string[],
    };

    selections.forEach((selection) => {
      const option = CHARACTER_ENHANCEMENTS.find((o) => o.id === selection.optionId);
      if (option?.mechanicalEffects) {
        const mech = option.mechanicalEffects;

        if (mech.traits) effects.traits.push(...mech.traits);
        if (mech.skillBonus) effects.skillBonus.push(...mech.skillBonus);
        if (mech.languages) effects.languages.push(...mech.languages);
        if (mech.equipment) effects.equipment.push(...mech.equipment);

        if (mech.abilityBonus) {
          Object.entries(mech.abilityBonus).forEach(([ability, bonus]) => {
            effects.abilityBonus[ability] = (effects.abilityBonus[ability] || 0) + bonus;
          });
        }
      }
    });

    // Apply effects to character (this would integrate with your existing character system)
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { enhancementEffects: effects },
    });
  }, [selections, dispatch]);

  // Mock AI generation function (replace with actual AI integration)
  const handleAIGenerate = async (optionId: string): Promise<string> => {
    setIsGenerating(true);

    try {
      // Simulate AI generation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const option = CHARACTER_ENHANCEMENTS.find((o) => o.id === optionId);
      if (!option) throw new Error('Option not found');

      // Mock AI-generated content based on character
      const character = state.character;
      const characterClass = character?.class?.name || 'Adventurer';
      const characterRace = character?.race?.name || 'Human';

      const mockQuirks = [
        `As a ${characterRace} ${characterClass}, always adjusts their ${characterClass.toLowerCase()} gear when nervous`,
        `Has developed a habit of speaking to their ${characterClass.toLowerCase()} tools as if they were alive`,
        `Collects small tokens from every place they've adventured as a ${characterRace}`,
        `Always performs a small ritual before using their ${characterClass.toLowerCase()} abilities`,
        `Has an unusual fear of common objects that reminds them of their first adventure`,
      ];

      return mockQuirks[Math.floor(Math.random() * mockQuirks.length)];
    } finally {
      setIsGenerating(false);
    }
  };

  const getRecommendedOptions = () => {
    const character = state.character;
    if (!character) return [];

    return CHARACTER_ENHANCEMENTS.filter((option) => {
      // Recommend options based on character class/race
      if (character.class?.id === 'rogue' && option.tags.includes('stealth')) return true;
      if (character.class?.id === 'bard' && option.tags.includes('social')) return true;
      if (character.class?.id === 'wizard' && option.tags.includes('knowledge')) return true;
      if (option.tags.includes('personality') && selections.length < 2) return true;
      return false;
    }).slice(0, 3);
  };

  const getSelectionSummary = () => {
    if (selections.length === 0) return null;

    const categories = new Set(
      selections.map((s) => {
        const option = CHARACTER_ENHANCEMENTS.find((o) => o.id === s.optionId);
        return option?.tags[0] || 'other';
      }),
    );

    return Array.from(categories);
  };

  const recommended = getRecommendedOptions();
  const summary = getSelectionSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Character Enhancements
            {isOptional && <Badge variant="secondary">Optional</Badge>}
          </CardTitle>
          <CardDescription>
            Add unique traits, quirks, and abilities that make your character memorable and provide
            interesting roleplay opportunities. These enhancements can give mechanical benefits and
            story hooks for your DM to use.
          </CardDescription>
        </CardHeader>

        {summary && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {selections.length} enhancement{selections.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {summary.map((category) => (
                  <Badge key={category} variant="outline" className="capitalize">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommendations */}
      {recommended.length > 0 && selections.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommended for your {state.character?.class?.name}:</strong>{' '}
            {recommended.map((opt) => opt.name).join(', ')}. These enhancements complement your
            character build and provide great roleplay opportunities.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhancement Selection Panel */}
      <EnhancementPanel
        category="character"
        characterData={state.character}
        selections={selections}
        onSelectionChange={setSelections}
        onAIGenerate={handleAIGenerate}
        className="w-full"
      />

      {/* Selection Summary */}
      {selections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Character's Story</CardTitle>
            <CardDescription>
              Here's how your enhancements shape your character's personality and abilities:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selections.map((selection) => {
              const option = CHARACTER_ENHANCEMENTS.find((o) => o.id === selection.optionId);
              if (!option) return null;

              return (
                <div key={selection.optionId} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.name}</span>
                    {selection.aiGenerated && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Array.isArray(selection.value) ? (
                      <ul className="list-disc list-inside">
                        {(selection.value as string[]).map((value, index) => (
                          <li key={index}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{selection.value as string}</p>
                    )}
                    {selection.customValue && (
                      <p className="italic">Note: {selection.customValue}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Skip Option */}
      {isOptional && selections.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Optional Step:</strong> You can skip enhancements and create a standard
            character, or add them later. However, selecting enhancements now will give your DM more
            material to work with for personalized story moments.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
