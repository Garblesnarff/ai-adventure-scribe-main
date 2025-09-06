-- Migration to add background_image field to campaigns table
-- This enables AI-generated campaign card backgrounds

-- Add the background_image column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS background_image TEXT;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';