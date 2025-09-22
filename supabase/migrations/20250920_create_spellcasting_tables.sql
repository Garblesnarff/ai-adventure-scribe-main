-- Migration: Create D&D 5E Spellcasting Tables
-- Date: 2025-09-20
-- Purpose: Create comprehensive database schema for D&D 5E spellcasting system
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- ===================================================================
-- CORE SPELLCASTING TABLES
-- ===================================================================

-- Create classes table with spellcasting information
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  hit_die INTEGER NOT NULL,
  spellcasting_ability VARCHAR(3), -- 'INT', 'WIS', 'CHA', or NULL for non-casters
  caster_type VARCHAR(20), -- 'full', 'half', 'third', 'pact', or NULL
  spell_slots_start_level INTEGER DEFAULT 1, -- Level when spellcasting starts
  ritual_casting BOOLEAN DEFAULT FALSE,
  spellcasting_focus_type VARCHAR(20), -- 'arcane', 'divine', 'druidic', 'component_pouch'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE classes IS 'D&D 5E class definitions with spellcasting information';
COMMENT ON COLUMN classes.spellcasting_ability IS 'Primary spellcasting ability: INT, WIS, or CHA';
COMMENT ON COLUMN classes.caster_type IS 'Type of spellcaster: full, half, third, pact, or NULL';
COMMENT ON COLUMN classes.spell_slots_start_level IS 'Character level when spellcasting begins';

-- Create spells table with complete spell information
CREATE TABLE IF NOT EXISTS spells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 9),
  school VARCHAR(20) NOT NULL,
  casting_time VARCHAR(50) NOT NULL,
  range_text VARCHAR(50) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  concentration BOOLEAN DEFAULT FALSE,
  ritual BOOLEAN DEFAULT FALSE,
  components_verbal BOOLEAN DEFAULT FALSE,
  components_somatic BOOLEAN DEFAULT FALSE,
  components_material BOOLEAN DEFAULT FALSE,
  material_components TEXT,
  material_cost_gp INTEGER DEFAULT 0,
  material_consumed BOOLEAN DEFAULT FALSE,
  description TEXT NOT NULL,
  higher_level_text TEXT,
  attack_type VARCHAR(20), -- 'melee', 'ranged', or NULL
  damage_type VARCHAR(20),
  damage_at_slot_level JSONB,
  heal_at_slot_level JSONB,
  area_of_effect JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE spells IS 'Complete D&D 5E spell database with all mechanics';
COMMENT ON COLUMN spells.level IS 'Spell level (0 for cantrips, 1-9 for leveled spells)';
COMMENT ON COLUMN spells.school IS 'School of magic (evocation, enchantment, etc.)';
COMMENT ON COLUMN spells.material_cost_gp IS 'Gold piece cost of material components';
COMMENT ON COLUMN spells.material_consumed IS 'Whether material components are consumed';

-- Create class-spell relationships (which spells each class can access)
CREATE TABLE IF NOT EXISTS class_spells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  spell_level INTEGER NOT NULL, -- Level at which class can cast this spell
  source_feature VARCHAR(50), -- 'base', 'domain', 'oath', 'patron', 'college', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, spell_id, source_feature)
);

COMMENT ON TABLE class_spells IS 'Many-to-many relationship between classes and their available spells';
COMMENT ON COLUMN class_spells.source_feature IS 'How the class gains access to this spell';

-- Create spell progression table (cantrips known, spell slots by level)
CREATE TABLE IF NOT EXISTS spell_progression (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  character_level INTEGER NOT NULL CHECK (character_level >= 1 AND character_level <= 20),
  cantrips_known INTEGER DEFAULT 0,
  spells_known INTEGER DEFAULT 0, -- For known casters (sorcerer, bard, etc.)
  spells_prepared_formula VARCHAR(50), -- Formula for prepared casters (e.g., "level + mod")
  spell_slots_1 INTEGER DEFAULT 0,
  spell_slots_2 INTEGER DEFAULT 0,
  spell_slots_3 INTEGER DEFAULT 0,
  spell_slots_4 INTEGER DEFAULT 0,
  spell_slots_5 INTEGER DEFAULT 0,
  spell_slots_6 INTEGER DEFAULT 0,
  spell_slots_7 INTEGER DEFAULT 0,
  spell_slots_8 INTEGER DEFAULT 0,
  spell_slots_9 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, character_level)
);

COMMENT ON TABLE spell_progression IS 'Spell progression by class and level (cantrips, slots, etc.)';
COMMENT ON COLUMN spell_progression.spells_prepared_formula IS 'Formula for calculating prepared spells';

-- Create multiclass spell slot calculation table
CREATE TABLE IF NOT EXISTS multiclass_spell_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caster_level INTEGER NOT NULL CHECK (caster_level >= 1 AND caster_level <= 20),
  spell_slots_1 INTEGER DEFAULT 0,
  spell_slots_2 INTEGER DEFAULT 0,
  spell_slots_3 INTEGER DEFAULT 0,
  spell_slots_4 INTEGER DEFAULT 0,
  spell_slots_5 INTEGER DEFAULT 0,
  spell_slots_6 INTEGER DEFAULT 0,
  spell_slots_7 INTEGER DEFAULT 0,
  spell_slots_8 INTEGER DEFAULT 0,
  spell_slots_9 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(caster_level)
);

COMMENT ON TABLE multiclass_spell_slots IS 'Spell slot progression for multiclass caster levels';

-- ===================================================================
-- CHARACTER SPELL TRACKING
-- ===================================================================

-- Create character spells table (individual character's known/prepared spells)
CREATE TABLE IF NOT EXISTS character_spells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  source_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  is_prepared BOOLEAN DEFAULT TRUE, -- Always true for known casters
  is_always_prepared BOOLEAN DEFAULT FALSE, -- Domain spells, racial spells, etc.
  source_feature VARCHAR(50) DEFAULT 'base', -- 'base', 'domain', 'racial', etc.
  spell_level_learned INTEGER, -- Level when spell was learned (for replacement rules)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, spell_id, source_class_id, source_feature)
);

COMMENT ON TABLE character_spells IS 'Individual character spell selections and preparation status';
COMMENT ON COLUMN character_spells.is_always_prepared IS 'Spells that do not count against preparation limits';
COMMENT ON COLUMN character_spells.source_feature IS 'How the character gained access to this spell';

-- ===================================================================
-- SPELLCASTING COMPONENTS AND FOCUSES
-- ===================================================================

-- Create spellcasting focuses table
CREATE TABLE IF NOT EXISTS spellcasting_focuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  focus_type VARCHAR(20) NOT NULL, -- 'arcane', 'divine', 'druidic', 'component_pouch'
  compatible_classes JSONB, -- Array of class names that can use this focus
  cost_gp INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE spellcasting_focuses IS 'Available spellcasting focuses and component pouches';

-- Create character spellcasting focuses
CREATE TABLE IF NOT EXISTS character_spellcasting_focuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  focus_id UUID NOT NULL REFERENCES spellcasting_focuses(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, focus_id)
);

COMMENT ON TABLE character_spellcasting_focuses IS 'Character-owned spellcasting focuses';

-- ===================================================================
-- SPELL USAGE TRACKING
-- ===================================================================

-- Create spell slot usage tracking
CREATE TABLE IF NOT EXISTS character_spell_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  source_class_id UUID REFERENCES classes(id) ON DELETE CASCADE, -- NULL for multiclass combined slots
  spell_level INTEGER NOT NULL CHECK (spell_level >= 1 AND spell_level <= 9),
  total_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  is_warlock_slot BOOLEAN DEFAULT FALSE, -- Separate tracking for Warlock Pact Magic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, source_class_id, spell_level, is_warlock_slot)
);

COMMENT ON TABLE character_spell_slots IS 'Character spell slot tracking by level and class';
COMMENT ON COLUMN character_spell_slots.is_warlock_slot IS 'Separate tracking for Warlock Pact Magic slots';

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);
CREATE INDEX IF NOT EXISTS idx_classes_caster_type ON classes(caster_type);

CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);
CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level);
CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school);
CREATE INDEX IF NOT EXISTS idx_spells_level_school ON spells(level, school);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_class_spells_class_id ON class_spells(class_id);
CREATE INDEX IF NOT EXISTS idx_class_spells_spell_id ON class_spells(spell_id);
CREATE INDEX IF NOT EXISTS idx_class_spells_class_spell ON class_spells(class_id, spell_id);

CREATE INDEX IF NOT EXISTS idx_spell_progression_class_level ON spell_progression(class_id, character_level);
CREATE INDEX IF NOT EXISTS idx_multiclass_spell_slots_caster_level ON multiclass_spell_slots(caster_level);

-- Character spell indexes
CREATE INDEX IF NOT EXISTS idx_character_spells_character_id ON character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_spell_id ON character_spells(spell_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_prepared ON character_spells(character_id, is_prepared);
CREATE INDEX IF NOT EXISTS idx_character_spells_source_class ON character_spells(character_id, source_class_id);

CREATE INDEX IF NOT EXISTS idx_character_spell_slots_character_id ON character_spell_slots(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spell_slots_class_level ON character_spell_slots(character_id, source_class_id, spell_level);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on character-specific tables
ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_spellcasting_focuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_spell_slots ENABLE ROW LEVEL SECURITY;

-- Character spells policies
DROP POLICY IF EXISTS "Users can view their character spells" ON character_spells;
CREATE POLICY "Users can view their character spells" ON character_spells
  FOR SELECT USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert their character spells" ON character_spells;
CREATE POLICY "Users can insert their character spells" ON character_spells
  FOR INSERT WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update their character spells" ON character_spells;
CREATE POLICY "Users can update their character spells" ON character_spells
  FOR UPDATE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete their character spells" ON character_spells;
CREATE POLICY "Users can delete their character spells" ON character_spells
  FOR DELETE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Character spellcasting focuses policies
DROP POLICY IF EXISTS "Users can view their character focuses" ON character_spellcasting_focuses;
CREATE POLICY "Users can view their character focuses" ON character_spellcasting_focuses
  FOR SELECT USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert their character focuses" ON character_spellcasting_focuses;
CREATE POLICY "Users can insert their character focuses" ON character_spellcasting_focuses
  FOR INSERT WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update their character focuses" ON character_spellcasting_focuses;
CREATE POLICY "Users can update their character focuses" ON character_spellcasting_focuses
  FOR UPDATE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete their character focuses" ON character_spellcasting_focuses;
CREATE POLICY "Users can delete their character focuses" ON character_spellcasting_focuses
  FOR DELETE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Character spell slots policies
DROP POLICY IF EXISTS "Users can view their character spell slots" ON character_spell_slots;
CREATE POLICY "Users can view their character spell slots" ON character_spell_slots
  FOR SELECT USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can insert their character spell slots" ON character_spell_slots;
CREATE POLICY "Users can insert their character spell slots" ON character_spell_slots
  FOR INSERT WITH CHECK (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can update their character spell slots" ON character_spell_slots;
CREATE POLICY "Users can update their character spell slots" ON character_spell_slots
  FOR UPDATE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

DROP POLICY IF EXISTS "Users can delete their character spell slots" ON character_spell_slots;
CREATE POLICY "Users can delete their character spell slots" ON character_spell_slots
  FOR DELETE USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- ===================================================================
-- INITIAL DATA SETUP FUNCTIONS
-- ===================================================================

-- Function to calculate multiclass caster level
CREATE OR REPLACE FUNCTION calculate_multiclass_caster_level(class_levels JSONB)
RETURNS INTEGER AS $$
DECLARE
  class_level RECORD;
  caster_level INTEGER := 0;
  class_info RECORD;
BEGIN
  -- Loop through each class level
  FOR class_level IN SELECT * FROM jsonb_each(class_levels)
  LOOP
    -- Get class caster type
    SELECT caster_type INTO class_info
    FROM classes
    WHERE name = class_level.key;

    IF class_info.caster_type = 'full' THEN
      caster_level := caster_level + (class_level.value)::INTEGER;
    ELSIF class_info.caster_type = 'half' THEN
      caster_level := caster_level + FLOOR((class_level.value)::INTEGER / 2);
    ELSIF class_info.caster_type = 'third' THEN
      caster_level := caster_level + FLOOR((class_level.value)::INTEGER / 3);
    END IF;
    -- Warlock (pact) magic is handled separately
  END LOOP;

  RETURN GREATEST(caster_level, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_multiclass_caster_level IS 'Calculate effective caster level for multiclass characters';

-- Function to get character spell save DC
CREATE OR REPLACE FUNCTION get_spell_save_dc(character_id UUID, class_name VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  char_stats RECORD;
  class_info RECORD;
  proficiency_bonus INTEGER;
  ability_modifier INTEGER;
BEGIN
  -- Get character stats
  SELECT * INTO char_stats
  FROM character_stats cs
  JOIN characters c ON cs.character_id = c.id
  WHERE c.id = character_id;

  -- Get class spellcasting ability
  SELECT * INTO class_info
  FROM classes
  WHERE name = class_name;

  -- Calculate proficiency bonus based on total level
  SELECT CEIL(char_stats.total_level / 4.0) + 1 INTO proficiency_bonus;

  -- Get ability modifier based on spellcasting ability
  IF class_info.spellcasting_ability = 'INT' THEN
    ability_modifier := FLOOR((char_stats.intelligence - 10) / 2);
  ELSIF class_info.spellcasting_ability = 'WIS' THEN
    ability_modifier := FLOOR((char_stats.wisdom - 10) / 2);
  ELSIF class_info.spellcasting_ability = 'CHA' THEN
    ability_modifier := FLOOR((char_stats.charisma - 10) / 2);
  ELSE
    ability_modifier := 0;
  END IF;

  RETURN 8 + proficiency_bonus + ability_modifier;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_spell_save_dc IS 'Calculate spell save DC for a character and class';