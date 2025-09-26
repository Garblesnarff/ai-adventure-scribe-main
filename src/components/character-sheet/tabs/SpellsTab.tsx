import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Character } from '@/types/character';
import DiceRoller from '@/components/ui/dice-roller';
import { Wand2, Circle, Dot, Book, Target, Loader2 } from 'lucide-react';
import { characterSpellService, CharacterSpellData } from '@/services/characterSpellApi';
import { getCharacterSpells, CharacterSpellDisplay } from '@/utils/spell-lookup';

interface SpellsTabProps {
  character: Character;
  onUpdate: () => void;
}

interface SpellSlots {
  [key: number]: { total: number; used: number };
}

// Using CharacterSpellDisplay from spell-lookup instead of local interface

/**
 * Spells tab with spell slot tracking and spell management
 */
const SpellsTab: React.FC<SpellsTabProps> = ({ character, onUpdate }) => {
  // State for spell data
  const [spells, setSpells] = useState<CharacterSpellDisplay[]>([]);
  const [loading, setLoading] = useState(false); // Start false since we use character data first
  const [error, setError] = useState<string | null>(null);

  // Example spell slots for a caster (would be calculated based on class/level)
  const [spellSlots, setSpellSlots] = useState<SpellSlots>({
    1: { total: 4, used: 1 },
    2: { total: 3, used: 0 },
    3: { total: 3, used: 2 },
    4: { total: 1, used: 0 },
    5: { total: 1, used: 1 },
  });

  // Load character spells from character data with optional API enhancement
  useEffect(() => {
    const loadSpells = async () => {
      console.log('🎯 [SpellsTab] Loading spells for character:', character?.name || 'Unknown');
      console.log('🔍 [SpellsTab] Character object structure:');
      console.log('   hasCantrips:', !!character?.cantrips);
      console.log('   cantripCount:', character?.cantrips?.length || 0);
      console.log('   cantrips:', character?.cantrips);
      console.log('   hasKnownSpells:', !!character?.knownSpells);
      console.log('   knownSpellCount:', character?.knownSpells?.length || 0);
      console.log('   knownSpells:', character?.knownSpells);
      console.log('   hasPreparedSpells:', !!character?.preparedSpells);
      console.log('   preparedSpellCount:', character?.preparedSpells?.length || 0);
      console.log('   preparedSpells:', character?.preparedSpells);
      console.log('   hasRitualSpells:', !!character?.ritualSpells);
      console.log('   ritualSpellCount:', character?.ritualSpells?.length || 0);
      console.log('   ritualSpells:', character?.ritualSpells);
      console.log('🗝️ [SpellsTab] ALL CHARACTER KEYS:', Object.keys(character || {}));
      console.log('🎭 [SpellsTab] FULL CHARACTER OBJECT:', character);

      setError(null);

      // Primary: Use character data directly
      const characterSpellData = getCharacterSpells(character);
      const primarySpells = characterSpellData.allSpells;

      console.log('✨ [SpellsTab] Loaded spells from character data:', {
        totalSpells: primarySpells.length,
        cantrips: characterSpellData.cantrips.length,
        knownSpells: characterSpellData.knownSpells.length,
        preparedSpells: characterSpellData.preparedSpells.length,
        spellNames: primarySpells.map(s => s.name)
      });

      // Set primary data immediately
      setSpells(primarySpells);

      // Optional: Try to enhance with API data (non-blocking)
      if (character?.id) {
        try {
          setLoading(true);
          const apiSpellData = await characterSpellService.getCharacterSpells(character.id);
          const apiSpells = [...apiSpellData.cantrips, ...apiSpellData.spells];

          if (apiSpells.length > 0) {
            console.log('🔮 [SpellsTab] Enhanced with API data:', {
              apiSpellCount: apiSpells.length,
              primarySpellCount: primarySpells.length
            });

            // Merge API data with character data (prefer API data when available)
            const enhancedSpells = apiSpells.map(apiSpell => ({
              ...apiSpell,
              // Convert API format to our format
              castingTime: apiSpell.casting_time,
              range: apiSpell.range_text,
              verbal: apiSpell.components_verbal,
              somatic: apiSpell.components_somatic,
              material: apiSpell.components_material,
              materialDescription: apiSpell.material_components
            })) as CharacterSpellDisplay[];

            setSpells(enhancedSpells);
          }
        } catch (err) {
          console.warn('🚫 [SpellsTab] API enhancement failed, using character data:', err);
          // Keep using character data, don't show error for API failure
        } finally {
          setLoading(false);
        }
      }
    };

    loadSpells();
  }, [character?.id, character?.cantrips, character?.knownSpells, character?.preparedSpells, character?.ritualSpells]);

  // Spellcasting ability (would be determined by class)
  const spellcastingAbility = 'intelligence'; // Example: Wizard
  const spellcastingMod = character.abilityScores?.[spellcastingAbility]?.modifier || 0;
  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;
  const spellAttackBonus = spellcastingMod + proficiencyBonus;
  const spellSaveDC = 8 + spellcastingMod + proficiencyBonus;

  const consumeSpellSlot = (level: number) => {
    if (spellSlots[level] && spellSlots[level].used < spellSlots[level].total) {
      setSpellSlots(prev => ({
        ...prev,
        [level]: {
          ...prev[level],
          used: prev[level].used + 1,
        },
      }));
    }
  };

  const restoreSpellSlot = (level: number) => {
    if (spellSlots[level] && spellSlots[level].used > 0) {
      setSpellSlots(prev => ({
        ...prev,
        [level]: {
          ...prev[level],
          used: prev[level].used - 1,
        },
      }));
    }
  };

  const longRest = () => {
    setSpellSlots(prev => {
      const restored = { ...prev };
      Object.keys(restored).forEach(level => {
        restored[parseInt(level)].used = 0;
      });
      return restored;
    });
  };

  const cantrips = spells.filter(spell => spell.level === 0);
  const leveledSpells = spells.filter(spell => spell.level > 0);

  // Helper function to format spell components with error handling
  const formatComponents = (spell: CharacterSpellDisplay) => {
    try {
      if (!spell) return '';

      const components = [];
      if (spell.verbal || spell.components_verbal) components.push('V');
      if (spell.somatic || spell.components_somatic) components.push('S');
      if (spell.material || spell.components_material) components.push('M');
      return components.join(', ');
    } catch (error) {
      console.warn('[SpellsTab] Error formatting components for spell:', spell?.name, error);
      return 'V, S, M'; // Safe fallback
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading spells...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Failed to load spells</div>
        <div className="text-sm text-muted-foreground mb-4">{error}</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spellcasting Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">+{spellAttackBonus}</div>
            <div className="text-sm text-muted-foreground">Spell Attack Bonus</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{spellSaveDC}</div>
            <div className="text-sm text-muted-foreground">Spell Save DC</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold capitalize">{spellcastingAbility.substring(0, 3)}</div>
            <div className="text-sm text-muted-foreground">Spellcasting Ability</div>
          </CardContent>
        </Card>
      </div>

      {/* Spell Slots */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5 text-purple-500" />
            Spell Slots
          </CardTitle>
          <Button size="sm" onClick={longRest}>
            Long Rest
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(spellSlots).map(([level, slots]) => (
              <div key={level} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium">
                  Level {level}
                </div>
                <div className="flex-1">
                  <div className="flex gap-1 mb-1">
                    {Array.from({ length: slots.total }).map((_, i) => (
                      <button
                        key={i}
                        className={`w-6 h-6 rounded border-2 ${
                          i < slots.used
                            ? 'bg-gray-300 border-gray-400'
                            : 'bg-purple-500 border-purple-600'
                        }`}
                        onClick={() => 
                          i < slots.used 
                            ? restoreSpellSlot(parseInt(level))
                            : consumeSpellSlot(parseInt(level))
                        }
                      />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {slots.total - slots.used} / {slots.total} remaining
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cantrips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-500" />
            Cantrips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cantrips.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No cantrips learned yet
              </div>
            ) : (
              cantrips.map((spell) => {
                try {
                  if (!spell || !spell.id) {
                    console.warn('[SpellsTab] Invalid cantrip data:', spell);
                    return null;
                  }

                  return (
                    <div key={spell.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{spell.name || 'Unknown Cantrip'}</div>
                        <div className="text-sm text-muted-foreground">
                          {spell.school || 'Unknown'} • {spell.castingTime || spell.casting_time || 'Unknown'} • {spell.range || spell.range_text || 'Unknown'}
                        </div>
                        {formatComponents(spell) && (
                          <div className="text-xs text-muted-foreground">
                            Components: {formatComponents(spell)}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {spell.description || 'No description available.'}
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('[SpellsTab] Error rendering cantrip:', spell, error);
                  return (
                    <div key={spell?.id || Math.random()} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                      <div className="flex-1">
                        <div className="font-medium text-red-600">Error loading cantrip</div>
                        <div className="text-sm text-muted-foreground">
                          There was an error displaying this cantrip. Please refresh the page.
                        </div>
                      </div>
                    </div>
                  );
                }
              }).filter(Boolean)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leveled Spells */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-green-500" />
            Spells
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leveledSpells.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No spells learned yet
              </div>
            ) : (
              leveledSpells.map((spell) => {
                try {
                  if (!spell || !spell.id) {
                    console.warn('[SpellsTab] Invalid leveled spell data:', spell);
                    return null;
                  }

                  return (
                    <div key={spell.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Prepared indicator */}
                        <div className="flex flex-col items-center gap-1 mt-1">
                          {spell.is_prepared ? (
                            <Dot className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <Badge variant="outline" className="text-xs px-1">
                            {spell.level || '?'}
                          </Badge>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{spell.name || 'Unknown Spell'}</span>
                            {spell.ritual && (
                              <Badge variant="secondary" className="text-xs">R</Badge>
                            )}
                            {spell.concentration && (
                              <Badge variant="secondary" className="text-xs">C</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {spell.school || 'Unknown'} • {spell.castingTime || spell.casting_time || 'Unknown'} • {spell.range || spell.range_text || 'Unknown'}
                          </div>
                          {formatComponents(spell) && (
                            <div className="text-xs text-muted-foreground">
                              Components: {formatComponents(spell)}
                              {(spell.materialDescription || spell.material_components) && ` (${spell.materialDescription || spell.material_components})`}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground mt-1">
                            {spell.description || 'No description available.'}
                          </div>
                          {(spell.higherLevel || spell.higher_level_text) && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              <strong>At Higher Levels:</strong> {spell.higherLevel || spell.higher_level_text}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('[SpellsTab] Error rendering leveled spell:', spell, error);
                  return (
                    <div key={spell?.id || Math.random()} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                      <div className="flex-1">
                        <div className="font-medium text-red-600">Error loading spell</div>
                        <div className="text-sm text-muted-foreground">
                          There was an error displaying this spell. Please refresh the page.
                        </div>
                      </div>
                    </div>
                  );
                }
              }).filter(Boolean)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpellsTab;