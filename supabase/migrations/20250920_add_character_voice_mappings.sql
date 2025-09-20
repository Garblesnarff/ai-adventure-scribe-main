-- Create character_voice_mappings table for voice consistency
-- This enables persistent voice assignments for characters

CREATE TABLE IF NOT EXISTS character_voice_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  character_type text NOT NULL CHECK (character_type IN ('player', 'npc', 'narrator')),
  voice_id text NOT NULL,
  voice_provider text NOT NULL DEFAULT 'elevenlabs',
  voice_settings jsonb DEFAULT '{}',
  voice_description text,
  gender text,
  age_range text,
  personality_traits text[],
  accent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique voice mapping per character per campaign
  UNIQUE(campaign_id, character_name, character_type)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_character_voice_mappings_campaign
ON character_voice_mappings (campaign_id);

CREATE INDEX IF NOT EXISTS idx_character_voice_mappings_character
ON character_voice_mappings (campaign_id, character_name);

CREATE INDEX IF NOT EXISTS idx_character_voice_mappings_type
ON character_voice_mappings (character_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_character_voice_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_character_voice_mappings_updated_at
  BEFORE UPDATE ON character_voice_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_character_voice_mappings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE character_voice_mappings IS 'Maps characters to specific voice IDs for consistent text-to-speech';
COMMENT ON COLUMN character_voice_mappings.character_name IS 'Name of the character (case-sensitive)';
COMMENT ON COLUMN character_voice_mappings.character_type IS 'Type: player, npc, or narrator';
COMMENT ON COLUMN character_voice_mappings.voice_id IS 'ElevenLabs voice ID or other provider voice identifier';
COMMENT ON COLUMN character_voice_mappings.voice_settings IS 'Provider-specific voice settings (stability, clarity, etc.)';
COMMENT ON COLUMN character_voice_mappings.personality_traits IS 'Array of personality traits that influenced voice selection';

-- Insert default narrator voice
INSERT INTO character_voice_mappings (
  campaign_id,
  character_name,
  character_type,
  voice_id,
  voice_description,
  gender,
  personality_traits
)
SELECT
  id as campaign_id,
  'Narrator',
  'narrator',
  'pNInz6obpgDQGcFmaJgB', -- Default ElevenLabs voice
  'Warm, authoritative narrator voice',
  'neutral',
  ARRAY['authoritative', 'warm', 'storytelling']
FROM campaigns
WHERE NOT EXISTS (
  SELECT 1 FROM character_voice_mappings
  WHERE campaign_id = campaigns.id
  AND character_name = 'Narrator'
  AND character_type = 'narrator'
);