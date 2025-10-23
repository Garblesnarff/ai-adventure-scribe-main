-- MIGRATION: Create Roll History Table
-- PURPOSE: To store a durable record of all dice rolls made during a game session. This is critical for analytics, debugging, and future features like a "roll log" for players.
--
-- BUSINESS IMPACT:
-- - Provides valuable data for analyzing game balance and player behavior.
-- - Enables a "roll log" feature, which improves transparency and player trust.
--
-- SCHEMA CHANGES:
-- - New table: roll_history (stores details of each dice roll).
-- - New index: idx_roll_history_session_time on roll_history (for efficient querying of a session's roll log).
--
-- RLS POLICIES:
-- - No new policies in this migration. It is assumed that access will be controlled at the API layer, or that policies will be added in a subsequent migration.
--
-- MIGRATION SAFETY:
-- - Backward compatible: YES (can rollback without data loss: YES, the new table will be dropped)
-- - Requires downtime: NO (creating a new table is a non-blocking operation)
-- - Data migration needed: NO
--
-- IF REVERTING THIS MIGRATION:
-- - The roll_history table will be dropped, and all historical roll data will be lost.
-- - Any features that rely on this table will stop working.
--
-- TESTED BY:
-- - Verified that the table and index are created with the correct schema.
-- - Verified that the check constraint on the 'kind' column is working.

-- roll_history table for durable analytics of dice events
create table if not exists public.roll_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('check','save','attack','initiative','damage')),
  purpose text,
  formula text,
  dc int,
  ac int,
  result_total int,
  result_natural int,
  advantage boolean,
  disadvantage boolean,
  success boolean,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_roll_history_session_time on public.roll_history(session_id, created_at desc);
