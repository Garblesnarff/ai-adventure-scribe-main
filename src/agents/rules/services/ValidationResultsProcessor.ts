/**
 * Validation Results Processor
 *
 * This file defines the ValidationResultsProcessor class, responsible for
 * processing the results of rule validations. It takes a set of validation
 * outcomes, evaluates them using the RuleEvaluationService, and aggregates
 * the findings into a structured summary that includes overall validity,
 * individual validation results, suggestions, and errors.
 *
 * Main Class:
 * - ValidationResultsProcessor: Processes and summarizes rule validation results.
 *
 * Key Dependencies:
 * - RuleEvaluationService (./rule-evaluation-service.ts)
 *
 * @author AI Dungeon Master Team
 */

// Project Services (assuming kebab-case filenames)
import { RuleEvaluationService } from './rule-evaluation-service';

export class ValidationResultsProcessor {
  private evaluationService: RuleEvaluationService;

  constructor() {
    this.evaluationService = new RuleEvaluationService();
  }

  async processResults(validationResults: any) {
    if (!validationResults) return null;

    const processedResults = {
      isValid: true,
      validations: [],
      suggestions: [],
      errors: [],
    };

    for (const validation of validationResults) {
      const result = await this.evaluationService.evaluateRule(validation);
      processedResults.validations.push(result);

      if (!result.isValid) {
        processedResults.isValid = false;
        processedResults.errors.push(result.error);
      }

      if (result.suggestions) {
        processedResults.suggestions.push(...result.suggestions);
      }
    }

    return processedResults;
  }
}
