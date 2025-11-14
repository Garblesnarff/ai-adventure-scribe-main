/**
 * Type definitions for the Combat Audit System.
 * These interfaces define the core data structures used for tracking
 * and validating combat actions and rule violations.
 */

export interface CombatAction {
  id: string;
  combatId: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actionType:
    | 'initiative'
    | 'attack_roll'
    | 'damage_roll'
    | 'save'
    | 'skill_check'
    | 'spell_cast'
    | 'movement';
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
