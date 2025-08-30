-- Migration to add missing fields to game_sessions table
-- This fixes the 400 error when updating game session state

-- Add the missing columns to game_sessions table
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS current_scene_description TEXT;

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS session_notes TEXT;

-- Update existing sessions with default values
UPDATE game_sessions 
SET 
    turn_count = 0,
    current_scene_description = 'The adventure begins...',
    session_notes = ''
WHERE 
    turn_count IS NULL 
    OR current_scene_description IS NULL 
    OR session_notes IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN game_sessions.turn_count IS 'Number of turns taken in this session';
COMMENT ON COLUMN game_sessions.current_scene_description IS 'Current scene description for the game session';
COMMENT ON COLUMN game_sessions.session_notes IS 'Additional notes for the session';