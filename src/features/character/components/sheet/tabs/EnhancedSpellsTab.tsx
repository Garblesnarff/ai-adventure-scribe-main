import {
  Wand2,
  Heart,
  Sparkles,
  BookOpen,
  Clock,
  Zap,
  Star,
  Crown,
  Scroll,
  Circle,
  Target,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { Character, Spell } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { metamagicOptions } from '@/data/spellcastingFeatures';
import logger from '@/lib/logger';
import { spellApi } from '@/services/spellApi';

interface EnhancedSpellsTabProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

interface SpellSlots {
  [key: number]: { total: number; used: number };
}

/**
 * Enhanced Spells tab with advanced spellcasting features
 * Supports metamagic, pact magic, spell preparation, ritual casting
 */
const EnhancedSpellsTab: React.FC<EnhancedSpellsTabProps> = ({ character, onUpdate }) => {
  // State for fetched spells
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [isLoadingSpells, setIsLoadingSpells] = useState(true);

  // Fetch all spells on component mount
  useEffect(() => {
    const fetchSpells = async () => {
      try {
        const spells = await spellApi.getAllSpells();
        setAllSpells(spells);
      } catch (error) {
        logger.error('Failed to fetch spells:', error);
      } finally {
        setIsLoadingSpells(false);
      }
    };

    fetchSpells();
  }, []);

  // Calculate spellcasting info
  const characterClass = character?.class;
  const level = character?.level || 1;
  const spellcastingAbility = characterClass?.spellcasting?.ability;
  const spellcastingMod = spellcastingAbility
    ? character?.abilityScores?.[spellcastingAbility]?.modifier || 0
    : 0;
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2;
  const spellAttackBonus = spellcastingMod + proficiencyBonus;
  const spellSaveDC = 8 + spellcastingMod + proficiencyBonus;

  // Spell slot management
  const [spellSlots, setSpellSlots] = useState<SpellSlots>({
    1: { total: 4, used: 1 },
    2: { total: 3, used: 0 },
    3: { total: 3, used: 2 },
    4: { total: 1, used: 0 },
    5: { total: 1, used: 1 },
  });

  // Pact magic management
  const [pactSlots, setPactSlots] = useState({
    current: character?.pactSlots?.current || 0,
    maximum: character?.pactSlots?.maximum || 0,
    level: character?.pactSlots?.level || 1,
  });

  // Sorcery points management
  const [sorceryPoints, setSorceryPoints] = useState({
    current: character?.sorceryPoints?.current || 0,
    maximum: character?.sorceryPoints?.maximum || 0,
  });

  // Check for spellcasting features
  const hasSpellcasting = characterClass?.spellcasting !== undefined;
  const hasPactMagic = characterClass?.spellcasting?.pactMagic || false;
  const hasMetamagic = character?.metamagicOptions && character.metamagicOptions.length > 0;
  const canCastRituals = characterClass?.spellcasting?.ritualCasting || false;

  // Get spells (only if not loading)
  const knownCantrips = !isLoadingSpells
    ? (character?.cantrips || [])
        .map((cantripId) => allSpells.find((spell: Spell) => spell.id === cantripId))
        .filter(Boolean)
    : [];

  const knownSpells = !isLoadingSpells
    ? (character?.knownSpells || [])
        .map((spellId) => allSpells.find((spell: Spell) => spell.id === spellId))
        .filter(Boolean)
    : [];

  const preparedSpells = !isLoadingSpells
    ? (character?.preparedSpells || [])
        .map((spellId) => allSpells.find((spell: Spell) => spell.id === spellId))
        .filter(Boolean)
    : [];

  const pactMagicSpells = !isLoadingSpells
    ? (character?.pactMagicSpells || [])
        .map((spellId) => allSpells.find((spell: Spell) => spell.id === spellId))
        .filter(Boolean)
    : [];

  const ritualSpells = !isLoadingSpells
    ? allSpells.filter(
        (spell: Spell) =>
          spell.ritual &&
          (character?.ritualSpells?.includes(spell.id) ||
            preparedSpells.some((p) => p?.id === spell.id)),
      )
    : [];

  const availableMetamagic = metamagicOptions.filter((option) =>
    character?.metamagicOptions?.includes(option.id),
  );

  /**
   * Spell slot management functions
   */
  const consumeSpellSlot = (level: number) => {
    if (spellSlots[level] && spellSlots[level].used < spellSlots[level].total) {
      setSpellSlots((prev) => ({
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
      setSpellSlots((prev) => ({
        ...prev,
        [level]: {
          ...prev[level],
          used: prev[level].used - 1,
        },
      }));
    }
  };

  const longRest = () => {
    setSpellSlots((prev) => {
      const restored = { ...prev };
      Object.keys(restored).forEach((level) => {
        restored[parseInt(level)].used = 0;
      });
      return restored;
    });

    setSorceryPoints((prev) => ({
      ...prev,
      current: prev.maximum,
    }));
  };

  const shortRest = () => {
    if (hasPactMagic) {
      setPactSlots((prev) => ({
        ...prev,
        current: prev.maximum,
      }));
    }
  };

  /**
   * Pact magic functions
   */
  const consumePactSlot = () => {
    if (pactSlots.current > 0) {
      setPactSlots((prev) => ({
        ...prev,
        current: prev.current - 1,
      }));
    }
  };

  /**
   * Sorcery point functions
   */
  const spendSorceryPoints = (amount: number) => {
    if (sorceryPoints.current >= amount) {
      setSorceryPoints((prev) => ({
        ...prev,
        current: prev.current - amount,
      }));
    }
  };

  if (isLoadingSpells) {
    return (
      <div className="text-center space-y-4">
        <Wand2 className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
        <h2 className="text-2xl font-bold">Loading Spells...</h2>
        <p className="text-muted-foreground">Fetching spell data from the library.</p>
      </div>
    );
  }

  if (!hasSpellcasting) {
    return (
      <div className="text-center space-y-4">
        <Wand2 className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Spellcasting</h2>
        <p className="text-muted-foreground">
          This character does not have spellcasting abilities.
        </p>
      </div>
    );
  }

  const getSpellCard = (spell: Spell | undefined, showPreparedBadge = false) => {
    if (!spell) return null;

    return (
      <div key={spell?.id} className="p-3 border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{spell?.name}</span>
              <Badge variant="outline" className="text-xs">
                Level {spell?.level}
              </Badge>
              {spell?.ritual && (
                <Badge variant="secondary" className="text-xs">
                  Ritual
                </Badge>
              )}
              {spell?.concentration && (
                <Badge variant="secondary" className="text-xs">
                  Concentration
                </Badge>
              )}
              {showPreparedBadge && (
                <Badge variant="default" className="text-xs">
                  Prepared
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {spell?.school} • {spell?.castingTime} • {spell?.range}
            </p>
            <p className="text-sm">{spell?.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            {spell?.damage && <DiceRoller dice={spell.damage} label="Damage" />}
            {spell?.level > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => (hasPactMagic ? consumePactSlot() : consumeSpellSlot(spell.level))}
                disabled={
                  hasPactMagic
                    ? pactSlots.current === 0
                    : !spellSlots[spell.level] ||
                      spellSlots[spell.level].used >= spellSlots[spell.level].total
                }
              >
                Cast
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Spellcasting Overview */}
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
            <div className="text-2xl font-bold capitalize">
              {spellcastingAbility?.substring(0, 3)}
            </div>
            <div className="text-sm text-muted-foreground">Spellcasting Ability</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={hasPactMagic ? 'pact' : 'spells'}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="spells">Spells</TabsTrigger>
          <TabsTrigger value="cantrips">Cantrips</TabsTrigger>
          {hasPactMagic && <TabsTrigger value="pact">Pact Magic</TabsTrigger>}
          {hasMetamagic && <TabsTrigger value="metamagic">Metamagic</TabsTrigger>}
          {canCastRituals && <TabsTrigger value="rituals">Rituals</TabsTrigger>}
        </TabsList>

        {/* Regular Spells Tab */}
        <TabsContent value="spells">
          <div className="space-y-4">
            {/* Spell Slots */}
            {!hasPactMagic && (
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
                        <div className="w-16 text-sm font-medium">Level {level}</div>
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
            )}

            {/* Prepared Spells */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  {preparedSpells.length > 0 ? 'Prepared Spells' : 'Known Spells'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(preparedSpells.length > 0 ? preparedSpells : knownSpells).map((spell) =>
                    getSpellCard(spell, preparedSpells.length > 0),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cantrips Tab */}
        <TabsContent value="cantrips">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-500" />
                Cantrips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {knownCantrips.map((cantrip) => getSpellCard(cantrip))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pact Magic Tab */}
        {hasPactMagic && (
          <TabsContent value="pact">
            <div className="space-y-4">
              {/* Pact Slots */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    Pact Magic Slots
                  </CardTitle>
                  <Button size="sm" onClick={shortRest}>
                    Short Rest
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">Level {pactSlots.level} Slots</div>
                    <div className="flex-1">
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: pactSlots.maximum }).map((_, i) => (
                          <button
                            key={i}
                            className={`w-8 h-8 rounded border-2 ${
                              i >= pactSlots.current
                                ? 'bg-gray-300 border-gray-400'
                                : 'bg-purple-500 border-purple-600'
                            }`}
                            onClick={consumePactSlot}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pactSlots.current} / {pactSlots.maximum} remaining
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pact Spells */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-500" />
                    Pact Magic Spells
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pactMagicSpells.map((spell) => getSpellCard(spell))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Metamagic Tab */}
        {hasMetamagic && (
          <TabsContent value="metamagic">
            <div className="space-y-4">
              {/* Sorcery Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold-500" />
                    Sorcery Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress
                        value={(sorceryPoints.current / sorceryPoints.maximum) * 100}
                        className="w-full h-4"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        {sorceryPoints.current} / {sorceryPoints.maximum} points remaining
                      </div>
                    </div>
                    <Button size="sm" onClick={longRest}>
                      Long Rest
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Metamagic Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Metamagic</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableMetamagic.map((option) => (
                      <div key={option.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{option.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {option.sorceryPointCost} SP
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => spendSorceryPoints(option.sorceryPointCost)}
                            disabled={sorceryPoints.current < option.sorceryPointCost}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Ritual Casting Tab */}
        {canCastRituals && (
          <TabsContent value="rituals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Ritual Spells
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cast these spells as rituals (extra 10 minutes, no spell slot required)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ritualSpells.map((spell: Spell) => (
                    <div key={spell.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{spell.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Level {spell.level}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Ritual
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {spell.school} • {spell.castingTime} (+10 min as ritual) • {spell.range}
                          </p>
                          <p className="text-sm">{spell.description}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Cast as Ritual
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default EnhancedSpellsTab;
