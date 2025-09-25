import React, { useState, useEffect } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useSpellSelection } from '@/hooks/useSpellSelection';
import SpellCategorySection from '@/components/spells/SpellCategorySection';
import SpellFilterPanel, { SpellFilters } from '@/components/spells/SpellFilterPanel';
import SpellSearchBar from '@/components/spells/SpellSearchBar';
import { getSpellValidationRules } from '@/utils/spell-validation';
import { CharacterClass, Spell } from '@/types/character';
import {
  Wand2,
  Sparkles,
  BookOpen,
  Info,
  Users,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

/**
 * Enhanced SpellSelection component for spellcasting classes during character creation
 * Features:
 * - Tabbed interface for cantrips, spells, and racial spells
 * - Advanced search and filtering capabilities
 * - Real-time validation with clear feedback
 * - Visual spell indicators and tooltips
 * - Mobile-responsive design
 * - Integration with comprehensive spell validation system
 */
const SpellSelection: React.FC = () => {
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cantrips');

  // Use the enhanced spell selection hook
  const {
    character,
    isSpellcaster,
    spellcastingInfo,
    availableCantrips,
    availableSpells,
    racialSpells,
    isLoadingSpells,
    spellsError,
    selectedCantrips,
    selectedSpells,
    toggleCantrip,
    toggleSpell,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredCantrips,
    filteredSpells,
    validation,
    canProceed,
    updateCharacterSpells,
    refetchSpells
  } = useSpellSelection();

  const currentClass = character?.class as CharacterClass | undefined;

  // Get available schools for filtering
  const availableSchools = Array.from(
    new Set([...availableCantrips, ...availableSpells].map(spell => spell.school))
  ).sort();

  // Check if character has racial spells
  const hasRacialSpells = racialSpells.cantrips.length > 0 || racialSpells.bonusCantrips > 0;
  const totalRacialCantrips = racialSpells.cantrips.length + racialSpells.bonusCantrips;

  // Auto-save when valid selection is made
  useEffect(() => {
    console.log('🎯 [SpellSelection] Auto-save check:', {
      canProceed,
      validationValid: validation.valid,
      selectedCantrips: selectedCantrips,
      selectedSpells: selectedSpells,
      cantripCount: selectedCantrips.length,
      spellCount: selectedSpells.length
    });

    if (canProceed && validation.valid) {
      console.log('✅ [SpellSelection] Triggering updateCharacterSpells');
      updateCharacterSpells();
    }
  }, [canProceed, validation.valid, updateCharacterSpells]);

  // Show validation feedback
  useEffect(() => {
    if (validation.errors.length > 0) {
      const errorMessage = validation.errors[0].message;
      toast({
        title: 'Selection Issue',
        description: errorMessage,
        variant: 'destructive',
      });
    } else if (validation.valid && (selectedCantrips.length > 0 || selectedSpells.length > 0)) {
      toast({
        title: 'Spells Updated',
        description: 'Your spell selection has been saved.',
      });
      scrollToNavigation();
    }
  }, [validation, toast, scrollToNavigation, selectedCantrips.length, selectedSpells.length]);

  // Handle manual save
  const handleManualSave = () => {
    updateCharacterSpells();
  };

  // Show loading state
  if (isLoadingSpells) {
    return (
      <div className="text-center space-y-4">
        <Wand2 className="w-16 h-16 mx-auto text-purple-500 animate-pulse" />
        <h2 className="text-2xl font-bold">Loading Spells...</h2>
        <p className="text-muted-foreground">
          Fetching available spells for your {currentClass?.name} class.
        </p>
      </div>
    );
  }

  // Show error state
  if (spellsError) {
    return (
      <div className="text-center space-y-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
        <h2 className="text-2xl font-bold">Failed to Load Spells</h2>
        <p className="text-muted-foreground">
          {spellsError}
        </p>
        <Button
          onClick={() => refetchSpells()}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // If not a spellcaster and no racial spells, don't show this step
  if (!isSpellcaster && !hasRacialSpells) {
    return (
      <div className="text-center space-y-4">
        <Wand2 className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Spells to Select</h2>
        <p className="text-muted-foreground">
          Your {currentClass?.name} class is not a spellcasting class at 1st level.
        </p>
        <p className="text-sm text-muted-foreground">
          You can proceed to the next step of character creation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Starting Spells</h2>
        <p className="text-muted-foreground">
          As a {currentClass?.name}, you begin with magical knowledge
        </p>
      </div>

      {/* Class Spellcasting Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            {currentClass?.name} Spellcasting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(spellcastingInfo?.cantripsKnown || 0) > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(spellcastingInfo?.cantripsKnown || 0) + totalRacialCantrips}
                </div>
                <div className="text-sm text-muted-foreground">
                  Cantrips Known
                  {totalRacialCantrips > 0 && (
                    <span className="text-xs text-purple-500 block">
                      (+{totalRacialCantrips} racial)
                    </span>
                  )}
                </div>
              </div>
            )}

            {(spellcastingInfo?.spellsKnown || 0) > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {spellcastingInfo?.spellsKnown}
                </div>
                <div className="text-sm text-muted-foreground">
                  {spellcastingInfo?.hasSpellbook ? 'Spells in Spellbook' : 'Spells Known'}
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 capitalize">
                {spellcastingInfo?.spellcastingAbility?.substring(0, 3) || 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Spellcasting Ability</div>
            </div>
          </div>

          {/* Spellcasting Rules */}
          {currentClass && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  {getSpellValidationRules(currentClass).map((rule, index) => (
                    <p key={index}>{rule}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SpellSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search spells by name, description, or school..."
          />
        </div>
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="lg:w-auto w-full">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>

          {/* Filter Panel */}
          <CollapsibleContent>
            <SpellFilterPanel
              filters={filters}
              onChange={setFilters}
              availableSchools={availableSchools}
              isOpen={isFilterOpen}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Validation Alerts */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <p key={index}>{error.message}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.valid && (selectedCantrips.length > 0 || selectedSpells.length > 0) && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Spell selection is valid and has been saved to your character.
          </AlertDescription>
        </Alert>
      )}

      {/* Spell Selection Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cantrips" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Cantrips
            {(spellcastingInfo?.cantripsKnown || 0) + totalRacialCantrips > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedCantrips.length}/{(spellcastingInfo?.cantripsKnown || 0) + totalRacialCantrips}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="spells" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            1st Level
            {(spellcastingInfo?.spellsKnown || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedSpells.length}/{spellcastingInfo?.spellsKnown}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="racial" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Racial
            {hasRacialSpells && (
              <Badge variant="secondary" className="ml-1">
                {racialSpells.cantrips.length + racialSpells.bonusCantrips}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Cantrips Tab */}
        <TabsContent value="cantrips" className="space-y-4">
          {(spellcastingInfo?.cantripsKnown || 0) > 0 ? (
            <SpellCategorySection
              title="Class Cantrips"
              description="Minor spells you can cast at will, without expending spell slots."
              spells={filteredCantrips}
              selectedSpells={selectedCantrips}
              maxSpells={spellcastingInfo?.cantripsKnown || 0}
              onToggleSpell={toggleCantrip}
              icon="cantrip"
              info={spellcastingInfo?.hasSpellbook ?
                "As a Wizard, you also learn these cantrips in addition to your spellbook spells." :
                undefined
              }
            />
          ) : hasRacialSpells ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Your class doesn't learn cantrips at 1st level.</p>
              <p className="text-sm">Check the Racial tab for any racial cantrips.</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>No cantrips available.</p>
            </div>
          )}
        </TabsContent>

        {/* 1st Level Spells Tab */}
        <TabsContent value="spells" className="space-y-4">
          {(() => {
            const spellsKnown = spellcastingInfo?.spellsKnown || 0;
            console.log(`🎯 [SpellSelection] 1st Level Tab Render:`, {
              spellsKnown,
              filteredSpellsCount: filteredSpells.length,
              availableSpellsCount: availableSpells.length,
              filteredSpellNames: filteredSpells.slice(0, 3).map(s => s.name),
              spellcastingInfo,
              willShowSpells: spellsKnown > 0
            });

            return spellsKnown > 0 ? (
              <SpellCategorySection
                title="1st Level Spells"
                description={spellcastingInfo?.hasSpellbook ?
                  "These spells will be recorded in your spellbook. You can prepare some each day." :
                  "These are the spells you know and can cast using spell slots."
                }
                spells={filteredSpells}
                selectedSpells={selectedSpells}
                maxSpells={spellcastingInfo?.spellsKnown || 0}
                onToggleSpell={toggleSpell}
                icon="spell"
                info={spellcastingInfo?.hasSpellbook ?
                  "As a Wizard, you can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day." :
                  undefined
                }
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wand2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>Your class doesn't learn 1st level spells at character creation.</p>
                <p className="text-sm">You may gain spellcasting abilities at higher levels.</p>
              </div>
            );
          })()}
        </TabsContent>

        {/* Racial Spells Tab */}
        <TabsContent value="racial" className="space-y-4">
          {hasRacialSpells ? (
            <>
              {/* Racial Cantrips */}
              {racialSpells.cantrips.length > 0 && (
                <SpellCategorySection
                  title="Racial Cantrips"
                  description={`Cantrips granted by your ${character?.subrace?.name || character?.race?.name} heritage.`}
                  spells={availableCantrips.filter(cantrip => racialSpells.cantrips.includes(cantrip.id))}
                  selectedSpells={selectedCantrips}
                  maxSpells={racialSpells.cantrips.length}
                  onToggleSpell={toggleCantrip}
                  icon="racial"
                  showProgress={false}
                  info="These cantrips are automatically known and don't count against your class cantrip limit."
                />
              )}

              {/* Bonus Cantrip Selection */}
              {racialSpells.bonusCantrips > 0 && (
                <SpellCategorySection
                  title="Bonus Cantrip"
                  description={`Choose ${racialSpells.bonusCantrips} additional cantrip from the ${racialSpells.bonusCantripSource} spell list.`}
                  spells={racialSpells.bonusCantripSource === 'wizard' ?
                    filteredCantrips :
                    availableCantrips.filter(cantrip =>
                      racialSpells.bonusCantripSource &&
                      cantrip.id.includes(racialSpells.bonusCantripSource)
                    )
                  }
                  selectedSpells={selectedCantrips}
                  maxSpells={racialSpells.bonusCantrips}
                  onToggleSpell={toggleCantrip}
                  icon="racial"
                  info={`This bonus cantrip is granted by your ${character?.subrace?.name || character?.race?.name} heritage.`}
                />
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Your race doesn't grant any spells at 1st level.</p>
              <p className="text-sm">Some races gain magical abilities at higher levels.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Save Button (fallback) */}
      {!validation.valid && (selectedCantrips.length > 0 || selectedSpells.length > 0) && (
        <div className="flex justify-center">
          <Button onClick={handleManualSave} disabled={!canProceed}>
            Save Spell Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpellSelection;