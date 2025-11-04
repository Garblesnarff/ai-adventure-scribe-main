-- Migration: Create Atomic Character Creation Function
-- Date: 2025-11-03
-- Purpose: Implement transaction-based character creation across multiple tables
-- Status: Safe to run multiple times (uses CREATE OR REPLACE)

-- ===================================================================
-- ATOMIC CHARACTER CREATION FUNCTION
-- ===================================================================

CREATE OR REPLACE FUNCTION create_character_atomic(
  character_data jsonb,
  stats_data jsonb,
  equipment_data jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_character_id uuid;
  equipment_record jsonb;
BEGIN
  -- Step 1: Insert character (will rollback everything on failure)
  -- All required character fields with proper type casting
  INSERT INTO characters (
    user_id,
    campaign_id,
    name,
    race,
    class,
    level,
    alignment,
    experience_points,
    image_url,
    avatar_url,
    background_image,
    appearance,
    personality_traits,
    backstory_elements,
    background,
    personality_notes,
    description,
    subrace,
    theme,
    skill_proficiencies,
    tool_proficiencies,
    saving_throw_proficiencies,
    languages,
    cantrips,
    known_spells,
    prepared_spells,
    ritual_spells,
    class_levels,
    total_level
  )
  VALUES (
    (character_data->>'user_id')::uuid,
    (character_data->>'campaign_id')::uuid,
    character_data->>'name',
    character_data->>'race',
    character_data->>'class',
    COALESCE((character_data->>'level')::integer, 1),
    character_data->>'alignment',
    COALESCE((character_data->>'experience_points')::integer, 0),
    character_data->>'image_url',
    character_data->>'avatar_url',
    character_data->>'background_image',
    character_data->>'appearance',
    character_data->>'personality_traits',
    character_data->>'backstory_elements',
    character_data->>'background',
    character_data->>'personality_notes',
    character_data->>'description',
    character_data->>'subrace',
    character_data->>'theme',
    character_data->>'skill_proficiencies',
    character_data->>'tool_proficiencies',
    character_data->>'saving_throw_proficiencies',
    CASE
      WHEN jsonb_typeof(character_data->'languages') = 'array' THEN
        (SELECT array_agg(value::text) FROM jsonb_array_elements_text(character_data->'languages'))
      ELSE NULL
    END,
    character_data->>'cantrips',
    character_data->>'known_spells',
    character_data->>'prepared_spells',
    character_data->>'ritual_spells',
    character_data->>'class_levels',
    COALESCE((character_data->>'total_level')::integer, (character_data->>'level')::integer, 1)
  )
  RETURNING id INTO new_character_id;

  -- Step 2: Insert character stats
  -- Using UPSERT to handle the case where stats might already exist
  INSERT INTO character_stats (
    character_id,
    strength,
    dexterity,
    constitution,
    intelligence,
    wisdom,
    charisma,
    armor_class,
    current_hit_points,
    max_hit_points
  )
  VALUES (
    new_character_id,
    (stats_data->>'strength')::integer,
    (stats_data->>'dexterity')::integer,
    (stats_data->>'constitution')::integer,
    (stats_data->>'intelligence')::integer,
    (stats_data->>'wisdom')::integer,
    (stats_data->>'charisma')::integer,
    COALESCE((stats_data->>'armor_class')::integer, 10),
    COALESCE((stats_data->>'current_hit_points')::integer, 8),
    COALESCE((stats_data->>'max_hit_points')::integer, 8)
  )
  ON CONFLICT (character_id) DO UPDATE SET
    strength = EXCLUDED.strength,
    dexterity = EXCLUDED.dexterity,
    constitution = EXCLUDED.constitution,
    intelligence = EXCLUDED.intelligence,
    wisdom = EXCLUDED.wisdom,
    charisma = EXCLUDED.charisma,
    armor_class = EXCLUDED.armor_class,
    current_hit_points = EXCLUDED.current_hit_points,
    max_hit_points = EXCLUDED.max_hit_points;

  -- Step 3: Insert equipment (if provided)
  -- Equipment is optional and handled as an array of items
  IF equipment_data IS NOT NULL AND jsonb_array_length(equipment_data) > 0 THEN
    FOR equipment_record IN SELECT * FROM jsonb_array_elements(equipment_data)
    LOOP
      INSERT INTO character_equipment (
        character_id,
        item_name,
        item_type,
        quantity,
        equipped,
        is_magic,
        magic_bonus,
        magic_properties,
        requires_attunement,
        is_attuned,
        attunement_requirements,
        magic_item_type,
        magic_item_rarity,
        magic_effects
      )
      VALUES (
        new_character_id,
        equipment_record->>'item_name',
        COALESCE(equipment_record->>'item_type', 'equipment'),
        COALESCE((equipment_record->>'quantity')::integer, 1),
        COALESCE((equipment_record->>'equipped')::boolean, false),
        COALESCE((equipment_record->>'is_magic')::boolean, false),
        COALESCE((equipment_record->>'magic_bonus')::integer, 0),
        equipment_record->>'magic_properties',
        COALESCE((equipment_record->>'requires_attunement')::boolean, false),
        COALESCE((equipment_record->>'is_attuned')::boolean, false),
        equipment_record->>'attunement_requirements',
        equipment_record->>'magic_item_type',
        COALESCE(equipment_record->>'magic_item_rarity', 'common'),
        equipment_record->>'magic_effects'
      )
      ON CONFLICT (character_id, item_name) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        equipped = EXCLUDED.equipped,
        is_magic = EXCLUDED.is_magic,
        magic_bonus = EXCLUDED.magic_bonus,
        magic_properties = EXCLUDED.magic_properties,
        requires_attunement = EXCLUDED.requires_attunement,
        is_attuned = EXCLUDED.is_attuned,
        attunement_requirements = EXCLUDED.attunement_requirements,
        magic_item_type = EXCLUDED.magic_item_type,
        magic_item_rarity = EXCLUDED.magic_item_rarity,
        magic_effects = EXCLUDED.magic_effects;
    END LOOP;
  END IF;

  RETURN new_character_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    -- Re-raise the exception with context
    RAISE EXCEPTION 'Character creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_character_atomic IS 'Atomically creates a character with stats and equipment in a single transaction. Rolls back all changes on any failure.';

-- ===================================================================
-- HELPER FUNCTION: UPDATE CHARACTER WITH SPELLS
-- ===================================================================

-- This function is called separately because spell creation happens
-- via the backend API after character creation
CREATE OR REPLACE FUNCTION update_character_spells(
  p_character_id uuid,
  p_spell_ids uuid[],
  p_class_name text
) RETURNS void AS $$
DECLARE
  v_class_id uuid;
  v_spell_id uuid;
BEGIN
  -- Get the class ID
  SELECT id INTO v_class_id
  FROM classes
  WHERE name = p_class_name;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Class % not found', p_class_name;
  END IF;

  -- Delete existing spells for this character/class combination
  DELETE FROM character_spells
  WHERE character_id = p_character_id
    AND source_class_id = v_class_id;

  -- Insert new spells
  FOREACH v_spell_id IN ARRAY p_spell_ids
  LOOP
    INSERT INTO character_spells (
      character_id,
      spell_id,
      source_class_id,
      is_prepared,
      is_always_prepared,
      source_feature
    )
    VALUES (
      p_character_id,
      v_spell_id,
      v_class_id,
      true, -- Default to prepared
      false,
      'base'
    )
    ON CONFLICT (character_id, spell_id, source_class_id, source_feature)
    DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_character_spells IS 'Updates character spells for a given class. This is separate from atomic creation because spells are handled via backend API.';
