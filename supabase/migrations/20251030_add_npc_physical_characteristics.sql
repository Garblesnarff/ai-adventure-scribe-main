-- Add physical characteristics to NPCs table
-- Matches the physical characteristics added to characters table

ALTER TABLE npcs
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age > 0 AND age < 10000),
ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height > 0 AND height < 200),
ADD COLUMN IF NOT EXISTS weight INTEGER CHECK (weight > 0 AND weight < 2000),
ADD COLUMN IF NOT EXISTS eyes TEXT,
ADD COLUMN IF NOT EXISTS skin TEXT,
ADD COLUMN IF NOT EXISTS hair TEXT;

-- Add comments for documentation
COMMENT ON COLUMN npcs.gender IS 'NPC gender (male/female)';
COMMENT ON COLUMN npcs.age IS 'NPC age in years';
COMMENT ON COLUMN npcs.height IS 'NPC height in inches';
COMMENT ON COLUMN npcs.weight IS 'NPC weight in pounds';
COMMENT ON COLUMN npcs.eyes IS 'Eye color description';
COMMENT ON COLUMN npcs.skin IS 'Skin color/tone description';
COMMENT ON COLUMN npcs.hair IS 'Hair color/style description';
