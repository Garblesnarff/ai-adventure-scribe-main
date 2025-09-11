/**
 * Two-weapon fighting utility functions for D&D 5e combat
 */

import { Participant } from '@/types/combat';
import { rollDice, rollAttack, rollDamage } from '@/utils/diceUtils';
import { getEquippedWeapons } from './equipmentUtils';

/**
 * Checks if a participant can use two-weapon fighting
 * Requirements: Must have light weapons in both hands, not using a shield
 */
export function canUseTwoWeaponFighting(participant: Participant): boolean {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;
  const offHandWeapon = weapons.offHand;
  
  // Must have weapons in both hands
  if (!mainWeapon || !offHandWeapon) {
    return false;
  }
  
  // Both must be light weapons
  const mainIsLight = mainWeapon.properties?.includes('light') || false;
  const offIsLight = offHandWeapon.properties?.includes('light') || false;
  
  if (!mainIsLight || !offIsLight) {
    return false;
  }
  
  // Cannot use if holding a shield or spellcasting focus in off hand
  const offHandIsShield = offHandWeapon.name?.toLowerCase().includes('shield');
  const offHandIsFocus = offHandWeapon.properties?.includes('focus');
  
  if (offHandIsShield || offHandIsFocus) {
    return false;
  }
  
  // Check if bonus action is available
  const bonusActionAvailable = !participant.bonusActionTaken;
  
  return bonusActionAvailable;
}

/**
 * Creates a main hand attack action for two-weapon fighting
 */
export function makeMainHandAttack(
  participant: Participant, 
  targetId?: string
): any {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;
  
  if (!mainWeapon) {
    throw new Error('No main hand weapon equipped');
  }
  
  // Calculate attack bonus
  const abilityModifier = participant.abilityScores?.strength?.modifier || 
                         participant.abilityScores?.dexterity?.modifier || 0;
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const attackBonus = abilityModifier + proficiencyBonus;
  
  // Roll attack
  const attackRoll = rollAttack(attackBonus, {
    advantage: participant.conditions?.some(c => c.name === 'advantage') || false,
    disadvantage: participant.conditions?.some(c => c.name === 'disadvantage') || false
  });
  
  // Calculate damage
  const damageRoll = rollDamage(mainWeapon.damage, abilityModifier, 
    participant.characterClass === 'fighter' || // Fighting Style: Two-Weapon Fighting
    participant.fightingStyles?.some(fs => fs.name === 'two_weapon_fighting')
  );
  
  const isCritical = attackRoll.critical;
  
  if (isCritical) {
    damageRoll.results = damageRoll.results.flatMap(result => [result, result]);
    damageRoll.total *= 2;
  }
  
  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'attack' as const,
    description: `${participant.name} attacks with ${mainWeapon.name} (main hand)`,
    weaponUsed: mainWeapon,
    attackRoll,
    damageRoll,
    hit: attackRoll.total >= 15, // Would check against target AC
    damageDealt: damageRoll.total,
    damageType: mainWeapon.damageType || 'slashing',
    actionUsed: true,
    bonusActionUsed: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates an off-hand attack action for two-weapon fighting
 * Note: Off-hand attacks do not add ability modifier to damage
 */
export function makeOffHandAttack(
  participant: Participant, 
  targetId?: string
): any {
  const weapons = getEquippedWeapons(participant);
  const offHandWeapon = weapons.offHand;
  
  if (!offHandWeapon) {
    throw new Error('No off-hand weapon equipped');
  }
  
  // Calculate attack bonus (same as main hand)
  const abilityModifier = participant.abilityScores?.strength?.modifier || 
                         participant.abilityScores?.dexterity?.modifier || 0;
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const attackBonus = abilityModifier + proficiencyBonus;
  
  // Roll attack
  const attackRoll = rollAttack(attackBonus, {
    advantage: participant.conditions?.some(c => c.name === 'advantage') || false,
    disadvantage: participant.conditions?.some(c => c.name === 'disadvantage') || false
  });
  
  // Calculate damage (no ability modifier for off-hand attacks)
  const damageRoll = rollDamage(offHandWeapon.damage, 0, // No modifier
    participant.characterClass === 'fighter' || // Fighting Style: Two-Weapon Fighting
    participant.fightingStyles?.some(fs => fs.name === 'two_weapon_fighting')
  );
  
  const isCritical = attackRoll.critical;
  
  if (isCritical) {
    damageRoll.results = damageRoll.results.flatMap(result => [result, result]);
    damageRoll.total *= 2;
  }
  
  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'bonus_attack' as const,
    description: `${participant.name} attacks with ${offHandWeapon.name} (off-hand)`,
    weaponUsed: offHandWeapon,
    attackRoll,
    damageRoll,
    hit: attackRoll.total >= 15, // Would check against target AC
    damageDealt: damageRoll.total,
    damageType: offHandWeapon.damageType || 'slashing',
    actionUsed: false,
    bonusActionUsed: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Checks if off-hand attack can be made (bonus action available)
 */
export function canMakeOffHandAttack(participant: Participant): boolean {
  // Check if two-weapon fighting is possible and bonus action is available
  const canTwoWeaponFight = canUseTwoWeaponFighting(participant);
  const bonusActionAvailable = !participant.bonusActionTaken;
  
  return canTwoWeaponFight && bonusActionAvailable;
}

/**
 * Calculates total attacks possible with two-weapon fighting
 */
export function calculateTwoWeaponAttacks(participant: Participant): {
  mainHandAttacks: number;
  offHandAttacks: number;
  totalAttacks: number;
} {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;
  const offHandWeapon = weapons.offHand;
  
  let mainHandAttacks = 1; // Base action
  let offHandAttacks = 0;
  
  // Extra Attack feature (level 5+ for most martial classes)
  if (participant.level && participant.level >= 5 && 
      ['fighter', 'paladin', 'ranger', 'barbarian'].includes(participant.characterClass || '')) {
    mainHandAttacks += 1;
  }
  
  // Action Surge for fighters (if available)
  if (participant.characterClass === 'fighter' && participant.level && participant.level >= 2 &&
      participant.resources?.action_surge?.currentUses && participant.resources.action_surge.currentUses > 0) {
    mainHandAttacks += 1; // Additional action
  }
  
  // Off-hand attack if conditions met
  if (canMakeOffHandAttack(participant)) {
    offHandAttacks = 1;
  }
  
  return {
    mainHandAttacks,
    offHandAttacks,
    totalAttacks: mainHandAttacks + offHandAttacks
  };
}

/**
 * Gets the attack sequence for two-weapon fighting
 */
export function getTwoWeaponAttackSequence(participant: Participant): string[] {
  const attacks = calculateTwoWeaponAttacks(participant);
  const sequence: string[] = [];
  
  // Main hand attacks first (action)
  for (let i = 0; i < attacks.mainHandAttacks; i++) {
    sequence.push('main_hand');
  }
  
  // Off-hand attack (bonus action)
  if (attacks.offHandAttacks > 0) {
    sequence.push('off_hand');
  }
  
  return sequence;
}
