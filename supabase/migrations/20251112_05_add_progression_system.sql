-- Migration: Add Experience and Leveling System
-- Date: 2025-11-14
-- Description: Implements D&D 5E experience points and character progression system
--              including XP tracking, level-up mechanics, ability score improvements,
--              and proficiency bonus calculations.

-- Experience Events Table
-- Tracks all XP gains for characters with detailed source tracking
CREATE TABLE IF NOT EXISTS experience_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  xp_gained INTEGER NOT NULL CHECK (xp_gained >= 0),
  source TEXT NOT NULL CHECK (source IN ('combat', 'quest', 'roleplay', 'milestone', 'other')),
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Level Progression Table
-- Tracks current level, XP, and progression for each character
CREATE TABLE IF NOT EXISTS level_progression (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 20),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  xp_to_next_level INTEGER NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  last_level_up TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_character ON experience_events(character_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_session ON experience_events(session_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_source ON experience_events(source);
CREATE INDEX IF NOT EXISTS idx_xp_events_timestamp ON experience_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_level_progression_level ON level_progression(current_level);
CREATE INDEX IF NOT EXISTS idx_level_progression_updated ON level_progression(updated_at);

-- Comments for documentation
COMMENT ON TABLE experience_events IS 'Tracks all XP awards for D&D 5E character progression';
COMMENT ON TABLE level_progression IS 'Tracks character level and XP progression state';

COMMENT ON COLUMN experience_events.xp_gained IS 'Amount of XP awarded (must be non-negative)';
COMMENT ON COLUMN experience_events.source IS 'Source of XP: combat, quest, roleplay, milestone, or other';
COMMENT ON COLUMN experience_events.description IS 'Optional description of what earned the XP';
COMMENT ON COLUMN experience_events.timestamp IS 'When the XP was awarded';

COMMENT ON COLUMN level_progression.current_level IS 'Character level (1-20)';
COMMENT ON COLUMN level_progression.current_xp IS 'Current XP within this level';
COMMENT ON COLUMN level_progression.xp_to_next_level IS 'XP required to reach next level';
COMMENT ON COLUMN level_progression.total_xp IS 'Total XP earned across all levels';
COMMENT ON COLUMN level_progression.last_level_up IS 'Timestamp of most recent level-up';
