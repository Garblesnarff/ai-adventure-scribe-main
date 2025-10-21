## Stripe Payments Integration Work Plan

### Work Unit 1: Environment & Secrets Readiness
- **User Tasks**
  - Provision Stripe test mode API keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) and scope production keys for later swap.
  - Configure secret management in deployment environments (local `.env`, CI/CD, hosting platform vars) and share access with the engineering team.
  - Decide on Stripe pricing model (product & price IDs) and supply the catalog for implementation/testing.
- **AI Coder Tasks**
  - Validate `.env` templates cover all required Stripe variables and add comments for usage.
  - Implement configuration guards to fail fast when required Stripe keys are missing.
  - Document local setup commands for running `stripe listen` and replaying webhook events.

### Work Unit 2: Backend Checkout & Customer Mapping
- **User Tasks**
  - Confirm Supabase schema fields available for storing Stripe customer IDs and desired subscription metadata (plan tier, renewal dates, etc.).
  - Approve fallback rules for historical users without Stripe records.
- **AI Coder Tasks**
  - Extend `/v1/billing/create-checkout-session` to look up or create a Stripe customer tied to the Supabase `user_profiles` record (store `stripe_customer_id`).
  - Add configurable price catalog mapping (environment-based or Supabase table) to prevent hard-coded price IDs.
  - Ensure request validation & structured logging for checkout session creation failures.

### Work Unit 3: Webhook Processing & Idempotency
- **User Tasks**
  - Provide a persistent datastore (Supabase table) for webhook event logs/idempotency tracking.
  - Coordinate deployment steps for setting the Stripe webhook endpoint and secrets in each environment.
- **AI Coder Tasks**
  - Isolate raw-body parsing for `/v1/billing/webhook` to avoid interfering with global JSON middleware.
  - Implement signature verification, idempotency guard (event ID dedupe), and retries with structured error logging.
  - Normalize subscription lifecycle handling (created/updated/paused/canceled/invoice.failed) updating Supabase `user_profiles` with plan status, period end, trial info, etc.

### Work Unit 4: Frontend Billing Experience
- **User Tasks**
  - Finalize UX requirements for billing dashboard: plan display, CTA copy, success/error messaging, and post-checkout states.
  - Supply brand assets (icons, copy) for upgrade prompts if needed.
- **AI Coder Tasks**
  - Build protected `/app/billing` route with React Query to call backend checkout endpoint and show current subscription details from Supabase.
  - Implement redirect handling after Stripe-hosted Checkout, including success & cancel flows.
  - Integrate optional Stripe Customer Portal link for self-service upgrades/downgrades/cancellations.

### Work Unit 5: Testing, Tooling & Observability
- **User Tasks**
  - Decide acceptance criteria for subscription states (e.g., grace periods, trial handling) and sign off on test scenarios.
  - Schedule manual QA passes covering Stripe test cards and edge cases (failed payment, canceled subscription, etc.).
- **AI Coder Tasks**
  - Add automated tests (unit + integration) covering checkout session creation (mocked) and webhook event processing with Stripe fixtures.
  - Provide local tooling scripts (e.g., npm scripts) to trigger test webhooks via `stripe trigger` and seed Supabase with billing fixtures.
  - Instrument backend with structured logs/metrics for billing operations and expose alerting hooks if feasible.

### Work Unit 6: Launch Preparation & Rollout
- **User Tasks**
  - Coordinate compliance review (Terms of Service updates, pricing page content, support workflows).
  - Plan rollout timeline and communication for beta users (email copy, in-app announcements).
  - Prepare production Stripe account (live mode products/prices, webhook endpoint) and schedule go-live switch.
- **AI Coder Tasks**
  - Build migration/backfill scripts to attach `stripe_customer_id` to existing Supabase users if needed.
  - Implement feature flag or staged rollout controls to limit access during beta.
  - Finalize deployment checklist (env vars, webhook URLs, monitoring) and hand off to ops/support teams.
