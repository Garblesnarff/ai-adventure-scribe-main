/**
 * Rules adapter for D&D 5E mechanics
 * This is a simplified version that mirrors the server/src/rules/rules-engine.ts
 * For production use, you would import the actual rules engine
 */

import { Ability, Actor, DamageType, Weapon } from './types.js';

/**
 * Calculate ability modifier
 */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Get proficiency bonus for a given level
 */
export function getProficiencyBonus(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

/**
 * Roll a d20 with advantage/disadvantage
 */
export function rollD20(advantage?: boolean, disadvantage?: boolean): { roll: number; dice: number[] } {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;

  if (advantage && !disadvantage) {
    return { roll: Math.max(roll1, roll2), dice: [roll1, roll2] };
  }
  if (disadvantage && !advantage) {
    return { roll: Math.min(roll1, roll2), dice: [roll1, roll2] };
  }
  return { roll: roll1, dice: [roll1] };
}

/**
 * Roll dice (e.g., "2d6+3")
 */
export function rollDice(dice: string): { total: number; rolls: number[]; bonus: number } {
  const match = dice.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid dice format: ${dice}`);
  }

  const [, numDice, diceSize, sign, bonusStr] = match;
  const num = parseInt(numDice, 10);
  const size = parseInt(diceSize, 10);
  const bonus = bonusStr ? (sign === '-' ? -1 : 1) * parseInt(bonusStr, 10) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < num; i++) {
    rolls.push(Math.floor(Math.random() * size) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + bonus;
  return { total, rolls, bonus };
}

/**
 * Resolve an attack roll
 */
export function resolveAttack(params: {
  attacker: Actor;
  defender: Actor;
  weapon: Weapon;
  advantage?: boolean;
  disadvantage?: boolean;
  cover?: 'none' | 'half' | 'three-quarters' | 'full';
}): {
  hit: boolean;
  critical: boolean;
  roll: number;
  total: number;
  targetAC: number;
  damage?: { total: number; rolls: number[]; type: DamageType };
} {
  const { attacker, defender, weapon, advantage, disadvantage, cover } = params;

  // Calculate attack bonus
  const abilityMod_ = abilityMod(attacker.abilities[weapon.ability]);
  const profBonus = weapon.proficient ? (attacker.proficiencyBonus ?? getProficiencyBonus(attacker.level)) : 0;
  const magicBonus = weapon.magicalBonus ?? 0;
  const attackBonus = abilityMod_ + profBonus + magicBonus;

  // Calculate target AC with cover
  let coverBonus = 0;
  if (cover === 'half') coverBonus = 2;
  if (cover === 'three-quarters') coverBonus = 5;
  if (cover === 'full') {
    return {
      hit: false,
      critical: false,
      roll: 0,
      total: 0,
      targetAC: defender.ac.base + 999,
    };
  }

  const targetAC = defender.ac.base + (defender.ac.shieldBonus ?? 0) + (defender.ac.miscBonus ?? 0) + coverBonus;

  // Roll attack
  const { roll, dice } = rollD20(advantage, disadvantage);
  const critical = roll === 20;
  const total = roll + attackBonus;
  const hit = critical || total >= targetAC;

  let damage: { total: number; rolls: number[]; type: DamageType } | undefined;
  if (hit) {
    const damageRoll = rollDice(weapon.damageDice);
    const damageMod = abilityMod_;
    const totalDamage = critical ? (damageRoll.total * 2) + damageMod : damageRoll.total + damageMod;
    damage = {
      total: totalDamage,
      rolls: damageRoll.rolls,
      type: weapon.damageType,
    };
  }

  return { hit, critical, roll, total, targetAC, damage };
}

/**
 * Resolve a saving throw
 */
export function resolveSave(params: {
  actor: Actor;
  ability: Ability;
  dc: number;
  advantage?: boolean;
  disadvantage?: boolean;
  proficient?: boolean;
}): {
  success: boolean;
  roll: number;
  total: number;
  dc: number;
} {
  const { actor, ability, dc, advantage, disadvantage, proficient } = params;

  const abilityMod_ = abilityMod(actor.abilities[ability]);
  const profBonus = proficient ? (actor.proficiencyBonus ?? getProficiencyBonus(actor.level)) : 0;

  const { roll } = rollD20(advantage, disadvantage);
  const total = roll + abilityMod_ + profBonus;
  const success = total >= dc;

  return { success, roll, total, dc };
}

/**
 * Resolve an ability check
 */
export function resolveAbilityCheck(params: {
  actor: Actor;
  ability: Ability;
  dc?: number;
  advantage?: boolean;
  disadvantage?: boolean;
  proficient?: boolean;
}): {
  success?: boolean;
  roll: number;
  total: number;
  dc?: number;
} {
  const { actor, ability, dc, advantage, disadvantage, proficient } = params;

  const abilityMod_ = abilityMod(actor.abilities[ability]);
  const profBonus = proficient ? (actor.proficiencyBonus ?? getProficiencyBonus(actor.level)) : 0;

  const { roll } = rollD20(advantage, disadvantage);
  const total = roll + abilityMod_ + profBonus;

  return {
    success: dc !== undefined ? total >= dc : undefined,
    roll,
    total,
    dc,
  };
}

/**
 * Resolve initiative for multiple actors
 */
export function resolveInitiative(actors: Actor[]): Array<{ actorId: string; name: string; value: number }> {
  const results = actors.map(actor => {
    const dexMod = abilityMod(actor.abilities.dex);
    const roll = Math.floor(Math.random() * 20) + 1;
    return {
      actorId: actor.id,
      name: actor.name,
      value: roll + dexMod,
    };
  });

  // Sort by initiative value (highest first), then by dex modifier as tiebreaker
  return results.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    const actorA = actors.find(ac => ac.id === a.actorId)!;
    const actorB = actors.find(ac => ac.id === b.actorId)!;
    return abilityMod(actorB.abilities.dex) - abilityMod(actorA.abilities.dex);
  });
}

/**
 * Resolve a death saving throw
 */
export function resolveDeathSave(): {
  success: boolean;
  critical: boolean;
  roll: number;
} {
  const roll = Math.floor(Math.random() * 20) + 1;
  return {
    success: roll >= 10,
    critical: roll === 20 || roll === 1,
    roll,
  };
}

/**
 * Calculate damage with resistances/immunities/vulnerabilities
 */
export function calculateDamage(params: {
  damage: number;
  damageType: DamageType;
  target: Actor;
}): {
  original: number;
  final: number;
  modifier: 'none' | 'resistant' | 'immune' | 'vulnerable';
} {
  const { damage, damageType, target } = params;
  const resistances = target.resistances;

  if (resistances?.immune?.includes(damageType)) {
    return { original: damage, final: 0, modifier: 'immune' };
  }
  if (resistances?.resistant?.includes(damageType)) {
    return { original: damage, final: Math.floor(damage / 2), modifier: 'resistant' };
  }
  if (resistances?.vulnerable?.includes(damageType)) {
    return { original: damage, final: damage * 2, modifier: 'vulnerable' };
  }

  return { original: damage, final: damage, modifier: 'none' };
}

/**
 * Resolve a spell attack
 */
export function resolveSpellAttack(params: {
  caster: Actor;
  target: Actor;
  spellName: string;
  spellLevel: number;
  advantage?: boolean;
  disadvantage?: boolean;
}): {
  hit: boolean;
  critical: boolean;
  roll: number;
  total: number;
  targetAC: number;
} {
  const { caster, target, advantage, disadvantage } = params;

  // Assume Intelligence for wizards, Wisdom for clerics, Charisma for others
  const spellcastingAbility: Ability = caster.class === 'wizard' ? 'int' :
                                        caster.class === 'cleric' || caster.class === 'druid' ? 'wis' : 'cha';

  const abilityMod_ = abilityMod(caster.abilities[spellcastingAbility]);
  const profBonus = caster.proficiencyBonus ?? getProficiencyBonus(caster.level);
  const attackBonus = abilityMod_ + profBonus;

  const targetAC = target.ac.base + (target.ac.shieldBonus ?? 0) + (target.ac.miscBonus ?? 0);

  const { roll } = rollD20(advantage, disadvantage);
  const critical = roll === 20;
  const total = roll + attackBonus;
  const hit = critical || total >= targetAC;

  return { hit, critical, roll, total, targetAC };
}
