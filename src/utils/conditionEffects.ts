/**
 * Condition Effects Utility
 *
 * This module provides centralized logic for applying D&D 5e condition effects
 * to combat participants. It handles automatic modifiers, duration tracking,
 * and save-based removal for all standard conditions.
 *
 * @author AI Assistant
 */

import { d20 } from './diceRolls';

import type { CombatParticipant, Condition, ConditionName, DiceRoll } from '@/types/combat';

import { Equipment } from '@/data/equipmentOptions';
import { DamageType } from '@/types/combat';

// ===========================
// Condition Effect Definitions
// ===========================

interface ConditionModifiers {
  advantage: boolean;
  disadvantage: boolean;
  bonus: number;
  autoFail: boolean;
  description: string;
}

interface ConditionDefinition {
  description: string;
  getModifiers: (
    participant: CombatParticipant,
    rollType: string,
    target?: CombatParticipant,
  ) => ConditionModifiers;
  onApply?: (participant: CombatParticipant, condition: Condition) => CombatParticipant;
  onRemove?: (participant: CombatParticipant, condition: Condition) => CombatParticipant;
  effect: string[];
}

// Core condition effects mapping
const CONDITION_EFFECTS: Record<ConditionName, ConditionDefinition> = {
  blinded: {
    description:
      "Can't see enemies or allies. All attacks have disadvantage. Attacks against this creature have advantage.",
    getModifiers: (participant, rollType, target) => {
      const isAttacker = participant.participantType === 'player' || !target;
      if (isAttacker) {
        // Attacker is blinded
        return rollType === 'attack'
          ? {
              advantage: false,
              disadvantage: true,
              bonus: 0,
              autoFail: false,
              description: 'Blind - Disadvantage on attacks',
            }
          : {
              advantage: false,
              disadvantage: false,
              bonus: 0,
              autoFail: false,
              description: '',
            };
      } else {
        // Target is blinded (attacks against them get advantage)
        return rollType === 'defense'
          ? {
              advantage: true,
              disadvantage: false,
              bonus: 0,
              autoFail: false,
              description: 'Blind - Advantage on attacks vs blinded target',
            }
          : {
              advantage: false,
              disadvantage: false,
              bonus: 0,
              autoFail: false,
              description: '',
            };
      }
    },
    effect: [
      "Can't see enemies or allies",
      'All attacks have disadvantage',
      'Attacks against this creature have advantage',
    ],
  },

  charmed: {
    description:
      'Regards the charmer as a friendly acquaintance. Cannot target the charmer with attacks or damage.',
    getModifiers: (participant, rollType, target) => {
      // Charmed creatures cannot attack their charmer
      // Note: This is a simplified implementation - in full D&D it would track who charmed them
      if (rollType === 'attack' && target?.participantType === 'player') {
        return {
          advantage: false,
          disadvantage: false,
          bonus: 0,
          autoFail: true,
          description: 'Charmed - Cannot attack charmer',
        };
      }
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: '',
      };
    },
    effect: ['Cannot attack charmer', 'Regards charmer as friendly', 'Cannot be harmed by charmer'],
  },

  deafened: {
    description: 'Cannot hear sounds. Automatically fails saving throws based on hearing.',
    getModifiers: (participant, rollType) => {
      // Auto-fail saves that rely on hearing (some DM discretion needed)
      return rollType === 'hearing_dependent'
        ? {
            advantage: false,
            disadvantage: false,
            bonus: 0,
            autoFail: true,
            description: 'Deafened - Auto-fail hearing-based saves',
          }
        : {
            advantage: false,
            disadvantage: false,
            bonus: 0,
            autoFail: false,
            description: '',
          };
    },
    effect: ['Cannot hear sounds', 'Auto-fail hearing-based saves', 'Cannot understand speech'],
  },

  frightened: {
    description:
      'Afraid of a creature. Cannot willingly move closer to it. Attacks have disadvantage.',
    getModifiers: (participant, rollType) => {
      return rollType === 'attack'
        ? {
            advantage: false,
            disadvantage: true,
            bonus: 0,
            autoFail: false,
            description: 'Frightened - Disadvantage on attacks',
          }
        : {
            advantage: false,
            disadvantage: false,
            bonus: 0,
            autoFail: false,
            description: '',
          };
    },
    effect: ['Cannot approach source of fear', 'Disadvantage on attacks and ability checks'],
  },

  grappled: {
    description: 'Restrained by a grappler. Speed becomes 0. Cannot move.',
    getModifiers: (participant, rollType) => {
      // Grappling affects movement primarily (handled in other systems)
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: 'Grappled - Speed 0, cannot move',
      };
    },
    onApply: (participant, condition) => {
      return {
        ...participant,
        movementUsed: participant.speed, // Effectively 0 speed
        conditions: [...participant.conditions, condition],
      };
    },
    effect: ['Speed becomes 0', 'Cannot move', 'Can break free with Athletics or Acrobatics'],
  },

  incapacitated: {
    description: 'Cannot take actions, speak, or communicate. Unable to respond.',
    getModifiers: (participant, rollType) => {
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: true, // Cannot take most actions
        description: 'Incapacitated - Cannot take actions',
      };
    },
    effect: ['Cannot take actions', 'Cannot speak', 'Cannot respond to stimuli'],
  },

  invisible: {
    description:
      'Cannot be seen. Attacks have advantage. Attacks against this creature have disadvantage.',
    getModifiers: (participant, rollType) => {
      if (rollType === 'attack') {
        // Invisible creature attacking - advantage
        return {
          advantage: true,
          disadvantage: false,
          bonus: 0,
          autoFail: false,
          description: 'Invisible - Advantage on attacks',
        };
      } else if (rollType === 'defense') {
        // Being attacked while invisible - disadvantage for attacker
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: 'Invisible - Disadvantage on attacks vs target',
        };
      }
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: '',
      };
    },
    effect: ['Cannot be seen', 'Advantage on attacks', 'Attacks against target have disadvantage'],
  },

  paralyzed: {
    description: 'Cannot move, speak, or take actions. Auto-fails DEX and STR saves.',
    getModifiers: (participant, rollType) => {
      const dexAndStrSaves = rollType === 'dexterity_save' || rollType === 'strength_save';
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: dexAndStrSaves,
        description: dexAndStrSaves
          ? 'Paralyzed - Auto-fail DEX/STR saves'
          : 'Paralyzed - Cannot move or act',
      };
    },
    effect: [
      'Cannot move, speak, or take actions',
      'Auto-fail DEX and STR saves',
      'Critical hits automatically hit',
    ],
  },

  petrified: {
    description: 'Turned to stone. Cannot move, speak, or take actions. Unconscious.',
    getModifiers: (participant, rollType) => {
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: true, // Effectively unconscious
        description: 'Petrified - Cannot move or act',
      };
    },
    effect: [
      'Turned to stone',
      'Cannot move, speak, or take actions',
      'Weight increases',
      'Becomes unconscious',
    ],
  },

  poisoned: {
    description: 'Poisoned. Disadvantage on attack rolls and ability checks.',
    getModifiers: (participant, rollType) => {
      return rollType === 'attack' || rollType === 'ability_check'
        ? {
            advantage: false,
            disadvantage: true,
            bonus: 0,
            autoFail: false,
            description: 'Poisoned - Disadvantage on attacks and checks',
          }
        : {
            advantage: false,
            disadvantage: false,
            bonus: 0,
            autoFail: false,
            description: '',
          };
    },
    effect: ['Disadvantage on attack rolls and ability checks'],
  },

  prone: {
    description: 'Lying down. Melee attacks have advantage. All attacks have disadvantage.',
    getModifiers: (participant, rollType, target) => {
      if (rollType === 'melee_attack' && target) {
        // Attacking prone target
        return {
          advantage: true,
          disadvantage: false,
          bonus: 0,
          autoFail: false,
          description: 'Prone - Advantage on melee attacks vs prone target',
        };
      } else if (rollType === 'ranged_attack') {
        // Attacking while prone
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: 'Prone - Disadvantage on ranged attacks',
        };
      }
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: '',
      };
    },
    effect: [
      'Melee attacks vs prone target have advantage',
      'Ranged attacks vs prone have disadvantage',
      'Can stand as half move',
    ],
  },

  restrained: {
    description: 'Restrained. Speed 0. Attacks have advantage. Auto-fail DEX saves.',
    getModifiers: (participant, rollType) => {
      if (rollType === 'defense') {
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: 'Restrained - Disadvantage on defense',
        };
      } else if (rollType === 'dexterity_save') {
        return {
          advantage: false,
          disadvantage: false,
          bonus: 0,
          autoFail: true,
          description: 'Restrained - Auto-fail DEX saves',
        };
      }
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: '',
      };
    },
    onApply: (participant, condition) => {
      return {
        ...participant,
        movementUsed: participant.speed, // Speed = 0
        conditions: [...participant.conditions, condition],
      };
    },
    effect: ['Speed becomes 0', 'Attacks have advantage vs restrained', 'Auto-fail DEX saves'],
  },

  stunned: {
    description: 'Dazed and disoriented. Cannot take actions. Auto-fails DEX and STR saves.',
    getModifiers: (participant, rollType) => {
      const dexAndStrSaves = rollType === 'dexterity_save' || rollType === 'strength_save';
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: dexAndStrSaves,
        description: dexAndStrSaves
          ? 'Stunned - Auto-fail DEX/STR saves'
          : 'Stunned - Cannot take actions',
      };
    },
    effect: [
      'Cannot take actions',
      'Auto-fail DEX and STR saves',
      'Cannot move',
      'Ignores effects that require attention',
    ],
  },

  unconscious: {
    description: 'Unconscious and unable to act. Defenseless.',
    getModifiers: (participant, rollType) => {
      if (rollType === 'defense') {
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: 'Unconscious - Auto-fail saves, critical hits automatically hit',
        };
      }
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: true, // Cannot take most actions
        description: 'Unconscious - Cannot act',
      };
    },
    effect: [
      'Unconscious and unaware',
      'Auto-fail saves',
      'Critical hits automatically hit',
      'Cannot take actions',
    ],
  },

  exhaustion: {
    description: 'Exhausted from pushing beyond normal limits. Effects increase with level (1-6).',
    getModifiers: (participant, rollType) => {
      const exhaustionLevel =
        participant.conditions.find((c) => c.name === 'exhaustion')?.level || 0;

      // Level 3 or higher gives disadvantage on attacks and saves
      if (exhaustionLevel >= 3 && (rollType === 'attack' || rollType === 'save')) {
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: `Exhaustion level ${exhaustionLevel} - Disadvantage on attacks and saves`,
        };
      }

      // Level 1 or higher gives disadvantage on ability checks
      if (exhaustionLevel >= 1 && rollType === 'ability_check') {
        return {
          advantage: false,
          disadvantage: true,
          bonus: 0,
          autoFail: false,
          description: `Exhaustion level ${exhaustionLevel} - Disadvantage on ability checks`,
        };
      }

      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: '',
      };
    },
    // Exhaustion doesn't have special onApply effects like speed reduction
    // These are handled by external calculations
    effect: [
      'Level 1+: Disadvantage on ability checks',
      'Level 3+: Disadvantage on attacks and saves',
      'Level 2+: Speed halved',
      'Level 4+: Hit point max halved',
      'Level 5+: Speed reduced to 0',
      'Level 6+: Death',
    ],
  },

  surprised: {
    description: 'Caught unawares. Cannot take an action this turn.',
    getModifiers: (participant, rollType) => {
      // The main effect of surprise is already handled by turn logic
      // But we can add any remaining modifiers here
      return {
        advantage: false,
        disadvantage: false,
        bonus: 0,
        autoFail: false,
        description: 'Surprised - Cannot take actions this turn',
      };
    },
    effect: [
      "Can't take an action on first turn",
      'Attacks against surprised creatures have advantage',
    ],
  },
};

// ===========================
// Main Function: Get Condition Modifiers
// ===========================

/**
 * Gets the cumulative modifiers from all active conditions on a participant
 *
 * @param participant - The participant with conditions
 * @param rollType - Type of roll: 'attack', 'save', 'defense', 'ability_check', etc.
 * @param target - Optional target for attacks
 * @returns Combined modifiers from all conditions
 */
export function getConditionModifiers(
  participant: CombatParticipant,
  rollType: string,
  target?: CombatParticipant,
): ConditionModifiers {
  const allConditions = participant.conditions;
  const cumulativeModifiers: ConditionModifiers = {
    advantage: false,
    disadvantage: false,
    bonus: 0,
    autoFail: false,
    description: '',
  };

  const descriptions: string[] = [];

  for (const condition of allConditions) {
    if (!CONDITION_EFFECTS[condition.name]) continue;

    const conditionDef = CONDITION_EFFECTS[condition.name];
    const modifiers = conditionDef.getModifiers(participant, rollType, target);

    // Combine modifiers (advantage/disadvantage cancel each other)
    if (modifiers.advantage) cumulativeModifiers.advantage = true;
    if (modifiers.disadvantage) cumulativeModifiers.disadvantage = true;

    cumulativeModifiers.bonus += modifiers.bonus;
    if (modifiers.autoFail) cumulativeModifiers.autoFail = true;

    if (modifiers.description) {
      descriptions.push(modifiers.description);
    }
  }

  cumulativeModifiers.description = descriptions.join('; ');

  return cumulativeModifiers;
}

// ===========================
// Condition Application/Removal Functions
// ===========================

/**
 * Applies condition effects to a participant (called when condition is added)
 *
 * @param participant - Target participant
 * @param condition - Condition being applied
 * @returns Updated participant with effects applied
 */
export function applyConditionEffects(
  participant: CombatParticipant,
  condition: Condition,
): CombatParticipant {
  const conditionDef = CONDITION_EFFECTS[condition.name as ConditionName];
  if (!conditionDef?.onApply) {
    // If no specific apply logic, just return updated participant
    return {
      ...participant,
      conditions: [...participant.conditions, condition],
    };
  }

  return conditionDef.onApply(participant, condition);
}

/**
 * Removes condition effects from a participant (called when condition is removed)
 *
 * @param participant - Target participant
 * @param condition - Condition being removed
 * @returns Updated participant with effects removed
 */
export function removeConditionEffects(
  participant: CombatParticipant,
  condition: Condition,
): CombatParticipant {
  const conditionDef = CONDITION_EFFECTS[condition.name as ConditionName];
  if (!conditionDef?.onRemove) {
    // Remove condition from array
    return {
      ...participant,
      conditions: participant.conditions.filter((c) => c.name !== condition.name),
    };
  }

  return conditionDef.onRemove(participant, condition);
}

// ===========================
// Saving Throw Handling
// ===========================

/**
 * Handles saving throws for condition removal (call when condition needs save)
 *
 * @param participant - Participant making the save
 * @param condition - Condition requiring save
 * @param saveModifier - Additional modifier (e.g., from proficiency)
 * @returns {success: boolean, roll: DiceRoll}
 */
export function handleConditionSave(
  participant: CombatParticipant,
  condition: Condition,
  saveModifier: number = 0,
): { success: boolean; roll: DiceRoll } {
  // Most conditions use Constitution saves
  const totalModifier = saveModifier; // Simplified - would normally calculate based on CON modifier
  const rollResult = d20();
  const adjustedRoll = rollResult + totalModifier;

  const dc = condition.saveDC || 10; // Default DC if not specified
  const success = adjustedRoll >= dc;

  // Construct the DiceRoll object
  const finalRoll: DiceRoll = {
    dieType: 20,
    count: 1,
    modifier: totalModifier,
    results: [rollResult],
    keptResults: [rollResult],
    total: adjustedRoll,
    advantage: false,
    disadvantage: false,
    critical: rollResult === 20,
    naturalRoll: rollResult,
  };

  return { success, roll: finalRoll };
}

// ===========================
// Exhaustion Effects (Special Case)
// ===========================

/**
 * Gets exhaustion effects for a given level (1-6)
 *
 * @param level - Exhaustion level (1-6)
 * @returns Array of effects applied
 */
export function getExhaustionEffects(level: number): string[] {
  const exhaustionEffects: Record<number, string[]> = {
    1: ['Disadvantage on ability checks'],
    2: ['Speed halved'],
    3: ['Disadvantage on attack rolls and saving throws'],
    4: ['Hit points maximum halved'],
    5: ['Speed reduced to 0'],
    6: ['Death'],
  };

  const effects: string[] = [];
  for (let i = 1; i <= level; i++) {
    effects.push(...exhaustionEffects[i]);
  }

  return effects;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Gets condition description by name
 *
 * @param conditionName - Name of the condition
 * @returns Description string
 */
export function getConditionDescription(conditionName: ConditionName): string {
  return CONDITION_EFFECTS[conditionName]?.description || 'Unknown condition';
}

/**
 * Gets condition effect bullet points for UI display
 *
 * @param conditionName - Name of the condition
 * @returns Array of effect strings
 */
export function getConditionEffects(conditionName: ConditionName): string[] {
  return CONDITION_EFFECTS[conditionName]?.effect || [];
}

/**
 * Checks if a participant has a specific condition active
 *
 * @param participant - Participant to check
 * @param conditionName - Condition name to check for
 * @returns Boolean indicating presence
 */
export function hasCondition(
  participant: CombatParticipant,
  conditionName: ConditionName,
): boolean {
  return participant.conditions.some((c) => c.name === conditionName);
}

export { CONDITION_EFFECTS };
