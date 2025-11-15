import type { EncounterOutcome } from '@/types/encounters';

type DifficultyStats = {
  samples: number;
  avgDrain: number; // moving average 0..1
};

const store = new Map<string, DifficultyStats>();

export function recordEncounterOutcome(outcome: EncounterOutcome) {
  const key = `${outcome.sessionId}:${outcome.spec.difficulty}`;
  const current = store.get(key) ?? { samples: 0, avgDrain: 0 };
  const drain = Math.max(0, Math.min(1, outcome.result.resourcesUsedEst ?? 0));
  const samples = current.samples + 1;
  const avgDrain = current.avgDrain + (drain - current.avgDrain) / samples;
  store.set(key, { samples, avgDrain });
}

export function getDifficultyAdjustment(sessionId: string, difficulty: string): number {
  const key = `${sessionId}:${difficulty}`;
  const s = store.get(key);
  if (!s) return 1;
  // Target ~0.25 drain per encounter; adjust budget mildly
  const target = 0.25;
  const factor = 1 + Math.max(-0.25, Math.min(0.25, s.avgDrain - target)); // clamp ±25%
  return factor;
}
