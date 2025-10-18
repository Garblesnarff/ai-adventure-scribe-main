Supabase schema updates: campaign-scoped characters and style configuration

Overview
This set of migrations introduces campaign-scoped characters, campaign membership management, and campaign style/rules configuration. Row Level Security (RLS) policies are updated to use membership-based access control instead of owner-only checks.

Migrations and order
1) 20251018_add_campaign_id_and_style_config.sql
   - Adds characters.campaign_id (UUID, nullable initially)
   - Adds campaigns.art_style (TEXT), campaigns.style_config (JSONB), campaigns.rules_config (JSONB)
   - Adds index idx_characters_campaign_id and FK to campaigns (ON DELETE SET NULL)

2) 20251018_create_campaign_members_and_policies.sql
   - Creates campaign_members (campaign_id, user_id, role, joined_at) with PK (campaign_id, user_id)
   - Adds trigger to automatically insert an owner membership row when a campaign is created
   - Backfills membership for existing campaigns based on campaigns.user_id
   - Rewrites characters RLS to require membership in the character's campaign for SELECT/INSERT/UPDATE/DELETE
   - Updates environmental_hazards RLS to require membership in the hazard's campaign

3) 20251018_enforce_campaign_id_not_null_on_characters.sql
   - Replaces FK to ON DELETE CASCADE (characters deleted with campaign)
   - Sets characters.campaign_id to NOT NULL
   - IMPORTANT: Apply only after the backfill is complete (see Ticket 4)

Rollback strategy
- Migration 3 (enforce NOT NULL):
  • To roll back, drop NOT NULL and restore the FK to ON DELETE SET NULL:
    ALTER TABLE characters ALTER COLUMN campaign_id DROP NOT NULL;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'characters_campaign_id_fkey') THEN
        ALTER TABLE characters DROP CONSTRAINT characters_campaign_id_fkey;
      END IF;
    END $$;
    ALTER TABLE characters
      ADD CONSTRAINT characters_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

- Migration 2 (campaign_members & policies):
  • DROP TRIGGER trg_campaign_owner_membership ON campaigns;
  • DROP FUNCTION insert_campaign_owner_membership();
  • DROP TABLE campaign_members CASCADE; (This will also remove dependent policies.)
  • Optionally restore prior owner-based RLS policies if desired.

- Migration 1 (columns only):
  • ALTER TABLE characters DROP COLUMN IF EXISTS campaign_id;
  • ALTER TABLE campaigns DROP COLUMN IF EXISTS art_style;
  • ALTER TABLE campaigns DROP COLUMN IF EXISTS style_config;
  • ALTER TABLE campaigns DROP COLUMN IF EXISTS rules_config;

Notes
- Service role bypass: All new RLS policies allow auth.role() = 'service_role'.
- Membership roles: owner, dm, member. Only owners can manage membership.
- Environmental hazards: Policies now reference campaign_members instead of campaigns.user_id/created_by.

Type definitions
- src/integrations/supabase/database.types.ts and src/integrations/supabase/types.ts updated to include:
  • campaigns.art_style/style_config/rules_config
  • characters.campaign_id
  • new table: campaign_members
- A minimal supabase/.temp/types.json was added to reflect the new tables/columns.
