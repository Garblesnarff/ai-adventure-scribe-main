import { EncounterSpec, MonsterDef, PartySnapshot } from '@/types/encounters';

export interface EncounterValidation {
  ok: boolean;
  issues: string[];
  effectiveXp: number;
}

// Minimal dataset surface for validation; caller can pass full SRD list.
export function validateEncounterSpec(
  spec: EncounterSpec,
  monsters: MonsterDef[],
  party?: PartySnapshot,
): EncounterValidation {
  const issues: string[] = [];

  // Build lookup
  const byId = new Map(monsters.map((m) => [m.id, m] as const));

  // Sanity: hostiles exist
  if (!spec.participants.hostiles.length) {
    issues.push('No hostiles specified.');
  }

  // Validate refs and compute effective XP using basic multipliers
  let rawCount = 0;
  let totalRawXp = 0;

  for (const h of spec.participants.hostiles) {
    const def = byId.get(h.ref);
    if (!def) {
      issues.push(`Unknown monster ref: ${h.ref}`);
      continue;
    }
    rawCount += h.count;
    totalRawXp += def.xp * h.count;
    // Basic R/I/V coverage checks if party given
    if (party && (def.resistances || def.immunities || def.vulnerabilities)) {
      const partyDamage = new Set<string>();
      for (const m of party.members) (m.damageTypes ?? []).forEach((t) => partyDamage.add(t));
      const hasMagic = party.members.some((m) => m.hasMagicalAttacks);
      const hasNonmagicalImmunity = def.immunities?.some((t) => /nonmagical/i.test(t));
      if (
        (def.immunities?.some((t) => partyDamage.has(t)) && !hasMagic) ||
        (hasNonmagicalImmunity && !hasMagic)
      ) {
        issues.push(`Party may lack counters: ${def.name} immune to ${def.immunities.join(', ')}`);
      }
      if (def.resistances?.every((t) => partyDamage.has(t)) && !hasMagic) {
        issues.push(`Low damage diversity vs ${def.name} resistances.`);
      }
    }
  }

  const mult = encounterMultiplier(rawCount);
  let effectiveXp = Math.round(totalRawXp * mult);

  // Budget tolerance ±10% (or 25 XP minimum)
  const tol = Math.max(25, Math.round(spec.xpBudget * 0.1));
  if (Math.abs(effectiveXp - spec.xpBudget) > tol) {
    issues.push(
      `Effective XP ${effectiveXp} deviates from budget ${spec.xpBudget} by more than ${tol}.`,
    );
  }

  // Guard against extreme swarm
  if (rawCount > 12) {
    issues.push(`Too many hostiles (${rawCount}); consider fewer higher-CR creatures.`);
  }

  // Save/DC timing sanity for hazards
  if (spec.hazards?.length) {
    for (const hz of spec.hazards) {
      if (hz.save) {
        const { dc, timing } = hz.save;
        if (dc < 8 || dc > 25) {
          issues.push(`Hazard DC ${dc} out of typical bounds (8-25).`);
        }
        if (!['start', 'end', 'trigger'].includes(timing)) {
          issues.push(`Invalid hazard save timing: ${timing}`);
        }
      }
    }
  }

  return { ok: issues.length === 0, issues, effectiveXp };
}

function encounterMultiplier(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  return 3;
}
