Summary of what's happening:
- Frontend is in direct Gemini mode due to VITE_GEMINI_API_KEYS/VITE_GOOGLE_GEMINI_API_KEY. Google call fails with 400 API_KEY_INVALID, so our code disables direct mode and falls back to the backend proxy.
- Backend /v1/llm/generate defaults to provider=openrouter and returns 500 "Server not configured for OpenRouter" because OPENROUTER_API_KEY is missing, so the chat fails.

Proposed fix options (pick one or both):
1) Frontend direct Gemini
- Provide a valid Google Generative AI key in VITE_GEMINI_API_KEYS or VITE_GOOGLE_GEMINI_API_KEY. This will keep direct mode and bypass the backend.
- Or remove these vars to avoid direct attempts (pure proxy mode).

2) Backend proxy (recommended for consistency)
- Configure OpenRouter on server: set OPENROUTER_API_KEY (and optionally OPENROUTER_TEXT_MODEL). No code changes needed.
- Additionally (optional robustness): extend server /v1/llm/generate to support provider='gemini' using GOOGLE_GEMINI_API_KEY; choose provider via a request field.
- Frontend: pass provider in llmApiClient.generateText based on VITE_LLM_PROVIDER ('openrouter' or 'gemini') and keep current fallback logic.

If you approve, I will:
- Implement provider switch in server (openrouter + gemini) with env validation and clear error messages.
- Update llm-api-client to include provider from env, defaulting to 'openrouter' if unset.
- Add minimal logs to confirm fallback sequence and success path.
- Provide a short checklist to set env vars for both modes.