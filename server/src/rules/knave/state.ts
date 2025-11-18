// Domain models for Knave RPG server-authoritative rules
// Knave is a lightweight fantasy RPG with equipment-driven mechanics

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type DamageType = 'physical' | 'special';

export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type ArmorClass = {
  base: number; // 11 + armor bonus + dex modifier
  armorBonus?: number; // bonus from armor
  dexBonus?: number; // bonus from dex modifier
};

export type Item = {
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'tool' | 'misc' | 'spell';
  weight?: number;
};

export type Weapon = Item & {
  type: 'weapon';
  ability: 'str' | 'dex'; // used for attack rolls
  damageDice: string; // e.g., '1d6', '1d8'
  properties?: string[]; // e.g., 'two-handed', 'ranged'
};

export type Armor = Item & {
  type: 'armor';
  acBonus: number; // bonus to AC
};

export type Actor = {
  id: string;
  name: string;
  level: number; // 1-10+, also serves as proficiency bonus
  size: Size;
  abilities: AbilityScores;
  ac: ArmorClass;
  maxHp: number;
  currentHp: number;
  speed: number; // walking speed in feet
  // Equipment inventory
  items?: Item[];
  // Worn armor for AC calculation
  equippedArmor?: Armor;
  equippedWeapons?: Weapon[];
};

export type Encounter = {
  id: string;
  round: number;
  initiative?: Array<{ actorId: string; value: number }>;
};

export type TurnEconomy = {
  actionAvailable: boolean;
  movementRemaining: number; // in feet
};

export type ActionType = 'attack' | 'savingThrow' | 'abilityCheck' | 'initiative' | 'move';

export type RulesActionRequest = {
  seed?: string | number;
  encounter: Encounter;
  actors: Record<string, Actor>;
  actorId?: string;
  targetId?: string;
  action: ActionType;
  payload?: any;
};

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

export type RulesActionResult = AttackOutcome | CheckOutcome | InitiativeOutcome;

// Utility functions
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  // In Knave, level IS the proficiency bonus (level 1 = +1, level 2 = +2, etc.)
  return level;
}

export function getActorProficiencyBonus(actor: Actor): number {
  return getProficiencyBonus(actor.level);
}

export function calculateMaxHp(level: number, conMod: number): number {
  // Knave HP: d8 per level + CON modifier
  // Base calculation: 8 per level minimum 1 HP per level
  const baseHp = level * 8;
  const conBonus = conMod * level;
  return Math.max(level, baseHp + conBonus);
}

export function calculateArmorClass(actor: Actor): number {
  // Knave AC: 11 + armor bonus + DEX modifier
  const dexMod = abilityMod(actor.abilities.dex);
  const armorBonus = actor.equippedArmor?.acBonus ?? 0;
  return 11 + armorBonus + dexMod;
}
