/**
 * Spell Preparation Panel Component
 *
 * Allows characters to prepare and unprepare spells based on their class rules.
 * Shows component requirements and preparation status for each spell.
 * Integrates with CharacterContext to update prepared spells.
 *
 * Dependencies:
 * - useCharacter from '@/contexts/CharacterContext'
 * - shadcn/ui components for UI
 * - Spell types from '@/types/character'
 * - Spell utilities from '@/utils/spellComponents'
 *
 * @author AI Dungeon Master Team
 */

import { BookOpen, CheckCircle, Circle, AlertCircle, Volume2, Hand, Package } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Spell } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCharacter } from '@/contexts/CharacterContext';
import logger from '@/lib/logger';
import { spellApi } from '@/services/spellApi';
import {
  calculateSpellPreparationLimits,
  validateSpellPreparation,
  getSpellPreparationType,
  getSpellPreparationInfo,
  type SpellPreparationLimits,
} from '@/utils/spell-preparation';

// ===========================
// Props Interface
// ===========================
interface SpellPreparationPanelProps {
  className?: string;
}

// ===========================
// Main Component
// ===========================
const SpellPreparationPanel: React.FC<SpellPreparationPanelProps> = ({ className = '' }) => {
  const { state, dispatch } = useCharacter();
  const character = state.character;

  const [preparedSpells, setPreparedSpells] = useState<string[]>(character?.preparedSpells || []);
  const [knownSpells, setKnownSpells] = useState<Spell[]>([]);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [isLoadingSpells, setIsLoadingSpells] = useState(false);
  const [preparationLimits, setPreparationLimits] = useState<SpellPreparationLimits | null>(null);

  // Get spell preparation info and limits
  const preparationInfo = character ? getSpellPreparationInfo(character) : null;
  const canPrepareSpells = preparationInfo && preparationInfo.preparationType === 'prepared';

  // Calculate preparation limits
  useEffect(() => {
    if (character) {
      const limits = calculateSpellPreparationLimits(character);
      setPreparationLimits(limits);
    }
  }, [character]);

  // Fetch available spells for the character's class
  useEffect(() => {
    if (character?.class?.name) {
      setIsLoadingSpells(true);
      spellApi
        .getClassSpells(character.class.name, character.level || 1)
        .then(({ cantrips, spells }) => {
          // For prepared casters, show all available spells they can choose from
          const allAvailableSpells = [...cantrips, ...spells];
          setAvailableSpells(allAvailableSpells);

          // If character already has known spells, filter to those
          if (character.knownSpells) {
            const characterKnownSpells = allAvailableSpells.filter((spell) =>
              character.knownSpells.includes(spell.name),
            );
            setKnownSpells(characterKnownSpells);
          } else {
            // For prepared casters, they can prepare from all available spells
            setKnownSpells(spells); // Only leveled spells, not cantrips
          }
        })
        .catch((error) => {
          logger.error('Failed to fetch class spells:', error);
          setAvailableSpells([]);
          setKnownSpells([]);
        })
        .finally(() => setIsLoadingSpells(false));
    }

    if (character?.preparedSpells) {
      setPreparedSpells(character.preparedSpells);
    }
  }, [character]);

  // Group spells by level
  const spellsByLevel: Record<number, Spell[]> = {};
  knownSpells.forEach((spell) => {
    if (!spellsByLevel[spell.level]) {
      spellsByLevel[spell.level] = [];
    }
    spellsByLevel[spell.level].push(spell);
  });

  // Toggle spell preparation with validation
  const toggleSpellPreparation = async (spellName: string) => {
    if (!character || !preparationLimits) return;

    try {
      let newPreparedSpells: string[];

      if (preparedSpells.includes(spellName)) {
        // Unprepare spell
        newPreparedSpells = preparedSpells.filter((name) => name !== spellName);
      } else {
        // Prepare spell - check if we have room
        if (preparedSpells.length >= (preparationLimits.spellsPrepared || 0)) {
          alert(`You can only prepare ${preparationLimits.spellsPrepared} spells.`);
          return;
        }
        newPreparedSpells = [...preparedSpells, spellName];
      }

      // Validate the new spell preparation
      const validation = await validateSpellPreparation(
        character,
        newPreparedSpells,
        character.knownSpells || [],
        character.spellbookSpells || [],
      );

      if (!validation.valid) {
        alert(`Cannot prepare spell: ${validation.errors.join(', ')}`);
        return;
      }

      // Update state and character context
      setPreparedSpells(newPreparedSpells);
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: {
          preparedSpells: newPreparedSpells,
        },
      });
    } catch (error) {
      logger.error('Error preparing/unpreparing spell:', error);
      alert('Failed to update spell preparation. Please try again.');
    }
  };

  // Get component icons
  const getComponentIcon = (componentType: 'verbal' | 'somatic' | 'material') => {
    switch (componentType) {
      case 'verbal':
        return <Volume2 className="w-4 h-4" />;
      case 'somatic':
        return <Hand className="w-4 h-4" />;
      case 'material':
        return <Package className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!character || !canPrepareSpells) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Spell Preparation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your character class does not require spell preparation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Spell Preparation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Prepare spells for casting. You can prepare {preparationLimits?.spellsPrepared || 0}{' '}
          spells.
        </p>
      </CardHeader>
      <CardContent>
        {/* Preparation Summary */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Spells Prepared</span>
            <Badge variant="outline">
              {preparedSpells.length} / {preparationLimits?.spellsPrepared || 0}
            </Badge>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${(preparedSpells.length / (preparationLimits?.spellsPrepared || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Spell List by Level */}
        {isLoadingSpells ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2 animate-pulse" />
            <p>Loading available spells...</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            {Object.entries(spellsByLevel)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, spells]) => (
                <div key={level} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Level {level} Spells</h3>
                  <div className="space-y-3">
                    {spells.map((spell) => {
                      const isPrepared = preparedSpells.includes(spell.name);
                      const canPrepare =
                        !isPrepared &&
                        preparedSpells.length < (preparationLimits?.spellsPrepared || 0);

                      return (
                        <div
                          key={spell.id}
                          className={`p-3 border rounded-lg transition-all ${
                            isPrepared
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{spell.name}</span>
                                {isPrepared ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground" />
                                )}
                                {spell.ritual && (
                                  <Badge variant="secondary" className="text-xs">
                                    Ritual
                                  </Badge>
                                )}
                                {spell.concentration && (
                                  <Badge variant="secondary" className="text-xs">
                                    Concentration
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground mb-2">
                                {spell.school} • {spell.casting_time} • {spell.range}
                              </p>

                              {/* Component Requirements */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {spell.components_verbal && (
                                  <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                    {getComponentIcon('verbal')}
                                    <span>V</span>
                                  </div>
                                )}
                                {spell.components_somatic && (
                                  <div className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                    {getComponentIcon('somatic')}
                                    <span>S</span>
                                  </div>
                                )}
                                {spell.components_material && (
                                  <div className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                                    {getComponentIcon('material')}
                                    <span>M</span>
                                    {spell.material_components && (
                                      <span className="ml-1">({spell.material_components})</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <p className="text-sm">{spell.description}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <Checkbox
                                checked={isPrepared}
                                disabled={!isPrepared && !canPrepare}
                                onCheckedChange={() => toggleSpellPreparation(spell.name)}
                              />
                              {!canPrepare && !isPrepared && (
                                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SpellPreparationPanel;
