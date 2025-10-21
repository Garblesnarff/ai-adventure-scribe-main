## Current Stripe Footprint
- Backend already ships a `billing` router that instantiates Stripe, exposes `POST /create-checkout-session`, and a webhook handler for subscription lifecycle events, persisting plan data into Supabase when an email is available.
- No obvious frontend billing UI or client wrapper currently surfaces these endpoints; environment keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SKIP_VERIFY`) are required but there’s no documented provisioning flow.

## What’s Still Needed
1. **Branch & Setup**
   - Create a dedicated feature branch from `main` (e.g., `feature/stripe-payments`) to contain integration work.
2. **Environment & Config Hardening**
   - Supply live/test keys in deployment secrets and replicate raw-body middleware at the Express app level so only the webhook route opts in.
   - Map Stripe customer IDs to Supabase users (e.g., `user_profiles.stripe_customer_id`) to avoid relying on `customer_email` in webhook payloads.
3. **Checkout Orchestration**
   - Build a protected frontend billing page (React + TanStack Query) that hits `/v1/billing/create-checkout-session` with selected price IDs, handles redirects, and surfaces subscription status post-return.
   - Optionally add Stripe Customer Portal support for plan changes/cancellations.
4. **Webhook Processing & Persistence**
   - Expand webhook handler to upsert subscription status, current period end, trial state, etc., and reconcile invoice.payment_failed / subscription.deleted cases.
   - Add idempotency safeguards (Stripe `event.id` dedupe table) and structured logging for observability.
5. **Testing & Observability**
   - Implement integration tests against Stripe’s test mode using mocked events or stripe-mock.
   - Document runbooks for rotating keys, replaying events, and local webhook development via `stripe listen`.

## Complexity & Effort Estimate
- **Backend refinements**: 1–2 days (mapping customers, robust webhook handling, tests).
- **Frontend billing UI + flows**: 2–3 days depending on design requirements.
- **Infrastructure & ops (env secrets, webhook hosting, docs/runbooks)**: ~1 day.
- Overall effort: ~1 week of focused work for a production-ready subscription flow, longer if you need tiered pricing UI or portal customization.

## Key Risks & Mitigations
- **Webhook reliability**: ensure raw body parsing isolation and event idempotency to prevent duplicate processing.
- **Security/compliance**: rely on Stripe-hosted Checkout/Portal and safeguard secrets; never handle card data directly.
- **Data consistency**: persist Stripe IDs for deterministic lookups; backfill existing users via one-off script.
- **UX gaps**: plan status surfacing, error messaging, and downgrade flows must be explicit to reduce support burden.