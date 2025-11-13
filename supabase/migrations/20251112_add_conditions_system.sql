-- Migration: Add D&D 5E Conditions System
-- Date: 2025-11-12
-- Purpose: Implement complete conditions tracking for combat with all 13 core D&D 5E conditions
-- Status: Safe to run multiple times (uses IF NOT EXISTS)

-- =====================================================
-- COMBAT ENCOUNTERS TABLE
-- =====================================================
-- Tracks active combat encounters within game sessions

CREATE TABLE IF NOT EXISTS combat_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON combat_encounters(status);

COMMENT ON TABLE combat_encounters IS 'Tracks active combat encounters within game sessions';
COMMENT ON COLUMN combat_encounters.current_round IS 'Current combat round (6 seconds per round)';
COMMENT ON COLUMN combat_encounters.current_turn_order IS 'Index of current participant in turn order';

-- =====================================================
-- COMBAT PARTICIPANTS TABLE
-- =====================================================
-- Individual combatants in an encounter (PCs, NPCs, monsters)

CREATE TABLE IF NOT EXISTS combat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initiative INTEGER NOT NULL,
  initiative_modifier INTEGER NOT NULL DEFAULT 0,
  turn_order INTEGER NOT NULL,
  max_hp INTEGER NOT NULL DEFAULT 10,
  current_hp INTEGER NOT NULL DEFAULT 10,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  multiclass_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_type CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL) OR
    (character_id IS NULL AND npc_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_combat_participants_encounter ON combat_participants(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_turn_order ON combat_participants(encounter_id, turn_order);
CREATE INDEX IF NOT EXISTS idx_combat_participants_character ON combat_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_npc ON combat_participants(npc_id);

COMMENT ON TABLE combat_participants IS 'Individual combatants in an encounter (PCs, NPCs, monsters)';
COMMENT ON COLUMN combat_participants.turn_order IS 'Position in initiative order (0-indexed)';
COMMENT ON COLUMN combat_participants.temp_hp IS 'Temporary hit points (do not stack)';

-- =====================================================
-- CONDITIONS LIBRARY TABLE
-- =====================================================
-- Reference table for all D&D 5E conditions

CREATE TABLE IF NOT EXISTS conditions_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  mechanical_effects TEXT NOT NULL,
  icon_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_library_name ON conditions_library(name);

COMMENT ON TABLE conditions_library IS 'Reference table for all D&D 5E conditions with mechanical effects';
COMMENT ON COLUMN conditions_library.mechanical_effects IS 'JSON string describing mechanical effects (advantage, disadvantage, speed, etc.)';

-- =====================================================
-- COMBAT PARTICIPANT CONDITIONS TABLE
-- =====================================================
-- Tracks active conditions applied to combat participants

CREATE TABLE IF NOT EXISTS combat_participant_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES conditions_library(id) ON DELETE CASCADE,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('rounds', 'minutes', 'hours', 'until_save', 'permanent')),
  duration_value INTEGER,
  save_dc INTEGER,
  save_ability TEXT CHECK (save_ability IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')),
  applied_at_round INTEGER NOT NULL,
  expires_at_round INTEGER,
  source_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_participant ON combat_participant_conditions(participant_id);
CREATE INDEX IF NOT EXISTS idx_conditions_active ON combat_participant_conditions(participant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conditions_expiry ON combat_participant_conditions(expires_at_round, is_active);

COMMENT ON TABLE combat_participant_conditions IS 'Tracks active conditions applied to combat participants';
COMMENT ON COLUMN combat_participant_conditions.duration_type IS 'How the condition duration is measured';
COMMENT ON COLUMN combat_participant_conditions.applied_at_round IS 'Round number when condition was applied';
COMMENT ON COLUMN combat_participant_conditions.expires_at_round IS 'Round number when condition expires (NULL for until_save or permanent)';

-- =====================================================
-- SEED CORE D&D 5E CONDITIONS
-- =====================================================
-- Insert all 13 core conditions from the D&D 5E Player's Handbook

INSERT INTO conditions_library (name, description, mechanical_effects, icon_name)
VALUES
  (
    'Blinded',
    'A blinded creature can''t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature''s attack rolls have disadvantage.',
    '{"attack_rolls": "disadvantage", "attacks_against": "advantage", "ability_checks_sight": "auto_fail"}',
    'eye-slash'
  ),
  (
    'Charmed',
    'A charmed creature can''t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.',
    '{"cannot_attack_charmer": true, "social_checks_by_charmer": "advantage"}',
    'heart'
  ),
  (
    'Deafened',
    'A deafened creature can''t hear and automatically fails any ability check that requires hearing.',
    '{"ability_checks_hearing": "auto_fail"}',
    'ear-slash'
  ),
  (
    'Frightened',
    'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can''t willingly move closer to the source of its fear.',
    '{"attack_rolls": "disadvantage", "ability_checks": "disadvantage", "movement": "cannot_move_closer"}',
    'face-fearful'
  ),
  (
    'Grappled',
    'A grappled creature''s speed becomes 0, and it can''t benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler or grappling effect.',
    '{"speed": 0, "speed_bonuses_negated": true}',
    'hand-back-fist'
  ),
  (
    'Incapacitated',
    'An incapacitated creature can''t take actions or reactions.',
    '{"actions": "none", "reactions": "none"}',
    'dizzy'
  ),
  (
    'Invisible',
    'An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature''s location can be detected by any noise it makes or any tracks it leaves. Attack rolls against the creature have disadvantage, and the creature''s attack rolls have advantage.',
    '{"attack_rolls": "advantage", "attacks_against": "disadvantage", "hiding": "heavily_obscured"}',
    'ghost'
  ),
  (
    'Paralyzed',
    'A paralyzed creature is incapacitated and can''t move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
    '{"actions": "none", "reactions": "none", "movement": 0, "speech": false, "saving_throws_str": "auto_fail", "saving_throws_dex": "auto_fail", "attacks_against": "advantage", "attacks_against_within_5ft": "critical_on_hit"}',
    'user-lock'
  ),
  (
    'Petrified',
    'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can''t move or speak, and is unaware of its surroundings. Attack rolls against the creature have advantage. The creature automatically fails Strength and Dexterity saving throws. The creature has resistance to all damage. The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.',
    '{"actions": "none", "reactions": "none", "movement": 0, "speech": false, "awareness": false, "saving_throws_str": "auto_fail", "saving_throws_dex": "auto_fail", "attacks_against": "advantage", "resistance": "all_damage", "immunity": "poison_disease"}',
    'monument'
  ),
  (
    'Poisoned',
    'A poisoned creature has disadvantage on attack rolls and ability checks.',
    '{"attack_rolls": "disadvantage", "ability_checks": "disadvantage"}',
    'skull-crossbones'
  ),
  (
    'Prone',
    'A prone creature''s only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.',
    '{"attack_rolls": "disadvantage", "movement": "crawl_only", "attacks_against_melee": "advantage", "attacks_against_ranged": "disadvantage"}',
    'person-falling'
  ),
  (
    'Restrained',
    'A restrained creature''s speed becomes 0, and it can''t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature''s attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.',
    '{"speed": 0, "speed_bonuses_negated": true, "attack_rolls": "disadvantage", "attacks_against": "advantage", "saving_throws_dex": "disadvantage"}',
    'chains'
  ),
  (
    'Stunned',
    'A stunned creature is incapacitated, can''t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage.',
    '{"actions": "none", "reactions": "none", "movement": 0, "speech": "faltering", "saving_throws_str": "auto_fail", "saving_throws_dex": "auto_fail", "attacks_against": "advantage"}',
    'star-exclamation'
  ),
  (
    'Unconscious',
    'An unconscious creature is incapacitated, can''t move or speak, and is unaware of its surroundings. The creature drops whatever it''s holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.',
    '{"actions": "none", "reactions": "none", "movement": 0, "speech": false, "awareness": false, "drops_held_items": true, "prone": true, "saving_throws_str": "auto_fail", "saving_throws_dex": "auto_fail", "attacks_against": "advantage", "attacks_against_within_5ft": "critical_on_hit"}',
    'bed'
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Ensure users can only access their own combat data

ALTER TABLE combat_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_participant_conditions ENABLE ROW LEVEL SECURITY;

-- Combat encounters: users can access if they own the session
DROP POLICY IF EXISTS "Users can view their combat encounters" ON combat_encounters;
CREATE POLICY "Users can view their combat encounters" ON combat_encounters
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM game_sessions gs
      WHERE gs.id = session_id
      AND (
        -- User owns the session's campaign
        EXISTS (
          SELECT 1 FROM campaigns c
          WHERE c.id = gs.campaign_id
          AND c.user_id = auth.uid()::text
        )
        OR
        -- User owns the session's character
        EXISTS (
          SELECT 1 FROM characters ch
          WHERE ch.id = gs.character_id
          AND ch.user_id = auth.uid()::text
        )
        OR
        -- User is a member of the campaign
        EXISTS (
          SELECT 1 FROM campaign_members cm
          WHERE cm.campaign_id = gs.campaign_id
          AND cm.user_id = auth.uid()::text
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert their combat encounters" ON combat_encounters;
CREATE POLICY "Users can insert their combat encounters" ON combat_encounters
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions gs
      WHERE gs.id = session_id
      AND (
        EXISTS (
          SELECT 1 FROM campaigns c
          WHERE c.id = gs.campaign_id
          AND c.user_id = auth.uid()::text
        )
        OR
        EXISTS (
          SELECT 1 FROM characters ch
          WHERE ch.id = gs.character_id
          AND ch.user_id = auth.uid()::text
        )
        OR
        EXISTS (
          SELECT 1 FROM campaign_members cm
          WHERE cm.campaign_id = gs.campaign_id
          AND cm.user_id = auth.uid()::text
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their combat encounters" ON combat_encounters;
CREATE POLICY "Users can update their combat encounters" ON combat_encounters
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM game_sessions gs
      WHERE gs.id = session_id
      AND (
        EXISTS (
          SELECT 1 FROM campaigns c
          WHERE c.id = gs.campaign_id
          AND c.user_id = auth.uid()::text
        )
        OR
        EXISTS (
          SELECT 1 FROM characters ch
          WHERE ch.id = gs.character_id
          AND ch.user_id = auth.uid()::text
        )
        OR
        EXISTS (
          SELECT 1 FROM campaign_members cm
          WHERE cm.campaign_id = gs.campaign_id
          AND cm.user_id = auth.uid()::text
        )
      )
    )
  );

-- Combat participants: inherit permissions from encounter
DROP POLICY IF EXISTS "Users can view combat participants" ON combat_participants;
CREATE POLICY "Users can view combat participants" ON combat_participants
  FOR SELECT USING (
    encounter_id IN (SELECT id FROM combat_encounters)
  );

DROP POLICY IF EXISTS "Users can insert combat participants" ON combat_participants;
CREATE POLICY "Users can insert combat participants" ON combat_participants
  FOR INSERT WITH CHECK (
    encounter_id IN (SELECT id FROM combat_encounters)
  );

DROP POLICY IF EXISTS "Users can update combat participants" ON combat_participants;
CREATE POLICY "Users can update combat participants" ON combat_participants
  FOR UPDATE USING (
    encounter_id IN (SELECT id FROM combat_encounters)
  );

DROP POLICY IF EXISTS "Users can delete combat participants" ON combat_participants;
CREATE POLICY "Users can delete combat participants" ON combat_participants
  FOR DELETE USING (
    encounter_id IN (SELECT id FROM combat_encounters)
  );

-- Conditions library: readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view conditions" ON conditions_library;
CREATE POLICY "Authenticated users can view conditions" ON conditions_library
  FOR SELECT USING (auth.role() = 'authenticated');

-- Participant conditions: inherit permissions from participant
DROP POLICY IF EXISTS "Users can view participant conditions" ON combat_participant_conditions;
CREATE POLICY "Users can view participant conditions" ON combat_participant_conditions
  FOR SELECT USING (
    participant_id IN (SELECT id FROM combat_participants)
  );

DROP POLICY IF EXISTS "Users can insert participant conditions" ON combat_participant_conditions;
CREATE POLICY "Users can insert participant conditions" ON combat_participant_conditions
  FOR INSERT WITH CHECK (
    participant_id IN (SELECT id FROM combat_participants)
  );

DROP POLICY IF EXISTS "Users can update participant conditions" ON combat_participant_conditions;
CREATE POLICY "Users can update participant conditions" ON combat_participant_conditions
  FOR UPDATE USING (
    participant_id IN (SELECT id FROM combat_participants)
  );

DROP POLICY IF EXISTS "Users can delete participant conditions" ON combat_participant_conditions;
CREATE POLICY "Users can delete participant conditions" ON combat_participant_conditions
  FOR DELETE USING (
    participant_id IN (SELECT id FROM combat_participants)
  );
