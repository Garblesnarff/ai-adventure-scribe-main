-- Migration: Create Foundry VTT Integration Tables
-- Created: 2025-11-16
-- Description: Creates all tables for Foundry VTT-style virtual tabletop functionality
--              including scenes, tokens, fog of war, permissions, and drawing tools

-- =====================================================
-- ENUMS
-- =====================================================

-- Sharing mode enum (if not exists - may already be created)
DO $$ BEGIN
  CREATE TYPE sharing_mode AS ENUM ('private', 'view_only', 'can_edit', 'co_owner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Permission level enum for character sharing
CREATE TYPE permission_level AS ENUM ('viewer', 'editor', 'owner');
--> statement-breakpoint

-- Drawing type enum for scene annotations
CREATE TYPE drawing_type AS ENUM (
  'freehand',
  'line',
  'circle',
  'rectangle',
  'polygon',
  'text'
);
--> statement-breakpoint

-- Template type enum for spell/ability area effects
CREATE TYPE template_type AS ENUM (
  'cone',
  'cube',
  'sphere',
  'cylinder',
  'line',
  'ray'
);
--> statement-breakpoint

-- =====================================================
-- CHARACTER FOLDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- References auth.users(id)
  name text NOT NULL,
  parent_folder_id uuid, -- Self-reference for nested folders
  color text, -- Hex color code for UI
  icon text, -- Icon identifier
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- CHARACTER PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  user_id text NOT NULL, -- References auth.users(id)
  permission_level permission_level NOT NULL DEFAULT 'viewer',
  can_control_token boolean NOT NULL DEFAULT false,
  can_edit_sheet boolean NOT NULL DEFAULT false,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL -- References auth.users(id)
);
--> statement-breakpoint

-- =====================================================
-- SCENES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_id uuid NOT NULL,
  user_id text NOT NULL, -- References auth.users(id)
  width integer NOT NULL, -- Grid width in cells
  height integer NOT NULL, -- Grid height in cells
  grid_size integer NOT NULL DEFAULT 5, -- Default 5ft squares
  grid_type text NOT NULL DEFAULT 'square', -- 'square', 'hexagonal_horizontal', 'hexagonal_vertical', 'gridless'
  grid_color text DEFAULT '#000000', -- Hex color
  background_image_url text,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- SCENE LAYERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scene_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL,
  layer_type text NOT NULL, -- 'background', 'grid', 'tokens', 'effects', 'drawings', 'ui'
  z_index integer NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  opacity numeric(3, 2) NOT NULL DEFAULT 1.00, -- 0.00 to 1.00
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- SCENE SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scene_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL UNIQUE, -- One-to-one with scenes
  enable_fog_of_war boolean NOT NULL DEFAULT false,
  enable_dynamic_lighting boolean NOT NULL DEFAULT false,
  snap_to_grid boolean NOT NULL DEFAULT true,
  grid_opacity numeric(3, 2) NOT NULL DEFAULT 0.30, -- 0.00 to 1.00
  ambient_light_level numeric(3, 2) NOT NULL DEFAULT 1.00, -- 0.00 to 1.00
  darkness_level numeric(3, 2) NOT NULL DEFAULT 0.00, -- 0.00 to 1.00
  weather_effects text,
  time_of_day text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  scene_id uuid NOT NULL,
  actor_id uuid, -- Links to character or monster ID
  created_by text NOT NULL, -- References auth.users(id)

  -- Basic info
  name text NOT NULL,
  token_type text NOT NULL, -- 'character', 'npc', 'monster', 'object'

  -- Position and transform
  position_x numeric(10, 2) NOT NULL,
  position_y numeric(10, 2) NOT NULL,
  rotation numeric(6, 2) DEFAULT 0, -- degrees
  elevation numeric(8, 2) DEFAULT 0,

  -- Size
  size_width numeric(6, 2) NOT NULL, -- grid squares
  size_height numeric(6, 2) NOT NULL, -- grid squares
  grid_size text NOT NULL, -- 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'

  -- Appearance
  image_url text,
  avatar_url text,
  tint_color text, -- hex color
  scale numeric(4, 2) DEFAULT 1.0,
  opacity numeric(3, 2) DEFAULT 1.0, -- 0-1

  -- Border
  border_color text, -- hex color
  border_width integer DEFAULT 2,

  -- Nameplate
  show_nameplate boolean DEFAULT true,
  nameplate_position text DEFAULT 'bottom', -- 'top', 'bottom'

  -- Vision
  vision_enabled boolean DEFAULT false,
  vision_range numeric(8, 2), -- in feet
  vision_angle numeric(6, 2), -- degrees, 360 for full circle
  night_vision boolean DEFAULT false,
  darkvision_range numeric(8, 2), -- in feet

  -- Lighting
  emits_light boolean DEFAULT false,
  light_range numeric(8, 2), -- in feet
  light_angle numeric(6, 2), -- degrees
  light_color text, -- hex color
  light_intensity numeric(3, 2), -- 0-1
  dim_light_range numeric(8, 2), -- in feet
  bright_light_range numeric(8, 2), -- in feet

  -- State
  is_locked boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  is_visible boolean DEFAULT true,

  -- Movement
  movement_speed integer, -- in feet
  has_flying boolean DEFAULT false,
  has_swimming boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- TOKEN CONFIGURATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS token_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  character_id uuid, -- References characters table
  monster_id uuid, -- For future monster table

  -- Size
  size_width numeric(6, 2) DEFAULT 1.0, -- grid squares
  size_height numeric(6, 2) DEFAULT 1.0, -- grid squares
  grid_size text DEFAULT 'medium', -- 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'

  -- Appearance
  image_url text,
  avatar_url text,
  tint_color text, -- hex color
  scale numeric(4, 2) DEFAULT 1.0,
  opacity numeric(3, 2) DEFAULT 1.0, -- 0-1

  -- Border
  border_color text, -- hex color
  border_width integer DEFAULT 2,

  -- Nameplate
  show_nameplate boolean DEFAULT true,
  nameplate_position text DEFAULT 'bottom', -- 'top', 'bottom'

  -- Vision
  vision_enabled boolean DEFAULT false,
  vision_range numeric(8, 2), -- in feet
  vision_angle numeric(6, 2), -- degrees, 360 for full circle
  night_vision boolean DEFAULT false,
  darkvision_range numeric(8, 2), -- in feet

  -- Lighting
  emits_light boolean DEFAULT false,
  light_range numeric(8, 2), -- in feet
  light_angle numeric(6, 2), -- degrees
  light_color text, -- hex color
  light_intensity numeric(3, 2), -- 0-1
  dim_light_range numeric(8, 2), -- in feet
  bright_light_range numeric(8, 2), -- in feet

  -- Movement
  movement_speed integer, -- in feet
  has_flying boolean DEFAULT false,
  has_swimming boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- CHARACTER TOKENS JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_tokens (
  character_id uuid NOT NULL,
  token_id uuid NOT NULL,
  PRIMARY KEY (character_id, token_id)
);
--> statement-breakpoint

-- =====================================================
-- FOG OF WAR TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS fog_of_war (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL,
  user_id text NOT NULL, -- References auth.users(id)
  revealed_areas jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of revealed polygon areas
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, user_id) -- One fog of war record per user per scene
);
--> statement-breakpoint

-- =====================================================
-- VISION BLOCKING SHAPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vision_blocking_shapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL,
  shape_type text NOT NULL, -- 'wall', 'door', 'window', 'terrain'
  points_data jsonb NOT NULL, -- Array of {x, y} coordinates
  blocks_movement boolean NOT NULL DEFAULT true,
  blocks_vision boolean NOT NULL DEFAULT true,
  blocks_light boolean NOT NULL DEFAULT true,
  is_one_way boolean NOT NULL DEFAULT false,
  door_state text, -- 'open', 'closed', 'locked' (only for doors)
  created_by text NOT NULL, -- References auth.users(id)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- SCENE DRAWINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scene_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL,
  created_by text NOT NULL, -- References auth.users(id)

  -- Drawing configuration
  drawing_type drawing_type NOT NULL,
  points_data jsonb NOT NULL, -- Array of {x, y} coordinates
  stroke_color text NOT NULL, -- Hex color
  stroke_width integer NOT NULL,
  fill_color text, -- Hex color, nullable
  fill_opacity real NOT NULL DEFAULT 0, -- 0-1
  z_index integer NOT NULL DEFAULT 0,

  -- Text-specific properties
  text_content text, -- For 'text' type
  font_size integer, -- For 'text' type
  font_family text, -- For 'text' type

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- MEASUREMENT TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS measurement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL,
  created_by text NOT NULL, -- References auth.users(id)

  -- Template configuration
  template_type template_type NOT NULL,
  origin_x real NOT NULL, -- Grid coordinates
  origin_y real NOT NULL, -- Grid coordinates
  direction real NOT NULL, -- Degrees, for directional templates
  distance real NOT NULL, -- Radius or length in feet
  width real, -- For line templates, in feet

  -- Visual properties
  color text NOT NULL DEFAULT '#FF0000', -- Hex color
  opacity real NOT NULL DEFAULT 0.5, -- 0-1

  -- Lifecycle
  is_temporary boolean NOT NULL DEFAULT true, -- Auto-delete after use

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Character folders self-reference
ALTER TABLE character_folders
  ADD CONSTRAINT character_folders_parent_folder_id_fk
  FOREIGN KEY (parent_folder_id)
  REFERENCES character_folders(id)
  ON DELETE SET NULL;
--> statement-breakpoint

-- Character permissions
ALTER TABLE character_permissions
  ADD CONSTRAINT character_permissions_character_id_fk
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Scenes
ALTER TABLE scenes
  ADD CONSTRAINT scenes_campaign_id_fk
  FOREIGN KEY (campaign_id)
  REFERENCES campaigns(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Scene layers
ALTER TABLE scene_layers
  ADD CONSTRAINT scene_layers_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Scene settings
ALTER TABLE scene_settings
  ADD CONSTRAINT scene_settings_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Tokens
ALTER TABLE tokens
  ADD CONSTRAINT tokens_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Token configurations
ALTER TABLE token_configurations
  ADD CONSTRAINT token_configurations_character_id_fk
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Character tokens junction
ALTER TABLE character_tokens
  ADD CONSTRAINT character_tokens_character_id_fk
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE character_tokens
  ADD CONSTRAINT character_tokens_token_id_fk
  FOREIGN KEY (token_id)
  REFERENCES tokens(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Fog of war
ALTER TABLE fog_of_war
  ADD CONSTRAINT fog_of_war_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Vision blocking shapes
ALTER TABLE vision_blocking_shapes
  ADD CONSTRAINT vision_blocking_shapes_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Scene drawings
ALTER TABLE scene_drawings
  ADD CONSTRAINT scene_drawings_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- Measurement templates
ALTER TABLE measurement_templates
  ADD CONSTRAINT measurement_templates_scene_id_fk
  FOREIGN KEY (scene_id)
  REFERENCES scenes(id)
  ON DELETE CASCADE;
--> statement-breakpoint

-- =====================================================
-- INDEXES
-- =====================================================

-- Character folders indexes
CREATE INDEX IF NOT EXISTS idx_character_folders_user_id ON character_folders(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_character_folders_parent_folder_id ON character_folders(parent_folder_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_character_folders_sort_order ON character_folders(user_id, sort_order);
--> statement-breakpoint

-- Character permissions indexes
CREATE INDEX IF NOT EXISTS idx_character_permissions_character_id ON character_permissions(character_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_character_permissions_user_id ON character_permissions(user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS unique_character_user_permission ON character_permissions(character_id, user_id);
--> statement-breakpoint

-- Scenes indexes
CREATE INDEX IF NOT EXISTS idx_scenes_campaign_id ON scenes(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scenes_is_active ON scenes(is_active);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scenes_name ON scenes(name);
--> statement-breakpoint

-- Scene layers indexes
CREATE INDEX IF NOT EXISTS idx_scene_layers_scene_id ON scene_layers(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scene_layers_layer_type ON scene_layers(layer_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scene_layers_z_index ON scene_layers(z_index);
--> statement-breakpoint

-- Scene settings indexes
CREATE INDEX IF NOT EXISTS idx_scene_settings_scene_id ON scene_settings(scene_id);
--> statement-breakpoint

-- Tokens indexes
CREATE INDEX IF NOT EXISTS idx_tokens_scene_id ON tokens(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tokens_actor_id ON tokens(actor_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tokens_created_by ON tokens(created_by);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tokens_token_type ON tokens(token_type);
--> statement-breakpoint

-- Token configurations indexes
CREATE INDEX IF NOT EXISTS idx_token_configs_character_id ON token_configurations(character_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_token_configs_monster_id ON token_configurations(monster_id);
--> statement-breakpoint

-- Character tokens junction indexes
CREATE INDEX IF NOT EXISTS idx_character_tokens_character_id ON character_tokens(character_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_character_tokens_token_id ON character_tokens(token_id);
--> statement-breakpoint

-- Fog of war indexes
CREATE INDEX IF NOT EXISTS idx_fog_of_war_scene_id ON fog_of_war(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_fog_of_war_user_id ON fog_of_war(user_id);
--> statement-breakpoint

-- Vision blocking shapes indexes
CREATE INDEX IF NOT EXISTS idx_vision_blocking_shapes_scene_id ON vision_blocking_shapes(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_vision_blocking_shapes_created_by ON vision_blocking_shapes(created_by);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_vision_blocking_shapes_shape_type ON vision_blocking_shapes(shape_type);
--> statement-breakpoint

-- Scene drawings indexes
CREATE INDEX IF NOT EXISTS idx_scene_drawings_scene_id ON scene_drawings(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scene_drawings_created_by ON scene_drawings(created_by);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_scene_drawings_drawing_type ON scene_drawings(drawing_type);
--> statement-breakpoint

-- Measurement templates indexes
CREATE INDEX IF NOT EXISTS idx_measurement_templates_scene_id ON measurement_templates(scene_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_measurement_templates_created_by ON measurement_templates(created_by);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_measurement_templates_template_type ON measurement_templates(template_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_measurement_templates_is_temporary ON measurement_templates(is_temporary);
--> statement-breakpoint

-- =====================================================
-- UPDATES TO EXISTING TABLES (IF NEEDED)
-- =====================================================

-- Add Foundry VTT fields to characters table (if they don't already exist)
DO $$
BEGIN
  -- Add owner_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN owner_id text;
  END IF;

  -- Add is_public column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE characters ADD COLUMN is_public boolean NOT NULL DEFAULT false;
  END IF;

  -- Add sharing_mode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'sharing_mode'
  ) THEN
    ALTER TABLE characters ADD COLUMN sharing_mode sharing_mode NOT NULL DEFAULT 'private';
  END IF;

  -- Add folder_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN folder_id uuid;
  END IF;
END $$;
--> statement-breakpoint

-- Add foreign key for characters.folder_id (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'characters_folder_id_fk'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT characters_folder_id_fk
      FOREIGN KEY (folder_id)
      REFERENCES character_folders(id)
      ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Add indexes for new characters fields
CREATE INDEX IF NOT EXISTS idx_characters_owner_id ON characters(owner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_characters_is_public ON characters(is_public);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_characters_sharing_mode ON characters(sharing_mode);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_characters_folder_id ON characters(folder_id);
--> statement-breakpoint

-- =====================================================
-- ROLLBACK INSTRUCTIONS (COMMENTED OUT)
-- =====================================================

/*
-- To rollback this migration, run the following commands in order:

-- Drop all foreign key constraints first
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_folder_id_fk;
ALTER TABLE character_permissions DROP CONSTRAINT IF EXISTS character_permissions_character_id_fk;
ALTER TABLE scenes DROP CONSTRAINT IF EXISTS scenes_campaign_id_fk;
ALTER TABLE scene_layers DROP CONSTRAINT IF EXISTS scene_layers_scene_id_fk;
ALTER TABLE scene_settings DROP CONSTRAINT IF EXISTS scene_settings_scene_id_fk;
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_scene_id_fk;
ALTER TABLE token_configurations DROP CONSTRAINT IF EXISTS token_configurations_character_id_fk;
ALTER TABLE character_tokens DROP CONSTRAINT IF EXISTS character_tokens_character_id_fk;
ALTER TABLE character_tokens DROP CONSTRAINT IF EXISTS character_tokens_token_id_fk;
ALTER TABLE fog_of_war DROP CONSTRAINT IF EXISTS fog_of_war_scene_id_fk;
ALTER TABLE vision_blocking_shapes DROP CONSTRAINT IF EXISTS vision_blocking_shapes_scene_id_fk;
ALTER TABLE scene_drawings DROP CONSTRAINT IF EXISTS scene_drawings_scene_id_fk;
ALTER TABLE measurement_templates DROP CONSTRAINT IF EXISTS measurement_templates_scene_id_fk;
ALTER TABLE character_folders DROP CONSTRAINT IF EXISTS character_folders_parent_folder_id_fk;

-- Drop all tables
DROP TABLE IF EXISTS measurement_templates;
DROP TABLE IF EXISTS scene_drawings;
DROP TABLE IF EXISTS vision_blocking_shapes;
DROP TABLE IF EXISTS fog_of_war;
DROP TABLE IF EXISTS character_tokens;
DROP TABLE IF EXISTS token_configurations;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS scene_settings;
DROP TABLE IF EXISTS scene_layers;
DROP TABLE IF EXISTS scenes;
DROP TABLE IF EXISTS character_permissions;
DROP TABLE IF EXISTS character_folders;

-- Remove columns from characters table
ALTER TABLE characters DROP COLUMN IF EXISTS folder_id;
ALTER TABLE characters DROP COLUMN IF EXISTS sharing_mode;
ALTER TABLE characters DROP COLUMN IF EXISTS is_public;
ALTER TABLE characters DROP COLUMN IF EXISTS owner_id;

-- Drop all enums (only if not used elsewhere)
DROP TYPE IF EXISTS template_type;
DROP TYPE IF EXISTS drawing_type;
DROP TYPE IF EXISTS permission_level;
-- DROP TYPE IF EXISTS sharing_mode; -- Only if no other tables use it
*/
