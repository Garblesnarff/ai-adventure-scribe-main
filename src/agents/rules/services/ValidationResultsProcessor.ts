import { RuleEvaluationService } from './RuleEvaluationService';

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
      errors: []
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