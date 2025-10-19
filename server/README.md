## Backend (Express + TypeScript)

This service provides a backup API compatible with the Supabase-driven frontend.

### Features
- JWT auth (register/login)
- PostgreSQL schemas (campaigns, characters, sessions, memories, D&D reference tables)
- WebSocket chat per session (`/ws?token=...&sessionId=...`)
- AI providers (OpenAI/Anthropic) endpoint: `POST /v1/ai/respond`
- Stripe subscription checkout + webhook under `/v1/billing/*`
- Rate limiting (per-IP + per-user, plan-aware), AI quotas, and circuit breakers for AI providers

### Setup
1. Copy env and configure
```
cp server/env.example server/.env
```
Fill `server/.env` with your credentials (`DATABASE_URL`, Stripe, AI keys).

2. Install deps
```
npm i
```

3. Migrate DB
```
# Optional; the AI usage/limits code auto-creates its lightweight table when DATABASE_URL is set
npx ts-node --project server/tsconfig.json server/src/scripts/migrate.ts
```

4. Seed D&D content (races, classes, spells)
```
npx ts-node --project server/tsconfig.json server/src/scripts/seed.ts
```

5. Run dev server
```
npm run server:dev
```

### Testing
Integration tests use Vitest + Supertest.
Some tests mock external providers and do not require a DB. If `DATABASE_URL` is set, AI usage will persist to Postgres (Supabase) automatically.
```
npm run server:test
```

### Rate limiting, Quotas, Circuit Breakers

- Rate limiting is enforced via middleware in `server/src/middleware/rate-limit.ts`.
  - Per-IP and per-user sliding windows
  - Plan-aware limits with sensible defaults:
    - LLM (text): free 10/min per user, pro 60/min, enterprise 300/min
    - Images: free 5/min per user, pro 30/min, enterprise 150/min
  - Override plan by setting header `X-Plan: free|pro|enterprise` (useful in tests) or via `users.plan` in Postgres.

- AI quotas are enforced per user/org per day in `server/src/services/ai-usage-service.ts`.
  - Defaults per day:
    - free: llm=3, image=2, voice=5
    - pro: llm=100, image=50, voice=200
  - When `DATABASE_URL` is configured, usage is recorded in a table `ai_usage` (auto-created on first use). Otherwise, an in-memory fallback is used for development/tests.
  - On exhaustion, endpoints return HTTP 402 and include a `Retry-After` header and `resetAt` timestamp.

- Circuit breakers protect calls to external AI providers and prevent cascading failures.
  - Implementation: `server/src/utils/circuit-breaker.ts`
  - Tunables via env:
    - `CB_FAILURE_THRESHOLD` (default 3)
    - `CB_COOLDOWN_MS` (default 30000)
  - When open, endpoints return HTTP 503 and include a `Retry-After` header.

### Endpoints (high-level)
- Auth: `POST /v1/auth/register`, `POST /v1/auth/login`
- Campaigns: `GET/POST /v1/campaigns`, `GET/PUT/DELETE /v1/campaigns/:id`
- Characters: `GET/POST /v1/characters`, `DELETE /v1/characters/:id`
- Sessions: `POST /v1/sessions`, `GET /v1/sessions/:id`, `POST /v1/sessions/:id/complete`
- AI: `POST /v1/ai/respond`
- LLM proxy: `POST /v1/llm/generate`
- Images: `POST /v1/images/generate`
- Stripe: `POST /v1/billing/create-checkout-session`, `POST /v1/billing/webhook`
