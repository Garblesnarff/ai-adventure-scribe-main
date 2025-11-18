/**
 * Combat Attack Service
 *
 * Handles D&D 5E attack resolution including:
 * - Hit/miss determination
 * - Damage calculation with resistance/vulnerability/immunity
 * - Critical hits
 * - Advantage/disadvantage mechanics
 * - Spell attacks and saves
 *
 * @module server/services/combat-attack-service
 */

import { db } from '../../../db/client.js';
import {
  weaponAttacks,
  creatureStats,
  type WeaponAttack,
  type CreatureStats,
} from '../../../db/schema/index.js';
import { eq, or, desc } from 'drizzle-orm';
import { CombatHPService } from './combat-hp-service.js';
import type {
  AttackRollInput,
  AttackResult,
  HitCheckInput,
  HitCheckResult,
  DamageCalculationInput,
  DamageCalculationResult,
  SpellAttackInput,
  SpellAttackResult,
  CreateWeaponAttackInput,
  DamageType,
} from '../types/combat.js';
import { NotFoundError, ValidationError, InternalServerError } from '../lib/errors.js';

export class CombatAttackService {
  constructor() {
    // No database client needed - using global db instance
  }

  /**
   * Check if an attack hits the target
   *
   * Rules:
   * - Natural 1 always misses (even if total would hit)
   * - Natural 20 always hits and is a critical
   * - Advantage = roll 2d20, take higher
   * - Disadvantage = roll 2d20, take lower
   * - Advantage + Disadvantage = cancel out (straight roll)
   */
  checkHit(input: HitCheckInput): HitCheckResult {
    const { attackRoll, attackBonus, targetAC, advantage, disadvantage } = input;

    // Determine if this is a natural 1 or natural 20
    const isNaturalOne = attackRoll === 1;
    const isNaturalTwenty = attackRoll === 20;

    // Calculate total attack roll
    const totalAttackRoll = attackRoll + attackBonus;

    // Natural 1 always misses
    if (isNaturalOne) {
      return {
        hit: false,
        totalAttackRoll,
        targetAC,
        isNaturalOne: true,
        isNaturalTwenty: false,
        isCritical: false,
      };
    }

    // Natural 20 always hits and is a critical
    if (isNaturalTwenty) {
      return {
        hit: true,
        totalAttackRoll,
        targetAC,
        isNaturalOne: false,
        isNaturalTwenty: true,
        isCritical: true,
      };
    }

    // Normal hit check
    const hit = totalAttackRoll >= targetAC;

    return {
      hit,
      totalAttackRoll,
      targetAC,
      isNaturalOne: false,
      isNaturalTwenty: false,
      isCritical: false,
    };
  }

  /**
   * Calculate damage with resistance/vulnerability/immunity
   *
   * Rules:
   * - Critical hit = roll damage dice twice, add modifiers once
   * - Resistance = half damage (round down)
   * - Vulnerability = double damage
   * - Immunity = no damage
   * - Resistance and vulnerability cancel out
   */
  calculateDamage(input: DamageCalculationInput): DamageCalculationResult {
    const {
      damageDice,
      damageBonus,
      damageType,
      isCritical = false,
      resistances = [],
      vulnerabilities = [],
      immunities = [],
      damageRoll,
    } = input;

    // Check for immunity first
    const effectiveImmunity = immunities.includes(damageType);
    if (effectiveImmunity) {
      return {
        baseDamage: 0,
        damageBeforeResistances: 0,
        effectiveResistance: false,
        effectiveVulnerability: false,
        effectiveImmunity: true,
        finalDamage: 0,
        damageType,
      };
    }

    // Calculate base damage from dice
    let baseDamage: number;
    if (damageRoll !== undefined) {
      // Use provided damage roll
      baseDamage = damageRoll;
      if (isCritical) {
        // Critical: double the dice damage, then add modifier once
        baseDamage = (damageRoll - damageBonus) * 2 + damageBonus;
      }
    } else {
      // Parse dice notation and roll
      baseDamage = this.rollDamageDice(damageDice, isCritical) + damageBonus;
    }

    const damageBeforeResistances = baseDamage;

    // Check for resistance and vulnerability
    const hasResistance = resistances.includes(damageType);
    const hasVulnerability = vulnerabilities.includes(damageType);

    // Resistance and vulnerability cancel out
    const effectiveResistance = hasResistance && !hasVulnerability;
    const effectiveVulnerability = hasVulnerability && !hasResistance;

    let finalDamage = damageBeforeResistances;

    // Apply resistance (half damage, round down)
    if (effectiveResistance) {
      finalDamage = Math.floor(finalDamage / 2);
    }

    // Apply vulnerability (double damage)
    if (effectiveVulnerability) {
      finalDamage = finalDamage * 2;
    }

    return {
      baseDamage,
      damageBeforeResistances,
      effectiveResistance,
      effectiveVulnerability,
      effectiveImmunity: false,
      finalDamage,
      damageType,
    };
  }

  /**
   * Resolve a critical hit
   * Critical hits double the damage dice (not the modifiers)
   */
  resolveCriticalHit(damageDice: string, damageBonus: number, damageRoll?: number): number {
    if (damageRoll !== undefined) {
      // Double the dice portion, add modifier once
      return (damageRoll - damageBonus) * 2 + damageBonus;
    }

    // Roll damage dice twice
    const normalDamage = this.rollDamageDice(damageDice, false);
    const criticalDamage = normalDamage * 2 + damageBonus;
    return criticalDamage;
  }

  /**
   * Resolve a complete attack
   */
  async resolveAttack(
    encounterId: string,
    input: AttackRollInput
  ): Promise<AttackResult> {
    const {
      attackerId,
      targetId,
      attackRoll,
      attackBonus = 0,
      weaponId,
      attackType,
      isCritical: forceCritical = false,
      advantage = false,
      disadvantage = false,
      damageRoll,
    } = input;

    // Get target's AC and resistances
    const targetStats = await this.getCreatureStats(targetId);
    if (!targetStats) {
      throw new NotFoundError('Target stats', targetId);
    }

    // Get weapon if provided
    let weapon: WeaponAttack | null = null;
    if (weaponId) {
      weapon = await this.getWeaponAttack(weaponId);
      if (!weapon) {
        throw new NotFoundError('Weapon', weaponId);
      }
    }

    // Check if attack hits
    const hitCheck = this.checkHit({
      attackRoll,
      attackBonus: weapon?.attackBonus || attackBonus,
      targetAC: targetStats.armorClass,
      advantage,
      disadvantage,
    });

    if (!hitCheck.hit) {
      // Miss - no damage
      return {
        hit: false,
        targetAC: targetStats.armorClass,
        totalAttackRoll: hitCheck.totalAttackRoll,
        effectiveResistance: false,
        effectiveVulnerability: false,
        effectiveImmunity: false,
        finalDamage: 0,
        isCritical: false,
        isNaturalOne: hitCheck.isNaturalOne,
        isNaturalTwenty: hitCheck.isNaturalTwenty,
      };
    }

    // Hit - calculate damage
    const isCrit = forceCritical || hitCheck.isCritical;

    if (!weapon) {
      // No weapon - return hit with no damage calculated
      return {
        hit: true,
        targetAC: targetStats.armorClass,
        totalAttackRoll: hitCheck.totalAttackRoll,
        effectiveResistance: false,
        effectiveVulnerability: false,
        effectiveImmunity: false,
        finalDamage: 0,
        isCritical: isCrit,
        isNaturalOne: hitCheck.isNaturalOne,
        isNaturalTwenty: hitCheck.isNaturalTwenty,
      };
    }

    const damageCalc = this.calculateDamage({
      damageDice: weapon.damageDice,
      damageBonus: weapon.damageBonus,
      damageType: weapon.damageType as DamageType,
      isCritical: isCrit,
      resistances: (targetStats.resistances || []) as DamageType[],
      vulnerabilities: (targetStats.vulnerabilities || []) as DamageType[],
      immunities: (targetStats.immunities || []) as DamageType[],
      damageRoll,
    });

    // Apply damage to target HP
    try {
      const hpResult = await CombatHPService.applyDamage(targetId, {
        damageAmount: damageCalc.finalDamage,
        damageType: weapon.damageType as DamageType,
        sourceParticipantId: attackerId,
        sourceDescription: weapon.name || 'attack',
        ignoreResistances: true, // Already applied in damage calculation
        ignoreImmunities: true,  // Already applied in damage calculation
      });

      return {
        hit: true,
        targetAC: targetStats.armorClass,
        totalAttackRoll: hitCheck.totalAttackRoll,
        damage: damageCalc.baseDamage,
        damageType: weapon.damageType as DamageType,
        damageBeforeResistances: damageCalc.damageBeforeResistances,
        effectiveResistance: damageCalc.effectiveResistance,
        effectiveVulnerability: damageCalc.effectiveVulnerability,
        effectiveImmunity: damageCalc.effectiveImmunity,
        finalDamage: damageCalc.finalDamage,
        targetNewHp: hpResult.newCurrentHp,
        targetIsConscious: hpResult.isConscious,
        targetIsDead: hpResult.isDead,
        isCritical: isCrit,
        isNaturalOne: hitCheck.isNaturalOne,
        isNaturalTwenty: hitCheck.isNaturalTwenty,
      };
    } catch (error) {
      console.error('Failed to apply damage to HP:', error);
      throw new InternalServerError('Attack succeeded but damage application failed', { error });
    }
  }

  /**
   * Resolve a spell attack against multiple targets
   */
  async resolveSpellAttack(
    encounterId: string,
    input: SpellAttackInput
  ): Promise<SpellAttackResult> {
    const {
      casterId,
      targetIds,
      spellName,
      attackRoll,
      saveDC,
      saveRolls,
      damageRoll,
      damageDice,
      damageType,
      isCritical = false,
    } = input;

    const results: AttackResult[] = [];

    for (const targetId of targetIds) {
      const targetStats = await this.getCreatureStats(targetId);
      if (!targetStats) {
        continue;
      }

      if (attackRoll !== undefined) {
        // Spell attack roll
        const hitCheck = this.checkHit({
          attackRoll,
          attackBonus: 0, // Spell attack bonus should be included in attackRoll
          targetAC: targetStats.armorClass,
        });

        if (!hitCheck.hit) {
          results.push({
            hit: false,
            targetAC: targetStats.armorClass,
            totalAttackRoll: hitCheck.totalAttackRoll,
            effectiveResistance: false,
            effectiveVulnerability: false,
            effectiveImmunity: false,
            finalDamage: 0,
            isCritical: false,
            isNaturalOne: hitCheck.isNaturalOne,
            isNaturalTwenty: hitCheck.isNaturalTwenty,
          });
          continue;
        }

        // Hit - calculate damage
        if (damageDice && damageType) {
          const damageCalc = this.calculateDamage({
            damageDice,
            damageBonus: 0,
            damageType,
            isCritical: hitCheck.isCritical || isCritical,
            resistances: (targetStats.resistances || []) as DamageType[],
            vulnerabilities: (targetStats.vulnerabilities || []) as DamageType[],
            immunities: (targetStats.immunities || []) as DamageType[],
            damageRoll,
          });

          // Apply damage to target HP
          try {
            const hpResult = await CombatHPService.applyDamage(targetId, {
              damageAmount: damageCalc.finalDamage,
              damageType,
              sourceParticipantId: casterId,
              sourceDescription: spellName,
              ignoreResistances: true, // Already applied in damage calculation
              ignoreImmunities: true,  // Already applied in damage calculation
            });

            results.push({
              hit: true,
              targetAC: targetStats.armorClass,
              totalAttackRoll: hitCheck.totalAttackRoll,
              damage: damageCalc.baseDamage,
              damageType,
              damageBeforeResistances: damageCalc.damageBeforeResistances,
              effectiveResistance: damageCalc.effectiveResistance,
              effectiveVulnerability: damageCalc.effectiveVulnerability,
              effectiveImmunity: damageCalc.effectiveImmunity,
              finalDamage: damageCalc.finalDamage,
              targetNewHp: hpResult.newCurrentHp,
              targetIsConscious: hpResult.isConscious,
              targetIsDead: hpResult.isDead,
              isCritical: hitCheck.isCritical || isCritical,
              isNaturalOne: hitCheck.isNaturalOne,
              isNaturalTwenty: hitCheck.isNaturalTwenty,
            });
          } catch (error) {
            console.error('Failed to apply spell attack damage to HP:', error);
            throw new InternalServerError('Spell attack succeeded but damage application failed', { error });
          }
        }
      } else if (saveDC !== undefined && saveRolls) {
        // Saving throw spell
        const saveRoll = saveRolls[targetId];
        if (saveRoll === undefined) {
          continue;
        }
        const savedSuccessfully = saveRoll >= saveDC;

        if (damageDice && damageType) {
          const damageCalc = this.calculateDamage({
            damageDice,
            damageBonus: 0,
            damageType,
            isCritical: false, // Spells with saves don't crit
            resistances: (targetStats.resistances || []) as DamageType[],
            vulnerabilities: (targetStats.vulnerabilities || []) as DamageType[],
            immunities: (targetStats.immunities || []) as DamageType[],
            damageRoll,
          });

          // Half damage on successful save
          const finalDamage = savedSuccessfully
            ? Math.floor(damageCalc.finalDamage / 2)
            : damageCalc.finalDamage;

          // Apply damage to target HP
          try {
            const hpResult = await CombatHPService.applyDamage(targetId, {
              damageAmount: finalDamage,
              damageType,
              sourceParticipantId: casterId,
              sourceDescription: spellName,
              ignoreResistances: true, // Already applied in damage calculation
              ignoreImmunities: true,  // Already applied in damage calculation
            });

            results.push({
              hit: !savedSuccessfully,
              targetAC: 0, // Not applicable for saves
              totalAttackRoll: saveRoll ?? 0,
              damage: damageCalc.baseDamage,
              damageType,
              damageBeforeResistances: damageCalc.damageBeforeResistances,
              effectiveResistance: damageCalc.effectiveResistance,
              effectiveVulnerability: damageCalc.effectiveVulnerability,
              effectiveImmunity: damageCalc.effectiveImmunity,
              finalDamage,
              targetNewHp: hpResult.newCurrentHp,
              targetIsConscious: hpResult.isConscious,
              targetIsDead: hpResult.isDead,
              isCritical: false,
              isNaturalOne: false,
              isNaturalTwenty: false,
            });
          } catch (error) {
            console.error('Failed to apply spell save damage to HP:', error);
            throw new InternalServerError('Spell save resolved but damage application failed', { error });
          }
        }
      }
    }

    return { results };
  }

  /**
   * Create a weapon attack for a character
   */
  async createWeaponAttack(input: CreateWeaponAttackInput): Promise<WeaponAttack> {
    const {
      characterId,
      name,
      attackBonus,
      damageDice,
      damageBonus,
      damageType,
      properties = [],
      description,
    } = input;

    const [weapon] = await db
      .insert(weaponAttacks)
      .values({
        characterId,
        name,
        attackBonus,
        damageDice,
        damageBonus,
        damageType,
        properties,
        description: description || null,
      })
      .returning();

    if (!weapon) {
      throw new InternalServerError('Failed to create weapon attack');
    }

    return weapon;
  }

  /**
   * Get all weapon attacks for a character
   */
  async getCharacterWeapons(characterId: string): Promise<WeaponAttack[]> {
    const weapons = await db.query.weaponAttacks.findMany({
      where: eq(weaponAttacks.characterId, characterId),
      orderBy: [desc(weaponAttacks.createdAt)],
    });

    return weapons;
  }

  /**
   * Get a specific weapon attack
   */
  async getWeaponAttack(weaponId: string): Promise<WeaponAttack | null> {
    const weapon = await db.query.weaponAttacks.findFirst({
      where: eq(weaponAttacks.id, weaponId),
    });

    return weapon || null;
  }

  /**
   * Get creature stats (AC, resistances, etc.)
   */
  async getCreatureStats(creatureId: string): Promise<CreatureStats | null> {
    // Try to find by character_id or npc_id
    const stats = await db.query.creatureStats.findFirst({
      where: or(
        eq(creatureStats.characterId, creatureId),
        eq(creatureStats.npcId, creatureId)
      ),
    });

    return stats || null;
  }

  /**
   * Helper: Roll damage dice
   * Parses dice notation like "1d8", "2d6", etc.
   */
  private rollDamageDice(damageDice: string, isCritical: boolean): number {
    const match = /^(\d+)d(\d+)$/i.exec(damageDice.trim());
    if (!match || !match[1] || !match[2]) {
      throw new ValidationError(`Invalid dice notation: ${damageDice}`, { damageDice });
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);

    // For critical, double the number of dice
    const diceToRoll = isCritical ? count * 2 : count;

    let total = 0;
    for (let i = 0; i < diceToRoll; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }

    return total;
  }

}

// Export singleton instance
export const combatAttackService = new CombatAttackService();
