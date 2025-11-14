-- Migration: Add Inventory Tracking System
-- Description: Creates tables for D&D 5E inventory management, ammunition tracking,
--              consumables, weight/encumbrance, and attunement tracking
-- Date: 2025-11-13

-- Create inventory_items table for tracking character items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'armor', 'consumable', 'ammunition', 'equipment', 'treasure')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  weight NUMERIC(5,2) DEFAULT 0 CHECK (weight >= 0),
  description TEXT,
  properties TEXT, -- JSON string for flexible item properties
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  is_attuned BOOLEAN NOT NULL DEFAULT false,
  requires_attunement BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create consumable_usage_log table for tracking item usage
CREATE TABLE IF NOT EXISTS consumable_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL DEFAULT 1 CHECK (quantity_used > 0),
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  context TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory_items(character_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory_items(character_id, item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON inventory_items(character_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX IF NOT EXISTS idx_inventory_attuned ON inventory_items(character_id, is_attuned) WHERE is_attuned = true;
CREATE INDEX IF NOT EXISTS idx_consumable_usage_character ON consumable_usage_log(character_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_item ON consumable_usage_log(item_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_session ON consumable_usage_log(session_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_timestamp ON consumable_usage_log(timestamp DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on inventory_items
CREATE TRIGGER trigger_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Add helpful comments
COMMENT ON TABLE inventory_items IS 'Stores character inventory items with weight, quantity, and attunement tracking';
COMMENT ON TABLE consumable_usage_log IS 'Tracks usage history of consumable items and ammunition';
COMMENT ON COLUMN inventory_items.item_type IS 'Type: weapon, armor, consumable, ammunition, equipment, treasure';
COMMENT ON COLUMN inventory_items.properties IS 'JSON string for flexible item properties (e.g., damage dice, AC bonus, magical effects)';
COMMENT ON COLUMN inventory_items.is_equipped IS 'Whether the item is currently equipped (weapons, armor)';
COMMENT ON COLUMN inventory_items.is_attuned IS 'Whether the character is attuned to this magic item';
COMMENT ON COLUMN inventory_items.requires_attunement IS 'Whether this item requires attunement to use';
