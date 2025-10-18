# Targeted Encounter Invocation Hooks — Implementation Spec

This spec describes how to add targeted (non‑UI) encounter invocation hooks to the Dungeon Master (DM) agent so that encounters (combat/exploration/social) are planned, validated, and optionally reported via telemetry at specific narrative beats without exposing any player‑facing controls.

The work is broken into small, verifiable work units with explicit file paths, interfaces, and acceptance criteria so that an LLM with no prior context can implement the task end‑to‑end.

---

## Goals

- Automatically trigger encounter planning/validation inside the DM agent when pacing signals indicate: threat level rises or a rest completes.
- Keep the feature strictly internal (no UI).
- Use existing encounter generation, SRD loading, and rule validation.
- Support adaptive difficulty via telemetry (optional but recommended).

## Non‑Goals

- No new player‑facing UI.
- No non‑SRD content.
- No full combat engine changes here (that is separate).

## Key Concepts and Existing Modules

- DM Agent: `src/agents/dungeon-master-agent.ts`
- Encounter Generator (SRD‑aware): `src/services/encounters/encounter-generator.ts`
- SRD Loader: `src/services/encounters/srd-loader.ts` with data `src/data/srd/monsters.json`
- Rules validation (encounters): `src/agents/rules/validators/encounter-validator.ts`
- Rules Interpreter Agent: `src/agents/rules-interpreter-agent.ts` (invoked via messaging)
- Telemetry (client): `src/services/encounters/telemetry-client.ts`
- Telemetry (server):
  - `server/src/routes/v1/encounters.ts`
  - `server/src/lib/encounter-telemetry.ts`

Environment variables used by client requests: `VITE_API_URL` (defaults to `http://localhost:8888`).

---

## Work Units

### 1) Orchestrator: plan + validate + conclude (no UI)

- Files:
  - Create `src/services/encounters/encounter-orchestrator.ts`
- Add functions:
  - `planAndValidateEncounter(input: EncounterGenerationInput & { party: PartySnapshot })`
    - Calls generator → loads SRD → validates with party → returns `{ spec, validation }`.
  - `concludeEncounter({ sessionId, spec, resourcesUsedEst })`
    - Calls `postEncounterTelemetry` to record outcome for adaptive difficulty.

Acceptance:
- Unit tests can call orchestrator with a party and assert `validation.ok` and shape of `spec`.

### 2) DM Agent hooks for targeted invocation

- File: `src/agents/dungeon-master-agent.ts`
- Add private state and cooldown:
  - `lastEncounterAt: number = 0;`
  - `encounterCooldownMs = 120000` (2 minutes, tune as needed)
- Add method `maybeInvokeEncounterHooks(task, response)` and call it right after updating game state (`updateGameStateFromResponse`).
- Trigger rules:
  - If `sceneStatus.threatLevel` is `medium` or `high` → plan a combat encounter.
  - If the task description contains `(short|long) rest` → plan an exploration encounter.
- Build `EncounterGenerationInput`:
  - `type`: `'combat' | 'exploration'` based on trigger.
  - `sessionId`: from `task.context?.sessionId` (if present) to enable adaptive budget.
  - `world.biome`: use best available context; fallback to `'forest'` for now.
  - `party`: provide a party snapshot; start with a stub, later replace with real party data.
- Call `this.planEncounter(input)` and then `this.validatePlannedEncounter(spec)`.

Acceptance:
- With `threatLevel='high'`, hook runs once per cooldown and enqueues a validation message to Rules Interpreter.
- With a rest phrase in the incoming task description, an exploration template is planned & validated.
- No UI changes.

### 3) Rules Interpreter: encounter validation path

- File: `src/agents/rules-interpreter-agent.ts`
- Behavior:
  - If `task.context.encounterSpec` present, load SRD (if monsters not provided) and call `validateEncounterSpec(spec, monsters, party)`.
  - Include the `encounterValidation` in the message back to DM agent.

Acceptance:
- When sent an `encounterSpec`, the agent returns `{ encounterValidation: { ok, issues, effectiveXp } }`.

### 4) Party‑aware validation

- File: `src/agents/rules/validators/encounter-validator.ts`
- Ensure validation accounts for:
  - Budget tolerance ±10% or ≥25 XP.
  - Excessive hostile count (>12) warning.
  - Immunity/resistance coverage vs party damage types; handle `nonmagical` immunity.
  - Hazard save/DC timing sanity: DC 8–25, timing ∈ {start, end, trigger}.

Acceptance:
- Tests fail when party lacks counters to an enemy’s immunity (including `nonmagical`).
- Tests fail with out‑of‑bounds hazard DC or invalid timing.

### 5) Telemetry (optional but recommended)

- Server endpoints (already available):
  - `POST /v1/encounters/telemetry` body: `{ sessionId, difficulty, resourcesUsedEst }`
  - `GET /v1/encounters/adjustment?sessionId=&difficulty=` returns `{ factor }`
- Client helper: `src/services/encounters/telemetry-client.ts` exposes `postEncounterTelemetry` and `getEncounterAdjustment`.
- Generator uses `sessionId` to fetch an adaptive factor via `getDifficultyAdjustment` (in‑memory via client module for now), adjusting XP budget.

Acceptance:
- Calling `reportEncounterOutcome(sessionId, spec, 0.5)` records telemetry without throwing.
- Subsequent generated encounters for the same session+difficulty adjust budget slightly (>1.0 factor).

---

## Detailed Implementation Notes

### DM Agent code sketch (hooks)

```ts
// src/agents/dungeon-master-agent.ts
private lastEncounterAt = 0;
private readonly encounterCooldownMs = 120000;

private async maybeInvokeEncounterHooks(task: AgentTask, _response: AgentResult) {
  const now = Date.now();
  if (now - this.lastEncounterAt < this.encounterCooldownMs) return;

  const threat = this.gameState.sceneStatus?.threatLevel;
  const justRested = typeof task.description === 'string' && /(short|long)\s+rest/i.test(task.description);

  let trigger: 'none' | 'combat' | 'exploration' = 'none';
  if (threat === 'high' || threat === 'medium') trigger = 'combat';
  else if (justRested) trigger = 'exploration';
  if (trigger === 'none') return;

  const sessionId = task.context?.sessionId as string | undefined;
  const input: EncounterGenerationInput = {
    type: trigger,
    party: { members: [{ level: 3 }] }, // TODO: replace with real party snapshot
    world: { biome: 'forest' },
    requestedDifficulty: trigger === 'combat' ? 'medium' : 'easy',
    sessionId,
  };

  const spec = this.planEncounter(input);
  await this.validatePlannedEncounter(spec);
  this.lastEncounterAt = now;
}
```

### Encounter Orchestrator sketch

```ts
// src/services/encounters/encounter-orchestrator.ts
export async function planAndValidateEncounter(input: EncounterGenerationInput & { party: PartySnapshot }) {
  const spec = generator.generate(input);
  const monsters = loadMonsters();
  const validation = validateEncounterSpec(spec, monsters, input.party);
  return { spec, validation };
}

export async function concludeEncounter({ sessionId, spec, resourcesUsedEst }) {
  await postEncounterTelemetry({ sessionId, difficulty: spec.difficulty, resourcesUsedEst });
}
```

---

## Tests to Add

1) Orchestrator basic happy path
- File: `src/services/encounters/__tests__/orchestrator.test.ts`
- Asserts spec type, validation.ok, and issues array.

2) Party‑aware immunity check
- File: `src/agents/__tests__/encounter-validator-party.test.ts`
- Creates a monster with `nonmagical` immunity and a party with only mundane damage; expects a warning.

3) Hazard DC/timing
- File: `src/services/encounters/__tests__/hazard-validation.test.ts`
- Expects invalid DC/timing to be flagged.

4) DM Agent targeted hooks
- File: `src/agents/__tests__/dm-targeted-hooks.test.ts`
- Mocks messaging service and game state; sets `threatLevel='high'`, asserts `validatePlannedEncounter` is called only once per cooldown.

Note: Update `vitest.config.ts` `test.include` to cover new tests if they are not included by existing globs.

---

## Acceptance Criteria (End‑to‑End)

- When threat level becomes `medium` or `high`, the DM agent triggers a combat encounter planning + validation at most once per 2 minutes.
- When a rest is detected, the DM agent triggers an exploration encounter planning + validation.
- Validation returns structured results with XP budget sanity and R/I/V/hazard checks.
- Telemetry can be posted without errors; subsequent encounters for same session+difficulty show mild budget adjustment.
- No player‑facing UI changes.

---

## Rollout / Flags

- Initially keep hooks enabled with a conservative cooldown. Optionally guard with an env flag:
  - Example: `VITE_DM_HOOKS=on` (client) or feature switch in the DM agent.
- Monitor logs for frequency and validation issues during internal testing.

---

## Troubleshooting

- If SRD monsters fail to load, ensure `src/data/srd/monsters.json` resolves and path alias `@` is configured in `tsconfig.app.json`.
- If tests aren’t discovered, add the test files to `vitest.config.ts` `test.include`.
- If telemetry calls fail, confirm `VITE_API_URL` points to the running backend (default `http://localhost:8888`).

---

## Follow‑Ups (Not part of this task)

- Replace stubbed party snapshot/biome with real campaign/session state.
- Extend social templates and add objective‑driven variations.
- Expand SRD dataset and license headers as needed.
- Add pacing heuristics beyond cooldown (e.g., novelty, recent resource drain).
