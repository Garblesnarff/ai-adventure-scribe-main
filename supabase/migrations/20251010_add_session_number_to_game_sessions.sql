-- MIGRATION: Add Session Number to Game Sessions
-- PURPOSE: To add a sequential identifier for game sessions within a campaign. This allows players to easily track their progress (e.g., "Session 5 of The Dragon's Curse").
--
-- BUSINESS IMPACT:
-- - Improves the user experience by providing a clear and simple way to track session history.
-- - Enables features like "recap of last session."
--
-- SCHEMA CHANGES:
-- - New column: session_number on game_sessions (an integer to store the session number).
-- - Data update: Backfills the session_number for existing sessions with a default value of 1.
--
-- RLS POLICIES:
-- - No new policies in this migration. Access is governed by existing policies on the game_sessions table.
--
-- MIGRATION SAFETY:
-- - Backward compatible: YES (can rollback without data loss: YES, though the backfilled numbers will be lost)
-- - Requires downtime: NO (adding a column and running a small update is a fast, non-blocking operation)
-- - Data migration needed: YES (backfills existing rows)
--
-- IF REVERTING THIS MIGRATION:
-- - The session_number column will be dropped.
-- - Any features that rely on the session number will break.
--
-- TESTED BY:
-- - Verified that the column is added with the correct type and default.
-- - Verified that existing rows are correctly backfilled.

-- Add session_number column to game_sessions table if it doesn't exist
-- This fixes the error when updating game session with session_number field

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

-- Update existing sessions with default session_number
UPDATE game_sessions 
SET session_number = 1
WHERE session_number IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.session_number IS 'Session number within a campaign (starts at 1)';
