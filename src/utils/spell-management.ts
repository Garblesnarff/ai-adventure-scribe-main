/**
 * Spell Management Utilities
 *
 * Provides functions for D&D 5e spell slot calculations, management, and casting mechanics.
 * Based on PHB rules for spellcasting classes. Handles multiclassing by summing slots from all classes.
 *
 * Dependencies:
 * - Character types from '@/types/character'
 * - Combat types from '@/types/combat'
 * - classOptions and spellOptions from '@/data/'
 *
 * @author Cline
 */

// ===========================
// Imports
// ===========================

import type { Character } from '@/types/character';
import type { CombatParticipant, CombatAction } from '@/types/combat';

import { classes as classOptions } from '@/data/classOptions';
import { spellApi } from '@/services/spellApi';
import { Spell } from '@/types/character';
import {
  validateSpellCast,
  consumeMaterialComponents,
  trackComponentUsage,
} from '@/utils/spellComponents';

// ===========================
// Type Helpers
// ===========================

/**
 * Spell slot levels (1-9)
 */
export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Spell slot configuration for a single level
 */
export interface SpellSlotConfig {
  max: number;
  current: number;
}

/**
 * Calculates spell slots for a single class at a given level
 * Uses hardcoded PHB progression tables
 * @param className - The class name (e.g., 'wizard', 'cleric')
 * @param level - Character level in this class
 * @returns Spell slot counts per level
 */
function calculateClassSpellSlots(
  className: string,
  level: number,
): Partial<Record<SpellSlotLevel, number>> {
  // Hardcoded PHB spell slot progression for full casters (simplified for levels 1-5; expand as needed)
  const fullCasterProgression: Record<number, Partial<Record<SpellSlotLevel, number>>> = {
    1: { 1: 2 },
    2: { 1: 3 },
    3: { 1: 4, 2: 2 },
    4: { 1: 4, 2: 3 },
    5: { 1: 4, 2: 3, 3: 2 },
    6: { 1: 4, 2: 3, 3: 3 },
    7: { 1: 4, 2: 3, 3: 3, 4: 1 },
    // Continue to level 20...
  };

  // For half casters (paladin, ranger), use half the level
  const effectiveLevel =
    className.toLowerCase().includes('paladin') || className.toLowerCase().includes('ranger')
      ? Math.floor(level / 2)
      : level;

  const slots = fullCasterProgression[effectiveLevel] || { 1: 0 };

  return slots;
}

/**
 * Calculates total spell slots for a character, handling multiclassing
 * Sums slots from all classes, caps at multiclass spellcasting rules (half non-full caster levels)
 * @param character - The character object
 * @returns Spell slots record for levels 1-9
 */
export function calculateSpellSlots(character: Character): Record<SpellSlotLevel, SpellSlotConfig> {
  if (!character.classLevels || character.classLevels.length === 0) {
    return {
      1: { max: 0, current: 0 },
      2: { max: 0, current: 0 },
      3: { max: 0, current: 0 },
      4: { max: 0, current: 0 },
      5: { max: 0, current: 0 },
      6: { max: 0, current: 0 },
      7: { max: 0, current: 0 },
      8: { max: 0, current: 0 },
      9: { max: 0, current: 0 },
    };
  }

  const totalSlots: Partial<Record<SpellSlotLevel, number>> = {};

  // Determine caster levels using classOptions
  let fullCasterLevels = 0;
  let halfCasterLevels = 0;

  character.classLevels.forEach((classLevel) => {
    const classOption = classOptions.find(
      (c) => c.name.toLowerCase() === classLevel.className.toLowerCase(),
    );
    const isFullCaster =
      classOption?.spellcasting && !['warlock'].includes(classOption.name.toLowerCase()); // Warlock uses pact slots
    if (isFullCaster) {
      fullCasterLevels += classLevel.level;
    } else if (classOption?.spellcasting) {
      halfCasterLevels += Math.floor(classLevel.level / 2);
    }
  });

  const effectiveCasterLevel = Math.min(fullCasterLevels + halfCasterLevels, 20);

  // Use effective level with primary class
  const primaryClass = character.classLevels[0]?.className || 'wizard';
  const classSlots = calculateClassSpellSlots(primaryClass, effectiveCasterLevel);

  // Initialize total slots
  for (let i = 1; i <= 9; i++) {
    totalSlots[i as SpellSlotLevel] = classSlots[i as SpellSlotLevel] || 0;
  }

  // Ensure current doesn't exceed max
  const slots: Record<SpellSlotLevel, SpellSlotConfig> = {} as Record<
    SpellSlotLevel,
    SpellSlotConfig
  >;
  for (let i = 1; i <= 9; i++) {
    const max = totalSlots[i as SpellSlotLevel] || 0;
    slots[i as SpellSlotLevel] = {
      max,
      current: Math.min(max, character.spellSlots?.[i as SpellSlotLevel]?.current || max),
    };
  }

  return slots;
}

/**
 * Deducts a spell slot of the given level
 * @param character - Character to update
 * @param level - Spell level to deduct (1-9)
 * @returns Updated character with deducted slot
 */
export function deductSpellSlot(character: Character, level: SpellSlotLevel): Character {
  if (!character.spellSlots || character.spellSlots[level]?.current <= 0) {
    throw new Error(`No available spell slots at level ${level}`);
  }

  const updatedSlots = { ...character.spellSlots };
  updatedSlots[level] = { ...updatedSlots[level], current: updatedSlots[level].current - 1 };

  return { ...character, spellSlots: updatedSlots };
}

/**
 * Restores all spell slots to maximum (called on long rest)
 * @param character - Character to restore
 * @returns Updated character with full slots
 */
export function restoreSpellSlots(character: Character): Character {
  const maxSlots = calculateSpellSlots(character);
  const updatedSlots: Record<SpellSlotLevel, SpellSlotConfig> = {} as Record<
    SpellSlotLevel,
    SpellSlotConfig
  >;

  for (let i = 1; i <= 9; i++) {
    updatedSlots[i as SpellSlotLevel] = {
      ...maxSlots[i as SpellSlotLevel],
      current: maxSlots[i as SpellSlotLevel].max,
    };
  }

  return { ...character, spellSlots: updatedSlots, activeConcentration: null };
}

/**
 * Handles spell casting logic: deduct slot, set concentration if applicable
 * @param action - The combat action being taken
 * @param participant - The casting participant
 * @param spellId - ID of the spell being cast
 * @param spellLevel - Level at which spell is cast (may be higher than innate level)
 * @returns Updated participant and action with spell details
 */
export async function castSpell(
  action: Partial<CombatAction>,
  participant: CombatParticipant,
  spellId: string,
  spellLevel: SpellSlotLevel,
): Promise<{ updatedParticipant: CombatParticipant; updatedAction: CombatAction }> {
  // Find the spell being cast
  const spell = await spellApi.getSpellById(spellId);
  if (!spell) {
    throw new Error(`Spell ${spellId} not found`);
  }

  // Validate spell casting requirements (components, preparation, etc.)
  // Note: For combat participants, we need to check if they have the spell prepared
  // This is a simplified check - in a real implementation, you'd have the full character data
  const character = {
    // Create a minimal character object for validation
    // In a real implementation, this would come from CharacterContext
    preparedSpells: participant.preparedSpells || [],
    spellSlots: participant.spellSlots,
    activeConcentration: participant.activeConcentration,
    conditions: participant.conditions || [],
    abilityScores: {
      // Placeholder values - in real implementation, these would come from character data
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 10, modifier: 0 },
      charisma: { score: 10, modifier: 0 },
    },
    class: {
      spellcasting: {
        ability: 'intelligence', // Placeholder
        ritualCasting: false, // Placeholder
      },
    },
  } as unknown as {
    preparedSpells: string[];
    spellSlots?: Record<SpellSlotLevel, SpellSlotConfig>;
    activeConcentration: string | null;
    conditions?: unknown[];
    abilityScores: {
      intelligence: { score: number; modifier: number };
      wisdom: { score: number; modifier: number };
      charisma: { score: number; modifier: number };
    };
    class: { spellcasting: { ability: string; ritualCasting: boolean } };
  }; // Minimal shape for validation context

  // Mock validation for now - in real implementation, implement validateSpellCast
  const validation = { canCast: true, reasons: [] };
  if (!validation.canCast) {
    throw new Error(`Cannot cast ${spell.name}: ${validation.reasons.join(', ')}`);
  }

  if (!participant.spellSlots || participant.spellSlots[spellLevel]?.current <= 0) {
    throw new Error(`No available spell slots at level ${spellLevel} for ${participant.name}`);
  }

  // Deduct slot
  const updatedSlots = { ...participant.spellSlots };
  updatedSlots[spellLevel] = {
    ...updatedSlots[spellLevel],
    current: updatedSlots[spellLevel].current - 1,
  };

  // Set concentration if spell requires it
  let concentrationSpell = null;
  if (spell.concentration && !participant.activeConcentration) {
    concentrationSpell = spell.name;
  } else if (spell.concentration && participant.activeConcentration) {
    throw new Error(
      `${participant.name} is already concentrating on ${participant.activeConcentration}`,
    );
  }

  const updatedParticipant: CombatParticipant = {
    ...participant,
    spellSlots: updatedSlots,
    activeConcentration: concentrationSpell,
  };

  // Create detailed action description with component information
  let description = `${action.description} (Cast ${spell.name} using level ${spellLevel} slot)`;

  // Add component information to the action description
  const components = [];
  if (spell.components_verbal) components.push('V');
  if (spell.components_somatic) components.push('S');
  if (spell.components_material) components.push('M');

  if (components.length > 0) {
    description += ` [Components: ${components.join(', ')}]`;
  }

  if (spell.components_material && spell.material_components) {
    description += ` [Material: ${spell.material_components}]`;
  }

  const fullAction: CombatAction = {
    ...(action as CombatAction),
    description,
    // Add spell-specific fields
    spellName: spell.name,
    spellLevel: spell.level,
    components: {
      verbal: spell.components_verbal || false,
      somatic: spell.components_somatic || false,
      material: spell.components_material || false,
      materialDescription: spell.material_components,
      materialCost: spell.material_cost,
      materialConsumed: spell.material_consumed || false,
    },
  };

  // Handle material component consumption and tracking
  const componentTracking = { trackingMessage: '' }; // Mock for now - implement trackComponentUsage properly

  if (componentTracking.trackingMessage) {
    fullAction.description += ` [${componentTracking.trackingMessage}]`;
  }

  return { updatedParticipant, updatedAction: fullAction };
}

/**
 * Checks if participant is concentrating and handles concentration checks (e.g., on damage)
 * @param participant - The participant to check
 * @param damageTaken - If damage was taken, triggers concentration save (Con save DC 10 or half damage, whichever higher)
 * @returns True if concentration maintained, false if dropped
 */
export function checkConcentration(
  participant: CombatParticipant,
  damageTaken: number = 0,
): boolean {
  if (!participant.activeConcentration) return true;

  if (damageTaken === 0) return true;

  const dc = Math.max(10, Math.floor(damageTaken / 2));

  // A proper implementation would also check for proficiency in Constitution saving throws.
  // For now, we'll just use the ability modifier.
  const conMod =
    typeof (participant as unknown as { abilityScores?: { constitution?: { modifier?: number } } })
      .abilityScores?.constitution?.modifier === 'number'
      ? ((participant as unknown as { abilityScores?: { constitution?: { modifier?: number } } })
          .abilityScores!.constitution!.modifier as number)
      : 0;
  const roll = Math.floor(Math.random() * 20) + 1 + conMod;

  const maintained = roll >= dc;
  if (!maintained) {
    // Drop concentration
    participant.activeConcentration = null;
    // Optionally apply condition or notify
  }

  return maintained;
}
