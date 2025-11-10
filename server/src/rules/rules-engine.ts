import {
  Actor,
  AttackOutcome,
  CheckOutcome,
  ConcentrationOutcome,
  Encounter,
  InitiativeOutcome,
  OpportunityAttackOutcome,
  RestOutcome,
  RulesActionRequest,
  RulesActionResult,
  SpellSlotOutcome,
} from './state.js';
import { buildRNG } from './actions.js';
import {
  resolveAbilityCheck,
  resolveAttack,
  resolveConcentrationCheck,
  resolveContestedCheck,
  resolveDeathSave,
  resolveInitiative,
  resolveOpportunityAttack,
  resolveRest,
  expendSpellSlot,
  resolveSavingThrow,
} from './actions.js';

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
      const a = requireActor(actors, input.actorId);
      return resolveAbilityCheck(rng, a, input.payload) as CheckOutcome;
    }
    case 'savingThrow': {
      const a = requireActor(actors, input.actorId);
      return resolveSavingThrow(rng, a, input.payload) as CheckOutcome;
    }
    case 'contestedCheck': {
      const a = requireActor(actors, input.actorId);
      const b = requireActor(actors, input.targetId);
      const { aCtx, bCtx } = input.payload ?? {};
      return resolveContestedCheck(rng, a, aCtx, b, bCtx) as CheckOutcome;
    }
    case 'initiative': {
      return resolveInitiative(rng, encounter, actors) as InitiativeOutcome;
    }
    case 'opportunityAttack': {
      const mover = requireActor(actors, input.payload?.moverId);
      const reactor = requireActor(actors, input.payload?.reactorId);
      return resolveOpportunityAttack(mover, reactor, input.payload) as OpportunityAttackOutcome;
    }
    case 'deathSave': {
      const a = requireActor(actors, input.actorId);
      return resolveDeathSave(rng, a);
    }
    case 'concentrationCheck': {
      const a = requireActor(actors, input.actorId);
      return resolveConcentrationCheck(rng, a, input.payload) as ConcentrationOutcome;
    }
    case 'rest': {
      const a = requireActor(actors, input.actorId);
      return resolveRest(a, input.payload?.rest) as RestOutcome;
    }
    case 'expendSpellSlot': {
      const a = requireActor(actors, input.actorId);
      return expendSpellSlot(a, input.payload?.level) as SpellSlotOutcome;
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
