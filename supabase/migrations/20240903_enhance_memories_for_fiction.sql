-- Migration to enhance memories table with fiction-ready fields
-- This enables automatic story generation from campaign memories

-- Add fiction and narrative fields to memories table
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS narrative_weight INTEGER DEFAULT 5 CHECK (narrative_weight >= 1 AND narrative_weight <= 10);

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS emotional_tone TEXT;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS story_arc TEXT;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS prose_quality BOOLEAN DEFAULT false;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS chapter_marker BOOLEAN DEFAULT false;

-- Enhance existing type field to support more memory categories
-- Update check constraint to include new memory types
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE memories ADD CONSTRAINT memories_type_check 
CHECK (type IN (
    'general', 'npc', 'location', 'quest', 'item', 'event', 
    'story_beat', 'character_moment', 'world_detail', 'dialogue_gem', 
    'atmosphere', 'plot_point', 'foreshadowing'
));

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_memories_narrative_weight ON memories (narrative_weight DESC);
CREATE INDEX IF NOT EXISTS idx_memories_story_arc ON memories (story_arc);
CREATE INDEX IF NOT EXISTS idx_memories_type_category ON memories (type, category);
CREATE INDEX IF NOT EXISTS idx_memories_prose_quality ON memories (prose_quality) WHERE prose_quality = true;
CREATE INDEX IF NOT EXISTS idx_memories_chapter_marker ON memories (chapter_marker) WHERE chapter_marker = true;

-- Add comments for documentation
COMMENT ON COLUMN memories.narrative_weight IS 'Story importance score (1-10) for fiction generation';
COMMENT ON COLUMN memories.emotional_tone IS 'Emotional atmosphere (e.g., foreboding, triumphant, mysterious)';
COMMENT ON COLUMN memories.story_arc IS 'Which narrative thread this memory belongs to';
COMMENT ON COLUMN memories.prose_quality IS 'Whether this memory contains fiction-ready prose';
COMMENT ON COLUMN memories.chapter_marker IS 'Whether this memory could mark a chapter boundary';

-- Update existing memories with default values where needed
UPDATE memories 
SET narrative_weight = CASE 
    WHEN importance >= 8 THEN 9
    WHEN importance >= 6 THEN 7
    WHEN importance >= 4 THEN 5
    WHEN importance >= 2 THEN 3
    ELSE 1
END
WHERE narrative_weight IS NULL;

-- Set default emotional tones based on content keywords
UPDATE memories 
SET emotional_tone = CASE
    WHEN content ILIKE '%battle%' OR content ILIKE '%fight%' OR content ILIKE '%combat%' THEN 'intense'
    WHEN content ILIKE '%mysterious%' OR content ILIKE '%strange%' OR content ILIKE '%odd%' THEN 'mysterious'
    WHEN content ILIKE '%beautiful%' OR content ILIKE '%peaceful%' OR content ILIKE '%serene%' THEN 'peaceful'
    WHEN content ILIKE '%dark%' OR content ILIKE '%shadow%' OR content ILIKE '%ominous%' THEN 'foreboding'
    WHEN content ILIKE '%victory%' OR content ILIKE '%success%' OR content ILIKE '%triumph%' THEN 'triumphant'
    ELSE 'neutral'
END
WHERE emotional_tone IS NULL;