import type { CombatAction, RuleViolation, AuditReport } from './types';

/**
 * Generates a list of actionable recommendations based on the violations found.
 * @param violations The list of rule violations.
 * @param summary The summary section of the audit report.
 * @returns An array of string recommendations.
 */
function generateRecommendations(
  violations: RuleViolation[],
  summary: AuditReport['summary'],
): string[] {
  const recommendations: string[] = [];

  if (!summary.initiativeCompliance) {
    recommendations.push(
      '🎲 Always start combat with initiative rolls (1d20+dex modifier) for all participants.',
    );
  }
  if (!summary.attackSequenceCompliance) {
    recommendations.push(
      '⚔️ Follow proper attack sequence: Attack roll → Hit confirmation → Damage roll.',
    );
  }
  if (!summary.formulaCompliance) {
    recommendations.push(
      '🎯 Include modifiers in dice formulas: "1d20+5" not "1d20", "1d8+3" not "1d8".',
    );
  }
  if (violations.some((v) => v.violationType === 'missing_ac')) {
    recommendations.push('🛡️ Always specify target AC when requesting attack rolls.');
  }
  if (violations.some((v) => v.violationType === 'missing_dc')) {
    recommendations.push('🎲 Always specify a DC for saving throws or skill checks.');
  }
  if (violations.some((v) => v.severity === 'critical')) {
    recommendations.push(
      '🚨 Address critical rule violations first, as they break core game mechanics.',
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('✅ Excellent D&D 5e rule compliance! No major issues found.');
  }

  return recommendations;
}

/**
 * Generates a comprehensive audit report for a combat encounter.
 * @param combatId The ID of the combat encounter.
 * @param actions The list of all actions taken in the combat.
 * @param violations The list of all rule violations found.
 * @param isCombatActive Whether the combat is still ongoing.
 * @returns A full AuditReport object.
 */
export function generateAuditReport(
  combatId: string,
  actions: CombatAction[],
  violations: RuleViolation[],
  isCombatActive: boolean,
): AuditReport {
  const startTime = actions.length > 0 ? Math.min(...actions.map((a) => a.timestamp)) : Date.now();
  const endTime = isCombatActive
    ? undefined
    : actions.length > 0
      ? Math.max(...actions.map((a) => a.timestamp))
      : Date.now();

  const totalActions = actions.length;
  const criticalViolations = violations.filter((v) => v.severity === 'critical').length;
  const highViolations = violations.filter((v) => v.severity === 'high').length;
  const mediumViolations = violations.filter((v) => v.severity === 'medium').length;

  const penaltyScore = criticalViolations * 20 + highViolations * 10 + mediumViolations * 5;
  const complianceScore = Math.max(0, 100 - penaltyScore);

  const summary: AuditReport['summary'] = {
    initiativeCompliance: !violations.some((v) => v.violationType === 'missing_initiative'),
    attackSequenceCompliance: !violations.some((v) => v.violationType === 'damage_without_attack'),
    turnOrderCompliance: !violations.some((v) => v.violationType === 'wrong_turn_order'),
    actionEconomyCompliance: !violations.some((v) => v.violationType === 'invalid_action_economy'),
    formulaCompliance: !violations.some(
      (v) => v.violationType === 'invalid_formula' || v.violationType === 'missing_modifiers',
    ),
  };

  const recommendations = generateRecommendations(violations, summary);

  return {
    combatId,
    startTime,
    endTime,
    totalActions,
    violations,
    complianceScore,
    recommendations,
    summary,
  };
}
