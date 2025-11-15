/**
 * Roll State Manager
 * Tracks combat roll states and manages the sequence of attack → damage rolls
 */

export interface PendingRoll {
  id: string;
  type: 'attack' | 'damage' | 'save' | 'skill_check' | 'initiative';
  weaponName?: string;
  damageFormula?: string;
  targetAC?: number;
  dc?: number;
  timestamp: number;
  context: string;
  actorId: string;
  waitingFor?: 'damage' | 'confirmation';
  character?: import('@/types/character').Character;
  preferredAbility?: 'str' | 'dex';
}

export interface RollResult {
  id: string;
  type: PendingRoll['type'];
  formula: string;
  result: number;
  critical?: boolean;
  success?: boolean;
  timestamp: number;
  context: string;
  actorId: string;
}

export interface CombatRollState {
  pendingRolls: PendingRoll[];
  completedRolls: RollResult[];
  awaitingDamageFor?: string; // ID of successful attack waiting for damage
  criticalHit?: string; // ID of critical hit waiting for damage
}

export class RollStateManager {
  private static instance: RollStateManager;
  private state: CombatRollState = {
    pendingRolls: [],
    completedRolls: [],
  };

  static getInstance(): RollStateManager {
    if (!RollStateManager.instance) {
      RollStateManager.instance = new RollStateManager();
    }
    return RollStateManager.instance;
  }

  /**
   * Add a pending roll request
   */
  addPendingRoll(roll: Omit<PendingRoll, 'id' | 'timestamp'>): string {
    const id = `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingRoll: PendingRoll = {
      ...roll,
      id,
      timestamp: Date.now(),
    };

    this.state.pendingRolls.push(pendingRoll);
    return id;
  }

  /**
   * Record an attack roll result and mark if damage is needed
   */
  recordAttackRoll(
    rollId: string,
    result: number,
    targetAC?: number,
  ): {
    hit: boolean;
    critical: boolean;
    needsDamageRoll: boolean;
  } {
    const roll = this.state.pendingRolls.find((r) => r.id === rollId);
    if (!roll || roll.type !== 'attack') {
      return { hit: false, critical: false, needsDamageRoll: false };
    }

    const critical = result === 20;
    const hit = critical || (targetAC ? result >= targetAC : true);

    // Record the completed roll
    const completedRoll: RollResult = {
      id: rollId,
      type: 'attack',
      formula: roll.context,
      result,
      critical,
      success: hit,
      timestamp: Date.now(),
      context: roll.context,
      actorId: roll.actorId,
    };

    this.state.completedRolls.push(completedRoll);

    // Remove from pending
    this.state.pendingRolls = this.state.pendingRolls.filter((r) => r.id !== rollId);

    // Track if we need damage roll
    if (hit) {
      this.state.awaitingDamageFor = rollId;
      if (critical) {
        this.state.criticalHit = rollId;
      }
    }

    return { hit, critical, needsDamageRoll: hit };
  }

  /**
   * Record a damage roll result
   */
  recordDamageRoll(attackRollId: string, result: number, formula: string): void {
    const completedRoll: RollResult = {
      id: `damage_${attackRollId}`,
      type: 'damage',
      formula,
      result,
      timestamp: Date.now(),
      context: `Damage for attack ${attackRollId}`,
      actorId: this.getActorIdForRoll(attackRollId) || 'unknown',
    };

    this.state.completedRolls.push(completedRoll);

    // Clear awaiting damage state
    if (this.state.awaitingDamageFor === attackRollId) {
      this.state.awaitingDamageFor = undefined;
    }
    if (this.state.criticalHit === attackRollId) {
      this.state.criticalHit = undefined;
    }
  }

  /**
   * Check if we're waiting for a damage roll
   */
  isAwaitingDamage(): boolean {
    return !!this.state.awaitingDamageFor;
  }

  /**
   * Get the attack roll we're waiting damage for
   */
  getAwaitingDamageRoll(): RollResult | null {
    if (!this.state.awaitingDamageFor) return null;
    return this.state.completedRolls.find((r) => r.id === this.state.awaitingDamageFor) || null;
  }

  /**
   * Check if the awaiting damage is for a critical hit
   */
  isAwaitingCriticalDamage(): boolean {
    return !!this.state.criticalHit;
  }

  /**
   * Get damage roll suggestion with character data
   */
  getDamageRollSuggestion(attackRollId: string): { formula: string; purpose: string } | null {
    const attackRoll = this.state.completedRolls.find((r) => r.id === attackRollId);
    if (!attackRoll) return null;

    // Find the original pending roll to get weapon and character data
    const originalPending = this.state.pendingRolls.find(
      (p) => p.weaponName && p.actorId === attackRoll.actorId,
    );

    if (!originalPending?.weaponName) {
      return { formula: '1d6+3', purpose: 'Damage roll' };
    }

    const isCritical = this.state.criticalHit === attackRollId;

    // Use DiceEngine for proper damage formula calculation
    const { DiceEngine } = require('../dice/DiceEngine');
    return DiceEngine.createDamageRollRequest(
      originalPending.weaponName,
      isCritical,
      originalPending.character,
      originalPending.preferredAbility,
    );
  }

  /**
   * Get attack roll suggestion with character data
   */
  getAttackRollSuggestion(
    weaponName: string,
    character?: import('@/types/character').Character,
  ): { formula: string; purpose: string } {
    const { DiceEngine } = require('../dice/DiceEngine');
    return DiceEngine.createAttackRollRequest(weaponName, character);
  }

  /**
   * Clear completed rolls (call after combat ends)
   */
  clearCompletedRolls(): void {
    this.state.completedRolls = [];
  }

  /**
   * Clear all state (call when combat ends)
   */
  clearAllState(): void {
    this.state = {
      pendingRolls: [],
      completedRolls: [],
    };
  }

  /**
   * Get pending rolls for debugging
   */
  getPendingRolls(): PendingRoll[] {
    return [...this.state.pendingRolls];
  }

  /**
   * Get completed rolls for debugging
   */
  getCompletedRolls(): RollResult[] {
    return [...this.state.completedRolls];
  }

  /**
   * Get current state for debugging
   */
  getState(): CombatRollState {
    return { ...this.state };
  }

  private getActorIdForRoll(rollId: string): string | undefined {
    const completedRoll = this.state.completedRolls.find((r) => r.id === rollId);
    return completedRoll?.actorId;
  }
}

export const rollStateManager = RollStateManager.getInstance();
