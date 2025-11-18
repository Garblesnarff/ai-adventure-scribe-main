-- Migration: Add game_system to characters and flexible stats
-- Date: 2025-11-18
-- Purpose: Support multi-system characters with flexible stat systems
-- Dependencies: Requires 20251118_01_add_game_system_enum.sql to be run first

-- ===================================================================
-- ADD COLUMN: game_system to characters
-- ===================================================================
-- Track which RPG system each character uses
-- Characters can have different systems than their campaigns for flexibility
-- ===================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters'
    AND column_name = 'game_system'
  ) THEN
    ALTER TABLE characters
    ADD COLUMN game_system game_system NOT NULL DEFAULT 'dnd5e';

    RAISE NOTICE 'Added game_system column to characters table';
  ELSE
    RAISE NOTICE 'Column game_system already exists in characters table';
  END IF;
END $$;

-- ===================================================================
-- UPDATE EXISTING CHARACTERS
-- ===================================================================
-- Set all existing characters to 'dnd5e' (default)
-- ===================================================================

UPDATE characters
SET game_system = 'dnd5e'
WHERE game_system IS NULL;

-- ===================================================================
-- CREATE INDEX: idx_characters_game_system
-- ===================================================================
-- Index for filtering characters by game system
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_characters_game_system
ON characters(game_system);

COMMENT ON COLUMN characters.game_system IS 'The tabletop RPG system used for this character';

-- ===================================================================
-- MODIFY character_stats: Make mental stats nullable
-- ===================================================================
-- Some systems like Cairn don't use INT/WIS/CHA
-- Make these columns nullable to support varied stat systems
-- ===================================================================

-- Make intelligence nullable
DO $$ BEGIN
  ALTER TABLE character_stats
  ALTER COLUMN intelligence DROP NOT NULL,
  ALTER COLUMN intelligence DROP DEFAULT;

  RAISE NOTICE 'Made intelligence column nullable';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Column intelligence may already be nullable or error occurred: %', SQLERRM;
END $$;

-- Make wisdom nullable
DO $$ BEGIN
  ALTER TABLE character_stats
  ALTER COLUMN wisdom DROP NOT NULL,
  ALTER COLUMN wisdom DROP DEFAULT;

  RAISE NOTICE 'Made wisdom column nullable';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Column wisdom may already be nullable or error occurred: %', SQLERRM;
END $$;

-- Make charisma nullable
DO $$ BEGIN
  ALTER TABLE character_stats
  ALTER COLUMN charisma DROP NOT NULL,
  ALTER COLUMN charisma DROP DEFAULT;

  RAISE NOTICE 'Made charisma column nullable';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Column charisma may already be nullable or error occurred: %', SQLERRM;
END $$;

-- ===================================================================
-- ADD COLUMN: willpower to character_stats
-- ===================================================================
-- Cairn and similar systems use Willpower (WIL) instead of WIS/CHA
-- ===================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'character_stats'
    AND column_name = 'willpower'
  ) THEN
    ALTER TABLE character_stats
    ADD COLUMN willpower integer;

    RAISE NOTICE 'Added willpower column to character_stats table';
  ELSE
    RAISE NOTICE 'Column willpower already exists in character_stats table';
  END IF;
END $$;

COMMENT ON COLUMN character_stats.willpower IS 'Willpower stat for game systems like Cairn (replaces WIS/CHA in those systems)';

-- ===================================================================
-- NOTES ON STAT USAGE BY SYSTEM
-- ===================================================================
-- D&D 5E / Pathfinder 2E / 13th Age:
--   Uses all 6 stats: STR, DEX, CON, INT, WIS, CHA
--   willpower is NULL
--
-- OSE (Classic/Advanced):
--   Uses all 6 stats: STR, DEX, CON, INT, WIS, CHA
--   willpower is NULL
--
-- Cairn / Knave:
--   Uses: STR, DEX, WIL (willpower)
--   INT, WIS, CHA are NULL
--
-- Mörk Borg:
--   Uses: STR (Strength), AGI (dexterity), PRE (charisma), TOU (constitution)
--   INT, WIS may be NULL, willpower is NULL
--
-- Fate Core:
--   Doesn't use traditional stats - uses aspects and skills
--   All stat columns may be NULL
-- ===================================================================
