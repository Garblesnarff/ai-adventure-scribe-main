/**
 * Combat Audit System
 * Tracks all combat actions and validates D&D 5e rule compliance
 * Provides detailed feedback and correction suggestions
 */

export interface CombatAction {
  id: string;
  combatId: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actionType: 'initiative' | 'attack_roll' | 'damage_roll' | 'save' | 'skill_check' | 'spell_cast' | 'movement';
  phase: 'pre-combat' | 'initiative' | 'turn' | 'reaction' | 'post-combat';
  data: {
    formula?: string;
    result?: number;
    target?: string;
    targetAC?: number;
    dc?: number;
    success?: boolean;
    critical?: boolean;
    description: string;
  };
}

export interface RuleViolation {
  id: string;
  combatId: string;
  timestamp: number;
  violationType:
    | 'missing_initiative'
    | 'attack_without_roll'
    | 'damage_without_attack'
    | 'missing_ac'
    | 'missing_dc'
    | 'wrong_turn_order'
    | 'duplicate_action'
    | 'invalid_action_economy'
    | 'missing_modifiers'
    | 'invalid_formula';
  severity: 'critical' | 'high' | 'medium' | 'low';
  actionId?: string;
  description: string;
  suggestion: string;
  ruleReference: string;
  autoFixable: boolean;
}

export interface AuditReport {
  combatId: string;
  startTime: number;
  endTime?: number;
  totalActions: number;
  violations: RuleViolation[];
  complianceScore: number; // 0-100%
  recommendations: string[];
  summary: {
    initiativeCompliance: boolean;
    attackSequenceCompliance: boolean;
    turnOrderCompliance: boolean;
    actionEconomyCompliance: boolean;
    formulaCompliance: boolean;
  };
}

export class CombatAuditSystem {
  private static instance: CombatAuditSystem;
  private auditTrail: Map<string, CombatAction[]> = new Map();
  private violations: Map<string, RuleViolation[]> = new Map();
  private activeCombatAudits: Set<string> = new Set();

  static getInstance(): CombatAuditSystem {
    if (!CombatAuditSystem.instance) {
      CombatAuditSystem.instance = new CombatAuditSystem();
    }
    return CombatAuditSystem.instance;
  }

  /**
   * Start auditing a combat encounter
   */
  startCombatAudit(combatId: string): void {
    this.activeCombatAudits.add(combatId);
    this.auditTrail.set(combatId, []);
    this.violations.set(combatId, []);

    console.log(`📋 Combat audit started for ${combatId}`);
  }

  /**
   * Record a combat action for audit
   */
  recordAction(action: Omit<CombatAction, 'id' | 'timestamp'>): string {
    const actionWithId: CombatAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const actions = this.auditTrail.get(action.combatId) || [];
    actions.push(actionWithId);
    this.auditTrail.set(action.combatId, actions);

    // Validate the action against D&D 5e rules
    this.validateAction(actionWithId);

    console.log(`📝 Action recorded: ${actionWithId.actionType} by ${actionWithId.actorName}`);
    return actionWithId.id;
  }

  /**
   * Validate an action against D&D 5e rules
   */
  private validateAction(action: CombatAction): void {
    const combatActions = this.auditTrail.get(action.combatId) || [];
    const violations = this.violations.get(action.combatId) || [];

    // Rule 1: Initiative must be rolled before any other actions
    if (action.actionType !== 'initiative' && action.phase !== 'pre-combat') {
      const hasInitiative = combatActions.some(a => a.actionType === 'initiative');
      if (!hasInitiative) {
        violations.push(this.createViolation(
          action.combatId,
          'missing_initiative',
          'critical',
          'Combat actions attempted without rolling initiative first',
          'Roll initiative (1d20+dex modifier) before any combat actions',
          'PHB p.189 - Initiative determines turn order',
          true,
          action.id
        ));
      }
    }

    // Rule 2: Damage rolls must follow successful attack rolls
    if (action.actionType === 'damage_roll') {
      const recentAttack = this.findRecentAttackRoll(combatActions, action.actorId);
      if (!recentAttack) {
        violations.push(this.createViolation(
          action.combatId,
          'damage_without_attack',
          'critical',
          'Damage roll attempted without a preceding attack roll',
          'Make an attack roll (1d20+attack bonus) first, then roll damage if hit',
          'PHB p.194 - Attack rolls determine if damage is dealt',
          true,
          action.id
        ));
      } else if (!recentAttack.data.success) {
        violations.push(this.createViolation(
          action.combatId,
          'damage_without_attack',
          'high',
          'Damage roll attempted after a missed attack',
          'Only roll damage when attack hits (meets or exceeds AC)',
          'PHB p.194 - Damage is only dealt on successful attacks',
          true,
          action.id
        ));
      }
    }

    // Rule 3: Attack rolls must include AC target
    if (action.actionType === 'attack_roll' && !action.data.targetAC) {
      violations.push(this.createViolation(
        action.combatId,
        'missing_ac',
        'high',
        'Attack roll made without specifying target AC',
        'Include target AC: "Make an attack roll (1d20+bonus) against AC [number]"',
        'PHB p.194 - Attack rolls are compared against AC',
        true,
        action.id
      ));
    }

    // Rule 4: Saving throws must include DC
    if (action.actionType === 'save' && !action.data.dc) {
      violations.push(this.createViolation(
        action.combatId,
        'missing_dc',
        'high',
        'Saving throw requested without specifying DC',
        'Include DC: "Make a [ability] save (1d20+modifier, DC [number])"',
        'PHB p.174 - Saving throws are made against a DC',
        true,
        action.id
      ));
    }

    // Rule 5: Formula validation for dice expressions
    if (action.data.formula && !this.isValidDiceFormula(action.data.formula)) {
      violations.push(this.createViolation(
        action.combatId,
        'invalid_formula',
        'medium',
        `Invalid dice formula: ${action.data.formula}`,
        'Use valid D&D dice notation: 1d20+5, 2d6+3, etc.',
        'PHB p.7 - Dice notation standards',
        true,
        action.id
      ));
    }

    // Rule 6: Check for missing modifiers in formulas
    if (action.data.formula && this.isMissingModifiers(action.data.formula, action.actionType)) {
      violations.push(this.createViolation(
        action.combatId,
        'missing_modifiers',
        'medium',
        'Dice roll appears to be missing ability or proficiency modifiers',
        'Include appropriate modifiers: attack rolls need ability+proficiency, damage needs ability modifier',
        'PHB p.194 - Attack and damage roll modifiers',
        true,
        action.id
      ));
    }

    this.violations.set(action.combatId, violations);
  }

  /**
   * Find the most recent attack roll by an actor
   */
  private findRecentAttackRoll(actions: CombatAction[], actorId: string): CombatAction | null {
    const recentActions = actions
      .filter(a => a.actorId === actorId && a.actionType === 'attack_roll')
      .sort((a, b) => b.timestamp - a.timestamp);

    return recentActions[0] || null;
  }

  /**
   * Validate dice formula format
   */
  private isValidDiceFormula(formula: string): boolean {
    // Match patterns like: 1d20+5, 2d6+3, 1d8-1, 3d4, etc.
    const dicePattern = /^(\d+d\d+)([+-]\d+)?$/i;
    const multipleDicePattern = /^(\d+d\d+([+-]\d+)?)([\s]*[\+][\s]*\d+d\d+([+-]\d+)?)*$/i;

    return dicePattern.test(formula.trim()) || multipleDicePattern.test(formula.trim());
  }

  /**
   * Check if formula is missing expected modifiers
   */
  private isMissingModifiers(formula: string, actionType: string): boolean {
    const hasModifier = /[+-]\d+/.test(formula);

    // Attack rolls and damage rolls should typically have modifiers
    if (actionType === 'attack_roll' || actionType === 'damage_roll') {
      return !hasModifier;
    }

    return false;
  }

  /**
   * Create a rule violation record
   */
  private createViolation(
    combatId: string,
    violationType: RuleViolation['violationType'],
    severity: RuleViolation['severity'],
    description: string,
    suggestion: string,
    ruleReference: string,
    autoFixable: boolean,
    actionId?: string
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
      autoFixable
    };
  }

  /**
   * Generate a comprehensive audit report
   */
  generateAuditReport(combatId: string): AuditReport {
    const actions = this.auditTrail.get(combatId) || [];
    const violations = this.violations.get(combatId) || [];

    const startTime = actions.length > 0 ? Math.min(...actions.map(a => a.timestamp)) : Date.now();
    const endTime = this.activeCombatAudits.has(combatId) ? undefined : Math.max(...actions.map(a => a.timestamp));

    // Calculate compliance score
    const totalActions = actions.length;
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;
    const mediumViolations = violations.filter(v => v.severity === 'medium').length;

    // Weighted scoring: critical = -20, high = -10, medium = -5, low = -2
    const penaltyScore = (criticalViolations * 20) + (highViolations * 10) + (mediumViolations * 5) + (violations.length - criticalViolations - highViolations - mediumViolations) * 2;
    const complianceScore = Math.max(0, Math.min(100, 100 - (penaltyScore / Math.max(totalActions, 1)) * 10));

    // Analyze specific compliance areas
    const summary = {
      initiativeCompliance: !violations.some(v => v.violationType === 'missing_initiative'),
      attackSequenceCompliance: !violations.some(v => v.violationType === 'damage_without_attack'),
      turnOrderCompliance: !violations.some(v => v.violationType === 'wrong_turn_order'),
      actionEconomyCompliance: !violations.some(v => v.violationType === 'invalid_action_economy'),
      formulaCompliance: !violations.some(v => v.violationType === 'invalid_formula' || v.violationType === 'missing_modifiers')
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, summary);

    return {
      combatId,
      startTime,
      endTime,
      totalActions,
      violations,
      complianceScore,
      recommendations,
      summary
    };
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: RuleViolation[], summary: AuditReport['summary']): string[] {
    const recommendations: string[] = [];

    if (!summary.initiativeCompliance) {
      recommendations.push('🎲 Always start combat with initiative rolls (1d20+dex modifier) for all participants');
    }

    if (!summary.attackSequenceCompliance) {
      recommendations.push('⚔️ Follow proper attack sequence: Attack roll → Hit confirmation → Damage roll');
    }

    if (!summary.formulaCompliance) {
      recommendations.push('🎯 Include modifiers in dice formulas: 1d20+5 (not just 1d20), 1d8+3 (not just 1d8)');
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push('🚨 Address critical rule violations first - these break core D&D 5e mechanics');
    }

    const acViolations = violations.filter(v => v.violationType === 'missing_ac');
    if (acViolations.length > 0) {
      recommendations.push('🛡️ Always specify target AC when requesting attack rolls');
    }

    const dcViolations = violations.filter(v => v.violationType === 'missing_dc');
    if (dcViolations.length > 0) {
      recommendations.push('🎲 Always specify DC when requesting saving throws or skill checks');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Excellent D&D 5e rule compliance! Keep following proper combat mechanics.');
    }

    return recommendations;
  }

  /**
   * Get violations for a specific combat
   */
  getViolations(combatId: string): RuleViolation[] {
    return this.violations.get(combatId) || [];
  }

  /**
   * Get critical violations that need immediate attention
   */
  getCriticalViolations(combatId: string): RuleViolation[] {
    const violations = this.violations.get(combatId) || [];
    return violations.filter(v => v.severity === 'critical');
  }

  /**
   * End combat audit and generate final report
   */
  endCombatAudit(combatId: string): AuditReport {
    this.activeCombatAudits.delete(combatId);
    const report = this.generateAuditReport(combatId);

    console.log(`📋 Combat audit completed for ${combatId}`);
    console.log(`📊 Compliance score: ${report.complianceScore}%`);
    console.log(`⚠️ Total violations: ${report.violations.length}`);

    return report;
  }

  /**
   * Clear audit data for testing
   */
  clearAuditData(): void {
    this.auditTrail.clear();
    this.violations.clear();
    this.activeCombatAudits.clear();
  }

  /**
   * Get audit trail for debugging
   */
  getAuditTrail(combatId: string): CombatAction[] {
    return this.auditTrail.get(combatId) || [];
  }
}

// Export singleton instance
export const combatAuditSystem = CombatAuditSystem.getInstance();