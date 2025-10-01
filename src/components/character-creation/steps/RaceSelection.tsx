import React, { useState, useMemo } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { baseRaces } from '@/data/raceOptions';
import { CharacterRace, Subrace } from '@/types/character';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { Check, Users, Zap, Globe, Search, Filter, Grid, List, Heart, Star, Eye } from 'lucide-react';
import { HalfElfAbilityChoice } from '../modals/HalfElfAbilityChoice';
import { VariantHumanChoice } from '../modals/VariantHumanChoice';
import type { AbilityScoreName } from '@/utils/racialAbilityBonuses';

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

  // Half-Elf ability choice modal state
  const [showHalfElfModal, setShowHalfElfModal] = useState(false);

  // Variant Human ability + feat choice modal state
  const [showVariantHumanModal, setShowVariantHumanModal] = useState(false);

  // Race categories for filtering
  const raceCategories = [
    { id: 'all', name: 'All Races', count: baseRaces.length },
    { id: 'core', name: 'Core Races', count: baseRaces.filter(r => ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'half-elf', 'half-orc'].includes(r.id)).length },
    { id: 'exotic', name: 'Exotic Races', count: baseRaces.filter(r => ['tiefling', 'gnome', 'elementalborn', 'celestialborn', 'astralborn'].includes(r.id)).length },
    { id: 'planar', name: 'Planar Races', count: baseRaces.filter(r => ['celestialborn', 'astralborn', 'tiefling'].includes(r.id)).length },
  ];

  // Filter and search logic
  const filteredRaces = useMemo(() => {
    let filtered = baseRaces;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(race =>
        race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        race.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        race.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      const categoryRaces = {
        core: ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'half-elf', 'half-orc'],
        exotic: ['tiefling', 'gnome', 'elementalborn', 'celestialborn', 'astralborn'],
        planar: ['celestialborn', 'astralborn', 'tiefling']
      };
      filtered = filtered.filter(race => categoryRaces[selectedCategory as keyof typeof categoryRaces]?.includes(race.id));
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
    if (comparisonRaces.length < 3 && !comparisonRaces.find(r => r.id === race.id)) {
      setComparisonRaces([...comparisonRaces, race]);
    }
  };

  const removeFromComparison = (raceId: string) => {
    setComparisonRaces(comparisonRaces.filter(r => r.id !== raceId));
  };

  const handleBaseRaceSelect = (baseRace: CharacterRace) => {
    console.log('Selecting base race:', baseRace);
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
    console.log('Selecting subrace:', subrace);

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
                  variant={selectedCategory === category.id ? "default" : "outline"}
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
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-x"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'compact' ? "default" : "ghost"}
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
          <div className={
            viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' :
            viewMode === 'list' ? 'space-y-4' :
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          }>
              {filteredRaces.map((baseRace) => {
                const isSelected = state.character?.race?.id === baseRace.id;
                const isFavorite = favorites.has(baseRace.id);

                // Different card layouts based on view mode
                if (viewMode === 'list') {
                  return (
                    <Card
                      key={baseRace.id}
                      className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                        isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleBaseRaceSelect(baseRace)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleBaseRaceSelect(baseRace);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <Users className="w-5 h-5 text-primary flex-shrink-0" />
                              <h3 className="text-xl font-bold truncate">{baseRace.name}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                                <Badge key={ability} variant="secondary" className="text-xs">
                                  {ability.substring(0, 3)} +{bonus}
                                </Badge>
                              ))}
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
                              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToComparison(baseRace);
                              }}
                              className="p-1"
                              disabled={comparisonRaces.length >= 3 && !comparisonRaces.find(r => r.id === baseRace.id)}
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
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{baseRace.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
                      className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-4 ${
                        isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleBaseRaceSelect(baseRace)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleBaseRaceSelect(baseRace);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <h3 className="font-bold text-lg">{baseRace.name}</h3>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                          <Badge key={ability} variant="secondary" className="text-xs">
                            +{bonus} {ability.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{baseRace.description}</p>
                      {baseRace.subraces && baseRace.subraces.length > 0 && (
                        <div className="text-xs text-muted-foreground text-center mt-2 pt-1 border-t">
                          {baseRace.subraces.length} subraces
                        </div>
                      )}
                    </Card>
                  );
                }

                // Default grid view
                return (
                  <Card
                    key={baseRace.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                      isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleBaseRaceSelect(baseRace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleBaseRaceSelect(baseRace);
                      }
                    }}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <h3 className="text-2xl font-bold">{baseRace.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(baseRace.id);
                            }}
                            className="p-1"
                          >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToComparison(baseRace);
                            }}
                            className="p-1"
                            disabled={comparisonRaces.length >= 3 && !comparisonRaces.find(r => r.id === baseRace.id)}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{baseRace.description}</p>

                      {/* Ability Score Increases */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <h4 className="font-semibold">Ability Score Increases</h4>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(baseRace.abilityScoreIncrease).map(([ability, bonus]) => (
                            <Badge key={ability} variant="secondary" className="capitalize">
                              {ability.substring(0, 3)} +{bonus}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Speed */}
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">Speed:</span> {baseRace.speed} feet
                        </p>
                      </div>

                      {/* Languages */}
                      {baseRace.languages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <h4 className="font-semibold">Languages</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {baseRace.languages.map((language: string, index: number) => (
                              <Badge key={index} variant="outline">{language}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Racial Traits */}
                      <div>
                        <h4 className="font-semibold mb-2">Racial Traits</h4>
                        <div className="space-y-1">
                          {baseRace.traits.slice(0, 3).map((trait: string, index: number) => (
                            <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                              <span className="font-medium">{trait.split(':')[0]}:</span>
                              <span className="text-muted-foreground ml-1">
                                {trait.split(':')[1] || trait}
                              </span>
                            </div>
                          ))}
                          {baseRace.traits.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{baseRace.traits.length - 3} more traits
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subraces Indicator */}
                      {baseRace.subraces && baseRace.subraces.length > 0 && (
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          Has Subraces ({baseRace.subraces.length})
                        </div>
                      )}
                    </CardContent>
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
                onClick={() => { setShowSubraces(false); setSelectedBaseRace(null); }}
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
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative ${
                      isSelected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubraceSelect(subrace)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSubraceSelect(subrace);
                      }
                    }}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h3 className="text-2xl font-bold">{subrace.name}</h3>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{subrace.description}</p>
                      
                      {/* Ability Score Increases */}
                      {Object.keys(subrace.abilityScoreIncrease).length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <h4 className="font-semibold">Subrace Ability Increases</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(subrace.abilityScoreIncrease).map(([ability, bonus]) => (
                              <Badge key={ability} variant="secondary" className="capitalize">
                                {ability.substring(0, 3)} +{bonus}
                              </Badge>
                            ))}
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
                        <h4 className="font-semibold mb-2">Subrace Traits</h4>
                        <div className="space-y-1">
                          {subrace.traits.map((trait: string, index: number) => (
                            <div key={index} className="text-sm p-2 bg-muted/30 rounded">
                              <span className="font-medium">{trait.split(':')[0]}:</span>
                              <span className="text-muted-foreground ml-1">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonRaces([])}
            >
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
