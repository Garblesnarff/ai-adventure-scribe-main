/**
 * Two-Weapon Fighting System for D&D 5e
 * 
 * Handles dual wielding mechanics, light weapon requirements, and fighting styles
 */

import { CombatParticipant, WeaponProperties, FightingStyle, DamageType } from '@/types/combat';
import { DiceRollOptions, rollDice, rollAttack, rollDamage } from './diceUtils';

/**
 * Check if a weapon is light (required for basic two-weapon fighting)
 */
export function isLightWeapon(properties: WeaponProperties): boolean {
  return properties.light || false;
}

/**
 * Check if a weapon has finesse (can use Dex for attack/damage)
 */
export function hasFinesseProperty(properties: WeaponProperties): boolean {
  return properties.finesse || false;
}

/**
 * Check if participant can use two-weapon fighting
 */
export function canUseTwoWeaponFighting(participant: CombatParticipant): boolean {
  const { mainHandWeapon, offHandWeapon } = participant;
  
  if (!mainHandWeapon || !offHandWeapon) return false;
  
  // Check if participant has Dual Wielder feat
  const hasDualWielderFeat = participant.classFeatures?.some(f => f.name === 'dual_wielder') || false;
  
  if (hasDualWielderFeat) {
    // With Dual Wielder feat, weapons don't need to be light
    // but they must be one-handed (not two-handed)
    return !mainHandWeapon.properties.twoHanded && !offHandWeapon.properties.twoHanded;
  }
  
  // Without feat, both weapons must be light
  return isLightWeapon(mainHandWeapon.properties) && isLightWeapon(offHandWeapon.properties);
}

/**
 * Check if participant has Two-Weapon Fighting style
 */
export function hasTwoWeaponFightingStyle(participant: CombatParticipant): boolean {
  return participant.fightingStyles?.some(style => style.name === 'two_weapon_fighting') || false;
}

/**
 * Get attack bonus for weapon considering ability scores and proficiency
 */
export function getWeaponAttackBonus(
  weapon: { properties: WeaponProperties; attackBonus: number },
  participant: CombatParticipant,
  isOffHand: boolean = false
): number {
  // This would normally calculate from ability scores + proficiency bonus
  // For now, using the stored attackBonus from weapon
  return weapon.attackBonus;
}

/**
 * Get damage bonus for weapon (ability modifier)
 */
export function getWeaponDamageBonus(
  weapon: { properties: WeaponProperties; attackBonus: number },
  participant: CombatParticipant,
  isOffHand: boolean = false
): number {
  // For off-hand attacks, don't add ability modifier unless Two-Weapon Fighting style
  if (isOffHand && !hasTwoWeaponFightingStyle(participant)) {
    return 0;
  }
  
  // Simplified - would normally calculate from ability scores
  // Assume +3 ability modifier for now
  return 3;
}

/**
 * Make a main hand attack
 */
export function makeMainHandAttack(
  participant: CombatParticipant,
  targetId: string,
  options: DiceRollOptions = {}
): any {
  const { mainHandWeapon } = participant;
  if (!mainHandWeapon) {
    throw new Error('No main hand weapon equipped');
  }
  
  const attackBonus = getWeaponAttackBonus(mainHandWeapon, participant);
  const attackRoll = rollAttack(attackBonus, options);
  
  const damageBonus = getWeaponDamageBonus(mainHandWeapon, participant);
  const damageRolls = rollDamage(mainHandWeapon.damage, attackRoll.critical || false);
  
  // Add damage bonus to first damage roll
  if (damageRolls.length > 0) {
    damageRolls[0].total += damageBonus;
  }
  
  const totalDamage = damageRolls.reduce((sum, roll) => sum + roll.total, 0);
  
  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'attack',
    description: `${participant.name} attacks with ${mainHandWeapon.name}`,
    attackRoll,
    damageRolls,
    damageDealt: totalDamage,
    damageType: mainHandWeapon.damageType,
    hit: attackRoll.total >= 15 // Would check against target AC
  };
}

/**
 * Make an off-hand attack (bonus action)
 */
export function makeOffHandAttack(
  participant: CombatParticipant,
  targetId: string,
  options: DiceRollOptions = {}
): any {
  const { offHandWeapon } = participant;
  if (!offHandWeapon) {
    throw new Error('No off-hand weapon equipped');
  }
  
  if (!canUseTwoWeaponFighting(participant)) {
    throw new Error('Cannot use two-weapon fighting with current weapons');
  }
  
  const attackBonus = getWeaponAttackBonus(offHandWeapon, participant, true);
  const attackRoll = rollAttack(attackBonus, options);
  
  const damageBonus = getWeaponDamageBonus(offHandWeapon, participant, true);
  const damageRolls = rollDamage(offHandWeapon.damage, attackRoll.critical || false);
  
  // Add damage bonus (0 unless Two-Weapon Fighting style)
  if (damageRolls.length > 0) {
    damageRolls[0].total += damageBonus;
  }
  
  const totalDamage = damageRolls.reduce((sum, roll) => sum + roll.total, 0);
  
  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'off_hand_attack',
    description: `${participant.name} attacks with off-hand ${offHandWeapon.name}${damageBonus === 0 ? ' (no ability modifier to damage)' : ''}`,
    attackRoll,
    damageRolls,
    damageDealt: totalDamage,
    damageType: offHandWeapon.damageType,
    hit: attackRoll.total >= 15 // Would check against target AC
  };
}

/**
 * Check if participant can make an off-hand attack
 */
export function canMakeOffHandAttack(participant: CombatParticipant): boolean {
  // Must have attacked with main hand this turn
  if (!participant.actionTaken) return false;
  
  // Must have bonus action available
  if (participant.bonusActionTaken) return false;
  
  // Must be able to use two-weapon fighting
  return canUseTwoWeaponFighting(participant);
}

/**
 * Get AC bonus from Dual Wielder feat
 */
export function getDualWielderACBonus(participant: CombatParticipant): number {
  const hasDualWielderFeat = participant.classFeatures?.some(f => f.name === 'dual_wielder') || false;
  
  if (hasDualWielderFeat && participant.mainHandWeapon && participant.offHandWeapon) {
    return 1; // +1 AC while wielding two weapons
  }
  
  return 0;
}

/**
 * Create default light weapons for testing
 */
export function createDefaultLightWeapons() {
  const scimitar = {
    name: 'Scimitar',
    damage: '1d6',
    damageType: 'slashing' as DamageType,
    properties: {
      light: true,
      finesse: true
    },
    attackBonus: 5
  };
  
  const shortsword = {
    name: 'Shortsword',
    damage: '1d6',
    damageType: 'piercing' as DamageType,
    properties: {
      light: true,
      finesse: true
    },
    attackBonus: 5
  };
  
  const handaxe = {
    name: 'Handaxe',
    damage: '1d6',
    damageType: 'slashing' as DamageType,
    properties: {
      light: true,
      thrown: true
    },
    attackBonus: 5
  };
  
  return { scimitar, shortsword, handaxe };
}

/**
 * Apply weapon to participant's main hand
 */
export function equipMainHandWeapon(
  participant: CombatParticipant,
  weapon: {
    name: string;
    damage: string;
    damageType: DamageType;
    properties: WeaponProperties;
    attackBonus: number;
  }
): CombatParticipant {
  return {
    ...participant,
    mainHandWeapon: weapon
  };
}

/**
 * Apply weapon to participant's off hand
 */
export function equipOffHandWeapon(
  participant: CombatParticipant,
  weapon: {
    name: string;
    damage: string;
    damageType: DamageType;
    properties: WeaponProperties;
    attackBonus: number;
  }
): CombatParticipant {
  return {
    ...participant,
    offHandWeapon: weapon
  };
}