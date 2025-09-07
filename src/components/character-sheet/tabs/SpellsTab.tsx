import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Character } from '@/types/character';
import DiceRoller from '@/components/ui/dice-roller';
import { Wand2, Circle, Dot, Book, Target } from 'lucide-react';

interface SpellsTabProps {
  character: Character;
  onUpdate: () => void;
}

interface SpellSlots {
  [key: number]: { total: number; used: number };
}

interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  damage?: string;
  prepared?: boolean;
  ritual?: boolean;
  concentration?: boolean;
}

/**
 * Spells tab with spell slot tracking and spell management
 */
const SpellsTab: React.FC<SpellsTabProps> = ({ character, onUpdate }) => {
  // Example spell slots for a caster (would be calculated based on class/level)
  const [spellSlots, setSpellSlots] = useState<SpellSlots>({
    1: { total: 4, used: 1 },
    2: { total: 3, used: 0 },
    3: { total: 3, used: 2 },
    4: { total: 1, used: 0 },
    5: { total: 1, used: 1 },
  });

  // Spellcasting ability (would be determined by class)
  const spellcastingAbility = 'intelligence'; // Example: Wizard
  const spellcastingMod = character.abilityScores[spellcastingAbility].modifier;
  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;
  const spellAttackBonus = spellcastingMod + proficiencyBonus;
  const spellSaveDC = 8 + spellcastingMod + proficiencyBonus;

  // Example spells (would come from database)
  const knownSpells: Spell[] = [
    {
      name: 'Fire Bolt',
      level: 0,
      school: 'Evocation',
      castingTime: '1 action',
      range: '120 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      description: 'A mote of fire at a creature or object within range.',
      damage: '1d10',
    },
    {
      name: 'Magic Missile',
      level: 1,
      school: 'Evocation',
      castingTime: '1 action',
      range: '120 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      description: 'Three glowing darts of magical force.',
      damage: '1d4+1',
      prepared: true,
    },
    {
      name: 'Fireball',
      level: 3,
      school: 'Evocation',
      castingTime: '1 action',
      range: '150 feet',
      components: 'V, S, M',
      duration: 'Instantaneous',
      description: 'A bright flash and a booming explosion.',
      damage: '8d6',
      prepared: true,
    },
  ];

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

  const cantrips = knownSpells.filter(spell => spell.level === 0);
  const leveledSpells = knownSpells.filter(spell => spell.level > 0);

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
            {cantrips.map((spell, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{spell.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {spell.school} • {spell.castingTime} • {spell.range}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {spell.description}
                  </div>
                </div>
                {spell.damage && (
                  <DiceRoller
                    dice={spell.damage}
                    label="Cast"
                  />
                )}
              </div>
            ))}
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
            {leveledSpells.map((spell, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3 flex-1">
                  {/* Prepared indicator */}
                  <div className="flex flex-col items-center gap-1 mt-1">
                    {spell.prepared ? (
                      <Dot className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                    <Badge variant="outline" className="text-xs px-1">
                      {spell.level}
                    </Badge>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{spell.name}</span>
                      {spell.ritual && (
                        <Badge variant="secondary" className="text-xs">R</Badge>
                      )}
                      {spell.concentration && (
                        <Badge variant="secondary" className="text-xs">C</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {spell.school} • {spell.castingTime} • {spell.range}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {spell.description}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {spell.damage && (
                    <DiceRoller
                      dice={spell.damage}
                      label="Damage"
                    />
                  )}
                  {spell.name.includes('Attack') && (
                    <DiceRoller
                      dice="1d20"
                      modifier={spellAttackBonus}
                      label="Attack"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpellsTab;