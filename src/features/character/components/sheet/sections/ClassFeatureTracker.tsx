import { Star, Zap, RotateCcw } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import logger from '@/lib/logger';
import { getClassFeatures, getCharacterResources } from '@/utils/classFeatures';

interface ClassFeatureTrackerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * ClassFeatureTracker component displays and manages character class feature usage
 * including resources like spell slots, ki points, rages, etc.
 */
const ClassFeatureTracker: React.FC<ClassFeatureTrackerProps> = ({ character, onUpdate }) => {
  // Get class features for the character
  const classFeatures = character.class
    ? getClassFeatures(character.class.name, character.level || 1)
    : [];

  // Get character resources
  const characterResources = character.class
    ? getCharacterResources(character.class.name, character.level || 1)
    : null;

  // Handle resource restoration (short rest or long rest)
  const handleRest = (restType: 'short' | 'long') => {
    if (!characterResources) return;

    // In a real implementation, this would update the character's resources
    // For now, we'll just show a message
    logger.info(`Restoring ${restType} rest resources`);

    // This would be implemented with actual resource restoration logic
    // For example:
    // const updatedResources = restoreClassFeatures(classFeatures, characterResources, restType);
    // onUpdate({ ...character, resources: updatedResources });
  };

  // Handle using a resource
  const handleUseResource = (resourceName: string) => {
    // In a real implementation, this would update the character's resources
    logger.info(`Using resource: ${resourceName}`);

    // This would be implemented with actual resource usage logic
    // For example:
    // const updatedResources = { ...character.resources };
    // updatedResources[resourceName].current -= 1;
    // onUpdate({ ...character, resources: updatedResources });
  };

  // If no class features or resources, don't render anything
  if (classFeatures.length === 0 && !characterResources) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Class Features with Usage Tracking */}
      {classFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Class Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {classFeatures.map((feature, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{feature.name}</h4>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {character.class?.name} {feature.level}
                  </Badge>
                  {feature.maxUses !== undefined && feature.currentUses !== undefined && (
                    <Badge
                      variant={feature.currentUses === 0 ? 'destructive' : 'outline'}
                      className="ml-auto"
                    >
                      {feature.currentUses} / {feature.maxUses}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                {feature.maxUses !== undefined && feature.currentUses !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Uses remaining</span>
                      <span>
                        {feature.currentUses} / {feature.maxUses}
                      </span>
                    </div>
                    <Progress
                      value={(feature.currentUses / feature.maxUses) * 100}
                      className="h-2"
                    />
                  </div>
                )}
                {feature.currentUses !== undefined && feature.currentUses > 0 && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => handleUseResource(feature.name)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Use Feature
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Character Resources */}
      {characterResources && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Character Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hit Dice */}
            {characterResources.hitDice &&
              Object.entries(characterResources.hitDice).map(([dieType, dice]) => (
                <div key={dieType} className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">Hit Dice ({dieType})</h4>
                    <Badge
                      variant={dice.current === 0 ? 'destructive' : 'outline'}
                      className="ml-auto"
                    >
                      {dice.current} / {dice.max}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Remaining</span>
                      <span>
                        {dice.current} / {dice.max}
                      </span>
                    </div>
                    <Progress value={(dice.current / dice.max) * 100} className="h-2" />
                  </div>
                </div>
              ))}

            {/* Class-Specific Resources */}
            {characterResources.rages !== undefined && (
              <div className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Rages</h4>
                  <Badge
                    variant={characterResources.rages.current === 0 ? 'destructive' : 'outline'}
                    className="ml-auto"
                  >
                    {characterResources.rages.current} / {characterResources.rages.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.rages.current} / {characterResources.rages.max}
                    </span>
                  </div>
                  <Progress
                    value={(characterResources.rages.current / characterResources.rages.max) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.kiPoints !== undefined && (
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Ki Points</h4>
                  <Badge
                    variant={characterResources.kiPoints.current === 0 ? 'destructive' : 'outline'}
                    className="ml-auto"
                  >
                    {characterResources.kiPoints.current} / {characterResources.kiPoints.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.kiPoints.current} / {characterResources.kiPoints.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.kiPoints.current / characterResources.kiPoints.max) * 100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.sorceryPoints !== undefined && (
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Sorcery Points</h4>
                  <Badge
                    variant={
                      characterResources.sorceryPoints.current === 0 ? 'destructive' : 'outline'
                    }
                    className="ml-auto"
                  >
                    {characterResources.sorceryPoints.current} /{' '}
                    {characterResources.sorceryPoints.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.sorceryPoints.current} /{' '}
                      {characterResources.sorceryPoints.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.sorceryPoints.current /
                        characterResources.sorceryPoints.max) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.bardic_inspiration !== undefined && (
              <div className="border-l-4 border-pink-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Bardic Inspiration</h4>
                  <Badge
                    variant={
                      characterResources.bardic_inspiration.current === 0
                        ? 'destructive'
                        : 'outline'
                    }
                    className="ml-auto"
                  >
                    {characterResources.bardic_inspiration.current} /{' '}
                    {characterResources.bardic_inspiration.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.bardic_inspiration.current} /{' '}
                      {characterResources.bardic_inspiration.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.bardic_inspiration.current /
                        characterResources.bardic_inspiration.max) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.channelDivinity !== undefined && (
              <div className="border-l-4 border-indigo-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Channel Divinity</h4>
                  <Badge
                    variant={
                      characterResources.channelDivinity.current === 0 ? 'destructive' : 'outline'
                    }
                    className="ml-auto"
                  >
                    {characterResources.channelDivinity.current} /{' '}
                    {characterResources.channelDivinity.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.channelDivinity.current} /{' '}
                      {characterResources.channelDivinity.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.channelDivinity.current /
                        characterResources.channelDivinity.max) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.layOnHands !== undefined && (
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Lay on Hands</h4>
                  <Badge variant="outline" className="ml-auto">
                    {characterResources.layOnHands.current} / {characterResources.layOnHands.max}{' '}
                    points
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.layOnHands.current} / {characterResources.layOnHands.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.layOnHands.current / characterResources.layOnHands.max) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {characterResources.actionSurge !== undefined && (
              <div className="border-l-4 border-cyan-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">Action Surge</h4>
                  <Badge
                    variant={
                      characterResources.actionSurge.current === 0 ? 'destructive' : 'outline'
                    }
                    className="ml-auto"
                  >
                    {characterResources.actionSurge.current} / {characterResources.actionSurge.max}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remaining</span>
                    <span>
                      {characterResources.actionSurge.current} /{' '}
                      {characterResources.actionSurge.max}
                    </span>
                  </div>
                  <Progress
                    value={
                      (characterResources.actionSurge.current /
                        characterResources.actionSurge.max) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rest Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleRest('short')} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Short Rest
        </Button>
        <Button variant="outline" onClick={() => handleRest('long')} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Long Rest
        </Button>
      </div>
    </div>
  );
};

export default ClassFeatureTracker;
