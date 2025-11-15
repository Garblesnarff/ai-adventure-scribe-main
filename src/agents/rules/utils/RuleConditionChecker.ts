/**
 * Rule Condition Checker Utility
 *
 * This file defines the RuleConditionChecker class, responsible for checking
 * various types of conditions related to game rules. It evaluates conditions
 * such as ability score requirements, class/race requirements, level requirements,
 * equipment, and resource availability based on a given context.
 *
 * Main Class:
 * - RuleConditionChecker: Checks if rule conditions are met.
 *
 * Key Dependencies:
 * - RuleCondition type (likely from `@/types/agent` or a more specific rule type definition).
 *
 * @author AI Dungeon Master Team
 */

// Project Types
import { RuleCondition } from '@/types/agent'; // Assuming RuleCondition is a defined type
import { logger } from '../../../lib/logger';

export class RuleConditionChecker {
  async check(condition: RuleCondition): Promise<boolean> {
    if (!condition) return true;

    switch (condition.type) {
      case 'ability_score':
        return this.checkAbilityScore(condition);
      case 'class_requirement':
        return this.checkClassRequirement(condition);
      case 'race_requirement':
        return this.checkRaceRequirement(condition);
      case 'level_requirement':
        return this.checkLevelRequirement(condition);
      case 'equipment_requirement':
        return this.checkEquipmentRequirement(condition);
      case 'resource_requirement':
        return this.checkResourceRequirement(condition);
      default:
        logger.warn(`Unknown condition type: ${condition.type}`);
        return true;
    }
  }

  private checkAbilityScore(condition: RuleCondition): boolean {
    const { ability, minimum, maximum } = condition.data;
    const score = condition.context?.abilityScores?.[ability]?.score;

    if (!score) return false;

    if (minimum && score < minimum) return false;
    if (maximum && score > maximum) return false;

    return true;
  }

  private checkClassRequirement(condition: RuleCondition): boolean {
    const { requiredClass } = condition.data;
    return condition.context?.class === requiredClass;
  }

  private checkRaceRequirement(condition: RuleCondition): boolean {
    const { requiredRace } = condition.data;
    return condition.context?.race === requiredRace;
  }

  private checkLevelRequirement(condition: RuleCondition): boolean {
    const { minimumLevel } = condition.data;
    const level = condition.context?.level || 1;
    return level >= minimumLevel;
  }

  private checkEquipmentRequirement(condition: RuleCondition): boolean {
    const { requiredItems } = condition.data;
    const equipment = condition.context?.equipment || [];

    return requiredItems.every((item) => equipment.includes(item));
  }

  private checkResourceRequirement(condition: RuleCondition): boolean {
    const { resource, minimum } = condition.data;
    const available = condition.context?.resources?.[resource] || 0;

    return available >= minimum;
  }
}
