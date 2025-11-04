-- Migration: Add Session Constraints and Performance Indexes
-- Date: 2025-11-03
-- Purpose: Prevent race conditions when creating game sessions and optimize query performance
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- ===================================================================
-- PREVENT DUPLICATE ACTIVE SESSIONS
-- ===================================================================

-- This unique partial index ensures only ONE active session can exist
-- for a given campaign+character combination at any time.
--
-- Why partial index with WHERE clause:
-- - The WHERE status = 'active' clause means this constraint ONLY applies to active sessions
-- - Completed/expired sessions can have duplicates (which is correct for historical records)
-- - This prevents race conditions when multiple browser tabs try to create sessions
-- - PostgreSQL's partial indexes are highly efficient for this use case
--
-- Race condition prevented:
-- 1. Tab A checks for active session -> finds none
-- 2. Tab B checks for active session -> finds none
-- 3. Tab A creates session
-- 4. Tab B tries to create session -> FAILS with unique constraint violation
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_session_per_character
ON game_sessions(campaign_id, character_id)
WHERE status = 'active';

COMMENT ON INDEX idx_active_session_per_character IS 'Prevents duplicate active sessions for the same campaign+character combination. Historical (completed/expired) sessions are not affected by this constraint.';

-- ===================================================================
-- PERFORMANCE INDEXES
-- ===================================================================

-- Index for filtering sessions by status
-- Optimizes queries like: SELECT * FROM game_sessions WHERE status = 'active'
-- Used when checking for existing active sessions before creating new ones
CREATE INDEX IF NOT EXISTS idx_game_sessions_status
ON game_sessions(status);

COMMENT ON INDEX idx_game_sessions_status IS 'Optimizes lookups when filtering game sessions by status (active, completed, expired)';

-- Composite index for dialogue history lookups
-- Optimizes queries that filter by both session_id and speaker_type
-- Common query pattern: Get all DM messages for a session, or all player messages
-- PostgreSQL can also use this index for session_id-only queries (leftmost prefix rule)
CREATE INDEX IF NOT EXISTS idx_dialogue_history_session_speaker
ON dialogue_history(session_id, speaker_type);

COMMENT ON INDEX idx_dialogue_history_session_speaker IS 'Optimizes dialogue history queries filtered by session and speaker type (player, dm, system). Also improves session_id-only queries.';

-- Index for character spells lookups by spell_id
-- Optimizes queries that find all characters who know a specific spell
-- Complements the existing character_id index for bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_character_spells_spell_id
ON character_spells(spell_id);

COMMENT ON INDEX idx_character_spells_spell_id IS 'Optimizes reverse lookups to find all characters who know a specific spell. Complements the existing character_id index.';

-- ===================================================================
-- VERIFICATION QUERIES (for testing)
-- ===================================================================

-- To verify the unique constraint works, try running these queries:
--
-- 1. Create an active session:
--    INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
--    VALUES ('some-uuid', 'some-uuid', 1, 'active', NOW());
--
-- 2. Try to create a duplicate active session (should FAIL):
--    INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
--    VALUES ('same-uuid', 'same-uuid', 2, 'active', NOW());
--    -- ERROR: duplicate key value violates unique constraint "idx_active_session_per_character"
--
-- 3. Mark first session as completed:
--    UPDATE game_sessions SET status = 'completed' WHERE id = 'first-session-id';
--
-- 4. Create new active session (should SUCCEED):
--    INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
--    VALUES ('same-uuid', 'same-uuid', 3, 'active', NOW());
