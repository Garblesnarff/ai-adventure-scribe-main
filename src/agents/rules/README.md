# Game Rules Engine Module

## Purpose

This directory contains the logic for interpreting, validating, and applying game rules. It supports the `RulesInterpreterAgent` and provides services to ensure game mechanics are respected.

## Structure and Important Files

- **`rules-interpreter-agent.ts`**: (Located one level up in `src/agents/`) The primary consumer of this module. This agent uses the services and utilities defined here to understand and enforce game rules.
- **`services/`**:
    - **`RuleEvaluationService.ts`**: Evaluates specific game rules based on the current game state and character actions. For example, determining if a character can perform a certain action based on their abilities or environmental conditions.
    - **`ValidationService.ts`**: Validates player actions or game events against the established ruleset.
    - **`ValidationResultsProcessor.ts`**: Processes the results from `ValidationService`, perhaps formatting them or determining consequences.
- **`utils/`**:
    - **`RuleConditionChecker.ts`**: Utility functions to check if specific conditions for a rule are met (e.g., character has required item, target is in range).
    - **`RuleRequirementChecker.ts`**: Utility functions to check if requirements for an action or rule are met (e.g., prerequisites for a spell, components for crafting).

## How Components Interact

- The `RulesInterpreterAgent` receives queries or actions to validate (e.g., from the `DungeonMasterAgent` via the messaging system).
- The agent uses `ValidationService.ts` to check the validity of the action/query.
- `ValidationService.ts` might use `RuleEvaluationService.ts` to assess specific rules and `RuleConditionChecker.ts` / `RuleRequirementChecker.ts` from the `utils/` directory to break down complex rule checks.
- `ValidationResultsProcessor.ts` takes the output of the validation and prepares a structured response.
- The `RulesInterpreterAgent` then communicates the outcome back to the requesting agent or system.

## Usage Example

```typescript
// Conceptual example from within the RulesInterpreterAgent or a related service:
import { ValidationService } from './services/ValidationService';
import { RuleEvaluationService } from './services/RuleEvaluationService';
// Assume 'actionToValidate' and 'currentGameState' are defined

const validationService = new ValidationService();
const evaluationService = new RuleEvaluationService(); // Might be used by ValidationService

// Example: Validating an action
const validationResult = await validationService.validateAction(actionToValidate, currentGameState);

if (validationResult.isValid) {
  // Proceed with action
} else {
  // Handle invalid action, possibly using ValidationResultsProcessor
  // const processedResult = new ValidationResultsProcessor().process(validationResult);
  // Send processedResult.feedback back to the player or DM.
}

// Example: Evaluating a specific rule
// const ruleDetails = await evaluationService.evaluateRule('grappling', currentGameState, { characterId: 'char1', targetId: 'npc2' });
```

## Notes

- This module is key to maintaining game integrity and automating parts of rule enforcement.
- The utilities in `utils/` should be designed to be granular and reusable for different rule types.
- Refer to `src/agents/rules-interpreter-agent.ts` and the main `/src/agents/README.md`.
