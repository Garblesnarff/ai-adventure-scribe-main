import { RuleCondition } from '@/types/agent';

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
        console.warn(`Unknown condition type: ${condition.type}`);
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
    
    return requiredItems.every(item => equipment.includes(item));
  }

  private checkResourceRequirement(condition: RuleCondition): boolean {
    const { resource, minimum } = condition.data;
    const available = condition.context?.resources?.[resource] || 0;
    
    return available >= minimum;
  }
}