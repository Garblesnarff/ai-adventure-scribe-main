import {
  TrendingUp,
  Star,
  Heart,
  Award,
  ChevronRight,
  Plus,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import FeatSelection from './FeatSelection';
import HitPointsSelection from './HitPointsSelection';

import type { AbilityScores } from '@/types/character';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import {
  getLevelFromExperience,
  getExperienceForLevel,
  getProficiencyBonus,
  canMulticlass,
  getClassFeaturesForLevel,
  getAllClassFeaturesUpToLevel,
} from '@/data/levelProgression';

/**
 * CharacterAdvancement component for leveling up characters
 * Handles level progression, multiclassing, and feature acquisition
 */
const CharacterAdvancement: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;

  const [selectedAdvancement, setSelectedAdvancement] = useState<'level-up' | 'multiclass'>(
    'level-up',
  );
  const [selectedMulticlass, setSelectedMulticlass] = useState<string>('');
  const [showFeatureSelection, setShowFeatureSelection] = useState(false);
  const [showHitPointsSelection, setShowHitPointsSelection] = useState(false);

  const currentLevel = character?.level || 1;
  const currentExperience = character?.experience || 0;
  const currentClass = character?.class;

  const nextLevel = currentLevel + 1;
  const experienceNeeded = getExperienceForLevel(nextLevel);
  const experienceToNextLevel = Math.max(0, experienceNeeded - currentExperience);
  const canLevelUp = currentExperience >= experienceNeeded && currentLevel < 20;

  // Calculate character's total level for multiclassing
  const totalLevel = currentLevel; // In full implementation, would sum all class levels

  const newClassFeatures = currentClass ? getClassFeaturesForLevel(currentClass.id, nextLevel) : [];
  const hasAbilityScoreImprovement = newClassFeatures.some(
    (feature) => feature.abilityScoreImprovement,
  );

  // Multiclassing validation
  const availableClasses = [
    'fighter',
    'wizard',
    'rogue',
    'cleric',
    'barbarian',
    'bard',
    'druid',
    'monk',
    'paladin',
    'ranger',
    'sorcerer',
    'warlock',
  ];
  const multiclassOptions = character?.abilityScores
    ? availableClasses
        .filter((className) => className !== currentClass?.id)
        .map((className) => {
          const validation = canMulticlass(
            currentClass?.id || '',
            className,
            character.abilityScores as Record<
              keyof AbilityScores,
              { score: number; modifier: number }
            >,
          );
          return { className, ...validation };
        })
    : [];

  const validMulticlassOptions = multiclassOptions.filter((option) => option.canMulticlass);

  /**
   * Handle level up
   */
  const handleLevelUp = async () => {
    if (!canLevelUp || !character || !currentClass) return;

    // Check if this level grants special features that need selection
    if (hasAbilityScoreImprovement) {
      setShowFeatureSelection(true);
      return;
    }

    // Always need to roll/select hit points for new level
    setShowHitPointsSelection(true);
  };

  /**
   * Apply level up after all selections are made
   */
  const applyLevelUp = (additionalUpdates: any = {}) => {
    if (!character || !currentClass) return;

    const updates = {
      level: nextLevel,
      ...additionalUpdates,
    };

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: updates,
    });

    toast({
      title: 'Level Up Complete!',
      description: `Congratulations! You are now level ${nextLevel}.`,
    });

    // Reset selections
    setShowFeatureSelection(false);
    setShowHitPointsSelection(false);
  };

  /**
   * Handle multiclassing
   */
  const handleMulticlass = (targetClass: string) => {
    if (!character) return;

    // In a full implementation, this would:
    // 1. Add the new class to character.classes array
    // 2. Handle proficiency gains from multiclassing
    // 3. Update spellcasting if applicable
    // For now, we'll show a placeholder

    toast({
      title: 'Multiclassing Selected',
      description: `Selected ${targetClass} for multiclassing. This feature is under development.`,
    });
  };

  if (!character || !currentClass) {
    return (
      <div className="text-center space-y-4">
        <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Character</h2>
        <p className="text-muted-foreground">
          Please create a character first to use the advancement system.
        </p>
      </div>
    );
  }

  // If showing special selections, render those components
  if (showFeatureSelection) {
    return <FeatSelection />;
  }

  if (showHitPointsSelection) {
    return (
      <div className="space-y-6">
        <HitPointsSelection />
        <div className="flex justify-center">
          <Button onClick={() => applyLevelUp()}>Complete Level Up</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Character Advancement</h2>
        <p className="text-muted-foreground">Level up your character and gain new abilities</p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-500" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{currentLevel}</div>
              <div className="text-xs text-muted-foreground">Current Level</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">{currentExperience.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Experience Points</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold">+{getProficiencyBonus(currentLevel)}</div>
              <div className="text-xs text-muted-foreground">Proficiency Bonus</div>
            </div>
          </div>

          {/* Experience Progress */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress to Level {nextLevel}</span>
              <span className="text-sm text-muted-foreground">
                {experienceToNextLevel > 0
                  ? `${experienceToNextLevel.toLocaleString()} XP needed`
                  : 'Ready to level up!'}
              </span>
            </div>
            <Progress
              value={
                currentLevel >= 20
                  ? 100
                  : Math.min(100, (currentExperience / experienceNeeded) * 100)
              }
              className="w-full h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Level Up Section */}
      {canLevelUp && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Star className="w-5 h-5" />
              Level Up Available!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Level {nextLevel} {currentClass.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Advance to the next level and gain new features
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>

              {/* New Features Preview */}
              {newClassFeatures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">New Features:</h4>
                  <div className="space-y-2">
                    {newClassFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {feature.abilityScoreImprovement ? 'ASI/Feat' : 'Feature'}
                        </Badge>
                        <span>{feature.featureName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleLevelUp} className="w-full" size="lg">
                <TrendingUp className="w-4 h-4 mr-2" />
                Level Up to {nextLevel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Level Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            Current Class Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getAllClassFeaturesUpToLevel(currentClass.id, currentLevel).map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge variant="outline" className="text-xs mt-1">
                  Level {feature.level}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium">{feature.featureName}</div>
                  <div className="text-sm text-muted-foreground mt-1">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multiclassing Section */}
      {currentLevel >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-500" />
              Multiclassing
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add levels in a different class to diversify your character
            </p>
          </CardHeader>
          <CardContent>
            {validMulticlassOptions.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {validMulticlassOptions.map((option) => (
                    <div
                      key={option.className}
                      className="p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleMulticlass(option.className)}
                    >
                      <div className="font-medium capitalize">{option.className}</div>
                      <div className="text-sm text-muted-foreground">Requirements met</div>
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Multiclassing is an advanced optional rule. Make sure you understand the
                    implications before proceeding.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Multiclassing Not Available</h3>
                <p className="text-sm text-muted-foreground">
                  You don't meet the ability score requirements for multiclassing into other
                  classes.
                </p>
                <div className="mt-4 space-y-2">
                  {multiclassOptions
                    .filter((option) => !option.canMulticlass)
                    .map((option) => (
                      <div key={option.className} className="text-sm">
                        <span className="capitalize font-medium">{option.className}:</span>
                        <span className="text-muted-foreground ml-2">
                          {option.requirements.join(', ')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CharacterAdvancement;
