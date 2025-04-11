import { RuleRequirement } from '@/types/agent';

export class RuleRequirementChecker {
  async check(requirement: RuleRequirement): Promise<boolean> {
    if (!requirement) return true;

    switch (requirement.type) {
      case 'prerequisite':
        return this.checkPrerequisite(requirement);
      case 'proficiency':
        return this.checkProficiency(requirement);
      case 'spell_slot':
        return this.checkSpellSlot(requirement);
      case 'action_economy':
        return this.checkActionEconomy(requirement);
      case 'component':
        return this.checkComponent(requirement);
      default:
        console.warn(`Unknown requirement type: ${requirement.type}`);
        return true;
    }
  }

  private checkPrerequisite(requirement: RuleRequirement): boolean {
    const { prerequisites } = requirement.data;
    const character = requirement.context?.character;

    if (!character || !prerequisites) return false;

    return prerequisites.every(prereq => {
      switch (prereq.type) {
        case 'feature':
          return character.features?.includes(prereq.value);
        case 'spell':
          return character.spells?.includes(prereq.value);
        case 'proficiency':
          return character.proficiencies?.includes(prereq.value);
        default:
          return false;
      }
    });
  }

  private checkProficiency(requirement: RuleRequirement): boolean {
    const { requiredProficiencies } = requirement.data;
    const proficiencies = requirement.context?.character?.proficiencies || [];

    return requiredProficiencies.every(prof => proficiencies.includes(prof));
  }

  private checkSpellSlot(requirement: RuleRequirement): boolean {
    const { level, count } = requirement.data;
    const availableSlots = requirement.context?.spellSlots?.[level] || 0;

    return availableSlots >= count;
  }

  private checkActionEconomy(requirement: RuleRequirement): boolean {
    const { actionType, cost } = requirement.data;
    const availableActions = requirement.context?.actions?.[actionType] || 0;

    return availableActions >= cost;
  }

  private checkComponent(requirement: RuleRequirement): boolean {
    const { components } = requirement.data;
    const availableComponents = requirement.context?.components || [];

    return components.every(component => {
      if (component.type === 'material' && component.cost) {
        const hasComponent = availableComponents.find(c => 
          c.name === component.name && c.value >= component.cost
        );
        return !!hasComponent;
      }
      return availableComponents.some(c => c.name === component.name);
    });
  }
}