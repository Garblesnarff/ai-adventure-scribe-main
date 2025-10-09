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
