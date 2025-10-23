-- Public campaign template support
-- Date: 2025-10-23
-- Adds template/visibility metadata, manifest pointers, and public read policy for campaigns

BEGIN;

-- Core template + publishing metadata
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS template BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS template_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS manifest_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

COMMENT ON COLUMN campaigns.template IS 'True when this campaign row is a read-only public template';
COMMENT ON COLUMN campaigns.visibility IS 'private|public enumeration controlling discoverability';
COMMENT ON COLUMN campaigns.slug IS 'Stable slug identifier for public template lookup';
COMMENT ON COLUMN campaigns.template_version IS 'Monotonic version for campaign templates';
COMMENT ON COLUMN campaigns.manifest_url IS 'Immutable URL to the published template manifest JSON';
COMMENT ON COLUMN campaigns.thumbnail_url IS 'Public URL for the template thumbnail image';
COMMENT ON COLUMN campaigns.published_at IS 'Timestamp when the template was published';
COMMENT ON COLUMN campaigns.published_by IS 'User UUID that published the template';
COMMENT ON COLUMN campaigns.source_template_id IS 'Pointer to the template this campaign was cloned from';
COMMENT ON COLUMN campaigns.content_hash IS 'SHA or similar hash of the manifest payload for idempotency checks';

-- Indexes for lookups and slug uniqueness (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_slug_unique
  ON campaigns ((lower(slug)))
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_public_templates
  ON campaigns (visibility, template, published_at DESC, template_version DESC);

-- Public read policy for published templates
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published templates" ON campaigns;
CREATE POLICY "Public can view published templates"
  ON campaigns
  FOR SELECT
  USING (
    template IS TRUE
    AND visibility = 'public'
  );

DROP POLICY IF EXISTS "Members can view their campaigns" ON campaigns;
CREATE POLICY "Members can view their campaigns"
  ON campaigns
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campaign_members m
      WHERE m.campaign_id = campaigns.id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create campaigns" ON campaigns;
CREATE POLICY "Users can create campaigns"
  ON campaigns
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update campaigns" ON campaigns;
CREATE POLICY "Owners can update campaigns"
  ON campaigns
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can delete campaigns" ON campaigns;
CREATE POLICY "Owners can delete campaigns"
  ON campaigns
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
  );

COMMIT;
