-- Migration: Add Attack Resolution Tables for D&D 5E Combat
-- Work Unit 1.4a: Attack & Damage Resolution Database & Service
-- Created: 2025-11-12

-- ==========================================
-- Creature Stats Table
-- ==========================================
-- Stores AC, resistances, vulnerabilities, and immunities for characters and NPCs
CREATE TABLE IF NOT EXISTS creature_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  armor_class INTEGER NOT NULL DEFAULT 10,
  resistances TEXT[] DEFAULT '{}',
  vulnerabilities TEXT[] DEFAULT '{}',
  immunities TEXT[] DEFAULT '{}',
  condition_immunities TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stats_owner CHECK (
    (character_id IS NOT NULL AND npc_id IS NULL) OR
    (character_id IS NULL AND npc_id IS NOT NULL)
  )
);

-- ==========================================
-- Weapon Attacks Table
-- ==========================================
-- Stores weapon attack data for characters
CREATE TABLE IF NOT EXISTS weapon_attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attack_bonus INTEGER NOT NULL,
  damage_dice TEXT NOT NULL,
  damage_bonus INTEGER NOT NULL DEFAULT 0,
  damage_type TEXT NOT NULL,
  properties TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- Indexes for Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_creature_stats_character ON creature_stats(character_id);
CREATE INDEX IF NOT EXISTS idx_creature_stats_npc ON creature_stats(npc_id);
CREATE INDEX IF NOT EXISTS idx_weapon_attacks_character ON weapon_attacks(character_id);

-- ==========================================
-- Comments
-- ==========================================
COMMENT ON TABLE creature_stats IS 'Stores combat statistics for characters and NPCs including AC, resistances, vulnerabilities, and immunities';
COMMENT ON TABLE weapon_attacks IS 'Stores weapon attack data for player characters';
COMMENT ON COLUMN creature_stats.resistances IS 'Array of damage types the creature is resistant to (half damage)';
COMMENT ON COLUMN creature_stats.vulnerabilities IS 'Array of damage types the creature is vulnerable to (double damage)';
COMMENT ON COLUMN creature_stats.immunities IS 'Array of damage types the creature is immune to (no damage)';
COMMENT ON COLUMN creature_stats.condition_immunities IS 'Array of conditions the creature is immune to';
COMMENT ON COLUMN weapon_attacks.damage_dice IS 'Damage dice notation (e.g., 1d8, 2d6)';
COMMENT ON COLUMN weapon_attacks.properties IS 'Array of weapon properties (e.g., finesse, versatile, reach)';
