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
  | 'cast_spell'      // Casting a spell
  | 'dash'            // Move extra distance
  | 'dodge'           // Gain AC bonus
  | 'help'            // Help another character
  | 'hide'            // Attempt stealth
  | 'ready'           // Ready an action
  | 'search'          // Look for something
  | 'use_object'      // Interact with item
  | 'bonus_action'    // Secondary action
  | 'reaction';       // Response to trigger

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
  | 'stunned' | 'unconscious' | 'exhaustion';

export interface Condition {
  name: ConditionName;
  description: string;
  duration: number; // rounds, -1 for permanent
  saveEndsType?: 'start' | 'end'; // when save is made
  saveDC?: number;
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  sourceSpell?: string;
  concentrationRequired?: boolean;
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
  deathSaves: {
    successes: number;
    failures: number;
  };
  
  // Actions taken this turn (resets each turn)
  actionTaken: boolean;
  bonusActionTaken: boolean;
  reactionTaken: boolean;
  movementUsed: number;
  
  // New: Spellcasting for combat tracking
  spellSlots?: Record<number, { max: number; current: number }>; // Copied from character for spell casters
  activeConcentration?: string | null; // Currently concentrated spell
  
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
  results: number[];
  total: number;
  advantage?: boolean;
  disadvantage?: boolean;
  critical?: boolean;
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
