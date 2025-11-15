import { Lightbulb, Star, Sparkles } from 'lucide-react';
import React from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface InspirationTrackerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * Compact inspiration tracker for main character sheet
 */
const InspirationTracker: React.FC<InspirationTrackerProps> = ({ character, onUpdate }) => {
  const { toast } = useToast();
  const hasInspiration = character?.inspiration || false;

  /**
   * Toggle inspiration state
   */
  const toggleInspiration = () => {
    const newInspirationState = !hasInspiration;

    onUpdate({
      ...character,
      inspiration: newInspirationState,
      personalityIntegration: {
        ...character?.personalityIntegration,
        activeTraits: character?.personalityIntegration?.activeTraits || [],
        inspirationTriggers: character?.personalityIntegration?.inspirationTriggers || [],
        lastInspiration: newInspirationState
          ? new Date().toISOString()
          : character?.personalityIntegration?.lastInspiration,
        inspirationHistory: character?.personalityIntegration?.inspirationHistory || [],
      },
    });

    toast({
      title: newInspirationState ? 'Inspiration Gained!' : 'Inspiration Used',
      description: newInspirationState
        ? 'You now have inspiration. Use it to gain advantage on a roll!'
        : 'Inspiration used. Act on your personality to earn more!',
    });
  };

  return (
    <Card className={`${hasInspiration ? 'border-gold-500 bg-gold-50 dark:bg-gold-950/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                hasInspiration
                  ? 'border-gold-500 bg-gold-100 dark:bg-gold-900/50'
                  : 'border-gray-300 bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Star
                className={`w-6 h-6 ${hasInspiration ? 'text-gold-500 animate-pulse' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Inspiration</span>
                <Badge variant={hasInspiration ? 'default' : 'secondary'}>
                  {hasInspiration ? 'Active' : 'None'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasInspiration ? 'Click to use for advantage' : 'Roleplay your traits to earn'}
              </p>
            </div>
          </div>

          <Button
            variant={hasInspiration ? 'default' : 'outline'}
            size="sm"
            onClick={toggleInspiration}
            className={hasInspiration ? 'bg-gold-600 hover:bg-gold-700' : ''}
          >
            {hasInspiration ? (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                Use
              </>
            ) : (
              'Award'
            )}
          </Button>
        </div>

        {hasInspiration && (
          <div className="mt-3 p-2 bg-gold-100 dark:bg-gold-900/30 rounded text-xs text-gold-700 dark:text-gold-300">
            <strong>Inspiration:</strong> Spend to gain advantage on one ability check, attack roll,
            or saving throw.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspirationTracker;
