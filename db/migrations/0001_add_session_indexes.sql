-- Migration: Add Performance Indexes for Game Sessions and Messages
-- Created: 2025-11-05
-- Description: Optimizes queries for session and message history retrieval

-- Add composite index for session + timestamp message queries
-- This dramatically speeds up message history pagination
CREATE INDEX IF NOT EXISTS idx_dialogue_history_session_timestamp
ON dialogue_history(session_id, timestamp DESC);

-- Add composite index for session + sequence number queries
-- Ensures efficient ordering even with concurrent inserts
CREATE INDEX IF NOT EXISTS idx_dialogue_history_session_sequence
ON dialogue_history(session_id, sequence_number DESC);

-- Add index for campaign session lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_campaign_id
ON game_sessions(campaign_id)
WHERE campaign_id IS NOT NULL;

-- Add index for character session lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_character_id
ON game_sessions(character_id)
WHERE character_id IS NOT NULL;

-- Add index for active session queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_status
ON game_sessions(status)
WHERE status IS NOT NULL;

-- Add composite index for finding active campaign sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_campaign_active
ON game_sessions(campaign_id, status)
WHERE campaign_id IS NOT NULL AND end_time IS NULL;

-- Add index for session state JSONB queries (if needed)
-- Uncomment if you query specific JSONB fields frequently
-- CREATE INDEX IF NOT EXISTS idx_game_sessions_state_gin
-- ON game_sessions USING gin(session_state);

-- Performance notes:
-- - session_id + timestamp index: Speeds up recent message queries
-- - session_id + sequence_number: Ensures proper ordering with concurrent writes
-- - Partial indexes (WHERE clauses): Save space by indexing only relevant rows
-- - Expected improvement: Message queries from ~500ms to <50ms for large histories
