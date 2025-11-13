-- Migration: Add Rest System Tables
-- Date: 2025-11-13
-- Description: Implements D&D 5E rest mechanics including short rests, long rests,
--              and hit dice management for character recovery.

-- Rest Events Table
-- Tracks all rest events (short and long) for characters
CREATE TABLE IF NOT EXISTS rest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  rest_type TEXT NOT NULL CHECK (rest_type IN ('short', 'long')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  hp_restored INTEGER,
  hit_dice_spent INTEGER,
  resources_restored TEXT, -- JSON string of restored resources
  interrupted BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Character Hit Dice Table
-- Tracks hit dice per class for each character (supports multiclassing)
CREATE TABLE IF NOT EXISTS character_hit_dice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  die_type TEXT NOT NULL CHECK (die_type IN ('d6', 'd8', 'd10', 'd12')),
  total_dice INTEGER NOT NULL CHECK (total_dice >= 0),
  used_dice INTEGER NOT NULL DEFAULT 0 CHECK (used_dice >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dice_usage CHECK (used_dice <= total_dice),
  CONSTRAINT unique_character_class UNIQUE (character_id, class_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rest_events_character ON rest_events(character_id);
CREATE INDEX IF NOT EXISTS idx_rest_events_session ON rest_events(session_id);
CREATE INDEX IF NOT EXISTS idx_rest_events_type ON rest_events(rest_type);
CREATE INDEX IF NOT EXISTS idx_rest_events_completed ON rest_events(completed_at);

CREATE INDEX IF NOT EXISTS idx_hit_dice_character ON character_hit_dice(character_id);
CREATE INDEX IF NOT EXISTS idx_hit_dice_class ON character_hit_dice(class_name);

-- Comments for documentation
COMMENT ON TABLE rest_events IS 'Tracks character rest events for D&D 5E mechanics';
COMMENT ON TABLE character_hit_dice IS 'Manages hit dice per class for character recovery';

COMMENT ON COLUMN rest_events.rest_type IS 'Type of rest: short (1 hour) or long (8 hours)';
COMMENT ON COLUMN rest_events.hp_restored IS 'Total HP restored during this rest';
COMMENT ON COLUMN rest_events.hit_dice_spent IS 'Number of hit dice spent during short rest';
COMMENT ON COLUMN rest_events.resources_restored IS 'JSON array of restored resources (spell slots, class features)';
COMMENT ON COLUMN rest_events.interrupted IS 'Whether the rest was interrupted (loses all benefits)';

COMMENT ON COLUMN character_hit_dice.die_type IS 'Hit die size: d6, d8, d10, or d12';
COMMENT ON COLUMN character_hit_dice.total_dice IS 'Total hit dice available (equals character level in this class)';
COMMENT ON COLUMN character_hit_dice.used_dice IS 'Number of hit dice currently spent';
