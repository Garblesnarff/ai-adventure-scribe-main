/**
 * Combat System Type Definitions
 *
 * Type-safe interfaces for D&D 5E combat initiative and turn order system
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CombatEncounter:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         sessionId:
 *           type: string
 *           format: uuid
 *         startedAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         currentRound:
 *           type: integer
 *           minimum: 1
 *         currentTurnOrder:
 *           type: integer
 *           minimum: 0
 *         status:
 *           type: string
 *           enum: [active, paused, completed]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CombatParticipant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         encounterId:
 *           type: string
 *           format: uuid
 *         characterId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         npcId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         name:
 *           type: string
 *         initiative:
 *           type: integer
 *         initiativeModifier:
 *           type: integer
 *         turnOrder:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         hpCurrent:
 *           type: integer
 *           nullable: true
 *         hpMax:
 *           type: integer
 *           nullable: true
 *         conditions:
 *           type: array
 *           items:
 *             type: string
 *
 *     CombatState:
 *       type: object
 *       properties:
 *         encounter:
 *           $ref: '#/components/schemas/CombatEncounter'
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CombatParticipant'
 *         turnOrder:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               participant:
 *                 $ref: '#/components/schemas/CombatParticipant'
 *               isCurrent:
 *                 type: boolean
 *               hasGone:
 *                 type: boolean
 *         currentParticipant:
 *           allOf:
 *             - $ref: '#/components/schemas/CombatParticipant'
 *           nullable: true
 *
 *     AttackResult:
 *       type: object
 *       properties:
 *         hit:
 *           type: boolean
 *         targetAC:
 *           type: integer
 *         totalAttackRoll:
 *           type: integer
 *         damage:
 *           type: integer
 *         damageType:
 *           type: string
 *           enum: [acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder]
 *         finalDamage:
 *           type: integer
 *         targetNewHp:
 *           type: integer
 *         targetIsConscious:
 *           type: boolean
 *         targetIsDead:
 *           type: boolean
 *         isCritical:
 *           type: boolean
 *         effectiveResistance:
 *           type: boolean
 *         effectiveVulnerability:
 *           type: boolean
 *         effectiveImmunity:
 *           type: boolean
 *
 *     ParticipantCondition:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         participantId:
 *           type: string
 *           format: uuid
 *         conditionId:
 *           type: string
 *           format: uuid
 *         conditionName:
 *           type: string
 *         durationType:
 *           type: string
 *           enum: [rounds, minutes, hours, until_save, permanent]
 *         durationValue:
 *           type: integer
 *           nullable: true
 *         saveDc:
 *           type: integer
 *           nullable: true
 *         saveAbility:
 *           type: string
 *           enum: [strength, dexterity, constitution, intelligence, wisdom, charisma]
 *           nullable: true
 *         appliedAtRound:
 *           type: integer
 *         expiresAtRound:
 *           type: integer
 *           nullable: true
 *         sourceDescription:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *
 *     DamageResult:
 *       type: object
 *       properties:
 *         participantId:
 *           type: string
 *           format: uuid
 *         originalDamage:
 *           type: integer
 *         modifiedDamage:
 *           type: integer
 *         tempHpLost:
 *           type: integer
 *         hpLost:
 *           type: integer
 *         newCurrentHp:
 *           type: integer
 *         newTempHp:
 *           type: integer
 *         isConscious:
 *           type: boolean
 *         isDead:
 *           type: boolean
 *         wasResisted:
 *           type: boolean
 *         wasVulnerable:
 *           type: boolean
 *         wasImmune:
 *           type: boolean
 *         massiveDamage:
 *           type: boolean
 *
 *     HealingResult:
 *       type: object
 *       properties:
 *         participantId:
 *           type: string
 *           format: uuid
 *         healingAmount:
 *           type: integer
 *         healingApplied:
 *           type: integer
 *         overheal:
 *           type: integer
 *         newCurrentHp:
 *           type: integer
 *         wasRevived:
 *           type: boolean
 *         isConscious:
 *           type: boolean
 *
 *     DeathSaveResult:
 *       type: object
 *       properties:
 *         participantId:
 *           type: string
 *           format: uuid
 *         roll:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         isSuccess:
 *           type: boolean
 *         isCritical:
 *           type: boolean
 *         successes:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *         failures:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *         isStabilized:
 *           type: boolean
 *         isDead:
 *           type: boolean
 *         wasRevived:
 *           type: boolean
 *         newCurrentHp:
 *           type: integer
 */

/**
 * Combat encounter status
 */
export type CombatStatus = 'active' | 'paused' | 'completed';

/**
 * Participant type discriminator
 */
export type ParticipantType = 'character' | 'npc' | 'other';

/**
 * Combat encounter representing an active combat session
 */
export interface CombatEncounter {
  id: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  currentRound: number;
  currentTurnOrder: number;
  status: string; // CombatStatus but stored as text in DB
  location: string | null;
  difficulty: string | null;
  experienceAwarded: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new combat encounter
 */
export interface CreateCombatEncounterInput {
  sessionId: string;
  status?: CombatStatus;
}

/**
 * Combat participant in an encounter
 * Note: HP and conditions are tracked separately in combatParticipantStatus
 */
export interface CombatParticipant {
  id: string;
  encounterId: string;
  characterId: string | null;
  npcId: string | null;
  name: string;
  initiative: number;
  initiativeModifier: number;
  turnOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  participantType: string;
  armorClass: number;
  maxHp: number;
  speed: number;
}

/**
 * Input for creating a combat participant
 */
export interface CreateParticipantInput {
  encounterId: string;
  characterId?: string | null;
  npcId?: string | null;
  name: string;
  initiativeModifier: number;
  hpCurrent?: number | null;
  hpMax?: number | null;
}

/**
 * Initiative roll result
 */
export interface InitiativeRoll {
  participantId: string;
  roll: number;
  modifier: number;
  total: number;
}

/**
 * Turn order entry with participant details
 */
export interface TurnOrderEntry {
  participant: CombatParticipant;
  isCurrent: boolean;
  hasGone: boolean;
}

/**
 * Complete combat state with all participants
 */
export interface CombatState {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  turnOrder: TurnOrderEntry[];
  currentParticipant: CombatParticipant | null;
}

/**
 * Input for rolling initiative
 */
export interface RollInitiativeInput {
  participantId: string;
  roll?: number; // Optional, will be auto-rolled if not provided
}

/**
 * Input for reordering initiative
 */
export interface ReorderInitiativeInput {
  participantId: string;
  newInitiative: number;
}

/**
 * Input for adding participants to combat
 */
export interface AddParticipantsInput {
  participants: CreateParticipantInput[];
  surpriseRound?: boolean;
}

/**
 * Combat condition effect
 */
export interface CombatCondition {
  name: string;
  duration?: number; // rounds, undefined = until removed
  description?: string;
}

/**
 * Result of advancing turn
 */
export interface AdvanceTurnResult {
  previousParticipant: CombatParticipant | null;
  currentParticipant: CombatParticipant;
  newRound: boolean;
  roundNumber: number;
}

// ==========================================
// Attack & Damage Resolution Types
// Work Unit 1.4a
// ==========================================

/**
 * Damage Types (D&D 5E)
 */
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

/**
 * Attack Types
 */
export type AttackType = 'melee' | 'ranged' | 'spell';

/**
 * Creature combat statistics
 */
export interface CreatureStats {
  id: string;
  characterId?: string;
  npcId?: string;
  armorClass: number;
  resistances: DamageType[];
  vulnerabilities: DamageType[];
  immunities: DamageType[];
  conditionImmunities: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating creature stats
 */
export interface CreateCreatureStatsInput {
  characterId?: string;
  npcId?: string;
  armorClass: number;
  resistances?: DamageType[];
  vulnerabilities?: DamageType[];
  immunities?: DamageType[];
  conditionImmunities?: string[];
}

/**
 * Weapon attack definition
 */
export interface WeaponAttack {
  id: string;
  characterId: string;
  name: string;
  attackBonus: number;
  damageDice: string;
  damageBonus: number;
  damageType: DamageType;
  properties: string[];
  description?: string;
  createdAt: Date;
}

/**
 * Input for creating a weapon attack
 */
export interface CreateWeaponAttackInput {
  characterId: string;
  name: string;
  attackBonus: number;
  damageDice: string;
  damageBonus: number;
  damageType: DamageType;
  properties?: string[];
  description?: string;
}

/**
 * Input for resolving an attack
 */
export interface AttackRollInput {
  attackerId: string;
  targetId: string;
  attackRoll: number;
  attackBonus?: number;
  weaponId?: string;
  attackType: AttackType;
  isCritical?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
  damageRoll?: number;
}

/**
 * Result of an attack resolution
 */
export interface AttackResult {
  hit: boolean;
  targetAC: number;
  totalAttackRoll: number;
  damage?: number;
  damageType?: DamageType;
  damageBeforeResistances?: number;
  effectiveResistance: boolean;
  effectiveVulnerability: boolean;
  effectiveImmunity: boolean;
  finalDamage: number;
  targetNewHp?: number;
  targetIsConscious?: boolean;
  targetIsDead?: boolean;
  isCritical: boolean;
  isNaturalOne: boolean;
  isNaturalTwenty: boolean;
}

/**
 * Input for spell attack resolution
 */
export interface SpellAttackInput {
  casterId: string;
  targetIds: string[];
  spellName: string;
  attackRoll?: number;
  saveDC?: number;
  saveRolls?: Record<string, number>;
  damageRoll?: number;
  damageDice?: string;
  damageType?: DamageType;
  isCritical?: boolean;
}

/**
 * Result of spell attack resolution
 */
export interface SpellAttackResult {
  results: AttackResult[];
}

/**
 * Input for hit check calculation
 */
export interface HitCheckInput {
  attackRoll: number;
  attackBonus: number;
  targetAC: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

/**
 * Result of hit check
 */
export interface HitCheckResult {
  hit: boolean;
  totalAttackRoll: number;
  targetAC: number;
  isNaturalOne: boolean;
  isNaturalTwenty: boolean;
  isCritical: boolean;
}

/**
 * Input for damage calculation
 */
export interface DamageCalculationInput {
  damageDice: string;
  damageBonus: number;
  damageType: DamageType;
  isCritical?: boolean;
  resistances?: DamageType[];
  vulnerabilities?: DamageType[];
  immunities?: DamageType[];
  damageRoll?: number;
}

/**
 * Result of damage calculation
 */
export interface DamageCalculationResult {
  baseDamage: number;
  damageBeforeResistances: number;
  effectiveResistance: boolean;
  effectiveVulnerability: boolean;
  effectiveImmunity: boolean;
  finalDamage: number;
  damageType: DamageType;
}

// ==========================================
// Conditions System Types
// Work Unit 1.3a
// ==========================================

/**
 * Duration type for conditions
 */
export type ConditionDurationType = 'rounds' | 'minutes' | 'hours' | 'until_save' | 'permanent';

/**
 * Saving throw abilities
 */
export type SaveAbility = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

/**
 * Advantage type for rolls
 */
export type AdvantageType = 'advantage' | 'disadvantage' | 'normal';

/**
 * Mechanical effects that a condition can impose
 */
export interface MechanicalEffects {
  // Attack rolls
  attack_rolls?: AdvantageType;
  attacks_against?: AdvantageType;
  attacks_against_melee?: AdvantageType;
  attacks_against_ranged?: AdvantageType;
  attacks_against_within_5ft?: 'critical_on_hit';

  // Ability checks
  ability_checks?: AdvantageType;
  ability_checks_sight?: 'auto_fail';
  ability_checks_hearing?: 'auto_fail';

  // Saving throws
  saving_throws_str?: AdvantageType | 'auto_fail';
  saving_throws_dex?: AdvantageType | 'auto_fail';
  saving_throws_con?: AdvantageType | 'auto_fail';
  saving_throws_int?: AdvantageType | 'auto_fail';
  saving_throws_wis?: AdvantageType | 'auto_fail';
  saving_throws_cha?: AdvantageType | 'auto_fail';
  dexterity_saves?: AdvantageType;

  // Movement
  speed?: number;
  movement?: 'cannot_move_closer' | 'crawl_only' | number;
  speed_bonuses_negated?: boolean;

  // Actions and reactions
  actions?: 'none';
  reactions?: 'none';

  // Special properties
  speech?: boolean | 'faltering';
  awareness?: boolean;
  drops_held_items?: boolean;
  prone?: boolean;
  hiding?: 'heavily_obscured';

  // Damage and resistance
  resistance?: 'all_damage';
  immunity?: 'poison_disease';

  // Social
  cannot_attack_charmer?: boolean;
  social_checks_by_charmer?: AdvantageType;

  // Additional custom effects (allow for extensibility)
  [key: string]: string | number | boolean | undefined;
}

/**
 * A condition from the conditions library
 */
export interface ConditionLibraryEntry {
  id: string;
  name: string;
  description: string;
  mechanicalEffects: string; // JSON string
  iconName: string | null;
  createdAt: Date;
}

/**
 * A condition from the library with parsed mechanical effects
 */
export interface Condition extends Omit<ConditionLibraryEntry, 'mechanicalEffects'> {
  mechanicalEffects: MechanicalEffects;
}

/**
 * A condition applied to a specific participant
 */
export interface ParticipantCondition {
  id: string;
  participantId: string;
  conditionId: string;
  durationType: ConditionDurationType;
  durationValue: number | null;
  saveDc: number | null;
  saveAbility: SaveAbility | null;
  appliedAtRound: number;
  expiresAtRound: number | null;
  sourceDescription: string | null;
  isActive: boolean;
  createdAt: Date;
}

/**
 * A participant condition with full condition details
 */
export interface ParticipantConditionWithDetails extends ParticipantCondition {
  condition: Condition;
}

/**
 * Input for creating a new participant condition
 */
export interface NewParticipantCondition {
  participantId: string;
  conditionId: string;
  durationType: ConditionDurationType;
  durationValue?: number | null;
  saveDc?: number | null;
  saveAbility?: SaveAbility | null;
  appliedAtRound: number;
  expiresAtRound?: number | null;
  sourceDescription?: string | null;
  isActive?: boolean;
}

/**
 * Request to apply a condition to a participant
 */
export interface ApplyConditionRequest {
  participantId: string;
  conditionName: string;
  durationType: ConditionDurationType;
  durationValue?: number;
  saveDc?: number;
  saveAbility?: SaveAbility;
  source?: string;
}

/**
 * Response after applying a condition
 */
export interface ApplyConditionResponse {
  success: boolean;
  condition: ParticipantConditionWithDetails;
  warnings?: string[];
}

/**
 * Request to attempt a saving throw
 */
export interface AttemptSaveRequest {
  saveRoll: number;
}

/**
 * Response after attempting a saving throw
 */
export interface AttemptSaveResponse {
  success: boolean;
  saved: boolean;
  conditionRemoved: boolean;
  message: string;
}

/**
 * Response with active conditions for a participant
 */
export interface GetActiveConditionsResponse {
  participantId: string;
  conditions: ParticipantConditionWithDetails[];
}

/**
 * Response with aggregated mechanical effects for a participant
 */
export interface GetMechanicalEffectsResponse {
  participantId: string;
  aggregatedEffects: MechanicalEffects;
  activeConditions: ParticipantConditionWithDetails[];
}

/**
 * Request to advance condition durations
 */
export interface AdvanceConditionDurationsRequest {
  encounterId: string;
  currentRound: number;
}

/**
 * Response after advancing condition durations
 */
export interface AdvanceConditionDurationsResponse {
  expiredConditions: ParticipantConditionWithDetails[];
  savingThrowsNeeded: Array<{
    participant: CombatParticipant;
    condition: ParticipantConditionWithDetails;
  }>;
}

/**
 * Information about a condition conflict
 */
export interface ConditionConflict {
  existingCondition: ParticipantConditionWithDetails;
  newConditionName: string;
  conflictType: 'duplicate' | 'superseded' | 'incompatible';
  message: string;
}

/**
 * Response after checking for condition conflicts
 */
export interface CheckConditionConflictsResponse {
  hasConflicts: boolean;
  conflicts: ConditionConflict[];
  canApply: boolean;
}

/**
 * Aggregated mechanical effects from multiple conditions
 */
export type AggregatedMechanicalEffects = MechanicalEffects & {
  appliedConditions: string[]; // Names of conditions contributing to effects
};

/**
 * Result of parsing mechanical effects JSON
 */
export interface ParsedMechanicalEffects {
  effects: MechanicalEffects;
  errors: string[];
}

// ==========================================
// HP & Damage Tracking Types
// Work Unit 1.2a
// ==========================================

/**
 * Participant HP and status tracking
 */
export interface ParticipantStatus {
  id: string;
  participantId: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  isConscious: boolean;
  deathSavesSuccesses: number;
  deathSavesFailures: number;
  updatedAt: Date;
}

/**
 * Damage log entry
 */
export interface DamageLogEntry {
  id: string;
  encounterId: string;
  participantId: string;
  damageAmount: number;
  damageType: string;
  sourceParticipantId: string | null;
  sourceDescription: string | null;
  roundNumber: number;
  createdAt: Date;
}

/**
 * Result of applying damage to a participant
 */
export interface DamageResult {
  participantId: string;
  originalDamage: number;
  modifiedDamage: number;
  tempHpLost: number;
  hpLost: number;
  newCurrentHp: number;
  newTempHp: number;
  isConscious: boolean;
  isDead: boolean;
  wasResisted: boolean;
  wasVulnerable: boolean;
  wasImmune: boolean;
  massiveDamage: boolean;
}

/**
 * Result of healing a participant
 */
export interface HealingResult {
  participantId: string;
  healingAmount: number;
  healingApplied: number;
  overheal: number;
  newCurrentHp: number;
  wasRevived: boolean;
  isConscious: boolean;
}

/**
 * Result of a death save roll
 */
export interface DeathSaveResult {
  participantId: string;
  roll: number;
  isSuccess: boolean;
  isCritical: boolean;
  successes: number;
  failures: number;
  isStabilized: boolean;
  isDead: boolean;
  wasRevived: boolean;
  newCurrentHp: number;
}

/**
 * Options for applying damage
 */
export interface ApplyDamageOptions {
  damageAmount: number;
  damageType?: DamageType;
  sourceParticipantId?: string;
  sourceDescription?: string;
  ignoreResistances?: boolean;
  ignoreImmunities?: boolean;
}
