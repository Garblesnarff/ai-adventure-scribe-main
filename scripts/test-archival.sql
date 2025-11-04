-- Test Script for Session Archival System
-- Run this script to verify the archival system works correctly

-- ============================================================================
-- SETUP: Create test data
-- ============================================================================

DO $$
DECLARE
  test_campaign_id UUID;
  test_character_id UUID;
  old_session_id UUID;
  new_session_id UUID;
BEGIN
  -- Create a test campaign if needed
  INSERT INTO campaigns (name, description, user_id)
  VALUES ('Test Archival Campaign', 'Campaign for testing archival', auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_campaign_id;

  -- If campaign already exists, get its ID
  IF test_campaign_id IS NULL THEN
    SELECT id INTO test_campaign_id
    FROM campaigns
    WHERE name = 'Test Archival Campaign'
    LIMIT 1;
  END IF;

  -- Create a test character if needed
  INSERT INTO characters (name, race, class, campaign_id, user_id)
  VALUES ('Test Archival Character', 'Human', 'Fighter', test_campaign_id, auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_character_id;

  -- If character already exists, get its ID
  IF test_character_id IS NULL THEN
    SELECT id INTO test_character_id
    FROM characters
    WHERE name = 'Test Archival Character'
    LIMIT 1;
  END IF;

  -- Create an OLD completed session (100 days ago)
  INSERT INTO game_sessions (
    campaign_id,
    character_id,
    status,
    start_time,
    end_time,
    session_number,
    summary
  ) VALUES (
    test_campaign_id,
    test_character_id,
    'completed',
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '100 days' + INTERVAL '2 hours',
    1,
    'This session should be archived'
  )
  RETURNING id INTO old_session_id;

  -- Add some dialogue to the old session
  INSERT INTO dialogue_history (session_id, speaker_type, speaker_id, message)
  VALUES
    (old_session_id, 'dm', test_character_id, 'Welcome to the adventure!'),
    (old_session_id, 'player', test_character_id, 'I draw my sword.'),
    (old_session_id, 'dm', test_character_id, 'Roll for initiative!');

  -- Add some memories to the old session
  INSERT INTO memories (session_id, type, content, importance)
  VALUES
    (old_session_id, 'location', 'The party entered a dark cave', 5),
    (old_session_id, 'npc', 'Met a suspicious merchant named Grell', 7);

  -- Create a NEW completed session (10 days ago - should NOT be archived)
  INSERT INTO game_sessions (
    campaign_id,
    character_id,
    status,
    start_time,
    end_time,
    session_number,
    summary
  ) VALUES (
    test_campaign_id,
    test_character_id,
    'completed',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days' + INTERVAL '3 hours',
    2,
    'This session should NOT be archived (too recent)'
  )
  RETURNING id INTO new_session_id;

  -- Add some dialogue to the new session
  INSERT INTO dialogue_history (session_id, speaker_type, speaker_id, message)
  VALUES
    (new_session_id, 'dm', test_character_id, 'You continue your journey...'),
    (new_session_id, 'player', test_character_id, 'I search for treasure.');

  RAISE NOTICE 'Test data created:';
  RAISE NOTICE '  Campaign ID: %', test_campaign_id;
  RAISE NOTICE '  Character ID: %', test_character_id;
  RAISE NOTICE '  Old Session ID (should archive): %', old_session_id;
  RAISE NOTICE '  New Session ID (should NOT archive): %', new_session_id;
END $$;

-- ============================================================================
-- TEST 1: Check current state
-- ============================================================================

SELECT
  '=== BEFORE ARCHIVAL ===' as test_section,
  (SELECT COUNT(*) FROM game_sessions) as active_sessions,
  (SELECT COUNT(*) FROM game_sessions_archive) as archived_sessions,
  (SELECT COUNT(*) FROM dialogue_history) as active_dialogue,
  (SELECT COUNT(*) FROM dialogue_history_archive) as archived_dialogue,
  (SELECT COUNT(*) FROM memories) as active_memories,
  (SELECT COUNT(*) FROM memories_archive) as archived_memories;

-- ============================================================================
-- TEST 2: Dry run (no actual changes)
-- ============================================================================

SELECT '=== DRY RUN TEST ===' as test_section;

SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := TRUE
);

-- Verify nothing was actually moved
SELECT
  '=== AFTER DRY RUN (should be same as before) ===' as test_section,
  (SELECT COUNT(*) FROM game_sessions) as active_sessions,
  (SELECT COUNT(*) FROM game_sessions_archive) as archived_sessions;

-- ============================================================================
-- TEST 3: Actual archival
-- ============================================================================

SELECT '=== ACTUAL ARCHIVAL TEST ===' as test_section;

SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := FALSE
);

-- ============================================================================
-- TEST 4: Verify archival results
-- ============================================================================

SELECT '=== AFTER ARCHIVAL ===' as test_section;

-- Count records
SELECT
  'Record Counts' as metric,
  (SELECT COUNT(*) FROM game_sessions) as active_sessions,
  (SELECT COUNT(*) FROM game_sessions_archive) as archived_sessions,
  (SELECT COUNT(*) FROM dialogue_history) as active_dialogue,
  (SELECT COUNT(*) FROM dialogue_history_archive) as archived_dialogue,
  (SELECT COUNT(*) FROM memories) as active_memories,
  (SELECT COUNT(*) FROM memories_archive) as archived_memories;

-- Check archive statistics view
SELECT * FROM archive_statistics;

-- Verify old session was archived
SELECT
  'Old Session Status' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM game_sessions WHERE summary = 'This session should be archived')
    THEN 'FAIL: Old session still in active table'
    WHEN EXISTS (SELECT 1 FROM game_sessions_archive WHERE summary = 'This session should be archived')
    THEN 'PASS: Old session moved to archive'
    ELSE 'FAIL: Old session not found anywhere'
  END as result;

-- Verify new session was NOT archived
SELECT
  'New Session Status' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM game_sessions WHERE summary = 'This session should NOT be archived (too recent)')
    THEN 'PASS: New session still in active table'
    WHEN EXISTS (SELECT 1 FROM game_sessions_archive WHERE summary = 'This session should NOT be archived (too recent)')
    THEN 'FAIL: New session incorrectly archived'
    ELSE 'FAIL: New session not found anywhere'
  END as result;

-- Verify related data was archived
SELECT
  'Related Data Status' as check_type,
  CASE
    WHEN (SELECT COUNT(*) FROM dialogue_history_archive WHERE message = 'Welcome to the adventure!') > 0
    THEN 'PASS: Dialogue history archived'
    ELSE 'FAIL: Dialogue history not archived'
  END as dialogue_result,
  CASE
    WHEN (SELECT COUNT(*) FROM memories_archive WHERE content LIKE '%dark cave%') > 0
    THEN 'PASS: Memories archived'
    ELSE 'FAIL: Memories not archived'
  END as memories_result;

-- ============================================================================
-- TEST 5: Restore archived session
-- ============================================================================

SELECT '=== RESTORE TEST ===' as test_section;

-- Get the archived session ID
DO $$
DECLARE
  archived_session_id UUID;
BEGIN
  SELECT id INTO archived_session_id
  FROM game_sessions_archive
  WHERE summary = 'This session should be archived'
  LIMIT 1;

  IF archived_session_id IS NOT NULL THEN
    RAISE NOTICE 'Restoring session: %', archived_session_id;
    PERFORM restore_archived_session(archived_session_id);
  ELSE
    RAISE NOTICE 'No archived session found to restore';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Verify restoration
-- ============================================================================

SELECT '=== AFTER RESTORATION ===' as test_section;

-- Verify session was restored
SELECT
  'Restoration Status' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM game_sessions WHERE summary = 'This session should be archived')
    THEN 'PASS: Session restored to active table'
    ELSE 'FAIL: Session not in active table'
  END as session_result,
  CASE
    WHEN EXISTS (SELECT 1 FROM game_sessions_archive WHERE summary = 'This session should be archived')
    THEN 'FAIL: Session still in archive'
    ELSE 'PASS: Session removed from archive'
  END as archive_result,
  CASE
    WHEN EXISTS (SELECT 1 FROM dialogue_history WHERE message = 'Welcome to the adventure!')
    THEN 'PASS: Dialogue restored'
    ELSE 'FAIL: Dialogue not restored'
  END as dialogue_result,
  CASE
    WHEN EXISTS (SELECT 1 FROM memories WHERE content LIKE '%dark cave%')
    THEN 'PASS: Memories restored'
    ELSE 'FAIL: Memories not restored'
  END as memories_result;

-- ============================================================================
-- TEST 7: Edge cases
-- ============================================================================

SELECT '=== EDGE CASE TESTS ===' as test_section;

-- Test minimum retention period
SELECT
  'Minimum Retention Test' as test_type,
  CASE
    WHEN (SELECT archive_old_sessions(29, TRUE))->>'success' = 'false'
    THEN 'PASS: Rejected retention < 30 days'
    ELSE 'FAIL: Accepted invalid retention period'
  END as result;

-- Test archiving active sessions (should not archive)
DO $$
DECLARE
  active_session_id UUID;
  test_campaign_id UUID;
  test_character_id UUID;
BEGIN
  -- Get test campaign and character
  SELECT id INTO test_campaign_id FROM campaigns WHERE name = 'Test Archival Campaign' LIMIT 1;
  SELECT id INTO test_character_id FROM characters WHERE name = 'Test Archival Character' LIMIT 1;

  -- Create an active session with old timestamp (should NOT be archived)
  INSERT INTO game_sessions (
    campaign_id,
    character_id,
    status,
    start_time,
    session_number
  ) VALUES (
    test_campaign_id,
    test_character_id,
    'active',
    NOW() - INTERVAL '100 days',
    99
  )
  RETURNING id INTO active_session_id;

  -- Try to archive
  PERFORM archive_old_sessions(90, FALSE);

  -- Check if active session is still active
  IF EXISTS (SELECT 1 FROM game_sessions WHERE id = active_session_id AND status = 'active') THEN
    RAISE NOTICE 'PASS: Active session not archived';
  ELSE
    RAISE NOTICE 'FAIL: Active session was incorrectly archived';
  END IF;

  -- Cleanup
  DELETE FROM game_sessions WHERE id = active_session_id;
END $$;

-- ============================================================================
-- CLEANUP (optional - comment out if you want to keep test data)
-- ============================================================================

SELECT '=== CLEANUP ===' as test_section;

-- Uncomment these lines to remove test data
-- DELETE FROM game_sessions WHERE campaign_id IN (SELECT id FROM campaigns WHERE name = 'Test Archival Campaign');
-- DELETE FROM characters WHERE name = 'Test Archival Character';
-- DELETE FROM campaigns WHERE name = 'Test Archival Campaign';
-- DELETE FROM game_sessions_archive WHERE campaign_id IN (SELECT id FROM campaigns WHERE name = 'Test Archival Campaign');

SELECT '=== TEST COMPLETE ===' as status;
SELECT 'Review the results above. All tests should show PASS.' as instructions;
