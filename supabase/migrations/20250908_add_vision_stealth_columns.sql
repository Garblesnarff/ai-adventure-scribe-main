-- Migration: Add vision and stealth columns for D&D 5E mechanics
-- Date: 2025-09-08
-- Purpose: Add database columns to support vision types and stealth mechanics
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Add vision types column for storing character vision capabilities
ALTER TABLE characters ADD COLUMN IF NOT EXISTS vision_types JSONB;
COMMENT ON COLUMN characters.vision_types IS 'JSON array of vision types and ranges for the character';

-- Add obscurement column for tracking environmental visibility
ALTER TABLE characters ADD COLUMN IF NOT EXISTS obscurement TEXT DEFAULT 'clear';
COMMENT ON COLUMN characters.obscurement IS 'Current environmental obscurement level (clear, lightly_obscured, heavily_obscured)';

-- Add is_hidden column for tracking stealth status
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
COMMENT ON COLUMN characters.is_hidden IS 'Whether the character is currently hidden';

-- Add stealth_check_bonus column for tracking stealth modifiers
ALTER TABLE characters ADD COLUMN IF NOT EXISTS stealth_check_bonus INTEGER DEFAULT 0;
COMMENT ON COLUMN characters.stealth_check_bonus IS 'Bonus to stealth checks for the character';

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_characters_is_hidden ON characters(is_hidden);
CREATE INDEX IF NOT EXISTS idx_characters_obscurement ON characters(obscurement);