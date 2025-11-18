/**
 * Type definitions for D&D 5E MCP Server
 * These types mirror the rules engine types from server/src/rules/state.ts
 */

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export type Cover = 'none' | 'half' | 'three-quarters' | 'full';
export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Weapon {
  name: string;
  ability: 'str' | 'dex';
  proficient: boolean;
  magicalBonus?: number;
  damageDice: string;
  damageType: DamageType;
  finesse?: boolean;
  range?: { normal: number; long: number };
  properties?: string[];
}

export interface ArmorClass {
  base: number;
  shieldBonus?: number;
  miscBonus?: number;
}

export interface Resistances {
  immune?: DamageType[];
  resistant?: DamageType[];
  vulnerable?: DamageType[];
}

export interface Actor {
  id: string;
  name: string;
  class?: string;
  level: number;
  size: Size;
  abilities: AbilityScores;
  proficiencyBonus?: number;
  ac: ArmorClass;
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  speed: number;
  resistances?: Resistances;
  weapons?: Weapon[];
}

export interface ClassData {
  name: string;
  hitDie: string;
  primaryAbility: Ability[];
  savingThrowProficiencies: Ability[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  skillChoices: { choose: number; from: string[] };
  features: { level: number; name: string; description: string }[];
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  concentration?: boolean;
  ritual?: boolean;
  damageType?: DamageType;
}

export interface Condition {
  name: string;
  description: string;
  effects: string[];
}

export interface Equipment {
  name: string;
  type: 'weapon' | 'armor' | 'shield' | 'gear';
  cost?: { amount: number; unit: string };
  weight?: number;
  properties?: string[];
  armorClass?: number;
  damage?: string;
  damageType?: DamageType;
}
