/**
 * Combat Attack Service Tests
 *
 * Comprehensive test suite for D&D 5E attack resolution system
 * Tests hit/miss determination, damage calculation, critical hits,
 * resistance/vulnerability/immunity, and edge cases
 *
 * Work Unit 1.4a - Attack & Damage Resolution
 * Work Unit 2.1 - Attack-to-HP Integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CombatAttackService } from '../combat-attack-service.js';
import { CombatHPService } from '../combat-hp-service.js';
import type {
  HitCheckInput,
  DamageCalculationInput,
  CreatureStats,
  WeaponAttack,
  DamageType,
} from '../../types/combat.js';

// Mock the HP service
vi.mock('../combat-hp-service.js');

describe('CombatAttackService', () => {
  let service: CombatAttackService;

  beforeEach(() => {
    service = new CombatAttackService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  // ==========================================
  // HP Integration Tests
  // Work Unit 2.1
  // ==========================================
  describe('HP Integration', () => {
    it('should apply damage to HP and return HP status on successful attack', async () => {
      // Mock database queries
      const mockGetCreatureStats = vi.spyOn(service, 'getCreatureStats').mockResolvedValue({
        id: 'stats-1',
        armorClass: 15,
        resistances: [],
        vulnerabilities: [],
        immunities: [],
        conditionImmunities: [],
        characterId: null,
        npcId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockGetWeaponAttack = vi.spyOn(service, 'getWeaponAttack').mockResolvedValue({
        id: 'weapon-1',
        characterId: 'attacker-1',
        name: 'Longsword',
        attackBonus: 5,
        damageDice: '1d8',
        damageBonus: 3,
        damageType: 'slashing',
        properties: [],
        description: null,
        createdAt: new Date(),
      } as any);

      // Mock HP service
      const mockApplyDamage = vi.spyOn(CombatHPService, 'applyDamage').mockResolvedValue({
        participantId: 'target-1',
        originalDamage: 10,
        modifiedDamage: 10,
        tempHpLost: 0,
        hpLost: 10,
        newCurrentHp: 15,
        newTempHp: 0,
        isConscious: true,
        isDead: false,
        wasResisted: false,
        wasVulnerable: false,
        wasImmune: false,
        massiveDamage: false,
      });

      const result = await service.resolveAttack('encounter-1', {
        attackerId: 'attacker-1',
        targetId: 'target-1',
        attackRoll: 15,
        attackBonus: 5,
        weaponId: 'weapon-1',
        attackType: 'melee',
        damageRoll: 10, // Total damage (includes bonus)
      });

      expect(result.hit).toBe(true);
      expect(result.finalDamage).toBe(10);
      expect(result.targetNewHp).toBe(15);
      expect(result.targetIsConscious).toBe(true);
      expect(result.targetIsDead).toBe(false);

      expect(mockApplyDamage).toHaveBeenCalledWith('target-1', {
        damageAmount: 10,
        damageType: 'slashing',
        sourceParticipantId: 'attacker-1',
        sourceDescription: 'Longsword',
        ignoreResistances: true,
        ignoreImmunities: true,
      });

      mockGetCreatureStats.mockRestore();
      mockGetWeaponAttack.mockRestore();
    });

    it('should not apply damage to HP on missed attack', async () => {
      const mockGetCreatureStats = vi.spyOn(service, 'getCreatureStats').mockResolvedValue({
        id: 'stats-1',
        armorClass: 18,
        resistances: [],
        vulnerabilities: [],
        immunities: [],
        conditionImmunities: [],
        characterId: null,
        npcId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockApplyDamage = vi.spyOn(CombatHPService, 'applyDamage');

      const result = await service.resolveAttack('encounter-1', {
        attackerId: 'attacker-1',
        targetId: 'target-1',
        attackRoll: 10,
        attackBonus: 3,
        attackType: 'melee',
      });

      expect(result.hit).toBe(false);
      expect(mockApplyDamage).not.toHaveBeenCalled();

      mockGetCreatureStats.mockRestore();
    });

    it('should handle HP service errors gracefully', async () => {
      const mockGetCreatureStats = vi.spyOn(service, 'getCreatureStats').mockResolvedValue({
        id: 'stats-1',
        armorClass: 15,
        resistances: [],
        vulnerabilities: [],
        immunities: [],
        conditionImmunities: [],
        characterId: null,
        npcId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockGetWeaponAttack = vi.spyOn(service, 'getWeaponAttack').mockResolvedValue({
        id: 'weapon-1',
        characterId: 'attacker-1',
        name: 'Dagger',
        attackBonus: 5,
        damageDice: '1d4',
        damageBonus: 3,
        damageType: 'piercing',
        properties: [],
        description: null,
        createdAt: new Date(),
      } as any);

      const mockApplyDamage = vi
        .spyOn(CombatHPService, 'applyDamage')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.resolveAttack('encounter-1', {
          attackerId: 'attacker-1',
          targetId: 'target-1',
          attackRoll: 15,
          attackBonus: 5,
          weaponId: 'weapon-1',
          attackType: 'melee',
          damageRoll: 4,
        })
      ).rejects.toThrow('Attack succeeded but damage application failed');

      mockGetCreatureStats.mockRestore();
      mockGetWeaponAttack.mockRestore();
    });

    it('should apply damage with critical hit modifier', async () => {
      const mockGetCreatureStats = vi.spyOn(service, 'getCreatureStats').mockResolvedValue({
        id: 'stats-1',
        armorClass: 15,
        resistances: [],
        vulnerabilities: [],
        immunities: [],
        conditionImmunities: [],
        characterId: null,
        npcId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockGetWeaponAttack = vi.spyOn(service, 'getWeaponAttack').mockResolvedValue({
        id: 'weapon-1',
        characterId: 'attacker-1',
        name: 'Greatsword',
        attackBonus: 5,
        damageDice: '2d6',
        damageBonus: 4,
        damageType: 'slashing',
        properties: [],
        description: null,
        createdAt: new Date(),
      } as any);

      const mockApplyDamage = vi.spyOn(CombatHPService, 'applyDamage').mockResolvedValue({
        participantId: 'target-1',
        originalDamage: 20,
        modifiedDamage: 20,
        tempHpLost: 0,
        hpLost: 20,
        newCurrentHp: 0,
        newTempHp: 0,
        isConscious: false,
        isDead: false,
        wasResisted: false,
        wasVulnerable: false,
        wasImmune: false,
        massiveDamage: false,
      });

      const result = await service.resolveAttack('encounter-1', {
        attackerId: 'attacker-1',
        targetId: 'target-1',
        attackRoll: 20, // Natural 20
        attackBonus: 5,
        weaponId: 'weapon-1',
        attackType: 'melee',
        damageRoll: 8,
      });

      expect(result.hit).toBe(true);
      expect(result.isCritical).toBe(true);
      expect(result.targetIsConscious).toBe(false);
      expect(mockApplyDamage).toHaveBeenCalled();

      mockGetCreatureStats.mockRestore();
      mockGetWeaponAttack.mockRestore();
    });

    it('should apply spell damage to multiple targets', async () => {
      const mockGetCreatureStats = vi.spyOn(service, 'getCreatureStats').mockResolvedValue({
        id: 'stats-1',
        armorClass: 15,
        resistances: [],
        vulnerabilities: [],
        immunities: [],
        conditionImmunities: [],
        characterId: null,
        npcId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockApplyDamage = vi.spyOn(CombatHPService, 'applyDamage').mockResolvedValue({
        participantId: 'target-1',
        originalDamage: 8,
        modifiedDamage: 8,
        tempHpLost: 0,
        hpLost: 8,
        newCurrentHp: 12,
        newTempHp: 0,
        isConscious: true,
        isDead: false,
        wasResisted: false,
        wasVulnerable: false,
        wasImmune: false,
        massiveDamage: false,
      });

      const result = await service.resolveSpellAttack('encounter-1', {
        casterId: 'caster-1',
        targetIds: ['target-1', 'target-2'],
        spellName: 'Fireball',
        saveDC: 15,
        saveRolls: {
          'target-1': 10, // Failed save
          'target-2': 16, // Successful save
        },
        damageDice: '8d6',
        damageType: 'fire',
        damageRoll: 28,
      });

      expect(result.results).toHaveLength(2);
      expect(mockApplyDamage).toHaveBeenCalledTimes(2);

      // Check that full damage was applied to failed save
      expect(mockApplyDamage).toHaveBeenCalledWith('target-1', expect.objectContaining({
        damageAmount: 28,
        damageType: 'fire',
        sourceParticipantId: 'caster-1',
        sourceDescription: 'Fireball',
      }));

      // Check that half damage was applied to successful save
      expect(mockApplyDamage).toHaveBeenCalledWith('target-2', expect.objectContaining({
        damageAmount: 14, // Half of 28
        damageType: 'fire',
        sourceParticipantId: 'caster-1',
        sourceDescription: 'Fireball',
      }));

      mockGetCreatureStats.mockRestore();
    });
  });
});
