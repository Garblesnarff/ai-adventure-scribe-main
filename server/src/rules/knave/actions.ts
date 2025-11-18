import {
  Ability,
  abilityMod,
  Actor,
  AttackOutcome,
  calculateArmorClass,
  CheckOutcome,
  DamageOutcome,
  Encounter,
  getActorProficiencyBonus,
  InitiativeOutcome,
  Weapon,
} from './state.js';
import { hashSeed, mulberry32, RNG, rollD20, rollDice } from './dice.js';

export function buildRNG(seed?: string | number): RNG {
  return mulberry32(hashSeed(seed));
}

// Knave Attack Resolution
// Attacks: d20 + level + ability modifier vs target AC
export function resolveAttack(
  rng: RNG,
  attacker: Actor,
  defender: Actor,
  weapon: Weapon,
): AttackOutcome {
  const usedAbility: Ability = weapon.ability;
  const abilityMod_ = abilityMod(attacker.abilities[usedAbility]);
  const profBonus = getActorProficiencyBonus(attacker);

  // d20 roll
  const roll = rollD20(rng);
  const attackBonus = abilityMod_ + profBonus;
  const totalToHit = roll + attackBonus;

  // Target AC (recalculated to ensure current state)
  const targetAC = calculateArmorClass(defender);

  // Hit check
  const hit = totalToHit >= targetAC;

  const hitOutcome: {
    kind: 'hit' | 'miss';
    roll: number;
    total: number;
    targetAC: number;
    details: string[];
  } = {
    kind: hit ? 'hit' : 'miss',
    roll,
    total: totalToHit,
    targetAC,
    details: [],
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

// Knave Saving Throw Resolution
// Saves: d20 + level + ability modifier vs DC
export function resolveSavingThrow(
  rng: RNG,
  actor: Actor,
  ability: Ability,
  dc: number,
): CheckOutcome {
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

// Knave Ability Check Resolution
// Ability Checks: d20 + ability modifier (no level bonus for simple checks)
// Optional DC for comparison
export function resolveAbilityCheck(
  rng: RNG,
  actor: Actor,
  ability: Ability,
  dc?: number,
): CheckOutcome {
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

// Initiative Resolution
// Initiative: d20 + DEX modifier
export function resolveInitiative(rng: RNG, encounter: Encounter, actors: Record<string, Actor>): InitiativeOutcome {
  const order = Object.values(actors).map((actor) => {
    const roll = rollD20(rng);
    const dexMod = abilityMod(actor.abilities.dex);
    return { actorId: actor.id, value: roll + dexMod, rawRoll: roll, dexMod, dex: actor.abilities.dex } as any;
  });

  order.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    // Tiebreakers: DEX modifier, then DEX score, then random
    if (b.dexMod !== a.dexMod) return b.dexMod - a.dexMod;
    if (b.dex !== a.dex) return b.dex - a.dex;
    return rng() < 0.5 ? -1 : 1;
  });

  return { type: 'initiative', order: order.map(({ actorId, value }) => ({ actorId, value })) };
}

// Contested Check (e.g., opposed ability checks)
// Both actors roll d20 + ability modifier, higher total wins
export function resolveContestedCheck(
  rng: RNG,
  actorA: Actor,
  abilityA: Ability,
  actorB: Actor,
  abilityB: Ability,
): CheckOutcome {
  const modA = abilityMod(actorA.abilities[abilityA]);
  const modB = abilityMod(actorB.abilities[abilityB]);

  const rollA = rollD20(rng);
  const rollB = rollD20(rng);

  const totalA = rollA + modA;
  const totalB = rollB + modB;

  const success = totalA > totalB;

  return {
    type: 'abilityCheck',
    success,
    roll: rollA,
    total: totalA,
    ability: abilityA,
  };
}
