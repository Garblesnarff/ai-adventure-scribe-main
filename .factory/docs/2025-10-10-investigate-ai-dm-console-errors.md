## Observed Issues
- Google Generative AI requests are sent in “direct Gemini mode” and return `400 API_KEY_INVALID`.
- Realtime channels for campaigns repeatedly connect, then log `Connection timeout for campaigns subscription`.
- Character loading runs multiple times because the subscription reconnects, triggering downstream React Query re-fetches and voice hook teardowns.

## Root Causes & Hypotheses
- Direct mode is enabled because `VITE_GEMINI_API_KEYS` or `VITE_GOOGLE_GEMINI_API_KEY` is set in the frontend environment, but the value is an invalid or revoked key.
- Our fallback to the proxy (`llm-api-client` → backend) only occurs when no frontend key is present; therefore an invalid key short-circuits before proxying.
- The campaigns realtime channel waits for an acknowledgement (`supabase-subscription-manager.ensureChannelConnected`) that never arrives, likely due to a missing `postgres_changes` subscription or schema mismatch after recent migrations. The timeout clears the channel, forcing React Query to refetch character/campaign data repeatedly.
- The repeated teardown of `useProgressiveVoice` stems from React components unmounting/remounting when subscriptions recycle.

## Proposed Remediation Steps
1. Audit the active `.env` (and Supabase secrets) for `VITE_GEMINI_API_KEYS` / `VITE_GOOGLE_GEMINI_API_KEY`; either supply a valid Google API key or clear the values to revert to the authenticated backend proxy.
2. Add defensive handling in `GeminiApiManager.executeWithRotation` to fall back to the proxy when a direct-mode key yields 400/401 errors, so temporary key issues do not block play.
3. Inspect `supabase-subscription-manager` usage: confirm the campaigns channel is actually subscribing to an event (e.g., `postgres_changes`) and that the realtime role still has access after the latest migrations. Update the channel initialization or Supabase policies so the join acknowledgment is received.
4. Once the realtime channel stabilizes, monitor that character loading no longer loops and voice playback stays active; add logging around `ensureChannelConnected` to capture join responses during verification.

Let me know if you’d like me to implement these fixes.