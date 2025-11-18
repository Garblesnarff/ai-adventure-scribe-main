-- Migration: Add game_system column to campaigns table
-- Date: 2025-11-18
-- Purpose: Track which RPG system each campaign uses
-- Dependencies: Requires 20251118_01_add_game_system_enum.sql to be run first

-- ===================================================================
-- ADD COLUMN: game_system to campaigns
-- ===================================================================
-- Add game_system column with default 'dnd5e' for backwards compatibility
-- All existing campaigns will be set to D&D 5E
-- ===================================================================

-- Add the column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns'
    AND column_name = 'game_system'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN game_system game_system NOT NULL DEFAULT 'dnd5e';

    RAISE NOTICE 'Added game_system column to campaigns table';
  ELSE
    RAISE NOTICE 'Column game_system already exists in campaigns table';
  END IF;
END $$;

-- ===================================================================
-- UPDATE EXISTING DATA
-- ===================================================================
-- Set all existing campaigns to 'dnd5e' (default)
-- ===================================================================

UPDATE campaigns
SET game_system = 'dnd5e'
WHERE game_system IS NULL;

-- ===================================================================
-- CREATE INDEX: idx_campaigns_game_system
-- ===================================================================
-- Index for filtering campaigns by game system
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_game_system
ON campaigns(game_system);

COMMENT ON COLUMN campaigns.game_system IS 'The tabletop RPG system used for this campaign';
