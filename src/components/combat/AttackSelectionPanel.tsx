/**
 * Attack Selection Panel Component
 *
 * Provides an interface for selecting and executing weapon attacks in combat.
 * Shows available weapons, calculates attack bonuses, and handles attack execution.
 */

import { Sword, Shield, Target, Zap, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';

import type { CombatParticipant, CombatEncounter } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Weapon } from '@/types/combat';
import {
  getWeaponAttackBonus,
  getWeaponDamageBonus,
  rollAttack,
  checkHit,
  calculateAttackDamage,
} from '@/utils/attackUtils';
import { rollDice } from '@/utils/diceUtils';

// ===========================
// Component Props
// ===========================

interface AttackSelectionPanelProps {
  attacker: CombatParticipant;
  targets: CombatParticipant[];
  encounter: CombatEncounter;
  onAttackComplete?: () => void;
}

// ===========================
// Attack Selection Component
// ===========================

const AttackSelectionPanel: React.FC<AttackSelectionPanelProps> = ({
  attacker,
  targets,
  encounter,
  onAttackComplete,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<CombatParticipant | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<'mainHand' | 'offHand' | 'unarmed' | null>(
    null,
  );
  const [attackResult, setAttackResult] = useState<{
    attackRoll: number;
    hit: boolean;
    critical: boolean;
    fumble: boolean;
    damage: number;
    damageType: any;
    description: string;
  } | null>(null);

  // Get available weapons
  const getAvailableWeapons = () => {
    const weapons = [];

    if (attacker.mainHandWeapon) {
      weapons.push({
        id: 'mainHand',
        name: attacker.mainHandWeapon.name,
        damage: attacker.mainHandWeapon.damage,
        damageType: attacker.mainHandWeapon.damageType,
        properties: attacker.mainHandWeapon.properties,
        attackBonus: attacker.mainHandWeapon.attackBonus,
      });
    }

    if (attacker.offHandWeapon) {
      weapons.push({
        id: 'offHand',
        name: attacker.offHandWeapon.name,
        damage: attacker.offHandWeapon.damage,
        damageType: attacker.offHandWeapon.damageType,
        properties: attacker.offHandWeapon.properties,
        attackBonus: attacker.offHandWeapon.attackBonus,
      });
    }

    // Unarmed strike
    weapons.push({
      id: 'unarmed',
      name: 'Unarmed Strike',
      damage: '1',
      damageType: 'bludgeoning' as any,
      properties: {},
      attackBonus: 0,
    });

    return weapons;
  };

  const availableWeapons = getAvailableWeapons();

  // Handle weapon selection
  const handleWeaponSelect = (weaponId: 'mainHand' | 'offHand' | 'unarmed') => {
    setSelectedWeapon(weaponId);
    setAttackResult(null); // Clear previous results
  };

  // Handle target selection
  const handleTargetSelect = (target: CombatParticipant) => {
    setSelectedTarget(target);
    setAttackResult(null); // Clear previous results
  };

  // Execute attack
  const handleAttack = async () => {
    if (!selectedTarget || !selectedWeapon) return;

    // Get selected weapon
    let weapon;
    if (selectedWeapon === 'mainHand' && attacker.mainHandWeapon) {
      weapon = attacker.mainHandWeapon;
    } else if (selectedWeapon === 'offHand' && attacker.offHandWeapon) {
      weapon = attacker.offHandWeapon;
    } else {
      // Unarmed strike
      weapon = {
        name: 'Unarmed Strike',
        damage: '1',
        damageType: 'bludgeoning',
        properties: {},
        attackBonus: 0,
      };
    }

    // Determine if this is an off-hand attack
    const isOffHand = selectedWeapon === 'offHand';

    // Determine if this is a ranged attack
    const isRanged =
      weapon.properties.thrown ||
      weapon.name.toLowerCase().includes('bow') ||
      weapon.name.toLowerCase().includes('crossbow');

    // Roll attack
    const attackRollResult = rollAttack(attacker, selectedTarget, weapon, isOffHand, isRanged);

    // Check if hit
    const hitResult = checkHit(
      attackRollResult.roll.total,
      selectedTarget.armorClass,
      attackRollResult.roll.naturalRoll,
    );

    // Calculate damage if hit
    let damage = 0;
    let damageType: any = 'bludgeoning';
    let damageDescription = '';
    const sneakAttackDamage = 0;
    const sneakAttackDescription = '';

    if (hitResult.hit) {
      const damageResult = calculateAttackDamage(
        weapon,
        attacker,
        attackRollResult.roll.critical || false,
        {
          // Pass any additional options as needed
        },
      );

      damage = damageResult.totalAfterResistance;
      damageType = damageResult.damageType;
      damageDescription = `${damage} ${damageType} damage`;
    }

    // Create action description
    let actionDescription = `${attacker.name} attacks ${selectedTarget.name} with ${weapon.name}`;
    if (attackRollResult.roll.critical) {
      actionDescription += ' (CRITICAL HIT!)';
    }

    const action = {
      participantId: attacker.id,
      targetParticipantId: selectedTarget.id,
      actionType: 'attack' as const,
      description: actionDescription,
      attackRoll: attackRollResult.roll,
      damageRolls: hitResult.hit
        ? [
            calculateAttackDamage(weapon, attacker, attackRollResult.roll.critical || false, {
              // Pass any additional options as needed
            }).rolls,
          ]
        : [],
      hit: hitResult.hit,
      damageDealt: hitResult.hit ? damage : 0,
      damageType: hitResult.hit ? damageType : undefined,
    };

    // Add sneak attack info to description if applicable
    if (hitResult.hit && sneakAttackDamage > 0) {
      action.description += ` [${damageDescription} + ${sneakAttackDescription}]`;
    } else if (hitResult.hit) {
      action.description += ` [${damageDescription}]`;
    }

    // Store result for display
    setAttackResult({
      attackRoll: attackRollResult.roll.total,
      hit: hitResult.hit,
      critical: hitResult.critical,
      fumble: hitResult.fumble,
      damage,
      damageType,
      description: action.description,
    });

    // Record action in combat log
    await encounter.dispatchCombatLogEvent({ type: 'addAction', data: action });

    // If there's an onAttackComplete callback, call it
    if (onAttackComplete) {
      onAttackComplete();
    }
  };

  // Reset selection
  const resetSelection = () => {
    setSelectedWeapon(null);
    setSelectedTarget(null);
    setAttackResult(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sword className="w-5 h-5" />
          Attack Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weapon Selection */}
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Sword className="w-4 h-4" />
            Select Weapon
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableWeapons.map((weapon) => (
              <Button
                key={weapon.id}
                variant={selectedWeapon === weapon.id ? 'default' : 'outline'}
                className="h-auto py-3 px-3 text-left justify-start"
                onClick={() => handleWeaponSelect(weapon.id as 'mainHand' | 'offHand' | 'unarmed')}
              >
                <div className="flex flex-col items-start">
                  <div className="font-medium">{weapon.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {weapon.damage} {weapon.damageType}
                  </div>
                  {weapon.properties && Object.keys(weapon.properties).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(weapon.properties).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs py-0 px-1">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Target Selection */}
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Select Target
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {targets
              .filter((target) => target.id !== attacker.id && target.currentHitPoints > 0)
              .map((target) => (
                <Button
                  key={target.id}
                  variant={selectedTarget?.id === target.id ? 'default' : 'outline'}
                  className="h-auto py-3 px-3 text-left justify-start"
                  onClick={() => handleTargetSelect(target)}
                >
                  <div className="flex flex-col items-start">
                    <div className="font-medium">{target.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      AC {target.armorClass} | HP {target.currentHitPoints}/{target.maxHitPoints}
                    </div>
                    {target.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {target.conditions.slice(0, 2).map((condition, index) => (
                          <Badge key={index} variant="destructive" className="text-xs py-0 px-1">
                            {condition.name}
                          </Badge>
                        ))}
                        {target.conditions.length > 2 && (
                          <Badge variant="secondary" className="text-xs py-0 px-1">
                            +{target.conditions.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
          </div>
        </div>

        <Separator />

        {/* Attack Execution */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleAttack}
            disabled={!selectedWeapon || !selectedTarget}
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Execute Attack
          </Button>
          <Button variant="outline" onClick={resetSelection}>
            Reset
          </Button>
        </div>

        {/* Attack Result */}
        {attackResult && (
          <Card className="border-2 bg-muted">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Attack Result</h4>
                {attackResult.critical ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    CRITICAL HIT!
                  </Badge>
                ) : attackResult.fumble ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Critical Miss
                  </Badge>
                ) : attackResult.hit ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Hit!
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Miss
                  </Badge>
                )}
              </div>

              <p className="text-sm mb-2">{attackResult.description}</p>

              {attackResult.hit && (
                <div className="text-sm">
                  <span className="font-medium">Damage:</span> {attackResult.damage}{' '}
                  {attackResult.damageType}
                </div>
              )}

              <div className="text-sm mt-2">
                <span className="font-medium">Roll:</span> {attackResult.attackRoll}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default AttackSelectionPanel;
