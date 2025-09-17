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
    completedRolls: []
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
      timestamp: Date.now()
    };

    this.state.pendingRolls.push(pendingRoll);
    return id;
  }

  /**
   * Record an attack roll result and mark if damage is needed
   */
  recordAttackRoll(rollId: string, result: number, targetAC?: number): {
    hit: boolean;
    critical: boolean;
    needsDamageRoll: boolean;
  } {
    const roll = this.state.pendingRolls.find(r => r.id === rollId);
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
      actorId: roll.actorId
    };

    this.state.completedRolls.push(completedRoll);

    // Remove from pending
    this.state.pendingRolls = this.state.pendingRolls.filter(r => r.id !== rollId);

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
      actorId: this.getActorIdForRoll(attackRollId) || 'unknown'
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
    return this.state.completedRolls.find(r => r.id === this.state.awaitingDamageFor) || null;
  }

  /**
   * Check if the awaiting damage is for a critical hit
   */
  isAwaitingCriticalDamage(): boolean {
    return !!this.state.criticalHit;
  }

  /**
   * Get weapon damage formula for a given weapon name
   * This should be enhanced to pull from character sheet data
   */
  getWeaponDamageFormula(weaponName: string): string {
    const weaponDamage: Record<string, string> = {
      'shortsword': '1d6',
      'longsword': '1d8',
      'scimitar': '1d6',
      'dagger': '1d4',
      'rapier': '1d8',
      'warhammer': '1d8',
      'battleaxe': '1d8',
      'greatsword': '2d6',
      'greataxe': '1d12',
      'maul': '2d6',
      'handaxe': '1d6',
      'javelin': '1d6',
      'spear': '1d6',
      'club': '1d4',
      'mace': '1d6'
    };

    return weaponDamage[weaponName.toLowerCase()] || '1d6';
  }

  /**
   * Get critical damage formula (double the dice)
   */
  getCriticalDamageFormula(weaponName: string): string {
    const baseDamage = this.getWeaponDamageFormula(weaponName);
    // Double the dice but not the modifiers
    return baseDamage.replace(/(\d+)d(\d+)/g, (match, count, sides) =>
      `${parseInt(count) * 2}d${sides}`
    );
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
      completedRolls: []
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
    const completedRoll = this.state.completedRolls.find(r => r.id === rollId);
    return completedRoll?.actorId;
  }
}

export const rollStateManager = RollStateManager.getInstance();