-- MIGRATION: Add Session State JSONB Column
-- PURPOSE: To persist the complete state of a game session as a single JSON object. This allows for features like "save/load" and provides a snapshot for debugging.
--
-- BUSINESS IMPACT:
-- - Enables session persistence, a key feature for player retention.
-- - Allows for better debugging and analysis of game states.
--
-- SCHEMA CHANGES:
-- - New column: session_state on game_sessions (stores the entire session state as JSONB).
--
-- RLS POLICIES:
-- - No new policies in this migration. Access is governed by existing policies on game_sessions.
--
-- MIGRATION SAFETY:
-- - Backward compatible: YES (can rollback without data loss: YES)
-- - Requires downtime: NO (adding a column with a default is a non-blocking operation)
-- - Data migration needed: NO
--
-- IF REVERTING THIS MIGRATION:
-- - The session_state column will be dropped, and any saved session states will be lost.
-- - The "save/load" feature will stop working.
--
-- TESTED BY:
-- - Verified that the column is added with the correct type and default.
-- - Verified that existing rows are populated with the default value.

-- Add a JSONB column to persist per-session state snapshots
ALTER TABLE IF EXISTS game_sessions
ADD COLUMN IF NOT EXISTS session_state JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN game_sessions.session_state IS 'State snapshot for the running session (scene, combat, quests, logs)';
