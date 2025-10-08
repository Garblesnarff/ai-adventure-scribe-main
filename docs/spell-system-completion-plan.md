# D&D 5E Spell System Completion Work Plan

This work breakdown converts the approved roadmap into executable work units for a delivery-focused AI coder. Phases may run in parallel where dependencies allow, but each unit should be checked in separately with tests covering the scope of change.

---

## Phase 0 — Foundations (Day 0)
1. **Environment sanity check**
   - Verify repository cleanliness (`git status`) and dependency versions (`npm install`, `npm run build`).
   - Ensure `.env` values exist for Supabase local/test instances.
   - Capture baseline by running existing lint/tests.
2. **Context refresh**
   - Re-read `/roadmaps/dnd-5e-spell-system-implementation.md` and `MVP-SETUP.md` for acceptance criteria.
   - Catalogue current spell data limitations (levels present, classes covered) for comparison later.

Deliverables: Baseline report in issue/PR description summarizing current failing tests or data gaps.

---

## Phase 1 — Canonical Spell Dataset (Days 1–2)
### Work Unit 1.1 — Source Data Acquisition
1. Gather SRD-compliant spell list (levels 0–9) with attributes: components, rituals, scaling, damage types, classes.
2. Normalize to intermediate JSON schema (`spellId`, `name`, `level`, etc.).
3. Write validation script to detect duplicates, missing fields, malformed upcast tables.

### Work Unit 1.2 — Repository Integration
1. Create `server/src/data/srd/` directory holding raw JSON grouped by level or school.
2. Export aggregated dataset (`index.ts`) converting JSON → typed objects.
3. Add unit tests validating dataset integrity (unique IDs, correct levels, mandatory fields present).

Dependencies: Phase 0.
Deliverables: Committed dataset and validation tests.

---

## Phase 2 — Database & Seeding (Days 3–4)
### Work Unit 2.1 — Schema Review & Extension
1. Audit existing migration `20250920_create_spellcasting_tables.sql` for coverage of pact magic, domain/oath spell tables, mystic arcanum.
2. Author new migration(s) if tables/columns missing (e.g., `pact_magic_progression`, `feature_spell_lists`).
3. Update RLS policies and indexes for newly added tables.

### Work Unit 2.2 — Seed Data Expansion
1. Replace `server/src/data/seeds/essentialSpells.ts` with modular files by level leveraging Phase 1 dataset.
2. Author comprehensive `classSpellMappings` including full, half, third casters and special lists (domains, patrons, oaths, archetypes) as required.
3. Extend `multiclassSpellSlots` and create Warlock `pactSlotProgression` through level 20.
4. Update `comprehensive-seed.ts` and `seed-bard-spells.ts` to:
   - Load new datasets lazily.
   - Upsert into `classes`, `spells`, `class_spells`, `spell_progression`, `pact_magic_progression`, `feature_spell_lists`.
   - Emit summary counts and idempotent behavior.

### Work Unit 2.3 — Seed Automation & Tests
1. Add integration tests using a temporary database (Supabase CLI or pg) verifying row counts and key relationships.
2. Update `scripts/run-all-migrations.ts` with new seed order and CLI flags (e.g., `--spells-only`).

Dependencies: Phase 1.
Deliverables: New migrations, seeds, integration test suite, scripted runner updates.

---

## Phase 3 — Backend API Enhancements (Days 5–6)
### Work Unit 3.1 — Data Layer
1. Refactor `server/src/data/spellData.ts` to load from seeded database or Phase 1 dataset fallback.
2. Implement caching/memoization layer (in-memory) for frequent queries.

### Work Unit 3.2 — Routes & Controllers
1. Extend `/routes/v1/spells` endpoints with filters: level, class, ritual, components, school, pagination.
2. Ensure responses include scaling info, components, `sourceList` metadata.
3. Update error handling and status codes.

### Work Unit 3.3 — Character Spell Endpoints
1. Enhance `/routes/v1/characters` spell save/load flows to support:
   - Prepared vs known vs ritual books.
   - Warlock pact slots and Mystic Arcanum tracking.
   - Multiclass slot calculations via DB helpers.
2. Add server-side validation tests covering full, half, third casters and multiclass combos.

Dependencies: Phase 2 seeds available.
Deliverables: Updated API endpoints with unit/integration tests.

---

## Phase 4 — Shared Data Build (Day 7)
### Work Unit 4.1 — Build Pipeline
1. Create script `npm run build:spell-data` generating synchronized artifacts for server (`.ts`) and client (`.json` or `.ts`).
2. Store outputs in `server/dist/spells.json` (runtime use) and `src/data/generated/spells.ts`.
3. Add CI check comparing hashes to prevent divergence between client/server datasets.

Dependencies: Phases 1–3.
Deliverables: Build script, generated files, CI guard.

---

## Phase 5 — Frontend Services & Utilities (Days 8–9)
### Work Unit 5.1 — Local Spell Service
1. Replace `src/services/localSpellService.ts` data with generated Phase 4 artifacts.
2. Extend progression calculators to cover full/half/third casters, pact magic, Mystic Arcanum.
3. Add caching for filtered queries.

### Work Unit 5.2 — API Utility Enhancements
1. Update `src/services/spellApi.ts` to consume new backend filters and handle pagination.
2. Ensure fallback parity between API and local service (comparing hashes, selecting freshest source).

### Work Unit 5.3 — Spell Mappings & Types
1. Regenerate `src/data/spells/mappings.ts` from canonical dataset to avoid manual drift.
2. Update types/interfaces (`src/types/character.ts`, etc.) for new fields (pact slots, ritual-book entries, source tags).
3. Write unit tests for services and utilities verifying counts, filters, and type safety.

Dependencies: Phases 3–4.
Deliverables: Updated services, regenerated mappings, comprehensive unit tests.

---

## Phase 6 — Validation & Business Logic (Days 10–11)
### Work Unit 6.1 — Rule Engine Updates
1. Extend `src/utils/spell-validation.ts` to include:
   - Half/third caster preparation/known limits.
   - Warlock pact slots and Mystic Arcanum rules.
   - Domain/Oath/Patron bonus spells and racial/feat granted spells.
   - Ritual casting nuances (Wizard spellbook vs prepared, ritual-only slots).
2. Update multiclass calculations using database progression data.

### Work Unit 6.2 — Validation Tests
1. Create exhaustive unit-test matrix for single-class and multiclass combinations (e.g., Paladin 6 / Sorcerer 4).
2. Add regression tests for previously supported behaviors (cantrip counts, racial spells).

Dependencies: Phases 5 datasets.
Deliverables: Updated validation logic and passing tests.

---

## Phase 7 — UI/UX Enhancements (Days 12–13)
### Work Unit 7.1 — Spell Selection Interface
1. Update components using `useSpellSelection` to surface level tabs (0–9), filters (ritual, concentration, school).
2. Display remaining slots/prepared counts by class archetype.
3. Provide warnings or callouts when selections violate rules (from Phase 6 validation).

### Work Unit 7.2 — Performance & UX Polish
1. Implement virtualized lists if dataset size causes sluggish renders.
2. Add Quick Add buttons for domain/pact bonus spells and highlight auto-included spells.
3. Ensure responsive layouts (desktop/tablet/mobile) remain usable.

### Work Unit 7.3 — Frontend Tests
1. Add React Testing Library coverage for selection workflow.
2. Include Cypress (or Playwright) smoke test ensuring end-to-end spell selection/save.

Dependencies: Phases 5–6 complete.
Deliverables: Updated UI with automated tests.

---

## Phase 8 — Synchronization & QA (Days 14–15)
### Work Unit 8.1 — Consistency Checks
1. Implement hash comparison script run pre-commit to ensure client/server datasets align.
2. Add CI job executing seed + integration + frontend tests against staging database.

### Work Unit 8.2 — QA Playbooks
1. Draft QA checklist covering class archetypes, multiclass scenarios, ritual casting, and warlock-specific flows.
2. Run through checklist on staging environment post-deployment candidate build.

Dependencies: Prior phases done.
Deliverables: CI enforcement, QA documentation, test reports.

---

## Phase 9 — Release & Post-Launch (Days 16+)
### Work Unit 9.1 — Deployment Preparation
1. Update deployment scripts to run latest migrations/seeds idempotently.
2. Coordinate with ops for production seed rollout; capture metrics baseline.

### Work Unit 9.2 — Monitoring & Maintenance
1. Add logging/metrics for spell API latency, validation error rates, and seed execution stats.
2. Schedule recurring data audits (monthly script verifying dataset integrity).
3. Document process for adding new spells or errata updates (standalone doc referenced from internal wiki).

Deliverables: Deployment plan, monitoring hooks, maintenance SOP.

---

## Cross-Cutting Concerns
- **Version Control**: Each work unit should ship via dedicated PR with descriptive summary, tests, and migration notes.
- **Testing Discipline**: No PR merges without green unit, integration, and (where applicable) e2e tests.
- **Feature Flags**: If progressive rollout desired, introduce feature gating during Phase 3 or 7 for high-risk pieces.
- **Documentation**: Update internal docs (not public README) after major phases to keep future coders aligned.

---

## Suggested Timeline Snapshot
| Phase | Duration | Primary Outputs |
|-------|----------|-----------------|
| 0 | Day 0 | Baseline checklist |
| 1 | Days 1–2 | Canonical spell dataset |
| 2 | Days 3–4 | Migrations + seeds |
| 3 | Days 5–6 | Enhanced APIs |
| 4 | Day 7 | Shared data build |
| 5 | Days 8–9 | Frontend services |
| 6 | Days 10–11 | Validation engine |
| 7 | Days 12–13 | UI/UX polish |
| 8 | Days 14–15 | QA + CI enforcement |
| 9 | Day 16+ | Release & monitoring |

Use this plan as the authoritative implementation checklist for completing the D&D 5E spell system.
