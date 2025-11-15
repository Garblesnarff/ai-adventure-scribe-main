/**
 * Simple combat roll flow test without complex setup
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { rollStateManager } from '../services/combat/rollStateManager';
import { DiceEngine } from '../services/dice/DiceEngine';
import {
  parseRollRequests,
  detectsSuccessfulAttack,
  detectsCriticalHit,
} from '../utils/rollRequestParser';

describe('Combat Roll Flow', () => {
  beforeEach(() => {
    rollStateManager.clearAllState();
  });

  it('should detect attack roll requests', () => {
    const message = 'Make an attack roll with your longsword (1d20+5) against AC 13';
    const requests = parseRollRequests(message);

    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].type).toBe('attack');
  });

  it('should detect damage roll requests', () => {
    const message = 'Roll damage for your longsword (1d8+3)';
    const requests = parseRollRequests(message);

    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].type).toBe('damage');
  });

  it('should detect successful attacks', () => {
    expect(detectsSuccessfulAttack('That hits!')).toBe(true);
    expect(detectsSuccessfulAttack('18 hits AC 13')).toBe(true);
    expect(detectsSuccessfulAttack('Critical hit!')).toBe(true);
  });

  it('should detect critical hits', () => {
    expect(detectsCriticalHit('Critical hit!')).toBe(true);
    expect(detectsCriticalHit('Natural 20!')).toBe(true);
    expect(detectsCriticalHit('nat 20')).toBe(true);
  });

  it('should manage attack roll state', () => {
    const rollId = rollStateManager.addPendingRoll({
      type: 'attack',
      weaponName: 'longsword',
      targetAC: 13,
      context: 'Attack with longsword',
      actorId: 'player',
    });

    expect(rollStateManager.getPendingRolls()).toHaveLength(1);

    const result = rollStateManager.recordAttackRoll(rollId, 18, 13);
    expect(result.hit).toBe(true);
    expect(result.needsDamageRoll).toBe(true);
    expect(rollStateManager.isAwaitingDamage()).toBe(true);
  });

  it('should handle critical hits', () => {
    const rollId = rollStateManager.addPendingRoll({
      type: 'attack',
      weaponName: 'shortsword',
      targetAC: 15,
      context: 'Attack with shortsword',
      actorId: 'player',
    });

    const result = rollStateManager.recordAttackRoll(rollId, 20, 15);
    expect(result.critical).toBe(true);
    expect(rollStateManager.isAwaitingCriticalDamage()).toBe(true);
  });

  it('should get weapon damage formulas', () => {
    expect(DiceEngine.getWeaponDamageFormula('longsword')).toBe('1d8+str');
    expect(DiceEngine.getWeaponDamageFormula('shortsword')).toBe('1d6+str');
    expect(DiceEngine.getWeaponDamageFormula('greatsword')).toBe('2d6+str');
  });

  it('should create damage roll requests', () => {
    const normal = DiceEngine.createDamageRollRequest('longsword');
    expect(normal.formula).toBe('1d8+str');

    const critical = DiceEngine.createDamageRollRequest('longsword', true);
    expect(critical.formula).toBe('2d8+str');
  });
});
