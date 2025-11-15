import { Sword, Shield, Sparkles, Crown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { CharacterClass } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { ClassFeature } from '@/types/character';

/**
 * ClassFeatureSelection component for choosing level 1 class features
 * Handles features like Fighting Styles, Divine Domains, etc.
 */
const ClassFeatureSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const character = state.character;
  const currentClass = character?.class as CharacterClass | undefined;

  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, string>>({});

  // Get class features that require choices
  const featuresWithChoices =
    currentClass?.classFeatures.filter((feature) => feature.choices) || [];

  // Note: No early returns before hooks to satisfy rules-of-hooks

  /**
   * Updates character class features in context
   */
  const updateClassFeatures = () => {
    // Validate all required choices are made
    const missingChoices = featuresWithChoices.filter((feature) => !selectedFeatures[feature.id]);

    if (missingChoices.length > 0) {
      toast({
        title: 'Incomplete Selection',
        description: `Please select ${missingChoices.map((f) => f.name).join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    // Build class features object
    const classFeatures: Record<string, any> = {};

    // Add automatic features
    currentClass?.classFeatures.forEach((feature) => {
      if (!feature.choices) {
        classFeatures[feature.id] = {
          name: feature.name,
          description: feature.description,
        };
      }
    });

    // Add selected features
    const fightingStyles: string[] = [];
    Object.entries(selectedFeatures).forEach(([featureId, choice]) => {
      const feature = featuresWithChoices.find((f) => f.id === featureId);
      if (feature) {
        classFeatures[featureId] = {
          name: feature.name,
          description: feature.description,
          choice: choice,
        };

        // If this is a fighting style, add it to the fighting styles array
        if (featureId === 'fighting-style') {
          const [styleName] = choice.split(': ');
          fightingStyles.push(styleName.toLowerCase().replace(/\s+/g, '_'));
        }
      }
    });

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        classFeatures,
        fightingStyles,
      },
    });

    toast({
      title: 'Class Features Selected',
      description: 'Your level 1 class features have been applied.',
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  // Auto-update when all selections are made
  useEffect(() => {
    if (featuresWithChoices.length > 0) {
      const allSelected = featuresWithChoices.every((feature) => selectedFeatures[feature.id]);
      if (allSelected) {
        updateClassFeatures();
      }
    }
  }, [selectedFeatures]);

  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case 'fighting-style':
        return <Sword className="w-5 h-5 text-red-500" />;
      case 'divine-domain':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  return featuresWithChoices.length === 0 ? (
    <div className="text-center space-y-4">
      <Crown className="w-16 h-16 mx-auto text-muted-foreground" />
      <h2 className="text-2xl font-bold">Class Features Acquired</h2>
      <p className="text-muted-foreground">
        Your {currentClass?.name} class features have been automatically applied.
      </p>
      {currentClass?.classFeatures && currentClass.classFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Level 1 Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentClass.classFeatures.map((feature, index) => (
              <div key={index} className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">{feature.name}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  ) : (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Class Features</h2>
        <p className="text-muted-foreground">
          Select your {currentClass?.name} specializations and abilities
        </p>
      </div>

      {/* Feature Selection Cards */}
      {featuresWithChoices.map((feature) => (
        <Card key={feature.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getFeatureIcon(feature.id)}
              {feature.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
            {feature.choices?.description && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {feature.choices.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedFeatures[feature.id] || ''}
              onValueChange={(value) => {
                setSelectedFeatures((prev) => ({
                  ...prev,
                  [feature.id]: value,
                }));
              }}
            >
              <div className="grid gap-3">
                {feature.choices?.options.map((option, index) => {
                  const [optionName, ...descriptionParts] = option.split(': ');
                  const optionDescription = descriptionParts.join(': ');

                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <RadioGroupItem
                        value={option}
                        id={`${feature.id}-${index}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`${feature.id}-${index}`} className="cursor-pointer block">
                          <div className="font-medium">{optionName}</div>
                          {optionDescription && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {optionDescription}
                            </div>
                          )}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      {/* Selection Summary */}
      {Object.keys(selectedFeatures).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(selectedFeatures).map(([featureId, choice]) => {
                const feature = featuresWithChoices.find((f) => f.id === featureId);
                const [choiceName] = choice.split(': ');

                return (
                  <div
                    key={featureId}
                    className="flex items-center justify-between p-2 bg-accent/30 rounded"
                  >
                    <span className="font-medium">{feature?.name}</span>
                    <Badge variant="outline">{choiceName}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Update Button (fallback) */}
      {featuresWithChoices.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={updateClassFeatures} className="mt-4">
            Confirm Class Features
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClassFeatureSelection;
