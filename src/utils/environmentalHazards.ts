/**
 * Environmental Hazards Utilities for D&D 5e
 *
 * Functions for handling environmental hazard detection, interaction, and effects
 */

import type { Character } from '@/types/character';
import type {
  EnvironmentalHazard,
  HazardDetectionResult,
  HazardSaveResult,
  HazardManager,
} from '@/types/environmentalHazards';

import { rollDice, rollSavingThrow, calculateDamage } from '@/utils/diceUtils';
import { applyExhaustion } from '@/utils/exhaustionUtils';

/**
 * Detect an environmental hazard
 */
export function detectHazard(
  character: Character,
  hazard: EnvironmentalHazard,
): HazardDetectionResult {
  // If hazard isn't hidden, it's automatically detected
  if (!hazard.isHidden) {
    return {
      detected: true,
      description: `You notice the ${hazard.name}.`,
    };
  }

  // If no detection DC, assume it can't be detected
  if (!hazard.detectDC || !hazard.detectSkill) {
    return {
      detected: false,
      description: `You don't notice anything unusual.`,
    };
  }

  // Roll the appropriate skill check
  let skillModifier = 0;

  switch (hazard.detectSkill) {
    case 'perception':
      skillModifier = character.abilityScores?.wisdom?.modifier || 0;
      if (character.skillProficiencies?.includes('Perception')) {
        skillModifier += Math.floor((character.level || 1) / 4) + 2;
      }
      break;
    case 'investigation':
      skillModifier = character.abilityScores?.intelligence?.modifier || 0;
      if (character.skillProficiencies?.includes('Investigation')) {
        skillModifier += Math.floor((character.level || 1) / 4) + 2;
      }
      break;
    case 'survival':
      skillModifier = character.abilityScores?.wisdom?.modifier || 0;
      if (character.skillProficiencies?.includes('Survival')) {
        skillModifier += Math.floor((character.level || 1) / 4) + 2;
      }
      break;
  }

  const rollResult = rollDice(20, 1, skillModifier);
  const detected = rollResult.total >= hazard.detectDC;

  return {
    detected,
    rollResult: rollResult.total,
    dc: hazard.detectDC,
    description: detected ? `You notice the ${hazard.name}!` : `You don't notice anything unusual.`,
  };
}

/**
 * Interact with an environmental hazard (trigger it)
 */
export function interactWithHazard(
  character: Character,
  hazard: EnvironmentalHazard,
): HazardSaveResult {
  // If no save DC, hazard automatically affects
  if (!hazard.saveDC || !hazard.saveAbility) {
    const damage = hazard.damage ? calculateHazardDamage(hazard, false) : 0;
    return {
      saved: false,
      damageTaken: damage,
      description: `You are affected by the ${hazard.name}!`,
    };
  }

  // Roll the saving throw
  let abilityModifier = 0;

  switch (hazard.saveAbility) {
    case 'str':
      abilityModifier = character.abilityScores?.strength?.modifier || 0;
      break;
    case 'dex':
      abilityModifier = character.abilityScores?.dexterity?.modifier || 0;
      break;
    case 'con':
      abilityModifier = character.abilityScores?.constitution?.modifier || 0;
      break;
    case 'int':
      abilityModifier = character.abilityScores?.intelligence?.modifier || 0;
      break;
    case 'wis':
      abilityModifier = character.abilityScores?.wisdom?.modifier || 0;
      break;
    case 'cha':
      abilityModifier = character.abilityScores?.charisma?.modifier || 0;
      break;
  }

  // Check for proficiency or special bonuses
  const proficiencyBonus = Math.floor((character.level || 1) / 4) + 2;

  // Some classes have bonuses to certain saves
  let saveBonus = 0;
  if (character.class?.name?.toLowerCase() === 'monk' && hazard.saveAbility === 'dex') {
    saveBonus += proficiencyBonus; // Monks are proficient in Dex saves
  }
  if (character.class?.name?.toLowerCase() === 'barbarian' && hazard.saveAbility === 'con') {
    saveBonus += proficiencyBonus; // Barbarians are proficient in Con saves
  }

  const rollResult = rollSavingThrow(abilityModifier, saveBonus);
  const saved = rollResult.total >= hazard.saveDC;

  // Calculate damage based on save result
  const damage = hazard.damage ? calculateHazardDamage(hazard, saved) : 0;

  // Check for condition application
  const conditionsApplied: import('@/types/combat').ConditionName[] = [];
  if (hazard.conditions && !saved) {
    conditionsApplied.push(...hazard.conditions.map((c) => c.name));
  }

  // Check for exhaustion
  const exhaustionApplied = hazard.exhaustionLevel && !saved ? hazard.exhaustionLevel : 0;

  return {
    saved,
    rollResult: rollResult.total,
    dc: hazard.saveDC,
    damageTaken: damage,
    conditionsApplied,
    exhaustionApplied,
    description: saved
      ? `You avoid the worst of the ${hazard.name}!`
      : `You are affected by the ${hazard.name}!`,
  };
}

/**
 * Calculate damage from a hazard based on save result
 */
export function calculateHazardDamage(hazard: EnvironmentalHazard, saveSuccess: boolean): number {
  if (!hazard.damage) return 0;

  // Parse dice notation
  const diceParts = hazard.damage.dice.split('d');
  const diceCount = parseInt(diceParts[0]) || 0;
  const diceSides = parseInt(diceParts[1]) || 0;

  if (diceCount === 0 || diceSides === 0) return 0;

  // Roll damage
  const damageRoll = rollDice(diceSides, diceCount, 0);
  let damage = damageRoll.total;

  // Apply damage based on save result
  if (saveSuccess) {
    // Successful save
    if (hazard.damage.onSuccess === 'half') {
      damage = Math.floor(damage / 2);
    } else {
      damage = 0;
    }
  } else {
    // Failed save
    if (hazard.damage.onFail === 'half') {
      damage = Math.floor(damage / 2);
    }
    // 'full' damage is already applied
  }

  return Math.max(0, damage);
}

/**
 * Apply hazard effects to a character
 */
export function applyHazardEffects(
  character: Character,
  hazard: EnvironmentalHazard,
  saveResult: HazardSaveResult,
): Character {
  // Create a copy of the character to modify
  const updatedCharacter = { ...character };

  // Apply damage
  if (saveResult.damageTaken && saveResult.damageTaken > 0) {
    // Apply to current HP
    if (updatedCharacter.hitPoints) {
      updatedCharacter.hitPoints.current = Math.max(
        0,
        updatedCharacter.hitPoints.current - saveResult.damageTaken,
      );
    }
  }

  // Apply conditions
  if (saveResult.conditionsApplied && saveResult.conditionsApplied.length > 0) {
    // This would need to be implemented based on how conditions are stored in the character
    // For now, we'll just note that conditions would be applied
  }

  // Apply exhaustion
  if (saveResult.exhaustionApplied && saveResult.exhaustionApplied > 0) {
    // This would need to be implemented based on how exhaustion is stored in the character
    // For now, we'll just note that exhaustion would be applied
  }

  return updatedCharacter;
}

/**
 * Check character immunities, resistances, and vulnerabilities to hazard
 */
export function checkHazardImmunities(
  character: Character,
  hazard: EnvironmentalHazard,
): {
  immune: boolean;
  resistant: boolean;
  vulnerable: boolean;
} {
  if (!hazard.damage) {
    return { immune: false, resistant: false, vulnerable: false };
  }

  const damageType = hazard.damage.type;
  const immune = character.damageImmunities?.includes(damageType) || false;
  const resistant = character.damageResistances?.includes(damageType) || false;
  const vulnerable = character.damageVulnerabilities?.includes(damageType) || false;

  return { immune, resistant, vulnerable };
}

/**
 * Create a default hazard manager
 */
export const hazardManager: HazardManager = {
  detectHazard,
  interactWithHazard,
  applyHazardEffects,
  calculateHazardDamage,
  checkImmunities: checkHazardImmunities,
};

/**
 * Common environmental hazards data
 */
export const commonHazards: EnvironmentalHazard[] = [
  {
    id: 'acid_pool',
    name: 'Acid Pool',
    type: 'acid_pool',
    description: 'A pool of bubbling acid that causes chemical burns.',
    isHidden: true,
    detectDC: 15,
    detectSkill: 'perception',
    saveDC: 15,
    saveAbility: 'dex',
    damage: {
      dice: '2d6',
      type: 'acid',
      onFail: 'full',
      onSuccess: 'half',
    },
    trigger: 'enter',
  },
  {
    id: 'spiked_pit',
    name: 'Spiked Pit',
    type: 'spiked_pit',
    description: 'A concealed pit trap with sharp spikes at the bottom.',
    isHidden: true,
    detectDC: 12,
    detectSkill: 'perception',
    saveDC: 15,
    saveAbility: 'dex',
    damage: {
      dice: '3d6',
      type: 'piercing',
      onFail: 'full',
      onSuccess: 'none',
    },
    conditions: [
      {
        name: 'prone',
        duration: 1,
      },
    ],
    trigger: 'enter',
  },
  {
    id: 'extreme_heat',
    name: 'Extreme Heat',
    type: 'extreme_heat',
    description: 'An area of intense heat that causes exhaustion.',
    isAreaEffect: true,
    areaOfEffect: {
      shape: 'sphere',
      size: 20,
    },
    saveDC: 15,
    saveAbility: 'con',
    damage: {
      dice: '1d6',
      type: 'fire',
      onFail: 'full',
      onSuccess: 'none',
    },
    exhaustionLevel: 1,
    trigger: 'end_turn',
  },
  {
    id: 'poisonous_spores',
    name: 'Poisonous Spores',
    type: 'poisonous_spores',
    description: 'Cloud of toxic spores that cause poisoning.',
    isAreaEffect: true,
    areaOfEffect: {
      shape: 'cone',
      size: 15,
    },
    saveDC: 13,
    saveAbility: 'con',
    conditions: [
      {
        name: 'poisoned',
        duration: 1,
        saveEnds: true,
      },
    ],
    trigger: 'enter',
  },
  {
    id: 'slippery_ice',
    name: 'Slippery Ice',
    type: 'slippery_ice',
    description: 'A patch of icy ground that is difficult to traverse.',
    saveDC: 10,
    saveAbility: 'dex',
    conditions: [
      {
        name: 'prone',
        duration: 1,
      },
    ],
    movementModifier: 0.5,
    trigger: 'move',
  },
];
