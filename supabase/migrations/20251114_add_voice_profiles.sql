-- Create character_voice_profiles table for voice consistency
-- This enables AI-driven analysis of character speech patterns and voice characteristics
-- to maintain consistent dialogue across game sessions

CREATE TABLE IF NOT EXISTS character_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  voice_style TEXT NOT NULL, -- 'gruff', 'eloquent', 'timid', etc.
  speech_patterns TEXT[], -- ['uses contractions', 'formal', 'uses slang']
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'average', 'advanced', 'archaic')),
  tone TEXT, -- 'serious', 'humorous', 'sarcastic', etc.
  quirks TEXT[], -- ['repeats favorite phrase', 'nervous laugh', 'speaks in third person']
  example_phrases TEXT[], -- Sample dialogue
  consistency_score NUMERIC(3,2) DEFAULT 0.00 CHECK (consistency_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(character_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_voice_profiles_character
ON character_voice_profiles(character_id);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_consistency
ON character_voice_profiles(consistency_score);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_character_voice_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_character_voice_profiles_updated_at
  BEFORE UPDATE ON character_voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_character_voice_profiles_updated_at();

-- Add comments for documentation
COMMENT ON TABLE character_voice_profiles IS 'Stores AI-analyzed voice characteristics for characters to ensure consistent dialogue patterns';
COMMENT ON COLUMN character_voice_profiles.character_id IS 'Foreign key reference to characters table';
COMMENT ON COLUMN character_voice_profiles.voice_style IS 'Overall style of speech (e.g., gruff, eloquent, timid)';
COMMENT ON COLUMN character_voice_profiles.speech_patterns IS 'Array of speech pattern descriptors';
COMMENT ON COLUMN character_voice_profiles.vocabulary_level IS 'Complexity of vocabulary used';
COMMENT ON COLUMN character_voice_profiles.tone IS 'Emotional tone of dialogue';
COMMENT ON COLUMN character_voice_profiles.quirks IS 'Unique speech quirks or mannerisms';
COMMENT ON COLUMN character_voice_profiles.example_phrases IS 'Sample dialogue for reference';
COMMENT ON COLUMN character_voice_profiles.consistency_score IS 'AI-calculated consistency score (0.00 to 1.00)';
