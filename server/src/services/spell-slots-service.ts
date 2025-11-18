/**
 * Spell Slots Service
 *
 * Handles D&D 5E spell slot calculation, tracking, and management
 * Implements PHB spell slot progression tables for all spellcasting classes
 * Work Unit: 2.1a
 *
 * @module server/services/spell-slots-service
 */

import { supabaseService } from '../lib/supabase.js';
import type {
  SpellSlot,
  SpellSlotUsageLog,
  CharacterSpellSlots,
  SpellSlotCalculation,
  MulticlassSpellSlots,
  UseSpellSlotInput,
  UseSpellSlotResult,
  RestoreSpellSlotsInput,
  RestoreSpellSlotsResult,
  UpcastValidation,
  SpellSlotUsageHistory,
  SpellSlotUsageQuery,
  ClassName,
  CasterType,
  ClassSpellcasting,
  WarlockPactMagic,
} from '../types/spell-slots.js';
import { NotFoundError, ValidationError, BusinessLogicError, InternalServerError } from '../lib/errors.js';

/**
 * D&D 5E Full Caster Spell Slot Progression (PHB pg. 114)
 * Used by: Wizard, Sorcerer, Cleric, Druid, Bard
 */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/**
 * D&D 5E Warlock Pact Magic Progression (PHB pg. 107)
 * Warlocks use a different system - all slots are the same level
 */
const WARLOCK_PACT_MAGIC: Record<number, { slots: number; level: number }> = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  6: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

/**
 * Class spellcasting configuration
 */
const CLASS_SPELLCASTING: Record<ClassName, ClassSpellcasting> = {
  // Full casters
  Wizard: { className: 'Wizard', casterType: 'full', spellcastingAbility: 'intelligence', spellsKnownOrPrepared: 'prepared' },
  Sorcerer: { className: 'Sorcerer', casterType: 'full', spellcastingAbility: 'charisma', spellsKnownOrPrepared: 'known' },
  Cleric: { className: 'Cleric', casterType: 'full', spellcastingAbility: 'wisdom', spellsKnownOrPrepared: 'prepared' },
  Druid: { className: 'Druid', casterType: 'full', spellcastingAbility: 'wisdom', spellsKnownOrPrepared: 'prepared' },
  Bard: { className: 'Bard', casterType: 'full', spellcastingAbility: 'charisma', spellsKnownOrPrepared: 'known' },

  // Half casters (start at level 2)
  Paladin: { className: 'Paladin', casterType: 'half', spellcastingAbility: 'charisma', spellsKnownOrPrepared: 'prepared' },
  Ranger: { className: 'Ranger', casterType: 'half', spellcastingAbility: 'wisdom', spellsKnownOrPrepared: 'known' },

  // Third casters (subclass features)
  'Eldritch Knight': { className: 'Eldritch Knight', casterType: 'third', spellcastingAbility: 'intelligence', spellsKnownOrPrepared: 'known' },
  'Arcane Trickster': { className: 'Arcane Trickster', casterType: 'third', spellcastingAbility: 'intelligence', spellsKnownOrPrepared: 'known' },

  // Pact magic
  Warlock: { className: 'Warlock', casterType: 'pact', spellcastingAbility: 'charisma', spellsKnownOrPrepared: 'known' },

  // Non-casters
  Fighter: { className: 'Fighter', casterType: 'none', spellcastingAbility: null, spellsKnownOrPrepared: null },
  Rogue: { className: 'Rogue', casterType: 'none', spellcastingAbility: null, spellsKnownOrPrepared: null },
  Barbarian: { className: 'Barbarian', casterType: 'none', spellcastingAbility: null, spellsKnownOrPrepared: null },
  Monk: { className: 'Monk', casterType: 'none', spellcastingAbility: null, spellsKnownOrPrepared: null },
};

/**
 * Spell Slots Service
 */
export class SpellSlotsService {
  /**
   * Calculate spell slots for a single class (D&D 5E PHB tables)
   * @param className - D&D 5E class name
   * @param level - Character level (1-20)
   * @returns Spell slot calculation
   */
  static calculateSpellSlots(className: ClassName, level: number): SpellSlotCalculation {
    if (level < 1 || level > 20) {
      throw new ValidationError('Level must be between 1 and 20', { level });
    }

    const classInfo = CLASS_SPELLCASTING[className];
    if (!classInfo) {
      throw new ValidationError(`Unknown class: ${className}`, { className });
    }

    const casterType = classInfo.casterType;
    const slots: Record<number, number> = {};

    // Calculate effective caster level based on caster type
    let casterLevel = 0;

    if (casterType === 'full') {
      casterLevel = level;
    } else if (casterType === 'half') {
      // Half casters start at level 2, use half level rounded down
      casterLevel = Math.floor(level / 2);
    } else if (casterType === 'third') {
      // Third casters use third level rounded down, max 4th level slots
      casterLevel = Math.floor(level / 3);
    } else if (casterType === 'pact') {
      // Warlock uses Pact Magic - separate system
      return {
        className,
        level,
        slots: {}, // Handled separately
        casterType: 'pact',
        casterLevel: level,
      };
    } else {
      // Non-casters
      return {
        className,
        level,
        slots: {},
        casterType: 'none',
        casterLevel: 0,
      };
    }

    // Get spell slots from table
    if (casterLevel > 0 && casterLevel <= 20) {
      const slotArray = FULL_CASTER_SLOTS[casterLevel];
      if (slotArray) {
        for (let i = 0; i < slotArray.length; i++) {
          const spellLevel = i + 1;
          const slotCount = slotArray[i];

          // Third casters max out at 4th level spells
          if (casterType === 'third' && spellLevel > 4) {
            break;
          }

          if (slotCount !== undefined && slotCount > 0) {
            slots[spellLevel] = slotCount;
          }
        }
      }
    }

    return {
      className,
      level,
      slots,
      casterType,
      casterLevel,
    };
  }

  /**
   * Calculate spell slots for multiclass characters (D&D 5E PHB pg. 164-165)
   * Warlock levels are handled separately (Pact Magic doesn't combine)
   *
   * @param classes - Array of classes and levels
   * @returns Multiclass spell slot calculation
   */
  static calculateMulticlassSpellSlots(
    classes: Array<{ className: ClassName; level: number }>
  ): MulticlassSpellSlots {
    let totalCasterLevel = 0;
    let warlockLevel = 0;

    // Calculate effective caster level (PHB pg. 164)
    for (const classInfo of classes) {
      const config = CLASS_SPELLCASTING[classInfo.className];

      if (config.casterType === 'full') {
        totalCasterLevel += classInfo.level;
      } else if (config.casterType === 'half') {
        totalCasterLevel += Math.floor(classInfo.level / 2);
      } else if (config.casterType === 'third') {
        totalCasterLevel += Math.floor(classInfo.level / 3);
      } else if (config.casterType === 'pact') {
        // Warlock doesn't combine with other spellcasting
        warlockLevel = classInfo.level;
      }
    }

    // Round down total caster level and cap at 20
    totalCasterLevel = Math.min(Math.floor(totalCasterLevel), 20);

    // Get spell slots from full caster table
    const slots: Record<number, number> = {};
    if (totalCasterLevel > 0) {
      const slotArray = FULL_CASTER_SLOTS[totalCasterLevel];
      if (slotArray) {
        for (let i = 0; i < slotArray.length; i++) {
          const spellLevel = i + 1;
          const slotCount = slotArray[i];
          if (slotCount !== undefined && slotCount > 0) {
            slots[spellLevel] = slotCount;
          }
        }
      }
    }

    // Handle Warlock Pact Magic separately
    let warlockSlots: WarlockPactMagic | undefined;
    if (warlockLevel > 0) {
      const pactMagic = WARLOCK_PACT_MAGIC[warlockLevel];
      if (pactMagic) {
        warlockSlots = {
          slots: pactMagic.slots,
          level: pactMagic.level,
          warlockLevel,
        };
      }
    }

    return {
      classes,
      totalCasterLevel,
      slots,
      warlockSlots,
    };
  }

  /**
   * Get character's current spell slots
   * @param characterId - Character UUID
   * @returns Character's spell slots
   */
  static async getCharacterSpellSlots(characterId: string): Promise<CharacterSpellSlots> {
    const { data, error } = await supabaseService
      .from('character_spell_slots')
      .select('*')
      .eq('character_id', characterId)
      .order('spell_level', { ascending: true });

    if (error) {
      throw new InternalServerError(`Failed to fetch spell slots: ${error.message}`, { error });
    }

    const slots: SpellSlot[] = (data || []).map((row) => ({
      id: row.id,
      characterId: row.character_id,
      spellLevel: row.spell_level,
      totalSlots: row.total_slots,
      usedSlots: row.used_slots,
      remainingSlots: row.total_slots - row.used_slots,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    const totalAvailableSlots = slots.reduce((sum, slot) => sum + slot.remainingSlots, 0);
    const totalUsedSlots = slots.reduce((sum, slot) => sum + slot.usedSlots, 0);

    return {
      characterId,
      slots,
      totalAvailableSlots,
      totalUsedSlots,
    };
  }

  /**
   * Use a spell slot
   * @param input - Spell slot usage input
   * @returns Result of using the spell slot
   */
  static async useSpellSlot(input: UseSpellSlotInput): Promise<UseSpellSlotResult> {
    const { characterId, spellName, spellLevel, slotLevelUsed, sessionId } = input;

    // Validate spell levels
    if (spellLevel < 0 || spellLevel > 9) {
      throw new ValidationError('Spell level must be between 0 and 9', { spellLevel });
    }

    if (slotLevelUsed < 1 || slotLevelUsed > 9) {
      throw new ValidationError('Slot level must be between 1 and 9', { slotLevelUsed });
    }

    // Check if upcasting is valid
    if (spellLevel > 0 && slotLevelUsed < spellLevel) {
      throw new ValidationError(`Cannot use a level ${slotLevelUsed} slot for a level ${spellLevel} spell`, { spellLevel, slotLevelUsed });
    }

    const wasUpcast = spellLevel > 0 && slotLevelUsed > spellLevel;

    // Get current slot state
    const { data: slotData, error: fetchError } = await supabaseService
      .from('character_spell_slots')
      .select('*')
      .eq('character_id', characterId)
      .eq('spell_level', slotLevelUsed)
      .single();

    if (fetchError || !slotData) {
      throw new NotFoundError(`Level ${slotLevelUsed} spell slots for character`, characterId);
    }

    // Check if slot is available
    if (slotData.used_slots >= slotData.total_slots) {
      throw new BusinessLogicError(`No available level ${slotLevelUsed} spell slots`, {
        level: slotLevelUsed,
        used: slotData.used_slots,
        total: slotData.total_slots
      });
    }

    // Use the slot
    const { data: updatedSlot, error: updateError } = await supabaseService
      .from('character_spell_slots')
      .update({ used_slots: slotData.used_slots + 1 })
      .eq('id', slotData.id)
      .select()
      .single();

    if (updateError || !updatedSlot) {
      throw new InternalServerError(`Failed to use spell slot: ${updateError?.message}`, { updateError });
    }

    // Log the usage
    const { data: logEntry, error: logError } = await supabaseService
      .from('spell_slot_usage_log')
      .insert({
        character_id: characterId,
        session_id: sessionId || null,
        spell_name: spellName,
        spell_level: spellLevel,
        slot_level_used: slotLevelUsed,
      })
      .select()
      .single();

    if (logError || !logEntry) {
      throw new InternalServerError(`Failed to log spell usage: ${logError?.message}`, { logError });
    }

    const slot: SpellSlot = {
      id: updatedSlot.id,
      characterId: updatedSlot.character_id,
      spellLevel: updatedSlot.spell_level,
      totalSlots: updatedSlot.total_slots,
      usedSlots: updatedSlot.used_slots,
      remainingSlots: updatedSlot.total_slots - updatedSlot.used_slots,
      createdAt: new Date(updatedSlot.created_at),
      updatedAt: new Date(updatedSlot.updated_at),
    };

    const log: SpellSlotUsageLog = {
      id: logEntry.id,
      characterId: logEntry.character_id,
      sessionId: logEntry.session_id,
      spellName: logEntry.spell_name,
      spellLevel: logEntry.spell_level,
      slotLevelUsed: logEntry.slot_level_used,
      timestamp: new Date(logEntry.timestamp),
    };

    const message = wasUpcast
      ? `Cast ${spellName} using a level ${slotLevelUsed} slot (upcast from level ${spellLevel})`
      : `Cast ${spellName} using a level ${slotLevelUsed} slot`;

    return {
      success: true,
      message,
      slot,
      logEntry: log,
      wasUpcast,
    };
  }

  /**
   * Check if a spell can be upcast
   * @param spellName - Name of the spell
   * @param baseLevel - Base level of the spell
   * @param targetLevel - Target level to upcast to
   * @returns Upcasting validation result
   */
  static canUpcast(spellName: string, baseLevel: number, targetLevel: number): UpcastValidation {
    // Cantrips cannot be upcast
    if (baseLevel === 0) {
      return {
        canUpcast: false,
        spellLevel: baseLevel,
        targetLevel,
        reason: 'Cantrips cannot be upcast',
      };
    }

    // Target level must be higher than base level
    if (targetLevel <= baseLevel) {
      return {
        canUpcast: false,
        spellLevel: baseLevel,
        targetLevel,
        reason: 'Target level must be higher than spell level',
      };
    }

    // Target level must be valid (1-9)
    if (targetLevel < 1 || targetLevel > 9) {
      return {
        canUpcast: false,
        spellLevel: baseLevel,
        targetLevel,
        reason: 'Target level must be between 1 and 9',
      };
    }

    return {
      canUpcast: true,
      spellLevel: baseLevel,
      targetLevel,
    };
  }

  /**
   * Restore spell slots (long rest or specific restoration)
   * @param input - Restore spell slots input
   * @returns Result of restoration
   */
  static async restoreSpellSlots(input: RestoreSpellSlotsInput): Promise<RestoreSpellSlotsResult> {
    const { characterId, level, amount } = input;

    let query = supabaseService.from('character_spell_slots').select('*').eq('character_id', characterId);

    // Filter by specific level if provided
    if (level !== undefined) {
      if (level < 1 || level > 9) {
        throw new ValidationError('Spell level must be between 1 and 9', { level });
      }
      query = query.eq('spell_level', level);
    }

    const { data: slots, error: fetchError } = await query;

    if (fetchError) {
      throw new InternalServerError(`Failed to fetch spell slots: ${fetchError.message}`, { fetchError });
    }

    if (!slots || slots.length === 0) {
      return {
        characterId,
        slotsRestored: [],
        totalRestored: 0,
      };
    }

    const slotsRestored: Array<{ level: number; restoredAmount: number }> = [];
    let totalRestored = 0;

    // Restore slots
    for (const slot of slots) {
      const currentUsed = slot.used_slots;

      if (currentUsed === 0) {
        continue; // Nothing to restore
      }

      let restoredAmount: number;

      if (amount !== undefined && amount >= 0) {
        // Restore specific amount
        restoredAmount = Math.min(amount, currentUsed);
      } else {
        // Restore all
        restoredAmount = currentUsed;
      }

      const newUsedSlots = currentUsed - restoredAmount;

      // Update the slot
      const { error: updateError } = await supabaseService
        .from('character_spell_slots')
        .update({ used_slots: newUsedSlots })
        .eq('id', slot.id);

      if (updateError) {
        throw new InternalServerError(`Failed to restore spell slots: ${updateError.message}`, { updateError });
      }

      slotsRestored.push({
        level: slot.spell_level,
        restoredAmount,
      });

      totalRestored += restoredAmount;
    }

    return {
      characterId,
      slotsRestored,
      totalRestored,
    };
  }

  /**
   * Get spell slot usage history
   * @param query - Usage query parameters
   * @returns Usage history
   */
  static async getSpellSlotUsageHistory(query: SpellSlotUsageQuery): Promise<SpellSlotUsageHistory> {
    const { characterId, sessionId, limit = 50, offset = 0 } = query;

    let dbQuery = supabaseService
      .from('spell_slot_usage_log')
      .select('*', { count: 'exact' })
      .eq('character_id', characterId)
      .order('timestamp', { ascending: false });

    if (sessionId) {
      dbQuery = dbQuery.eq('session_id', sessionId);
    }

    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new InternalServerError(`Failed to fetch usage history: ${error.message}`, { error });
    }

    const entries: SpellSlotUsageLog[] = (data || []).map((row) => ({
      id: row.id,
      characterId: row.character_id,
      sessionId: row.session_id,
      spellName: row.spell_name,
      spellLevel: row.spell_level,
      slotLevelUsed: row.slot_level_used,
      timestamp: new Date(row.timestamp),
    }));

    const total = count || 0;
    const hasMore = offset + entries.length < total;

    return {
      entries,
      total,
      hasMore,
    };
  }

  /**
   * Initialize spell slots for a character based on their class and level
   * @param characterId - Character UUID
   * @param classes - Character's classes and levels
   * @returns Initialized spell slots
   */
  static async initializeSpellSlots(
    characterId: string,
    classes: Array<{ className: ClassName; level: number }>
  ): Promise<CharacterSpellSlots> {
    // Calculate spell slots
    const calculation =
      classes.length === 1
        ? this.calculateSpellSlots(classes[0]?.className ?? 'Fighter', classes[0]?.level ?? 1)
        : this.calculateMulticlassSpellSlots(classes);

    const slots = 'slots' in calculation ? calculation.slots : {};

    // Delete existing slots
    await supabaseService.from('character_spell_slots').delete().eq('character_id', characterId);

    // Insert new slots
    const insertData = Object.entries(slots).map(([level, total]) => ({
      character_id: characterId,
      spell_level: parseInt(level),
      total_slots: total,
      used_slots: 0,
    }));

    if (insertData.length > 0) {
      const { error } = await supabaseService.from('character_spell_slots').insert(insertData);

      if (error) {
        throw new InternalServerError(`Failed to initialize spell slots: ${error.message}`, { error });
      }
    }

    // Return the initialized slots
    return this.getCharacterSpellSlots(characterId);
  }
}
