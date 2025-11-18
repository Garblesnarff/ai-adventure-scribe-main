/**
 * State utility functions for Knave rules
 */

import type { Actor, Armor, Ability, ArmorClass } from './types.js';

/**
 * Calculate ability modifier from ability score
 * Formula: (score - 10) / 2, rounded down
 */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Get proficiency bonus based on level
 * In Knave, level IS the proficiency bonus
 */
export function getProficiencyBonus(level: number): number {
  return level;
}

/**
 * Get proficiency bonus for an actor
 */
export function getActorProficiencyBonus(actor: Actor): number {
  return getProficiencyBonus(actor.level);
}

/**
 * Calculate maximum HP
 * Knave: 8 per level + (CON modifier × level), minimum 1 HP per level
 */
export function calculateMaxHp(level: number, conMod: number): number {
  const baseHp = level * 8;
  const conBonus = conMod * level;
  return Math.max(level, baseHp + conBonus);
}

/**
 * Calculate armor class
 * Knave: 11 + armor bonus + DEX modifier
 */
export function calculateArmorClass(actor: Actor): number {
  const dexMod = abilityMod(actor.abilities.dex);
  const armorBonus = actor.equippedArmor?.acBonus ?? 0;
  return 11 + armorBonus + dexMod;
}

/**
 * Parse ability name from string
 */
export function parseAbility(name: string): Ability | null {
  const abilities: Record<string, Ability> = {
    str: 'str',
    strength: 'str',
    dex: 'dex',
    dexterity: 'dex',
    con: 'con',
    constitution: 'con',
    int: 'int',
    intelligence: 'int',
    wis: 'wis',
    wisdom: 'wis',
    cha: 'cha',
    charisma: 'cha',
  };
  return abilities[name.toLowerCase()] || null;
}
