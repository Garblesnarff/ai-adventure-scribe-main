import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectableCard } from '@/components/ui/selectable-card';
import { baseRaces } from '@/data/raceOptions';
import { CharacterRace, Subrace } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { cardContainer, cardItem } from '@/utils/animations';
import {
  Check, Users, Zap, Globe, Search, Mountain,
  Sparkles, Flame, Moon, Sun, Trees, Waves, Crown
} from 'lucide-react';
import { HalfElfAbilityChoice } from '../modals/HalfElfAbilityChoice';
import { VariantHumanChoice } from '../modals/VariantHumanChoice';
import type { AbilityScoreName } from '@/utils/racialAbilityBonuses';
import logger from '@/lib/logger';
import { Z_INDEX } from '@/constants/z-index';

/**
 * Get the appropriate icon for each race
 */
const getRaceIcon = (raceId: string) => {
  const iconMap: Record<string, React.ElementType> = {
    human: Users,
    elf: Trees,
    dwarf: Mountain,
    halfling: Sun,
    dragonborn: Flame,
    gnome: Sparkles,
    'half-elf': Moon,
    'half-orc': Zap,
    tiefling: Flame,
    celestialborn: Crown,
    astralborn: Sparkles,
    elementalborn: Waves,
  };
  return iconMap[raceId] || Users;
};

const RaceSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const [selectedBaseRace, setSelectedBaseRace] = useState<CharacterRace | null>(null);
  const [showSubraces, setShowSubraces] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Half-Elf ability choice modal state
  const [showHalfElfModal, setShowHalfElfModal] = useState(false);

  // Variant Human ability + feat choice modal state
  const [showVariantHumanModal, setShowVariantHumanModal] = useState(false);

  // Filter and search logic
  const filteredRaces = useMemo(() => {
    if (!searchQuery.trim()) return baseRaces;

    return baseRaces.filter(race =>
      race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      race.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      race.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  const handleBaseRaceSelect = (baseRace: CharacterRace) => {
    logger.info('Selecting base race:', baseRace);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { race: baseRace, subrace: null }
    });
    setSelectedBaseRace(baseRace);

    // Check if this is Half-Elf - requires ability choice
    if (baseRace.id === 'half-elf') {
      setShowHalfElfModal(true);
      return;
    }

    if (baseRace.subraces && baseRace.subraces.length > 0) {
      setShowSubraces(true);
      toast({
        title: "Base Race Selected",
        description: `You have chosen ${baseRace.name}. Now select a subrace.`,
        duration: 1000,
      });
      // Do NOT auto-scroll when showing subrace selection - user stays on same page
    } else {
      toast({
        title: "Race Selected",
        description: `You have chosen the ${baseRace.name} race.`,
        duration: 1000,
      });
      // Auto-scroll to navigation to proceed to next step
      scrollToNavigation();
    }
  };

  const handleSubraceSelect = (subrace: Subrace) => {
    logger.info('Selecting subrace:', subrace);

    // Check if this is Variant Human - requires ability + feat choice
    if (subrace.id === 'variant-human') {
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { subrace }
      });
      setShowSubraces(false);
      setShowVariantHumanModal(true);
      return;
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { subrace }
    });
    setShowSubraces(false);
    toast({
      title: "Subrace Selected",
      description: `You have chosen ${subrace.name}.`,
      duration: 1000,
    });
    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  const handleHalfElfAbilityChoice = (abilities: [AbilityScoreName, AbilityScoreName]) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        racialAbilityChoices: {
          ...state.character?.racialAbilityChoices,
          halfElf: abilities
        }
      }
    });
    toast({
      title: "Abilities Selected",
      description: `You have chosen +1 to ${abilities[0]} and ${abilities[1]}.`,
      duration: 2000,
    });
    scrollToNavigation();
  };

  const handleVariantHumanChoice = (abilities: [AbilityScoreName, AbilityScoreName], feat: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        racialAbilityChoices: {
          ...state.character?.racialAbilityChoices,
          variantHuman: abilities
        },
        feats: [feat]
      }
    });

    // Format feat name for display (convert kebab-case to Title Case)
    const featName = feat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    toast({
      title: "Variant Human Customization Complete",
      description: `You have chosen +1 to ${abilities[0]} and ${abilities[1]}, plus the ${featName} feat.`,
      duration: 3000,
    });
    scrollToNavigation();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Race</h2>
        <p className="text-muted-foreground">
          Your race determines ability score bonuses, traits, and cultural background
        </p>
      </div>

      {/* Search Bar */}
      {!showSubraces && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search races, traits, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="space-y-6">
        {!showSubraces ? (
          <motion.div
            variants={cardContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredRaces.map((baseRace) => {
              const isSelected = state.character?.race?.id === baseRace.id;
              const RaceIcon = getRaceIcon(baseRace.id);

              return (
                <motion.div key={baseRace.id} variants={cardItem}>
                  <SelectableCard
                    title={baseRace.name}
                    description={baseRace.description}
                    selected={isSelected}
                    onSelect={() => handleBaseRaceSelect(baseRace)}
                    icon={<RaceIcon className="w-6 h-6" />}
                    variant="fantasy"
                    size="lg"
                  >
                    {/* Ability Score Increases */}
                    {Object.keys(baseRace.abilityScoreIncrease).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                          <Badge
                            key={ability}
                            variant="gold"
                            className="text-xs capitalize"
                          >
                            +{bonus} {ability.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Key Stats */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{baseRace.speed}ft</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>{baseRace.languages.length} lang</span>
                      </div>
                    </div>

                    {/* Racial Traits Preview */}
                    <div className="mt-3 space-y-1">
                      {baseRace.traits.slice(0, 3).map((trait, index) => (
                        <Badge
                          key={index}
                          variant="purple"
                          className="text-xs mr-1"
                        >
                          {trait.split(':')[0]}
                        </Badge>
                      ))}
                      {baseRace.traits.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{baseRace.traits.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Subraces Indicator */}
                    {baseRace.subraces && baseRace.subraces.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-200/30 text-xs text-center text-muted-foreground">
                        {baseRace.subraces.length} subrace{baseRace.subraces.length > 1 ? 's' : ''} available
                      </div>
                    )}
                  </SelectableCard>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Choose Your Subrace</h2>
              <p className="text-muted-foreground">
                Select a subrace for {selectedBaseRace?.name} to gain additional abilities
              </p>
              <Button 
                variant="outline" 
                onClick={() => { setShowSubraces(false); setSelectedBaseRace(null); }}
                className="mt-4"
              >
                Back to Base Races
              </Button>
            </div>
            
            <motion.div
              variants={cardContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {selectedBaseRace?.subraces?.map((subrace) => {
                const isSelected = state.character?.subrace?.id === subrace.id;
                const RaceIcon = getRaceIcon(selectedBaseRace.id);

                return (
                  <motion.div key={subrace.id} variants={cardItem}>
                    <SelectableCard
                      title={subrace.name}
                      description={subrace.description}
                      selected={isSelected}
                      onSelect={() => handleSubraceSelect(subrace)}
                      icon={<RaceIcon className="w-6 h-6" />}
                      variant="fantasy"
                      size="lg"
                    >
                      {/* Ability Score Increases */}
                      {Object.keys(subrace.abilityScoreIncrease).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                            <Zap className="w-4 h-4 text-infinite-gold" />
                            <span>Subrace Bonuses</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(subrace.abilityScoreIncrease).map(([ability, bonus]) => (
                              <Badge
                                key={ability}
                                variant="gold"
                                className="text-xs capitalize"
                              >
                                +{bonus} {ability.substring(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Speed Override */}
                      {subrace.speed && (
                        <div className="flex items-center gap-2 mt-3 text-sm">
                          <Zap className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">Speed:</span>
                          <span className="text-muted-foreground">{subrace.speed} feet</span>
                        </div>
                      )}

                      {/* Subrace Traits */}
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold mb-2">Traits</h4>
                        <div className="space-y-1">
                          {subrace.traits.map((trait: string, index: number) => (
                            <Badge
                              key={index}
                              variant="purple"
                              className="text-xs mr-1"
                            >
                              {trait.split(':')[0]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </SelectableCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </div>
      {/* Selected Race/Subrace Summary */}
      {(state.character?.race || state.character?.subrace) && (
        <Card className="p-4 bg-primary/5">
          <h3 className="font-semibold mb-2">
            Selected: {state.character.subrace ? `${state.character.subrace.name} (${state.character.race?.name})` : state.character.race?.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            You'll gain the racial traits and ability score bonuses shown above when you complete character creation.
          </p>
        </Card>
      )}

      {/* Half-Elf Ability Choice Modal */}
      <HalfElfAbilityChoice
        isOpen={showHalfElfModal}
        onClose={() => setShowHalfElfModal(false)}
        onConfirm={handleHalfElfAbilityChoice}
        currentChoices={state.character?.racialAbilityChoices?.halfElf as [AbilityScoreName, AbilityScoreName] | undefined}
      />

      {/* Variant Human Ability + Feat Choice Modal */}
      <VariantHumanChoice
        isOpen={showVariantHumanModal}
        onClose={() => setShowVariantHumanModal(false)}
        onConfirm={handleVariantHumanChoice}
        currentChoices={{
          abilities: state.character?.racialAbilityChoices?.variantHuman as [AbilityScoreName, AbilityScoreName] | undefined,
          feat: state.character?.feats?.[0]
        }}
      />
    </div>
  );
};

export default RaceSelection;
