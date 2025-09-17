/**
 * Test file to verify the complete combat roll flow
 * Tests the integration between prompt instructions, roll state management, and damage roll detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rollStateManager } from '../services/combat/rollStateManager';
import { parseRollRequests, detectsSuccessfulAttack, detectsCriticalHit } from '../utils/rollRequestParser';
import { DiceEngine } from '../services/dice/DiceEngine';

describe('Combat Roll Flow Integration', () => {
  beforeEach(() => {
    // Clear state before each test
    rollStateManager.clearAllState();
  });

  describe('Attack Roll Detection', () => {
    it('should detect attack roll requests', () => {
      const message = "Make an attack roll with your longsword (1d20+5) against AC 13";
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('attack');
      expect(requests[0].formula).toBe('1d20+modifier');
    });

    it('should detect natural language attack requests', () => {
      const message = "Please roll an attack roll with your dagger";
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('attack');
    });
  });

  describe('Damage Roll Detection', () => {
    it('should detect explicit damage roll requests', () => {
      const message = "Roll damage for your longsword (1d8+3)";
      const requests = parseRollRequests(message);

      expect(requests.length).toBeGreaterThan(0);
      const damageRequests = requests.filter(r => r.type === 'damage');
      expect(damageRequests.length).toBeGreaterThan(0);
      expect(damageRequests[0].formula).toBe('1d8+3');
    });

    it('should detect critical damage requests', () => {
      const message = "Natural 20! Critical hit! Roll critical damage (2d6+2)";
      const requests = parseRollRequests(message);

      expect(requests.length).toBeGreaterThan(0);
      const damageRequests = requests.filter(r => r.type === 'damage');
      expect(damageRequests.length).toBeGreaterThan(0);
      expect(damageRequests[0].purpose).toBe('Critical damage roll');
    });

    it('should detect contextual damage requests', () => {
      const message = "That hits! Now roll damage";
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('damage');
    });
  });

  describe('Success Detection', () => {
    it('should detect successful attacks', () => {
      const messages = [
        "That hits!",
        "18 hits AC 13",
        "Your blade strikes true",
        "Critical hit!",
        "Natural 20!"
      ];

      messages.forEach(message => {
        expect(detectsSuccessfulAttack(message)).toBe(true);
      });
    });

    it('should detect critical hits', () => {
      const messages = [
        "Critical hit!",
        "Natural 20!",
        "Nat 20",
        "crit"
      ];

      messages.forEach(message => {
        expect(detectsCriticalHit(message)).toBe(true);
      });
    });
  });

  describe('Roll State Management', () => {
    it('should track attack rolls and trigger damage requests', () => {
      // Simulate adding an attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player'
      });

      expect(rollStateManager.getPendingRolls()).toHaveLength(1);

      // Simulate successful attack roll
      const result = rollStateManager.recordAttackRoll(rollId, 18, 13);

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(false);
      expect(result.needsDamageRoll).toBe(true);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);
    });

    it('should handle critical hits correctly', () => {
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'shortsword',
        targetAC: 15,
        context: 'Attack with shortsword',
        actorId: 'player'
      });

      // Simulate critical hit (natural 20)
      const result = rollStateManager.recordAttackRoll(rollId, 20, 15);

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
      expect(result.needsDamageRoll).toBe(true);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(true);
    });

    it('should clear damage awaiting state after damage roll', () => {
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player'
      });

      // Hit
      rollStateManager.recordAttackRoll(rollId, 16, 13);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);

      // Record damage
      rollStateManager.recordDamageRoll(rollId, 8, '1d8+3');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
    });
  });

  describe('Dice Engine Integration', () => {
    it('should get correct weapon damage formulas', () => {
      expect(DiceEngine.getWeaponDamageFormula('longsword')).toBe('1d8+str');
      expect(DiceEngine.getWeaponDamageFormula('shortsword')).toBe('1d6+str');
      expect(DiceEngine.getWeaponDamageFormula('greatsword')).toBe('2d6+str');
      expect(DiceEngine.getWeaponDamageFormula('rapier')).toBe('1d8+str');
    });

    it('should handle finesse weapons with dex', () => {
      expect(DiceEngine.getWeaponDamageFormula('rapier', 'dex')).toBe('1d8+dex');
      expect(DiceEngine.getWeaponDamageFormula('shortsword', 'dex')).toBe('1d6+dex');
    });

    it('should create proper damage roll requests', () => {
      const normalDamage = DiceEngine.createDamageRollRequest('longsword');
      expect(normalDamage.formula).toBe('1d8+str');
      expect(normalDamage.purpose).toBe('Damage roll for longsword');

      const criticalDamage = DiceEngine.createDamageRollRequest('longsword', true);
      expect(criticalDamage.formula).toBe('2d8+str');
      expect(criticalDamage.purpose).toBe('Critical damage roll for longsword');
    });

    it('should calculate critical damage correctly', () => {
      const result = DiceEngine.calculateCriticalDamage('1d8+3');
      expect(result.purpose).toBe('critical damage');
      // The actual total will vary due to randomness, but we can check the formula was applied
      expect(result.expression).toContain('2d8');
    });
  });

  describe('Complete Combat Flow Simulation', () => {
    it('should simulate a complete attack -> damage sequence', () => {
      // 1. DM requests attack roll
      const dmMessage = "Make an attack roll with your longsword (1d20+5) against AC 13";
      const attackRequests = parseRollRequests(dmMessage);
      expect(attackRequests[0].type).toBe('attack');

      // 2. Track the attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player'
      });

      // 3. Player rolls and hits
      const attackResult = rollStateManager.recordAttackRoll(rollId, 16, 13);
      expect(attackResult.hit).toBe(true);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);

      // 4. DM responds with hit confirmation and damage request
      const dmResponse = "16 hits! Your longsword strikes true. Roll damage for your longsword (1d8+3)";

      // Should detect successful attack
      expect(detectsSuccessfulAttack(dmResponse)).toBe(true);

      // Should detect damage roll request
      const damageRequests = parseRollRequests(dmResponse);
      expect(damageRequests.length).toBeGreaterThan(0);
      const onlyDamageRequests = damageRequests.filter(r => r.type === 'damage');
      expect(onlyDamageRequests.length).toBeGreaterThan(0);

      // 5. Record damage roll
      rollStateManager.recordDamageRoll(rollId, 7, '1d8+3');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
    });

    it('should simulate a critical hit sequence', () => {
      // Attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'shortsword',
        targetAC: 15,
        context: 'Attack with shortsword',
        actorId: 'player'
      });

      // Critical hit!
      const attackResult = rollStateManager.recordAttackRoll(rollId, 20, 15);
      expect(attackResult.critical).toBe(true);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(true);

      // DM response
      const dmResponse = "Natural 20! Critical hit! Roll critical damage (2d6+2)";

      expect(detectsCriticalHit(dmResponse)).toBe(true);

      const damageRequests = parseRollRequests(dmResponse);
      expect(damageRequests[0].purpose).toBe('Critical damage roll');

      // Record critical damage
      rollStateManager.recordDamageRoll(rollId, 11, '2d6+2');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(false);
    });
  });
});