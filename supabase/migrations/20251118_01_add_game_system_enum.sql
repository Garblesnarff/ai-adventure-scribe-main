-- Migration: Add game_system enum type
-- Date: 2025-11-18
-- Purpose: Create enum type for supporting multiple tabletop RPG systems
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- ===================================================================
-- CREATE ENUM: game_system
-- ===================================================================
-- Supported game systems:
-- - dnd5e: Dungeons & Dragons 5th Edition
-- - ose_classic: Old-School Essentials Classic
-- - ose_advanced: Old-School Essentials Advanced Fantasy
-- - cairn: Cairn RPG
-- - knave: Knave RPG
-- - pathfinder2e: Pathfinder 2nd Edition
-- - 13th_age: 13th Age RPG
-- - fate_core: Fate Core System
-- - mork_borg: Mörk Borg RPG
-- ===================================================================

DO $$ BEGIN
  CREATE TYPE game_system AS ENUM (
    'dnd5e',
    'ose_classic',
    'ose_advanced',
    'cairn',
    'knave',
    'pathfinder2e',
    '13th_age',
    'fate_core',
    'mork_borg'
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, do nothing
    RAISE NOTICE 'Type game_system already exists, skipping creation';
END $$;

COMMENT ON TYPE game_system IS 'Enum of supported tabletop RPG systems';
