import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Character } from '@/types/character';
import DiceRoller from '@/components/ui/dice-roller';
import { 
  Heart, 
  Shield, 
  Zap, 
  Target, 
  Clock,
  Plus,
  Minus,
  RotateCcw,
  Skull
} from 'lucide-react';

interface MainTabProps {
  character: Character;
  onUpdate: () => void;
}

interface CombatState {
  currentHp: number;
  tempHp: number;
  deathSaves: {
    successes: number;
    failures: number;
  };
  conditions: string[];
  initiative: number;
}

/**
 * Main character sheet tab with core stats and combat tracking
 * Includes HP management, AC, initiative, and death saves
 */
const MainTab: React.FC<MainTabProps> = ({ character, onUpdate }) => {
  // Calculate max HP (simplified formula)
  const maxHp = Math.max(1, 
    character.level * (character.class?.hitDie || 8) + 
    character.abilityScores.constitution.modifier * character.level
  );

  const [combatState, setCombatState] = useState<CombatState>({
    currentHp: maxHp,
    tempHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    initiative: 0,
  });

  const [damageInput, setDamageInput] = useState('');
  const [healingInput, setHealingInput] = useState('');

  // Proficiency bonus calculation
  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;

  // Armor Class calculation (base 10 + Dex modifier)
  const armorClass = 10 + character.abilityScores.dexterity.modifier;

  // Initiative modifier
  const initiativeModifier = character.abilityScores.dexterity.modifier;

  // Passive Perception
  const passivePerception = 10 + character.abilityScores.wisdom.modifier + 
    (character.personalityTraits.includes('Perception') ? proficiencyBonus : 0);

  const applyDamage = () => {
    const damage = parseInt(damageInput) || 0;
    if (damage <= 0) return;

    setCombatState(prev => {
      let newCurrentHp = prev.currentHp;
      let newTempHp = prev.tempHp;

      // Temp HP absorbs damage first
      if (newTempHp > 0) {
        if (damage <= newTempHp) {
          newTempHp -= damage;
        } else {
          const remainingDamage = damage - newTempHp;
          newTempHp = 0;
          newCurrentHp -= remainingDamage;
        }
      } else {
        newCurrentHp -= damage;
      }

      return {
        ...prev,
        currentHp: Math.max(0, newCurrentHp),
        tempHp: Math.max(0, newTempHp),
      };
    });
    setDamageInput('');
  };

  const applyHealing = () => {
    const healing = parseInt(healingInput) || 0;
    if (healing <= 0) return;

    setCombatState(prev => ({
      ...prev,
      currentHp: Math.min(maxHp, prev.currentHp + healing),
    }));
    setHealingInput('');
  };

  const resetDeathSaves = () => {
    setCombatState(prev => ({
      ...prev,
      deathSaves: { successes: 0, failures: 0 },
    }));
  };

  const updateDeathSave = (type: 'success' | 'failure', increment: boolean) => {
    setCombatState(prev => ({
      ...prev,
      deathSaves: {
        ...prev.deathSaves,
        [type === 'success' ? 'successes' : 'failures']: Math.max(
          0, 
          Math.min(3, prev.deathSaves[type === 'success' ? 'successes' : 'failures'] + (increment ? 1 : -1))
        ),
      },
    }));
  };

  const isUnconscious = combatState.currentHp <= 0;
  const isDead = combatState.deathSaves.failures >= 3;
  const isStabilized = combatState.deathSaves.successes >= 3;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Combat Vitals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Combat Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hit Points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hit Points</span>
              <Badge variant={isUnconscious ? 'destructive' : 'secondary'}>
                {combatState.currentHp} / {maxHp}
              </Badge>
            </div>
            
            {/* HP Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all"
                style={{ 
                  width: `${Math.max(0, (combatState.currentHp / maxHp) * 100)}%` 
                }}
              />
            </div>

            {/* Temp HP */}
            {combatState.tempHp > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">Temp HP:</span>
                <Badge variant="outline" className="text-blue-600">
                  {combatState.tempHp}
                </Badge>
              </div>
            )}
          </div>

          {/* Damage/Healing Controls */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Damage"
                value={damageInput}
                onChange={(e) => setDamageInput(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={applyDamage}
                className="w-full mt-1"
              >
                <Minus className="w-3 h-3 mr-1" />
                Apply Damage
              </Button>
            </div>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Healing"
                value={healingInput}
                onChange={(e) => setHealingInput(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="default"
                onClick={applyHealing}
                className="w-full mt-1 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                Apply Healing
              </Button>
            </div>
          </div>

          {/* Death Saves (only show when unconscious) */}
          {isUnconscious && !isDead && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Death Saves</span>
                <Button size="sm" variant="ghost" onClick={resetDeathSaves}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Successes</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <button
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 ${
                          i <= combatState.deathSaves.successes
                            ? 'bg-green-500 border-green-500'
                            : 'border-green-500'
                        }`}
                        onClick={() => updateDeathSave('success', i > combatState.deathSaves.successes)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">Failures</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <button
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 ${
                          i <= combatState.deathSaves.failures
                            ? 'bg-red-500 border-red-500'
                            : 'border-red-500'
                        }`}
                        onClick={() => updateDeathSave('failure', i > combatState.deathSaves.failures)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {isStabilized && (
                <Badge variant="secondary" className="mt-2 w-full justify-center">
                  Stabilized
                </Badge>
              )}
            </div>
          )}

          {isDead && (
            <div className="text-center p-4 border border-red-200 bg-red-50 rounded">
              <Skull className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-medium">Dead</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Core Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AC, Initiative, Speed */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{armorClass}</div>
              <div className="text-xs text-muted-foreground">Armor Class</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-full">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <DiceRoller
                dice="1d20"
                modifier={initiativeModifier}
                label={`+${initiativeModifier}`}
              />
              <div className="text-xs text-muted-foreground mt-1">Initiative</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{character.race?.speed || 30}</div>
              <div className="text-xs text-muted-foreground">Speed (ft)</div>
            </div>
          </div>

          {/* Proficiency Bonus and Passive Perception */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold">+{proficiencyBonus}</div>
              <div className="text-xs text-muted-foreground">Proficiency Bonus</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{passivePerception}</div>
              <div className="text-xs text-muted-foreground">Passive Perception</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Quick Rolls</h4>
            <div className="flex flex-wrap gap-2">
              <DiceRoller
                dice="1d20"
                modifier={character.abilityScores.strength.modifier}
                label="STR"
              />
              <DiceRoller
                dice="1d20"
                modifier={character.abilityScores.dexterity.modifier}
                label="DEX"
              />
              <DiceRoller
                dice="1d20"
                modifier={character.abilityScores.constitution.modifier}
                label="CON"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Description */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Character Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={character.description || ''}
            placeholder="Describe your character's appearance, personality, and background..."
            className="min-h-[100px] resize-none"
            readOnly
          />
          
          {/* Background and Alignment */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Background</label>
              <p className="text-sm">{character.background?.name || 'None'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Alignment</label>
              <p className="text-sm">{character.alignment || 'Unaligned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTab;