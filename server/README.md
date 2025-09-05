## Backend (Express + TypeScript)

This service provides a backup API compatible with the Supabase-driven frontend.

### Features
- JWT auth (register/login)
- PostgreSQL schemas (campaigns, characters, sessions, memories, D&D reference tables)
- WebSocket chat per session (`/ws?token=...&sessionId=...`)
- AI providers (OpenAI/Anthropic) endpoint: `POST /v1/ai/respond`
- Stripe subscription checkout + webhook under `/v1/billing/*`

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
npm run server:migrate
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
Requires a test database in `DATABASE_URL` or skips.
```
npm run server:test
```

### Endpoints (high-level)
- Auth: `POST /v1/auth/register`, `POST /v1/auth/login`
- Campaigns: `GET/POST /v1/campaigns`, `GET/PUT/DELETE /v1/campaigns/:id`
- Characters: `GET/POST /v1/characters`, `DELETE /v1/characters/:id`
- Sessions: `POST /v1/sessions`, `GET /v1/sessions/:id`, `POST /v1/sessions/:id/complete`
- AI: `POST /v1/ai/respond`
- Stripe: `POST /v1/billing/create-checkout-session`, `POST /v1/billing/webhook`
