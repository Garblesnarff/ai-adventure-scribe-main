/**
 * Spell Slots Type Definitions
 *
 * Type-safe interfaces for D&D 5E spell slot tracking and management
 * Work Unit: 2.1a
 */

/**
 * Spell slot for a specific level (1-9)
 */
export interface SpellSlot {
  id: string;
  characterId: string;
  spellLevel: number; // 1-9
  totalSlots: number;
  usedSlots: number;
  remainingSlots: number; // Computed: totalSlots - usedSlots
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Spell slot usage log entry
 */
export interface SpellSlotUsageLog {
  id: string;
  characterId: string;
  sessionId: string | null;
  spellName: string;
  spellLevel: number; // 0-9 (0 for cantrips, though cantrips don't use slots)
  slotLevelUsed: number; // 1-9 (actual slot level consumed)
  timestamp: Date;
}

/**
 * Character's complete spell slot state
 */
export interface CharacterSpellSlots {
  characterId: string;
  slots: SpellSlot[]; // Array of slots for levels 1-9
  totalAvailableSlots: number; // Total across all levels
  totalUsedSlots: number; // Total used across all levels
  // Index signature for direct access by spell level
  [level: number]: SpellSlot;
}

/**
 * Spell slot calculation result for a single class
 */
export interface SpellSlotCalculation {
  className: string;
  level: number;
  slots: {
    [level: number]: number; // Map of spell level (1-9) to number of slots
  };
  casterType: CasterType;
  casterLevel: number; // Effective caster level for multiclassing
}

/**
 * Multiclass spell slot calculation
 */
export interface MulticlassSpellSlots {
  classes: Array<{
    className: string;
    level: number;
  }>;
  totalCasterLevel: number;
  slots: {
    [level: number]: number; // Map of spell level (1-9) to number of slots
  };
  warlockSlots?: {
    slots: number;
    level: number;
  };
}

/**
 * Spellcasting class type
 */
export type CasterType = 'full' | 'half' | 'third' | 'pact' | 'none';

/**
 * D&D 5E class names
 */
export type ClassName =
  // Full casters
  | 'Wizard'
  | 'Sorcerer'
  | 'Cleric'
  | 'Druid'
  | 'Bard'
  // Half casters
  | 'Paladin'
  | 'Ranger'
  // Third casters
  | 'Eldritch Knight' // Fighter subclass
  | 'Arcane Trickster' // Rogue subclass
  // Pact magic
  | 'Warlock'
  // Non-casters
  | 'Fighter'
  | 'Rogue'
  | 'Barbarian'
  | 'Monk';

/**
 * Class spellcasting information
 */
export interface ClassSpellcasting {
  className: ClassName;
  casterType: CasterType;
  spellcastingAbility: 'intelligence' | 'wisdom' | 'charisma' | null;
  spellsKnownOrPrepared: 'known' | 'prepared' | null;
}

/**
 * Input for using a spell slot
 */
export interface UseSpellSlotInput {
  characterId: string;
  spellName: string;
  spellLevel: number; // Base level of the spell (0-9)
  slotLevelUsed: number; // Slot level to use (1-9)
  sessionId?: string;
}

/**
 * Result of using a spell slot
 */
export interface UseSpellSlotResult {
  success: boolean;
  message: string;
  slot: SpellSlot;
  logEntry: SpellSlotUsageLog;
  wasUpcast: boolean;
}

/**
 * Input for restoring spell slots
 */
export interface RestoreSpellSlotsInput {
  characterId: string;
  level?: number; // Specific level to restore, or all if omitted
  amount?: number; // Specific amount to restore, or all if omitted
}

/**
 * Result of restoring spell slots
 */
export interface RestoreSpellSlotsResult {
  characterId: string;
  slotsRestored: Array<{
    level: number;
    restoredAmount: number;
  }>;
  totalRestored: number;
}

/**
 * Upcasting validation result
 */
export interface UpcastValidation {
  canUpcast: boolean;
  spellLevel: number;
  targetLevel: number;
  reason?: string;
}

/**
 * Input for calculating spell slots
 */
export interface CalculateSpellSlotsInput {
  className: ClassName;
  level: number;
}

/**
 * Input for multiclass spell slot calculation
 */
export interface CalculateMulticlassSpellSlotsInput {
  classes: Array<{
    className: ClassName;
    level: number;
  }>;
}

/**
 * Spell slot usage history query
 */
export interface SpellSlotUsageQuery {
  characterId: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Spell slot usage history response
 */
export interface SpellSlotUsageHistory {
  entries: SpellSlotUsageLog[];
  total: number;
  hasMore: boolean;
}

/**
 * Error types for spell slot operations
 */
export type SpellSlotErrorType =
  | 'INSUFFICIENT_SLOTS'
  | 'INVALID_SPELL_LEVEL'
  | 'INVALID_SLOT_LEVEL'
  | 'INVALID_CLASS'
  | 'INVALID_CHARACTER'
  | 'CANNOT_UPCAST'
  | 'DATABASE_ERROR';

/**
 * Spell slot operation error
 */
export interface SpellSlotError extends Error {
  type: SpellSlotErrorType;
  characterId?: string;
  spellLevel?: number;
  slotLevel?: number;
}

/**
 * Warlock pact magic configuration
 */
export interface WarlockPactMagic {
  slots: number; // Number of spell slots (1-4)
  level: number; // Spell slot level (1-5)
  warlockLevel: number;
}
