# Legacy character creation cleanup plan

This document tracks the deprecation and eventual removal of the legacy character creation entry in favor of the campaign‑centric flow.

Scope of deprecation
- Affected routes (legacy entry points):
  - /app/characters (CharacterList)
  - /app/characters/create (CharacterWizard)
- Not immediately removed: deep links to existing character sheets
  - /app/character/:id should continue to work until the final removal stage to preserve existing bookmarks and internal links.

Readiness criteria to disable legacy entry
All criteria below must be satisfied for 2 consecutive weeks before disabling legacy routes via feature flag:
1) Adoption metrics
   - ≥ 95% of new characters created via campaign‑centric flow (campaign wizard or campaign view) across rolling 14 days
   - ≥ 90% of sessions launched from campaign context (not from CharacterList)
2) Quality and stability
   - 0 P0/P1 open bugs in campaign creation and character creation inside campaigns
   - Error rate for campaign wizard ≤ baseline of legacy flow (p95) and no significant regressions in time‑to‑create
3) Data migration/backfill complete
   - All orphaned characters either linked to a campaign or marked as "Unassigned" with a visible migration path (UI affordance from campaign)
   - Any essential character metadata parity verified (fields, validations, spells) between legacy and new flow
4) Documentation and support readiness
   - Public help docs updated and internal runbook available for handling old bookmarks
   - Support playbook updated (how to find characters after removal)
5) Analytics visibility
   - Dashboards available to track adoption, error rates, and funnel completion for the new flow

Feature flag and rollout plan
- Flag name (proposed): VITE_FEATURE_ENABLE_LEGACY_CHARACTER_ENTRY
- Default: true in development and production during rollout validation
- Gating:
  - App routes: gate /app/characters and /app/characters/create under the flag
  - Navigation: mark Characters nav item as legacy, optionally gate behind the same flag when ready
  - Breadcrumbs: special casing for /app/characters can be removed when the flag is false and later when code is deleted
- Progressive steps:
  1) Stage A – Monitor only: Keep flag true, measure adoption and quality
  2) Stage B – Soft disable: Set flag false for a subset of users (if needed) or globally after thresholds met; add redirects (see below)
  3) Stage C – Code removal: Remove routes, nav link, breadcrumbs special case, and the feature flag itself

Redirects and bookmark handling
- When disabling via flag (Stage B):
  - Redirect /app/characters → /app (home) with a one‑time toast/banner pointing to the campaign‑centric creation entry
  - Redirect /app/characters/create → /app/campaigns/create (or /app, depending on final desired UX)
- After code removal (Stage C):
  - Keep server‑side or client‑side redirect rules for ≥ 60 days
  - Update sitemap and internal links

Removal work breakdown (Stage C)
1) Frontend
   - Delete route entries for /app/characters and /app/characters/create in src/App.tsx
   - Remove Characters link in src/components/layout/navigation.tsx
   - Remove breadcrumbs special case for /app/characters in src/components/layout/breadcrumbs.tsx
   - Remove legacy components if unused: src/components/character-list/* and src/components/character-creation/character-wizard (after confirming no other use)
   - Remove feature flag definition and usages
2) Backend/Edge (if any direct deep‑links or redirects exist)
   - Ensure redirects remain for 60+ days
3) Analytics
   - Validate dashboards and export a final comparison report (legacy vs new)
   - Remove legacy event tracking once code is removed
4) Communication
   - Announce change in release notes and update help docs

Owners
- Frontend: FE owner (routing and component removal)
- Analytics: Analytics owner (dashboards and verification)
- Support/Docs: PM/Docs owner (communications and help center updates)

Dependencies and linked tickets
- Rollout validation and analytics verification (bd-analytics-legacy-character-deprecation)
- Redirect behavior and banner copy (bd-ux-legacy-redirects)
- Orphaned character backfill and campaign linking (bd-data-backfill-characters)

Implementation breadcrumbs in source
- App routes TODO in src/App.tsx near legacy routes (this ticket)
- Navigation TODO in src/components/layout/navigation.tsx near Characters link (this ticket)
- Breadcrumbs TODO in src/components/layout/breadcrumbs.tsx where /app/characters is special-cased (this ticket)

Go/No‑Go checklist for disabling the flag
- [ ] Adoption thresholds met for 14 days
- [ ] No open P0/P1 bugs in campaign‑centric flow
- [ ] Backfill complete and verified
- [ ] Dashboards reviewed by Analytics owner
- [ ] Support playbook updated and announcement scheduled

Notes
- Do not remove /app/character/:id until after redirects and communications are in place. Evaluate whether deep links should move under campaign context before final removal.
