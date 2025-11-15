const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

export async function postEncounterTelemetry(params: {
  sessionId: string;
  difficulty: string;
  resourcesUsedEst: number; // 0..1
}) {
  const res = await fetch(`${API_BASE_URL}/v1/encounters/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Telemetry post failed: ${res.status}`);
  return res.json();
}

export async function getEncounterAdjustment(params: { sessionId: string; difficulty: string }) {
  const q = new URLSearchParams({ sessionId: params.sessionId, difficulty: params.difficulty });
  const res = await fetch(`${API_BASE_URL}/v1/encounters/adjustment?${q}`);
  if (!res.ok) throw new Error(`Adjustment fetch failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean; factor: number }>;
}
