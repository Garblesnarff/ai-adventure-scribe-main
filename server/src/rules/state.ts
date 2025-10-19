// Domain models for SRD 5.1 server-authoritative combat rules
// These types model canonical actor/encounter state retrieved from the server (e.g., Supabase)

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

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type SavingThrowProficiencies = Partial<Record<Ability, boolean>>;

export type Skill =
  | 'athletics'
  | 'acrobatics'
  | 'sleight_of_hand'
  | 'stealth'
  | 'arcana'
  | 'history'
  | 'investigation'
  | 'nature'
  | 'religion'
  | 'animal_handling'
  | 'insight'
  | 'medicine'
  | 'perception'
  | 'survival'
  | 'deception'
  | 'intimidation'
  | 'performance'
  | 'persuasion';

export type SkillProficiencies = Partial<Record<Skill, boolean>>;

export type Resistances = {
  immune?: DamageType[];
  resistant?: DamageType[];
  vulnerable?: DamageType[];
};

export type Conditions = {
  // Minimal set to support advantage/disadvantage and common checks
  blinded?: boolean;
  invisible?: boolean;
  poisoned?: boolean;
  prone?: boolean;
  restrained?: boolean;
  stunned?: boolean;
  unconscious?: boolean;
  frightened?: boolean;
  grappled?: boolean;
  incapacitated?: boolean;

  concentrating?: boolean;
  deathSaves?: { successes: number; failures: number };
  exhaustion?: number; // 0-6
  inspiration?: boolean;
};

export type ArmorClass = {
  base: number; // calculated from armor + dex, etc. (already canonical server value)
  shieldBonus?: number;
  miscBonus?: number;
};

export type SpellSlots = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, { total: number; expended: number }>>;

export type Weapon = {
  name: string;
  ability: 'str' | 'dex';
  proficient: boolean;
  magicalBonus?: number; // e.g., +1 weapon
  damageDice: string; // e.g., '1d8'
  damageType: DamageType;
  finesse?: boolean;
  range?: { normal: number; long: number };
  properties?: string[]; // e.g., 'heavy', 'two-handed'
};

export type Actor = {
  id: string;
  name: string;
  class?: string;
  level: number;
  size: Size;
  abilities: AbilityScores;
  proficiencyBonus?: number; // if omitted, derived from level
  ac: ArmorClass;
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  speed: number; // walking speed in feet
  savingThrowProficiencies?: SavingThrowProficiencies;
  skillProficiencies?: SkillProficiencies;
  resistances?: Resistances;
  conditions?: Conditions;
  spellSlots?: SpellSlots;
  // Inventory of weapons the actor can attack with
  weapons?: Weapon[];
};

export type Encounter = {
  id: string;
  round: number; // current round number (1-based)
  // Initiative order is derived; include tiebreakers by Dex mod then raw Dex, then coin flip if needed
  initiative?: Array<{ actorId: string; value: number }>;
  cover?: Record<string, Cover>; // by defender actorId
  // Threatened ranges for OA: simple model as a boolean per pair (attackerId->defenderId)
  threatenedBy?: Record<string, string[]>; // actorId -> array of threatening actorIds
};

export type TurnEconomy = {
  actionAvailable: boolean;
  bonusActionAvailable: boolean;
  reactionAvailable: boolean;
  movementRemaining: number; // in feet
};

export type TurnState = {
  actorId: string;
  round: number;
  economy: TurnEconomy;
};

export type CheckContext = {
  ability: Ability;
  proficient?: boolean;
  dc?: number; // if provided, compare; otherwise return totals only
  advantage?: boolean;
  disadvantage?: boolean;
  magic?: boolean; // whether the check/save is caused by magic (for e.g., magic resistance)
};

export type AttackContext = {
  weapon: Weapon;
  attackAbilityOverride?: Ability; // if provided, overrides weapon.ability (e.g., shillelagh)
  proficient?: boolean; // if omitted, use weapon.proficient
  targetAC: number;
  cover?: Cover;
  advantage?: boolean;
  disadvantage?: boolean;
  criticalOn?: number; // default 20
  // on-hit additional damage (e.g., hex) expressed as dice string and type
  bonusDamageDice?: { dice: string; type: DamageType }[];
};

export type SaveContext = {
  ability: Ability;
  dc: number;
  advantage?: boolean;
  disadvantage?: boolean;
  magic?: boolean;
  proficient?: boolean; // if omitted, derived from actor.savingThrowProficiencies
};

export type DamagePacket = {
  amount: number; // already rolled
  type: DamageType;
  critical?: boolean;
};

export type OpportunityAttackContext = {
  moverId: string; // actor moving out of reach
  reactorId: string; // actor making reaction OA
  inReachBefore: boolean;
  inReachAfter: boolean;
};

export type DeathSaveResult = {
  success: boolean;
  criticalSuccess?: boolean; // natural 20
  criticalFailure?: boolean; // natural 1
  successes: number;
  failures: number;
  stabilized?: boolean;
  dead?: boolean;
};

export type ConcentrationCheckContext = {
  damageTaken: number;
};

export type RestType = 'short' | 'long';

export type ActionType =
  | 'attack'
  | 'savingThrow'
  | 'abilityCheck'
  | 'contestedCheck'
  | 'initiative'
  | 'move'
  | 'opportunityAttack'
  | 'deathSave'
  | 'concentrationCheck'
  | 'rest'
  | 'expendSpellSlot';

export type RulesActionRequest = {
  seed?: string | number; // for deterministic RNG
  encounter: Encounter;
  actors: Record<string, Actor>;
  actorId?: string; // actor performing the action, where applicable
  targetId?: string; // optional target actor
  action: ActionType;
  payload?: any; // contextual to the action
};

export type HitOutcome = {
  kind: 'hit' | 'miss' | 'blocked';
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
  usedInspiration?: boolean;
};

export type CheckOutcome = {
  type: 'abilityCheck' | 'savingThrow' | 'contestedCheck';
  success?: boolean; // when DC provided
  dc?: number;
  rolls: Array<{ actorId: string; roll: number; total: number; advantage?: boolean; disadvantage?: boolean }>;
  winnerId?: string; // for contested checks
  usedInspiration?: boolean;
};

export type InitiativeOutcome = {
  type: 'initiative';
  order: Array<{ actorId: string; value: number }>;
};

export type OpportunityAttackOutcome = {
  type: 'opportunityAttack';
  triggered: boolean;
  reactorId: string;
  moverId: string;
};

export type DeathSaveOutcome = {
  type: 'deathSave';
  result: DeathSaveResult;
};

export type ConcentrationOutcome = {
  type: 'concentrationCheck';
  maintained: boolean;
  dc: number;
  roll: number;
  total: number;
};

export type RestOutcome = {
  type: 'rest';
  rest: RestType;
  effects: string[];
};

export type SpellSlotOutcome = {
  type: 'expendSpellSlot';
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  success: boolean;
  remaining?: number;
};

export type RulesActionResult =
  | AttackOutcome
  | CheckOutcome
  | InitiativeOutcome
  | OpportunityAttackOutcome
  | DeathSaveOutcome
  | ConcentrationOutcome
  | RestOutcome
  | SpellSlotOutcome;

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  // SRD 5.1 proficiency bonus: levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

export function getActorProficiencyBonus(actor: Actor): number {
  return actor.proficiencyBonus ?? getProficiencyBonus(actor.level);
}

export function passivePerception(actor: Actor): number {
  const wisMod = abilityMod(actor.abilities.wis);
  const proficient = !!actor.skillProficiencies?.perception;
  const prof = proficient ? getActorProficiencyBonus(actor) : 0;
  return 10 + wisMod + prof;
}

export function coverACBonus(cover: Cover | undefined): number {
  if (!cover || cover === 'none') return 0;
  if (cover === 'half') return 2;
  if (cover === 'three-quarters') return 5;
  // full cover: target cannot be targeted
  return 999; // sentinel large bonus to represent unattackable by mundane means
}
