/**
 * Combat Types for D&D 5e Tabletop Experience
 *
 * These types represent the core mechanics of D&D 5e combat
 * as they would appear at a physical table, not as a video game.
 * Focus on turn-based mechanics, dice rolls, and DM oversight.
 */

import type { Equipment } from '@/data/equipmentOptions';

// ===========================
// Core Combat Types
// ===========================

export type CombatPhase =
  | 'initialization' // Rolling initiative, starting combat
  | 'active' // Taking turns in initiative order
  | 'conclusion'; // Combat ending, cleanup

export type ParticipantType =
  | 'player' // Player character
  | 'npc' // Friendly NPC
  | 'monster'; // Enemy creature

export type ActionType =
  | 'attack' // Weapon or spell attack
  | 'off_hand_attack' // Two-weapon fighting bonus action attack
  | 'cast_spell' // Casting a spell
  | 'dash' // Move extra distance
  | 'dodge' // Gain AC bonus
  | 'help' // Help another character
  | 'hide' // Attempt stealth
  | 'ready' // Ready an action
  | 'search' // Look for something
  | 'use_object' // Interact with item
  | 'grapple' // Special melee attack to grapple
  | 'shove' // Special melee attack to push/prone
  | 'death_save' // Roll death saving throw
  | 'concentration_save' // Roll to maintain concentration
  | 'bonus_action' // Secondary action
  | 'reaction' // Response to trigger
  | 'opportunity_attack' // Specific reaction type
  | 'counterspell' // Specific reaction type
  | 'deflect_missiles' // Specific reaction type
  | 'shield_spell' // Shield reaction
  | 'absorb_elements' // Absorb elements reaction
  | 'hellish_rebuke' // Hellish rebuke reaction
  | 'divine_smite' // Paladin's Divine Smite
  | 'use_class_feature' // Use a class feature (rage, second wind, etc.)
  | 'end_rage' // End rage
  | 'short_rest' // Take a short rest
  | 'long_rest'; // Take a long rest

export type ReactionTrigger =
  | 'creature_leaves_reach' // Opportunity attack
  | 'spell_cast_in_range' // Counterspell
  | 'ranged_attack_hits' // Deflect missiles
  | 'creature_enters_reach' // Polearm master
  | 'damage_taken' // Uncanny dodge, shield
  | 'ally_attacked_nearby'; // Protection fighting style

export interface ReactionOpportunity {
  id: string;
  participantId: string; // Who can react
  trigger: ReactionTrigger;
  triggerDescription: string;
  availableReactions: ActionType[];
  triggeredBy?: string; // Participant ID who triggered it
  expiresAtEndOfTurn?: boolean;
}

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

// ===========================
// D&D Conditions
// ===========================

export type ConditionName =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'
  | 'surprised';

export interface Condition {
  name: ConditionName;
  description: string;
  duration: number; // rounds, -1 for permanent
  saveEndsType?: 'start' | 'end'; // when save is made
  saveDC?: number;
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  sourceSpell?: string;
  concentrationRequired?: boolean;
  level?: number; // For exhaustion levels (1-6)
}

export interface ExhaustionEffect {
  level: number;
  description: string;
  effect: {
    disadvantageOnAbilityChecks?: boolean;
    speedHalved?: boolean;
    disadvantageOnAttacksAndSaves?: boolean;
    hitPointMaxHalved?: boolean;
    speedReducedToZero?: boolean;
    death?: boolean;
  };
}

export interface DeathSaves {
  successes: number;
  failures: number;
  isStable?: boolean;
}

export type CoverType = 'none' | 'half' | 'three_quarters' | 'total';

export interface CoverInfo {
  type: CoverType;
  acBonus: number;
  dexSaveBonus: number;
  canBeTargeted: boolean;
}

export type VisionType = 'normal' | 'darkvision' | 'blindsight' | 'truesight';

export interface VisionInfo {
  type: VisionType;
  range: number; // feet
}

export type ObscurementLevel = 'clear' | 'lightly_obscured' | 'heavily_obscured';

export type FightingStyleName =
  | 'defense'
  | 'dueling'
  | 'great_weapon_fighting'
  | 'protection'
  | 'archery'
  | 'two_weapon_fighting'
  | 'blessed_warrior'
  | 'blind_fighting';

export interface FightingStyle {
  name: FightingStyleName;
  description: string;
  effect: {
    acBonus?: number;
    attackBonus?: number;
    damageBonus?: number;
    rerollDamage?: boolean;
    protectionReaction?: boolean;
  };
}

export interface WeaponProperties {
  light?: boolean;
  finesse?: boolean;
  thrown?: boolean;
  twoHanded?: boolean;
  versatile?: boolean;
  reach?: boolean;
  heavy?: boolean;
  loading?: boolean;
  // Additional weapon properties that affect attacks
  ammunition?: boolean;
  range?: {
    normal: number;
    long?: number;
  };
  special?: string; // Special properties description
  magical?: boolean; // Magical weapon
  silvered?: boolean; // Silvered weapon
  adamantine?: boolean; // Adamantine weapon
}

// ===========================
// Racial Traits & Class Features
// ===========================

export type RacialTraitName =
  | 'lucky'
  | 'breath_weapon'
  | 'draconic_resistance'
  | 'relentless_endurance'
  | 'fey_ancestry'
  | 'trance'
  | 'stonecunning'
  | 'poison_resistance'
  | 'hellish_resistance'
  | 'infernal_legacy'
  | 'natural_armor'
  | 'brave'
  | 'halfling_nimbleness';

export interface RacialTrait {
  name: RacialTraitName;
  description: string;
  type: 'passive' | 'active' | 'reaction';
  usesPerRest?: 'short' | 'long' | 'none';
  maxUses?: number;
  currentUses?: number;
  damageType?: DamageType; // For resistances
  spellLevel?: number; // For innate spells
  saveDC?: number; // For breath weapons, etc.
}

export type ClassFeatureName =
  | 'rage'
  | 'sneak_attack'
  | 'action_surge'
  | 'divine_smite'
  | 'deflect_missiles'
  | 'bardic_inspiration'
  | 'channel_divinity'
  | 'eldritch_invocations'
  | 'metamagic'
  | 'hunters_mark'
  | 'uncanny_dodge'
  | 'second_wind'
  | 'lay_on_hands'
  | 'ki';

export interface ClassFeature {
  name: ClassFeatureName;
  description: string;
  className: string;
  level: number;
  type: 'passive' | 'active' | 'reaction' | 'bonus_action';
  usesPerRest?: 'short' | 'long' | 'none';
  maxUses?: number;
  currentUses?: number;
  resourceCost?: number; // Ki points, sorcery points, etc.
}

export interface CharacterResources {
  hitDice: { [dieType: string]: { max: number; current: number } };
  kiPoints?: { max: number; current: number };
  sorceryPoints?: { max: number; current: number };
  bardic_inspiration?: { max: number; current: number };
  channelDivinity?: { max: number; current: number };
  rages?: { max: number; current: number };
  actionSurge?: { max: number; current: number };
  layOnHands?: { max: number; current: number };
}

// ===========================
// Spellcasting
// ===========================

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpellSlotConfig {
  max: number;
  current: number;
}

// ===========================
// Combat Participants
// ===========================

export interface CombatParticipant {
  id: string;
  name: string;
  participantType: 'player' | 'enemy' | 'npc';
  characterId?: string;
  characterClass?: string;
  level?: number;

  // Combat stats
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  armorClass: number;
  initiative: number;
  speed: number;

  // Turn tracking
  actionTaken: boolean;
  bonusActionTaken: boolean;
  reactionTaken: boolean;
  movementUsed: number;

  // Foundry VTT integration
  position?: { x: number; y: number; sceneId: string };
  tokenId?: string;
  movementRemaining: number;

  // Reaction tracking
  reactionOpportunities: ReactionOpportunity[];

  // Combat state
  conditions: Condition[];
  deathSaves: {
    successes: number;
    failures: number;
  };

  // Weapon tracking
  mainHandWeapon?: Equipment;
  offHandWeapon?: Equipment;

  // Class features
  classFeatures?: ClassFeature[];
  resources?: CharacterResources;
  isRaging?: boolean; // Track if Barbarian is currently raging
  activeConcentration?: string | null;

  // Spellcasting
  spellSlots?: Record<SpellSlotLevel, SpellSlotConfig>;
  preparedSpells?: string[];

  // Damage resistances, immunities, and vulnerabilities
  damageResistances: DamageType[];
  damageImmunities: DamageType[];
  damageVulnerabilities: DamageType[];

  // Fighting styles
  fightingStyles?: FightingStyle[];

  // Racial traits
  racialTraits?: RacialTrait[];

  // Vision and stealth
  visionTypes?: VisionInfo[];
  obscurement?: ObscurementLevel;
  isHidden?: boolean;
  stealthCheckBonus?: number;
}

export interface MonsterAttack {
  name: string;
  attackBonus: number;
  damageRoll: string; // "1d8+3"
  damageType: DamageType;
  reach: number;
  description: string;
}

// ===========================
// Combat Actions & Rolls
// ===========================

export interface DiceRoll {
  dieType: number; // d4, d6, d8, d10, d12, d20
  count: number;
  modifier: number;
  results: number[]; // All dice rolled (for advantage/disadvantage, includes all dice)
  keptResults: number[]; // Which dice were actually used
  total: number;
  advantage?: boolean;
  disadvantage?: boolean;
  critical?: boolean;
  naturalRoll?: number; // The natural die result before modifiers (for critical detection)
}

export interface CombatAction {
  id: string;
  encounterId: string;
  participantId: string;
  targetParticipantId?: string;

  // Turn tracking
  round: number;
  turnOrder: number;

  // Action details
  actionType: ActionType;
  description: string;

  // Spell-specific information
  spellName?: string;
  spellLevel?: number;
  components?: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    materialDescription?: string;
    materialCost?: number;
    materialConsumed?: boolean;
  };

  // Dice rolls made
  attackRoll?: DiceRoll;
  damageRolls?: DiceRoll[];
  savingThrows?: DiceRoll[];

  // Results
  hit?: boolean;
  damageDealt?: number;
  damageType?: DamageType;
  conditionsApplied?: Condition[];

  // Narrative (from AI DM)
  dmNarration?: string;

  timestamp: Date;
}

// ===========================
// Combat Encounter
// ===========================

export interface CombatEncounter {
  id: string;
  sessionId: string;

  // Status
  phase: CombatPhase;
  currentRound: number;
  currentTurnParticipantId?: string;

  // Participants in initiative order
  participants: CombatParticipant[];

  // Environmental factors
  location?: string;
  environmentalEffects?: string[];
  visibility?: 'clear' | 'dim' | 'dark' | 'bright';
  terrain?: string; // "difficult", "rough", etc.

  // Combat log
  actions: CombatAction[];

  // Time tracking (narrative, not real-time)
  roundsElapsed: number;
  startTime: Date;
  endTime?: Date;

  // Metadata
  difficulty?: 'easy' | 'medium' | 'hard' | 'deadly';
  experienceAwarded?: number;
}

// ===========================
// Combat State Management
// ===========================

export interface CombatState {
  activeEncounter: CombatEncounter | null;
  isInCombat: boolean;

  // UI State
  selectedParticipantId?: string;
  selectedTargetId?: string;
  showInitiativeTracker: boolean;
  showCombatLog: boolean;

  // Pending actions (before confirmation)
  pendingAction?: Partial<CombatAction>;

  // Reaction system
  activeReactionOpportunities: ReactionOpportunity[];
  pendingReactionResponse?: {
    opportunityId: string;
    selectedReaction?: ActionType;
  };

  // Dice roll management
  diceRollQueue: DiceRollQueue;
}

// ===========================
// Combat Events
// ===========================

export type CombatEvent =
  | { type: 'COMBAT_START'; encounter: CombatEncounter }
  | { type: 'COMBAT_END'; encounterId: string; reason: string }
  | { type: 'TURN_START'; participantId: string }
  | { type: 'TURN_END'; participantId: string }
  | { type: 'ROUND_START'; roundNumber: number }
  | { type: 'ACTION_TAKEN'; action: CombatAction }
  | { type: 'DAMAGE_DEALT'; participantId: string; damage: number }
  | { type: 'CONDITION_APPLIED'; participantId: string; condition: Condition }
  | { type: 'CONDITION_REMOVED'; participantId: string; conditionName: ConditionName }
  | { type: 'DEATH_SAVE'; participantId: string; result: 'success' | 'failure' }
  | { type: 'PARTICIPANT_UNCONSCIOUS'; participantId: string }
  | { type: 'PARTICIPANT_DEAD'; participantId: string }
  | { type: 'INITIATIVE_ROLLED'; participantId: string; initiative: number };

// ===========================
// Dice Roll Request Management
// ===========================

export type DiceRollRequestType =
  | 'initiative'
  | 'attack'
  | 'damage'
  | 'saving_throw'
  | 'death_save'
  | 'concentration_save'
  | 'ability_check'
  | 'skill_check';

export interface DiceRollRequest {
  id: string;
  requestType: DiceRollRequestType;
  participantId?: string;
  description: string;
  rollConfig: {
    dieType: number;
    count: number;
    modifier: number;
    advantage?: boolean;
    disadvantage?: boolean;
  };
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
  result?: DiceRoll;
  batchId?: string; // Groups multiple rolls from same AI request for batching
  dc?: number; // Target DC for ability checks and saving throws
  ac?: number; // Target AC for attack rolls
}

export interface DiceRollQueue {
  pendingRolls: DiceRollRequest[];
  currentRollId?: string;
  isProcessingRoll: boolean;
  currentBatchId?: string; // Current active batch ID
  completedBatchRolls: DiceRollRequest[]; // Completed rolls in current batch
}

// ===========================
// Helper Types
// ===========================

export interface CombatContextValue {
  state: CombatState;

  // Combat management
  startCombat: (
    sessionId: string,
    initialParticipants: Partial<CombatParticipant>[],
  ) => Promise<void>;
  endCombat: () => Promise<void>;

  // Turn management
  nextTurn: () => Promise<void>;
  rollInitiative: (participantId: string) => Promise<number>;

  // Actions
  takeAction: (action: Partial<CombatAction>) => Promise<void>;
  dealDamage: (participantId: string, damage: number, damageType?: DamageType) => Promise<void>;
  healDamage: (participantId: string, healing: number) => Promise<void>;

  // Conditions
  applyCondition: (participantId: string, condition: Condition) => Promise<void>;
  removeCondition: (participantId: string, conditionName: ConditionName) => Promise<void>;

  // Death saves
  rollDeathSave: (participantId: string) => Promise<'success' | 'failure' | 'critical'>;

  // Participants
  addParticipant: (participant: Partial<CombatParticipant>) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  updateParticipant: (participantId: string, updates: Partial<CombatParticipant>) => Promise<void>;

  // Reaction management
  addReactionOpportunity: (opportunity: ReactionOpportunity) => void;
  removeReactionOpportunity: (opportunityId: string) => void;
  clearReactionOpportunities: () => void;
  setPendingReaction: (opportunityId: string, selectedReaction: ActionType) => void;

  // Participant reaction opportunities
  addParticipantReactionOpportunity: (
    participantId: string,
    opportunity: ReactionOpportunity,
  ) => void;
  removeParticipantReactionOpportunity: (participantId: string, opportunityId: string) => void;
  clearParticipantReactionOpportunities: (participantId: string) => void;

  // Movement actions
  moveParticipant: (
    participantId: string,
    fromPosition: string,
    toPosition: string,
  ) => Promise<void>;

  // Weapon management
  equipMainHandWeapon: (participantId: string, weapon: Equipment) => void;
  equipOffHandWeapon: (participantId: string, weapon: Equipment) => void;
  unequipMainHandWeapon: (participantId: string) => void;
  unequipOffHandWeapon: (participantId: string) => void;
}
