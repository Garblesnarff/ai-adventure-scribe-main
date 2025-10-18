-- Migration 3 – Enforce NOT NULL campaign_id and strengthen FK (apply after backfill)
-- Date: 2025-10-18
-- IMPORTANT: Run only after all existing characters have been backfilled with a valid campaign_id

-- 1) Replace FK to use ON DELETE CASCADE (or RESTRICT per design)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'characters_campaign_id_fkey'
  ) THEN
    ALTER TABLE characters DROP CONSTRAINT characters_campaign_id_fkey;
  END IF;
END$$;

ALTER TABLE characters
  ADD CONSTRAINT characters_campaign_id_fkey
  FOREIGN KEY (campaign_id)
  REFERENCES campaigns(id)
  ON DELETE CASCADE;

-- 2) Enforce NOT NULL on campaign_id
ALTER TABLE characters
  ALTER COLUMN campaign_id SET NOT NULL;
