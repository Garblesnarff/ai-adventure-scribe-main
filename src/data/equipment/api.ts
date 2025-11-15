import { armor } from './armor';
import { adventuringGear } from './gear';
import { shields } from './shields';
import { weapons } from './weapons';

import type { Equipment } from './types';

const all: Equipment[] = [...weapons, ...armor, ...shields, ...adventuringGear];

export function calculateArmorClass(
  equippedArmor: Equipment | null,
  equippedShield: Equipment | null,
  dexModifier: number,
  otherBonuses: number = 0,
  characterClass?: string,
  conModifier: number = 0,
  wisModifier: number = 0,
): number {
  const hasUnarmoredDefense =
    characterClass &&
    (characterClass.toLowerCase() === 'barbarian' || characterClass.toLowerCase() === 'monk');
  const isWearingArmor = equippedArmor !== null;
  if (hasUnarmoredDefense && !isWearingArmor) {
    let ac = 10 + dexModifier;
    switch (characterClass!.toLowerCase()) {
      case 'barbarian':
        ac += conModifier;
        break;
      case 'monk':
        ac += wisModifier;
        break;
    }
    if (equippedShield && equippedShield.armorClass) ac += equippedShield.armorClass.base;
    return ac + otherBonuses;
  }
  let ac = 10 + dexModifier;
  if (equippedArmor && equippedArmor.armorClass) {
    const armorAC = equippedArmor.armorClass;
    ac = armorAC.base;
    if (armorAC.dexModifier) {
      const maxDex = armorAC.maxDexModifier !== undefined ? armorAC.maxDexModifier : Infinity;
      ac += Math.min(dexModifier, maxDex);
    }
  }
  if (equippedShield && equippedShield.armorClass) ac += equippedShield.armorClass.base;
  return ac + otherBonuses;
}

export function getEquipmentByCategory(category: Equipment['category']): Equipment[] {
  return all.filter((item) => item.category === category);
}

export function getWeaponsByType(weaponType: 'simple' | 'martial'): Equipment[] {
  return weapons.filter((weapon) => weapon.weaponType === weaponType);
}

export function getArmorByType(armorType: 'light' | 'medium' | 'heavy'): Equipment[] {
  return armor.filter((a) => a.armorType === armorType);
}

export function convertCurrency(
  amount: number,
  fromCurrency: Equipment['cost']['currency'],
  toCurrency: Equipment['cost']['currency'],
): number {
  const rates: Record<Equipment['cost']['currency'], number> = {
    cp: 1,
    sp: 10,
    ep: 50,
    gp: 100,
    pp: 1000,
  };
  const valueInCopper = amount * rates[fromCurrency];
  return valueInCopper / rates[toCurrency];
}

export function formatCurrency(cost: Equipment['cost']): string {
  const { amount, currency } = cost;
  return `${amount} ${currency}`;
}

export function getStartingEquipment(className: string): Equipment[] {
  const classId = className.toLowerCase();
  const packages: Record<string, string[]> = {
    fighter: ['chain-mail', 'shield', 'longsword', 'handaxe', 'handaxe', 'light-crossbow'],
    wizard: ['dagger', 'quarterstaff'],
    rogue: ['leather-armor', 'dagger', 'dagger', 'thieves-tools', 'shortbow'],
    cleric: ['chain-shirt', 'shield', 'mace', 'light-crossbow'],
    barbarian: ['leather-armor', 'shield', 'handaxe', 'handaxe'],
    bard: ['leather-armor', 'dagger', 'rapier'],
    druid: ['leather-armor', 'shield', 'scimitar'],
    monk: ['dagger'],
    paladin: ['chain-mail', 'shield', 'longsword'],
    ranger: ['leather-armor', 'dagger', 'dagger', 'longbow'],
    sorcerer: ['dagger', 'dagger', 'light-crossbow'],
    warlock: ['leather-armor', 'dagger', 'light-crossbow'],
  };
  const equipmentIds = packages[classId] || [];
  const lookup = new Map(all.map((eq) => [eq.id, eq] as const));
  return equipmentIds.map(
    (id) =>
      lookup.get(id) || {
        id,
        name: id.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        category: 'gear' as const,
        cost: { amount: 0, currency: 'gp' as const },
        description: `Starting ${className} equipment`,
      },
  );
}
