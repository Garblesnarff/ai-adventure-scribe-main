import { Star, Users, Zap, BookOpen } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import ClassFeatureTracker from '@/components/character-sheet/sections/ClassFeatureTracker';
import FightingStylesDisplay from '@/components/character-sheet/sections/FightingStylesDisplay';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeaturesTabProps {
  character: Character;
  onUpdate: () => void;
}

interface Feature {
  name: string;
  source: 'race' | 'class' | 'background' | 'feat';
  description: string;
  level?: number;
  uses?: {
    total: number;
    used: number;
    recharge: 'short' | 'long' | 'dawn' | 'manual';
  };
}

/**
 * Features & Traits tab showing racial traits, class features, and special abilities
 */
const FeaturesTab: React.FC<FeaturesTabProps> = ({ character, onUpdate }) => {
  // Example features (would be calculated based on character's race, class, level, etc.)
  const features: Feature[] = [
    // Racial Features
    {
      name: 'Darkvision',
      source: 'race',
      description:
        'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.',
    },
    {
      name: 'Fey Ancestry',
      source: 'race',
      description:
        'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.',
    },
    // Class Features
    {
      name: 'Fighting Style: Defense',
      source: 'class',
      level: 1,
      description: 'While you are wearing armor, you gain a +1 bonus to AC.',
    },
    {
      name: 'Second Wind',
      source: 'class',
      level: 1,
      description:
        'You can use a bonus action to regain hit points equal to 1d10 + your fighter level.',
      uses: { total: 1, used: 0, recharge: 'short' },
    },
    {
      name: 'Action Surge',
      source: 'class',
      level: 2,
      description: 'You can take one additional action on your turn.',
      uses: { total: 1, used: 1, recharge: 'short' },
    },
    {
      name: 'Martial Archetype: Champion',
      source: 'class',
      level: 3,
      description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
    },
    // Background Features
    {
      name: 'Guild Membership',
      source: 'background',
      description:
        'As an established member of a guild, you can rely on certain benefits that membership provides.',
    },
  ];

  const getFeatureIcon = (source: string) => {
    switch (source) {
      case 'race':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'class':
        return <Star className="w-4 h-4 text-blue-600" />;
      case 'background':
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case 'feat':
        return <Zap className="w-4 h-4 text-orange-600" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'race':
        return 'bg-green-100 text-green-800';
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'background':
        return 'bg-purple-100 text-purple-800';
      case 'feat':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group features by source
  const featuresBySource = {
    race: features.filter((f) => f.source === 'race'),
    class: features.filter((f) => f.source === 'class'),
    background: features.filter((f) => f.source === 'background'),
    feat: features.filter((f) => f.source === 'feat'),
  };

  return (
    <div className="space-y-6">
      {/* Class Feature Tracker */}
      <ClassFeatureTracker character={character} onUpdate={onUpdate} />

      {/* Fighting Styles */}
      <FightingStylesDisplay character={character} />

      {/* Racial Traits */}
      {featuresBySource.race.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Racial Traits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuresBySource.race.map((feature, index) => (
              <div key={index} className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{feature.name}</h4>
                  <Badge variant="secondary" className={getSourceColor(feature.source)}>
                    {character.race?.name}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Class Features */}
      {featuresBySource.class.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Class Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuresBySource.class.map((feature, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{feature.name}</h4>
                  <Badge variant="secondary" className={getSourceColor(feature.source)}>
                    {character.class?.name} {feature.level && `${feature.level}`}
                  </Badge>
                  {feature.uses && (
                    <Badge
                      variant={feature.uses.used >= feature.uses.total ? 'destructive' : 'outline'}
                      className="ml-auto"
                    >
                      {feature.uses.total - feature.uses.used} / {feature.uses.total}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                {feature.uses && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Recharge:{' '}
                    {feature.uses.recharge === 'short'
                      ? 'Short Rest'
                      : feature.uses.recharge === 'long'
                        ? 'Long Rest'
                        : feature.uses.recharge === 'dawn'
                          ? 'Dawn'
                          : 'Manual'}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Background Features */}
      {featuresBySource.background.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Background Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuresBySource.background.map((feature, index) => (
              <div key={index} className="border-l-4 border-purple-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{feature.name}</h4>
                  <Badge variant="secondary" className={getSourceColor(feature.source)}>
                    {character.background?.name}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feats */}
      {featuresBySource.feat.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              Feats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuresBySource.feat.map((feature, index) => (
              <div key={index} className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{feature.name}</h4>
                  <Badge variant="secondary" className={getSourceColor(feature.source)}>
                    Feat
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Proficiencies */}
      <Card>
        <CardHeader>
          <CardTitle>Proficiencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Armor</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Light Armor</Badge>
                <Badge variant="outline">Medium Armor</Badge>
                <Badge variant="outline">Heavy Armor</Badge>
                <Badge variant="outline">Shields</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Weapons</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Simple Weapons</Badge>
                <Badge variant="outline">Martial Weapons</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Languages</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Common</Badge>
                <Badge variant="outline">Elvish</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tools</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Smith's Tools</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturesTab;
