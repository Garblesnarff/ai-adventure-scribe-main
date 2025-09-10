/**
 * Concentration Mechanics for D&D 5e
 * 
 * Handles concentration saves, spell tracking, and concentration rules
 */

import { CombatParticipant } from '@/types/combat';
import { rollDice, DiceRollOptions } from './diceUtils';
import { hasDisadvantageOnAttacksAndSaves } from './exhaustionUtils';

/**
 * Calculate concentration save DC
 */
export function getConcentrationSaveDC(damageDealt: number): number {
  // DC is 10 or half the damage taken, whichever is higher
  return Math.max(10, Math.floor(damageDealt / 2));
}

/**
 * Check if participant is concentrating on a spell
 */
export function isConcentrating(participant: CombatParticipant): boolean {
  return participant.activeConcentration !== null;
}

/**
 * Start concentration on a spell
 */
export function startConcentration(
  participant: CombatParticipant,
  spellName: string,
  spellLevel: number,
  saveDC: number
): CombatParticipant {
  // End any existing concentration
  const updatedParticipant = endConcentration(participant);
  
  return {
    ...updatedParticipant,
    activeConcentration: {
      spell: spellName,
      level: spellLevel,
      dc: saveDC
    }
  };
}

/**
 * End concentration (spell ends)
 */
export function endConcentration(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    activeConcentration: null
  };
}

/**
 * Roll a concentration save
 */
export function rollConcentrationSave(
  participant: CombatParticipant,
  dc: number,
  options: DiceRollOptions = {}
): {
  roll: any;
  succeeded: boolean;
  description: string;
  autoFail: boolean;
} {
  // Auto-fail if incapacitated
  const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
  const isIncapacitated = participant.conditions.some(c => 
    incapacitatingConditions.includes(c.name)
  );
  
  if (isIncapacitated) {
    return {
      roll: null,
      succeeded: false,
      description: `${participant.name} automatically fails concentration save (incapacitated)`,
      autoFail: true
    };
  }
  
  // Check for exhaustion disadvantage
  const hasExhaustionDisadvantage = hasDisadvantageOnAttacksAndSaves(participant);
  const rollOptions = {
    ...options,
    disadvantage: options.disadvantage || hasExhaustionDisadvantage
  };
  
  // Roll Constitution save
  const constitutionModifier = 2; // Simplified - would get from character stats
  const proficiencyBonus = Math.ceil((participant.level || 1) / 4) + 1; // Simplified proficiency
  
  // Check if participant is proficient in Constitution saves
  const isProficientInConSaves = participant.classFeatures?.some(f => 
    f.name === 'constitution_save_proficiency'
  ) || false;
  
  const totalBonus = constitutionModifier + (isProficientInConSaves ? proficiencyBonus : 0);
  const roll = rollDice(20, 1, totalBonus, rollOptions);
  
  const succeeded = roll.total >= dc;
  const description = `${participant.name} ${succeeded ? 'succeeds' : 'fails'} concentration save (${roll.total} vs DC ${dc})`;
  
  return {
    roll,
    succeeded,
    description,
    autoFail: false
  };
}

/**
 * Handle damage and check for concentration save
 */
export function handleDamageAndConcentration(
  participant: CombatParticipant,
  damageDealt: number
): {
  participant: CombatParticipant;
  needsConcentrationSave: boolean;
  concentrationSaveDC: number;
  concentrationLost: boolean;
  description: string;
} {
  let updatedParticipant = { ...participant };
  let needsConcentrationSave = false;
  let concentrationSaveDC = 0;
  let concentrationLost = false;
  let description = '';
  
  if (isConcentrating(participant) && damageDealt > 0) {
    needsConcentrationSave = true;
    concentrationSaveDC = getConcentrationSaveDC(damageDealt);
    
    // Auto-roll concentration save
    const saveResult = rollConcentrationSave(updatedParticipant, concentrationSaveDC);
    
    if (!saveResult.succeeded) {
      updatedParticipant = endConcentration(updatedParticipant);
      concentrationLost = true;
      description = `${saveResult.description} - concentration on ${participant.activeConcentration!.spell} ends!`;
    } else {
      description = `${saveResult.description} - maintains concentration on ${participant.activeConcentration!.spell}`;
    }
  }
  
  return {
    participant: updatedParticipant,
    needsConcentrationSave,
    concentrationSaveDC,
    concentrationLost,
    description
  };
}

/**
 * Check if casting a new concentration spell would end current concentration
 */
export function wouldBreakConcentration(
  participant: CombatParticipant,
  newSpellRequiresConcentration: boolean
): {
  wouldBreak: boolean;
  currentSpell?: string;
  description: string;
} {
  if (!newSpellRequiresConcentration) {
    return {
      wouldBreak: false,
      description: 'New spell does not require concentration'
    };
  }
  
  if (!isConcentrating(participant)) {
    return {
      wouldBreak: false,
      description: 'Not currently concentrating on any spell'
    };
  }
  
  return {
    wouldBreak: true,
    currentSpell: participant.activeConcentration!.spell,
    description: `Casting this spell would end concentration on ${participant.activeConcentration!.spell}`
  };
}

/**
 * Get Constitution save modifier for a participant
 */
export function getConstitutionSaveModifier(participant: CombatParticipant): number {
  // Simplified - would calculate from actual Constitution score and proficiency
  const constitutionModifier = 2;
  const proficiencyBonus = Math.ceil((participant.level || 1) / 4) + 1;
  
  // Check for Constitution save proficiency
  const isProficientInConSaves = participant.classFeatures?.some(f => 
    f.name === 'constitution_save_proficiency'
  ) || false;
  
  return constitutionModifier + (isProficientInConSaves ? proficiencyBonus : 0);
}

/**
 * Apply War Caster feat benefits to concentration saves
 */
export function hasWarCasterFeat(participant: CombatParticipant): boolean {
  return participant.classFeatures?.some(f => f.name === 'war_caster') || false;
}

/**
 * Roll concentration save with War Caster advantage
 */
export function rollConcentrationSaveWithWarCaster(
  participant: CombatParticipant,
  dc: number
): ReturnType<typeof rollConcentrationSave> {
  const hasWarCaster = hasWarCasterFeat(participant);
  
  return rollConcentrationSave(participant, dc, {
    advantage: hasWarCaster
  });
}

/**
 * Get all spells that require concentration for validation
 */
export const CONCENTRATION_SPELLS = [
  'bless', 'bane', 'hunters_mark', 'hex', 'spiritual_weapon',
  'hold_person', 'suggestion', 'invisibility', 'web',
  'counterspell', 'fireball', 'lightning_bolt', 'fly',
  'greater_invisibility', 'polymorph', 'wall_of_fire',
  'dominate_person', 'hold_monster', 'scrying'
];

/**
 * Check if a spell requires concentration
 */
export function requiresConcentration(spellName: string): boolean {
  return CONCENTRATION_SPELLS.includes(spellName.toLowerCase());
}

/**
 * Get concentration status description for UI
 */
export function getConcentrationStatusDescription(participant: CombatParticipant): string {
  if (!isConcentrating(participant)) {
    return 'Not concentrating';
  }
  
  const concentration = participant.activeConcentration!;
  return `Concentrating on ${concentration.spell} (Level ${concentration.level}, DC ${concentration.dc})`;
}