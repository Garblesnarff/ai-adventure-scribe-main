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

import { Pool } from 'pg';
import { createClient } from '../lib/db.js';
import type {
  AttackRollInput,
  AttackResult,
  HitCheckInput,
  HitCheckResult,
  DamageCalculationInput,
  DamageCalculationResult,
  SpellAttackInput,
  SpellAttackResult,
  CreatureStats,
  WeaponAttack,
  CreateWeaponAttackInput,
  DamageType,
} from '../types/combat.js';

export class CombatAttackService {
  private db: Pool;

  constructor(db?: Pool) {
    this.db = db || createClient();
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
      throw new Error(`Target stats not found for ID: ${targetId}`);
    }

    // Get weapon if provided
    let weapon: WeaponAttack | null = null;
    if (weaponId) {
      weapon = await this.getWeaponAttack(weaponId);
      if (!weapon) {
        throw new Error(`Weapon not found for ID: ${weaponId}`);
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
      damageType: weapon.damageType,
      isCritical: isCrit,
      resistances: targetStats.resistances,
      vulnerabilities: targetStats.vulnerabilities,
      immunities: targetStats.immunities,
      damageRoll,
    });

    // TODO: Apply damage to target HP (integrate with HP service from Work Unit 1.2a)
    // const newHp = await this.applyDamage(targetId, damageCalc.finalDamage);

    return {
      hit: true,
      targetAC: targetStats.armorClass,
      totalAttackRoll: hitCheck.totalAttackRoll,
      damage: damageCalc.baseDamage,
      damageType: weapon.damageType,
      damageBeforeResistances: damageCalc.damageBeforeResistances,
      effectiveResistance: damageCalc.effectiveResistance,
      effectiveVulnerability: damageCalc.effectiveVulnerability,
      effectiveImmunity: damageCalc.effectiveImmunity,
      finalDamage: damageCalc.finalDamage,
      // targetNewHp: newHp, // TODO: Add when HP service is available
      isCritical: isCrit,
      isNaturalOne: hitCheck.isNaturalOne,
      isNaturalTwenty: hitCheck.isNaturalTwenty,
    };
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
            resistances: targetStats.resistances,
            vulnerabilities: targetStats.vulnerabilities,
            immunities: targetStats.immunities,
            damageRoll,
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
            isCritical: hitCheck.isCritical || isCritical,
            isNaturalOne: hitCheck.isNaturalOne,
            isNaturalTwenty: hitCheck.isNaturalTwenty,
          });
        }
      } else if (saveDC !== undefined && saveRolls) {
        // Saving throw spell
        const saveRoll = saveRolls[targetId];
        const savedSuccessfully = saveRoll >= saveDC;

        if (damageDice && damageType) {
          const damageCalc = this.calculateDamage({
            damageDice,
            damageBonus: 0,
            damageType,
            isCritical: false, // Spells with saves don't crit
            resistances: targetStats.resistances,
            vulnerabilities: targetStats.vulnerabilities,
            immunities: targetStats.immunities,
            damageRoll,
          });

          // Half damage on successful save
          const finalDamage = savedSuccessfully
            ? Math.floor(damageCalc.finalDamage / 2)
            : damageCalc.finalDamage;

          results.push({
            hit: !savedSuccessfully,
            targetAC: 0, // Not applicable for saves
            totalAttackRoll: saveRoll,
            damage: damageCalc.baseDamage,
            damageType,
            damageBeforeResistances: damageCalc.damageBeforeResistances,
            effectiveResistance: damageCalc.effectiveResistance,
            effectiveVulnerability: damageCalc.effectiveVulnerability,
            effectiveImmunity: damageCalc.effectiveImmunity,
            finalDamage,
            isCritical: false,
            isNaturalOne: false,
            isNaturalTwenty: false,
          });
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

    const result = await this.db.query(
      `INSERT INTO weapon_attacks (
        character_id, name, attack_bonus, damage_dice, damage_bonus,
        damage_type, properties, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [characterId, name, attackBonus, damageDice, damageBonus, damageType, properties, description]
    );

    return this.mapWeaponAttackRow(result.rows[0]);
  }

  /**
   * Get all weapon attacks for a character
   */
  async getCharacterWeapons(characterId: string): Promise<WeaponAttack[]> {
    const result = await this.db.query(
      `SELECT * FROM weapon_attacks WHERE character_id = $1 ORDER BY created_at DESC`,
      [characterId]
    );

    return result.rows.map(row => this.mapWeaponAttackRow(row));
  }

  /**
   * Get a specific weapon attack
   */
  async getWeaponAttack(weaponId: string): Promise<WeaponAttack | null> {
    const result = await this.db.query(
      `SELECT * FROM weapon_attacks WHERE id = $1`,
      [weaponId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapWeaponAttackRow(result.rows[0]);
  }

  /**
   * Get creature stats (AC, resistances, etc.)
   */
  async getCreatureStats(creatureId: string): Promise<CreatureStats | null> {
    // Try to find by character_id first
    let result = await this.db.query(
      `SELECT * FROM creature_stats WHERE character_id = $1`,
      [creatureId]
    );

    // If not found, try npc_id
    if (result.rows.length === 0) {
      result = await this.db.query(
        `SELECT * FROM creature_stats WHERE npc_id = $1`,
        [creatureId]
      );
    }

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCreatureStatsRow(result.rows[0]);
  }

  /**
   * Helper: Roll damage dice
   * Parses dice notation like "1d8", "2d6", etc.
   */
  private rollDamageDice(damageDice: string, isCritical: boolean): number {
    const match = /^(\d+)d(\d+)$/i.exec(damageDice.trim());
    if (!match) {
      throw new Error(`Invalid dice notation: ${damageDice}`);
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

  /**
   * Helper: Map database row to WeaponAttack
   */
  private mapWeaponAttackRow(row: any): WeaponAttack {
    return {
      id: row.id,
      characterId: row.character_id,
      name: row.name,
      attackBonus: row.attack_bonus,
      damageDice: row.damage_dice,
      damageBonus: row.damage_bonus,
      damageType: row.damage_type as DamageType,
      properties: row.properties || [],
      description: row.description,
      createdAt: row.created_at,
    };
  }

  /**
   * Helper: Map database row to CreatureStats
   */
  private mapCreatureStatsRow(row: any): CreatureStats {
    return {
      id: row.id,
      characterId: row.character_id,
      npcId: row.npc_id,
      armorClass: row.armor_class,
      resistances: (row.resistances || []) as DamageType[],
      vulnerabilities: (row.vulnerabilities || []) as DamageType[],
      immunities: (row.immunities || []) as DamageType[],
      conditionImmunities: row.condition_immunities || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const combatAttackService = new CombatAttackService();
