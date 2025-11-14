/**
 * Spell Component Utilities for D&D 5e
 *
 * Handles spell component tracking, preparation requirements, and casting validation.
 */

import type { Spell, Character } from '@/types/character';

import { CombatParticipant } from '@/types/combat';

/**
 * Check if a character has the required components for a spell
 */
export function hasRequiredComponents(
  character: Character,
  spell: Spell,
): {
  hasComponents: boolean;
  missingComponents: string[];
  componentCost?: number;
} {
  const missingComponents: string[] = [];
  let componentCost = 0;

  // Check verbal component
  if (spell.verbal && character.conditions.some((c) => c.name === 'silenced')) {
    missingComponents.push('Verbal (silenced)');
  }

  // Check somatic component
  if (spell.somatic) {
    // Check if hands are free or if character has War Caster feat
    const hasWarCaster = character.classFeatures?.some((f) => f.name === 'war_caster') || false;
    const handsFree = true; // Simplified - would check actual equipment

    if (!handsFree && !hasWarCaster) {
      missingComponents.push('Somatic (hands not free)');
    }
  }

  // Check material component
  if (spell.material) {
    if (spell.materialCost) {
      componentCost = spell.materialCost;

      // Check if character has the material component
      // In a real implementation, this would check the character's inventory
      // For now, we'll assume the character has the components unless they're consumed and expensive
      let hasComponent = true;

      // For high-cost consumed components, we might want to verify they're available
      if (spell.materialConsumed && spell.materialCost && spell.materialCost > 100) {
        // This is a simplified check - in a real implementation, you'd check inventory
        // For very expensive components, we're assuming the character might not have them
        hasComponent = false; // Simplified for demonstration
      }

      if (!hasComponent) {
        missingComponents.push(`Material (${spell.materialDescription})`);
      }
    }
  }

  return {
    hasComponents: missingComponents.length === 0,
    missingComponents,
    componentCost,
  };
}

/**
 * Check if a spell is properly prepared
 */
export function isSpellPrepared(
  character: Character,
  spell: Spell,
): {
  isPrepared: boolean;
  reason?: string;
} {
  // Always prepared spells (domain spells, etc.)
  if (spell.alwaysPrepared) {
    return { isPrepared: true };
  }

  // Prepared spells
  if (spell.prepared) {
    return { isPrepared: true };
  }

  // Check if character has this spell prepared
  if (character.preparedSpells?.includes(spell.name)) {
    return { isPrepared: true };
  }

  return {
    isPrepared: false,
    reason: 'Spell not prepared',
  };
}

/**
 * Get spell preparation limit for a character
 */
export function getSpellPreparationLimit(character: Character): number {
  if (!character.class?.spellcasting) {
    return 0;
  }

  const spellcastingAbility = character.class.spellcasting.ability;
  const abilityModifier = character.abilityScores[spellcastingAbility].modifier;

  // Wizard formula: Intelligence modifier + Wizard level
  if (character.class.name === 'Wizard') {
    return abilityModifier + (character.level || 1);
  }

  // Cleric, Druid, etc. formula: Wisdom modifier + class level
  return abilityModifier + (character.level || 1);
}

/**
 * Validate spell casting requirements
 */
export function validateSpellCast(
  character: Character,
  spell: Spell,
  spellSlotLevel?: number,
): {
  canCast: boolean;
  reasons: string[];
  componentCost?: number;
} {
  const reasons: string[] = [];
  let componentCost = 0;

  // Check spell preparation
  const preparation = isSpellPrepared(character, spell);
  if (!preparation.isPrepared) {
    reasons.push(preparation.reason || 'Spell not prepared');
  }

  // Check components
  const components = hasRequiredComponents(character, spell);
  if (!components.hasComponents) {
    reasons.push(...components.missingComponents);
  }
  componentCost = components.componentCost || 0;

  // Check spell slots
  if (spell.level > 0) {
    const hasSlot = hasAvailableSpellSlot(character, spell.level);
    if (!hasSlot) {
      reasons.push('No available spell slot');
    }
  }

  // Check ritual casting
  if (spell.ritual && !spell.prepared) {
    const canCastRitual = character.class?.spellcasting?.ritualCasting || false;
    if (!canCastRitual) {
      reasons.push('Cannot cast rituals');
    }
  }

  // Check concentration
  if (spell.concentration && character.activeConcentration) {
    reasons.push(`Already concentrating on ${character.activeConcentration}`);
  }

  return {
    canCast: reasons.length === 0,
    reasons,
    componentCost,
  };
}

/**
 * Check if character has an available spell slot of the required level
 */
export function hasAvailableSpellSlot(character: Character, level: number): boolean {
  if (!character.spellSlots) return false;

  // Check for exact level slot
  if (character.spellSlots[level]?.current > 0) {
    return true;
  }

  // Check for higher level slots (upcasting)
  for (let i = level + 1; i <= 9; i++) {
    if (character.spellSlots[i]?.current > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Prepare a spell for a character
 */
export function prepareSpell(character: Character, spell: Spell): Character {
  // Can't prepare always prepared spells
  if (spell.alwaysPrepared) {
    return character;
  }

  const preparedSpells = character.preparedSpells || [];

  // Don't add duplicates
  if (preparedSpells.includes(spell.name)) {
    return character;
  }

  // Check preparation limit
  const preparationLimit = getSpellPreparationLimit(character);
  if (preparedSpells.length >= preparationLimit) {
    throw new Error(`Cannot prepare more than ${preparationLimit} spells`);
  }

  return {
    ...character,
    preparedSpells: [...preparedSpells, spell.name],
  };
}

/**
 * Unprepare a spell for a character
 */
export function unprepareSpell(character: Character, spellName: string): Character {
  if (!character.preparedSpells) {
    return character;
  }

  return {
    ...character,
    preparedSpells: character.preparedSpells.filter((name) => name !== spellName),
  };
}

/**
 * Get component tracking information for UI
 */
export function getComponentTrackingInfo(spell: Spell): {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialDescription?: string;
  materialCost?: number;
  materialConsumed?: boolean;
} {
  return {
    verbal: spell.verbal || false,
    somatic: spell.somatic || false,
    material: spell.material || false,
    materialDescription: spell.materialDescription,
    materialCost: spell.materialCost,
    materialConsumed: spell.materialConsumed,
  };
}

/**
 * Consume material components when a spell is cast
 * In a real implementation, this would interact with a character's inventory system
 * For now, we'll just return information about what should be consumed
 */
export function consumeMaterialComponents(spell: Spell): {
  consumed: boolean;
  componentDescription?: string;
  cost?: number;
} {
  // Check if the spell has material components that are consumed
  if (spell.material && spell.materialConsumed && spell.materialDescription) {
    return {
      consumed: true,
      componentDescription: spell.materialDescription,
      cost: spell.materialCost || 0,
    };
  }

  return {
    consumed: false,
  };
}

/**
 * Track component usage for a character
 * This would update a character's inventory or component tracking system
 * For now, we'll just return tracking information
 */
export function trackComponentUsage(
  character: Character,
  spell: Spell,
): {
  componentsTracked: boolean;
  trackingMessage?: string;
} {
  const materialConsumption = consumeMaterialComponents(spell);

  if (materialConsumption.consumed) {
    // In a real implementation, this would update the character's inventory
    // For now, we'll just return tracking information
    return {
      componentsTracked: true,
      trackingMessage: `Consumed material component: ${materialConsumption.componentDescription}`,
    };
  }

  return {
    componentsTracked: true,
    trackingMessage: 'No components consumed',
  };
}
