-- Migration 1 – campaign-scoped characters and campaign style configuration
-- Date: 2025-10-18
-- Notes:
--  - Adds nullable campaign_id to characters with FK to campaigns (ON DELETE SET NULL)
--  - Adds art_style (TEXT), style_config (JSONB), and rules_config (JSONB) to campaigns
--  - Creates supporting index

-- 1) characters.campaign_id (nullable initially)
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Index for campaign_id lookups
CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id);

-- Foreign key to campaigns(id) with ON DELETE SET NULL (safe during backfill period)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'characters_campaign_id_fkey'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT characters_campaign_id_fkey
      FOREIGN KEY (campaign_id)
      REFERENCES campaigns(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- 2) Campaign style/preset configuration
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS art_style TEXT;

COMMENT ON COLUMN campaigns.art_style IS 'Preferred art or narrative style label for this campaign (e.g., painterly, noir, grimdark)';

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS style_config JSONB;

COMMENT ON COLUMN campaigns.style_config IS 'General style configuration for models/prompts/etc. Stored as JSON.';

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS rules_config JSONB;

COMMENT ON COLUMN campaigns.rules_config IS 'Rules/preset configuration (homebrew toggles, rule variants) stored as JSON.';
