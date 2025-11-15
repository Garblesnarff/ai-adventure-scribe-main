-- =====================================================
-- UNIFIED D&D 5E COMBAT SYSTEM MIGRATION
-- =====================================================
-- Date: 2025-11-12
-- Purpose: Unified combat system with initiative, HP tracking, conditions, and damage logging
--
-- This migration consolidates:
-- - Combat initiative and turn order tracking
-- - HP tracking with temp HP and death saves
-- - D&D 5E conditions system (13 core conditions)
-- - Damage logging and history
--
-- Design decisions:
-- - Separate combat_participant_status table for HP (better separation of concerns)
-- - Separate combat_participant_conditions table for conditions (granular tracking)
-- - combat_participants stores static data (name, initiative, stats)
-- - Status and conditions tables store dynamic combat state
-- =====================================================

-- =====================================================
-- TABLE: combat_encounters
-- =====================================================
-- Tracks active combat encounters within game sessions
-- Manages round progression and turn order

CREATE TABLE IF NOT EXISTS combat_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,

  -- Combat state
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn_order INTEGER NOT NULL DEFAULT 0,

  -- Optional metadata
  location TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'deadly')),
  experience_awarded INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: combat_participants
-- =====================================================
-- Individual combatants in an encounter (PCs, NPCs, monsters)
-- Stores static participant data and combat statistics

CREATE TABLE IF NOT EXISTS combat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,

  -- Entity references (one must be set, or neither for generic NPCs)
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('player', 'npc', 'enemy', 'monster')),

  -- Initiative and turn order
  initiative INTEGER NOT NULL DEFAULT 0,
  initiative_modifier INTEGER NOT NULL DEFAULT 0,
  turn_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Combat statistics
  armor_class INTEGER NOT NULL DEFAULT 10,
  max_hp INTEGER NOT NULL DEFAULT 10,
  speed INTEGER NOT NULL DEFAULT 30,

  -- Damage modifiers (arrays of damage types)
  damage_resistances TEXT[] DEFAULT '{}',
  damage_immunities TEXT[] DEFAULT '{}',
  damage_vulnerabilities TEXT[] DEFAULT '{}',

  -- Additional data
  multiclass_info JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure at least one reference type or neither (for generic NPCs)
  CONSTRAINT participant_reference CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL) OR
    (character_id IS NULL AND npc_id IS NULL)
  )
);

-- =====================================================
-- TABLE: combat_participant_status
-- =====================================================
-- Tracks current HP, temp HP, consciousness, and death saves
-- Separated from participants for better data organization

CREATE TABLE IF NOT EXISTS combat_participant_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,

  -- Hit points
  current_hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  temp_hp INTEGER NOT NULL DEFAULT 0,

  -- Consciousness and death saves
  is_conscious BOOLEAN NOT NULL DEFAULT true,
  death_saves_successes INTEGER NOT NULL DEFAULT 0,
  death_saves_failures INTEGER NOT NULL DEFAULT 0,

  -- Timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT death_saves_range CHECK (
    death_saves_successes BETWEEN 0 AND 3 AND
    death_saves_failures BETWEEN 0 AND 3
  ),
  CONSTRAINT unique_participant_status UNIQUE(participant_id)
);

-- =====================================================
-- TABLE: combat_damage_log
-- =====================================================
-- Tracks all damage dealt during combat for analytics and history

CREATE TABLE IF NOT EXISTS combat_damage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,

  -- Damage details
  damage_amount INTEGER NOT NULL,
  damage_type TEXT NOT NULL,

  -- Source tracking
  source_participant_id UUID REFERENCES combat_participants(id) ON DELETE SET NULL,
  source_description TEXT,

  -- Round tracking
  round_number INTEGER NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: conditions_library
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

-- =====================================================
-- TABLE: combat_participant_conditions
-- =====================================================
-- Tracks active conditions applied to combat participants

CREATE TABLE IF NOT EXISTS combat_participant_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES combat_participants(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES conditions_library(id) ON DELETE CASCADE,

  -- Duration tracking
  duration_type TEXT NOT NULL CHECK (duration_type IN ('rounds', 'minutes', 'hours', 'until_save', 'permanent')),
  duration_value INTEGER,

  -- Save mechanics
  save_dc INTEGER,
  save_ability TEXT CHECK (save_ability IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')),

  -- Timing
  applied_at_round INTEGER NOT NULL,
  expires_at_round INTEGER,

  -- Source and state
  source_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: creature_stats
-- =====================================================
-- Stores AC, resistances, vulnerabilities, and immunities for characters and NPCs
-- Used for attack resolution

CREATE TABLE IF NOT EXISTS creature_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,

  -- Combat statistics
  armor_class INTEGER NOT NULL DEFAULT 10,
  resistances TEXT[] DEFAULT '{}',
  vulnerabilities TEXT[] DEFAULT '{}',
  immunities TEXT[] DEFAULT '{}',
  condition_immunities TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stats_owner CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL)
  )
);

-- =====================================================
-- TABLE: weapon_attacks
-- =====================================================
-- Stores weapon attack data for characters

CREATE TABLE IF NOT EXISTS weapon_attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attack_bonus INTEGER NOT NULL,
  damage_dice TEXT NOT NULL,
  damage_bonus INTEGER NOT NULL DEFAULT 0,
  damage_type TEXT NOT NULL,
  properties TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Combat encounters indexes
CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON combat_encounters(status);

-- Combat participants indexes
CREATE INDEX IF NOT EXISTS idx_combat_participants_encounter ON combat_participants(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_turn_order ON combat_participants(encounter_id, turn_order);
CREATE INDEX IF NOT EXISTS idx_combat_participants_character ON combat_participants(character_id) WHERE character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_combat_participants_npc ON combat_participants(npc_id) WHERE npc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_combat_participants_initiative ON combat_participants(encounter_id, initiative DESC);

-- Participant status indexes
CREATE INDEX IF NOT EXISTS idx_combat_participant_status_participant ON combat_participant_status(participant_id);

-- Damage log indexes
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_encounter ON combat_damage_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_participant ON combat_damage_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_round ON combat_damage_log(encounter_id, round_number);

-- Conditions indexes
CREATE INDEX IF NOT EXISTS idx_conditions_library_name ON conditions_library(name);
CREATE INDEX IF NOT EXISTS idx_conditions_participant ON combat_participant_conditions(participant_id);
CREATE INDEX IF NOT EXISTS idx_conditions_active ON combat_participant_conditions(participant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conditions_expiry ON combat_participant_conditions(expires_at_round, is_active);

-- Creature stats indexes
CREATE INDEX IF NOT EXISTS idx_creature_stats_character ON creature_stats(character_id);
CREATE INDEX IF NOT EXISTS idx_creature_stats_npc ON creature_stats(npc_id);

-- Weapon attacks indexes
CREATE INDEX IF NOT EXISTS idx_weapon_attacks_character ON weapon_attacks(character_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Combat encounters
COMMENT ON TABLE combat_encounters IS 'D&D 5E combat encounters with round and turn tracking';
COMMENT ON COLUMN combat_encounters.current_round IS 'Current combat round number (starts at 1)';
COMMENT ON COLUMN combat_encounters.current_turn_order IS 'Index of current participant in turn order (0-indexed)';
COMMENT ON COLUMN combat_encounters.status IS 'Combat state: active (in progress), paused (temporarily stopped), completed (ended)';
COMMENT ON COLUMN combat_encounters.difficulty IS 'D&D 5E encounter difficulty rating';

-- Combat participants
COMMENT ON TABLE combat_participants IS 'Individual combatants in combat encounters (PCs, NPCs, monsters)';
COMMENT ON COLUMN combat_participants.initiative IS 'Initiative roll result (d20 + modifier)';
COMMENT ON COLUMN combat_participants.initiative_modifier IS 'Initiative modifier (usually DEX modifier)';
COMMENT ON COLUMN combat_participants.turn_order IS 'Position in turn order (0-indexed, sorted by initiative desc)';
COMMENT ON COLUMN combat_participants.is_active IS 'Whether participant is still active in combat (false when removed/defeated)';
COMMENT ON COLUMN combat_participants.participant_type IS 'Type of combatant: player (PC), npc (friendly NPC), enemy (hostile NPC), monster (creature)';
COMMENT ON COLUMN combat_participants.damage_resistances IS 'Array of damage types with resistance (half damage)';
COMMENT ON COLUMN combat_participants.damage_immunities IS 'Array of damage types with immunity (no damage)';
COMMENT ON COLUMN combat_participants.damage_vulnerabilities IS 'Array of damage types with vulnerability (double damage)';

-- Participant status
COMMENT ON TABLE combat_participant_status IS 'Current HP, temp HP, consciousness, and death saves for combat participants';
COMMENT ON COLUMN combat_participant_status.temp_hp IS 'Temporary hit points that shield real HP (doesn''t stack, use higher value)';
COMMENT ON COLUMN combat_participant_status.death_saves_successes IS 'Number of successful death saves (3 = stabilized)';
COMMENT ON COLUMN combat_participant_status.death_saves_failures IS 'Number of failed death saves (3 = dead)';

-- Damage log
COMMENT ON TABLE combat_damage_log IS 'Complete log of all damage dealt during combat encounters';
COMMENT ON COLUMN combat_damage_log.damage_type IS 'Type of damage (acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder)';

-- Conditions
COMMENT ON TABLE conditions_library IS 'Reference table for all D&D 5E conditions with mechanical effects';
COMMENT ON COLUMN conditions_library.mechanical_effects IS 'JSON string describing mechanical effects (advantage, disadvantage, speed, etc.)';
COMMENT ON TABLE combat_participant_conditions IS 'Active conditions applied to combat participants';
COMMENT ON COLUMN combat_participant_conditions.duration_type IS 'How the condition duration is measured';
COMMENT ON COLUMN combat_participant_conditions.applied_at_round IS 'Round number when condition was applied';
COMMENT ON COLUMN combat_participant_conditions.expires_at_round IS 'Round number when condition expires (NULL for until_save or permanent)';

-- Creature stats
COMMENT ON TABLE creature_stats IS 'Combat statistics for characters and NPCs including AC, resistances, vulnerabilities, and immunities';
COMMENT ON COLUMN creature_stats.resistances IS 'Array of damage types the creature is resistant to (half damage)';
COMMENT ON COLUMN creature_stats.vulnerabilities IS 'Array of damage types the creature is vulnerable to (double damage)';
COMMENT ON COLUMN creature_stats.immunities IS 'Array of damage types the creature is immune to (no damage)';
COMMENT ON COLUMN creature_stats.condition_immunities IS 'Array of conditions the creature is immune to';

-- Weapon attacks
COMMENT ON TABLE weapon_attacks IS 'Weapon attack data for player characters';
COMMENT ON COLUMN weapon_attacks.damage_dice IS 'Damage dice notation (e.g., 1d8, 2d6)';
COMMENT ON COLUMN weapon_attacks.properties IS 'Array of weapon properties (e.g., finesse, versatile, reach)';

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
