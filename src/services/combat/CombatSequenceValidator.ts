/**
 * Combat Sequence Validator
 * Enforces proper D&D 5e combat mechanics and sequencing
 * Now integrated with CombatAuditSystem for rule compliance tracking
 */

import { combatAuditSystem } from './CombatAuditSystem';

import logger from '@/lib/logger';

export interface CombatPhase {
  phase: 'pre-combat' | 'initiative' | 'attack' | 'damage' | 'resolution';
  timestamp: number;
  actorId: string;
  context: string;
}

export interface CombatValidationError {
  type:
    | 'missing_initiative'
    | 'missing_attack_roll'
    | 'missing_damage_roll'
    | 'missing_ac'
    | 'missing_dc'
    | 'missing_modifier'
    | 'wrong_sequence';
  message: string;
  suggestion: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface CombatValidationResult {
  isValid: boolean;
  errors: CombatValidationError[];
  warnings: CombatValidationError[];
  requiredNextAction?: string;
  suggestedResponse?: string;
}

export interface InitiativeEntry {
  actorId: string;
  actorName: string;
  initiative: number;
  dexModifier: number;
  isPlayer: boolean;
  hasActed: boolean;
}

export interface TurnOrder {
  combatId: string;
  entries: InitiativeEntry[];
  currentTurnIndex: number;
  round: number;
  isInitiativeComplete: boolean;
}

export class CombatSequenceValidator {
  private static instance: CombatSequenceValidator;
  private combatPhases: Map<string, CombatPhase[]> = new Map();
  private activeCombats: Set<string> = new Set();
  private initiativeRolled: Set<string> = new Set();
  private pendingAttacks: Map<
    string,
    { weaponName: string; targetAC?: number; timestamp: number }
  > = new Map();
  private awaitingDamage: Map<
    string,
    { attackRollId: string; isCritical: boolean; weaponName: string }
  > = new Map();
  private turnOrders: Map<string, TurnOrder> = new Map();
  private initiativeEntries: Map<string, InitiativeEntry[]> = new Map();

  static getInstance(): CombatSequenceValidator {
    if (!CombatSequenceValidator.instance) {
      CombatSequenceValidator.instance = new CombatSequenceValidator();
    }
    return CombatSequenceValidator.instance;
  }

  /**
   * Mark the start of a new combat encounter
   */
  startCombat(combatId: string): void {
    this.activeCombats.add(combatId);
    this.combatPhases.set(combatId, []);
    this.initiativeRolled.delete(combatId);
    logger.info(`🗡️ Combat ${combatId} started - initiative required`);
  }

  /**
   * Add an initiative entry for an actor
   */
  addInitiativeEntry(
    combatId: string,
    actorId: string,
    actorName: string,
    initiative: number,
    dexModifier: number,
    isPlayer: boolean = true,
  ): void {
    // Mark combat as active when first initiative entry is added
    this.activeCombats.add(combatId);

    // Start audit for this combat if not already started
    if (!this.initiativeEntries.has(combatId)) {
      combatAuditSystem.startCombatAudit(combatId);
      this.initiativeEntries.set(combatId, []);
    }

    const entries = this.initiativeEntries.get(combatId)!;

    // Remove existing entry for this actor (in case of re-roll)
    const filteredEntries = entries.filter((e) => e.actorId !== actorId);

    filteredEntries.push({
      actorId,
      actorName,
      initiative,
      dexModifier,
      isPlayer,
      hasActed: false,
    });

    this.initiativeEntries.set(combatId, filteredEntries);
    this.addPhase(combatId, 'initiative', actorId, `Initiative: ${initiative}`);

    // Record initiative action for audit
    combatAuditSystem.recordAction({
      combatId,
      actorId,
      actorName,
      actionType: 'initiative',
      phase: 'initiative',
      data: {
        formula: `1d20+${dexModifier}`,
        result: initiative,
        description: `Initiative roll: ${initiative} (dex modifier: ${dexModifier > 0 ? '+' : ''}${dexModifier})`,
      },
    });

    logger.info(`🎲 Initiative recorded for ${actorName}: ${initiative}`);
  }

  /**
   * Mark initiative as rolled and complete the initiative phase
   */
  completeInitiativePhase(combatId: string): TurnOrder | null {
    const entries = this.initiativeEntries.get(combatId);
    if (!entries || entries.length === 0) {
      return null;
    }

    // Sort by initiative (highest first), use dex modifier as tiebreaker
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.initiative !== b.initiative) {
        return b.initiative - a.initiative; // Higher initiative goes first
      }
      return b.dexModifier - a.dexModifier; // Higher dex modifier wins ties
    });

    const turnOrder: TurnOrder = {
      combatId,
      entries: sortedEntries,
      currentTurnIndex: 0,
      round: 1,
      isInitiativeComplete: true,
    };

    this.turnOrders.set(combatId, turnOrder);
    this.initiativeRolled.add(combatId);
    logger.info(`⚔️ Turn order established for combat ${combatId}`);

    return turnOrder;
  }

  /**
   * Get current turn order for a combat
   */
  getTurnOrder(combatId: string): TurnOrder | null {
    return this.turnOrders.get(combatId) || null;
  }

  /**
   * Get whose turn it is currently
   */
  getCurrentActor(combatId: string): InitiativeEntry | null {
    const turnOrder = this.turnOrders.get(combatId);
    if (!turnOrder || !turnOrder.isInitiativeComplete) {
      return null;
    }

    return turnOrder.entries[turnOrder.currentTurnIndex] || null;
  }

  /**
   * Advance to the next turn
   */
  nextTurn(combatId: string): InitiativeEntry | null {
    const turnOrder = this.turnOrders.get(combatId);
    if (!turnOrder) return null;

    // Mark current actor as having acted
    if (turnOrder.entries[turnOrder.currentTurnIndex]) {
      turnOrder.entries[turnOrder.currentTurnIndex].hasActed = true;
    }

    // Move to next actor
    turnOrder.currentTurnIndex++;

    // If we've gone through everyone, start new round
    if (turnOrder.currentTurnIndex >= turnOrder.entries.length) {
      turnOrder.currentTurnIndex = 0;
      turnOrder.round++;

      // Reset hasActed for new round
      turnOrder.entries.forEach((entry) => (entry.hasActed = false));

      logger.info(`🔄 Round ${turnOrder.round} begins`);
    }

    const currentActor = turnOrder.entries[turnOrder.currentTurnIndex];
    logger.info(`👤 ${currentActor.actorName}'s turn (Round ${turnOrder.round})`);

    return currentActor;
  }

  /**
   * Get current turn order for a combat
   */
  getTurnOrder(combatId: string): TurnOrder | null {
    return this.turnOrders.get(combatId) || null;
  }

  /**
   * Check if all required initiative rolls are complete
   */
  isInitiativeComplete(combatId: string, expectedActors: string[]): boolean {
    const entries = this.initiativeEntries.get(combatId);
    if (!entries) return false;

    const rolledActors = new Set(entries.map((e) => e.actorId));
    return expectedActors.every((actorId) => rolledActors.has(actorId));
  }

  /**
   * Record an attack roll request
   */
  recordAttackRequest(
    combatId: string,
    actorId: string,
    weaponName: string,
    targetAC?: number,
  ): string {
    const attackId = `${combatId}_${actorId}_${Date.now()}`;
    this.pendingAttacks.set(attackId, { weaponName, targetAC, timestamp: Date.now() });
    this.addPhase(combatId, 'attack', actorId, `Attack with ${weaponName}`);
    logger.info(`⚔️ Attack request recorded: ${attackId}`);
    return attackId;
  }

  /**
   * Record an attack roll result
   */
  recordAttackResult(
    attackId: string,
    result: number,
    targetAC?: number,
    actorId?: string,
    actorName?: string,
  ): boolean {
    const attack = this.pendingAttacks.get(attackId);
    if (!attack) return false;

    const actualAC = targetAC || attack.targetAC;
    if (!actualAC) return false;

    const isHit = result >= actualAC;
    const isCritical = result === 20;

    if (isHit) {
      this.awaitingDamage.set(attackId, {
        attackRollId: attackId,
        isCritical,
        weaponName: attack.weaponName,
      });
    }

    // Record attack action for audit if we have actor info
    if (actorId && actorName) {
      const combatId = attackId.split('_')[0]; // Extract combat ID from attack ID
      combatAuditSystem.recordAction({
        combatId,
        actorId,
        actorName,
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+modifier', // Generic - would need character data for specifics
          result,
          targetAC: actualAC,
          success: isHit,
          critical: isCritical,
          description: `Attack with ${attack.weaponName}: ${result} vs AC ${actualAC} = ${isHit ? 'HIT' : 'MISS'}${isCritical ? ' (CRITICAL!)' : ''}`,
        },
      });
    }

    this.pendingAttacks.delete(attackId);
    logger.info(`🎯 Attack result: ${result} vs AC ${actualAC} = ${isHit ? 'HIT' : 'MISS'}`);
    return isHit;
  }

  /**
   * Record damage roll
   */
  recordDamageRoll(
    attackId: string,
    damage: number,
    formula?: string,
    actorId?: string,
    actorName?: string,
  ): void {
    const damageInfo = this.awaitingDamage.get(attackId);

    // Record damage action for audit if we have actor info
    if (actorId && actorName && damageInfo) {
      const combatId = attackId.split('_')[0]; // Extract combat ID from attack ID
      combatAuditSystem.recordAction({
        combatId,
        actorId,
        actorName,
        actionType: 'damage_roll',
        phase: 'turn',
        data: {
          formula: formula || 'dice+modifier',
          result: damage,
          critical: damageInfo.isCritical,
          description: `${damageInfo.isCritical ? 'Critical d' : 'D'}amage with ${damageInfo.weaponName}: ${damage}${formula ? ` (${formula})` : ''}`,
        },
      });
    }

    this.awaitingDamage.delete(attackId);
    logger.info(`💥 Damage recorded: ${damage} for attack ${attackId}`);
  }

  /**
   * Validate a DM response for combat rule compliance
   */
  validateDMResponse(response: string, combatId?: string): CombatValidationResult {
    const errors: CombatValidationError[] = [];
    const warnings: CombatValidationError[] = [];

    // Check for direct damage without attack roll
    if (this.detectsDirectDamage(response) && !this.hasPendingAttack(combatId)) {
      errors.push({
        type: 'missing_attack_roll',
        message: 'Damage roll requested without preceding attack roll',
        suggestion:
          'Request attack roll first: "Make an attack roll with your [weapon] (1d20+bonus) against AC [number]"',
        severity: 'critical',
      });
    }

    // Check for combat start without initiative
    if (this.detectsCombatStart(response) && combatId && !this.initiativeRolled.has(combatId)) {
      errors.push({
        type: 'missing_initiative',
        message: 'Combat started without initiative roll',
        suggestion:
          'Request initiative first: "Combat begins! Roll initiative (1d20+dex modifier)"',
        severity: 'critical',
      });
    }

    // Check for actions attempted before turn order is established
    if (combatId && this.activeCombats.has(combatId)) {
      const turnOrder = this.turnOrders.get(combatId);
      if (
        !turnOrder?.isInitiativeComplete &&
        (this.detectsAttackRequest(response) || this.detectsSkillCheck(response))
      ) {
        errors.push({
          type: 'wrong_sequence',
          message: 'Action attempted before initiative order is established',
          suggestion:
            'Complete initiative phase first: "Roll initiative (1d20+dex modifier) to determine turn order"',
          severity: 'critical',
        });
      }
    }

    // Check for attack without AC
    if (this.detectsAttackRequest(response) && !this.containsAC(response)) {
      errors.push({
        type: 'missing_ac',
        message: 'Attack roll requested without target AC',
        suggestion: 'Include target AC: "Make an attack roll against AC [number]"',
        severity: 'high',
      });
    }

    // Check for skill check without DC
    if (this.detectsSkillCheck(response) && !this.containsDC(response)) {
      errors.push({
        type: 'missing_dc',
        message: 'Skill check requested without DC',
        suggestion: 'Include DC: "Make a [skill] check (DC [number])"',
        severity: 'high',
      });
    }

    // Check for damage roll without modifier
    if (this.detectsDamageRequest(response) && !this.containsModifier(response)) {
      warnings.push({
        type: 'missing_modifier',
        message: 'Damage roll missing ability modifier',
        suggestion: 'Include modifier: "Roll 1d8+STR modifier" or "Roll 1d6+3"',
        severity: 'medium',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredNextAction: this.determineNextAction(combatId),
      suggestedResponse: this.generateSuggestedResponse(errors),
    };
  }

  /**
   * Get suggested correction for common errors
   */
  getSuggestion(response: string, combatId?: string): string | null {
    const validation = this.validateDMResponse(response, combatId);

    if (validation.errors.length > 0) {
      const primaryError = validation.errors[0];
      return primaryError.suggestion;
    }

    return null;
  }

  /**
   * Check if combat is awaiting damage roll
   */
  isAwaitingDamage(combatId?: string): boolean {
    if (!combatId) return this.awaitingDamage.size > 0;

    for (const [attackId] of this.awaitingDamage) {
      if (attackId.startsWith(combatId)) return true;
    }
    return false;
  }

  /**
   * Get awaiting damage info
   */
  getAwaitingDamage(combatId?: string): { weaponName: string; isCritical: boolean } | null {
    for (const [attackId, damage] of this.awaitingDamage) {
      if (!combatId || attackId.startsWith(combatId)) {
        return { weaponName: damage.weaponName, isCritical: damage.isCritical };
      }
    }
    return null;
  }

  // Private helper methods
  private addPhase(
    combatId: string,
    phase: CombatPhase['phase'],
    actorId: string,
    context: string,
  ): void {
    const phases = this.combatPhases.get(combatId) || [];
    phases.push({
      phase,
      timestamp: Date.now(),
      actorId,
      context,
    });
    this.combatPhases.set(combatId, phases);
  }

  private detectsDirectDamage(response: string): boolean {
    const damagePatterns = [
      /roll\s+\d*d\d+(?:\+\d+)?\s+(?:for\s+)?damage/gi,
      /roll\s+damage/gi,
      /\d*d\d+(?:\+\d+)?\s+damage/gi,
    ];
    return damagePatterns.some((pattern) => pattern.test(response));
  }

  private detectsCombatStart(response: string): boolean {
    const combatPatterns = [
      /combat\s+begins/gi,
      /initiative/gi,
      /roll\s+for\s+initiative/gi,
      /battle\s+starts/gi,
    ];
    return combatPatterns.some((pattern) => pattern.test(response));
  }

  private detectsAttackRequest(response: string): boolean {
    const attackPatterns = [
      /make\s+an?\s+attack\s+roll/gi,
      /roll\s+(?:to\s+)?attack/gi,
      /attack\s+roll/gi,
    ];
    return attackPatterns.some((pattern) => pattern.test(response));
  }

  private detectsSkillCheck(response: string): boolean {
    const skillPatterns = [/make\s+a\s+\w+\s+check/gi, /roll\s+a\s+\w+\s+check/gi, /\w+\s+check/gi];
    return skillPatterns.some((pattern) => pattern.test(response));
  }

  private detectsDamageRequest(response: string): boolean {
    return /roll.*damage/gi.test(response);
  }

  private containsAC(response: string): boolean {
    return /AC\s+\d+/gi.test(response) || /armor\s+class\s+\d+/gi.test(response);
  }

  private containsDC(response: string): boolean {
    return /DC\s+\d+/gi.test(response) || /difficulty\s+class\s+\d+/gi.test(response);
  }

  private containsModifier(response: string): boolean {
    return /\+\s*(?:str|dex|con|int|wis|cha|\d+)/gi.test(response);
  }

  private hasPendingAttack(combatId?: string): boolean {
    if (!combatId) return this.pendingAttacks.size > 0;

    for (const [attackId] of this.pendingAttacks) {
      if (attackId.startsWith(combatId)) return true;
    }
    return false;
  }

  private determineNextAction(combatId?: string): string | undefined {
    if (combatId && this.activeCombats.has(combatId)) {
      if (!this.initiativeRolled.has(combatId)) {
        return 'request_initiative';
      }
      if (this.isAwaitingDamage(combatId)) {
        return 'request_damage';
      }
    }
    return undefined;
  }

  private generateSuggestedResponse(errors: CombatValidationError[]): string | undefined {
    if (errors.length === 0) return undefined;

    const primaryError = errors[0];
    switch (primaryError.type) {
      case 'missing_attack_roll':
        return 'Make an attack roll with your weapon (1d20+attack bonus) against AC [number]';
      case 'missing_initiative':
        return 'Combat begins! Roll initiative (1d20+dex modifier)';
      case 'missing_ac':
        return 'Make an attack roll with your weapon (1d20+bonus) against AC [target number]';
      case 'missing_dc':
        return 'Make a [skill] check (1d20+modifier, DC [number])';
      default:
        return primaryError.suggestion;
    }
  }

  /**
   * Clear all state for testing
   */
  clearAllState(): void {
    this.combatPhases.clear();
    this.activeCombats.clear();
    this.initiativeRolled.clear();
    this.pendingAttacks.clear();
    this.awaitingDamage.clear();
    this.turnOrders.clear();
    this.initiativeEntries.clear();
    combatAuditSystem.clearAuditData();
  }

  /**
   * End combat and clean up state for a specific combat
   */
  endCombat(combatId: string): void {
    // Generate final audit report before cleanup
    const auditReport = combatAuditSystem.endCombatAudit(combatId);

    this.activeCombats.delete(combatId);
    this.initiativeRolled.delete(combatId);
    this.combatPhases.delete(combatId);
    this.turnOrders.delete(combatId);
    this.initiativeEntries.delete(combatId);

    // Clean up any pending attacks for this combat
    for (const [attackId] of this.pendingAttacks) {
      if (attackId.startsWith(combatId)) {
        this.pendingAttacks.delete(attackId);
      }
    }

    // Clean up any awaiting damage for this combat
    for (const [attackId] of this.awaitingDamage) {
      if (attackId.startsWith(combatId)) {
        this.awaitingDamage.delete(attackId);
      }
    }

    logger.info(`⚔️ Combat ${combatId} ended`);
    logger.info(`📊 Final compliance score: ${auditReport.complianceScore}%`);

    if (auditReport.violations.length > 0) {
      logger.warn(`⚠️ Rule violations detected: ${auditReport.violations.length}`);
      const criticalViolations = auditReport.violations.filter((v) => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        logger.error(`🚨 Critical violations: ${criticalViolations.length}`);
      }
    }
  }

  /**
   * Check if combat is currently active
   */
  isCombatActive(combatId: string): boolean {
    return this.activeCombats.has(combatId);
  }

  /**
   * Validate combat state for a specific action
   */
  validateCombatState(
    combatId: string,
    action: 'attack' | 'damage' | 'save',
  ): { valid: boolean; reason?: string } {
    if (!this.activeCombats.has(combatId)) {
      return { valid: false, reason: 'Combat not active' };
    }

    if (!this.initiativeRolled.has(combatId)) {
      return { valid: false, reason: 'Initiative phase not complete' };
    }

    const turnOrder = this.turnOrders.get(combatId);
    if (!turnOrder || !turnOrder.isInitiativeComplete) {
      return { valid: false, reason: 'Initiative phase not complete' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const combatSequenceValidator = CombatSequenceValidator.getInstance();
