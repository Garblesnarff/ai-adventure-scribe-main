-- Migration: Create Session Archival System
-- Date: 2025-11-03
-- Purpose: Archive old game sessions to prevent unbounded database growth
-- Strategy: Move old sessions to archive table (preserves data)
-- Retention Policy: Sessions older than 90 days with status='completed' are eligible

-- ===================================================================
-- CREATE ARCHIVE TABLES
-- ===================================================================

-- Create game_sessions_archive table with same schema as game_sessions
CREATE TABLE IF NOT EXISTS game_sessions_archive (
  LIKE game_sessions INCLUDING ALL
);

-- Add archived_at timestamp to track when session was archived
ALTER TABLE game_sessions_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for archived_at queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_archive_archived_at
ON game_sessions_archive(archived_at);

-- Add index for status queries (in case we need to query by status)
CREATE INDEX IF NOT EXISTS idx_game_sessions_archive_status
ON game_sessions_archive(status);

-- Add comments
COMMENT ON TABLE game_sessions_archive IS 'Archive table for old game sessions. Sessions are moved here after 90 days of completion to prevent database bloat.';
COMMENT ON COLUMN game_sessions_archive.archived_at IS 'Timestamp when this session was moved to the archive';

-- Create dialogue_history_archive table
CREATE TABLE IF NOT EXISTS dialogue_history_archive (
  LIKE dialogue_history INCLUDING ALL
);

-- Add archived_at timestamp
ALTER TABLE dialogue_history_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for archive queries
CREATE INDEX IF NOT EXISTS idx_dialogue_history_archive_session_id
ON dialogue_history_archive(session_id);

CREATE INDEX IF NOT EXISTS idx_dialogue_history_archive_archived_at
ON dialogue_history_archive(archived_at);

COMMENT ON TABLE dialogue_history_archive IS 'Archive table for dialogue history associated with archived game sessions.';
COMMENT ON COLUMN dialogue_history_archive.archived_at IS 'Timestamp when this dialogue was archived';

-- Create memories_archive table
CREATE TABLE IF NOT EXISTS memories_archive (
  LIKE memories INCLUDING ALL
);

-- Add archived_at timestamp
ALTER TABLE memories_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_memories_archive_session_id
ON memories_archive(session_id);

CREATE INDEX IF NOT EXISTS idx_memories_archive_archived_at
ON memories_archive(archived_at);

COMMENT ON TABLE memories_archive IS 'Archive table for memories associated with archived game sessions.';
COMMENT ON COLUMN memories_archive.archived_at IS 'Timestamp when this memory was archived';

-- Create character_voice_mappings_archive table
CREATE TABLE IF NOT EXISTS character_voice_mappings_archive (
  LIKE character_voice_mappings INCLUDING ALL
);

-- Add archived_at timestamp
ALTER TABLE character_voice_mappings_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_character_voice_mappings_archive_session_id
ON character_voice_mappings_archive(session_id);

CREATE INDEX IF NOT EXISTS idx_character_voice_mappings_archive_archived_at
ON character_voice_mappings_archive(archived_at);

COMMENT ON TABLE character_voice_mappings_archive IS 'Archive table for character voice mappings associated with archived game sessions.';
COMMENT ON COLUMN character_voice_mappings_archive.archived_at IS 'Timestamp when this voice mapping was archived';

-- Create combat_encounters_archive table (sessions may have combat encounters)
CREATE TABLE IF NOT EXISTS combat_encounters_archive (
  LIKE combat_encounters INCLUDING ALL
);

-- Add archived_at timestamp
ALTER TABLE combat_encounters_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_combat_encounters_archive_session_id
ON combat_encounters_archive(session_id);

CREATE INDEX IF NOT EXISTS idx_combat_encounters_archive_archived_at
ON combat_encounters_archive(archived_at);

COMMENT ON TABLE combat_encounters_archive IS 'Archive table for combat encounters associated with archived game sessions.';
COMMENT ON COLUMN combat_encounters_archive.archived_at IS 'Timestamp when this combat encounter was archived';

-- ===================================================================
-- ENSURE CASCADE DELETE CONSTRAINTS
-- ===================================================================

-- Ensure dialogue_history has CASCADE DELETE (may already exist from previous migration)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dialogue_history_session_id_fkey'
    AND conrelid = 'dialogue_history'::regclass
  ) THEN
    ALTER TABLE dialogue_history DROP CONSTRAINT dialogue_history_session_id_fkey;
  END IF;

  -- Recreate with CASCADE DELETE
  ALTER TABLE dialogue_history
  ADD CONSTRAINT dialogue_history_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE;

  -- Add index if it doesn't exist
  CREATE INDEX IF NOT EXISTS idx_dialogue_history_session_id ON dialogue_history(session_id);
END $$;

-- Ensure character_voice_mappings has CASCADE DELETE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'character_voice_mappings_session_id_fkey'
    AND conrelid = 'character_voice_mappings'::regclass
  ) THEN
    ALTER TABLE character_voice_mappings DROP CONSTRAINT character_voice_mappings_session_id_fkey;
  END IF;

  ALTER TABLE character_voice_mappings
  ADD CONSTRAINT character_voice_mappings_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE;
END $$;

-- Ensure combat_encounters has CASCADE DELETE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'combat_encounters_session_id_fkey'
    AND conrelid = 'combat_encounters'::regclass
  ) THEN
    ALTER TABLE combat_encounters DROP CONSTRAINT combat_encounters_session_id_fkey;
  END IF;

  ALTER TABLE combat_encounters
  ADD CONSTRAINT combat_encounters_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE;
END $$;

-- ===================================================================
-- CREATE ARCHIVAL FUNCTION
-- ===================================================================

-- Function to archive old game sessions
-- This moves sessions older than 90 days with status='completed' to archive tables
CREATE OR REPLACE FUNCTION archive_old_sessions(
  retention_days INTEGER DEFAULT 90,
  dry_run BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
  sessions_count INTEGER := 0;
  dialogue_count INTEGER := 0;
  memories_count INTEGER := 0;
  voice_mappings_count INTEGER := 0;
  combat_encounters_count INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
  session_ids UUID[];
  result JSON;
BEGIN
  -- Calculate cutoff date
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Find sessions to archive
  SELECT ARRAY_AGG(id) INTO session_ids
  FROM game_sessions
  WHERE status = 'completed'
    AND end_time IS NOT NULL
    AND end_time < cutoff_date;

  -- If no sessions found, return early
  IF session_ids IS NULL OR array_length(session_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', TRUE,
      'dry_run', dry_run,
      'sessions_archived', 0,
      'dialogue_archived', 0,
      'memories_archived', 0,
      'voice_mappings_archived', 0,
      'combat_encounters_archived', 0,
      'message', 'No sessions eligible for archival'
    );
  END IF;

  -- Count records that would be archived
  SELECT COUNT(*) INTO sessions_count FROM game_sessions WHERE id = ANY(session_ids);
  SELECT COUNT(*) INTO dialogue_count FROM dialogue_history WHERE session_id = ANY(session_ids);
  SELECT COUNT(*) INTO memories_count FROM memories WHERE session_id = ANY(session_ids);
  SELECT COUNT(*) INTO voice_mappings_count FROM character_voice_mappings WHERE session_id = ANY(session_ids);
  SELECT COUNT(*) INTO combat_encounters_count FROM combat_encounters WHERE session_id = ANY(session_ids);

  -- If dry run, just return counts
  IF dry_run THEN
    RETURN json_build_object(
      'success', TRUE,
      'dry_run', TRUE,
      'sessions_to_archive', sessions_count,
      'dialogue_to_archive', dialogue_count,
      'memories_to_archive', memories_count,
      'voice_mappings_to_archive', voice_mappings_count,
      'combat_encounters_to_archive', combat_encounters_count,
      'cutoff_date', cutoff_date,
      'message', 'Dry run completed - no data was moved'
    );
  END IF;

  -- Start transaction for archival
  BEGIN
    -- Archive dialogue history
    INSERT INTO dialogue_history_archive
    SELECT *, NOW() as archived_at
    FROM dialogue_history
    WHERE session_id = ANY(session_ids);

    -- Archive memories
    INSERT INTO memories_archive
    SELECT *, NOW() as archived_at
    FROM memories
    WHERE session_id = ANY(session_ids);

    -- Archive character voice mappings
    INSERT INTO character_voice_mappings_archive
    SELECT *, NOW() as archived_at
    FROM character_voice_mappings
    WHERE session_id = ANY(session_ids);

    -- Archive combat encounters
    INSERT INTO combat_encounters_archive
    SELECT *, NOW() as archived_at
    FROM combat_encounters
    WHERE session_id = ANY(session_ids);

    -- Archive game sessions (must be last to preserve foreign keys)
    INSERT INTO game_sessions_archive
    SELECT *, NOW() as archived_at
    FROM game_sessions
    WHERE id = ANY(session_ids);

    -- Delete from original tables (CASCADE will handle related records)
    DELETE FROM game_sessions WHERE id = ANY(session_ids);

    -- Build result
    result := json_build_object(
      'success', TRUE,
      'dry_run', FALSE,
      'sessions_archived', sessions_count,
      'dialogue_archived', dialogue_count,
      'memories_archived', memories_count,
      'voice_mappings_archived', voice_mappings_count,
      'combat_encounters_archived', combat_encounters_count,
      'cutoff_date', cutoff_date,
      'message', 'Sessions archived successfully'
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'message', 'Archival failed - no data was moved'
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_old_sessions IS 'Archives game sessions older than specified retention period. Use dry_run=TRUE to see what would be archived without actually moving data.';

-- ===================================================================
-- CREATE RESTORE FUNCTION
-- ===================================================================

-- Function to restore a session from archive
CREATE OR REPLACE FUNCTION restore_archived_session(
  session_id_to_restore UUID
) RETURNS JSON AS $$
DECLARE
  session_exists BOOLEAN;
  result JSON;
BEGIN
  -- Check if session exists in archive
  SELECT EXISTS(SELECT 1 FROM game_sessions_archive WHERE id = session_id_to_restore) INTO session_exists;

  IF NOT session_exists THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Session not found in archive',
      'session_id', session_id_to_restore
    );
  END IF;

  BEGIN
    -- Restore dialogue history
    INSERT INTO dialogue_history
    SELECT id, session_id, speaker_id, speaker_type, message, timestamp, context, created_at, updated_at
    FROM dialogue_history_archive
    WHERE session_id = session_id_to_restore;

    -- Restore memories
    INSERT INTO memories
    SELECT id, session_id, type, content, importance, tags, context_id, embedding, created_at, updated_at, category, subcategory, related_memories, chapter_marker, story_arc, emotional_tone, prose_quality, narrative_weight, metadata
    FROM memories_archive
    WHERE session_id = session_id_to_restore;

    -- Restore character voice mappings
    INSERT INTO character_voice_mappings
    SELECT id, session_id, character_name, voice_id, voice_category, appearance_count, first_appearance, last_used, metadata, created_at, updated_at
    FROM character_voice_mappings_archive
    WHERE session_id = session_id_to_restore;

    -- Restore combat encounters
    INSERT INTO combat_encounters
    SELECT id, session_id, location_id, encounter_type, difficulty, status, current_round, current_turn, current_participant_id, initiative_order, combat_log, description, created_at, updated_at
    FROM combat_encounters_archive
    WHERE session_id = session_id_to_restore;

    -- Restore game session
    INSERT INTO game_sessions
    SELECT id, campaign_id, character_id, start_time, end_time, status, summary, session_notes, created_at, updated_at, current_scene_description, turn_count, session_number
    FROM game_sessions_archive
    WHERE id = session_id_to_restore;

    -- Delete from archive tables
    DELETE FROM dialogue_history_archive WHERE session_id = session_id_to_restore;
    DELETE FROM memories_archive WHERE session_id = session_id_to_restore;
    DELETE FROM character_voice_mappings_archive WHERE session_id = session_id_to_restore;
    DELETE FROM combat_encounters_archive WHERE session_id = session_id_to_restore;
    DELETE FROM game_sessions_archive WHERE id = session_id_to_restore;

    result := json_build_object(
      'success', TRUE,
      'session_id', session_id_to_restore,
      'message', 'Session restored successfully'
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'session_id', session_id_to_restore,
      'message', 'Restore failed - no data was moved'
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_archived_session IS 'Restores a specific session from archive back to the main tables. Useful if a user needs to access an old session.';

-- ===================================================================
-- CREATE VIEW FOR ARCHIVE STATISTICS
-- ===================================================================

CREATE OR REPLACE VIEW archive_statistics AS
SELECT
  'game_sessions' as table_name,
  (SELECT COUNT(*) FROM game_sessions) as active_count,
  (SELECT COUNT(*) FROM game_sessions_archive) as archived_count,
  (SELECT pg_size_pretty(pg_total_relation_size('game_sessions'))) as active_size,
  (SELECT pg_size_pretty(pg_total_relation_size('game_sessions_archive'))) as archived_size
UNION ALL
SELECT
  'dialogue_history',
  (SELECT COUNT(*) FROM dialogue_history),
  (SELECT COUNT(*) FROM dialogue_history_archive),
  (SELECT pg_size_pretty(pg_total_relation_size('dialogue_history'))),
  (SELECT pg_size_pretty(pg_total_relation_size('dialogue_history_archive')))
UNION ALL
SELECT
  'memories',
  (SELECT COUNT(*) FROM memories),
  (SELECT COUNT(*) FROM memories_archive),
  (SELECT pg_size_pretty(pg_total_relation_size('memories'))),
  (SELECT pg_size_pretty(pg_total_relation_size('memories_archive')))
UNION ALL
SELECT
  'character_voice_mappings',
  (SELECT COUNT(*) FROM character_voice_mappings),
  (SELECT COUNT(*) FROM character_voice_mappings_archive),
  (SELECT pg_size_pretty(pg_total_relation_size('character_voice_mappings'))),
  (SELECT pg_size_pretty(pg_total_relation_size('character_voice_mappings_archive')))
UNION ALL
SELECT
  'combat_encounters',
  (SELECT COUNT(*) FROM combat_encounters),
  (SELECT COUNT(*) FROM combat_encounters_archive),
  (SELECT pg_size_pretty(pg_total_relation_size('combat_encounters'))),
  (SELECT pg_size_pretty(pg_total_relation_size('combat_encounters_archive')));

COMMENT ON VIEW archive_statistics IS 'Provides statistics on active vs archived data for monitoring database health';
