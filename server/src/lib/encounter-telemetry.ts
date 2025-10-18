type DifficultyStats = {
  samples: number;
  avgDrain: number; // 0..1
};

const store = new Map<string, DifficultyStats>();

export function recordEncounterOutcome(sessionId: string, difficulty: string, drain: number) {
  const key = `${sessionId}:${difficulty}`;
  const current = store.get(key) ?? { samples: 0, avgDrain: 0 };
  const d = Math.max(0, Math.min(1, drain));
  const samples = current.samples + 1;
  const avgDrain = current.avgDrain + (d - current.avgDrain) / samples;
  store.set(key, { samples, avgDrain });
}

export function getDifficultyAdjustment(sessionId: string, difficulty: string): number {
  const key = `${sessionId}:${difficulty}`;
  const s = store.get(key);
  if (!s) return 1;
  const target = 0.25; // target resource drain per encounter
  const factor = 1 + Math.max(-0.25, Math.min(0.25, (s.avgDrain - target)));
  return factor;
}
