import type { CombatAction, RuleViolation } from './types';

/**
 * Finds the most recent attack roll by a specific actor in a list of actions.
 * @param actions The list of combat actions to search through.
 * @param actorId The ID of the actor who made the attack.
 * @returns The most recent attack roll action, or null if none is found.
 */
function findRecentAttackRoll(actions: CombatAction[], actorId: string): CombatAction | null {
  const recentActions = actions
    .filter((a) => a.actorId === actorId && a.actionType === 'attack_roll')
    .sort((a, b) => b.timestamp - a.timestamp);
  return recentActions[0] || null;
}

/**
 * Validates a dice formula string to ensure it follows standard D&D notation.
 * @param formula The dice formula string (e.g., "1d20+5").
 * @returns True if the formula is valid, false otherwise.
 */
function isValidDiceFormula(formula: string): boolean {
  const dicePattern = /^(\d+d\d+)([+-]\d+)?$/i;
  const multipleDicePattern = /^(\d+d\d+([+-]\d+)?)(\s*\+\s*\d+d\d+([+-]\d+)?)*$/i;
  return dicePattern.test(formula.trim()) || multipleDicePattern.test(formula.trim());
}

/**
 * Checks if a dice formula is missing expected modifiers based on the action type.
 * @param formula The dice formula string.
 * @param actionType The type of combat action.
 * @returns True if modifiers are likely missing, false otherwise.
 */
function isMissingModifiers(formula: string, actionType: string): boolean {
  const hasModifier = /[+-]\d+/.test(formula);
  if (actionType === 'attack_roll' || actionType === 'damage_roll') {
    return !hasModifier;
  }
  return false;
}

/**
 * Creates a new RuleViolation object.
 * @param combatId The ID of the combat encounter.
 * @param violationType The type of rule violation.
 * @param severity The severity of the violation.
 * @param description A description of the violation.
 * @param suggestion A suggestion for how to correct the violation.
 * @param ruleReference A reference to the rule in the Player's Handbook.
 * @param autoFixable Whether the violation can be automatically fixed.
 * @param actionId The ID of the action that caused the violation.
 * @returns A new RuleViolation object.
 */
function createViolation(
  combatId: string,
  violationType: RuleViolation['violationType'],
  severity: RuleViolation['severity'],
  description: string,
  suggestion: string,
  ruleReference: string,
  autoFixable: boolean,
  actionId?: string,
): RuleViolation {
  return {
    id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    combatId,
    timestamp: Date.now(),
    violationType,
    severity,
    actionId,
    description,
    suggestion,
    ruleReference,
    autoFixable,
  };
}

/**
 * Validates a single combat action against a set of D&D 5e rules.
 * @param action The combat action to validate.
 * @param allActions The full history of actions in the combat encounter.
 * @returns An array of any rule violations found for this action.
 */
export function validateAction(action: CombatAction, allActions: CombatAction[]): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Rule 1: Initiative must be rolled before other actions.
  if (action.actionType !== 'initiative' && action.phase !== 'pre-combat') {
    const hasInitiative = allActions.some((a) => a.actionType === 'initiative');
    if (!hasInitiative) {
      violations.push(
        createViolation(
          action.combatId,
          'missing_initiative',
          'critical',
          'Combat actions attempted without rolling initiative first.',
          'Roll initiative (1d20+dex modifier) for all participants before combat begins.',
          'PHB p.189 - Initiative',
          true,
          action.id,
        ),
      );
    }
  }

  // Rule 2: Damage rolls must follow a successful attack.
  if (action.actionType === 'damage_roll') {
    const recentAttack = findRecentAttackRoll(allActions, action.actorId);
    if (!recentAttack || !recentAttack.data.success) {
      violations.push(
        createViolation(
          action.combatId,
          'damage_without_attack',
          'critical',
          'Damage was rolled without a preceding successful attack.',
          'Ensure an attack roll hits before rolling for damage.',
          'PHB p.196 - Making an Attack',
          true,
          action.id,
        ),
      );
    }
  }

  // Rule 3: Attack rolls must specify the target's AC.
  if (action.actionType === 'attack_roll' && !action.data.targetAC) {
    violations.push(
      createViolation(
        action.combatId,
        'missing_ac',
        'high',
        'Attack roll made without specifying target AC.',
        "Provide the target's Armor Class for the attack roll.",
        'PHB p.194 - Armor Class',
        true,
        action.id,
      ),
    );
  }

  // Rule 4: Saving throws must specify a DC.
  if (action.actionType === 'save' && !action.data.dc) {
    violations.push(
      createViolation(
        action.combatId,
        'missing_dc',
        'high',
        'Saving throw made without a specified DC.',
        'Provide the Difficulty Class for the saving throw.',
        'PHB p.174 - Saving Throws',
        true,
        action.id,
      ),
    );
  }

  // Rule 5: Validate dice formula notation.
  if (action.data.formula && !isValidDiceFormula(action.data.formula)) {
    violations.push(
      createViolation(
        action.combatId,
        'invalid_formula',
        'medium',
        `Invalid dice formula used: "${action.data.formula}".`,
        'Use standard D&D dice notation (e.g., "1d20+5", "2d6+3").',
        'PHB p.6 - Dice',
        true,
        action.id,
      ),
    );
  }

  // Rule 6: Check for missing modifiers.
  if (action.data.formula && isMissingModifiers(action.data.formula, action.actionType)) {
    violations.push(
      createViolation(
        action.combatId,
        'missing_modifiers',
        'medium',
        'Dice roll may be missing ability or proficiency modifiers.',
        'Ensure formulas include relevant bonuses (e.g., "1d20+5" instead of "1d20").',
        'PHB p.173 - Modifiers',
        true,
        action.id,
      ),
    );
  }

  return violations;
}
