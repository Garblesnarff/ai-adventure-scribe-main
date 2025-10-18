Observability Runbook

Scope
- Frontend (React/Vite)
- Backend (Express + WebSocket)
- Supabase Edge Functions (Deno)
- CrewAI Service (FastAPI)

Key Concepts
- Request IDs: We propagate X-Request-Id across all services to correlate logs, traces, and errors. The client generates an ID per HTTP request; backend and edge functions echo it back via the x-request-id response header. WebSocket messages include requestId in payloads.
- Environments: Requests include x-environment header; set via VITE_ENVIRONMENT for frontend and NODE_ENV on server.
- Release Tagging: Frontend adds x-release header; set via VITE_RELEASE/VITE_APP_VERSION.

What’s Instrumented
- Frontend: Global fetch() wrapper injects x-request-id, x-release, x-environment; global error and unhandledrejection handlers POST errors to /v1/observability/error.
- Backend: Structured JSON logs for request start/end/error; request ID middleware injects/echoes X-Request-Id; /v1/observability endpoints accept client-side errors/metrics; WebSocket events include requestId and log lifecycle events.
- Edge Functions: Each function echoes X-Request-Id and includes it in logs and JSON responses for major functions (dm-agent-execute, chat-ai, rules-interpreter-execute). Extend to others following the same pattern.
- CrewAI FastAPI: Middleware injects/echoes X-Request-Id and logs request lifecycle as JSON.

Sentry (or Provider) Integration
- This codebase is provider-agnostic. To enable Sentry:
  - Frontend: Install @sentry/react and @sentry/vite-plugin. Initialize in src/main.tsx before React render.
  - Backend: Install @sentry/node and @sentry/integrations. Initialize in server/src/index.ts before app.listen and add Sentry.Handlers.requestHandler() and errorHandler().
  - Edge (Deno): Use @sentry/deno (JSR) and wrap handler with Sentry.withRequestData. Include DSN, environment, release.
  - CrewAI: Install sentry-sdk[fastapi] and init Sentry as ASGI middleware.
- Always include the propagated X-Request-Id as a Sentry tag/baggage to correlate across services.

Dashboards
- HTTP Latency (p50/p95/p99) per route and environment
- Error Rate (5xx ratio) per service
- WebSocket connections open, disconnects per minute, and message throughput
- AI Usage & Cost: request counts to providers, token counts if available, errors/timeouts

Alerting
- Backend 5xx rate > 2% for 5 minutes (critical)
- Edge function p95 latency > 3s for 10 minutes (warning)
- WebSocket disconnect spike > 3x baseline in 5 minutes (warning)
- AI provider error rate > 5% in 10 minutes (warning)

Log Querying
- Filter by requestId to correlate events:
  - { requestId: "<RID>" }
- Sample structured log line (backend):
  {"level":"info","msg":"request.end","requestId":"<RID>","method":"GET","url":"/health","status":200,"durationMs":4.2}

Operational Procedures
- Incident triage: Identify requestId from client error or response header; query logs across services by this ID.
- Rollback: Use release tag to find scope of impact.
- Rate limiting spikes: Check WebSocket logs for connection spikes; scale server if needed.

Configuration
- Frontend env: VITE_RELEASE, VITE_ENVIRONMENT
- Backend env: NODE_ENV, CORS_ORIGIN (comma-separated), PORT
- Edge: Set secrets in Supabase for provider keys; DSN if using Sentry provider.
- CrewAI: OPENROUTER_* envs; add SENTRY_DSN if using Sentry.

Extending to All Edge Functions
- Add requestId extraction and x-request-id header to each function’s success and error paths.

Notes
- Keep logs as single-line JSON for ingestion.
- Avoid logging PII; scrub tokens and secrets.
