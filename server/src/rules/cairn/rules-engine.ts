/**
 * Cairn RPG Rules Engine
 *
 * Full implementation of Cairn game system support.
 * Cairn is an adventure game for one facilitator (the Warden) and at least one other player.
 *
 * Key mechanics implemented:
 * - Ability Scores (3-18): STR, DEX, WIL
 * - Saves: Roll d20 ≤ ability score (1 = always success, 20 = always fail)
 * - Combat: All attacks hit, roll damage, subtract armor
 * - Critical Damage: When HP < 0, lose STR, make STR save or die
 * - Death: STR = 0
 * - Hit Protection (HP): resilience/luck, not health
 * - Inventory: 10 slots, fatigue occupies slots
 * - Spellcasting: adds fatigue instead of spell slots
 * - Rest: short rest restores HP, full rest removes fatigue
 * - Scars: d100 table when critical damage save succeeds
 */

import {
  CairnActor,
  CairnAttackOutcome,
  CairnCriticalDamageOutcome,
  CairnDeathOutcome,
  CairnEncounter,
  CairnFatigueOutcome,
  CairnInitiativeOutcome,
  CairnRestOutcome,
  CairnRulesActionRequest,
  CairnRulesActionResult,
  CairnSaveOutcome,
  CairnSpellOutcome,
} from './state.js';
import {
  applyCairnDamage,
  resolveCairnAddFatigue,
  resolveCairnAttack,
  resolveCairnCastSpell,
  resolveCairnCriticalDamage,
  resolveCairnDeath,
  resolveCairnInitiative,
  resolveCairnRest,
  resolveCairnSave,
  shouldCairnActorDie,
} from './actions.js';
import { buildCairnRNG } from './dice.js';

/**
 * Main entry point for Cairn RPG rules engine
 * Resolves actions deterministically based on Cairn mechanics
 */
export function resolveAction(input: CairnRulesActionRequest): CairnRulesActionResult {
  const rng = buildCairnRNG(input.seed);
  const actors = input.actors;
  const encounter: CairnEncounter = input.encounter;

  switch (input.action) {
    case 'save': {
      const actor = requireActor(actors, input.actorId);
      return resolveCairnSave(rng, actor, input.payload) as CairnSaveOutcome;
    }

    case 'attack': {
      const attacker = requireActor(actors, input.actorId);
      const defender = requireActor(actors, input.targetId);
      return resolveCairnAttack(rng, attacker, defender, input.payload) as CairnAttackOutcome;
    }

    case 'damage': {
      const actor = requireActor(actors, input.actorId);
      const damageAmount = input.payload?.amount ?? 0;
      const result = applyCairnDamage(rng, actor, damageAmount);

      if (result.criticalDamage) {
        return result.criticalDamage as CairnCriticalDamageOutcome;
      }

      // Return a simple outcome (could be expanded)
      return {
        type: 'attack',
        damage: {
          amount: damageAmount,
          armorReduction: 0,
          finalDamage: result.hpLost,
        },
      } as CairnAttackOutcome;
    }

    case 'criticalDamage': {
      const actor = requireActor(actors, input.actorId);
      const excessDamage = input.payload?.excessDamage ?? 0;
      return resolveCairnCriticalDamage(rng, actor, excessDamage) as CairnCriticalDamageOutcome;
    }

    case 'initiative': {
      return resolveCairnInitiative(rng, encounter, actors) as CairnInitiativeOutcome;
    }

    case 'rest': {
      const actor = requireActor(actors, input.actorId);
      const restType = input.payload?.rest ?? 'short';
      return resolveCairnRest(actor, restType) as CairnRestOutcome;
    }

    case 'castSpell': {
      const actor = requireActor(actors, input.actorId);
      const spellName = input.payload?.spellName ?? 'Unknown Spell';
      return resolveCairnCastSpell(actor, spellName) as CairnSpellOutcome;
    }

    case 'addFatigue': {
      const actor = requireActor(actors, input.actorId);
      return resolveCairnAddFatigue(actor) as CairnFatigueOutcome;
    }

    case 'death': {
      const actor = requireActor(actors, input.actorId);
      const cause = input.payload?.cause ?? 'str_zero';
      return resolveCairnDeath(actor, cause) as CairnDeathOutcome;
    }

    default:
      throw new Error(`Unsupported Cairn action: ${input.action}`);
  }
}

function requireActor(map: Record<string, CairnActor>, id?: string): CairnActor {
  if (!id) throw new Error('actorId is required');
  const a = map[id];
  if (!a) throw new Error(`Actor not found: ${id}`);
  return a;
}

export default { resolveAction };
