/**
 * Enhancement Options System Database Schema
 *
 * Adds support for storing character and campaign enhancement selections
 * to make unique and interesting characters/campaigns easier to create.
 */

-- Enhancement Options Table
-- Stores the available enhancement options (can be used for dynamic options in the future)
CREATE TABLE IF NOT EXISTS enhancement_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('character', 'campaign')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('single', 'multiple', 'number', 'text')),
    icon VARCHAR(10),
    tags TEXT[], -- Array of tags
    options TEXT[], -- Available options for single/multiple types
    min_value INTEGER,
    max_value INTEGER,

    -- Mechanical effects (stored as JSONB for flexibility)
    mechanical_effects JSONB,
    campaign_effects JSONB,

    -- Conditional display rules
    requires_race TEXT[],
    requires_class TEXT[],
    requires_background TEXT[],
    requires_level INTEGER,
    requires_ability_score JSONB, -- Array of {ability, minimum} objects
    excludes_with TEXT[],
    unlocks TEXT[],
    mutually_exclusive_with TEXT[],

    -- AI generation settings
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_generation_prompt TEXT,
    ai_context JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Enhancement Selections Table
-- Stores user selections for characters and campaigns
CREATE TABLE IF NOT EXISTS enhancement_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to character or campaign
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Option details
    option_id VARCHAR(255) NOT NULL, -- References enhancement_options.option_id
    selection_value JSONB NOT NULL, -- Stores the selected value(s)
    custom_value TEXT, -- Additional custom notes

    -- AI generation tracking
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt_used TEXT,
    generation_context JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT enhancement_selections_target_check
        CHECK ((character_id IS NOT NULL AND campaign_id IS NULL) OR
               (character_id IS NULL AND campaign_id IS NOT NULL)),
    CONSTRAINT enhancement_selections_unique_per_target
        UNIQUE (character_id, campaign_id, option_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhancement_options_category ON enhancement_options(category);
CREATE INDEX IF NOT EXISTS idx_enhancement_options_type ON enhancement_options(type);
CREATE INDEX IF NOT EXISTS idx_enhancement_options_tags ON enhancement_options USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_enhancement_options_active ON enhancement_options(is_active);

CREATE INDEX IF NOT EXISTS idx_enhancement_selections_character ON enhancement_selections(character_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_selections_campaign ON enhancement_selections(campaign_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_selections_option ON enhancement_selections(option_id);

-- Add columns to characters table for enhancement summary
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS enhancement_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enhancement_tags TEXT[],
ADD COLUMN IF NOT EXISTS enhancement_summary JSONB;

-- Add columns to campaigns table for enhancement summary
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS enhancement_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enhancement_tags TEXT[],
ADD COLUMN IF NOT EXISTS enhancement_summary JSONB;

-- Function to update enhancement summary when selections change
CREATE OR REPLACE FUNCTION update_enhancement_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle character enhancements
    IF NEW.character_id IS NOT NULL THEN
        UPDATE characters SET
            enhancement_count = (
                SELECT COUNT(*)
                FROM enhancement_selections
                WHERE character_id = NEW.character_id
            ),
            enhancement_tags = (
                SELECT ARRAY_AGG(DISTINCT tag)
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                CROSS JOIN UNNEST(eo.tags) AS tag
                WHERE es.character_id = NEW.character_id
            ),
            enhancement_summary = (
                SELECT JSONB_OBJECT_AGG(
                    es.option_id,
                    JSONB_BUILD_OBJECT(
                        'name', eo.name,
                        'value', es.selection_value,
                        'custom_value', es.custom_value,
                        'ai_generated', es.ai_generated
                    )
                )
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                WHERE es.character_id = NEW.character_id
            )
        WHERE id = NEW.character_id;
    END IF;

    -- Handle campaign enhancements
    IF NEW.campaign_id IS NOT NULL THEN
        UPDATE campaigns SET
            enhancement_count = (
                SELECT COUNT(*)
                FROM enhancement_selections
                WHERE campaign_id = NEW.campaign_id
            ),
            enhancement_tags = (
                SELECT ARRAY_AGG(DISTINCT tag)
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                CROSS JOIN UNNEST(eo.tags) AS tag
                WHERE es.campaign_id = NEW.campaign_id
            ),
            enhancement_summary = (
                SELECT JSONB_OBJECT_AGG(
                    es.option_id,
                    JSONB_BUILD_OBJECT(
                        'name', eo.name,
                        'value', es.selection_value,
                        'custom_value', es.custom_value,
                        'ai_generated', es.ai_generated
                    )
                )
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                WHERE es.campaign_id = NEW.campaign_id
            )
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle enhancement summary updates on deletion
CREATE OR REPLACE FUNCTION handle_enhancement_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle character enhancements
    IF OLD.character_id IS NOT NULL THEN
        UPDATE characters SET
            enhancement_count = (
                SELECT COUNT(*)
                FROM enhancement_selections
                WHERE character_id = OLD.character_id
            ),
            enhancement_tags = (
                SELECT ARRAY_AGG(DISTINCT tag)
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                CROSS JOIN UNNEST(eo.tags) AS tag
                WHERE es.character_id = OLD.character_id
            ),
            enhancement_summary = (
                SELECT JSONB_OBJECT_AGG(
                    es.option_id,
                    JSONB_BUILD_OBJECT(
                        'name', eo.name,
                        'value', es.selection_value,
                        'custom_value', es.custom_value,
                        'ai_generated', es.ai_generated
                    )
                )
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                WHERE es.character_id = OLD.character_id
            )
        WHERE id = OLD.character_id;
    END IF;

    -- Handle campaign enhancements
    IF OLD.campaign_id IS NOT NULL THEN
        UPDATE campaigns SET
            enhancement_count = (
                SELECT COUNT(*)
                FROM enhancement_selections
                WHERE campaign_id = OLD.campaign_id
            ),
            enhancement_tags = (
                SELECT ARRAY_AGG(DISTINCT tag)
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                CROSS JOIN UNNEST(eo.tags) AS tag
                WHERE es.campaign_id = OLD.campaign_id
            ),
            enhancement_summary = (
                SELECT JSONB_OBJECT_AGG(
                    es.option_id,
                    JSONB_BUILD_OBJECT(
                        'name', eo.name,
                        'value', es.selection_value,
                        'custom_value', es.custom_value,
                        'ai_generated', es.ai_generated
                    )
                )
                FROM enhancement_selections es
                JOIN enhancement_options eo ON es.option_id = eo.option_id
                WHERE es.campaign_id = OLD.campaign_id
            )
        WHERE id = OLD.campaign_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_enhancement_summary ON enhancement_selections;
CREATE TRIGGER trigger_update_enhancement_summary
    AFTER INSERT OR UPDATE ON enhancement_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_enhancement_summary();

DROP TRIGGER IF EXISTS trigger_handle_enhancement_deletion ON enhancement_selections;
CREATE TRIGGER trigger_handle_enhancement_deletion
    AFTER DELETE ON enhancement_selections
    FOR EACH ROW
    EXECUTE FUNCTION handle_enhancement_deletion();

-- Insert predefined character enhancement options
INSERT INTO enhancement_options (
    option_id, name, description, category, type, icon, tags, options, max_value,
    mechanical_effects, ai_generated, ai_generation_prompt, ai_context
) VALUES
(
    'quirks',
    'Character Quirks',
    'Add interesting personality quirks that make your character memorable',
    'character',
    'multiple',
    '🎭',
    ARRAY['personality', 'roleplay', 'quirks'],
    ARRAY[
        'Always speaks in rhyme when nervous',
        'Collects unusual objects obsessively',
        'Has an imaginary friend they consult',
        'Constantly adjusts their clothing',
        'Makes up elaborate backstories for strangers',
        'Talks to their weapons/tools',
        'Never removes a specific piece of jewelry',
        'Draws sketches of everything they see',
        'Counts everything they encounter',
        'Always eats food in a specific order'
    ],
    3,
    '{"traits": ["Enhanced roleplay opportunities", "Inspiration trigger potential"]}'::jsonb,
    FALSE,
    NULL,
    NULL
),
(
    'ai-generated-quirk',
    'AI-Generated Quirk',
    'Let the AI create a unique quirk tailored to your character',
    'character',
    'single',
    '🤖',
    ARRAY['personality', 'ai-generated', 'unique'],
    NULL,
    NULL,
    NULL,
    TRUE,
    'Generate a single, interesting but not debilitating personality quirk for a {characterClass} {characterRace}. The quirk should be memorable and provide roleplay opportunities without hindering gameplay.',
    '{"useCharacterRace": true, "useCharacterClass": true, "useCharacterBackground": true}'::jsonb
),
(
    'secrets',
    'Character Secrets',
    'Hidden aspects of your character that add depth and story hooks',
    'character',
    'single',
    '🤐',
    ARRAY['secrets', 'backstory', 'plot'],
    ARRAY[
        'Is secretly nobility in hiding',
        'Has a price on their head',
        'Is actually much older than they appear',
        'Possesses forbidden knowledge',
        'Is related to a major villain',
        'Has lost memories of their past',
        'Is cursed in some way',
        'Is actually from another plane/world',
        'Has a secret twin or doppelganger',
        'Was raised by a different species'
    ],
    NULL,
    NULL,
    FALSE,
    NULL,
    NULL
);

-- Insert predefined campaign enhancement options
INSERT INTO enhancement_options (
    option_id, name, description, category, type, icon, tags, options, max_value,
    campaign_effects, ai_generated, ai_generation_prompt, ai_context
) VALUES
(
    'story-hooks',
    'Story Hooks',
    'Engaging plot threads to weave into your campaign',
    'campaign',
    'multiple',
    '🎣',
    ARRAY['plot', 'hooks', 'story'],
    ARRAY[
        'A mysterious benefactor funds the party',
        'Ancient prophecy involves the characters',
        'Political intrigue threatens the realm',
        'Planar rifts are opening randomly',
        'A cult is secretly infiltrating society',
        'Time itself is becoming unstable',
        'The gods have gone silent',
        'A powerful artifact has been shattered',
        'Dreams are becoming reality',
        'The dead refuse to stay buried'
    ],
    3,
    '{"hooks": ["Plot thread available", "Story complication ready"]}'::jsonb,
    FALSE,
    NULL,
    NULL
),
(
    'ai-generated-mystery',
    'AI-Generated Mystery',
    'Let the AI create a unique central mystery for your campaign',
    'campaign',
    'single',
    '🤖',
    ARRAY['mystery', 'ai-generated', 'unique'],
    NULL,
    NULL,
    '{"atmosphere": ["Unique mystery element"], "hooks": ["Central investigation thread"]}'::jsonb,
    TRUE,
    'Generate an intriguing central mystery for a {campaignTheme} campaign. The mystery should be solvable through investigation and provide multiple avenues for exploration.',
    '{"useCampaignTheme": true, "additionalContext": "Consider the campaign setting and tone"}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE enhancement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhancement_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhancement_options (readable by all authenticated users)
CREATE POLICY "Enhancement options are viewable by authenticated users"
ON enhancement_options FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for enhancement_selections (users can only see their own)
CREATE POLICY "Users can view their own character enhancements"
ON enhancement_selections FOR SELECT
TO authenticated
USING (
    character_id IN (
        SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR
    campaign_id IN (
        SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
);

CREATE POLICY "Users can insert their own enhancements"
ON enhancement_selections FOR INSERT
TO authenticated
WITH CHECK (
    character_id IN (
        SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR
    campaign_id IN (
        SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
);

CREATE POLICY "Users can update their own enhancements"
ON enhancement_selections FOR UPDATE
TO authenticated
USING (
    character_id IN (
        SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR
    campaign_id IN (
        SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
);

CREATE POLICY "Users can delete their own enhancements"
ON enhancement_selections FOR DELETE
TO authenticated
USING (
    character_id IN (
        SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR
    campaign_id IN (
        SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
);