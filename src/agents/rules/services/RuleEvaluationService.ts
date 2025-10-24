/**
 * Rule Evaluation Service
 * 
 * This file defines the RuleEvaluationService class, responsible for evaluating
 * game rules based on provided conditions and requirements. It utilizes helper
 * utilities (RuleConditionChecker, RuleRequirementChecker) to perform these checks.
 * 
 * Main Class:
 * - RuleEvaluationService: Evaluates game rules.
 * 
 * Key Dependencies:
 * - RuleConditionChecker (../utils/RuleConditionChecker.ts)
 * - RuleRequirementChecker (../utils/RuleRequirementChecker.ts)
 * 
 * @author AI Dungeon Master Team
 */

// Project Utilities
import { RuleConditionChecker } from '../utils/RuleConditionChecker';
import { RuleRequirementChecker } from '../utils/RuleRequirementChecker';


export class RuleEvaluationService {
  private conditionChecker: RuleConditionChecker;
  private requirementChecker: RuleRequirementChecker;

  constructor() {
    this.conditionChecker = new RuleConditionChecker();
    this.requirementChecker = new RuleRequirementChecker();
  }

  async evaluateRule(rule: any) {
    const result = {
      isValid: true,
      error: null,
      suggestions: []
    };

    try {
      if (rule.rule_conditions) {
        for (const condition of rule.rule_conditions) {
          const conditionMet = await this.conditionChecker.check(condition);
          if (!conditionMet) {
            result.isValid = false;
            result.error = `Failed condition: ${condition.description}`;
            result.suggestions.push(condition.suggestion);
          }
        }
      }

      if (rule.rule_requirements) {
        for (const requirement of rule.rule_requirements) {
          const requirementMet = await this.requirementChecker.check(requirement);
          if (!requirementMet) {
            result.isValid = false;
            result.error = `Missing requirement: ${requirement.description}`;
            result.suggestions.push(requirement.suggestion);
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.error = `Rule evaluation error: ${error.message}`;
    }

    return result;
  }
}