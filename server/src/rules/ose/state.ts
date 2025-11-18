// Domain models for Old-School Essentials (OSE) server-authoritative combat rules
// OSE is a modern clone of B/X D&D with different mechanics than D&D 5E

export type OSEAbility = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type DamageType =
  | 'normal'      // Most physical damage in OSE
  | 'magical'     // Magical weapons
  | 'fire'
  | 'cold'
  | 'poison'
  | 'acid'
  | 'lightning'
  | 'energy';     // Generic magical energy

export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

// OSE has 5 saving throw categories, not 6 ability-based saves
export type SaveCategory =
  | 'death'       // Death Ray/Poison
  | 'wands'       // Magic Wands
  | 'paralysis'   // Paralysis/Petrify
  | 'breath'      // Breath Attacks
  | 'spells';     // Spells/Rods/Staves

export type SavingThrows = Record<SaveCategory, number>; // Target numbers

export type Resistances = {
  immune?: DamageType[];
  resistant?: DamageType[];
  vulnerable?: DamageType[];
};

export type Conditions = {
  // OSE has simpler conditions
  blind?: boolean;
  charmed?: boolean;
  diseased?: boolean;
  paralyzed?: boolean;
  poisoned?: boolean;
  unconscious?: boolean;

  // No death saves in OSE - 0 HP = dead or unconscious (GM discretion)
  // No concentration mechanic in OSE
  unconsciousAt0HP?: boolean; // If true, unconscious at 0 HP; if false, dead
};

export type ArmorClass = {
  base: number; // OSE uses ascending AC (10 = unarmored, higher is better) or descending (9 = unarmored, lower is better)
  ascending: boolean; // True for ascending AC, false for descending/THAC0
  shieldBonus?: number;
  miscBonus?: number;
};

// OSE uses Vancian magic: memorized spells, not spell slots
export type MemorizedSpells = {
  level1?: string[]; // Array of spell names memorized
  level2?: string[];
  level3?: string[];
  level4?: string[];
  level5?: string[];
  level6?: string[];
};

export type SpellSlots = Partial<Record<1 | 2 | 3 | 4 | 5 | 6, number>>; // Number of spells that can be memorized per level

export type Weapon = {
  name: string;
  // OSE doesn't use ability scores for attack rolls by default
  // Attack bonus comes from class level only
  melee: boolean;
  ranged: boolean;
  damageDice: string; // e.g., '1d8', '1d6'
  damageType: DamageType;
  twoHanded?: boolean;
  range?: { short: number; medium: number; long: number }; // in feet
};

export type Actor = {
  id: string;
  name: string;
  class?: string;
  level: number;
  size: Size;
  abilities: AbilityScores;

  // OSE doesn't have proficiency bonus - attack bonus is class-based
  attackBonus: number; // From class level progression

  ac: ArmorClass;
  maxHp: number;
  currentHp: number;

  speed: number; // walking speed in feet (typically 40', 60', or 120')

  savingThrows: SavingThrows; // Target numbers for each save category

  resistances?: Resistances;
  conditions?: Conditions;

  // Spellcasting
  spellSlots?: SpellSlots; // Number of spells per level
  memorizedSpells?: MemorizedSpells; // Specific spells memorized
  spellcastingAbility?: OSEAbility; // INT for magic-users, WIS for clerics

  // Turn Undead (Clerics)
  turnUndeadLevel?: number; // Effective level for turning undead

  // Inventory of weapons
  weapons?: Weapon[];

  // Prime requisites (for XP bonus)
  primeRequisites?: OSEAbility[];
};

export type Encounter = {
  id: string;
  round: number;
  // OSE typically uses side-based initiative (d6), but individual initiative is an option
  initiative?: Array<{ actorId: string; value: number }>;
};

export type TurnEconomy = {
  // OSE uses simpler action economy: 1 action per round
  actionAvailable: boolean;
  movementAvailable: boolean;
  // No bonus actions or reactions in base OSE
};

export type TurnState = {
  actorId: string;
  round: number;
  economy: TurnEconomy;
};

export type CheckContext = {
  ability: OSEAbility;
  target?: number; // Target ability score (roll under)
  // OSE doesn't have advantage/disadvantage
};

export type AttackContext = {
  weapon: Weapon;
  targetAC: number;
  ascending: boolean; // True if using ascending AC
  // OSE doesn't have advantage/disadvantage
  criticalOn?: number; // default 20
  // Bonuses from magic weapons, strength, etc.
  attackBonusModifier?: number;
  damageBonusModifier?: number;
};

export type SaveContext = {
  category: SaveCategory;
  targetNumber?: number; // If not provided, use actor's saving throw
  magic?: boolean;
};

export type DamagePacket = {
  amount: number;
  type: DamageType;
  critical?: boolean;
};

export type RestType =
  | 'turn'    // 10 minutes
  | 'short'   // ~1 hour, no mechanical benefit
  | 'long';   // 8 hours, restore 1d3 HP

export type ActionType =
  | 'attack'
  | 'savingThrow'
  | 'abilityCheck'
  | 'initiative'
  | 'move'
  | 'rest'
  | 'memorizeSpell'
  | 'turnUndead';

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
  critical?: boolean;
  roll: number;
  total: number;
  targetAC: number;
  details?: string[];
};

export type DamageOutcome = {
  input: DamagePacket[];
  totalBeforeReduction: number;
  totalAfterReduction: number;
  breakdown: Array<{ type: DamageType; amount: number; adjusted: number; reason?: string }>;
};

export type AttackOutcome = {
  type: 'attack';
  hit: HitOutcome;
  damage?: DamageOutcome;
  expended: Partial<TurnEconomy>;
};

export type CheckOutcome = {
  type: 'abilityCheck';
  success?: boolean;
  target?: number;
  roll: number;
  abilityScore: number;
  details?: string[];
};

export type SaveOutcome = {
  type: 'savingThrow';
  success: boolean;
  category: SaveCategory;
  targetNumber: number;
  roll: number;
  details?: string[];
};

export type InitiativeOutcome = {
  type: 'initiative';
  order: Array<{ actorId: string; value: number }>;
};

export type RestOutcome = {
  type: 'rest';
  rest: RestType;
  hpRestored?: number;
  effects: string[];
};

export type MemorizeSpellOutcome = {
  type: 'memorizeSpell';
  success: boolean;
  spellName: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  slotsRemaining?: number;
};

export type TurnUndeadOutcome = {
  type: 'turnUndead';
  success: boolean;
  roll: number;
  undeadHD: number;
  turned: boolean;
  destroyed?: boolean;
  numberAffected?: number;
};

export type RulesActionResult =
  | AttackOutcome
  | CheckOutcome
  | SaveOutcome
  | InitiativeOutcome
  | RestOutcome
  | MemorizeSpellOutcome
  | TurnUndeadOutcome;

// OSE ability modifier calculation (different from D&D 5E)
// 3-8: -1, 9-12: 0, 13-15: +1, 16-17: +2, 18: +3
export function oseAbilityMod(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return +1;
  if (score <= 17) return +2;
  return +3; // 18+
}

// Calculate XP bonus from prime requisites
export function calculateXPBonus(primeReqScores: number[]): number {
  if (primeReqScores.length === 0) return 0;

  // For multiple prime requisites (Elf, Halfling), use average
  const avgScore = primeReqScores.reduce((a, b) => a + b, 0) / primeReqScores.length;

  if (avgScore >= 16) return 10; // +10% XP
  if (avgScore >= 13) return 5;  // +5% XP
  return 0; // No bonus
}

// Convert descending AC to ascending AC
export function descendingToAscending(descendingAC: number): number {
  return 19 - descendingAC;
}

// Convert ascending AC to descending AC
export function ascendingToDescending(ascendingAC: number): number {
  return 19 - ascendingAC;
}
