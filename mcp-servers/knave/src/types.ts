/**
 * Type definitions for Knave MCP Server
 */

// Core ability types
export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

// Damage and size types
export type DamageType = 'physical' | 'special';
export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

// Ability scores
export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

// AC and armor
export type ArmorClass = {
  base: number;
  armorBonus?: number;
  dexBonus?: number;
};

export type Armor = {
  name: string;
  description?: string;
  type: 'armor';
  acBonus: number;
  weight?: number;
};

// Weapons
export type Weapon = {
  name: string;
  description?: string;
  type: 'weapon';
  ability: 'str' | 'dex';
  damageDice: string;
  properties?: string[];
  weight?: number;
};

// Items and spells
export type Item = {
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'tool' | 'misc' | 'spell';
  weight?: number;
};

export type Spell = Item & {
  type: 'spell';
  level: number;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
};

// Actor
export type Actor = {
  id: string;
  name: string;
  level: number;
  size: Size;
  abilities: AbilityScores;
  ac: ArmorClass;
  maxHp: number;
  currentHp: number;
  speed: number;
  items?: Item[];
  equippedArmor?: Armor;
  equippedWeapons?: Weapon[];
};

// Encounter
export type Encounter = {
  id: string;
  round: number;
  initiative?: Array<{ actorId: string; value: number }>;
};

// Turn economy
export type TurnEconomy = {
  actionAvailable: boolean;
  movementRemaining: number;
};

// Action types
export type ActionType = 'attack' | 'savingThrow' | 'abilityCheck' | 'initiative' | 'move';

// Tool request types
export type ResolveAttackRequest = {
  actor: Actor;
  target: Actor;
  weapon: Weapon;
  seed?: string | number;
};

export type ResolveSaveRequest = {
  actor: Actor;
  ability: Ability;
  dc: number;
  seed?: string | number;
};

export type ResolveAbilityCheckRequest = {
  actor: Actor;
  ability: Ability;
  dc?: number;
  seed?: string | number;
};

export type ResolveInitiativeRequest = {
  actors: Actor[];
  seed?: string | number;
};

export type CalculateACRequest = {
  baseAC?: number;
  armor?: Armor;
  dexScore: number;
};

export type CalculateHPRequest = {
  level: number;
  conScore: number;
};

// Outcomes
export type HitOutcome = {
  kind: 'hit' | 'miss';
  roll: number;
  total: number;
  targetAC: number;
  details?: string[];
};

export type DamageOutcome = {
  input: number;
  totalDamage: number;
};

export type AttackOutcome = {
  type: 'attack';
  hit: HitOutcome;
  damage?: DamageOutcome;
  expended: Partial<TurnEconomy>;
};

export type CheckOutcome = {
  type: 'abilityCheck' | 'savingThrow';
  success?: boolean;
  dc?: number;
  roll: number;
  total: number;
  ability: Ability;
};

export type InitiativeOutcome = {
  type: 'initiative';
  order: Array<{ actorId: string; value: number }>;
};

export type RulesOutcome = AttackOutcome | CheckOutcome | InitiativeOutcome;
