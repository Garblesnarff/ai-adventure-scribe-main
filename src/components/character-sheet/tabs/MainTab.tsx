import {
  Heart,
  Shield,
  Zap,
  Target,
  Clock,
  Plus,
  Minus,
  RotateCcw,
  Skull,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  const maxHp = Math.max(
    1,
    character.level * (character.class?.hitDie || 8) +
      character.abilityScores.constitution.modifier * character.level,
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

  // Armor Class calculation with unarmored defense support
  let armorClass = 10 + character.abilityScores.dexterity.modifier;

  // Check for unarmored defense (Barbarian/monk without armor)
  const hasUnarmoredDefense =
    character.class &&
    (character.class.name.toLowerCase() === 'barbarian' ||
      character.class.name.toLowerCase() === 'monk');

  const isWearingArmor = character.equippedArmor !== undefined && character.equippedArmor !== '';

  // If character has unarmored defense and is not wearing armor, use unarmored AC
  if (hasUnarmoredDefense && !isWearingArmor) {
    switch (character.class!.name.toLowerCase()) {
      case 'barbarian':
        armorClass =
          10 +
          character.abilityScores.dexterity.modifier +
          character.abilityScores.constitution.modifier;
        break;
      case 'monk':
        armorClass =
          10 + character.abilityScores.dexterity.modifier + character.abilityScores.wisdom.modifier;
        break;
    }
  }

  // Initiative modifier
  const initiativeModifier = character.abilityScores.dexterity.modifier;

  // Passive Perception
  const passivePerception =
    10 +
    character.abilityScores.wisdom.modifier +
    (character.personalityTraits.includes('Perception') ? proficiencyBonus : 0);

  const applyDamage = () => {
    const damage = parseInt(damageInput) || 0;
    if (damage <= 0) return;

    setCombatState((prev) => {
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

    setCombatState((prev) => ({
      ...prev,
      currentHp: Math.min(maxHp, prev.currentHp + healing),
    }));
    setHealingInput('');
  };

  const resetDeathSaves = () => {
    setCombatState((prev) => ({
      ...prev,
      deathSaves: { successes: 0, failures: 0 },
    }));
  };

  const updateDeathSave = (type: 'success' | 'failure', increment: boolean) => {
    setCombatState((prev) => ({
      ...prev,
      deathSaves: {
        ...prev.deathSaves,
        [type === 'success' ? 'successes' : 'failures']: Math.max(
          0,
          Math.min(
            3,
            prev.deathSaves[type === 'success' ? 'successes' : 'failures'] + (increment ? 1 : -1),
          ),
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
                className="bg-red-500 h-33 rounded-full transition-all"
                style={{
                  width: `${Math.max(0, (combatState.currentHp / maxHp) * 100)}%`,
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

          {/* Damage Resistances, Immunities, and Vulnerabilities */}
          {(character.damageResistances?.length > 0 ||
            character.damageImmunities?.length > 0 ||
            character.damageVulnerabilities?.length > 0) && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Damage Characteristics</h4>

              {/* Resistances */}
              {character.damageResistances?.length > 0 && (
                <div className="flex items-start gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Resistances:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.damageResistances.map((resistance, index) => (
                        <Badge key={index} variant="secondary" className="text-xs py-0.5">
                          {resistance.charAt(0).toUpperCase() + resistance.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Immunities */}
              {character.damageImmunities?.length > 0 && (
                <div className="flex items-start gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Immunities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.damageImmunities.map((immunity, index) => (
                        <Badge key={index} variant="default" className="text-xs py-0.5">
                          {immunity.charAt(0).toUpperCase() + immunity.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Vulnerabilities */}
              {character.damageVulnerabilities?.length > 0 && (
                <div className="flex items-start gap-2">
                  <ShieldX className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Vulnerabilities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.damageVulnerabilities.map((vulnerability, index) => (
                        <Badge key={index} variant="destructive" className="text-xs py-0.5">
                          {vulnerability.charAt(0).toUpperCase() + vulnerability.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vision and Stealth */}
          {(character.visionTypes?.length > 0 ||
            character.obscurement !== 'clear' ||
            character.isHidden) && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Vision & Stealth</h4>

              {/* Vision Types */}
              {character.visionTypes?.length > 0 && (
                <div className="flex items-start gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Vision:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {character.visionTypes.map((vision, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs py-0.5 bg-purple-100 text-purple-800"
                        >
                          {vision.type.charAt(0).toUpperCase() + vision.type.slice(1)} (
                          {vision.range} ft)
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Obscurement */}
              {character.obscurement && character.obscurement !== 'clear' && (
                <div className="flex items-start gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Environment:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge
                        variant="outline"
                        className="text-xs py-0.5 border-orange-300 text-orange-700"
                      >
                        {character.obscurement
                          .replace('_', ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden Status */}
              {character.isHidden && (
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Stealth:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="default" className="text-xs py-0.5 bg-gray-700">
                        Hidden
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
              <Button size="sm" variant="destructive" onClick={applyDamage} className="w-full mt-1">
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
                        onClick={() =>
                          updateDeathSave('success', i > combatState.deathSaves.successes)
                        }
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
                        onClick={() =>
                          updateDeathSave('failure', i > combatState.deathSaves.failures)
                        }
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
