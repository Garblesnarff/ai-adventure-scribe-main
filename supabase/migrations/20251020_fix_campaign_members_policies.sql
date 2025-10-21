-- Fix RLS recursion in campaign_members policies by referencing campaigns owner
-- Date: 2025-10-20

BEGIN;

DROP POLICY IF EXISTS "Owners can view all membership in their campaigns" ON campaign_members;
CREATE POLICY "Owners can view all membership in their campaigns"
  ON campaign_members
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can add members" ON campaign_members;
CREATE POLICY "Owners can add members"
  ON campaign_members
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update membership" ON campaign_members;
CREATE POLICY "Owners can update membership"
  ON campaign_members
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can remove members" ON campaign_members;
CREATE POLICY "Owners can remove members"
  ON campaign_members
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.user_id = auth.uid()
    )
  );

COMMIT;
