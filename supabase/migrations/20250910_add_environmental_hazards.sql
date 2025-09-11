-- Migration: Add environmental hazards tables
-- Date: 2025-09-10
-- Purpose: Add database tables to support environmental hazards and interactions
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- Create table for environmental hazards
CREATE TABLE IF NOT EXISTS environmental_hazards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  -- Hazard properties
  is_instant BOOLEAN DEFAULT false,
  is_area_effect BOOLEAN DEFAULT false,
  area_of_effect JSONB,
  -- Detection properties
  detect_dc INTEGER,
  detect_skill TEXT,
  -- Saving throw properties
  save_dc INTEGER,
  save_ability TEXT,
  -- Damage properties
  damage JSONB,
  -- Condition effects
  conditions JSONB,
  -- Special effects
  special_effects JSONB,
  -- Exhaustion effects
  exhaustion_level INTEGER,
  -- Movement effects
  movement_modifier NUMERIC,
  -- Duration for ongoing effects
  duration INTEGER,
  -- Recharge properties
  recharge_rate TEXT,
  -- Trigger conditions
  trigger_type TEXT,
  -- Stealth properties
  is_hidden BOOLEAN DEFAULT false,
  -- Positioning
  position_x INTEGER,
  position_y INTEGER,
  position_z INTEGER,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE environmental_hazards IS 'Environmental hazards that can affect characters in the game world';
COMMENT ON COLUMN environmental_hazards.campaign_id IS 'The campaign this hazard belongs to';
COMMENT ON COLUMN environmental_hazards.name IS 'Name of the environmental hazard';
COMMENT ON COLUMN environmental_hazards.type IS 'Type of hazard (acid_pool, extreme_heat, etc.)';
COMMENT ON COLUMN environmental_hazards.description IS 'Description of the hazard';
COMMENT ON COLUMN environmental_hazards.is_instant IS 'Whether this is a one-time effect vs. ongoing';
COMMENT ON COLUMN environmental_hazards.is_area_effect IS 'Whether this affects an area vs. single target';
COMMENT ON COLUMN environmental_hazards.area_of_effect IS 'Shape and size of area effect';
COMMENT ON COLUMN environmental_hazards.detect_dc IS 'DC to notice the hazard';
COMMENT ON COLUMN environmental_hazards.detect_skill IS 'Skill used to detect the hazard';
COMMENT ON COLUMN environmental_hazards.save_dc IS 'DC for saving throw against the hazard';
COMMENT ON COLUMN environmental_hazards.save_ability IS 'Ability used for saving throw';
COMMENT ON COLUMN environmental_hazards.damage IS 'Damage information for the hazard';
COMMENT ON COLUMN environmental_hazards.conditions IS 'Conditions applied by the hazard';
COMMENT ON COLUMN environmental_hazards.special_effects IS 'Special effects of the hazard';
COMMENT ON COLUMN environmental_hazards.exhaustion_level IS 'Level of exhaustion applied';
COMMENT ON COLUMN environmental_hazards.movement_modifier IS 'Multiplier to movement speed';
COMMENT ON COLUMN environmental_hazards.duration IS 'Duration in rounds for ongoing hazards';
COMMENT ON COLUMN environmental_hazards.recharge_rate IS 'How often the hazard can reset';
COMMENT ON COLUMN environmental_hazards.trigger_type IS 'What triggers the hazard';
COMMENT ON COLUMN environmental_hazards.is_hidden IS 'Whether the hazard is hidden';
COMMENT ON COLUMN environmental_hazards.position_x IS 'X coordinate of hazard position';
COMMENT ON COLUMN environmental_hazards.position_y IS 'Y coordinate of hazard position';
COMMENT ON COLUMN environmental_hazards.position_z IS 'Z coordinate of hazard position';

-- Create table for hazard interactions
CREATE TABLE IF NOT EXISTS hazard_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hazard_id UUID REFERENCES environmental_hazards(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  roll_result INTEGER,
  success BOOLEAN,
  damage_dealt INTEGER,
  conditions_applied JSONB,
  exhaustion_applied INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hazard_interactions IS 'Records of character interactions with environmental hazards';
COMMENT ON COLUMN hazard_interactions.hazard_id IS 'The hazard being interacted with';
COMMENT ON COLUMN hazard_interactions.character_id IS 'The character interacting with the hazard';
COMMENT ON COLUMN hazard_interactions.interaction_type IS 'Type of interaction (detect, trigger, avoid, mitigate)';
COMMENT ON COLUMN hazard_interactions.roll_result IS 'Result of any dice roll';
COMMENT ON COLUMN hazard_interactions.success IS 'Whether the interaction was successful';
COMMENT ON COLUMN hazard_interactions.damage_dealt IS 'Damage dealt by the hazard';
COMMENT ON COLUMN hazard_interactions.conditions_applied IS 'Conditions applied to the character';
COMMENT ON COLUMN hazard_interactions.exhaustion_applied IS 'Exhaustion level applied';
COMMENT ON COLUMN hazard_interactions.notes IS 'Additional notes about the interaction';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_environmental_hazards_campaign_id ON environmental_hazards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_environmental_hazards_type ON environmental_hazards(type);
CREATE INDEX IF NOT EXISTS idx_environmental_hazards_is_hidden ON environmental_hazards(is_hidden);
CREATE INDEX IF NOT EXISTS idx_hazard_interactions_hazard_id ON hazard_interactions(hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazard_interactions_character_id ON hazard_interactions(character_id);
CREATE INDEX IF NOT EXISTS idx_hazard_interactions_interaction_type ON hazard_interactions(interaction_type);

-- Add RLS (Row Level Security) policies
-- Users can only see hazards in their campaigns
DROP POLICY IF EXISTS "Users can view hazards in their campaigns" ON environmental_hazards;
CREATE POLICY "Users can view hazards in their campaigns" ON environmental_hazards
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert hazards in their campaigns" ON environmental_hazards;
CREATE POLICY "Users can insert hazards in their campaigns" ON environmental_hazards
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update hazards in their campaigns" ON environmental_hazards;
CREATE POLICY "Users can update hazards in their campaigns" ON environmental_hazards
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete hazards in their campaigns" ON environmental_hazards;
CREATE POLICY "Users can delete hazards in their campaigns" ON environmental_hazards
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Enable RLS on environmental_hazards table
ALTER TABLE environmental_hazards ENABLE ROW LEVEL SECURITY;

-- Users can only see interactions for their characters
DROP POLICY IF EXISTS "Users can view their character interactions" ON hazard_interactions;
CREATE POLICY "Users can view their character interactions" ON hazard_interactions
  FOR SELECT USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert interactions for their characters" ON hazard_interactions;
CREATE POLICY "Users can insert interactions for their characters" ON hazard_interactions
  FOR INSERT WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update interactions for their characters" ON hazard_interactions;
CREATE POLICY "Users can update interactions for their characters" ON hazard_interactions
  FOR UPDATE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete interactions for their characters" ON hazard_interactions;
CREATE POLICY "Users can delete interactions for their characters" ON hazard_interactions
  FOR DELETE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Enable RLS on hazard_interactions table
ALTER TABLE hazard_interactions ENABLE ROW LEVEL SECURITY;