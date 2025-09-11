-- Migration: Add multiclassing columns to characters table
-- Date: 2025-09-11
-- Purpose: Add database columns to support multiclassing features
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Add class_levels column for storing multiclass information
ALTER TABLE characters ADD COLUMN IF NOT EXISTS class_levels JSONB;
COMMENT ON COLUMN characters.class_levels IS 'JSON array of class levels for multiclass characters';

-- Add total_level column for storing combined character level
ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_level INTEGER DEFAULT 1;
COMMENT ON COLUMN characters.total_level IS 'Combined level from all classes for multiclass characters';

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_characters_total_level ON characters(total_level);

-- Update existing characters with default values if needed
UPDATE characters 
SET total_level = level 
WHERE total_level IS NULL OR total_level = 0;

-- Add multiclassing columns to character_stats table for hit point calculations
ALTER TABLE character_stats ADD COLUMN IF NOT EXISTS multiclass_hit_dice JSONB;
COMMENT ON COLUMN character_stats.multiclass_hit_dice IS 'JSON array of hit dice from each class for multiclass characters';

-- Add multiclassing columns to character_equipment for multiclass-specific equipment
ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS multiclass_requirement TEXT;
COMMENT ON COLUMN character_equipment.multiclass_requirement IS 'Multiclass requirement for using this equipment';

-- Add multiclassing columns to combat_participants for combat calculations
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS multiclass_info JSONB;
COMMENT ON COLUMN combat_participants.multiclass_info IS 'JSON object containing multiclass information for combat calculations';

-- Add comments for documentation
COMMENT ON COLUMN character_stats.multiclass_hit_dice IS 'Hit dice information for multiclass characters';
COMMENT ON COLUMN character_equipment.multiclass_requirement IS 'Equipment requirements for multiclass characters';
COMMENT ON COLUMN combat_participants.multiclass_info IS 'Multiclass information for combat participants';

-- Create table for multiclass proficiencies if it doesn't exist
CREATE TABLE IF NOT EXISTS multiclass_proficiencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  armor_proficiencies JSONB,
  weapon_proficiencies JSONB,
  tool_proficiencies JSONB,
  saving_throw_proficiencies JSONB,
  skill_proficiencies JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE multiclass_proficiencies IS 'Stores combined proficiencies for multiclass characters';
COMMENT ON COLUMN multiclass_proficiencies.character_id IS 'The character this proficiency record belongs to';
COMMENT ON COLUMN multiclass_proficiencies.armor_proficiencies IS 'Combined armor proficiencies from all classes';
COMMENT ON COLUMN multiclass_proficiencies.weapon_proficiencies IS 'Combined weapon proficiencies from all classes';
COMMENT ON COLUMN multiclass_proficiencies.tool_proficiencies IS 'Combined tool proficiencies from all classes';
COMMENT ON COLUMN multiclass_proficiencies.saving_throw_proficiencies IS 'Combined saving throw proficiencies from all classes';
COMMENT ON COLUMN multiclass_proficiencies.skill_proficiencies IS 'Combined skill proficiencies from all classes';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_multiclass_proficiencies_character_id ON multiclass_proficiencies(character_id);

-- Add RLS (Row Level Security) policies for multiclass_proficiencies
DROP POLICY IF EXISTS "Users can view their character proficiencies" ON multiclass_proficiencies;
CREATE POLICY "Users can view their character proficiencies" ON multiclass_proficiencies
  FOR SELECT USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert their character proficiencies" ON multiclass_proficiencies;
CREATE POLICY "Users can insert their character proficiencies" ON multiclass_proficiencies
  FOR INSERT WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update their character proficiencies" ON multiclass_proficiencies;
CREATE POLICY "Users can update their character proficiencies" ON multiclass_proficiencies
  FOR UPDATE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete their character proficiencies" ON multiclass_proficiencies;
CREATE POLICY "Users can delete their character proficiencies" ON multiclass_proficiencies
  FOR DELETE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Enable RLS on multiclass_proficiencies table
ALTER TABLE multiclass_proficiencies ENABLE ROW LEVEL SECURITY;