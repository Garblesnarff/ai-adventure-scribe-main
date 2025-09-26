-- Migration: Add spell columns to characters table
-- Date: 2025-09-25
-- Purpose: Add columns to store character spell selections in the characters table
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Add spell columns for storing character spell selections
ALTER TABLE characters ADD COLUMN IF NOT EXISTS cantrips TEXT;
COMMENT ON COLUMN characters.cantrips IS 'Comma-separated list of cantrip IDs known by the character';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS known_spells TEXT;
COMMENT ON COLUMN characters.known_spells IS 'Comma-separated list of spell IDs known by the character';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS prepared_spells TEXT;
COMMENT ON COLUMN characters.prepared_spells IS 'Comma-separated list of spell IDs prepared by the character';

ALTER TABLE characters ADD COLUMN IF NOT EXISTS ritual_spells TEXT;
COMMENT ON COLUMN characters.ritual_spells IS 'Comma-separated list of ritual spell IDs known by the character';

-- Add indexes for performance on spell columns
CREATE INDEX IF NOT EXISTS idx_characters_cantrips ON characters(cantrips);
CREATE INDEX IF NOT EXISTS idx_characters_known_spells ON characters(known_spells);
CREATE INDEX IF NOT EXISTS idx_characters_prepared_spells ON characters(prepared_spells);
CREATE INDEX IF NOT EXISTS idx_characters_ritual_spells ON characters(ritual_spells);