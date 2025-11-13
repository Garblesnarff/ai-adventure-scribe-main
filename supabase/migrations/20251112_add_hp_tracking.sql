-- Migration: Add HP and damage tracking system for D&D 5E combat
-- Date: 2025-11-12
-- Description: Implements HP tracking, temp HP, death saves, and damage logging

-- First, create combat_encounters table if it doesn't exist
-- This table tracks combat encounters in game sessions
CREATE TABLE IF NOT EXISTS public.combat_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'concluded')),
  current_round integer NOT NULL DEFAULT 1,
  current_turn_participant_id uuid,
  location text,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard', 'deadly')),
  experience_awarded integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create combat_participants table if it doesn't exist
-- This table stores participants (PCs, NPCs, monsters) in combat encounters
CREATE TABLE IF NOT EXISTS public.combat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.combat_encounters(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  name text NOT NULL,
  participant_type text NOT NULL CHECK (participant_type IN ('player', 'npc', 'enemy', 'monster')),
  initiative integer NOT NULL DEFAULT 0,
  armor_class integer NOT NULL DEFAULT 10,
  max_hp integer NOT NULL,
  speed integer NOT NULL DEFAULT 30,
  damage_resistances text[] DEFAULT '{}',
  damage_immunities text[] DEFAULT '{}',
  damage_vulnerabilities text[] DEFAULT '{}',
  multiclass_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Combat participant HP and status tracking
-- Stores current HP, temp HP, consciousness state, and death saves
CREATE TABLE IF NOT EXISTS public.combat_participant_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.combat_participants(id) ON DELETE CASCADE,
  current_hp integer NOT NULL,
  max_hp integer NOT NULL,
  temp_hp integer NOT NULL DEFAULT 0,
  is_conscious boolean NOT NULL DEFAULT true,
  death_saves_successes integer NOT NULL DEFAULT 0,
  death_saves_failures integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT death_saves_range CHECK (
    death_saves_successes BETWEEN 0 AND 3 AND
    death_saves_failures BETWEEN 0 AND 3
  ),
  CONSTRAINT unique_participant_status UNIQUE(participant_id)
);

-- Combat damage log
-- Tracks all damage dealt during combat for analytics and history
CREATE TABLE IF NOT EXISTS public.combat_damage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.combat_encounters(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.combat_participants(id) ON DELETE CASCADE,
  damage_amount integer NOT NULL,
  damage_type text NOT NULL,
  source_participant_id uuid REFERENCES public.combat_participants(id) ON DELETE SET NULL,
  source_description text,
  round_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for combat encounters
CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON public.combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON public.combat_encounters(status);

-- Indexes for combat participants
CREATE INDEX IF NOT EXISTS idx_combat_participants_encounter ON public.combat_participants(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_character ON public.combat_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_initiative ON public.combat_participants(encounter_id, initiative DESC);

-- Indexes for participant status
CREATE INDEX IF NOT EXISTS idx_combat_participant_status_participant ON public.combat_participant_status(participant_id);

-- Indexes for damage log
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_encounter ON public.combat_damage_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_participant ON public.combat_damage_log(participant_id);
CREATE INDEX IF NOT EXISTS idx_combat_damage_log_round ON public.combat_damage_log(encounter_id, round_number);

-- Comments for documentation
COMMENT ON TABLE public.combat_encounters IS 'Combat encounters within game sessions';
COMMENT ON TABLE public.combat_participants IS 'Participants (PCs, NPCs, monsters) in combat encounters';
COMMENT ON TABLE public.combat_participant_status IS 'Current HP, temp HP, consciousness, and death saves for combat participants';
COMMENT ON TABLE public.combat_damage_log IS 'Complete log of all damage dealt during combat encounters';

COMMENT ON COLUMN public.combat_participant_status.temp_hp IS 'Temporary hit points that shield real HP (doesn''t stack, use higher value)';
COMMENT ON COLUMN public.combat_participant_status.death_saves_successes IS 'Number of successful death saves (3 = stabilized)';
COMMENT ON COLUMN public.combat_participant_status.death_saves_failures IS 'Number of failed death saves (3 = dead)';
COMMENT ON COLUMN public.combat_damage_log.damage_type IS 'Type of damage (acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder)';
