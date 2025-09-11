-- Migration: Add magic item properties to character equipment
-- Date: 2025-09-09
-- Purpose: Add database columns to support magic item properties and attunement tracking
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Add magic item properties column for storing magic item specific data
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS is_magic BOOLEAN DEFAULT false;
COMMENT ON COLUMN character_equipment.is_magic IS 'Whether this item is a magic item';

-- Add magic bonus column for storing magical bonuses
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS magic_bonus INTEGER DEFAULT 0;
COMMENT ON COLUMN character_equipment.magic_bonus IS 'Magical bonus provided by the item (e.g., +1, +2, +3)';

-- Add magic properties column for storing special magical properties
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS magic_properties JSONB;
COMMENT ON COLUMN character_equipment.magic_properties IS 'JSON array of special magical properties';

-- Add attunement tracking columns
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS requires_attunement BOOLEAN DEFAULT false;
COMMENT ON COLUMN character_equipment.requires_attunement IS 'Whether this magic item requires attunement';

ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS is_attuned BOOLEAN DEFAULT false;
COMMENT ON COLUMN character_equipment.is_attuned IS 'Whether this magic item is currently attuned';

ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS attunement_requirements TEXT;
COMMENT ON COLUMN character_equipment.attunement_requirements IS 'Special requirements for attunement';

-- Add magic item type and rarity columns
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS magic_item_type TEXT;
COMMENT ON COLUMN character_equipment.magic_item_type IS 'Type of magic item (weapon, armor, ring, etc.)';

ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS magic_item_rarity TEXT;
COMMENT ON COLUMN character_equipment.magic_item_rarity IS 'Rarity of magic item (common, uncommon, rare, etc.)';

-- Add magic effects column for storing complex magical effects
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS magic_effects JSONB;
COMMENT ON COLUMN character_equipment.magic_effects IS 'JSON object containing detailed magical effects';

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_character_equipment_is_magic ON character_equipment(is_magic);
CREATE INDEX IF NOT EXISTS idx_character_equipment_requires_attunement ON character_equipment(requires_attunement);
CREATE INDEX IF NOT EXISTS idx_character_equipment_is_attuned ON character_equipment(is_attuned);
CREATE INDEX IF NOT EXISTS idx_character_equipment_magic_item_rarity ON character_equipment(magic_item_rarity);