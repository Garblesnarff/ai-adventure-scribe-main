import React, { useState, useEffect } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { CharacterClass, Spell } from '@/types/character';
import { getClassSpells } from '@/data/spellOptions';
import { Wand2, Sparkles, BookOpen, Info } from 'lucide-react';

/**
 * SpellSelection component for spellcasting classes during character creation
 * Handles selection of cantrips and known spells based on class spellcasting rules
 */
const SpellSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();
  const character = state.character;
  const currentClass = character?.class as CharacterClass | undefined;

  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);

  // Get spellcasting info from class
  const spellcasting = currentClass?.spellcasting;
  const isSpellcaster = !!spellcasting;

  // Get available spells for this class
  const { cantrips: availableCantrips, spells: availableSpells } = isSpellcaster 
    ? getClassSpells(currentClass?.name || '') 
    : { cantrips: [], spells: [] };

  // Spellcasting requirements
  const cantripsKnown = spellcasting?.cantripsKnown || 0;
  const spellsKnown = spellcasting?.spellsKnown || 0;
  const hasSpellbook = spellcasting?.spellbook || false;

  // If not a spellcaster, don't show this step
  if (!isSpellcaster) {
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

  /**
   * Updates character spells in context
   */
  const updateCharacterSpells = () => {
    // Validate selections
    if (selectedCantrips.length !== cantripsKnown) {
      toast({
        title: 'Invalid Selection',
        description: `Please select exactly ${cantripsKnown} cantrip${cantripsKnown > 1 ? 's' : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    if (spellsKnown > 0 && selectedSpells.length !== spellsKnown) {
      toast({
        title: 'Invalid Selection',
        description: `Please select exactly ${spellsKnown} spell${spellsKnown > 1 ? 's' : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        cantrips: selectedCantrips,
        knownSpells: selectedSpells,
      },
    });

    toast({
      title: 'Spells Selected',
      description: 'Your starting spells have been chosen.',
    });
    
    // Auto-scroll to navigation to proceed to next step
    scrollToNavigation();
  };

  // Auto-update on valid selections
  useEffect(() => {
    const cantripsValid = selectedCantrips.length === cantripsKnown;
    const spellsValid = spellsKnown === 0 || selectedSpells.length === spellsKnown;
    
    if (cantripsValid && spellsValid) {
      updateCharacterSpells();
    }
  }, [selectedCantrips, selectedSpells]);

  const getSpellDescription = (spell: Spell) => {
    const components = spell.components;
    const duration = spell.duration;
    const range = spell.range;
    
    return `${spell.school} • ${spell.castingTime} • ${range} • ${duration}${components ? ' • ' + components : ''}`;
  };

  return (
    <div className="space-y-6">
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
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{cantripsKnown}</div>
              <div className="text-sm text-muted-foreground">Cantrips Known</div>
            </div>
            {spellsKnown > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{spellsKnown}</div>
                <div className="text-sm text-muted-foreground">
                  {hasSpellbook ? 'Spells in Spellbook' : 'Spells Known'}
                </div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 capitalize">
                {spellcasting?.ability?.substring(0, 3)}
              </div>
              <div className="text-sm text-muted-foreground">Spellcasting Ability</div>
            </div>
          </div>
          
          {hasSpellbook && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  As a Wizard, you have a spellbook containing these spells. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cantrip Selection */}
      {cantripsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Choose Cantrips ({selectedCantrips.length}/{cantripsKnown})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cantrips are minor spells you can cast at will, without expending spell slots.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {availableCantrips.map((cantrip) => (
                <div
                  key={cantrip.id}
                  className={`p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    selectedCantrips.includes(cantrip.name)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (selectedCantrips.includes(cantrip.name)) {
                      setSelectedCantrips(prev => prev.filter(s => s !== cantrip.name));
                    } else if (selectedCantrips.length < cantripsKnown) {
                      setSelectedCantrips(prev => [...prev, cantrip.name]);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{cantrip.name}</h4>
                        <Badge variant="outline" className="text-xs">Cantrip</Badge>
                        {cantrip.concentration && <Badge variant="secondary" className="text-xs">Concentration</Badge>}
                        {cantrip.ritual && <Badge variant="secondary" className="text-xs">Ritual</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getSpellDescription(cantrip)}
                      </p>
                      <p className="text-sm">{cantrip.description}</p>
                    </div>
                    <Checkbox
                      checked={selectedCantrips.includes(cantrip.name)}
                      disabled={!selectedCantrips.includes(cantrip.name) && selectedCantrips.length >= cantripsKnown}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1st Level Spell Selection */}
      {spellsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              Choose 1st Level Spells ({selectedSpells.length}/{spellsKnown})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {hasSpellbook 
                ? 'These spells will be recorded in your spellbook.'
                : 'These are the spells you know and can cast using spell slots.'
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {availableSpells.map((spell) => (
                <div
                  key={spell.id}
                  className={`p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    selectedSpells.includes(spell.name)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (selectedSpells.includes(spell.name)) {
                      setSelectedSpells(prev => prev.filter(s => s !== spell.name));
                    } else if (selectedSpells.length < spellsKnown) {
                      setSelectedSpells(prev => [...prev, spell.name]);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{spell.name}</h4>
                        <Badge variant="outline" className="text-xs">1st Level</Badge>
                        {spell.concentration && <Badge variant="secondary" className="text-xs">Concentration</Badge>}
                        {spell.ritual && <Badge variant="secondary" className="text-xs">Ritual</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getSpellDescription(spell)}
                      </p>
                      <p className="text-sm">{spell.description}</p>
                    </div>
                    <Checkbox
                      checked={selectedSpells.includes(spell.name)}
                      disabled={!selectedSpells.includes(spell.name) && selectedSpells.length >= spellsKnown}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Update Button (fallback) */}
      {(cantripsKnown > 0 || spellsKnown > 0) && (
        <div className="flex justify-center">
          <Button onClick={updateCharacterSpells} className="mt-4">
            Update Spells
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpellSelection;