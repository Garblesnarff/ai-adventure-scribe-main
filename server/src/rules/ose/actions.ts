import {
  Actor,
  AttackContext,
  AttackOutcome,
  CheckContext,
  CheckOutcome,
  DamageOutcome,
  DamagePacket,
  Encounter,
  InitiativeOutcome,
  MemorizeSpellOutcome,
  oseAbilityMod,
  Resistances,
  RestOutcome,
  RestType,
  SaveContext,
  SaveOutcome,
  TurnUndeadOutcome,
} from './state.js';
import { hashSeed, mulberry32, RNG, rollD20, rollD6, rollDice, rollUnderAbility } from './dice.js';

export function buildRNG(seed?: string | number): RNG {
  return mulberry32(hashSeed(seed));
}

// Attack resolution for OSE
export function resolveAttack(
  rng: RNG,
  attacker: Actor,
  defender: Actor,
  ctx: AttackContext,
): AttackOutcome {
  const attackBonus = attacker.attackBonus + (ctx.attackBonusModifier ?? 0);

  // OSE uses either ascending AC or descending AC (THAC0)
  const { roll } = rollD20(rng);
  const isCrit = roll >= (ctx.criticalOn ?? 20);
  const isAutoMiss = roll === 1;

  let hit: boolean;
  let totalToHit: number;

  if (ctx.ascending) {
    // Ascending AC: roll + attack bonus >= AC
    totalToHit = roll + attackBonus;
    hit = (isCrit && !isAutoMiss) || (totalToHit >= ctx.targetAC && !isAutoMiss);
  } else {
    // Descending AC (THAC0): THAC0 - roll - bonuses <= target AC
    // For simplicity, we'll use ascending internally
    const ascendingAC = 19 - ctx.targetAC;
    totalToHit = roll + attackBonus;
    hit = (isCrit && !isAutoMiss) || (totalToHit >= ascendingAC && !isAutoMiss);
  }

  const details: string[] = [];
  if (ctx.weapon.melee) details.push('melee');
  if (ctx.weapon.ranged) details.push('ranged');

  const hitOutcome = {
    kind: hit ? 'hit' : 'miss',
    critical: hit ? isCrit : false,
    roll,
    total: totalToHit,
    targetAC: ctx.targetAC,
    details,
  } as const;

  let damage: DamageOutcome | undefined = undefined;
  if (hit) {
    // Roll weapon damage
    const weaponDice = ctx.weapon.damageDice;
    // OSE critical hits don't double dice like 5E - they typically do max damage or double damage (variant)
    // We'll use double damage for crits (common house rule)
    const baseDamage = rollDice(rng, weaponDice);
    const weaponDamage = isCrit ? baseDamage * 2 : baseDamage;

    // Add strength bonus for melee attacks
    let damageBonus = ctx.damageBonusModifier ?? 0;
    if (ctx.weapon.melee) {
      damageBonus += oseAbilityMod(attacker.abilities.str);
    }

    const packets: DamagePacket[] = [
      { amount: weaponDamage + damageBonus, type: ctx.weapon.damageType, critical: isCrit },
    ];
    damage = applyDamagePackets(defender, packets);
  }

  return {
    type: 'attack',
    hit: hitOutcome,
    damage,
    expended: { actionAvailable: false },
  };
}

export function applyDamagePackets(target: Actor, packets: DamagePacket[]): DamageOutcome {
  const res = target.resistances ?? ({} as Resistances);
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

// Ability check (roll under ability score on d20)
export function resolveAbilityCheck(rng: RNG, actor: Actor, ctx: CheckContext): CheckOutcome {
  const abilityScore = actor.abilities[ctx.ability];
  const target = ctx.target ?? abilityScore;
  const { roll, success } = rollUnderAbility(rng, target);

  return {
    type: 'abilityCheck',
    success,
    target,
    roll,
    abilityScore,
    details: [`Roll under ${target}`],
  };
}

// Saving throw (roll d20, meet or beat target number)
export function resolveSavingThrow(rng: RNG, actor: Actor, ctx: SaveContext): SaveOutcome {
  const targetNumber = ctx.targetNumber ?? actor.savingThrows[ctx.category];
  const { roll } = rollD20(rng);
  const success = roll >= targetNumber;

  const details: string[] = [];
  if (ctx.magic) details.push('magical');

  return {
    type: 'savingThrow',
    success,
    category: ctx.category,
    targetNumber,
    roll,
    details,
  };
}

// Initiative (typically d6 for OSE, but can be individual d20)
export function resolveInitiative(rng: RNG, encounter: Encounter, actors: Record<string, Actor>, useD6: boolean = true): InitiativeOutcome {
  const order = Object.values(actors).map((actor) => {
    const { roll } = useD6 ? rollD6(rng) : rollD20(rng);
    const dexMod = oseAbilityMod(actor.abilities.dex);
    return {
      actorId: actor.id,
      value: roll + dexMod,
      rawRoll: roll,
      dexMod,
      dex: actor.abilities.dex
    } as any;
  });

  order.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    // Tiebreakers: Dex score
    if (b.dex !== a.dex) return b.dex - a.dex;
    return rng() < 0.5 ? -1 : 1;
  });

  return { type: 'initiative', order: order.map(({ actorId, value }) => ({ actorId, value })) };
}

// Rest mechanics (OSE)
export function resolveRest(rng: RNG, actor: Actor, rest: RestType): RestOutcome {
  const effects: string[] = [];
  let hpRestored = 0;

  if (rest === 'long') {
    // 8+ hours of rest: restore 1d3 HP
    hpRestored = rollDice(rng, '1d3');
    effects.push(`restore ${hpRestored} HP`);
    effects.push('memorize new spells (if spellcaster)');
  } else if (rest === 'short') {
    // ~1 hour rest: no mechanical benefit in base OSE
    effects.push('catch breath, tend wounds (no HP restoration)');
  } else if (rest === 'turn') {
    // 10 minutes (1 turn): no mechanical benefit
    effects.push('brief rest (no HP restoration)');
  }

  return { type: 'rest', rest, hpRestored, effects };
}

// Memorize spell (Vancian magic)
export function memorizeSpell(actor: Actor, spellName: string, level: 1 | 2 | 3 | 4 | 5 | 6): MemorizeSpellOutcome {
  const slots = actor.spellSlots?.[level];
  if (!slots) {
    return { type: 'memorizeSpell', success: false, spellName, level };
  }

  const memorized = actor.memorizedSpells?.[`level${level}` as keyof typeof actor.memorizedSpells] ?? [];
  if (memorized.length >= slots) {
    return { type: 'memorizeSpell', success: false, spellName, level };
  }

  const slotsRemaining = slots - memorized.length - 1;
  return { type: 'memorizeSpell', success: true, spellName, level, slotsRemaining };
}

// Turn Undead (Cleric ability)
export function resolveTurnUndead(rng: RNG, cleric: Actor, undeadHD: number): TurnUndeadOutcome {
  const clericLevel = cleric.turnUndeadLevel ?? cleric.level;
  const { roll } = rollD20(rng);

  // Simplified turn undead table
  // Base target: 7 + (undead HD - cleric level)
  // This is a simplified version; real OSE has a detailed table
  const baseTarget = 7 + (undeadHD - clericLevel);
  const targetNumber = Math.max(2, Math.min(20, baseTarget));

  const success = roll >= targetNumber;
  let destroyed = false;
  let numberAffected = 0;

  if (success) {
    // Roll 2d6 for number affected
    numberAffected = rollDice(rng, '2d6');

    // If cleric level is 3+ higher than undead HD, they're destroyed instead of turned
    if (clericLevel >= undeadHD + 3) {
      destroyed = true;
    }
  }

  return {
    type: 'turnUndead',
    success,
    roll,
    undeadHD,
    turned: success,
    destroyed,
    numberAffected: success ? numberAffected : 0,
  };
}

// Calculate THAC0 from attack bonus (for descending AC systems)
export function calculateTHAC0(attackBonus: number): number {
  // THAC0 = 20 - attack bonus (simplified conversion)
  return 20 - attackBonus;
}

// Helper: Get melee damage bonus from strength
export function getMeleeDamageBonus(actor: Actor): number {
  return oseAbilityMod(actor.abilities.str);
}

// Helper: Get missile attack bonus from dexterity
export function getMissileAttackBonus(actor: Actor): number {
  return oseAbilityMod(actor.abilities.dex);
}

// Helper: Get AC bonus from dexterity
export function getACBonusFromDex(actor: Actor): number {
  return oseAbilityMod(actor.abilities.dex);
}
