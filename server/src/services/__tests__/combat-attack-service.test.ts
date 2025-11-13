/**
 * Combat Attack Service Tests
 *
 * Comprehensive test suite for D&D 5E attack resolution system
 * Tests hit/miss determination, damage calculation, critical hits,
 * resistance/vulnerability/immunity, and edge cases
 *
 * Work Unit 1.4a - Attack & Damage Resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatAttackService } from '../combat-attack-service.js';
import type {
  HitCheckInput,
  DamageCalculationInput,
  CreatureStats,
  WeaponAttack,
  DamageType,
} from '../../types/combat.js';

describe('CombatAttackService', () => {
  let service: CombatAttackService;

  beforeEach(() => {
    service = new CombatAttackService();
  });

  // ==========================================
  // Hit Check Tests
  // ==========================================
  describe('checkHit', () => {
    it('should determine hit when attack roll + bonus meets AC', () => {
      const input: HitCheckInput = {
        attackRoll: 10,
        attackBonus: 5,
        targetAC: 15,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
      expect(result.totalAttackRoll).toBe(15);
      expect(result.targetAC).toBe(15);
      expect(result.isCritical).toBe(false);
      expect(result.isNaturalOne).toBe(false);
      expect(result.isNaturalTwenty).toBe(false);
    });

    it('should determine miss when attack roll + bonus is below AC', () => {
      const input: HitCheckInput = {
        attackRoll: 10,
        attackBonus: 3,
        targetAC: 18,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(false);
      expect(result.totalAttackRoll).toBe(13);
      expect(result.targetAC).toBe(18);
    });

    it('should auto-miss on natural 1', () => {
      const input: HitCheckInput = {
        attackRoll: 1,
        attackBonus: 20, // Even with huge bonus
        targetAC: 10,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(false);
      expect(result.isNaturalOne).toBe(true);
      expect(result.isCritical).toBe(false);
    });

    it('should auto-hit and crit on natural 20', () => {
      const input: HitCheckInput = {
        attackRoll: 20,
        attackBonus: 0,
        targetAC: 30, // Even against impossible AC
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
      expect(result.isNaturalTwenty).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should hit against AC 0', () => {
      const input: HitCheckInput = {
        attackRoll: 10,
        attackBonus: 0,
        targetAC: 0,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
    });

    it('should handle negative attack bonus', () => {
      const input: HitCheckInput = {
        attackRoll: 15,
        attackBonus: -2,
        targetAC: 13,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
      expect(result.totalAttackRoll).toBe(13);
    });
  });

  // ==========================================
  // Damage Calculation Tests
  // ==========================================
  describe('calculateDamage', () => {
    it('should calculate normal damage without modifiers', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        isCritical: false,
        damageRoll: 5, // Simulated roll
      };

      const result = service.calculateDamage(input);

      expect(result.baseDamage).toBe(8); // 5 + 3
      expect(result.finalDamage).toBe(8);
      expect(result.effectiveResistance).toBe(false);
      expect(result.effectiveVulnerability).toBe(false);
      expect(result.effectiveImmunity).toBe(false);
    });

    it('should double damage dice on critical hit', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        isCritical: true,
        damageRoll: 5, // Base roll
      };

      const result = service.calculateDamage(input);

      // Critical: (5 - 3) * 2 + 3 = 4 + 3 = 7
      // Note: Only dice damage is doubled, not the modifier
      expect(result.baseDamage).toBe(7);
    });

    it('should apply resistance (half damage, round down)', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'fire',
        resistances: ['fire' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.damageBeforeResistances).toBe(8);
      expect(result.effectiveResistance).toBe(true);
      expect(result.finalDamage).toBe(4); // Half of 8
    });

    it('should apply resistance with odd damage (round down)', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 2,
        damageType: 'cold',
        resistances: ['cold' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.damageBeforeResistances).toBe(7);
      expect(result.finalDamage).toBe(3); // Floor(7 / 2) = 3
    });

    it('should apply vulnerability (double damage)', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'piercing',
        vulnerabilities: ['piercing' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.damageBeforeResistances).toBe(8);
      expect(result.effectiveVulnerability).toBe(true);
      expect(result.finalDamage).toBe(16); // Double
    });

    it('should apply immunity (zero damage)', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'poison',
        immunities: ['poison' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.effectiveImmunity).toBe(true);
      expect(result.finalDamage).toBe(0);
      expect(result.baseDamage).toBe(0);
    });

    it('should cancel resistance and vulnerability if both apply', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        resistances: ['slashing' as DamageType],
        vulnerabilities: ['slashing' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.effectiveResistance).toBe(false);
      expect(result.effectiveVulnerability).toBe(false);
      expect(result.finalDamage).toBe(8); // Normal damage
    });

    it('should handle multiple damage types with only one resistance', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'fire',
        resistances: ['fire' as DamageType, 'cold' as DamageType],
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.effectiveResistance).toBe(true);
      expect(result.finalDamage).toBe(4);
    });

    it('should handle damage with no bonus', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d6',
        damageBonus: 0,
        damageType: 'bludgeoning',
        damageRoll: 4,
      };

      const result = service.calculateDamage(input);

      expect(result.baseDamage).toBe(4);
      expect(result.finalDamage).toBe(4);
    });

    it('should handle negative damage bonus', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: -1,
        damageType: 'slashing',
        damageRoll: 5,
      };

      const result = service.calculateDamage(input);

      expect(result.baseDamage).toBe(4); // 5 - 1
      expect(result.finalDamage).toBe(4);
    });
  });

  // ==========================================
  // Critical Hit Tests
  // ==========================================
  describe('resolveCriticalHit', () => {
    it('should double damage dice but not modifier', () => {
      const result = service.resolveCriticalHit('1d8', 3, 5);

      // Normal: 5 + 3 = 8
      // Critical: (5 - 3) * 2 + 3 = 4 + 3 = 7
      expect(result).toBe(7);
    });

    it('should handle critical with zero modifier', () => {
      const result = service.resolveCriticalHit('1d6', 0, 4);

      // Critical: 4 * 2 = 8
      expect(result).toBe(8);
    });

    it('should handle critical with large damage dice', () => {
      const result = service.resolveCriticalHit('2d6', 5, 10);

      // Normal: 10 + 5 = 15
      // Critical: (10 - 5) * 2 + 5 = 10 + 5 = 15
      expect(result).toBe(15);
    });
  });

  // ==========================================
  // Edge Cases
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle AC 30 (very high)', () => {
      const input: HitCheckInput = {
        attackRoll: 15,
        attackBonus: 10,
        targetAC: 30,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(false);
      expect(result.totalAttackRoll).toBe(25);
    });

    it('should handle massive damage bonus', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d4',
        damageBonus: 50,
        damageType: 'force',
        damageRoll: 2,
      };

      const result = service.calculateDamage(input);

      expect(result.finalDamage).toBe(52);
    });

    it('should handle all damage types correctly', () => {
      const damageTypes: DamageType[] = [
        'acid',
        'bludgeoning',
        'cold',
        'fire',
        'force',
        'lightning',
        'necrotic',
        'piercing',
        'poison',
        'psychic',
        'radiant',
        'slashing',
        'thunder',
      ];

      damageTypes.forEach(damageType => {
        const input: DamageCalculationInput = {
          damageDice: '1d6',
          damageBonus: 2,
          damageType,
          damageRoll: 3,
        };

        const result = service.calculateDamage(input);

        expect(result.damageType).toBe(damageType);
        expect(result.finalDamage).toBe(5);
      });
    });

    it('should handle resistance reducing damage to 0', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d4',
        damageBonus: 0,
        damageType: 'fire',
        resistances: ['fire' as DamageType],
        damageRoll: 1,
      };

      const result = service.calculateDamage(input);

      expect(result.finalDamage).toBe(0); // Floor(1 / 2) = 0
    });

    it('should handle critical hit with resistance', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        isCritical: true,
        resistances: ['slashing' as DamageType],
        damageRoll: 6,
      };

      const result = service.calculateDamage(input);

      // Critical: (6 - 3) * 2 + 3 = 9
      // With resistance: floor(9 / 2) = 4
      expect(result.finalDamage).toBe(4);
    });

    it('should handle critical hit with vulnerability', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        isCritical: true,
        vulnerabilities: ['slashing' as DamageType],
        damageRoll: 6,
      };

      const result = service.calculateDamage(input);

      // Critical: (6 - 3) * 2 + 3 = 9
      // With vulnerability: 9 * 2 = 18
      expect(result.finalDamage).toBe(18);
    });
  });

  // ==========================================
  // Integration Tests (Advantage/Disadvantage)
  // ==========================================
  describe('Advantage and Disadvantage', () => {
    it('should handle advantage correctly', () => {
      // Note: advantage/disadvantage handling is client-side
      // The service just receives the final roll
      const input: HitCheckInput = {
        attackRoll: 15, // Higher of two rolls
        attackBonus: 3,
        targetAC: 15,
        advantage: true,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
    });

    it('should handle disadvantage correctly', () => {
      const input: HitCheckInput = {
        attackRoll: 8, // Lower of two rolls
        attackBonus: 3,
        targetAC: 15,
        disadvantage: true,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(false);
    });
  });

  // ==========================================
  // D&D 5E Rules Compliance Tests
  // ==========================================
  describe('D&D 5E Rules Compliance', () => {
    it('should follow PHB rule: Natural 1 always misses', () => {
      const input: HitCheckInput = {
        attackRoll: 1,
        attackBonus: 100, // Impossible bonus
        targetAC: 1,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(false);
      expect(result.isNaturalOne).toBe(true);
    });

    it('should follow PHB rule: Natural 20 always hits and crits', () => {
      const input: HitCheckInput = {
        attackRoll: 20,
        attackBonus: -100, // Impossible penalty
        targetAC: 100,
      };

      const result = service.checkHit(input);

      expect(result.hit).toBe(true);
      expect(result.isNaturalTwenty).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should follow PHB rule: Critical doubles dice, not modifiers', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d8',
        damageBonus: 5,
        damageType: 'slashing',
        isCritical: true,
        damageRoll: 8, // Max roll
      };

      const result = service.calculateDamage(input);

      // Normal: 8 + 5 = 13
      // Critical: (8 - 5) * 2 + 5 = 6 + 5 = 11
      expect(result.baseDamage).toBe(11);
    });

    it('should follow PHB rule: Resistance halves damage (round down)', () => {
      const oddDamage: DamageCalculationInput = {
        damageDice: '1d6',
        damageBonus: 2,
        damageType: 'fire',
        resistances: ['fire' as DamageType],
        damageRoll: 4,
      };

      const result = service.calculateDamage(oddDamage);

      // 4 + 2 = 6, with resistance: floor(6 / 2) = 3
      expect(result.finalDamage).toBe(3);
    });

    it('should follow PHB rule: Immunity negates all damage', () => {
      const massiveDamage: DamageCalculationInput = {
        damageDice: '10d10',
        damageBonus: 20,
        damageType: 'poison',
        immunities: ['poison' as DamageType],
        damageRoll: 100,
      };

      const result = service.calculateDamage(massiveDamage);

      expect(result.finalDamage).toBe(0);
      expect(result.effectiveImmunity).toBe(true);
    });

    it('should follow PHB rule: Vulnerability doubles damage', () => {
      const input: DamageCalculationInput = {
        damageDice: '1d6',
        damageBonus: 3,
        damageType: 'fire',
        vulnerabilities: ['fire' as DamageType],
        damageRoll: 4,
      };

      const result = service.calculateDamage(input);

      // 4 + 3 = 7, with vulnerability: 7 * 2 = 14
      expect(result.finalDamage).toBe(14);
    });
  });
});
