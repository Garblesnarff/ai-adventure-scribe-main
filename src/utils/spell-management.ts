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

import { Character, Spell } from '@/types/character';
import { CombatParticipant, CombatAction } from '@/types/combat';
import { classOptions } from '@/data/classOptions';
import { spellOptions } from '@/data/spellOptions';
import { allSpells } from '@/data/spellOptions';
import { validateSpellCast } from '@/utils/spellComponents';
import { consumeMaterialComponents, trackComponentUsage } from '@/utils/spellComponents';

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
function calculateClassSpellSlots(className: string, level: number): Partial<Record<SpellSlotLevel, number>> {
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
  const effectiveLevel = className.toLowerCase().includes('paladin') || className.toLowerCase().includes('ranger') 
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
    return { 1: { max: 0, current: 0 }, 2: { max: 0, current: 0 }, 3: { max: 0, current: 0 }, 4: { max: 0, current: 0 }, 5: { max: 0, current: 0 }, 6: { max: 0, current: 0 }, 7: { max: 0, current: 0 }, 8: { max: 0, current: 0 }, 9: { max: 0, current: 0 } };
  }

  let totalSlots: Partial<Record<SpellSlotLevel, number>> = {};

  // Determine caster levels using classOptions
  let fullCasterLevels = 0;
  let halfCasterLevels = 0;

  character.classLevels.forEach(classLevel => {
    const classOption = classOptions.find(c => c.name.toLowerCase() === classLevel.className.toLowerCase());
    const isFullCaster = classOption?.spellcasting && !['warlock'].includes(classOption.name.toLowerCase()); // Warlock uses pact slots
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
  const slots: Record<SpellSlotLevel, SpellSlotConfig> = {} as Record<SpellSlotLevel, SpellSlotConfig>;
  for (let i = 1; i <= 9; i++) {
    const max = totalSlots[i as SpellSlotLevel] || 0;
    slots[i as SpellSlotLevel] = { max, current: Math.min(max, character.spellSlots?.[i as SpellSlotLevel]?.current || max) };
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
  const updatedSlots: Record<SpellSlotLevel, SpellSlotConfig> = {} as Record<SpellSlotLevel, SpellSlotConfig>;
  
  for (let i = 1; i <= 9; i++) {
    updatedSlots[i as SpellSlotLevel] = { ...maxSlots[i as SpellSlotLevel], current: maxSlots[i as SpellSlotLevel].max };
  }

  return { ...character, spellSlots: updatedSlots, activeConcentration: null };
}

/**
 * Handles spell casting logic: deduct slot, set concentration if applicable
 * @param action - The combat action being taken
 * @param participant - The casting participant
 * @param spellName - Name of the spell being cast
 * @param spellLevel - Level at which spell is cast (may be higher than innate level)
 * @returns Updated participant and action with spell details
 */
export function castSpell(
  action: Partial<CombatAction>,
  participant: CombatParticipant,
  spellName: string,
  spellLevel: SpellSlotLevel
): { updatedParticipant: CombatParticipant; updatedAction: CombatAction } {
  // Find the spell being cast
  const spell = allSpells.find((s: Spell) => s.name === spellName);
  if (!spell) {
    throw new Error(`Spell ${spellName} not found`);
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
      }
    }
  } as Character;

  const validation = validateSpellCast(character, spell, spellLevel);
  if (!validation.canCast) {
    throw new Error(`Cannot cast ${spellName}: ${validation.reasons.join(', ')}`);
  }

  if (!participant.spellSlots || participant.spellSlots[spellLevel]?.current <= 0) {
    throw new Error(`No available spell slots at level ${spellLevel} for ${participant.name}`);
  }

  // Deduct slot
  const updatedSlots = { ...participant.spellSlots };
  updatedSlots[spellLevel] = { ...updatedSlots[spellLevel], current: updatedSlots[spellLevel].current - 1 };

  // Set concentration if spell requires it
  let concentrationSpell = null;
  if (spell.concentration && !participant.activeConcentration) {
    concentrationSpell = spellName;
  } else if (spell.concentration && participant.activeConcentration) {
    throw new Error(`${participant.name} is already concentrating on ${participant.activeConcentration}`);
  }

  const updatedParticipant: CombatParticipant = {
    ...participant,
    spellSlots: updatedSlots,
    activeConcentration: concentrationSpell,
  };

  // Create detailed action description with component information
  let description = `${action.description} (Cast ${spellName} using level ${spellLevel} slot)`;
  
  // Add component information to the action description
  const components = [];
  if (spell.verbal) components.push('V');
  if (spell.somatic) components.push('S');
  if (spell.material) components.push('M');
  
  if (components.length > 0) {
    description += ` [Components: ${components.join(', ')}]`;
  }
  
  if (spell.material && spell.materialDescription) {
    description += ` [Material: ${spell.materialDescription}]`;
  }

  const fullAction: CombatAction = {
    ...action as CombatAction,
    description,
    // Add spell-specific fields
    spellName: spell.name,
    spellLevel: spell.level,
    components: {
      verbal: spell.verbal || false,
      somatic: spell.somatic || false,
      material: spell.material || false,
      materialDescription: spell.materialDescription,
      materialCost: spell.materialCost,
      materialConsumed: spell.materialConsumed
    }
  };

  // Handle material component consumption and tracking
  const componentTracking = trackComponentUsage(
    {
      // Create a minimal character object for tracking
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
        }
      }
    } as Character,
    spell
  );
  
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
export function checkConcentration(participant: CombatParticipant, damageTaken: number = 0): boolean {
  if (!participant.activeConcentration) return true;

  if (damageTaken === 0) return true;

  const dc = Math.max(10, Math.floor(damageTaken / 2));
  // TODO: Roll Con save using ability modifier from character data
  const conMod = 0; // Placeholder; fetch from CharacterContext
  const roll = Math.floor(Math.random() * 20) + 1 + conMod; // Simulate d20 roll

  const maintained = roll >= dc;
  if (!maintained) {
    // Drop concentration
    participant.activeConcentration = null;
    // Optionally apply condition or notify
  }

  return maintained;
}
