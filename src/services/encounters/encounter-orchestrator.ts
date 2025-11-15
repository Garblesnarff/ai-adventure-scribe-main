import generator from './encounter-generator';
import { loadMonsters } from './srd-loader';
import { postEncounterTelemetry } from './telemetry-client';

import type { EncounterGenerationInput, EncounterSpec, PartySnapshot } from '@/types/encounters';

import { validateEncounterSpec } from '@/agents/rules/validators/encounter-validator';

export async function planAndValidateEncounter(
  input: EncounterGenerationInput & { party: PartySnapshot },
): Promise<{
  spec: EncounterSpec;
  validation: { ok: boolean; issues: string[]; effectiveXp: number };
}> {
  const spec = generator.generate(input);
  const monsters = loadMonsters();
  const validation = validateEncounterSpec(spec, monsters, input.party);
  return { spec, validation };
}

export async function concludeEncounter(params: {
  sessionId: string;
  spec: EncounterSpec;
  resourcesUsedEst: number;
}): Promise<void> {
  await postEncounterTelemetry({
    sessionId: params.sessionId,
    difficulty: params.spec.difficulty,
    resourcesUsedEst: params.resourcesUsedEst,
  });
}
