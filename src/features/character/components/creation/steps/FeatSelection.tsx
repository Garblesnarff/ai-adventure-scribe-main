import { Sword, Sparkles, Users, Lightbulb, Award } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Feat } from '@/data/featOptions';
import type { AbilityScores } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { feats, getFeatsByCategory } from '@/data/featOptions';

/**
 * FeatSelection component for choosing feats during character creation
 * Handles Ability Score Improvement vs Feat choice
 */
const FeatSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;

  const [selectionType, setSelectionType] = useState<'asi' | 'feat'>('asi');
  const [selectedFeat, setSelectedFeat] = useState<string>('');
  const [abilityIncreases, setAbilityIncreases] = useState<Record<string, number>>({
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  });

  const currentLevel = character?.level || 1;
  const canChooseFeat = [4, 8, 12, 16, 19].includes(currentLevel);

  // Note: No early returns before hooks to satisfy rules-of-hooks

  /**
   * Handle ASI (Ability Score Improvement) selection
   */
  const handleAbilityIncrease = (ability: string, change: number) => {
    const currentScore =
      character?.abilityScores?.[ability as keyof typeof character.abilityScores]?.score || 10;
    const currentIncrease = abilityIncreases[ability];
    const newIncrease = Math.max(0, Math.min(2, currentIncrease + change));

    // Can't exceed 20 or use more than 2 points total
    const totalIncreases = Object.values({ ...abilityIncreases, [ability]: newIncrease }).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (currentScore + newIncrease > 20 || totalIncreases > 2) {
      return;
    }

    setAbilityIncreases((prev) => ({
      ...prev,
      [ability]: newIncrease,
    }));
  };

  /**
   * Apply the selected improvement (ASI or Feat)
   */
  const applySelection = () => {
    if (selectionType === 'asi') {
      const totalIncreases = Object.values(abilityIncreases).reduce((sum, val) => sum + val, 0);
      if (totalIncreases !== 2) {
        toast({
          title: 'Invalid Selection',
          description: 'You must spend exactly 2 ability score points.',
          variant: 'destructive',
        });
        return;
      }

      // Apply ASI to character
      const updatedAbilityScores = { ...character?.abilityScores };
      Object.entries(abilityIncreases).forEach(([ability, increase]) => {
        if (increase > 0 && updatedAbilityScores?.[ability as keyof typeof updatedAbilityScores]) {
          const current = updatedAbilityScores[ability as keyof typeof updatedAbilityScores];
          if (current) {
            current.score += increase;
            current.modifier = Math.floor((current.score - 10) / 2);
          }
        }
      });

      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { abilityScores: updatedAbilityScores as AbilityScores },
      });

      toast({
        title: 'Ability Scores Improved',
        description: 'Your ability scores have been increased.',
      });
    } else {
      if (!selectedFeat) {
        toast({
          title: 'No Feat Selected',
          description: 'Please select a feat to continue.',
          variant: 'destructive',
        });
        return;
      }

      // Apply feat to character
      const currentFeats = character?.feats || [];
      const feat = feats.find((f) => f.id === selectedFeat);

      if (feat) {
        // Apply ASI from feat if it has one
        if (feat.abilityScoreIncrease) {
          const updatedAbilityScores = { ...character?.abilityScores };
          Object.entries(feat.abilityScoreIncrease).forEach(([ability, increase]) => {
            if (increase && updatedAbilityScores?.[ability as keyof typeof updatedAbilityScores]) {
              const current = updatedAbilityScores[ability as keyof typeof updatedAbilityScores];
              if (current) {
                current.score += increase;
                current.modifier = Math.floor((current.score - 10) / 2);
              }
            }
          });

          dispatch({
            type: 'UPDATE_CHARACTER',
            payload: {
              feats: [...currentFeats, selectedFeat],
              abilityScores: updatedAbilityScores as AbilityScores,
            },
          });
        } else {
          dispatch({
            type: 'UPDATE_CHARACTER',
            payload: { feats: [...currentFeats, selectedFeat] },
          });
        }

        toast({
          title: 'Feat Selected',
          description: `You have gained the ${feat.name} feat.`,
        });
      }
    }
  };

  // Auto-apply when selection is complete
  useEffect(() => {
    if (selectionType === 'asi') {
      const totalIncreases = Object.values(abilityIncreases).reduce((sum, val) => sum + val, 0);
      if (totalIncreases === 2) {
        applySelection();
      }
    } else if (selectionType === 'feat' && selectedFeat) {
      applySelection();
    }
  }, [selectionType, abilityIncreases, selectedFeat]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'combat':
        return <Sword className="w-4 h-4" />;
      case 'magic':
        return <Sparkles className="w-4 h-4" />;
      case 'social':
        return <Users className="w-4 h-4" />;
      case 'utility':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const getFeatCard = (feat: Feat) => (
    <Card
      key={feat.id}
      className={`cursor-pointer transition-all hover:shadow-md border-2 ${
        selectedFeat === feat.id ? 'border-primary bg-primary/5' : 'border-muted'
      }`}
      onClick={() => setSelectedFeat(feat.id)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getCategoryIcon(feat.category)}
          {feat.name}
        </CardTitle>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs">
            {feat.category}
          </Badge>
          {feat.abilityScoreIncrease && (
            <Badge variant="secondary" className="text-xs">
              +1 Ability Score
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{feat.description}</p>
        {feat.prerequisites && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
            <strong>Prerequisites:</strong> {feat.prerequisites}
          </p>
        )}
        <div className="space-y-1">
          {feat.benefits.map((benefit, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              • {benefit}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return !canChooseFeat ? (
    <div className="text-center space-y-4">
      <Award className="w-16 h-16 mx-auto text-muted-foreground" />
      <h2 className="text-2xl font-bold">No Feat Selection</h2>
      <p className="text-muted-foreground">
        Feats become available at levels 4, 8, 12, 16, and 19.
      </p>
      <p className="text-sm text-muted-foreground">
        Your character is currently level {currentLevel}.
      </p>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Ability Score Improvement</h2>
        <p className="text-muted-foreground">
          At level {currentLevel}, you can improve your abilities or gain a feat
        </p>
      </div>

      {/* ASI vs Feat Choice */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Improvement</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectionType}
            onValueChange={(value: 'asi' | 'feat') => setSelectionType(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="asi" id="asi" />
              <Label htmlFor="asi">
                <strong>Ability Score Improvement</strong> - Increase two different ability scores
                by 1 each, or one ability score by 2
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="feat" id="feat" />
              <Label htmlFor="feat">
                <strong>Feat</strong> - Gain a special ability that provides unique benefits
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ASI Selection */}
      {selectionType === 'asi' && (
        <Card>
          <CardHeader>
            <CardTitle>Ability Score Improvement</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribute 2 points among your ability scores. You can increase two different scores
              by 1 each, or one score by 2.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(character?.abilityScores || {}).map(([ability, score]) => {
                const increase = abilityIncreases[ability] || 0;
                const newScore = score.score + increase;

                return (
                  <div
                    key={ability}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <div className="font-medium capitalize">{ability}</div>
                      <div className="text-sm text-muted-foreground">
                        {score.score} → {newScore} ({newScore >= 10 ? '+' : ''}
                        {Math.floor((newScore - 10) / 2)})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbilityIncrease(ability, -1)}
                        disabled={increase === 0}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{increase}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbilityIncrease(ability, 1)}
                        disabled={
                          increase === 2 ||
                          newScore >= 20 ||
                          Object.values(abilityIncreases).reduce((sum, val) => sum + val, 0) >= 2
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Points remaining:{' '}
                {2 - Object.values(abilityIncreases).reduce((sum, val) => sum + val, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feat Selection */}
      {selectionType === 'feat' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Feat</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a feat to gain unique abilities and benefits.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="combat">Combat</TabsTrigger>
                <TabsTrigger value="magic">Magic</TabsTrigger>
                <TabsTrigger value="utility">Utility</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {feats.map(getFeatCard)}
                </div>
              </TabsContent>

              <TabsContent value="combat" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {getFeatsByCategory('combat').map(getFeatCard)}
                </div>
              </TabsContent>

              <TabsContent value="magic" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {getFeatsByCategory('magic').map(getFeatCard)}
                </div>
              </TabsContent>

              <TabsContent value="utility" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {getFeatsByCategory('utility').map(getFeatCard)}
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {getFeatsByCategory('social').map(getFeatCard)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Manual Apply Button (fallback) */}
      <div className="flex justify-center">
        <Button onClick={applySelection} className="mt-4">
          Apply Selection
        </Button>
      </div>
    </div>
  );
};

export default FeatSelection;
