-- Migration: Add image_url and enhanced description fields to characters table
-- Date: 2025-09-06
-- Purpose: Support AI-generated character images and detailed descriptions

-- Add image_url field for character portraits
ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add enhanced description fields
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory_elements TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;

-- Add index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);

-- Add index on name for search functionality
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);