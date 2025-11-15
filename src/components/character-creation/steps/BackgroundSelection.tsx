import { BookOpen, Check, Sparkles, Users, Scroll } from 'lucide-react';
import React from 'react';

import type { CharacterBackground } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Z_INDEX } from '@/constants/z-index';
import { useCharacter } from '@/contexts/CharacterContext';
import { backgrounds } from '@/data/backgroundOptions';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import logger from '@/lib/logger';

/**
 * Component for selecting character background during character creation
 * Displays available backgrounds with their features and handles selection
 */
const BackgroundSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  /**
   * Handles the selection of a background
   * Updates character state and shows confirmation toast
   */
  const handleBackgroundSelect = (background: CharacterBackground) => {
    logger.info('Selecting background:', background);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { background },
    });

    toast({
      title: 'Background Selected',
      description: `You have chosen the ${background.name} background.`,
      duration: 1000,
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-infinite-teal to-infinite-teal-dark rounded-full shadow-lg">
            <Scroll className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-infinite-teal to-infinite-teal-dark bg-clip-text text-transparent">
              Choose Your Background
            </h2>
            <p className="text-muted-foreground">Your past shapes your character's story</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="glass rounded-2xl border-2 border-infinite-teal/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-infinite-teal/20 rounded-full">
              <Sparkles className="w-4 h-4 text-infinite-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong>Your background</strong> provides skill proficiencies, tool proficiencies,
                languages, and a unique feature that reflects your character's history before
                becoming an adventurer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {backgrounds.map((background) => {
          const isSelected = state.character?.background?.id === background.id;

          return (
            <Card
              key={background.id}
              className={`glass rounded-2xl hover-lift cursor-pointer transition-all duration-300 border-2 ${
                isSelected
                  ? 'border-infinite-teal ring-4 ring-infinite-teal/20 shadow-xl'
                  : 'border-infinite-teal/20 hover:border-infinite-teal/50'
              }`}
              onClick={() => handleBackgroundSelect(background)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackgroundSelect(background);
                }
              }}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 z-[${Z_INDEX.DROPDOWN}] bg-infinite-teal text-white rounded-full p-2 shadow-lg`}
                >
                  <Check className="w-5 h-5" />
                </div>
              )}

              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-infinite-teal" />
                  <h3 className="text-xl font-bold">{background.name}</h3>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {background.description}
                </p>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div>
                    <p className="font-medium text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Skill Proficiencies:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {background.skillProficiencies.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {background.toolProficiencies.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Tool Proficiencies:</p>
                      <div className="flex flex-wrap gap-1">
                        {background.toolProficiencies.map((tool, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {background.languages > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-1">Languages:</p>
                      <p className="text-xs text-muted-foreground">
                        Choose {background.languages} additional language
                        {background.languages > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <p className="font-medium text-sm mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-infinite-gold" />
                      Feature: {background.feature.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {background.feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundSelection;
