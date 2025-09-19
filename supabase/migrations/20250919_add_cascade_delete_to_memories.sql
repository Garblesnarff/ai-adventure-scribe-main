-- Migration to add CASCADE DELETE to memories foreign key
-- This allows deleting game_sessions without violating memories constraint
-- Created: 2025-09-19

-- Drop the existing constraint (assuming it's named memories_session_id_fkey)
-- If the constraint has a different name, check in Supabase dashboard and adjust
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_session_id_fkey;

-- Recreate with CASCADE DELETE
ALTER TABLE memories 
ADD CONSTRAINT memories_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE;

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_memories_session_id ON memories (session_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT memories_session_id_fkey ON memories IS 'Foreign key to game_sessions with CASCADE DELETE to allow session cleanup';

-- Optional: Verify the change (for testing, remove after applying)
-- SELECT conname, confdeltype FROM pg_constraint WHERE conrelid = 'memories'::regclass;
