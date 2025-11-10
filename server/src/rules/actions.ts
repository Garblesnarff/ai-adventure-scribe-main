import {
  Ability,
  abilityMod,
  Actor,
  AttackContext,
  AttackOutcome,
  CheckContext,
  CheckOutcome,
  ConcentrationCheckContext,
  ConcentrationOutcome,
  coverACBonus,
  DamageOutcome,
  DamagePacket,
  DeathSaveOutcome,
  DeathSaveResult,
  Encounter,
  getActorProficiencyBonus,
  InitiativeOutcome,
  OpportunityAttackContext,
  OpportunityAttackOutcome,
  passivePerception,
  Resistances,
  RestOutcome,
  RestType,
  SaveContext,
  SpellSlotOutcome,
} from './state.js';
import { AdvantageState, hashSeed, mulberry32, RNG, rollD20, rollDice } from './dice.js';

export function buildRNG(seed?: string | number): RNG {
  return mulberry32(hashSeed(seed));
}

function computeAttackBonus(attacker: Actor, ability: Ability, proficient: boolean, magicalBonus?: number) {
  const mod = abilityMod(attacker.abilities[ability]);
  const prof = proficient ? getActorProficiencyBonus(attacker) : 0;
  return mod + prof + (magicalBonus ?? 0);
}

export function resolveAttack(
  rng: RNG,
  attacker: Actor,
  defender: Actor,
  ctx: AttackContext & AdvantageState,
): AttackOutcome {
  const usedAbility: Ability = ctx.attackAbilityOverride ?? ctx.weapon.ability;
  const proficient = ctx.proficient ?? ctx.weapon.proficient;
  const attackBonus = computeAttackBonus(attacker, usedAbility, proficient, ctx.weapon.magicalBonus);

  // cover handling
  const coverBonus = ctx.cover ? coverACBonus(ctx.cover) : 0;
  if (ctx.cover === 'full' || coverBonus >= 999) {
    return {
      type: 'attack',
      hit: {
        kind: 'blocked',
        roll: 0,
        total: 0,
        targetAC: defender.ac.base + (defender.ac.shieldBonus ?? 0) + (defender.ac.miscBonus ?? 0) + coverBonus,
        details: ['Target has full cover'],
      },
      expended: { actionAvailable: false },
    } as AttackOutcome;
  }

  // Apply inspiration from actor if available and not otherwise specified
  const useInspiration = !ctx.advantage && !ctx.disadvantage && !!attacker.conditions?.inspiration;
  const rollRes = rollD20(rng, { advantage: ctx.advantage || useInspiration, disadvantage: ctx.disadvantage });
  const isCrit = (rollRes.roll >= (ctx.criticalOn ?? 20));
  const baseAC = defender.ac.base + (defender.ac.shieldBonus ?? 0) + (defender.ac.miscBonus ?? 0) + coverBonus;
  const totalToHit = rollRes.roll + attackBonus;

  const hit: boolean = isCrit || totalToHit >= baseAC;
  const details: string[] = [];
  if (ctx.advantage || useInspiration) details.push('advantage');
  if (useInspiration) details.push('inspiration');
  if (ctx.disadvantage) details.push('disadvantage');
  if (proficient) details.push('proficient');

  const hitOutcome = {
    kind: hit ? 'hit' : 'miss',
    critical: hit ? isCrit : false,
    roll: rollRes.roll,
    total: totalToHit,
    targetAC: baseAC,
    details,
  } as const;

  let damage: DamageOutcome | undefined = undefined;
  if (hit) {
    // roll weapon damage, double dice on crit (SRD 5.1)
    const weaponDice = ctx.weapon.damageDice;
    const weaponDamage = isCrit ? rollDice(rng, weaponDice.replace(/^(\d+)d/, (_, c) => `${parseInt(c, 10) * 2}d`)) : rollDice(rng, weaponDice);
    const packets: DamagePacket[] = [
      { amount: weaponDamage, type: ctx.weapon.damageType, critical: isCrit },
      ...(ctx.bonusDamageDice?.map((b) => ({ amount: rollDice(rng, isCrit ? b.dice.replace(/^(\d+)d/, (_, c) => `${parseInt(c, 10) * 2}d`) : b.dice), type: b.type, critical: isCrit })) ?? []),
    ];
    damage = applyDamagePackets(defender, packets);
  }

  return {
    type: 'attack',
    hit: hitOutcome,
    damage,
    expended: { actionAvailable: false },
    usedInspiration: useInspiration,
  };
}

export function applyDamagePackets(target: Actor, packets: DamagePacket[]): DamageOutcome {
  const res = target.resistances ?? {} as Resistances;
  let totalBefore = 0;
  let totalAfter = 0;
  const breakdown: Array<{ type: typeof packets[number]['type']; amount: number; adjusted: number; reason?: string }> = [];
  for (const p of packets) {
    totalBefore += p.amount;
    let adjusted = p.amount;
    let reason: string | undefined = undefined;
    if (res.immune?.includes(p.type)) {
      adjusted = 0;
      reason = 'immune';
    } else if (res.resistant?.includes(p.type)) {
      adjusted = Math.floor(p.amount / 2);
      reason = 'resistant';
    } else if (res.vulnerable?.includes(p.type)) {
      adjusted = p.amount * 2;
      reason = 'vulnerable';
    }
    totalAfter += adjusted;
    breakdown.push({ type: p.type, amount: p.amount, adjusted, reason });
  }
  return {
    input: packets,
    totalBeforeReduction: totalBefore,
    totalAfterReduction: totalAfter,
    breakdown,
  };
}

export function resolveAbilityCheck(rng: RNG, actor: Actor, ctx: CheckContext): CheckOutcome {
  const mod = abilityMod(actor.abilities[ctx.ability]);
  const prof = ctx.proficient ? getActorProficiencyBonus(actor) : 0;
  const useInspiration = !ctx.advantage && !ctx.disadvantage && !!actor.conditions?.inspiration;
  const res = rollD20(rng, { advantage: ctx.advantage || useInspiration, disadvantage: ctx.disadvantage });
  const total = res.roll + mod + prof;
  const success = ctx.dc !== undefined ? total >= ctx.dc : undefined;
  return {
    type: 'abilityCheck',
    success,
    dc: ctx.dc,
    rolls: [{ actorId: actor.id, roll: res.roll, total, advantage: (ctx.advantage || useInspiration), disadvantage: ctx.disadvantage }],
    usedInspiration: useInspiration,
  };
}

export function resolveSavingThrow(rng: RNG, actor: Actor, ctx: SaveContext): CheckOutcome {
  const mod = abilityMod(actor.abilities[ctx.ability]);
  const isProf = ctx.proficient ?? !!actor.savingThrowProficiencies?.[ctx.ability];
  const prof = isProf ? getActorProficiencyBonus(actor) : 0;
  const useInspiration = !ctx.advantage && !ctx.disadvantage && !!actor.conditions?.inspiration;
  const res = rollD20(rng, { advantage: ctx.advantage || useInspiration, disadvantage: ctx.disadvantage });
  const total = res.roll + mod + prof;
  const success = total >= ctx.dc;
  return {
    type: 'savingThrow',
    success,
    dc: ctx.dc,
    rolls: [{ actorId: actor.id, roll: res.roll, total, advantage: (ctx.advantage || useInspiration), disadvantage: ctx.disadvantage }],
    usedInspiration: useInspiration,
  };
}

export function resolveContestedCheck(
  rng: RNG,
  a: Actor,
  aCtx: CheckContext,
  b: Actor,
  bCtx: CheckContext,
): CheckOutcome {
  const aRes = resolveAbilityCheck(rng, a, aCtx);
  const bRes = resolveAbilityCheck(rng, b, bCtx);
  if (!aRes.rolls[0] || !bRes.rolls[0]) {
    throw new Error('Contested check requires valid rolls');
  }
  const aTotal = aRes.rolls[0].total;
  const bTotal = bRes.rolls[0].total;
  const winnerId = aTotal === bTotal ? (abilityMod(a.abilities.dex) >= abilityMod(b.abilities.dex) ? a.id : b.id) : (aTotal > bTotal ? a.id : b.id);
  return {
    type: 'contestedCheck',
    rolls: [...aRes.rolls, ...bRes.rolls],
    winnerId,
  };
}

export function resolveInitiative(rng: RNG, encounter: Encounter, actors: Record<string, Actor>): InitiativeOutcome {
  const order = Object.values(actors).map((actor) => {
    const { roll } = rollD20(rng);
    const dexMod = abilityMod(actor.abilities.dex);
    return { actorId: actor.id, value: roll + dexMod, rawRoll: roll, dexMod, dex: actor.abilities.dex } as any;
  });
  order.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    // tiebreakers: Dex mod then Dex score, then coin flip
    if (b.dexMod !== a.dexMod) return b.dexMod - a.dexMod;
    if (b.dex !== a.dex) return b.dex - a.dex;
    return rng() < 0.5 ? -1 : 1;
  });
  return { type: 'initiative', order: order.map(({ actorId, value }) => ({ actorId, value })) };
}

export function resolveOpportunityAttack(
  mover: Actor,
  reactor: Actor,
  ctx: OpportunityAttackContext,
  reactorTurnEconomy?: { reactionAvailable: boolean },
): OpportunityAttackOutcome {
  const triggered = ctx.inReachBefore && !ctx.inReachAfter && (reactorTurnEconomy?.reactionAvailable ?? true);
  return { type: 'opportunityAttack', triggered, reactorId: reactor.id, moverId: mover.id };
}

export function resolveDeathSave(rng: RNG, actor: Actor): DeathSaveOutcome {
  const current = actor.conditions?.deathSaves ?? { successes: 0, failures: 0 };
  const { roll } = rollD20(rng);
  let result: DeathSaveResult = { success: false, successes: current.successes, failures: current.failures };
  if (roll === 1) {
    result.criticalFailure = true;
    result.failures += 2;
  } else if (roll === 20) {
    result.criticalSuccess = true;
    result.success = true;
    result.successes += 1;
  } else if (roll >= 10) {
    result.success = true;
    result.successes += 1;
  } else {
    result.failures += 1;
  }
  if (result.successes >= 3) {
    result.stabilized = true;
  }
  if (result.failures >= 3) {
    result.dead = true;
  }
  return { type: 'deathSave', result };
}

export function resolveConcentrationCheck(rng: RNG, actor: Actor, ctx: ConcentrationCheckContext): ConcentrationOutcome {
  const dc = Math.max(10, Math.floor(ctx.damageTaken / 2));
  const conMod = abilityMod(actor.abilities.con);
  const { roll } = rollD20(rng);
  const total = roll + conMod;
  const maintained = total >= dc;
  return { type: 'concentrationCheck', maintained, dc, roll, total };
}

export function resolveRest(actor: Actor, rest: RestType): RestOutcome {
  const effects: string[] = [];
  if (rest === 'long') {
    effects.push('restore hit points to max');
    effects.push('restore all spell slots');
  } else {
    effects.push('regain some hit dice (not tracked)');
  }
  return { type: 'rest', rest, effects };
}

export function expendSpellSlot(actor: Actor, level: 1|2|3|4|5|6|7|8|9): SpellSlotOutcome {
  const slots = actor.spellSlots?.[level];
  if (!slots) return { type: 'expendSpellSlot', level, success: false };
  if (slots.expended >= slots.total) return { type: 'expendSpellSlot', level, success: false };
  const remaining = slots.total - (slots.expended + 1);
  return { type: 'expendSpellSlot', level, success: true, remaining };
}

export function perceptionInfo(actor: Actor): { passivePerception: number } {
  return { passivePerception: passivePerception(actor) };
}

export function calculateDCFromSpellcasting(ability: Ability, actor: Actor): number {
  const mod = abilityMod(actor.abilities[ability]);
  const prof = getActorProficiencyBonus(actor);
  return 8 + mod + prof;
}
