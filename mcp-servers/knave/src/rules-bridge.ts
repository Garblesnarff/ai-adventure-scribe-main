/**
 * Bridge between MCP server and the Knave rules engine
 * This module wraps the core rules engine functions for use in the MCP server
 */

import { RNG } from './dice.js';
import {
  abilityMod,
  getActorProficiencyBonus,
  calculateArmorClass,
  calculateMaxHp,
} from './state-utils.js';
import { rollD20, rollDice, buildRNG } from './dice.js';
import type {
  Actor,
  Weapon,
  Armor,
  Ability,
  AttackOutcome,
  CheckOutcome,
  InitiativeOutcome,
  DamageOutcome,
  HitOutcome,
} from './types.js';

/**
 * Resolve an attack roll
 * Knave Attack: d20 + proficiency bonus + ability modifier vs target AC
 */
export function resolveAttack(
  actor: Actor,
  target: Actor,
  weapon: Weapon,
  seed?: string | number,
): AttackOutcome {
  const rng = buildRNG(seed);
  const usedAbility: Ability = weapon.ability;
  const abilityMod_ = abilityMod(actor.abilities[usedAbility]);
  const profBonus = getActorProficiencyBonus(actor);

  // d20 roll
  const roll = rollD20(rng);
  const attackBonus = abilityMod_ + profBonus;
  const totalToHit = roll + attackBonus;

  // Target AC
  const targetAC = calculateArmorClass(target);

  // Hit check
  const hit = totalToHit >= targetAC;

  const hitOutcome: HitOutcome = {
    kind: hit ? 'hit' : 'miss',
    roll,
    total: totalToHit,
    targetAC,
    details: [
      `Rolled: ${roll}`,
      `Ability modifier (${usedAbility}): +${abilityMod_}`,
      `Proficiency bonus: +${profBonus}`,
      `Total to hit: ${totalToHit} vs AC ${targetAC}`,
    ],
  };

  let damage: DamageOutcome | undefined = undefined;
  if (hit) {
    // Roll weapon damage
    const weaponDamage = rollDice(rng, weapon.damageDice);
    damage = {
      input: weaponDamage,
      totalDamage: weaponDamage,
    };
  }

  return {
    type: 'attack',
    hit: hitOutcome,
    damage,
    expended: { actionAvailable: false },
  };
}

/**
 * Resolve a saving throw
 * Knave Save: d20 + proficiency bonus + ability modifier vs DC
 */
export function resolveSave(
  actor: Actor,
  ability: Ability,
  dc: number,
  seed?: string | number,
): CheckOutcome {
  const rng = buildRNG(seed);
  const mod = abilityMod(actor.abilities[ability]);
  const prof = getActorProficiencyBonus(actor);

  const roll = rollD20(rng);
  const total = roll + mod + prof;
  const success = total >= dc;

  return {
    type: 'savingThrow',
    success,
    dc,
    roll,
    total,
    ability,
  };
}

/**
 * Resolve an ability check
 * Knave Ability Check: d20 + ability modifier (no proficiency for simple checks)
 */
export function resolveAbilityCheck(
  actor: Actor,
  ability: Ability,
  dc?: number,
  seed?: string | number,
): CheckOutcome {
  const rng = buildRNG(seed);
  const mod = abilityMod(actor.abilities[ability]);

  const roll = rollD20(rng);
  const total = roll + mod;
  const success = dc !== undefined ? total >= dc : undefined;

  return {
    type: 'abilityCheck',
    success,
    dc,
    roll,
    total,
    ability,
  };
}

/**
 * Resolve initiative
 * Knave Initiative: d20 + DEX modifier
 */
export function resolveInitiative(actors: Actor[], seed?: string | number): InitiativeOutcome {
  const rng = buildRNG(seed);
  const order = actors.map((actor) => {
    const roll = rollD20(rng);
    const dexMod = abilityMod(actor.abilities.dex);
    return {
      actorId: actor.id,
      value: roll + dexMod,
      rawRoll: roll,
      dexMod,
      dex: actor.abilities.dex,
    };
  });

  // Sort by initiative value (descending), with tiebreakers
  order.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (b.dexMod !== a.dexMod) return b.dexMod - a.dexMod;
    if (b.dex !== a.dex) return b.dex - a.dex;
    return rng() < 0.5 ? -1 : 1;
  });

  return {
    type: 'initiative',
    order: order.map(({ actorId, value }) => ({ actorId, value })),
  };
}

/**
 * Calculate armor class
 * Knave AC: 11 + armor bonus + DEX modifier
 */
export function calculateAC(baseAC: number = 11, armor?: Armor, dexScore: number = 10): number {
  const dexMod = abilityMod(dexScore);
  const armorBonus = armor?.acBonus ?? 0;
  return baseAC + armorBonus + dexMod;
}

/**
 * Calculate max HP
 * Knave HP: 8 per level + (CON modifier × level), minimum 1 HP per level
 */
export function calculateHP(level: number, conScore: number = 10): number {
  const conMod = abilityMod(conScore);
  const baseHp = level * 8;
  const conBonus = conMod * level;
  return Math.max(level, baseHp + conBonus);
}
