/**
 * Attack Resolution Utilities for D&D 5e Combat System
 *
 * Handles attack rolls, damage calculation, AC checks, critical hits,
 * and multi-attack mechanics based on character equipment and stats.
 */

import type { Equipment } from '@/data/equipmentOptions';
import type { CombatParticipant, CombatAction, DamageType, DiceRoll } from '@/types/combat';

import { calculateProficiencyBonus } from '@/utils/character-calculations';
import { rollAttack, rollDamage, calculateDamage } from '@/utils/diceUtils';

export interface AttackResolution {
  hit: boolean;
  roll: DiceRoll;
  acHit: number; // The AC that was targeted/achieved
  criticalHit: boolean;
  criticalFail: boolean;
  advantage: boolean;
  disadvantage: boolean;
}

export interface DamageCalculation {
  rolls: DiceRoll[];
  totalBeforeResistance: number;
  totalAfterResistance: number;
  damageType: DamageType;
  resistances: DamageType[];
  vulnerabilities: DamageType[];
  immunities: DamageType[];
}

export interface FullAttackResult {
  resolution: AttackResolution;
  damage: DamageCalculation | null; // null if attack missed
  targetReducedHp?: number; // HP after damage applied
  totalDamageDealt?: number;
}

/**
 * Resolve an attack: roll attack dice and check against target AC
 */
export function resolveAttack(
  weapon: Equipment | null,
  attacker: CombatParticipant,
  target: CombatParticipant,
  options: {
    advantage?: boolean;
    disadvantage?: boolean;
    spellAttack?: boolean;
    divineSmiteLevel?: number;
    sneakAttack?: boolean;
  } = {},
): AttackResolution {
  const level = attacker.level || 1;
  const profBonus = calculateProficiencyBonus(level);

  // Calculate attack bonus based on weapon properties
  let attackBonus = 0;

  if (options.spellAttack) {
    // Spell attack: prof + spellcasting ability
    const spellAbility = getSpellcastingAbility(attacker);
    attackBonus = profBonus + (spellAbility || 0);
  } else if (weapon) {
    // Physical weapon attack
    const strMod = getAbilityModifier(attacker, 'strength');
    const dexMod = getAbilityModifier(attacker, 'dexterity');

    // Use finesse logic: higher of STR or DEX
    if (weapon.weaponProperties?.finesse) {
      attackBonus = profBonus + Math.max(strMod, dexMod);
    }
    // Use STR for melee weapons
    else if (!weapon.range) {
      attackBonus = profBonus + strMod;
    }
    // Use DEX for ranged weapons
    else {
      attackBonus = profBonus + dexMod;
    }

    // Add weapon-specific attack bonus (for magic weapons)
    attackBonus += weapon.attackBonus || 0;
  }

  // Apply condition-based advantage/disadvantage
  let hasAdvantage = options.advantage || false;
  let hasDisadvantage = options.disadvantage || false;

  // Check attacker conditions for advantage/disadvantage
  attacker.conditions.forEach((condition) => {
    switch (condition.name) {
      case 'invisible':
        hasAdvantage = true; // Attacker has advantage
        break;
      case 'blinded':
        hasDisadvantage = true; // Attacker has disadvantage
        break;
      case 'poisoned':
        hasDisadvantage = true; // Attacker has disadvantage
        break;
    }
  });

  // Check target conditions for advantage/disadvantage
  target.conditions.forEach((condition) => {
    switch (condition.name) {
      case 'prone':
        // melee advantage, but only if weapon is melee
        if (!weapon?.range) hasAdvantage = true;
        break;
      case 'paralyzed':
        hasAdvantage = true; // Auto-hit on critical (already covered)
        break;
      case 'stunned':
        hasAdvantage = true; // Auto-hit on critical (already covered)
        break;
      case 'unconscious':
        hasAdvantage = true; // Auto-hit on critical (already covered)
        break;
      case 'blinded':
        hasAdvantage = true; // Attacker has advantage
        break;
    }
  });

  // Can't have both advantage and disadvantage
  if (hasAdvantage && hasDisadvantage) {
    hasAdvantage = hasDisadvantage = false;
  }

  // Roll attack
  const roll = rollAttack(attackBonus, {
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
  });

  // Determine if attack hits
  const targetAC = target.armorClass;
  let hit = roll.total >= targetAC;

  // Critical hit/fail rules
  const criticalHit = roll.naturalRoll === 20;
  const criticalFail = roll.naturalRoll === 1;

  // Critical hits always hit (unless critical fail)
  if (criticalHit && !criticalFail) {
    hit = true;
  }

  return {
    hit,
    roll,
    acHit: targetAC,
    criticalHit,
    criticalFail,
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
  };
}

/**
 * Calculate damage for an attack
 */
export function calculateAttackDamage(
  weapon: Equipment | null,
  attacker: CombatParticipant,
  criticalHit: boolean,
  options: {
    divineSmiteLevel?: number;
    sneakAttack?: boolean;
  } = {},
): DamageCalculation {
  let damageRolls: DiceRoll[] = [];
  let baseDamage = 0;
  let damageType: DamageType = 'piercing';

  if (!weapon) {
    // Unarmed strike
    damageRolls = rollDamage('1d4', criticalHit, {});
    baseDamage = damageRolls.reduce(
      (sum, roll) =>
        sum + roll.results.reduce((rSum, r) => rSum + r, 0) + roll.modifier * roll.count,
      0,
    );
    damageType = 'bludgeoning';
  } else if (weapon.damage) {
    // Weapon damage
    damageRolls = rollDamage(weapon.damage.dice, criticalHit, {});
    baseDamage = damageRolls.reduce(
      (sum, roll) =>
        sum + roll.results.reduce((rSum, r) => rSum + r, 0) + roll.modifier * roll.count,
      0,
    );
    damageType = weapon.damage.type;

    // Add ability modifiers
    const strMod = getAbilityModifier(attacker, 'strength');
    const dexMod = getAbilityModifier(attacker, 'dexterity');

    if (weapon.weaponProperties?.finesse) {
      baseDamage += Math.max(strMod, dexMod);
    } else if (!weapon.range) {
      // Melee weapon uses STR
      baseDamage += strMod;
    } else {
      // Ranged weapon uses DEX
      baseDamage += dexMod;
    }

    // Magic weapon bonus
    if (weapon.weaponProperties?.magical) {
      baseDamage += weapon.magicBonus || 0;
    }
  }

  // Add Divine Smite damage
  if (options.divineSmiteLevel) {
    const smiteRoll = rollDamage(`1d8+${options.divineSmiteLevel - 1}`, false, {});
    damageRolls = [...damageRolls, ...smiteRoll];
    damageType = 'radiant'; // Divine smite is radiant damage
  }

  // Add Sneak Attack damage
  if (options.sneakAttack) {
    const sneakDice = getSneakAttackDice(attacker.level || 1);
    const sneakRoll = rollDamage(sneakDice, false, {});
    damageRolls = [...damageRolls, ...sneakRoll];
  }

  // Add Barbarian Rage damage bonus
  if (attacker.isRaging && attacker.characterClass === 'barbarian') {
    const rageBonus = Math.floor((attacker.level || 1) / 4) || 2;
    baseDamage += rageBonus;
  }

  const totalBeforeResistance = baseDamage;

  // Apply resistances, immunities, vulnerabilities
  const totalAfterResistance = calculateDamage(
    totalBeforeResistance,
    damageType,
    attacker.damageResistances || [],
    attacker.damageImmunities || [],
    attacker.damageVulnerabilities || [],
  );

  return {
    rolls: damageRolls,
    totalBeforeResistance,
    totalAfterResistance,
    damageType,
    resistances: attacker.damageResistances || [],
    vulnerabilities: attacker.damageVulnerabilities || [],
    immunities: attacker.damageImmunities || [],
  };
}

/**
 * Execute complete attack resolution (attack + damage)
 */
export function performAttack(
  weapon: Equipment | null,
  attacker: CombatParticipant,
  target: CombatParticipant,
  options: {
    advantage?: boolean;
    disadvantage?: boolean;
    spellAttack?: boolean;
    divineSmiteLevel?: number;
    sneakAttack?: boolean;
  } = {},
): FullAttackResult {
  // Resolve the attack
  const resolution = resolveAttack(weapon, attacker, target, options);

  // If attack misses and it's not a critical hit/fail, return result with no damage
  if (!resolution.hit && !resolution.criticalHit && !resolution.criticalFail) {
    return {
      resolution,
      damage: null,
    };
  }

  // Calculate damage
  const damage = calculateAttackDamage(weapon, attacker, resolution.criticalHit, options);

  // Calculate final damage after target's resistances/vulnerabilities
  const damageToDeal = calculateDamage(
    damage.totalBeforeResistance,
    damage.damageType,
    target.damageResistances || [],
    target.damageImmunities || [],
    target.damageVulnerabilities || [],
  );

  // Apply temporary HP first
  const tempHpToReduce = Math.min(target.temporaryHitPoints, damageToDeal);
  const remainingDamage = damageToDeal - tempHpToReduce;
  const newTempHp = target.temporaryHitPoints - tempHpToReduce;
  const newHp =
    remainingDamage > 0
      ? Math.max(0, target.currentHitPoints - remainingDamage)
      : target.currentHitPoints;

  return {
    resolution,
    damage: {
      ...damage,
      totalAfterResistance: damageToDeal,
    },
    targetReducedHp: newHp,
    totalDamageDealt: damageToDeal,
  };
}

/**
 * Get number of attacks for multi-attack feature
 */
export function getNumberOfAttacks(
  cfg: { specific?: Record<string, unknown> } | null | undefined,
  characterClass: string,
  level: number,
): number {
  // Martial classes with Extra Attack
  if (['fighter', 'paladin', 'ranger', 'barbarian'].includes(characterClass.toLowerCase())) {
    if (level >= 11) return 3; // Level 11: Three attacks
    if (level >= 5) return 2; // Level 5: Two attacks
  }

  // Other classes with Extra Attack
  if (['rogue', 'monk'].includes(characterClass.toLowerCase())) {
    if (level >= 5) return 2; // Level 5: Two attacks
  }

  // Eldritch Knight and Arcane Trickster
  if (characterClass.toLowerCase() === 'fighter') {
    if (cfg?.specific && typeof cfg.specific['eldritch_knight'] !== 'undefined' && level >= 5) {
      return 2;
    }
  }

  return 1; // Default: one attack
}

/**
 * Check if sneak attack can be applied.
 */
export function canUseSneakAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  allParticipants: CombatParticipant[] = [],
): boolean {
  // Must be a rogue
  if (attacker.characterClass?.toLowerCase() !== 'rogue') return false;

  // Basic condition: advantage on the attack roll.
  const hasAdvantage =
    attacker.conditions.some((c) => c.name === 'invisible') ||
    target.conditions.some((c) =>
      ['prone', 'stunned', 'paralyzed', 'unconscious'].includes(c.name),
    );

  if (hasAdvantage) return true;

  // Sneak attack also applies if another enemy of the target is within 5 feet of it,
  // that enemy isn't incapacitated, and the attacker doesn't have disadvantage.

  // TODO: This is a placeholder for ally position tracking.
  // A full implementation requires iterating through `allParticipants` and calculating
  // the distance between each of the attacker's allies and the target.
  // For now, we'll simulate this by checking if any other non-incapacitated ally exists.
  const isAllyNearby = allParticipants.some(
    (p) =>
      p.id !== attacker.id &&
      p.participantType === attacker.participantType &&
      !p.conditions.some((c) => c.name === 'incapacitated'),
  );

  return isAllyNearby;
}

/**
 * Get ability modifier from participant
 * Uses default values for common abilities if not specified
 */
function getAbilityModifier(participant: CombatParticipant, ability: string): number {
  // Default ability scores for basic combat
  const defaultAbilityScores: { [key: string]: number } = {
    strength: 14, // Average human
    dexterity: 14,
    constitution: 14,
    intelligence: 12,
    wisdom: 12,
    charisma: 12,
  };

  // For spells, override with known ability scores based on class
  if (ability === 'spellcasting') {
    switch (participant.characterClass?.toLowerCase()) {
      case 'wizard':
      case 'artificer':
      case 'arcane_trickster':
        return Math.floor(participant.level || 3); // Intellect bonus approximation
      case 'sorcerer':
      case 'bard':
      case 'warlock':
      case 'paladin':
        return Math.floor(participant.level || 3); // Charisma bonus approximation
      case 'cleric':
      case 'druid':
      case 'ranger':
        return Math.floor(participant.level || 3); // Wisdom bonus approximation
      default:
        return 3; // Default +3 bonus
    }
  }

  // Get modifier from default scores (floor of (score-10)/2)
  const score = defaultAbilityScores[ability.toLowerCase()] || 12;
  return Math.floor((score - 10) / 2);
}

/**
 * Get spellcasting ability modifier
 */
function getSpellcastingAbility(attacker: CombatParticipant): number {
  // Determine spellcasting ability based on class
  let spellAbilityName: string;

  switch (attacker.characterClass?.toLowerCase()) {
    case 'wizard':
    case 'artificer':
    case 'cloak_of_elvenkind':
    case 'arcane_trickster':
      spellAbilityName = 'intelligence';
      break;
    case 'sorcerer':
    case 'bard':
    case 'warlock':
    case 'paladin':
      spellAbilityName = 'charisma';
      break;
    case 'cleric':
    case 'druid':
    case 'ranger':
      spellAbilityName = 'wisdom';
      break;
    default:
      return 0;
  }

  return getAbilityModifier(attacker, spellAbilityName);
}

/**
 * Get sneak attack dice for rogue level
 */
function getSneakAttackDice(level: number): string {
  const dice = Math.ceil((level + 1) / 2); // 1d6 at lvl 1-2, 2d6 at 3-4, etc.
  return `${dice}d6`;
}

/**
 * Create combat action from attack result
 */
export function createCombatActionFromAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  weapon: Equipment | null,
  result: FullAttackResult,
): CombatAction {
  const isSpellAttack = !!(
    weapon &&
    typeof weapon === 'object' &&
    'isSpell' in (weapon as Record<string, unknown>) &&
    (weapon as Record<string, unknown>).isSpell === true
  );
  const attackType = isSpellAttack ? 'cast_spell' : 'attack';

  return {
    id: crypto.randomUUID(),
    encounterId: '', // Will be set by caller
    participantId: attacker.id,
    targetParticipantId: target.id,
    round: 0, // Will be set by caller
    turnOrder: 0, // Will be set by caller
    actionType: attackType,
    description: generateAttackDescription(attacker, target, weapon, result),
    attackRoll: result.resolution.roll,
    damageRolls: result.damage?.rolls || [],
    hit: result.resolution.hit,
    damageDealt: result.totalDamageDealt || 0,
    damageType: result.damage?.damageType || 'piercing',
    timestamp: new Date(),
  };
}

/**
 * Generate attack description
 */
function generateAttackDescription(
  attacker: CombatParticipant,
  target: CombatParticipant,
  weapon: Equipment | null,
  result: FullAttackResult,
): string {
  const weaponName = weapon?.name || 'unarmed strike';

  if (!result.resolution.hit && !result.resolution.criticalHit) {
    return `${attacker.name} misses ${target.name} with ${weaponName}.`;
  }

  if (result.resolution.criticalHit) {
    return `${attacker.name} scores a critical hit on ${target.name} with ${weaponName} for ${result.totalDamageDealt} damage!`;
  }

  return `${attacker.name} hits ${target.name} with ${weaponName} for ${result.totalDamageDealt} damage.`;
}
