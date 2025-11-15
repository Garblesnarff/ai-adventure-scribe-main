import { Sword, Shield } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FIGHTING_STYLES } from '@/utils/fightingStyles';

interface FightingStylesDisplayProps {
  character: Character;
}

/**
 * FightingStylesDisplay component shows character's selected fighting styles
 * with their descriptions and benefits
 */
const FightingStylesDisplay: React.FC<FightingStylesDisplayProps> = ({ character }) => {
  // Get fighting styles from character
  const fightingStyles = character.fightingStyles || [];

  // If no fighting styles, don't render anything
  if (fightingStyles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sword className="w-5 h-5 text-red-600" />
          Fighting Styles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fightingStyles.map((styleName, index) => {
          // Get the full fighting style object
          const style = FIGHTING_STYLES[styleName as keyof typeof FIGHTING_STYLES];

          if (!style) {
            return (
              <div key={index} className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{styleName}</h4>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    Unknown Style
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Fighting style data not found.</p>
              </div>
            );
          }

          return (
            <div key={index} className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">
                  {style.name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </h4>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  Fighting Style
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{style.description}</p>

              {/* Display specific benefits */}
              {style.effect.acBonus && (
                <div className="text-xs text-muted-foreground mt-1">
                  <Shield className="w-3 h-3 inline mr-1" />
                  AC Bonus: +{style.effect.acBonus}
                </div>
              )}

              {style.effect.attackBonus && (
                <div className="text-xs text-muted-foreground mt-1">
                  <Sword className="w-3 h-3 inline mr-1" />
                  Attack Bonus: +{style.effect.attackBonus}
                </div>
              )}

              {style.effect.damageBonus && (
                <div className="text-xs text-muted-foreground mt-1">
                  <Sword className="w-3 h-3 inline mr-1" />
                  Damage Bonus: +{style.effect.damageBonus}
                </div>
              )}

              {style.effect.rerollDamage && (
                <div className="text-xs text-muted-foreground mt-1">
                  Reroll 1s and 2s on damage dice
                </div>
              )}

              {style.effect.protectionReaction && (
                <div className="text-xs text-muted-foreground mt-1">
                  Can use reaction to impose disadvantage on attacks against allies
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FightingStylesDisplay;
