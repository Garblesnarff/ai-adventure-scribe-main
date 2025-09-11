/**
 * Equipment utility functions for combat and inventory management
 */

import { Participant } from '@/types/combat';

/**
 * Creates default light weapons for two-weapon fighting
 */
export function createDefaultLightWeapons() {
  return {
    scimitar: {
      name: 'Scimitar',
      damage: '1d6',
      damageType: 'slashing',
      properties: ['light', 'finesse'],
      weight: 3,
      value: 25
    },
    shortsword: {
      name: 'Shortsword',
      damage: '1d6',
      damageType: 'piercing',
      properties: ['light', 'finesse'],
      weight: 2,
      value: 10
    },
    handaxe: {
      name: 'Handaxe',
      damage: '1d6',
      damageType: 'slashing',
      properties: ['light', 'thrown'],
      weight: 1,
      value: 5
    },
    dagger: {
      name: 'Dagger',
      damage: '1d4',
      damageType: 'piercing',
      properties: ['light', 'finesse', 'thrown'],
      weight: 1,
      value: 2
    }
  };
}

/**
 * Equips a weapon to the main hand slot
 */
export function equipMainHandWeapon(participant: Participant, weapon: any) {
  return {
    ...participant,
    mainHandWeapon: weapon,
    equipment: {
      ...participant.equipment,
      mainHand: weapon
    }
  };
}

/**
 * Equips a weapon to the off-hand slot
 */
export function equipOffHandWeapon(participant: Participant, weapon: any) {
  return {
    ...participant,
    offHandWeapon: weapon,
    equipment: {
      ...participant.equipment,
      offHand: weapon
    }
  };
}

/**
 * Checks if a participant can dual wield based on equipped weapons
 */
export function canDualWield(participant: Participant) {
  const mainWeapon = participant.mainHandWeapon || participant.equipment?.mainHand;
  const offWeapon = participant.offHandWeapon || participant.equipment?.offHand;
  
  if (!mainWeapon || !offWeapon) return false;
  
  const mainIsLight = mainWeapon.properties?.includes('light');
  const offIsLight = offWeapon.properties?.includes('light');
  
  return mainIsLight && offIsLight;
}

/**
 * Gets the equipped weapons for a participant
 */
export function getEquippedWeapons(participant: Participant) {
  return {
    mainHand: participant.mainHandWeapon || participant.equipment?.mainHand,
    offHand: participant.offHandWeapon || participant.equipment?.offHand,
    allWeapons: [
      ...(participant.mainHandWeapon || participant.equipment?.mainHand ? [participant.mainHandWeapon || participant.equipment?.mainHand] : []),
      ...(participant.offHandWeapon || participant.equipment?.offHand ? [participant.offHandWeapon || participant.equipment?.offHand] : [])
    ].filter(Boolean)
  };
}

/**
 * Calculates weapon proficiency bonus
 */
export function getWeaponProficiencyBonus(participant: Participant, weapon: any) {
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const isProficient = participant.proficiencies?.weapons?.includes(weapon.name) || 
                      participant.characterClass === 'fighter' || // Fighters are proficient with all weapons
                      weapon.properties?.includes('simple');
  
  return isProficient ? proficiencyBonus : 0;
}
