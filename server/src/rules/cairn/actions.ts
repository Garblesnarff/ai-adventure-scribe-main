import {
  CairnAbility,
  CairnActor,
  CairnAttackContext,
  CairnAttackOutcome,
  CairnCriticalDamageOutcome,
  CairnDamagePacket,
  CairnDeathOutcome,
  CairnEncounter,
  CairnFatigueOutcome,
  CairnInitiativeOutcome,
  CairnInventoryItem,
  CairnRestOutcome,
  CairnRestType,
  CairnSaveContext,
  CairnSaveOutcome,
  CairnSpellOutcome,
  getCairnFatigueCount,
  getCairnInventoryRemainingSlots,
  getCairnInventoryUsedSlots,
  getCairnScar,
  isCairnInventoryFull,
} from './state.js';
import {
  buildCairnRNG,
  RNG,
  rollCairnDamage,
  rollCairnSave,
  rollInitiative,
  rollScarTable,
} from './dice.js';

// ============================================================================
// SAVING THROWS
// ============================================================================

// Cairn saving throw: roll d20, must be ≤ ability score
// Natural 1 = always success, natural 20 = always failure
export function resolveCairnSave(
  rng: RNG,
  actor: CairnActor,
  ctx: CairnSaveContext,
): CairnSaveOutcome {
  const targetScore = actor.abilities[ctx.ability] + (ctx.modifier ?? 0);
  const result = rollCairnSave(rng, targetScore, {
    advantage: ctx.advantage,
    disadvantage: ctx.disadvantage,
  });

  return {
    type: 'save',
    success: result.success,
    roll: result.roll,
    target: targetScore,
    ability: ctx.ability,
    automatic: result.automatic,
    advantage: ctx.advantage,
    disadvantage: ctx.disadvantage,
  };
}

// ============================================================================
// COMBAT & DAMAGE
// ============================================================================

// Cairn attack: all attacks hit, roll damage, subtract armor
export function resolveCairnAttack(
  rng: RNG,
  attacker: CairnActor,
  defender: CairnActor,
  ctx: CairnAttackContext,
): CairnAttackOutcome {
  // Roll damage (with impaired/enhanced)
  const damageResult = rollCairnDamage(
    rng,
    ctx.weapon.damageDice,
    ctx.impaired,
    ctx.enhanced,
  );

  let rawDamage = damageResult.damage;

  // Apply armor reduction
  const armorValue = ctx.targetArmor?.value ?? defender.armor?.value ?? 0;
  const armorReduction = Math.min(rawDamage, armorValue);
  const finalDamage = Math.max(0, rawDamage - armorReduction);

  const damagePacket: CairnDamagePacket = {
    amount: rawDamage,
    type: ctx.weapon.damageType,
    armorReduction,
    finalDamage,
  };

  return {
    type: 'attack',
    damage: damagePacket,
    impaired: ctx.impaired,
    enhanced: ctx.enhanced,
    blast: ctx.blast,
  };
}

// ============================================================================
// CRITICAL DAMAGE
// ============================================================================

// Critical Damage occurs when HP drops below 0
// 1. Excess damage is subtracted from STR
// 2. Make STR save to avoid death
// 3. If save succeeds, roll on scar table
export function resolveCairnCriticalDamage(
  rng: RNG,
  actor: CairnActor,
  excessDamage: number,
): CairnCriticalDamageOutcome {
  // Subtract excess damage from STR
  const strLoss = excessDamage;

  // Make STR save to avoid death
  const saveResult = resolveCairnSave(rng, actor, { ability: 'str' });

  let scarRoll: number | undefined;
  let scar: ReturnType<typeof getCairnScar> | undefined;
  let dead = false;

  if (!saveResult.success) {
    // Failed save = death
    dead = true;
  } else {
    // Succeeded save = roll on scar table
    scarRoll = rollScarTable(rng);
    scar = getCairnScar(scarRoll);
  }

  return {
    type: 'criticalDamage',
    strLoss,
    save: saveResult,
    scarRoll,
    scar,
    dead,
  };
}

// ============================================================================
// INITIATIVE
// ============================================================================

export function resolveCairnInitiative(
  rng: RNG,
  encounter: CairnEncounter,
  actors: Record<string, CairnActor>,
): CairnInitiativeOutcome {
  const order = Object.values(actors).map((actor) => {
    const value = rollInitiative(rng, actor.abilities.dex);
    return { actorId: actor.id, value };
  });

  // Sort descending
  order.sort((a, b) => b.value - a.value);

  return {
    type: 'initiative',
    order,
  };
}

// ============================================================================
// REST
// ============================================================================

export function resolveCairnRest(actor: CairnActor, rest: CairnRestType): CairnRestOutcome {
  const effects: string[] = [];
  let hpRestored = 0;
  let fatigueRemoved = 0;

  if (rest === 'short') {
    // Short rest: restore HP to max
    hpRestored = actor.maxHp - actor.currentHp;
    effects.push('HP restored to maximum');
  } else if (rest === 'long') {
    // Long rest (full rest): restore HP and remove all fatigue
    hpRestored = actor.maxHp - actor.currentHp;
    fatigueRemoved = getCairnFatigueCount(actor);
    effects.push('HP restored to maximum');
    effects.push('All fatigue removed');
    if (actor.conditions?.deprived) {
      effects.push('Deprived condition could be removed if needs met');
    }
  }

  return {
    type: 'rest',
    rest,
    hpRestored,
    fatigueRemoved,
    effects,
  };
}

// ============================================================================
// SPELLCASTING & FATIGUE
// ============================================================================

export function resolveCairnCastSpell(
  actor: CairnActor,
  spellName: string,
): CairnSpellOutcome {
  // In Cairn, casting a spell doesn't consume spell slots
  // Instead, it adds fatigue if cast again before rest
  // For simplicity, we'll track if fatigue was added

  const remainingSlots = getCairnInventoryRemainingSlots(actor);
  const fatigueAdded = remainingSlots > 0; // Can only add fatigue if slots available

  return {
    type: 'castSpell',
    spellName,
    fatigueAdded,
    remainingSlots: fatigueAdded ? remainingSlots - 1 : remainingSlots,
  };
}

export function resolveCairnAddFatigue(actor: CairnActor): CairnFatigueOutcome {
  const currentFatigue = getCairnFatigueCount(actor);
  const usedSlots = getCairnInventoryUsedSlots(actor);
  const isFull = usedSlots >= actor.maxInventorySlots;

  return {
    type: 'addFatigue',
    fatigueCount: currentFatigue + 1,
    remainingSlots: getCairnInventoryRemainingSlots(actor) - 1,
    full: isFull,
  };
}

// ============================================================================
// DEATH
// ============================================================================

export function resolveCairnDeath(
  actor: CairnActor,
  cause: 'str_zero' | 'critical_damage' | 'failed_save',
): CairnDeathOutcome {
  return {
    type: 'death',
    cause,
    actorName: actor.name,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Check if actor should die (STR = 0)
export function shouldCairnActorDie(actor: CairnActor): boolean {
  return actor.abilities.str <= 0;
}

// Apply damage to actor (modifies HP, handles critical damage)
export function applyCairnDamage(
  rng: RNG,
  actor: CairnActor,
  damage: number,
): {
  hpLost: number;
  criticalDamage?: CairnCriticalDamageOutcome;
  dead?: boolean;
} {
  const newHp = actor.currentHp - damage;
  const hpLost = actor.currentHp - Math.max(0, newHp);

  // Check for critical damage (HP < 0)
  if (newHp < 0) {
    const excessDamage = Math.abs(newHp);
    const critResult = resolveCairnCriticalDamage(rng, actor, excessDamage);
    return {
      hpLost,
      criticalDamage: critResult,
      dead: critResult.dead || shouldCairnActorDie(actor),
    };
  }

  return { hpLost };
}

// Add fatigue to inventory
export function addCairnFatigue(actor: CairnActor): boolean {
  if (isCairnInventoryFull(actor)) {
    // Inventory full = HP becomes 0
    return false;
  }

  const fatigueItem: CairnInventoryItem = {
    name: 'Fatigue',
    slots: 1,
    type: 'fatigue',
  };

  actor.inventory.push(fatigueItem);
  return true;
}

// Remove all fatigue from inventory
export function removeCairnFatigue(actor: CairnActor): number {
  const beforeCount = actor.inventory.length;
  actor.inventory = actor.inventory.filter(item => item.type !== 'fatigue');
  const afterCount = actor.inventory.length;
  return beforeCount - afterCount;
}
