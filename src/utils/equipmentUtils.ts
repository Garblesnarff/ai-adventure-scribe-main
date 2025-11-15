/**
 * Equipment utility functions for combat and inventory management
 */

import type { Equipment } from '@/data/equipmentOptions';
import type { CombatParticipant } from '@/types/combat';

type WeaponLike = {
  name: string;
  damage?: string;
  damageType?: string;
  properties?: string[];
  weight?: number;
  value?: number;
};

/**
 * Creates default light weapons for two-weapon fighting
 */
export function createDefaultLightWeapons() {
  const scimitar: Equipment = {
    id: 'scimitar-temp',
    name: 'Scimitar',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 25, currency: 'gp' },
    weight: 3,
    description: 'A curved, single-edged blade.',
    damage: { dice: '1d6', type: 'slashing' },
    attackBonus: 0,
    weaponProperties: { finesse: true, light: true },
  };

  const shortsword: Equipment = {
    id: 'shortsword-temp',
    name: 'Shortsword',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 10, currency: 'gp' },
    weight: 2,
    description: 'A short, versatile piercing blade.',
    damage: { dice: '1d6', type: 'piercing' },
    attackBonus: 0,
    weaponProperties: { finesse: true, light: true },
  };

  const handaxe: Equipment = {
    id: 'handaxe-temp',
    name: 'Handaxe',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 5, currency: 'gp' },
    weight: 2,
    description: 'A small axe for one-handed use.',
    damage: { dice: '1d6', type: 'slashing' },
    attackBonus: 0,
    weaponProperties: { light: true, thrown: true },
  };

  const dagger: Equipment = {
    id: 'dagger-temp',
    name: 'Dagger',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 2, currency: 'gp' },
    weight: 1,
    description: 'A sharp, lightweight blade.',
    damage: { dice: '1d4', type: 'piercing' },
    attackBonus: 0,
    weaponProperties: { finesse: true, light: true, thrown: true },
    range: { normal: 20, long: 60 },
  };

  return { scimitar, shortsword, handaxe, dagger };
}

/**
 * Equips a weapon to the main hand slot
 */
export function equipMainHandWeapon(
  participant: CombatParticipant,
  weapon: Equipment,
): CombatParticipant {
  return {
    ...participant,
    mainHandWeapon: weapon,
  };
}

/**
 * Equips a weapon to the off-hand slot
 */
export function equipOffHandWeapon(
  participant: CombatParticipant,
  weapon: Equipment,
): CombatParticipant {
  return {
    ...participant,
    offHandWeapon: weapon,
  };
}

/**
 * Checks if a participant can dual wield based on equipped weapons
 */
export function canDualWield(participant: CombatParticipant) {
  const mainWeapon = participant.mainHandWeapon;
  const offWeapon = participant.offHandWeapon;

  if (!mainWeapon || !offWeapon) return false;

  const mainIsLight = mainWeapon.weaponProperties?.light;
  const offIsLight = offWeapon.weaponProperties?.light;

  return mainIsLight && offIsLight;
}

/**
 * Gets the equipped weapons for a participant
 */
export function getEquippedWeapons(participant: CombatParticipant) {
  return {
    mainHand: participant.mainHandWeapon,
    offHand: participant.offHandWeapon,
    allWeapons: [
      ...(participant.mainHandWeapon ? [participant.mainHandWeapon] : []),
      ...(participant.offHandWeapon ? [participant.offHandWeapon] : []),
    ].filter(Boolean),
  };
}

/**
 * Calculates weapon proficiency bonus
 */
export function getWeaponProficiencyBonus(participant: CombatParticipant, weapon: Equipment) {
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const cls = (participant.characterClass || '').toLowerCase();
  const martialByClass = ['fighter', 'paladin', 'ranger', 'barbarian'];
  const martialProficient = martialByClass.includes(cls);
  const isProficient = weapon.weaponType === 'martial' ? martialProficient : true;
  return isProficient ? proficiencyBonus : 0;
}
