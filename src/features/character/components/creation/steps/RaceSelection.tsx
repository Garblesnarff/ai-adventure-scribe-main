import {
  Check,
  Users,
  Zap,
  Globe,
  Search,
  Filter,
  Grid,
  List,
  Heart,
  Star,
  Eye,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { HalfElfAbilityChoice } from '../modals/HalfElfAbilityChoice';
import { VariantHumanChoice } from '../modals/VariantHumanChoice';

import type { AbilityScoreName } from '@/utils/racialAbilityBonuses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Z_INDEX } from '@/constants/z-index';
import { useCharacter } from '@/contexts/CharacterContext';
import { baseRaces } from '@/data/raceOptions';
import logger from '@/lib/logger';
import type { CharacterRace, Subrace } from '@/types/character';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

const RaceSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const [selectedBaseRace, setSelectedBaseRace] = useState<CharacterRace | null>(null);
  const [showSubraces, setShowSubraces] = useState(false);

  // New state for UX improvements
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('compact');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonRaces, setComparisonRaces] = useState<CharacterRace[]>([]);
  const [hoveredRaceId, setHoveredRaceId] = useState<string | null>(null);

  // Half-Elf ability choice modal state
  const [showHalfElfModal, setShowHalfElfModal] = useState(false);

  // Variant Human ability + feat choice modal state
  const [showVariantHumanModal, setShowVariantHumanModal] = useState(false);

  // Race categories for filtering
  const raceCategories = [
    { id: 'all', name: 'All Races', count: baseRaces.length },
    {
      id: 'core',
      name: 'Core Races',
      count: baseRaces.filter((r) =>
        ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'half-elf', 'half-orc'].includes(r.id),
      ).length,
    },
    {
      id: 'exotic',
      name: 'Exotic Races',
      count: baseRaces.filter((r) =>
        ['tiefling', 'gnome', 'elementalborn', 'celestialborn', 'astralborn'].includes(r.id),
      ).length,
    },
    {
      id: 'planar',
      name: 'Planar Races',
      count: baseRaces.filter((r) => ['celestialborn', 'astralborn', 'tiefling'].includes(r.id))
        .length,
    },
  ];

  // Filter and search logic
  const filteredRaces = useMemo(() => {
    let filtered = baseRaces;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (race) =>
          race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          race.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          race.traits.some((trait) => trait.toLowerCase().includes(searchQuery.toLowerCase())),
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      const categoryRaces = {
        core: ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'half-elf', 'half-orc'],
        exotic: ['tiefling', 'gnome', 'elementalborn', 'celestialborn', 'astralborn'],
        planar: ['celestialborn', 'astralborn', 'tiefling'],
      };
      filtered = filtered.filter((race) =>
        categoryRaces[selectedCategory as keyof typeof categoryRaces]?.includes(race.id),
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  // Helper functions
  const toggleFavorite = (raceId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(raceId)) {
      newFavorites.delete(raceId);
    } else {
      newFavorites.add(raceId);
    }
    setFavorites(newFavorites);
  };

  const addToComparison = (race: CharacterRace) => {
    if (comparisonRaces.length < 3 && !comparisonRaces.find((r) => r.id === race.id)) {
      setComparisonRaces([...comparisonRaces, race]);
    }
  };

  const removeFromComparison = (raceId: string) => {
    setComparisonRaces(comparisonRaces.filter((r) => r.id !== raceId));
  };

  const handleBaseRaceSelect = (baseRace: CharacterRace) => {
    logger.info('Selecting base race:', baseRace);
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { race: baseRace, subrace: null },
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
        title: 'Base Race Selected',
        description: `You have chosen ${baseRace.name}. Now select a subrace.`,
        duration: 1000,
      });
      // Do NOT auto-scroll when showing subrace selection - user stays on same page
    } else {
      toast({
        title: 'Race Selected',
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
        payload: { subrace },
      });
      setShowSubraces(false);
      setShowVariantHumanModal(true);
      return;
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { subrace },
    });
    setShowSubraces(false);
    toast({
      title: 'Subrace Selected',
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
          halfElf: abilities,
        },
      },
    });
    toast({
      title: 'Abilities Selected',
      description: `You have chosen +1 to ${abilities[0]} and ${abilities[1]}.`,
      duration: 2000,
    });
    scrollToNavigation();
  };

  const handleVariantHumanChoice = (
    abilities: [AbilityScoreName, AbilityScoreName],
    feat: string,
  ) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        racialAbilityChoices: {
          ...state.character?.racialAbilityChoices,
          variantHuman: abilities,
        },
        feats: [feat],
      },
    });

    // Format feat name for display (convert kebab-case to Title Case)
    const featName = feat
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    toast({
      title: 'Variant Human Customization Complete',
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

      {/* Enhanced Navigation & Controls */}
      {!showSubraces && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search races, traits, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters & View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {raceCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="text-xs"
                >
                  {category.name} ({category.count})
                </Button>
              ))}
            </div>

            {/* View Mode Toggles */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-x"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'compact' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('compact')}
                  className="rounded-l-none"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredRaces.length} of {baseRaces.length} races
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {!showSubraces ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                : viewMode === 'list'
                  ? 'space-y-4'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            }
          >
            {filteredRaces.map((baseRace) => {
              const isSelected = state.character?.race?.id === baseRace.id;
              const isFavorite = favorites.has(baseRace.id);
              const isHovered = hoveredRaceId === baseRace.id;

              // Different card layouts based on view mode
              if (viewMode === 'list') {
                return (
                  <Card
                    key={baseRace.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleBaseRaceSelect(baseRace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleBaseRaceSelect(baseRace);
                      }
                    }}
                    style={
                      baseRace.backgroundImage
                        ? {
                            backgroundImage: `url(${baseRace.backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {baseRace.backgroundImage && (
                      <div className="absolute inset-0 bg-black/60 z-0" />
                    )}
                    <CardContent
                      className={`p-4 relative z-[${Z_INDEX.OVERLAY_EFFECT}] ${baseRace.backgroundImage ? 'text-white' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users
                              className={`w-5 h-5 flex-shrink-0 ${baseRace.backgroundImage ? 'text-yellow-400' : 'text-primary'}`}
                            />
                            <h3 className="text-xl font-bold truncate">{baseRace.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {Object.entries(baseRace.abilityScoreIncrease).map(
                              ([ability, bonus]) => (
                                <Badge
                                  key={ability}
                                  variant="secondary"
                                  className={`text-xs ${baseRace.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                                >
                                  {ability.substring(0, 3)} +{bonus}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(baseRace.id);
                            }}
                            className="p-1"
                          >
                            <Heart
                              className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToComparison(baseRace);
                            }}
                            className="p-1"
                            disabled={
                              comparisonRaces.length >= 3 &&
                              !comparisonRaces.find((r) => r.id === baseRace.id)
                            }
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          {isSelected && (
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-sm mt-2 line-clamp-2 ${baseRace.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                      >
                        {baseRace.description}
                      </p>
                      <div
                        className={`flex items-center gap-4 mt-2 text-xs ${baseRace.backgroundImage ? 'text-gray-300' : 'text-muted-foreground'}`}
                      >
                        <span>Speed: {baseRace.speed}ft</span>
                        <span>{baseRace.languages.length} languages</span>
                        {baseRace.subraces && baseRace.subraces.length > 0 && (
                          <span>{baseRace.subraces.length} subraces</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (viewMode === 'compact') {
                return (
                  <Card
                    key={baseRace.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg ring-4 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleBaseRaceSelect(baseRace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleBaseRaceSelect(baseRace);
                      }
                    }}
                    style={
                      baseRace.backgroundImage
                        ? {
                            backgroundImage: `url(${baseRace.backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {baseRace.backgroundImage && (
                      <div className="absolute inset-0 bg-black/60 z-0" />
                    )}
                    <div className="p-4">
                      <div
                        className={`flex items-center justify-between mb-3 relative z-[${Z_INDEX.OVERLAY_EFFECT}] ${baseRace.backgroundImage ? 'text-white' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Users
                            className={`w-5 h-5 ${baseRace.backgroundImage ? 'text-yellow-400' : 'text-primary'}`}
                          />
                          <h3 className="font-bold text-lg">{baseRace.name}</h3>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex flex-wrap gap-1.5 mb-3 relative z-[${Z_INDEX.OVERLAY_EFFECT}]`}
                      >
                        {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                          <Badge
                            key={ability}
                            variant="secondary"
                            className={`text-xs font-semibold ${baseRace.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                          >
                            +{bonus} {ability.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                      <p
                        className={`text-sm line-clamp-2 relative z-[${Z_INDEX.OVERLAY_EFFECT}] leading-relaxed ${baseRace.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                      >
                        {baseRace.description}
                      </p>
                      {baseRace.subraces && baseRace.subraces.length > 0 && (
                        <div
                          className={`text-xs text-center mt-3 pt-2 border-t relative z-[${Z_INDEX.OVERLAY_EFFECT}] ${baseRace.backgroundImage ? 'text-gray-300 border-gray-400' : 'text-muted-foreground border-border'}`}
                        >
                          {baseRace.subraces.length} subrace
                          {baseRace.subraces.length > 1 ? 's' : ''} available
                        </div>
                      )}
                    </div>
                  </Card>
                );
              }

              // Default grid view
              return (
                <Card
                  key={baseRace.id}
                  className={`race-card group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                    isSelected
                      ? 'border-primary shadow-lg'
                      : 'border-border/30 hover:border-infinite-purple/50'
                  }`}
                  style={{
                    padding: 0,
                    ...(baseRace.backgroundImage
                      ? {
                          backgroundImage: `url(${baseRace.backgroundImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}),
                  }}
                  onClick={() => handleBaseRaceSelect(baseRace)}
                  onMouseEnter={() => setHoveredRaceId(baseRace.id)}
                  onMouseLeave={() => setHoveredRaceId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBaseRaceSelect(baseRace);
                    }
                  }}
                >
                  {/* Edge blur overlay - creates vignette effect without color */}
                  <div
                    className="absolute inset-0"
                    style={{
                      boxShadow: 'inset 0 0 60px 20px rgba(0, 0, 0, 0.3)',
                    }}
                  />

                  {/* Top-right indicators */}
                  <div
                    className={`absolute top-3 right-3 z-[${Z_INDEX.CARD_HOVER}] flex items-center gap-2`}
                  >
                    {/* Favorite and comparison buttons */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(baseRace.id);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20"
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToComparison(baseRace);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20"
                      disabled={
                        comparisonRaces.length >= 3 &&
                        !comparisonRaces.find((r) => r.id === baseRace.id)
                      }
                    >
                      <Star className="w-4 h-4 text-white" />
                    </Button>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Hover popup */}
                  <div
                    className={`hover-popup ${isHovered ? `opacity-100 scale-100 pointer-events-auto z-[${Z_INDEX.CARD_HOVER}]` : 'opacity-0 scale-95 pointer-events-none'} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out`}
                  >
                    <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-border w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto">
                      {/* Race name */}
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-infinite-purple flex-shrink-0" />
                        <h3 className="text-lg font-bold text-foreground">{baseRace.name}</h3>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-foreground mb-2 leading-snug">
                        {baseRace.description}
                      </p>

                      {/* Ability Score Increases */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <h4 className="font-semibold text-foreground text-xs">
                            Ability Score Increases
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                            <Badge
                              key={ability}
                              variant="secondary"
                              className="capitalize text-xs py-0 px-1.5"
                            >
                              {ability.substring(0, 3)} +{bonus}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Speed */}
                      <p className="text-xs text-foreground mb-2">
                        <span className="font-medium">Speed:</span> {baseRace.speed} feet
                      </p>

                      {/* Languages */}
                      {baseRace.languages.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <h4 className="font-semibold text-foreground text-xs">Languages</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {baseRace.languages.map((language: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs py-0 px-1.5">
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Racial Traits */}
                      <div className="mb-2">
                        <h4 className="font-semibold text-foreground text-xs mb-1">
                          Racial Traits
                        </h4>
                        <div className="space-y-1">
                          {baseRace.traits.map((trait: string, index: number) => (
                            <div
                              key={index}
                              className="text-xs p-1.5 bg-muted/30 rounded leading-snug"
                            >
                              <span className="font-medium">{trait.split(':')[0]}</span>
                              {trait.includes(':') && (
                                <span className="text-muted-foreground">
                                  : {trait.split(':').slice(1).join(':')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Subraces Indicator */}
                      {baseRace.subraces && baseRace.subraces.length > 0 && (
                        <div className="text-xs text-center pt-1.5 border-t text-muted-foreground">
                          Has {baseRace.subraces.length} subrace
                          {baseRace.subraces.length > 1 ? 's' : ''} available
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Choose Your Subrace</h2>
              <p className="text-muted-foreground">
                Select a subrace for {selectedBaseRace?.name} to gain additional abilities
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubraces(false);
                  setSelectedBaseRace(null);
                }}
                className="mt-4"
              >
                Back to Base Races
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedBaseRace?.subraces?.map((subrace) => {
                const isSelected = state.character?.subrace?.id === subrace.id;

                return (
                  <Card
                    key={subrace.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubraceSelect(subrace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSubraceSelect(subrace);
                      }
                    }}
                    style={
                      subrace.backgroundImage
                        ? {
                            backgroundImage: `url(${subrace.backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {subrace.backgroundImage && (
                      <div className="absolute inset-0 bg-black/50 z-0" />
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    <CardHeader className={`relative z-[${Z_INDEX.OVERLAY_EFFECT}]`}>
                      <div className="flex items-center gap-2">
                        <Users
                          className={`w-5 h-5 ${subrace.backgroundImage ? 'text-yellow-400' : 'text-primary'}`}
                        />
                        <h3
                          className={`text-2xl font-bold ${subrace.backgroundImage ? 'text-white' : ''}`}
                        >
                          {subrace.name}
                        </h3>
                      </div>
                    </CardHeader>

                    <CardContent className={`space-y-4 relative z-[${Z_INDEX.OVERLAY_EFFECT}]`}>
                      <p
                        className={`${subrace.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                      >
                        {subrace.description}
                      </p>

                      {/* Ability Score Increases */}
                      {Object.keys(subrace.abilityScoreIncrease).length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap
                              className={`w-4 h-4 ${subrace.backgroundImage ? 'text-yellow-400' : 'text-orange-500'}`}
                            />
                            <h4
                              className={`font-semibold ${subrace.backgroundImage ? 'text-white drop-shadow' : ''}`}
                            >
                              Subrace Ability Increases
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(subrace.abilityScoreIncrease).map(
                              ([ability, bonus]) => (
                                <Badge
                                  key={ability}
                                  variant="secondary"
                                  className={`capitalize ${subrace.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                                >
                                  {ability.substring(0, 3)} +{bonus}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Speed Override */}
                      {subrace.speed && (
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Speed:</span> {subrace.speed} feet
                          </p>
                        </div>
                      )}

                      {/* Subrace Traits */}
                      <div>
                        <h4
                          className={`font-semibold mb-2 ${subrace.backgroundImage ? 'text-white drop-shadow' : ''}`}
                        >
                          Subrace Traits
                        </h4>
                        <div className="space-y-1">
                          {subrace.traits.map((trait: string, index: number) => (
                            <div
                              key={index}
                              className={`text-sm p-2 rounded ${subrace.backgroundImage ? 'bg-white/20 text-white' : 'bg-muted/30'}`}
                            >
                              <span className="font-medium">{trait.split(':')[0]}:</span>
                              <span
                                className={`${subrace.backgroundImage ? 'text-gray-100' : 'text-muted-foreground'} ml-1`}
                              >
                                {trait.split(':')[1] || trait}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Comparison Mode */}
      {comparisonRaces.length > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Race Comparison ({comparisonRaces.length}/3)</h3>
            <Button variant="outline" size="sm" onClick={() => setComparisonRaces([])}>
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonRaces.map((race) => (
              <Card key={race.id} className="p-3 border-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{race.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromComparison(race.id)}
                    className="p-1 h-auto"
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(race.abilityScoreIncrease).map(([ability, bonus]) => (
                      <Badge key={ability} variant="secondary" className="text-xs">
                        {ability.substring(0, 3)} +{bonus}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{race.description}</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Speed: {race.speed}ft</span>
                    <span>{race.languages.length} languages</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Race/Subrace Summary */}
      {(state.character?.race || state.character?.subrace) && (
        <Card className="p-4 bg-primary/5">
          <h3 className="font-semibold mb-2">
            Selected:{' '}
            {state.character.subrace
              ? `${state.character.subrace.name} (${state.character.race?.name})`
              : state.character.race?.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            You'll gain the racial traits and ability score bonuses shown above when you complete
            character creation.
          </p>
        </Card>
      )}

      {/* Half-Elf Ability Choice Modal */}
      <HalfElfAbilityChoice
        isOpen={showHalfElfModal}
        onClose={() => setShowHalfElfModal(false)}
        onConfirm={handleHalfElfAbilityChoice}
        currentChoices={
          state.character?.racialAbilityChoices?.halfElf as
            | [AbilityScoreName, AbilityScoreName]
            | undefined
        }
      />

      {/* Variant Human Ability + Feat Choice Modal */}
      <VariantHumanChoice
        isOpen={showVariantHumanModal}
        onClose={() => setShowVariantHumanModal(false)}
        onConfirm={handleVariantHumanChoice}
        currentChoices={{
          abilities: state.character?.racialAbilityChoices?.variantHuman as
            | [AbilityScoreName, AbilityScoreName]
            | undefined,
          feat: state.character?.feats?.[0],
        }}
      />
    </div>
  );
};

export default RaceSelection;
