-- Migration to add background and alignment columns to personality tables
-- Adds background filtering support for all personality types and alignment filtering for ideals
-- Created: 2025-09-28

-- Add background column to personality_traits table
ALTER TABLE personality_traits ADD COLUMN IF NOT EXISTS background TEXT;
COMMENT ON COLUMN personality_traits.background IS 'Character background filter for personality traits (nullable)';

-- Add background column to personality_ideals table
ALTER TABLE personality_ideals ADD COLUMN IF NOT EXISTS background TEXT;
COMMENT ON COLUMN personality_ideals.background IS 'Character background filter for personality ideals (nullable)';

-- Add background column to personality_bonds table
ALTER TABLE personality_bonds ADD COLUMN IF NOT EXISTS background TEXT;
COMMENT ON COLUMN personality_bonds.background IS 'Character background filter for personality bonds (nullable)';

-- Add background column to personality_flaws table
ALTER TABLE personality_flaws ADD COLUMN IF NOT EXISTS background TEXT;
COMMENT ON COLUMN personality_flaws.background IS 'Character background filter for personality flaws (nullable)';

-- Add alignment column to personality_ideals table only (ideals are alignment-specific)
ALTER TABLE personality_ideals ADD COLUMN IF NOT EXISTS alignment TEXT;
COMMENT ON COLUMN personality_ideals.alignment IS 'Character alignment filter for personality ideals (e.g., Lawful, Neutral, Chaotic) - nullable';

-- Add indexes for performance on filtered columns
CREATE INDEX IF NOT EXISTS idx_personality_traits_background ON personality_traits (background);
CREATE INDEX IF NOT EXISTS idx_personality_ideals_background ON personality_ideals (background);
CREATE INDEX IF NOT EXISTS idx_personality_bonds_background ON personality_bonds (background);
CREATE INDEX IF NOT EXISTS idx_personality_flaws_background ON personality_flaws (background);
CREATE INDEX IF NOT EXISTS idx_personality_ideals_alignment ON personality_ideals (alignment);
