import { describe, it, expect } from 'vitest';

import { recordEncounterOutcome, getDifficultyAdjustment } from '@/services/encounters/telemetry';

describe('Encounter telemetry', () => {
  it('adjusts difficulty factor based on average drain', () => {
    const session = 's1';
    const spec: any = { difficulty: 'medium' };
    recordEncounterOutcome({ sessionId: session, spec, result: { resourcesUsedEst: 0.5 } });
    const f = getDifficultyAdjustment(session, 'medium');
    expect(f).toBeGreaterThan(1);
  });
});
