-- Migration: Add personality_notes field to characters table
-- Date: 2025-09-07
-- Purpose: Support user-defined personality notes and quirks for AI generation

-- Add personality_notes field for user-defined quirks and traits
ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_notes TEXT;

-- Comment on the column for documentation
COMMENT ON COLUMN characters.personality_notes IS 'User-defined personality notes, quirks, and traits to be incorporated into AI generation';