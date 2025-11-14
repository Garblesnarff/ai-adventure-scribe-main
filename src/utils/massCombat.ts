/**
 * Mass Combat Utilities for D&D 5e
 *
 * Functions for handling mass combat calculations, army management, and battle resolution
 */

import type {
  Army,
  ArmyUnit,
  ArmyAttack,
  Battlefield,
  CombatRound,
  MassCombatResult,
  CasualtyReport,
  ArmyStatus,
  CombatEvent,
  TacticalManeuver,
  ArmyCommander,
  ControlZone,
} from '@/types/massCombat';

import { rollDice } from '@/utils/diceUtils';

/**
 * Calculate the total strength of an army
 */
export function calculateArmyStrength(army: Army): number {
  return army.units.reduce((total, unit) => {
    return total + unit.size * unit.hitPoints;
  }, 0);
}

/**
 * Calculate damage for an army attack
 */
export function calculateArmyDamage(attack: ArmyAttack, targetUnit: ArmyUnit): number {
  // Parse dice notation
  const diceParts = attack.damage.split('d');
  const diceCount = parseInt(diceParts[0]) || 0;
  const diceSides = parseInt(diceParts[1]) || 0;
  let modifier = 0;

  // Extract modifier if present
  if (diceParts[1].includes('+')) {
    const modParts = diceParts[1].split('+');
    modifier = parseInt(modParts[1]) || 0;
  } else if (diceParts[1].includes('-')) {
    const modParts = diceParts[1].split('-');
    modifier = -(parseInt(modParts[1]) || 0);
  }

  // Roll damage
  const damageRoll = rollDice(diceSides, diceCount, modifier);
  let damage = damageRoll.total;

  // Apply armor protection
  const armorProtection = Math.max(0, targetUnit.armorClass - 10);
  damage = Math.max(1, damage - armorProtection);

  return damage;
}

/**
 * Resolve an attack between two army units
 */
export function resolveArmyAttack(
  attacker: ArmyUnit,
  defender: ArmyUnit,
  attack: ArmyAttack,
): { damage: number; casualties: number; description: string } {
  // Roll to hit
  const toHitRoll = rollDice(20, 1, attack.attackBonus);
  const hits = toHitRoll.total >= defender.armorClass;

  if (!hits) {
    return {
      damage: 0,
      casualties: 0,
      description: `${attacker.name} attacks ${defender.name} but misses.`,
    };
  }

  // Calculate damage
  const damage = calculateArmyDamage(attack, defender);

  // Calculate casualties
  const casualties = Math.floor(damage / defender.hitPoints);
  const survivingUnits = Math.max(0, defender.size - casualties);

  // Update defender
  const updatedDefender = {
    ...defender,
    size: survivingUnits,
  };

  return {
    damage,
    casualties,
    description: `${attacker.name} hits ${defender.name} for ${damage} damage, causing ${casualties} casualties.`,
  };
}

/**
 * Check army morale after taking casualties
 */
export function checkArmyMorale(
  army: Army,
  casualties: number,
): {
  breaks: boolean;
  moraleChange: number;
  description: string;
} {
  // Calculate morale check DC based on casualties
  const casualtyPercentage =
    (casualties / army.units.reduce((sum, unit) => sum + unit.size, 0)) * 100;
  const moraleDC = 10 + Math.floor(casualtyPercentage / 10);

  // Roll morale check
  const armyMorale = army.units.reduce((sum, unit) => sum + unit.morale, 0) / army.units.length;
  const moraleRoll = rollDice(20, 1, Math.floor(armyMorale / 2));

  const breaks = moraleRoll.total < moraleDC;
  const moraleChange = breaks ? -2 : 1;

  const description = breaks
    ? `${army.name}'s army breaks and begins to rout!`
    : `${army.name}'s army stands firm despite casualties.`;

  return { breaks, moraleChange, description };
}

/**
 * Move an army on the battlefield
 */
export function moveArmy(army: Army, newX: number, newY: number, battlefield: Battlefield): Army {
  // Check if movement is within battlefield bounds
  const withinBounds =
    newX >= 0 &&
    newX <= battlefield.dimensions.width &&
    newY >= 0 &&
    newY <= battlefield.dimensions.height;

  if (!withinBounds) {
    return army; // No movement if outside bounds
  }

  // Calculate distance
  const dx = newX - army.position.x;
  const dy = newY - army.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Update army position
  return {
    ...army,
    position: { x: newX, y: newY },
  };
}

/**
 * Simulate one round of mass combat
 */
export function simulateCombatRound(
  armies: Army[],
  battlefield: Battlefield,
  roundNumber: number,
): CombatRound {
  const events: CombatEvent[] = [];
  const armyStatus: ArmyStatus[] = [];

  // Process each army's turn
  for (const army of armies) {
    // Skip destroyed or routing armies
    if (army.status === 'destroyed' || army.status === 'routing') {
      armyStatus.push({
        armyId: army.id,
        morale: army.units.reduce((sum, unit) => sum + unit.morale, 0) / army.units.length,
        supplies: army.supplies || 0,
        position: army.position,
        status: army.status,
      });
      continue;
    }

    // Army takes actions
    const roundEvents: CombatEvent[] = [];

    // Each unit in the army can act
    for (const unit of army.units) {
      // Skip destroyed units
      if (unit.size <= 0) continue;

      // Find a target (simplified - in a real implementation, this would be more complex)
      const enemyArmies = armies.filter((a) => a.faction !== army.faction && a.status === 'active');
      if (enemyArmies.length === 0) continue;

      const targetArmy = enemyArmies[0]; // Simplified target selection
      const targetUnit = targetArmy.units.find((u) => u.size > 0); // First available unit

      if (!targetUnit) continue;

      // Attack with each attack option
      for (const attack of unit.attacks) {
        const result = resolveArmyAttack(unit, targetUnit, attack);

        roundEvents.push({
          id: `attack-${Date.now()}-${Math.random()}`,
          type: 'attack',
          description: result.description,
          affectedArmies: [army.id, targetArmy.id],
        });
      }
    }

    // Update army status
    armyStatus.push({
      armyId: army.id,
      morale: army.units.reduce((sum, unit) => sum + unit.morale, 0) / army.units.length,
      supplies: army.supplies || 0,
      position: army.position,
      status: army.status,
    });

    // Add events to main events array
    events.push(...roundEvents);
  }

  return {
    roundNumber,
    events,
    armyStatus,
  };
}

/**
 * Determine if the battle has ended
 */
export function isBattleEnded(armies: Army[]): { ended: boolean; victor: string | null } {
  // Group armies by faction
  const factions: Record<string, Army[]> = {};

  armies.forEach((army) => {
    if (!factions[army.faction]) {
      factions[army.faction] = [];
    }
    factions[army.faction].push(army);
  });

  // Count active armies per faction
  const activeFactions: string[] = [];

  Object.keys(factions).forEach((faction) => {
    const activeArmies = factions[faction].filter(
      (army) => army.status === 'active' && army.units.some((unit) => unit.size > 0),
    );

    if (activeArmies.length > 0) {
      activeFactions.push(faction);
    }
  });

  // Battle ends when only one faction remains or no factions remain
  if (activeFactions.length === 0) {
    return { ended: true, victor: null }; // Draw
  }

  if (activeFactions.length === 1) {
    return { ended: true, victor: activeFactions[0] }; // Victory
  }

  return { ended: false, victor: null }; // Battle continues
}

/**
 * Calculate casualties for an army
 */
export function calculateCasualties(army: Army, initialArmy: Army): CasualtyReport {
  const initialCount = initialArmy.units.reduce((sum, unit) => sum + unit.size, 0);
  const currentCount = army.units.reduce((sum, unit) => sum + unit.size, 0);
  const losses = initialCount - currentCount;

  return {
    armyId: army.id,
    unitType: army.units[0]?.type || 'infantry', // Simplified
    initialCount,
    losses,
    survivors: currentCount,
  };
}

/**
 * Execute a tactical maneuver
 */
export function executeTacticalManeuver(
  maneuver: TacticalManeuver,
  commander: ArmyCommander,
  army: Army,
): { success: boolean; effect: string; description: string } {
  // Check if commander has required level
  if (commander.level < maneuver.requiredCommanderLevel) {
    return {
      success: false,
      effect: '',
      description: `${commander.name} is not experienced enough to execute ${maneuver.name}.`,
    };
  }

  // Apply maneuver effect (simplified)
  let effectDescription = '';

  switch (maneuver.id) {
    case 'flank_1':
      effectDescription = 'Units gain advantage on next attack roll.';
      break;
    case 'charge_1':
      effectDescription = 'Cavalry units deal double damage on next attack.';
      break;
    case 'rally_1':
      effectDescription = 'Nearby friendly units regain 2 morale points.';
      break;
    default:
      effectDescription = 'Tactical maneuver executed successfully.';
  }

  return {
    success: true,
    effect: effectDescription,
    description: `${commander.name} executes ${maneuver.name}: ${effectDescription}`,
  };
}

/**
 * Resupply an army
 */
export function resupplyArmy(army: Army, supplies: number): Army {
  return {
    ...army,
    supplies: (army.supplies || 0) + supplies,
  };
}

/**
 * Calculate strategic points from controlling zones
 */
export function calculateStrategicPoints(army: Army, controlZones: ControlZone[]): number {
  const controlledZones = controlZones.filter((zone) => zone.controllingArmyId === army.id);
  return controlledZones.reduce((sum, zone) => sum + zone.strategicValue, 0);
}

/**
 * Create a default mass combat result
 */
export function createDefaultCombatResult(): MassCombatResult {
  return {
    victor: null,
    survivingArmies: [],
    casualtyReports: [],
    battleLog: [],
    strategicPoints: 0,
  };
}
