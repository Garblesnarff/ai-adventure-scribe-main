import {
  Actor,
  AttackOutcome,
  CheckOutcome,
  Encounter,
  InitiativeOutcome,
  RulesActionRequest,
  RulesActionResult,
  Weapon,
} from './state.js';
import { buildRNG } from './actions.js';
import {
  resolveAbilityCheck,
  resolveAttack,
  resolveContestedCheck,
  resolveInitiative,
  resolveSavingThrow,
} from './actions.js';

export function resolveAction(input: RulesActionRequest): RulesActionResult {
  const rng = buildRNG(input.seed);
  const actors = input.actors;

  switch (input.action) {
    case 'attack': {
      const attacker = requireActor(actors, input.actorId);
      const defender = requireActor(actors, input.targetId);
      const weapon = input.payload?.weapon as Weapon;
      if (!weapon) throw new Error('weapon is required in payload for attack action');
      const out = resolveAttack(rng, attacker, defender, weapon);
      return out as AttackOutcome;
    }

    case 'abilityCheck': {
      const actor = requireActor(actors, input.actorId);
      const { ability, dc } = input.payload ?? {};
      if (!ability) throw new Error('ability is required in payload');
      return resolveAbilityCheck(rng, actor, ability, dc) as CheckOutcome;
    }

    case 'savingThrow': {
      const actor = requireActor(actors, input.actorId);
      const { ability, dc } = input.payload ?? {};
      if (!ability || dc === undefined) {
        throw new Error('ability and dc are required in payload for savingThrow');
      }
      return resolveSavingThrow(rng, actor, ability, dc) as CheckOutcome;
    }

    case 'initiative': {
      return resolveInitiative(rng, input.encounter, actors) as InitiativeOutcome;
    }

    case 'move': {
      // Move action doesn't require dice rolls, just consume movement
      const actor = requireActor(actors, input.actorId);
      const distance = input.payload?.distance ?? 0;
      return {
        type: 'abilityCheck',
        success: true,
        roll: 0,
        total: 0,
        ability: 'dex',
      } as CheckOutcome;
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
