-- Migration: Clean Up Duplicate Active Sessions
-- Date: 2025-11-03
-- Purpose: Prepare for unique constraint by fixing existing duplicate active sessions
-- Must be run BEFORE 20251103_add_session_constraints.sql

-- ===================================================================
-- CLEANUP STRATEGY
-- ===================================================================
--
-- Problem: Multiple active sessions exist for the same campaign+character combination
-- This violates the unique constraint we want to add
--
-- Solution: Mark older duplicate sessions as 'completed'
-- Keep only the MOST RECENT active session for each campaign+character pair
--
-- This is safe because:
-- 1. The session data is preserved (just status changes from 'active' to 'completed')
-- 2. Historical records remain intact
-- 3. Only the most recent session stays active (as intended)

-- ===================================================================
-- STEP 1: Mark duplicate active sessions as completed
-- ===================================================================

-- Mark older duplicate sessions as completed
-- Keeps the MOST RECENT session active, marks all others as completed
UPDATE game_sessions
SET
  status = 'completed',
  end_time = COALESCE(end_time, NOW()),
  updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      campaign_id,
      character_id,
      start_time,
      -- Row number partitioned by campaign+character, ordered by most recent first
      ROW_NUMBER() OVER (
        PARTITION BY campaign_id, character_id
        ORDER BY start_time DESC, created_at DESC
      ) as row_num
    FROM game_sessions
    WHERE status = 'active'
  ) ranked_sessions
  WHERE row_num > 1  -- Keep row_num = 1 (most recent), mark others as completed
);

-- ===================================================================
-- VERIFICATION QUERY
-- ===================================================================
--
-- After running this migration, verify no duplicates remain:
--
-- SELECT campaign_id, character_id, COUNT(*) as active_count
-- FROM game_sessions
-- WHERE status = 'active'
-- GROUP BY campaign_id, character_id
-- HAVING COUNT(*) > 1;
--
-- Expected result: 0 rows (no duplicates)
--
-- Check how many sessions were cleaned up:
--
-- SELECT COUNT(*) as cleaned_up_sessions
-- FROM game_sessions
-- WHERE status = 'completed'
--   AND updated_at > NOW() - INTERVAL '1 minute';
--
-- This shows sessions that were just marked as completed by this migration
