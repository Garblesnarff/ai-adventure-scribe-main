-- Migration: Add Spell Slots Tracking System
-- Date: 2025-11-13
-- Purpose: Implement D&D 5E spell slot tracking with usage logging
-- Work Unit: 2.1a

-- ===================================================================
-- CHARACTER SPELL SLOTS TABLE
-- ===================================================================
-- Tracks total and used spell slots for each character by spell level
-- Supports D&D 5E spell slot system (levels 1-9)
CREATE TABLE IF NOT EXISTS character_spell_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spell_level INTEGER NOT NULL CHECK (spell_level BETWEEN 1 AND 9),
  total_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure used slots never exceed total slots
  CONSTRAINT valid_slot_usage CHECK (used_slots <= total_slots),

  -- Only one record per character per spell level
  CONSTRAINT unique_character_spell_level UNIQUE(character_id, spell_level)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_spell_slots_character
ON character_spell_slots(character_id);

CREATE INDEX IF NOT EXISTS idx_spell_slots_character_level
ON character_spell_slots(character_id, spell_level);

COMMENT ON TABLE character_spell_slots IS 'Tracks current and maximum spell slots for each character by spell level (1-9)';
COMMENT ON COLUMN character_spell_slots.spell_level IS 'Spell level 1-9 per D&D 5E rules';
COMMENT ON COLUMN character_spell_slots.total_slots IS 'Maximum spell slots available for this level';
COMMENT ON COLUMN character_spell_slots.used_slots IS 'Number of slots currently expended';

-- ===================================================================
-- SPELL SLOT USAGE LOG TABLE
-- ===================================================================
-- Historical log of all spell slot usage for analytics and tracking
-- Helps players review what spells they cast during a session
CREATE TABLE IF NOT EXISTS spell_slot_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  spell_name TEXT NOT NULL,
  spell_level INTEGER NOT NULL,
  slot_level_used INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Validate spell levels
  CONSTRAINT valid_spell_level CHECK (spell_level BETWEEN 0 AND 9),
  CONSTRAINT valid_slot_level CHECK (slot_level_used BETWEEN 1 AND 9)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_spell_usage_log_character
ON spell_slot_usage_log(character_id);

CREATE INDEX IF NOT EXISTS idx_spell_usage_log_session
ON spell_slot_usage_log(session_id);

CREATE INDEX IF NOT EXISTS idx_spell_usage_log_character_session
ON spell_slot_usage_log(character_id, session_id);

CREATE INDEX IF NOT EXISTS idx_spell_usage_log_timestamp
ON spell_slot_usage_log(timestamp DESC);

COMMENT ON TABLE spell_slot_usage_log IS 'Historical log of all spell slot usage for tracking and analytics';
COMMENT ON COLUMN spell_slot_usage_log.spell_level IS 'Base level of the spell (0 for cantrips)';
COMMENT ON COLUMN spell_slot_usage_log.slot_level_used IS 'Spell slot level consumed (1-9, supports upcasting)';

-- ===================================================================
-- TRIGGER: AUTO-UPDATE updated_at
-- ===================================================================
-- Automatically update the updated_at timestamp when spell slots are modified
CREATE OR REPLACE FUNCTION update_spell_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spell_slots_timestamp
BEFORE UPDATE ON character_spell_slots
FOR EACH ROW
EXECUTE FUNCTION update_spell_slots_updated_at();

-- ===================================================================
-- VERIFICATION QUERIES (for testing)
-- ===================================================================
-- Example usage:
--
-- 1. Initialize spell slots for a level 5 Wizard:
--    INSERT INTO character_spell_slots (character_id, spell_level, total_slots, used_slots)
--    VALUES
--      ('wizard-uuid', 1, 4, 0),
--      ('wizard-uuid', 2, 3, 0),
--      ('wizard-uuid', 3, 2, 0);
--
-- 2. Use a 2nd level spell slot:
--    UPDATE character_spell_slots
--    SET used_slots = used_slots + 1
--    WHERE character_id = 'wizard-uuid' AND spell_level = 2;
--
-- 3. Log the spell usage:
--    INSERT INTO spell_slot_usage_log (character_id, session_id, spell_name, spell_level, slot_level_used)
--    VALUES ('wizard-uuid', 'session-uuid', 'Scorching Ray', 2, 2);
--
-- 4. Long rest (restore all slots):
--    UPDATE character_spell_slots
--    SET used_slots = 0
--    WHERE character_id = 'wizard-uuid';
