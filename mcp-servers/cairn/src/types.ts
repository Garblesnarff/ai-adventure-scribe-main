// Type definitions for Cairn MCP server

export interface CairnWeapon {
  name: string;
  damageDice: string;
  damageType?: string;
  slots: number;
  hands: 1 | 2;
  properties?: string[];
}

export interface CairnArmor {
  name: string;
  value: number;
  slots: number;
  description?: string;
}

export interface CairnGear {
  name: string;
  slots: number;
  description: string;
}

export interface CairnScar {
  range: [number, number];
  description: string;
  effect: string;
  ability?: 'str' | 'dex' | 'wil';
}

export interface CairnSpellbook {
  name: string;
  description: string;
}

export interface CairnTrait {
  type: 'background' | 'physique' | 'skin' | 'hair';
  name: string;
  description: string;
}

export interface SaveParams {
  ability: 'str' | 'dex' | 'wil';
  abilityScore: number;
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number;
}

export interface AttackParams {
  weaponDice: string;
  impaired?: boolean;
  enhanced?: boolean;
}

export interface DamageParams {
  damage: number;
  armorValue?: number;
  currentHp: number;
}

export interface CriticalDamageParams {
  excessDamage: number;
  currentStr: number;
}

export interface ScarRollParams {
  roll?: number; // If not provided, will roll d100
}

export interface FatigueParams {
  currentSlots: number;
  maxSlots: number;
}

export interface RestParams {
  type: 'short' | 'long';
  currentHp: number;
  maxHp: number;
  fatigueCount: number;
}
