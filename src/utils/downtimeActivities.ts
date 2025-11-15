/**
 * Downtime Activity Utilities for D&D 5e
 *
 * Functions for handling downtime activities, rolls, and outcomes
 */

import type { Character } from '@/types/character';
import type {
  DowntimeActivity,
  DowntimeOutcome,
  DowntimeActivityType,
  DowntimeResult,
} from '@/types/downtimeActivities';

import { rollDice } from '@/utils/diceUtils';

/**
 * Check if a character meets the prerequisites for a downtime activity
 */
export function checkDowntimePrerequisites(
  character: Character,
  activity: DowntimeActivity,
): { canPerform: boolean; reason?: string } {
  // Check level requirement
  if (activity.levelRequirement && character.level && character.level < activity.levelRequirement) {
    return {
      canPerform: false,
      reason: `Requires level ${activity.levelRequirement}`,
    };
  }

  // Check class requirement
  if (activity.classRequirement && character.class?.name !== activity.classRequirement) {
    return {
      canPerform: false,
      reason: `Requires ${activity.classRequirement} class`,
    };
  }

  // Check gold cost
  if (activity.goldCost && character.gold && character.gold < activity.goldCost) {
    return {
      canPerform: false,
      reason: `Requires ${activity.goldCost} gold`,
    };
  }

  // Check tool requirements
  if (activity.toolRequirements && activity.toolRequirements.length > 0) {
    const hasTools = activity.toolRequirements.every((tool) =>
      character.inventory?.some(
        (item) => item.itemId.toLowerCase().includes(tool.toLowerCase()) && item.equipped,
      ),
    );

    if (!hasTools) {
      return {
        canPerform: false,
        reason: `Requires tools: ${activity.toolRequirements.join(', ')}`,
      };
    }
  }

  // Check skill requirements
  if (activity.skillRequirements && activity.skillRequirements.length > 0) {
    const hasSkills = activity.skillRequirements.every((skill) =>
      character.skillProficiencies?.includes(skill),
    );

    if (!hasSkills) {
      return {
        canPerform: false,
        reason: `Requires skills: ${activity.skillRequirements.join(', ')}`,
      };
    }
  }

  return { canPerform: true };
}

/**
 * Perform a downtime activity and calculate the outcome
 */
export function performDowntimeActivity(
  character: Character,
  activity: DowntimeActivity,
): DowntimeResult {
  // Check prerequisites first
  const prereqCheck = checkDowntimePrerequisites(character, activity);
  if (!prereqCheck.canPerform) {
    return {
      success: false,
      activityCompleted: false,
      message: `Cannot perform activity: ${prereqCheck.reason}`,
      goldSpent: 0,
      materialsUsed: 0,
      daysSpent: 0,
    };
  }

  // Spend resources
  const updatedCharacter = { ...character };

  // Deduct gold
  if (activity.goldCost && updatedCharacter.gold) {
    updatedCharacter.gold -= activity.goldCost;
  }

  // Deduct materials
  if (activity.materialCost && updatedCharacter.gold) {
    // Using gold field for materials as well
    updatedCharacter.gold -= activity.materialCost;
  }

  // Deduct days
  // In a real implementation, we would track days in the character data

  // If no success DC, automatically succeed
  if (!activity.successDC) {
    return {
      success: true,
      activityCompleted: true,
      message: `Successfully completed ${activity.name}`,
      goldSpent: activity.goldCost || 0,
      materialsUsed: activity.materialCost || 0,
      daysSpent: activity.daysRequired,
      outcome: activity.outcomes.find((outcome) => outcome.type === 'success'),
    };
  }

  // Roll for success
  const abilityModifier = getRelevantAbilityModifier(character, activity.type);
  const rollResult = rollDice(20, 1, abilityModifier);
  const success = rollResult.total >= activity.successDC;

  // Find appropriate outcome
  let outcome: DowntimeOutcome | undefined;

  if (success) {
    outcome = activity.outcomes.find((outcome) => outcome.type === 'success');
  } else {
    // Find failure outcome
    outcome = activity.outcomes.find((outcome) => outcome.type === 'failure');

    // If no specific failure outcome, use generic failure
    if (!outcome) {
      outcome = {
        type: 'failure',
        description: 'The activity fails without significant consequence.',
        goldRecovery: 0,
        experienceGained: 0,
      };
    }
  }

  // Apply outcome effects
  if (outcome) {
    // Add experience if specified
    if (outcome.experienceGained && updatedCharacter.experience) {
      updatedCharacter.experience += outcome.experienceGained;
    }

    // Recover some gold on failure if specified
    if (outcome.goldRecovery && updatedCharacter.gold) {
      updatedCharacter.gold += outcome.goldRecovery;
    }

    // Add items if specified
    if (outcome.itemsGained && updatedCharacter.inventory) {
      updatedCharacter.inventory = [...updatedCharacter.inventory, ...outcome.itemsGained];
    }
  }

  return {
    success,
    activityCompleted: true,
    message: success
      ? `Successfully completed ${activity.name}`
      : `Failed to complete ${activity.name}`,
    goldSpent: activity.goldCost || 0,
    materialsUsed: activity.materialCost || 0,
    daysSpent: activity.daysRequired,
    outcome,
    rollResult: rollResult.total,
    dc: activity.successDC,
  };
}

/**
 * Get the relevant ability modifier for a downtime activity type
 */
function getRelevantAbilityModifier(
  character: Character,
  activityType: DowntimeActivityType,
): number {
  if (!character.abilityScores) return 0;

  switch (activityType) {
    case 'crafting':
      return character.abilityScores.intelligence?.modifier || 0;
    case 'training':
      return character.abilityScores.intelligence?.modifier || 0;
    case 'research':
      return character.abilityScores.intelligence?.modifier || 0;
    case 'crime':
      return character.abilityScores.dexterity?.modifier || 0;
    case 'gambling':
      return character.abilityScores.charisma?.modifier || 0;
    case 'carousing':
      return character.abilityScores.charisma?.modifier || 0;
    case 'working':
      return Math.max(
        character.abilityScores.strength?.modifier || 0,
        character.abilityScores.dexterity?.modifier || 0,
      );
    default:
      return 0;
  }
}

/**
 * Calculate the cost of a downtime activity in gold pieces
 */
export function calculateDowntimeCost(activity: DowntimeActivity): number {
  return (activity.goldCost || 0) + (activity.materialCost || 0);
}

/**
 * Check if a character can afford a downtime activity
 */
export function canAffordDowntimeActivity(
  character: Character,
  activity: DowntimeActivity,
): boolean {
  const totalCost = calculateDowntimeCost(activity);
  return (character.gold || 0) >= totalCost;
}

/**
 * Get all available downtime activities for a character
 */
export function getAvailableDowntimeActivities(
  character: Character,
  activities: DowntimeActivity[],
): DowntimeActivity[] {
  return activities.filter(
    (activity) => checkDowntimePrerequisites(character, activity).canPerform,
  );
}

/**
 * Common downtime activities data
 */
export const commonDowntimeActivities: DowntimeActivity[] = [
  {
    id: 'scribing_spell',
    name: 'Scribe a Spell Scroll',
    type: 'scribing_spells',
    description: 'Copy a spell you know into a spell scroll.',
    daysRequired: 1,
    goldCost: 25, // Base cost, varies by spell level
    materialCost: 50, // Base cost, varies by spell level
    skillRequirements: ['Arcana'],
    levelRequirement: 1,
    classRequirement: 'Wizard',
    successDC: 10,
    outcomes: [
      {
        type: 'success',
        description: 'You successfully create a spell scroll.',
        itemsGained: [
          // This would be populated with the actual scroll item
        ],
      },
      {
        type: 'failure',
        description: 'The spell scroll is ruined and materials are wasted.',
        goldRecovery: 0,
      },
    ],
    repeatable: true,
    requiresSupplies: true,
  },
  {
    id: 'craft_item',
    name: 'Craft a Magic Item',
    type: 'crafting',
    description: 'Create a magic item using the crafting rules.',
    daysRequired: 10, // Varies by item
    goldCost: 100, // Base cost, varies by item
    materialCost: 500, // Base cost, varies by item
    toolRequirements: ["Smith's tools", "Alchemist's supplies"],
    skillRequirements: ['Arcana'],
    levelRequirement: 3,
    successDC: 15,
    outcomes: [
      {
        type: 'success',
        description: 'You successfully craft the magic item.',
        itemsGained: [
          // This would be populated with the actual item
        ],
        experienceGained: 250,
      },
      {
        type: 'failure',
        description: 'The crafting fails and half the materials are wasted.',
        goldRecovery: 0,
      },
    ],
    repeatable: true,
    requiresSupplies: true,
  },
  {
    id: 'train_skill',
    name: 'Train a Skill or Tool',
    type: 'training',
    description: 'Spend time training in a skill or tool proficiency.',
    daysRequired: 10,
    goldCost: 50,
    skillRequirements: [],
    successDC: 15,
    outcomes: [
      {
        type: 'success',
        description: 'You gain proficiency in the chosen skill or tool.',
        experienceGained: 100,
      },
      {
        type: 'failure',
        description: 'Your training is not successful, but you learn from the experience.',
        experienceGained: 25,
      },
    ],
    repeatable: false,
    requiresSupplies: true,
  },
  {
    id: 'research_lore',
    name: 'Research Lore',
    type: 'research',
    description: 'Spend time researching a specific topic or piece of lore.',
    daysRequired: 5,
    goldCost: 100,
    skillRequirements: ['Investigation', 'History'],
    successDC: 12,
    outcomes: [
      {
        type: 'success',
        description: 'You discover valuable information about your research topic.',
        experienceGained: 150,
      },
      {
        type: 'failure',
        description: 'Your research yields no new information.',
        experienceGained: 50,
      },
    ],
    repeatable: true,
    requiresSupplies: true,
  },
  {
    id: 'work_job',
    name: 'Work a Job',
    type: 'working',
    description: 'Perform a job or task to earn money.',
    daysRequired: 7,
    skillRequirements: [],
    successDC: 10,
    outcomes: [
      {
        type: 'success',
        description: 'You earn money from your work.',
        goldRecovery: 200,
      },
      {
        type: 'failure',
        description: 'You earn less than expected.',
        goldRecovery: 50,
      },
    ],
    repeatable: true,
    requiresSupplies: false,
  },
  {
    id: 'carouse',
    name: 'Carouse',
    type: 'carousing',
    description: 'Spend time socializing and networking.',
    daysRequired: 7,
    goldCost: 100,
    skillRequirements: ['Persuasion'],
    successDC: 12,
    outcomes: [
      {
        type: 'success',
        description: 'You make valuable social connections.',
        experienceGained: 75,
      },
      {
        type: 'failure',
        description: 'You spend money without making connections.',
        goldRecovery: 0,
      },
    ],
    repeatable: true,
    requiresSupplies: false,
  },
];
