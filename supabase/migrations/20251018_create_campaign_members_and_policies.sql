-- Migration 2 – campaign_members table and membership-based policies
-- Date: 2025-10-18
-- Notes:
--  - Introduces campaign_members join table for campaign membership/roles
--  - Adds trigger to auto-insert owner membership on campaign creation
--  - Backfills membership for existing campaigns
--  - Rewrites RLS on characters to membership-based access
--  - Updates environmental hazard policies to membership-based access

-- 1) campaign_members table
CREATE TABLE IF NOT EXISTS campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','dm','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, user_id)
);

COMMENT ON TABLE campaign_members IS 'Users who belong to campaigns, with role-based permissions.';
COMMENT ON COLUMN campaign_members.role IS 'owner|dm|member';

-- 2) Trigger to auto-insert owner membership on campaign creation
CREATE OR REPLACE FUNCTION insert_campaign_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.user_id, 'owner', COALESCE(NEW.created_at, NOW()))
    ON CONFLICT (campaign_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_owner_membership ON campaigns;
CREATE TRIGGER trg_campaign_owner_membership
AFTER INSERT ON campaigns
FOR EACH ROW
EXECUTE FUNCTION insert_campaign_owner_membership();

-- 3) Backfill membership for existing campaigns (owner rows)
INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
SELECT c.id, c.user_id, 'owner', COALESCE(c.created_at, NOW())
FROM campaigns c
WHERE c.user_id IS NOT NULL
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- 4) RLS policies for campaign_members
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own membership record(s)
DROP POLICY IF EXISTS "Members can view their own membership" ON campaign_members;
CREATE POLICY "Members can view their own membership"
  ON campaign_members
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR user_id = auth.uid()
  );

-- Owners can view all membership in their campaigns (optional broader visibility)
DROP POLICY IF EXISTS "Owners can view all membership in their campaigns" ON campaign_members;
CREATE POLICY "Owners can view all membership in their campaigns"
  ON campaign_members
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = campaign_members.campaign_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- Owners can add members
DROP POLICY IF EXISTS "Owners can add members" ON campaign_members;
CREATE POLICY "Owners can add members"
  ON campaign_members
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = campaign_members.campaign_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- Owners can update membership (e.g., change roles)
DROP POLICY IF EXISTS "Owners can update membership" ON campaign_members;
CREATE POLICY "Owners can update membership"
  ON campaign_members
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = campaign_members.campaign_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- Owners can remove members
DROP POLICY IF EXISTS "Owners can remove members" ON campaign_members;
CREATE POLICY "Owners can remove members"
  ON campaign_members
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = campaign_members.campaign_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- 5) Rewrite characters RLS policies to membership-based
-- Drop legacy owner-based policies
DROP POLICY IF EXISTS "Users can view their own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert their own characters" ON characters;
DROP POLICY IF EXISTS "Users can update their own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete their own characters" ON characters;

-- Allow SELECT when the user is a member of the character's campaign
CREATE POLICY "Members can view characters in their campaigns" ON characters
  FOR SELECT USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = characters.campaign_id
        AND m.user_id = auth.uid()
    )
  );

-- Allow INSERT only if the user is a member of the specified campaign
CREATE POLICY "Members can insert characters into their campaigns" ON characters
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = characters.campaign_id
        AND m.user_id = auth.uid()
    )
  );

-- Allow UPDATE only if the user is a member of the character's campaign
CREATE POLICY "Members can update characters in their campaigns" ON characters
  FOR UPDATE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = characters.campaign_id
        AND m.user_id = auth.uid()
    )
  );

-- Allow DELETE only if the user is a member of the character's campaign
CREATE POLICY "Members can delete characters in their campaigns" ON characters
  FOR DELETE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = characters.campaign_id
        AND m.user_id = auth.uid()
    )
  );

-- Ensure RLS remains enabled
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 6) Update environmental hazard policies to be membership-based instead of owner-based
-- environmental_hazards
DROP POLICY IF EXISTS "Users can view hazards in their campaigns" ON environmental_hazards;
DROP POLICY IF EXISTS "Users can insert hazards in their campaigns" ON environmental_hazards;
DROP POLICY IF EXISTS "Users can update hazards in their campaigns" ON environmental_hazards;
DROP POLICY IF EXISTS "Users can delete hazards in their campaigns" ON environmental_hazards;

CREATE POLICY "Members can view hazards in their campaigns" ON environmental_hazards
  FOR SELECT USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = environmental_hazards.campaign_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert hazards in their campaigns" ON environmental_hazards
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = environmental_hazards.campaign_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update hazards in their campaigns" ON environmental_hazards
  FOR UPDATE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = environmental_hazards.campaign_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete hazards in their campaigns" ON environmental_hazards
  FOR DELETE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = environmental_hazards.campaign_id
        AND m.user_id = auth.uid()
    )
  );

-- Keep RLS enabled
ALTER TABLE environmental_hazards ENABLE ROW LEVEL SECURITY;
