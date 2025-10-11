 # Remediation Plan: Combat Loop, Memory Importance Range, and WebGL Context Loss
 
 This document defines a precise, implementation‑ready plan to fix three issues:
 
 - Redundant AI (Gemini) calls during combat
 - Memory importance scores exceeding the 1–5 range
 - WebGL context loss in the 3D dice renderer
 
 It contains work units, specific file‑level edits, code snippets, tests, acceptance criteria, risks, and rollback notes. No code changes are applied by this document; this is the blueprint to implement.
 
 ---
 
 ## 0) Context Summary (Observed Code Paths)
 
 - Player flow: `MessageHandler` → `useAIResponse.getAIResponse` → `AIService.chatWithDM` (Gemini)
 - Combat integration: `GameContentInner` → `use-combat-ai-integration`
   - On combat events it calls `callEdgeFunction('dm-agent-execute')`. In DEV/local this falls back to `LocalFallbackStrategy` which calls `AIService.chatWithDM` again (duplicate LLM calls)
 - Memory extraction: `useMemoryCreation` → `utils/memory/classification` → `utils/memory/importance`
 - Dice 3D: `components/DiceRollEmbed.tsx` uses `@react-three/fiber` Canvas without context loss handlers
 
 ---
 
 ## 1) Redundant AI Calls in Combat
 
 ### Root Cause Hypothesis
 
 - In local/DEV mode, `use-combat-ai-integration` triggers `callEdgeFunction('dm-agent-execute')`.
 - `LocalFallbackStrategy` executes `AIService.chatWithDM`, while the original chat for the same player message is already in‑flight.
 - Additional loops come from unguarded combat start/end transitions and phase updates.
 
 ### Objectives
 
 - One LLM call per player message (no cascaded calls from combat event narration in local mode).
 - Idempotent combat start/phase transitions.
 - Throttled/guarded combat event narration to avoid re‑entrant AI calls.
 
 ### Work Units (WU)
 
 #### WU‑1.1: Dedupe in‑flight chat calls (2s TTL) in `AIService`
 
 - File: `ai-adventure-scribe-main/src/services/ai-service.ts`
 - Add a static in‑flight map to reuse the same Promise for identical (sessionId + message + history length) within a short window.
 
 Snippet (add near top and at start of `chatWithDM`):
 
 ```ts
 // top-level of ai-service.ts
 const inFlight = new Map<string, { ts: number; promise: Promise<any> }>();
 const DEDUPE_MS = 2000;
 
 function keyFor(sessionId: string | undefined, message: string, historyLen: number) {
   return `${sessionId || 'nosession'}|${message.slice(0, 256)}|${historyLen}`;
 }
 ```
 
 ```ts
 // at start of chatWithDM
 const key = keyFor(params.context?.sessionId, params.message, (params.conversationHistory || []).length);
 const now = Date.now();
 for (const [k, v] of inFlight) if (now - v.ts > DEDUPE_MS) inFlight.delete(k);
 if (inFlight.has(key)) return inFlight.get(key)!.promise;
 const p = (async () => { /* existing method body */ })();
 inFlight.set(key, { ts: now, promise: p });
 return p;
 ```
 
 #### WU‑1.2: Guard repeated message processing in `useAIResponse`
 
 - File: `ai-adventure-scribe-main/src/hooks/use-ai-response.ts`
 - Use a ref to remember the last processed message signature and skip if identical.
 
 Snippet:
 
 ```ts
 const lastSigRef = useRef<string>('');
 const sig = `${sessionId}|${latestMessage.text}|${messages.length}`;
 if (lastSigRef.current === sig) return cachedPrevEnhanced; // or safely no-op
 lastSigRef.current = sig;
 ```
 
 #### WU‑1.3: Prevent duplicate combat start in `use-combat-ai-integration`
 
 - File: `ai-adventure-scribe-main/src/hooks/use-combat-ai-integration.ts`
 - Add an `isStartingCombatRef` flag; if `shouldStartCombat` is true while the flag is set, ignore subsequent starts until resolved.
 
 Snippet:
 
 ```ts
 const isStartingCombatRef = useRef(false);
 if (detection.shouldStartCombat && detection.enemies?.length && !isStartingCombatRef.current) {
   isStartingCombatRef.current = true;
   try { await startCombat(sessionId!, participants); } finally { isStartingCombatRef.current = false; }
 }
 ```
 
 #### WU‑1.4: Phase update should be idempotent
 
 - File: `ai-adventure-scribe-main/src/hooks/use-ai-response.ts`
 - Replace:
 
 ```ts
 if (result.combatDetection?.isCombat && !gameState.isInCombat) setGamePhase('combat');
 ```
 
 with:
 
 ```ts
 if (result.combatDetection?.isCombat && gameState.currentPhase !== 'combat') setGamePhase('combat');
 ```
 
 #### WU‑1.5: Throttle/disable DM narration fallback in local mode
 
 - Files:
   - `ai-adventure-scribe-main/src/services/ai-execution/LocalFallbackStrategy.ts`
   - `ai-adventure-scribe-main/src/hooks/use-combat-ai-integration.ts`
 - Options (choose one or combine):
   1) Add env flag `VITE_ENABLE_COMBAT_DM_NARRATION` default false in DEV; when false, `LocalFallbackStrategy` returns a lightweight stub without calling `AIService.chatWithDM`:
 
      ```ts
      if (!import.meta.env.VITE_ENABLE_COMBAT_DM_NARRATION) {
        return { response: '', narrationSegments: [] };
      }
      ```
 
   2) Introduce a per‑session cooldown (e.g., 5s) inside `LocalFallbackStrategy`; maintain a static `lastNarrationAt` map and skip within window.
 
   3) In `use-combat-ai-integration.processCombatEvent`, only narrate at `ROUND_START` (not on every `ACTION_TAKEN`) unless a flag is enabled.
 
 ### Tests
 
 - Unit: mock `AIService` to ensure only one call for a given player message even when combat detection triggers.
 - Integration: simulate a message that starts combat; assert logs show a single "Using local Gemini API for chat" for chat + zero or throttled narrations.
 - E2E (manual): enter battle → verify no rapid duplicate DM messages or repeating API logs.
 
 ### Acceptance Criteria
 
 - For a message that starts combat, exactly one primary Gemini call per message; no repeating calls caused by combat events within 2 seconds.
 - Combat transitions (start/end) happen once per trigger.
 
 ### Risk & Rollback
 
 - Risk: Over‑deduping could block legitimate quick successive messages. Mitigate with 2s TTL.
 - Rollback: Remove dedupe and flags; revert phase check.
 
 ---
 
 ## 2) Memory Importance > 5
 
 ### Root Cause
 
 - `calculateImportance` returns 1–10; `processContent` forwards this raw score; database/UI expect 1–5. `useMemoryCreation` clamps, causing warnings.
 
 ### Objective
 
 - Produce 1–5 importance upstream so the clamp rarely triggers.
 
 ### Work Units (WU)
 
 #### WU‑2.1: Normalize score in classification
 
 - File: `ai-adventure-scribe-main/src/utils/memory/classification.ts`
 - After computing `importance` and applying `baseImportance`, normalize to 1–5.
 
 Snippet:
 
 ```ts
 const raw = Math.max(importance, baseImportance); // raw ~ 1..10
 const normalized = Math.min(5, Math.max(1, Math.round(raw / 2)));
 importance = normalized;
 ```
 
 #### WU‑2.2 (docstring): Clarify `calculateImportance` returns 1–10 for internal weighting; callers must normalize if storing a 1–5 scale.
 
 ### Tests
 
 - Unit: Feed content that previously produced >5; ensure outputs are within 1–5.
 - Integration: Run `useMemoryCreation.extractMemories` on long text; confirm no "Invalid importance score" warnings, and DB rows have 1–5.
 
 ### Acceptance Criteria
 
 - No more log warnings about invalid importance score.
 - All persisted memories have `importance` ∈ [1,5].
 
 ### Risk & Rollback
 
 - Slight shift in weighting; if adverse, revert normalization and keep clamp (warnings will reappear).
 
 ---
 
 ## 3) WebGL Context Loss (3D Dice)
 
 ### Root Cause
 
 - `DiceRollEmbed` Canvas lacks handlers for `webglcontextlost`/`webglcontextrestored`; renderer may freeze when the tab is backgrounded or GPU resets.
 
 ### Objective
 
 - Detect and recover from context loss gracefully with minimal UX disruption.
 
 ### Work Units (WU)
 
 #### WU‑3.1: Add context loss handlers and safe remount
 
 - File: `ai-adventure-scribe-main/src/components/DiceRollEmbed.tsx`
 - Add state `contextLost`, `canvasKey`; attach listeners in `onCreated`.
 - Provide a user‑facing, lightweight fallback while restoring.
 
 Snippet:
 
 ```tsx
 const [contextLost, setContextLost] = useState(false);
 const [canvasKey, setCanvasKey] = useState(0);
 
 const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
   const canvas = gl.domElement as HTMLCanvasElement;
   const onLost = (e: Event) => { e.preventDefault(); setContextLost(true); };
   const onRestored = () => { setContextLost(false); setCanvasKey(k => k + 1); };
   canvas.addEventListener('webglcontextlost', onLost as any, { passive: false });
   canvas.addEventListener('webglcontextrestored', onRestored as any);
 }, []);
 ```
 
 ```tsx
 {!contextLost ? (
   <Canvas
     key={canvasKey}
     onCreated={handleCreated}
     gl={{ powerPreference: 'high-performance', antialias: true, failIfMajorPerformanceCaveat: false }}
     camera={{ position: [0, 0, 5] }}
   >
     {/* existing scene */}
   </Canvas>
 ) : (
   <div className="h-24 flex items-center justify-center text-xs text-gray-600">
     3D dice paused (graphics context lost). Restoring…
   </div>
 )}
 ```
 
 ### Tests
 
 - Manual: Dispatch `webglcontextlost` and `webglcontextrestored` on the canvas; observe fallback and recovery.
 - Automated: Component renders without WebGL in CI (no throws); optional jest-dom checks for fallback DOM.
 
 ### Acceptance Criteria
 
 - No crashes; on context loss, UI shows fallback and auto‑recovers on restore.
 
 ### Risk & Rollback
 
 - Minimal; if issues, remove listeners and revert to prior Canvas setup.
 
 ---
 
 ## 4) QA, Telemetry, and Feature Flags
 
 - Add debug logs: dedupe cache hits, combat start guard, narration throttling.
 - Add `VITE_ENABLE_COMBAT_DM_NARRATION` flag default false in DEV.
 - Ensure logs clearly show a single Gemini call per user message during combat.
 
 ---
 
 ## 5) Implementation Order & Estimates
 
 1. WU‑2.1 (Normalization) — 1h
 2. WU‑3.1 (WebGL handlers) — 1–2h
 3. WU‑1.1..1.4 (Dedupe + guards + phase) — 3–4h
 4. WU‑1.5 (Narration throttling/flag) — 1–2h
 5. Tests & verification — 2h
 
 Total: ~8–11 hours
 
 ---
 
 ## 6) Acceptance Checklist
 
 - [ ] Single Gemini call per player message, even when combat starts
 - [ ] No repeated "Combat detection: YES" logs causing API storms
 - [ ] Memory importance always 1–5; no clamp warnings
 - [ ] Dice 3D gracefully handles context loss and restores
 - [ ] All unit/integration tests pass
 
 ---
 
 ## 7) Files To Modify
 
 - `src/services/ai-service.ts` (WU‑1.1)
 - `src/hooks/use-ai-response.ts` (WU‑1.2, WU‑1.4)
 - `src/hooks/use-combat-ai-integration.ts` (WU‑1.3, optionally WU‑1.5)
 - `src/services/ai-execution/LocalFallbackStrategy.ts` (WU‑1.5)
 - `src/utils/memory/classification.ts` (WU‑2.1)
 - `src/components/DiceRollEmbed.tsx` (WU‑3.1)
 
 ---
 
 ## 8) Rollback Plan
 
 - Keep each WU in a separate commit; revert the WU commit if regressions occur.
 - For combat narration, toggle with `VITE_ENABLE_COMBAT_DM_NARRATION=false` if unexpected duplicates occur.
 
 ---
 
 ## 9) Post‑Fix Monitoring
 
 - Observe logs for any re‑entrant chat calls within the 2s window.
 - Track memory creation logs to verify no importance clamp warnings for 48h.
 - Manually background/restore the tab multiple times to confirm stable dice behavior.
 
 ---
 
 ## 10) Deliverable
 
 - Commit these changes and keep this plan at `ai-adventure-scribe-main/docs/fix-plan-combat-memory-webgl.md` for future reference.
 
