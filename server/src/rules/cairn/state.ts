// Domain models for Cairn RPG server-authoritative combat rules
// These types model canonical actor/encounter state for the Cairn system

export type CairnAbility = 'str' | 'dex' | 'wil';

export type CairnAbilityScores = {
  str: number; // Strength - physicality, brawn, toughness
  dex: number; // Dexterity - dodging, speed, reflexes
  wil: number; // Willpower - persuasion, magic, mental fortitude
};

export type CairnDamageType =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'fire'
  | 'cold'
  | 'electric'
  | 'acid'
  | 'blast'; // for explosions and area effects

export type CairnSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'massive';

export type CairnArmor = {
  name: string;
  value: number; // damage reduction (1-3 typically)
  slots: number; // inventory slots occupied
};

export type CairnWeapon = {
  name: string;
  damageDice: string; // e.g., '1d6', '1d8', '1d10'
  damageType?: CairnDamageType;
  slots: number; // inventory slots occupied
  hands: 1 | 2; // one-handed or two-handed
  properties?: string[]; // e.g., 'blast', 'bulky', 'reach'
};

export type CairnInventoryItem = {
  name: string;
  slots: number; // how many slots it occupies
  type: 'weapon' | 'armor' | 'item' | 'spellbook' | 'fatigue';
  details?: CairnWeapon | CairnArmor | any;
};

export type CairnConditions = {
  deprived?: boolean; // lacking critical need (food, rest, warmth)
  poisoned?: boolean;
  stunned?: boolean;
  unconscious?: boolean;
  dead?: boolean;
};

export type CairnScar = {
  description: string;
  effect?: string; // mechanical effect if any
  ability?: CairnAbility; // ability score permanently reduced
};

export type CairnActor = {
  id: string;
  name: string;
  background?: string; // character background (replaces class)
  level?: number; // optional for compatibility
  size: CairnSize;
  abilities: CairnAbilityScores;
  maxHp: number; // Hit Protection - resilience/luck, not health
  currentHp: number;
  armor?: CairnArmor; // single armor piece
  maxInventorySlots: number; // typically 10
  inventory: CairnInventoryItem[]; // includes weapons, armor, items, fatigue
  conditions?: CairnConditions;
  scars?: CairnScar[]; // permanent injuries from critical damage
};

export type CairnEncounter = {
  id: string;
  round: number;
  initiative?: Array<{ actorId: string; value: number }>;
  // In Cairn, positioning is more narrative but can track distances
  distances?: Record<string, Record<string, number>>; // actorId -> actorId -> distance in feet
};

export type CairnTurnEconomy = {
  actionAvailable: boolean; // one action per turn
  movementAvailable: boolean; // can move up to 40 feet
};

export type CairnTurnState = {
  actorId: string;
  round: number;
  economy: CairnTurnEconomy;
};

export type CairnSaveContext = {
  ability: CairnAbility;
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number; // situational modifier to ability score
};

export type CairnAttackContext = {
  weapon: CairnWeapon;
  targetArmor?: CairnArmor;
  impaired?: boolean; // disadvantage on damage (roll twice, take lower)
  enhanced?: boolean; // advantage on damage (roll twice, take higher)
  blast?: boolean; // affects all targets in area
};

export type CairnDamagePacket = {
  amount: number; // raw damage rolled
  type?: CairnDamageType;
  armorReduction: number; // how much armor absorbed
  finalDamage: number; // damage actually applied to HP/STR
};

export type CairnRestType = 'short' | 'long';

export type CairnActionType =
  | 'save'
  | 'attack'
  | 'damage'
  | 'initiative'
  | 'criticalDamage'
  | 'rest'
  | 'castSpell'
  | 'addFatigue'
  | 'death';

export type CairnRulesActionRequest = {
  seed?: string | number; // for deterministic RNG
  encounter: CairnEncounter;
  actors: Record<string, CairnActor>;
  actorId?: string;
  targetId?: string;
  action: CairnActionType;
  payload?: any; // contextual to the action
};

// Outcome types

export type CairnSaveOutcome = {
  type: 'save';
  success: boolean;
  roll: number; // the d20 roll
  target: number; // the ability score to roll under
  ability: CairnAbility;
  automatic?: boolean; // true for natural 1 (auto-success) or 20 (auto-fail)
  advantage?: boolean;
  disadvantage?: boolean;
};

export type CairnAttackOutcome = {
  type: 'attack';
  damage: CairnDamagePacket;
  impaired?: boolean;
  enhanced?: boolean;
  blast?: boolean;
};

export type CairnCriticalDamageOutcome = {
  type: 'criticalDamage';
  strLoss: number; // STR damage taken
  save: CairnSaveOutcome; // STR save to avoid death
  scarRoll?: number; // 1d100 for scar table
  scar?: CairnScar;
  dead?: boolean;
};

export type CairnInitiativeOutcome = {
  type: 'initiative';
  order: Array<{ actorId: string; value: number }>;
};

export type CairnRestOutcome = {
  type: 'rest';
  rest: CairnRestType;
  hpRestored: number;
  fatigueRemoved: number;
  effects: string[];
};

export type CairnSpellOutcome = {
  type: 'castSpell';
  spellName: string;
  fatigueAdded: boolean;
  remainingSlots: number; // inventory slots remaining
};

export type CairnFatigueOutcome = {
  type: 'addFatigue';
  fatigueCount: number;
  remainingSlots: number;
  full?: boolean; // if inventory is full (HP becomes 0)
};

export type CairnDeathOutcome = {
  type: 'death';
  cause: 'str_zero' | 'critical_damage' | 'failed_save';
  actorName: string;
};

export type CairnRulesActionResult =
  | CairnSaveOutcome
  | CairnAttackOutcome
  | CairnCriticalDamageOutcome
  | CairnInitiativeOutcome
  | CairnRestOutcome
  | CairnSpellOutcome
  | CairnFatigueOutcome
  | CairnDeathOutcome;

// Helper functions

export function getCairnInventoryUsedSlots(actor: CairnActor): number {
  return actor.inventory.reduce((sum, item) => sum + item.slots, 0);
}

export function getCairnInventoryRemainingSlots(actor: CairnActor): number {
  return actor.maxInventorySlots - getCairnInventoryUsedSlots(actor);
}

export function getCairnFatigueCount(actor: CairnActor): number {
  return actor.inventory.filter(item => item.type === 'fatigue').length;
}

export function isCairnInventoryFull(actor: CairnActor): boolean {
  return getCairnInventoryUsedSlots(actor) >= actor.maxInventorySlots;
}

// Scar table (simplified - d100 roll)
export function getCairnScar(roll: number): CairnScar {
  if (roll <= 10) {
    return { description: 'Lasting Scar', effect: 'Noticeable but no mechanical effect' };
  } else if (roll <= 20) {
    return { description: 'Rattling Blow', effect: 'Deprived until rest', ability: 'str' };
  } else if (roll <= 30) {
    return { description: 'Walloped', effect: 'Deprived until rest', ability: 'dex' };
  } else if (roll <= 40) {
    return { description: 'Broken Limb', effect: 'Cannot use one arm/leg until healed' };
  } else if (roll <= 50) {
    return { description: 'Diseased', effect: 'Deprived until cured' };
  } else if (roll <= 60) {
    return { description: 'Reorienting Head Wound', effect: 'Deprived until rest', ability: 'wil' };
  } else if (roll <= 70) {
    return { description: 'Hamstrung', effect: 'Movement reduced by half' };
  } else if (roll <= 80) {
    return { description: 'Deafened', effect: 'Cannot hear, fail all hearing-related saves' };
  } else if (roll <= 90) {
    return { description: 'Disarmed', effect: 'Weapon is knocked away' };
  } else {
    return { description: 'Knocked Out', effect: 'Unconscious for 1d4 hours' };
  }
}
