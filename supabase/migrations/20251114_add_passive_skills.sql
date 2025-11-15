-- Migration: Add Passive Skills Functions and Views
-- Date: 2025-11-14
-- Purpose: Implement D&D 5E passive skill calculations (Perception, Insight, Investigation)
-- Formula: Passive Skill = 10 + ability modifier + proficiency bonus (if proficient)
-- Status: Safe to run multiple times (uses CREATE OR REPLACE)

-- ===================================================================
-- HELPER FUNCTION: Calculate Proficiency Bonus from Level
-- ===================================================================
CREATE OR REPLACE FUNCTION get_proficiency_bonus(character_level integer)
RETURNS integer AS $$
BEGIN
  RETURN CASE
    WHEN character_level >= 17 THEN 6
    WHEN character_level >= 13 THEN 5
    WHEN character_level >= 9 THEN 4
    WHEN character_level >= 5 THEN 3
    ELSE 2
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_proficiency_bonus IS 'Calculate D&D 5E proficiency bonus based on character level';

-- ===================================================================
-- HELPER FUNCTION: Calculate Ability Modifier
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_ability_modifier(ability_score integer)
RETURNS integer AS $$
BEGIN
  RETURN FLOOR((ability_score - 10) / 2.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_ability_modifier IS 'Calculate ability modifier from ability score: (score - 10) / 2, rounded down';

-- ===================================================================
-- FUNCTION: Calculate Passive Perception
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_passive_perception(
  character_id uuid
)
RETURNS integer AS $$
DECLARE
  wisdom_score integer;
  character_level integer;
  is_proficient boolean;
  proficiency_bonus integer;
  wisdom_modifier integer;
BEGIN
  -- Get character data
  SELECT
    cs.wisdom,
    c.level,
    COALESCE(c.skill_proficiencies LIKE '%Perception%', false)
  INTO
    wisdom_score,
    character_level,
    is_proficient
  FROM characters c
  LEFT JOIN character_stats cs ON cs.character_id = c.id
  WHERE c.id = calculate_passive_perception.character_id;

  -- Handle null case
  IF wisdom_score IS NULL OR character_level IS NULL THEN
    RETURN 10;
  END IF;

  -- Calculate components
  wisdom_modifier := calculate_ability_modifier(wisdom_score);
  proficiency_bonus := get_proficiency_bonus(character_level);

  -- Return passive perception: 10 + modifier + proficiency (if proficient)
  RETURN 10 + wisdom_modifier + (CASE WHEN is_proficient THEN proficiency_bonus ELSE 0 END);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_passive_perception IS 'Calculate passive Perception (Wisdom-based) for a character';

-- ===================================================================
-- FUNCTION: Calculate Passive Insight
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_passive_insight(
  character_id uuid
)
RETURNS integer AS $$
DECLARE
  wisdom_score integer;
  character_level integer;
  is_proficient boolean;
  proficiency_bonus integer;
  wisdom_modifier integer;
BEGIN
  -- Get character data
  SELECT
    cs.wisdom,
    c.level,
    COALESCE(c.skill_proficiencies LIKE '%Insight%', false)
  INTO
    wisdom_score,
    character_level,
    is_proficient
  FROM characters c
  LEFT JOIN character_stats cs ON cs.character_id = c.id
  WHERE c.id = calculate_passive_insight.character_id;

  -- Handle null case
  IF wisdom_score IS NULL OR character_level IS NULL THEN
    RETURN 10;
  END IF;

  -- Calculate components
  wisdom_modifier := calculate_ability_modifier(wisdom_score);
  proficiency_bonus := get_proficiency_bonus(character_level);

  -- Return passive insight: 10 + modifier + proficiency (if proficient)
  RETURN 10 + wisdom_modifier + (CASE WHEN is_proficient THEN proficiency_bonus ELSE 0 END);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_passive_insight IS 'Calculate passive Insight (Wisdom-based) for a character';

-- ===================================================================
-- FUNCTION: Calculate Passive Investigation
-- ===================================================================
CREATE OR REPLACE FUNCTION calculate_passive_investigation(
  character_id uuid
)
RETURNS integer AS $$
DECLARE
  intelligence_score integer;
  character_level integer;
  is_proficient boolean;
  proficiency_bonus integer;
  intelligence_modifier integer;
BEGIN
  -- Get character data
  SELECT
    cs.intelligence,
    c.level,
    COALESCE(c.skill_proficiencies LIKE '%Investigation%', false)
  INTO
    intelligence_score,
    character_level,
    is_proficient
  FROM characters c
  LEFT JOIN character_stats cs ON cs.character_id = c.id
  WHERE c.id = calculate_passive_investigation.character_id;

  -- Handle null case
  IF intelligence_score IS NULL OR character_level IS NULL THEN
    RETURN 10;
  END IF;

  -- Calculate components
  intelligence_modifier := calculate_ability_modifier(intelligence_score);
  proficiency_bonus := get_proficiency_bonus(character_level);

  -- Return passive investigation: 10 + modifier + proficiency (if proficient)
  RETURN 10 + intelligence_modifier + (CASE WHEN is_proficient THEN proficiency_bonus ELSE 0 END);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_passive_investigation IS 'Calculate passive Investigation (Intelligence-based) for a character';

-- ===================================================================
-- VIEW: Character Passive Skills
-- Provides easy access to all passive skills for a character
-- ===================================================================
CREATE OR REPLACE VIEW character_passive_skills AS
SELECT
  c.id as character_id,
  c.name as character_name,
  c.level,
  cs.wisdom,
  cs.intelligence,
  calculate_passive_perception(c.id) as passive_perception,
  calculate_passive_insight(c.id) as passive_insight,
  calculate_passive_investigation(c.id) as passive_investigation,
  c.skill_proficiencies
FROM characters c
LEFT JOIN character_stats cs ON cs.character_id = c.id;

COMMENT ON VIEW character_passive_skills IS 'View showing all passive skills for each character';

-- ===================================================================
-- EXAMPLE USAGE
-- ===================================================================
-- Query passive skills for a character:
--   SELECT * FROM character_passive_skills WHERE character_id = 'some-uuid';
--
-- Query characters who would notice something (DC 15 Perception):
--   SELECT character_name, passive_perception
--   FROM character_passive_skills
--   WHERE passive_perception >= 15;
--
-- Direct function call:
--   SELECT calculate_passive_perception('character-uuid');
