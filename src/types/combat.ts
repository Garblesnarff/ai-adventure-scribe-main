/**
 * Combat Types for D&D 5e Tabletop Experience
 * 
 * These types represent the core mechanics of D&D 5e combat
 * as they would appear at a physical table, not as a video game.
 * Focus on turn-based mechanics, dice rolls, and DM oversight.
 */

// ===========================
// Core Combat Types
// ===========================

export type CombatPhase = 
  | 'initialization'    // Rolling initiative, starting combat
  | 'active'           // Taking turns in initiative order
  | 'conclusion';      // Combat ending, cleanup

export type ParticipantType = 
  | 'player'           // Player character
  | 'npc'             // Friendly NPC
  | 'monster';        // Enemy creature

export type ActionType = 
  | 'attack'          // Weapon or spell attack
  | 'off_hand_attack' // Two-weapon fighting bonus action attack
  | 'cast_spell'      // Casting a spell
  | 'dash'            // Move extra distance
  | 'dodge'           // Gain AC bonus
  | 'help'            // Help another character
  | 'hide'            // Attempt stealth
  | 'ready'           // Ready an action
  | 'search'          // Look for something
  | 'use_object'      // Interact with item
  | 'grapple'         // Special melee attack to grapple
  | 'shove'           // Special melee attack to push/prone
  | 'death_save'      // Roll death saving throw
  | 'concentration_save' // Roll to maintain concentration
  | 'bonus_action'    // Secondary action
  | 'reaction'        // Response to trigger
  | 'opportunity_attack' // Specific reaction type
  | 'counterspell'    // Specific reaction type
  | 'deflect_missiles' // Specific reaction type
  | 'shield_spell'    // Shield reaction
  | 'absorb_elements' // Absorb elements reaction
  | 'hellish_rebuke'; // Hellish rebuke reaction

export type ReactionTrigger = 
  | 'creature_leaves_reach'     // Opportunity attack
  | 'spell_cast_in_range'       // Counterspell
  | 'ranged_attack_hits'        // Deflect missiles
  | 'creature_enters_reach'     // Polearm master
  | 'damage_taken'              // Uncanny dodge, shield
  | 'ally_attacked_nearby';     // Protection fighting style

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
  | 'acid' | 'bludgeoning' | 'cold' | 'fire' | 'force'
  | 'lightning' | 'necrotic' | 'piercing' | 'poison'
  | 'psychic' | 'radiant' | 'slashing' | 'thunder';

// ===========================
// D&D Conditions
// ===========================

export type ConditionName = 
  | 'blinded' | 'charmed' | 'deafened' | 'frightened'
  | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed'
  | 'petrified' | 'poisoned' | 'prone' | 'restrained'
  | 'stunned' | 'unconscious' | 'exhaustion' | 'surprised';

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
  | 'defense' | 'dueling' | 'great_weapon_fighting' 
  | 'protection' | 'archery' | 'two_weapon_fighting'
  | 'blessed_warrior' | 'blind_fighting';

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
}

// ===========================
// Racial Traits & Class Features
// ===========================

export type RacialTraitName = 
  | 'lucky' | 'breath_weapon' | 'draconic_resistance' | 'relentless_endurance' 
  | 'fey_ancestry' | 'trance' | 'stonecunning' | 'poison_resistance'
  | 'hellish_resistance' | 'infernal_legacy' | 'natural_armor'
  | 'brave' | 'halfling_nimbleness';

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
  | 'rage' | 'sneak_attack' | 'action_surge' | 'divine_smite' 
  | 'deflect_missiles' | 'bardic_inspiration' | 'channel_divinity'
  | 'eldritch_invocations' | 'metamagic' | 'hunters_mark'
  | 'uncanny_dodge' | 'second_wind' | 'lay_on_hands' | 'ki';

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
// Combat Participants
// ===========================

export interface CombatParticipant {
  id: string;
  participantType: ParticipantType;
  
  // Basic Info
  name: string;
  characterId?: string; // For PCs, links to characters table
  
  // Combat Stats (as they appear on character sheet)
  initiative: number;
  armorClass: number;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  
  // Position (theater of mind style)
  position?: string; // "front rank", "behind pillar", etc.
  
  // Status
  conditions: Condition[];
  
  // Actions taken this turn (resets each turn)
  actionTaken: boolean;
  bonusActionTaken: boolean;
  reactionTaken: boolean;
  movementUsed: number;
  
  // Character data for combat features
  race?: string;
  characterClass?: string;
  level?: number;
  racialTraits?: RacialTrait[];
  classFeatures?: ClassFeature[];
  resources?: CharacterResources;
  fightingStyles?: FightingStyle[];
  
  // Spellcasting for combat tracking
  spellSlots?: Record<number, { max: number; current: number }>;
  activeConcentration?: {
    spell: string;
    level: number;
    dc: number; // Save DC for concentration
  } | null;
  
  // Combat state tracking
  damageResistances?: DamageType[];
  damageImmunities?: DamageType[];
  damageVulnerabilities?: DamageType[];
  isRaging?: boolean; // Barbarian rage state
  
  // Enhanced death saves
  deathSaves: DeathSaves;
  
  // Vision and positioning
  visionTypes?: VisionInfo[];
  cover?: CoverInfo;
  obscurement?: ObscurementLevel;
  
  // Weapons for two-weapon fighting
  mainHandWeapon?: {
    name: string;
    damage: string;
    damageType: DamageType;
    properties: WeaponProperties;
    attackBonus: number;
  };
  offHandWeapon?: {
    name: string;
    damage: string;
    damageType: DamageType;
    properties: WeaponProperties;
    attackBonus: number;
  };
  
  // For monsters/NPCs
  monsterData?: {
    challengeRating: string;
    attacks: MonsterAttack[];
    specialAbilities: string[];
    legendaryActions?: number;
    lairActions?: boolean;
  };
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
// Helper Types
// ===========================

export interface CombatContextValue {
  state: CombatState;
  
  // Combat management
  startCombat: (sessionId: string, initialParticipants: Partial<CombatParticipant>[]) => Promise<void>;
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
}
