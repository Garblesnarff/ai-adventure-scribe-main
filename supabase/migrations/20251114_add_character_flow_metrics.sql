-- Migration: Add character creation flow metrics tracking
-- Purpose: Track usage of legacy vs new character creation flows for deprecation metrics
-- Date: 2025-11-14

-- Create the character_creation_metrics table
CREATE TABLE IF NOT EXISTS character_creation_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow TEXT NOT NULL CHECK (flow IN ('legacy', 'new')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_character_creation_metrics_flow ON character_creation_metrics(flow);
CREATE INDEX IF NOT EXISTS idx_character_creation_metrics_timestamp ON character_creation_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_character_creation_metrics_user_id ON character_creation_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_character_creation_metrics_campaign_id ON character_creation_metrics(campaign_id);

-- Composite index for adoption queries (flow + timestamp)
CREATE INDEX IF NOT EXISTS idx_character_creation_metrics_flow_timestamp
  ON character_creation_metrics(flow, timestamp DESC);

-- Add RLS policies
ALTER TABLE character_creation_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own metrics
CREATE POLICY "Users can insert their own flow metrics"
  ON character_creation_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to read their own metrics
CREATE POLICY "Users can read their own flow metrics"
  ON character_creation_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role full access for analytics queries
CREATE POLICY "Service role has full access to flow metrics"
  ON character_creation_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE character_creation_metrics IS 'Tracks character creation flow usage for legacy deprecation monitoring';
COMMENT ON COLUMN character_creation_metrics.flow IS 'Type of flow: legacy (direct /characters/create) or new (campaign-based)';
COMMENT ON COLUMN character_creation_metrics.timestamp IS 'When the character creation was completed';
COMMENT ON COLUMN character_creation_metrics.user_id IS 'User who created the character (nullable for privacy)';
COMMENT ON COLUMN character_creation_metrics.campaign_id IS 'Campaign ID if using new flow (null for legacy)';
