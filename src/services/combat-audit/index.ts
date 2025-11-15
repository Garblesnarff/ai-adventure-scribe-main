import { generateAuditReport } from './reporter';
import { validateAction } from './rules';

import type { CombatAction, RuleViolation, AuditReport } from './types';

import logger from '@/lib/logger';

/**
 * The main class for the Combat Audit System.
 * It orchestrates the process of recording actions, validating them against rules,
 * and generating audit reports.
 */
export class CombatAuditSystem {
  private static instance: CombatAuditSystem;
  private auditTrail: Map<string, CombatAction[]> = new Map();
  private violations: Map<string, RuleViolation[]> = new Map();
  private activeCombatAudits: Set<string> = new Set();

  public static getInstance(): CombatAuditSystem {
    if (!CombatAuditSystem.instance) {
      CombatAuditSystem.instance = new CombatAuditSystem();
    }
    return CombatAuditSystem.instance;
  }

  /**
   * Starts a new audit for a specific combat encounter.
   * @param combatId The unique identifier for the combat.
   */
  public startCombatAudit(combatId: string): void {
    this.activeCombatAudits.add(combatId);
    this.auditTrail.set(combatId, []);
    this.violations.set(combatId, []);
    logger.info(`📋 Combat audit started for ${combatId}`);
  }

  /**
   * Records a new combat action and triggers its validation.
   * @param action The combat action to record.
   * @returns The ID of the recorded action.
   */
  public recordAction(action: Omit<CombatAction, 'id' | 'timestamp'>): string {
    const actionWithId: CombatAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const actions = this.auditTrail.get(action.combatId) || [];
    actions.push(actionWithId);
    this.auditTrail.set(action.combatId, actions);

    const newViolations = validateAction(actionWithId, actions);
    if (newViolations.length > 0) {
      const allViolations = this.violations.get(action.combatId) || [];
      allViolations.push(...newViolations);
      this.violations.set(action.combatId, allViolations);
    }

    logger.info(`📝 Action recorded: ${actionWithId.actionType} by ${actionWithId.actorName}`);
    return actionWithId.id;
  }

  /**
   * Generates and returns a comprehensive audit report for a combat.
   * @param combatId The ID of the combat to report on.
   * @returns An AuditReport object.
   */
  public generateAuditReport(combatId: string): AuditReport {
    const actions = this.auditTrail.get(combatId) || [];
    const violations = this.violations.get(combatId) || [];
    const isCombatActive = this.activeCombatAudits.has(combatId);
    return generateAuditReport(combatId, actions, violations, isCombatActive);
  }

  /**
   * Ends the audit for a combat encounter and returns the final report.
   * @param combatId The ID of the combat to end.
   * @returns The final AuditReport.
   */
  public endCombatAudit(combatId: string): AuditReport {
    this.activeCombatAudits.delete(combatId);
    const report = this.generateAuditReport(combatId);
    logger.info(`📋 Combat audit completed for ${combatId}. Score: ${report.complianceScore}%`);
    return report;
  }

  public getViolations(combatId: string): RuleViolation[] {
    return this.violations.get(combatId) || [];
  }

  public getAuditTrail(combatId: string): CombatAction[] {
    return this.auditTrail.get(combatId) || [];
  }

  public clearAuditData(): void {
    this.auditTrail.clear();
    this.violations.clear();
    this.activeCombatAudits.clear();
  }
}

export const combatAuditSystem = CombatAuditSystem.getInstance();
