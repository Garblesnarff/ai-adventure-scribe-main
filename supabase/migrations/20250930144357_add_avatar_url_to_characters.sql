-- Add avatar_url column to characters table
-- This will store the character portrait/avatar image URL

ALTER TABLE characters
ADD COLUMN avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN characters.avatar_url IS 'URL to character portrait/avatar image generated during character creation';