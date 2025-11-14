import { Sword, Shield, Heart, Zap, Check, Sparkles, BookOpen } from 'lucide-react';
import React, { useState } from 'react';

import type { CharacterClass } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Z_INDEX } from '@/constants/z-index';
import { useCharacter } from '@/contexts/CharacterContext';
import { classes } from '@/data/classOptions';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import logger from '@/lib/logger';

const ClassSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

  const handleClassSelect = (characterClass: CharacterClass) => {
    logger.info('🎯 handleClassSelect called with:', characterClass);
    logger.debug('🎯 Current character state before dispatch:', state.character);
    logger.debug('🎯 Character class before update:', state.character?.class);

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { class: characterClass },
    });

    logger.debug('🎯 Dispatched UPDATE_CHARACTER with payload:', { class: characterClass });

    // Add a small delay to check if state updated
    setTimeout(() => {
      logger.debug('🎯 Character state after dispatch (with delay):', state.character);
      logger.debug('🎯 Character class after update:', state.character?.class);
    }, 100);

    toast({
      title: 'Class Selected',
      description: `You have chosen the ${characterClass.name} class.`,
      duration: 1000,
    });

    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  const getClassIcon = (classId: string) => {
    const iconMap: Record<string, React.ElementType> = {
      fighter: Sword,
      wizard: BookOpen,
      cleric: Sparkles,
      rogue: Zap,
      paladin: Shield,
      barbarian: Heart,
    };
    return iconMap[classId] || Sword;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-infinite-gold to-infinite-gold-dark rounded-full shadow-lg">
            <Sword className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-infinite-gold to-infinite-gold-dark bg-clip-text text-transparent">
              Choose Your Class
            </h2>
            <p className="text-muted-foreground">
              Select the path that defines your abilities and playstyle
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="glass rounded-2xl border-2 border-infinite-gold/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-infinite-gold/20 rounded-full">
              <BookOpen className="w-4 h-4 text-infinite-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong>Choose wisely!</strong> Your class determines your combat abilities, skills,
                and role in the party. Each class has unique features and progression paths.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((characterClass) => {
          const isSelected = state.character?.class?.id === characterClass.id;
          const isHovered = hoveredClassId === characterClass.id;
          const ClassIcon = getClassIcon(characterClass.id);

          logger.debug(`Class ${characterClass.id} selected:`, isSelected);

          return (
            <Card
              key={characterClass.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 relative overflow-hidden ${
                isSelected
                  ? 'border-primary ring-4 ring-primary/20 shadow-xl scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:scale-[1.02]'
              }`}
              onClick={() => handleClassSelect(characterClass)}
              onMouseEnter={() => setHoveredClassId(characterClass.id)}
              onMouseLeave={() => setHoveredClassId(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClassSelect(characterClass);
                }
              }}
              style={
                characterClass.backgroundImage
                  ? {
                      backgroundImage: `url(${characterClass.backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {/* Background Overlay */}
              {characterClass.backgroundImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 z-0 transition-opacity group-hover:opacity-90" />
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 z-[${Z_INDEX.CARD_HOVER}] bg-primary text-primary-foreground rounded-full p-2 shadow-lg`}
                >
                  <Check className="w-5 h-5" />
                </div>
              )}

              <CardHeader className={`relative z-[${Z_INDEX.OVERLAY_EFFECT}] pb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${characterClass.backgroundImage ? 'bg-white/20 backdrop-blur-sm' : 'bg-primary/10'}`}
                    >
                      <ClassIcon
                        className={`w-6 h-6 ${characterClass.backgroundImage ? 'text-white' : 'text-primary'}`}
                      />
                    </div>
                    <CardTitle
                      className={`text-2xl font-bold ${characterClass.backgroundImage ? 'text-white drop-shadow-lg' : ''}`}
                    >
                      {characterClass.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className={`relative z-[${Z_INDEX.OVERLAY_EFFECT}] space-y-4`}>
                <p
                  className={`text-sm leading-relaxed ${characterClass.backgroundImage ? 'text-gray-100' : 'text-muted-foreground'}`}
                >
                  {characterClass.description}
                </p>

                {/* Stats Section */}
                <div
                  className={`space-y-3 pt-3 border-t ${characterClass.backgroundImage ? 'border-white/20' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium flex items-center gap-2 ${characterClass.backgroundImage ? 'text-gray-200' : ''}`}
                    >
                      <Heart className="w-4 h-4" />
                      Hit Die:
                    </span>
                    <Badge
                      variant={characterClass.backgroundImage ? 'secondary' : 'outline'}
                      className={
                        characterClass.backgroundImage
                          ? 'bg-white/20 text-white border-white/30'
                          : ''
                      }
                    >
                      d{characterClass.hitDie}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium flex items-center gap-2 ${characterClass.backgroundImage ? 'text-gray-200' : ''}`}
                    >
                      <Zap className="w-4 h-4" />
                      Primary Ability:
                    </span>
                    <Badge
                      variant={characterClass.backgroundImage ? 'secondary' : 'outline'}
                      className={`capitalize ${characterClass.backgroundImage ? 'bg-white/20 text-white border-white/30' : ''}`}
                    >
                      {String(characterClass.primaryAbility).charAt(0).toUpperCase() +
                        String(characterClass.primaryAbility).slice(1)}
                    </Badge>
                  </div>

                  <div>
                    <div
                      className={`text-sm font-medium mb-2 flex items-center gap-2 ${characterClass.backgroundImage ? 'text-gray-200' : ''}`}
                    >
                      <Shield className="w-4 h-4" />
                      Saving Throws:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {characterClass.savingThrowProficiencies.map((save, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className={`capitalize text-xs ${characterClass.backgroundImage ? 'bg-white/20 text-white border-white/30' : ''}`}
                        >
                          {String(save)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hover Indicator */}
                {isHovered && !isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-pulse" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Class Summary */}
      {state.character?.class && (
        <Card className="bg-primary/5 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Class</p>
                  <p className="text-xl font-bold">{state.character.class.name}</p>
                </div>
              </div>
              <Badge variant="default" className="text-sm px-4 py-2">
                Ready to Continue
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassSelection;
