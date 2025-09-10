/**
 * Death Saving Throws System for D&D 5e
 * 
 * Handles death saves when at 0 HP, stabilization, and death
 */

import { CombatParticipant, DeathSaves } from '@/types/combat';
import { rollDice } from './diceUtils';

/**
 * Roll a death saving throw
 */
export function rollDeathSave(participant: CombatParticipant): {
  roll: number;
  result: 'success' | 'failure' | 'critical_success' | 'critical_failure';
  newDeathSaves: DeathSaves;
  isStable: boolean;
  isDead: boolean;
  description: string;
} {
  const roll = rollDice(20, 1, 0);
  const naturalRoll = roll.keptResults[0];
  
  let result: 'success' | 'failure' | 'critical_success' | 'critical_failure';
  let newSuccesses = participant.deathSaves.successes;
  let newFailures = participant.deathSaves.failures;
  let isStable = participant.deathSaves.isStable || false;
  let description = '';
  
  if (naturalRoll === 20) {
    // Critical success - regain 1 HP
    result = 'critical_success';
    description = `${participant.name} rolled a natural 20 on death save - regains 1 HP!`;
    newSuccesses = 0;
    newFailures = 0;
    isStable = true;
  } else if (naturalRoll === 1) {
    // Critical failure - counts as 2 failures
    result = 'critical_failure';
    newFailures += 2;
    description = `${participant.name} rolled a natural 1 on death save - counts as 2 failures!`;
  } else if (naturalRoll >= 10) {
    // Success
    result = 'success';
    newSuccesses += 1;
    description = `${participant.name} succeeds on death save (${newSuccesses}/3 successes)`;
    
    if (newSuccesses >= 3) {
      isStable = true;
      description += ' - now stable!';
    }
  } else {
    // Failure
    result = 'failure';
    newFailures += 1;
    description = `${participant.name} fails death save (${newFailures}/3 failures)`;
  }
  
  const newDeathSaves: DeathSaves = {
    successes: Math.min(3, newSuccesses),
    failures: Math.min(3, newFailures),
    isStable
  };
  
  const isDead = newFailures >= 3;
  if (isDead) {
    description += ' - dies!';
  }
  
  return {
    roll: naturalRoll,
    result,
    newDeathSaves,
    isStable,
    isDead,
    description
  };
}

/**
 * Apply death save result to participant
 */
export function applyDeathSaveResult(
  participant: CombatParticipant,
  deathSaveResult: ReturnType<typeof rollDeathSave>
): CombatParticipant {
  let updatedParticipant = {
    ...participant,
    deathSaves: deathSaveResult.newDeathSaves
  };
  
  // Handle critical success (restore 1 HP)
  if (deathSaveResult.result === 'critical_success') {
    updatedParticipant.currentHitPoints = 1;
    updatedParticipant.deathSaves = {
      successes: 0,
      failures: 0,
      isStable: false
    };
  }
  
  // Handle death
  if (deathSaveResult.isDead) {
    updatedParticipant.currentHitPoints = 0;
    // Add dead condition
    const deadCondition = {
      name: 'unconscious' as const,
      description: 'Dead - failed 3 death saves',
      duration: -1
    };
    
    updatedParticipant.conditions = [...updatedParticipant.conditions, deadCondition];
  }
  
  // Handle stabilization (3 successes)
  if (deathSaveResult.isStable && !deathSaveResult.isDead) {
    updatedParticipant.deathSaves = {
      successes: 0,
      failures: 0,
      isStable: true
    };
  }
  
  return updatedParticipant;
}

/**
 * Check if participant needs to make death saves
 */
export function needsDeathSaves(participant: CombatParticipant): boolean {
  return participant.currentHitPoints === 0 && 
         !participant.deathSaves.isStable && 
         participant.deathSaves.failures < 3;
}

/**
 * Stabilize a dying participant (Medicine check, Spare the Dying, etc.)
 */
export function stabilizeParticipant(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    deathSaves: {
      successes: 0,
      failures: 0,
      isStable: true
    }
  };
}

/**
 * Deal damage to participant, handling instant death
 */
export function dealDamageWithDeathRules(
  participant: CombatParticipant,
  damage: number
): {
  participant: CombatParticipant;
  instantDeath: boolean;
  unconscious: boolean;
  description: string;
} {
  let description = '';
  let instantDeath = false;
  let unconscious = false;
  
  const newHP = Math.max(0, participant.currentHitPoints - damage);
  let updatedParticipant = { ...participant, currentHitPoints: newHP };
  
  if (participant.currentHitPoints > 0 && newHP === 0) {
    // Just dropped to 0 HP
    unconscious = true;
    description = `${participant.name} drops to 0 HP and falls unconscious`;
    
    // Check for massive damage (instant death)
    const remainingDamage = damage - participant.currentHitPoints;
    if (remainingDamage >= participant.maxHitPoints) {
      instantDeath = true;
      description += ' - massive damage causes instant death!';
      updatedParticipant.deathSaves = {
        successes: 0,
        failures: 3,
        isStable: false
      };
    } else {
      // Start making death saves
      updatedParticipant.deathSaves = {
        successes: 0,
        failures: 0,
        isStable: false
      };
    }
    
    // Add unconscious condition
    const unconsciousCondition = {
      name: 'unconscious' as const,
      description: 'Unconscious due to 0 hit points',
      duration: -1 // Until healed or stabilized
    };
    updatedParticipant.conditions = [...updatedParticipant.conditions, unconsciousCondition];
  }
  
  return {
    participant: updatedParticipant,
    instantDeath,
    unconscious,
    description
  };
}

/**
 * Heal participant, potentially bringing them back from unconsciousness
 */
export function healParticipant(
  participant: CombatParticipant,
  healingAmount: number
): {
  participant: CombatParticipant;
  revivedFromUnconscious: boolean;
  description: string;
} {
  const wasUnconscious = participant.currentHitPoints === 0;
  const newHP = Math.min(
    participant.maxHitPoints, 
    participant.currentHitPoints + healingAmount
  );
  
  let updatedParticipant = {
    ...participant,
    currentHitPoints: newHP
  };
  
  let revivedFromUnconscious = false;
  let description = `${participant.name} heals ${healingAmount} hit points`;
  
  if (wasUnconscious && newHP > 0) {
    // Remove unconscious condition and reset death saves
    revivedFromUnconscious = true;
    description += ' and regains consciousness!';
    
    updatedParticipant.conditions = updatedParticipant.conditions.filter(
      c => c.name !== 'unconscious'
    );
    
    updatedParticipant.deathSaves = {
      successes: 0,
      failures: 0,
      isStable: false
    };
  }
  
  return {
    participant: updatedParticipant,
    revivedFromUnconscious,
    description
  };
}

/**
 * Get death save status description
 */
export function getDeathSaveStatus(deathSaves: DeathSaves): string {
  if (deathSaves.isStable) {
    return 'Stable';
  }
  
  if (deathSaves.failures >= 3) {
    return 'Dead';
  }
  
  return `Death Saves: ${deathSaves.successes} successes, ${deathSaves.failures} failures`;
}

/**
 * Check if participant is dying (0 HP and not stable)
 */
export function isDying(participant: CombatParticipant): boolean {
  return participant.currentHitPoints === 0 && 
         !participant.deathSaves.isStable && 
         participant.deathSaves.failures < 3;
}

/**
 * Check if participant is dead
 */
export function isDead(participant: CombatParticipant): boolean {
  return participant.deathSaves.failures >= 3;
}