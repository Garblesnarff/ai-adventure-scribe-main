-- Add a JSONB column to persist per-session state snapshots
ALTER TABLE IF EXISTS game_sessions
ADD COLUMN IF NOT EXISTS session_state JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN game_sessions.session_state IS 'State snapshot for the running session (scene, combat, quests, logs)';
