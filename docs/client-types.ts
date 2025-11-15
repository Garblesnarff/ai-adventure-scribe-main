/**
 * D&D 5E Mechanics API - Client Type Definitions
 *
 * Copy these type definitions to your frontend project for type-safe API calls.
 * These types match the API responses from the AI Adventure Scribe D&D 5E mechanics API.
 *
 * @version 2.0.0
 * @date 2025-11-14
 */

// ============================================================================
// COMBAT SYSTEM TYPES
// ============================================================================

export interface CombatState {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  turnOrder: TurnOrderEntry[];
  currentParticipant: CombatParticipant | null;
}

export interface CombatEncounter {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  currentRound: number;
  currentTurnOrder: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

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
  hpCurrent: number | null;
  hpMax: number | null;
  conditions: string[];
  createdAt: string;
}

export interface TurnOrderEntry {
  participant: CombatParticipant;
  isCurrent: boolean;
  hasGone: boolean;
}

export interface StartCombatRequest {
  participants: CreateParticipantInput[];
  surpriseRound?: boolean;
}

export interface CreateParticipantInput {
  name: string;
  characterId?: string;
  npcId?: string;
  initiativeModifier: number;
  hpCurrent?: number;
  hpMax?: number;
}

export interface InitiativeRoll {
  participantId: string;
  roll: number;
  modifier: number;
  total: number;
}

export interface AttackRequest {
  attackerId: string;
  targetId: string;
  attackRoll: number;
  attackBonus?: number;
  weaponId?: string;
  attackType: 'melee' | 'ranged' | 'spell';
  isCritical?: boolean;
  damageRoll?: number;
}

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

export interface DamageRequest {
  participantId: string;
  damageAmount: number;
  damageType?: DamageType;
  sourceParticipantId?: string;
  sourceDescription?: string;
  ignoreResistances?: boolean;
  ignoreImmunities?: boolean;
}

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

export interface HealingResult {
  participantId: string;
  healingAmount: number;
  healingApplied: number;
  overheal: number;
  newCurrentHp: number;
  wasRevived: boolean;
  isConscious: boolean;
}

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

// Conditions

export type ConditionDurationType = 'rounds' | 'minutes' | 'hours' | 'until_save' | 'permanent';
export type SaveAbility = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface ApplyConditionRequest {
  participantId: string;
  conditionName: string;
  durationType: ConditionDurationType;
  durationValue?: number;
  saveDc?: number;
  saveAbility?: SaveAbility;
  source?: string;
}

export interface ParticipantCondition {
  id: string;
  participantId: string;
  conditionId: string;
  conditionName: string;
  durationType: ConditionDurationType;
  durationValue: number | null;
  saveDc: number | null;
  saveAbility: SaveAbility | null;
  appliedAtRound: number;
  expiresAtRound: number | null;
  sourceDescription: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ConditionSaveResult {
  success: boolean;
  saved: boolean;
  conditionRemoved: boolean;
  message: string;
}

// ============================================================================
// REST SYSTEM TYPES
// ============================================================================

export type RestType = 'short' | 'long';

export interface ShortRestRequest {
  hitDiceToSpend?: number;
  sessionId?: string;
  notes?: string;
}

export interface ShortRestResult {
  hpRestored: number;
  hitDiceSpent: number;
  hitDiceRemaining: number;
  featuresRestored: string[];
}

export interface LongRestResult {
  hpRestored: number;
  hitDiceRestored: number;
  spellSlotsRestored: boolean;
  featuresRestored: string[];
}

export interface HitDice {
  id: string;
  characterId: string;
  className: string;
  dieType: 'd6' | 'd8' | 'd10' | 'd12';
  totalDice: number;
  usedDice: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpendHitDiceResult {
  hpRestored: number;
  hitDiceSpent: number;
  rolls: number[];
  hitDiceRemaining: HitDice[];
}

// ============================================================================
// INVENTORY SYSTEM TYPES
// ============================================================================

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure';
export type EncumbranceLevel = 'normal' | 'encumbered' | 'heavily_encumbered';

export interface InventoryItem {
  id: string;
  characterId: string;
  name: string;
  itemType: ItemType;
  quantity: number;
  weight: number;
  description: string | null;
  properties: ItemProperties | null;
  isEquipped: boolean;
  isAttuned: boolean;
  requiresAttunement: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemProperties {
  // Weapon properties
  damage?: string;
  damageType?: string;
  attackBonus?: number;
  range?: string;
  weaponType?: string;

  // Armor properties
  armorClass?: number;
  armorType?: string;
  stealthDisadvantage?: boolean;

  // Consumable properties
  effectDescription?: string;
  healingDice?: string;
  duration?: string;

  // Magical properties
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact';
  magicalEffects?: string;
  attunementRequirements?: string;

  // Custom properties
  [key: string]: any;
}

export interface CreateItemRequest {
  name: string;
  itemType: ItemType;
  quantity?: number;
  weight?: number;
  description?: string;
  properties?: ItemProperties;
  isEquipped?: boolean;
  requiresAttunement?: boolean;
}

export interface UpdateItemRequest {
  name?: string;
  quantity?: number;
  weight?: number;
  description?: string;
  properties?: ItemProperties;
  isEquipped?: boolean;
  isAttuned?: boolean;
}

export interface UseConsumableResult {
  remainingQuantity: number;
  itemDeleted: boolean;
}

export interface EncumbranceStatus {
  currentWeight: number;
  carryingCapacity: number;
  encumbranceLevel: EncumbranceLevel;
  isEncumbered: boolean;
  isHeavilyEncumbered: boolean;
  speedPenalty: number;
  strengthScore: number;
}

export interface AttunementResult {
  success: boolean;
  attunedItem?: InventoryItem;
  currentAttunedCount: number;
  maxAttunedCount: number;
  error?: string;
}

// ============================================================================
// PROGRESSION SYSTEM TYPES
// ============================================================================

export type XPSource = 'combat' | 'quest' | 'roleplay' | 'milestone' | 'other';
export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface AwardXPRequest {
  xp: number;
  source: XPSource;
  description?: string;
  sessionId?: string;
}

export interface AwardXPResult {
  totalXP: number;
  currentLevel: number;
  canLevelUp: boolean;
  xpForNextLevel: number;
}

export interface ProgressionStatus {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  percentToNext: number;
  proficiencyBonus: number;
}

export interface AbilityScoreImprovement {
  ability: Ability;
  increase: number;
}

export interface LevelUpRequest {
  hpRoll?: number;
  abilityScoreImprovements?: AbilityScoreImprovement[];
  featSelected?: string;
  spellsLearned?: string[];
}

export interface LevelUpResult {
  characterId: string;
  oldLevel: number;
  newLevel: number;
  hpIncrease: {
    roll: number;
    conModifier: number;
    totalGained: number;
  };
  proficiencyBonus: number;
  newClassFeatures: ClassFeature[];
  newSpells?: string[];
  timestamp: string;
}

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
}

export interface LevelUpOptions {
  newLevel: number;
  hpIncrease: {
    dieType: string;
    conModifier: number;
    averageRoll: number;
  };
  hasAbilityScoreImprovement: boolean;
  abilityScoreOptions?: {
    maxIncrease: number;
    canTakeFeat: boolean;
  };
  classFeatures: ClassFeature[];
  spellChoices?: {
    spellLevel: number;
    spellsKnown: number;
    cantripsKnown?: number;
  };
  proficiencyBonus: number;
}

// ============================================================================
// CLASS FEATURES TYPES
// ============================================================================

export interface CharacterFeature {
  id: string;
  characterId: string;
  featureId: string;
  featureName: string;
  className: string;
  level: number;
  description: string;
  usesPerRest: number | null;
  currentUses: number;
  restType: 'short' | 'long' | null;
  acquiredAtLevel: number;
  createdAt: string;
}

export interface UseFeatureResult {
  success: boolean;
  message?: string;
  usesRemaining: number;
}

export interface RestoreFeaturesResult {
  featuresRestored: string[];
}

export interface SetSubclassRequest {
  className: string;
  subclassName: string;
  level: number;
}

// ============================================================================
// SPELL SLOTS TYPES
// ============================================================================

export interface SpellSlot {
  id: string;
  characterId: string;
  spellLevel: number;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseSpellSlotRequest {
  spellName: string;
  spellLevel: number;
  slotLevelUsed: number;
  sessionId?: string;
}

export interface UseSpellSlotResult {
  success: boolean;
  message: string;
  slot: SpellSlot;
  wasUpcast: boolean;
}

export interface RestoreSpellSlotsResult {
  characterId: string;
  slotsRestored: Array<{
    level: number;
    restoredAmount: number;
  }>;
  totalRestored: number;
}

export type ClassName =
  | 'Wizard'
  | 'Sorcerer'
  | 'Cleric'
  | 'Druid'
  | 'Bard'
  | 'Paladin'
  | 'Ranger'
  | 'Eldritch Knight'
  | 'Arcane Trickster'
  | 'Warlock'
  | 'Fighter'
  | 'Rogue'
  | 'Barbarian'
  | 'Monk';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiErrorResponse {
  error: {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  };
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'BUSINESS_LOGIC_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'INSUFFICIENT_SPELL_SLOTS'
  | 'CHARACTER_DEAD'
  | 'CHARACTER_UNCONSCIOUS'
  | 'COMBAT_NOT_ACTIVE'
  | 'PARTICIPANT_NOT_FOUND'
  | 'CONDITION_NOT_FOUND'
  | 'INVALID_LEVEL'
  | 'INSUFFICIENT_EXPERIENCE';

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  data: T;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

export const PROFICIENCY_BONUS_TABLE: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

export const HIT_DICE_BY_CLASS: Record<string, 'd6' | 'd8' | 'd10' | 'd12'> = {
  'Barbarian': 'd12',
  'Fighter': 'd10',
  'Paladin': 'd10',
  'Ranger': 'd10',
  'Bard': 'd8',
  'Cleric': 'd8',
  'Druid': 'd8',
  'Monk': 'd8',
  'Rogue': 'd8',
  'Warlock': 'd8',
  'Sorcerer': 'd6',
  'Wizard': 'd6',
};

export const MAX_LEVEL = 20;
export const MAX_ABILITY_SCORE = 20;
export const MAX_ATTUNED_ITEMS = 3;

export const DAMAGE_TYPES: DamageType[] = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
];

export const CONDITION_NAMES = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;

export type ConditionName = typeof CONDITION_NAMES[number];
