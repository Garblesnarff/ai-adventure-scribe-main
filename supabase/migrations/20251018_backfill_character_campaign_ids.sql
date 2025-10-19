-- Migration 2.5 – Backfill characters.campaign_id for existing data
-- Date: 2025-10-18
-- IMPORTANT:
--  • Run AFTER 20251018_add_campaign_id_and_style_config.sql and
--    20251018_create_campaign_members_and_policies.sql
--  • Run BEFORE 20251018_enforce_campaign_id_not_null_on_characters.sql
--
-- Strategy:
--  1) For each user who has characters without a campaign_id, ensure there is at least
--     one campaign owned by that user (create a simple placeholder campaign if none exists).
--  2) Assign all the user’s unscoped characters to the oldest available campaign for that user.
--  3) Leave rows with NULL user_id untouched; investigate and decide manually before NOT NULL.

-- 1) Create placeholder campaigns for users who have characters but no campaigns
WITH users_to_migrate AS (
  SELECT DISTINCT user_id
  FROM characters
  WHERE campaign_id IS NULL AND user_id IS NOT NULL
), inserted AS (
  INSERT INTO campaigns (id, name, description, user_id, created_at)
  SELECT gen_random_uuid(),
         'Migrated Campaign',
         'Auto-created during campaign-scoping migration',
         u.user_id,
         NOW()
  FROM users_to_migrate u
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns c WHERE c.user_id = u.user_id
  )
  RETURNING id, user_id
)
SELECT 1;

-- 2) Assign each character without campaign to the user’s oldest campaign
WITH chosen AS (
  SELECT u.user_id,
         (
           SELECT c.id
           FROM campaigns c
           WHERE c.user_id = u.user_id
           ORDER BY c.created_at ASC NULLS LAST, c.id ASC
           LIMIT 1
         ) AS campaign_id
  FROM (
    SELECT DISTINCT user_id
    FROM characters
    WHERE campaign_id IS NULL AND user_id IS NOT NULL
  ) u
)
UPDATE characters ch
SET campaign_id = chosen.campaign_id
FROM chosen
WHERE ch.user_id = chosen.user_id
  AND ch.campaign_id IS NULL
  AND chosen.campaign_id IS NOT NULL;

-- 3) Report any remaining characters with NULL user_id or still NULL campaign_id
--    so operators can resolve before enforcing NOT NULL
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM characters WHERE campaign_id IS NULL;
  RAISE NOTICE 'Backfill complete. Remaining characters with NULL campaign_id: %', remaining_count;
  RAISE NOTICE 'If remaining_count > 0, investigate rows with NULL user_id or special cases before running NOT NULL migration.';
END$$;
