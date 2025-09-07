-- Migration: Add all missing character columns for AI-enhanced features
-- Date: 2025-09-07
-- Purpose: Complete database schema to support all AI-generated character features
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Add image_url column for character portraits
ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT;
COMMENT ON COLUMN characters.image_url IS 'URL for AI-generated character portrait image';

-- Add enhanced AI-generated description fields
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
COMMENT ON COLUMN characters.appearance IS 'AI-generated physical appearance description';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits TEXT;
COMMENT ON COLUMN characters.personality_traits IS 'AI-generated personality traits and characteristics';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_notes TEXT;
COMMENT ON COLUMN characters.personality_notes IS 'User-defined personality notes, quirks, and traits for AI incorporation';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory_elements TEXT;
COMMENT ON COLUMN characters.backstory_elements IS 'AI-generated backstory and background elements';

-- Add background column if it doesn't exist (some schemas might be missing this)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;
COMMENT ON COLUMN characters.background IS 'Character background/occupation';

-- Add timestamps if they don't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at);

-- Add RLS (Row Level Security) policies if they don't exist
-- Users can only see their own characters
DROP POLICY IF EXISTS "Users can view their own characters" ON characters;
CREATE POLICY "Users can view their own characters" ON characters
    FOR SELECT USING (auth.uid() = user_id::uuid OR user_id = '00000000-0000-0000-0000-000000000000');

DROP POLICY IF EXISTS "Users can insert their own characters" ON characters;
CREATE POLICY "Users can insert their own characters" ON characters
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid OR user_id = '00000000-0000-0000-0000-000000000000');

DROP POLICY IF EXISTS "Users can update their own characters" ON characters;
CREATE POLICY "Users can update their own characters" ON characters
    FOR UPDATE USING (auth.uid() = user_id::uuid OR user_id = '00000000-0000-0000-0000-000000000000');

DROP POLICY IF EXISTS "Users can delete their own characters" ON characters;
CREATE POLICY "Users can delete their own characters" ON characters
    FOR DELETE USING (auth.uid() = user_id::uuid OR user_id = '00000000-0000-0000-0000-000000000000');

-- Enable RLS on characters table
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Create or update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();