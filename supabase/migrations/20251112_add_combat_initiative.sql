-- Combat Initiative System Tables
-- Implements D&D 5E combat encounter and turn order management

-- Combat Encounters Table
-- Stores active combat encounters linked to game sessions
CREATE TABLE IF NOT EXISTS combat_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Combat Participants Table
-- Stores participants in combat encounters with initiative and turn order
CREATE TABLE IF NOT EXISTS combat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initiative INTEGER NOT NULL,
  initiative_modifier INTEGER NOT NULL DEFAULT 0,
  turn_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hp_current INTEGER,
  hp_max INTEGER,
  conditions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_type CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL) OR
    (character_id IS NULL AND npc_id IS NULL AND name IS NOT NULL)
  )
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON combat_encounters(status);
CREATE INDEX IF NOT EXISTS idx_combat_participants_encounter ON combat_participants(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_turn_order ON combat_participants(encounter_id, turn_order);
CREATE INDEX IF NOT EXISTS idx_combat_participants_character ON combat_participants(character_id) WHERE character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_combat_participants_npc ON combat_participants(npc_id) WHERE npc_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE combat_encounters IS 'D&D 5E combat encounters with round and turn tracking';
COMMENT ON TABLE combat_participants IS 'Participants in combat encounters with initiative and turn order';
COMMENT ON COLUMN combat_encounters.current_round IS 'Current combat round number (starts at 1)';
COMMENT ON COLUMN combat_encounters.current_turn_order IS 'Index of current participant in turn order';
COMMENT ON COLUMN combat_participants.initiative IS 'Initiative roll result (d20 + modifier)';
COMMENT ON COLUMN combat_participants.initiative_modifier IS 'Initiative modifier (usually DEX modifier)';
COMMENT ON COLUMN combat_participants.turn_order IS 'Position in turn order (0-indexed, sorted by initiative desc)';
COMMENT ON COLUMN combat_participants.is_active IS 'Whether participant is still active in combat';
COMMENT ON COLUMN combat_participants.conditions IS 'Array of active conditions (stunned, prone, etc.)';
