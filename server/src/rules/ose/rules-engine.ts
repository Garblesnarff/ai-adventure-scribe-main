import {
  Actor,
  AttackOutcome,
  CheckOutcome,
  Encounter,
  InitiativeOutcome,
  MemorizeSpellOutcome,
  RestOutcome,
  RulesActionRequest,
  RulesActionResult,
  SaveOutcome,
  TurnUndeadOutcome,
} from './state.js';
import { buildRNG } from './actions.js';
import {
  resolveAbilityCheck,
  resolveAttack,
  resolveInitiative,
  resolveRest,
  resolveSavingThrow,
  resolveTurnUndead,
  memorizeSpell,
} from './actions.js';

/**
 * Main entry point for OSE rules engine
 * Matches the interface of D&D 5E rules engine for consistency
 */
export function resolveAction(input: RulesActionRequest): RulesActionResult {
  const rng = buildRNG(input.seed);
  const actors = input.actors;
  const encounter: Encounter = input.encounter;

  switch (input.action) {
    case 'attack': {
      const attacker = requireActor(actors, input.actorId);
      const defender = requireActor(actors, input.targetId);
      const out = resolveAttack(rng, attacker, defender, input.payload);
      return out as AttackOutcome;
    }

    case 'abilityCheck': {
      const actor = requireActor(actors, input.actorId);
      return resolveAbilityCheck(rng, actor, input.payload) as CheckOutcome;
    }

    case 'savingThrow': {
      const actor = requireActor(actors, input.actorId);
      return resolveSavingThrow(rng, actor, input.payload) as SaveOutcome;
    }

    case 'initiative': {
      // OSE can use d6 or d20 for initiative
      const useD6 = input.payload?.useD6 ?? true;
      return resolveInitiative(rng, encounter, actors, useD6) as InitiativeOutcome;
    }

    case 'rest': {
      const actor = requireActor(actors, input.actorId);
      return resolveRest(rng, actor, input.payload?.rest) as RestOutcome;
    }

    case 'memorizeSpell': {
      const actor = requireActor(actors, input.actorId);
      const { spellName, level } = input.payload ?? {};
      if (!spellName || !level) {
        throw new Error('memorizeSpell requires spellName and level in payload');
      }
      return memorizeSpell(actor, spellName, level) as MemorizeSpellOutcome;
    }

    case 'turnUndead': {
      const actor = requireActor(actors, input.actorId);
      const { undeadHD } = input.payload ?? {};
      if (undeadHD === undefined) {
        throw new Error('turnUndead requires undeadHD in payload');
      }
      return resolveTurnUndead(rng, actor, undeadHD) as TurnUndeadOutcome;
    }

    default:
      throw new Error(`Unsupported action: ${input.action}`);
  }
}

function requireActor(map: Record<string, Actor>, id?: string): Actor {
  if (!id) throw new Error('actorId is required');
  const a = map[id];
  if (!a) throw new Error(`Actor not found: ${id}`);
  return a;
}

export default { resolveAction };
