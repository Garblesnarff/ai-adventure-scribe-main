/**
 * Adapter to use the OSE rules engine from the main server
 * This file provides simplified interfaces for the MCP server
 */

export interface Actor {
  id: string;
  name: string;
  class?: string;
  level: number;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  attackBonus: number;
  ac: {
    base: number;
    ascending: boolean;
    shieldBonus?: number;
    miscBonus?: number;
  };
  maxHp: number;
  currentHp: number;
  speed: number;
  savingThrows: {
    death: number;
    wands: number;
    paralysis: number;
    breath: number;
    spells: number;
  };
  spellSlots?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, number>>;
  memorizedSpells?: {
    level1?: string[];
    level2?: string[];
    level3?: string[];
    level4?: string[];
    level5?: string[];
    level6?: string[];
  };
  turnUndeadLevel?: number;
}

export interface Weapon {
  name: string;
  melee: boolean;
  ranged: boolean;
  damageDice: string;
  damageType: string;
  twoHanded?: boolean;
  range?: { short: number; medium: number; long: number };
}

// Simplified dice roller
function hashSeed(seed?: string | number): number {
  if (typeof seed === 'number') return seed;
  if (!seed) return Math.floor(Math.random() * 2147483647);

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function rollDice(rng: () => number, notation: string): number {
  const match = notation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return 0;

  const [, numDice, sides, bonus] = match;
  let total = 0;
  for (let i = 0; i < parseInt(numDice); i++) {
    total += Math.floor(rng() * parseInt(sides)) + 1;
  }
  return total + (bonus ? parseInt(bonus) : 0);
}

function rollD20(rng: () => number) {
  const roll = Math.floor(rng() * 20) + 1;
  return { roll };
}

function rollD6(rng: () => number) {
  const roll = Math.floor(rng() * 6) + 1;
  return { roll };
}

function rollUnderAbility(rng: () => number, target: number) {
  const roll = Math.floor(rng() * 20) + 1;
  return { roll, success: roll <= target };
}

// OSE ability modifier
function oseAbilityMod(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return +1;
  if (score <= 17) return +2;
  return +3;
}

// Attack resolution
export function resolveAttack(params: {
  attacker: Actor;
  defender: Actor;
  weapon: Weapon;
  ascending?: boolean;
  seed?: string | number;
}) {
  const rng = mulberry32(hashSeed(params.seed));
  const { roll } = rollD20(rng);
  const isCrit = roll >= 20;
  const isAutoMiss = roll === 1;

  const attackBonus = params.attacker.attackBonus;
  const targetAC = params.ascending ? params.defender.ac.base : 19 - params.defender.ac.base;
  const totalToHit = roll + attackBonus;
  const hit = (isCrit && !isAutoMiss) || (totalToHit >= targetAC && !isAutoMiss);

  let damage = 0;
  if (hit) {
    const baseDamage = rollDice(rng, params.weapon.damageDice);
    damage = isCrit ? baseDamage * 2 : baseDamage;

    if (params.weapon.melee) {
      damage += oseAbilityMod(params.attacker.abilities.str);
    }
  }

  return {
    type: 'attack',
    hit,
    critical: hit && isCrit,
    roll,
    totalToHit,
    targetAC,
    damage: hit ? damage : 0,
  };
}

// Saving throw
export function resolveSavingThrow(params: {
  actor: Actor;
  category: 'death' | 'wands' | 'paralysis' | 'breath' | 'spells';
  seed?: string | number;
}) {
  const rng = mulberry32(hashSeed(params.seed));
  const { roll } = rollD20(rng);
  const targetNumber = params.actor.savingThrows[params.category];
  const success = roll >= targetNumber;

  return {
    type: 'savingThrow',
    success,
    roll,
    targetNumber,
    category: params.category,
  };
}

// Ability check
export function resolveAbilityCheck(params: {
  actor: Actor;
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  seed?: string | number;
}) {
  const rng = mulberry32(hashSeed(params.seed));
  const abilityScore = params.actor.abilities[params.ability];
  const { roll, success } = rollUnderAbility(rng, abilityScore);

  return {
    type: 'abilityCheck',
    success,
    roll,
    target: abilityScore,
    ability: params.ability,
  };
}

// Initiative
export function resolveInitiative(params: {
  actors: Actor[];
  useD6?: boolean;
  seed?: string | number;
}) {
  const rng = mulberry32(hashSeed(params.seed));
  const useD6 = params.useD6 ?? true;

  const order = params.actors.map((actor) => {
    const { roll } = useD6 ? rollD6(rng) : rollD20(rng);
    const dexMod = oseAbilityMod(actor.abilities.dex);
    return {
      actorId: actor.id,
      value: roll + dexMod,
      rawRoll: roll,
      dexMod,
    };
  });

  order.sort((a, b) => b.value - a.value);

  return {
    type: 'initiative',
    order: order.map(({ actorId, value }) => ({ actorId, value })),
  };
}

// Turn undead
export function resolveTurnUndead(params: {
  cleric: Actor;
  undeadHD: number;
  seed?: string | number;
}) {
  const rng = mulberry32(hashSeed(params.seed));
  const clericLevel = params.cleric.turnUndeadLevel ?? params.cleric.level;
  const { roll } = rollD20(rng);

  const baseTarget = 7 + (params.undeadHD - clericLevel);
  const targetNumber = Math.max(2, Math.min(20, baseTarget));
  const success = roll >= targetNumber;

  let numberAffected = 0;
  let destroyed = false;

  if (success) {
    numberAffected = rollDice(rng, '2d6');
    if (clericLevel >= params.undeadHD + 3) {
      destroyed = true;
    }
  }

  return {
    type: 'turnUndead',
    success,
    roll,
    targetNumber,
    undeadHD: params.undeadHD,
    turned: success,
    destroyed,
    numberAffected,
  };
}

// Memorize spell
export function memorizeSpell(params: {
  actor: Actor;
  spellName: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}) {
  const slots = params.actor.spellSlots?.[params.level];
  if (!slots) {
    return {
      type: 'memorizeSpell',
      success: false,
      spellName: params.spellName,
      level: params.level,
      message: 'No spell slots available at this level',
    };
  }

  const levelKey = `level${params.level}` as keyof typeof params.actor.memorizedSpells;
  const memorized = params.actor.memorizedSpells?.[levelKey] ?? [];

  if (memorized.length >= slots) {
    return {
      type: 'memorizeSpell',
      success: false,
      spellName: params.spellName,
      level: params.level,
      message: 'All spell slots at this level are already filled',
    };
  }

  return {
    type: 'memorizeSpell',
    success: true,
    spellName: params.spellName,
    level: params.level,
    slotsRemaining: slots - memorized.length - 1,
  };
}
