# Database Schema Documentation

## Overview

This document provides a comprehensive overview of the AI Adventure Scribe database schema, which powers a D&D 5E digital game master application with integrated blog CMS functionality.

**Total Tables:** 38
**Foreign Key Relationships:** 67
**Schema Modules:** 9

The schema is organized into logical modules for maintainability and scalability:

- **Blog Module** (6 tables) - Content management system
- **Game Module** (5 tables) - Core game entities
- **Reference Module** (5 tables) - D&D 5E reference data
- **World Module** (4 tables) - Campaign world-building
- **Combat Module** (8 tables) - Combat encounter system
- **Rest Module** (2 tables) - Short and long rest mechanics
- **Inventory Module** (2 tables) - Item management
- **Progression Module** (2 tables) - XP and leveling
- **Class Features Module** (4 tables) - Class abilities and features

---

## Entity-Relationship Diagram

The complete ERD is available in Mermaid format: [database-schema.mmd](./database-schema.mmd)

To view the diagram:
1. Use a Mermaid-compatible viewer (GitHub, VS Code with Mermaid extension)
2. Or paste the contents into [Mermaid Live Editor](https://mermaid.live/)

---

## Table Documentation

### Blog Module

#### blog_authors
**Purpose:** Stores author profiles for blog content.

**Key Columns:**
- `id` (PK): Unique identifier
- `user_id` (FK): References auth.users - links blog author to user account
- `slug` (UNIQUE): URL-friendly identifier
- `display_name`: Author's public display name
- `metadata`: Flexible JSONB for additional author data

**Relationships:**
- One author → Many blog posts

**Indexes:**
- `idx_blog_authors_user_id` on user_id

**Design Notes:** The user_id is not enforced as a foreign key in Drizzle to avoid dependencies on Supabase auth schema, but logically references auth.users(id).

---

#### blog_categories
**Purpose:** Hierarchical categorization system for blog posts with SEO support.

**Key Columns:**
- `id` (PK): Unique identifier
- `slug` (UNIQUE): URL-friendly identifier
- `seo_title`, `seo_description`: SEO optimization fields

**Relationships:**
- Many categories ↔ Many blog posts (via blog_post_categories)

**Design Notes:** Supports future hierarchical categories through metadata field.

---

#### blog_tags
**Purpose:** Flexible tagging system for blog content organization.

**Key Columns:**
- `id` (PK): Unique identifier
- `slug` (UNIQUE): URL-friendly identifier

**Relationships:**
- Many tags ↔ Many blog posts (via blog_post_tags)

---

#### blog_posts
**Purpose:** Main content table for blog articles with workflow management.

**Key Columns:**
- `id` (PK): Unique identifier
- `author_id` (FK): References blog_authors.id
- `slug` (UNIQUE): URL-friendly identifier
- `status`: Enum ('draft', 'review', 'scheduled', 'published', 'archived')
- `seo_keywords`: Array of keywords for SEO
- `scheduled_for`: Publication scheduling support
- `published_at`: Actual publication timestamp

**Relationships:**
- Many posts → One author
- Many posts ↔ Many categories
- Many posts ↔ Many tags

**Indexes:**
- `idx_blog_posts_author_id` on author_id
- `idx_blog_posts_status` on status
- `idx_blog_posts_published_at` on published_at

**Design Notes:** Status field supports complete editorial workflow from draft to publication.

---

#### blog_post_categories
**Purpose:** Junction table for many-to-many relationship between posts and categories.

**Key Columns:**
- `post_id` (FK): References blog_posts.id
- `category_id` (FK): References blog_categories.id
- `assigned_at`: Timestamp of category assignment

**Relationships:**
- Bridge table between blog_posts and blog_categories

**Indexes:**
- `idx_blog_post_categories_post_id` on post_id
- `idx_blog_post_categories_category_id` on category_id

**Delete Behavior:** CASCADE on both foreign keys

---

#### blog_post_tags
**Purpose:** Junction table for many-to-many relationship between posts and tags.

**Key Columns:**
- `post_id` (FK): References blog_posts.id
- `tag_id` (FK): References blog_tags.id
- `assigned_at`: Timestamp of tag assignment

**Relationships:**
- Bridge table between blog_posts and blog_tags

**Indexes:**
- `idx_blog_post_tags_post_id` on post_id
- `idx_blog_post_tags_tag_id` on tag_id

**Delete Behavior:** CASCADE on both foreign keys

---

### Game Module

#### campaigns
**Purpose:** Top-level container for D&D campaigns with setting configuration.

**Key Columns:**
- `id` (PK): Unique identifier
- `user_id` (FK): References auth.users - campaign owner
- `name`: Campaign name
- `setting_details`: JSONB for world details
- `thematic_elements`: JSONB for themes/motifs
- `status`: Campaign status (default: 'active')
- `style_config`: JSONB for visual styling
- `rules_config`: JSONB for house rules

**Relationships:**
- One campaign → Many characters
- One campaign → Many game sessions
- One campaign → Many NPCs
- One campaign → Many locations
- One campaign → Many quests
- One campaign → Many memories

**Indexes:**
- `idx_campaigns_user_id` on user_id
- `idx_campaigns_status` on status

**Design Notes:** Central hub table connecting all campaign-specific entities.

---

#### characters
**Purpose:** D&D character sheets with complete character data.

**Key Columns:**
- `id` (PK): Unique identifier
- `user_id` (FK): References auth.users - character owner
- `campaign_id` (FK): References campaigns.id
- `race`, `class`, `level`, `alignment`: Core D&D attributes
- `experience_points`: XP tracking
- `cantrips`, `known_spells`, `prepared_spells`, `ritual_spells`: Spell tracking (comma-separated text)
- `vision_types`: Array of vision types (darkvision, etc.)
- `is_hidden`: Stealth/visibility state

**Relationships:**
- Many characters → One campaign
- One character → One character_stats
- One character → Many game sessions
- One character → Many character spells
- One character → Many combat participants
- One character → Many rest events
- One character → Many inventory items
- One character → Many experience events
- One character → One level progression
- One character → Many character features

**Indexes:**
- `idx_characters_user_id` on user_id
- `idx_characters_campaign_id` on campaign_id
- `idx_characters_name` on name
- `idx_characters_created_at` on created_at

**Design Notes:** Central player entity with extensive relationships across the system.

---

#### character_stats
**Purpose:** D&D ability scores for characters.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`: Six core ability scores (default: 10)

**Relationships:**
- One character_stats → One character

**Indexes:**
- `idx_character_stats_character_id` on character_id

**Delete Behavior:** CASCADE when character is deleted

**Design Notes:** Separated from main characters table for better data organization and potential future expansion.

---

#### game_sessions
**Purpose:** Individual play sessions within campaigns.

**Key Columns:**
- `id` (PK): Unique identifier
- `campaign_id` (FK): References campaigns.id
- `character_id` (FK): References characters.id
- `session_number`: Sequential session counter
- `start_time`, `end_time`: Session duration
- `status`: Session status (default: 'active')
- `current_scene_description`: Active scene text
- `turn_count`: Turn counter

**Relationships:**
- Many sessions → One campaign
- Many sessions → One character (primary PC)
- One session → Many dialogue entries
- One session → Many combat encounters
- One session → Many memories
- One session → Many rest events
- One session → Many consumable usage logs
- One session → Many experience events
- One session → Many feature usage logs

**Indexes:**
- `idx_game_sessions_campaign_id` on campaign_id
- `idx_game_sessions_character_id` on character_id
- `idx_game_sessions_status` on status

**Delete Behavior:** CASCADE from campaign, SET NULL from character

---

#### dialogue_history
**Purpose:** Chat messages and dialogue during game sessions.

**Key Columns:**
- `id` (PK): Unique identifier
- `session_id` (FK): References game_sessions.id
- `speaker_type`: 'player', 'dm', or 'npc'
- `speaker_id`: References character or NPC
- `message`: Dialogue content
- `context`: JSONB for additional context

**Relationships:**
- Many dialogue entries → One session

**Indexes:**
- `idx_dialogue_history_session_id` on session_id
- `idx_dialogue_history_timestamp` on timestamp

**Delete Behavior:** CASCADE when session is deleted

---

### Reference Module

#### classes
**Purpose:** D&D 5E class definitions with spellcasting mechanics.

**Key Columns:**
- `id` (PK): Unique identifier
- `name` (UNIQUE): Class name (e.g., 'Wizard', 'Fighter')
- `hit_die`: Hit die size (d6, d8, d10, d12)
- `spellcasting_ability`: 'INT', 'WIS', 'CHA', or NULL
- `caster_type`: 'full', 'half', 'third', 'pact', or NULL
- `spell_slots_start_level`: Level when spellcasting begins
- `ritual_casting`: Whether class can cast ritual spells

**Relationships:**
- One class → Many class spells
- One class → Many character spells (source class)

**Indexes:**
- `idx_classes_name` on name
- `idx_classes_caster_type` on caster_type

---

#### races
**Purpose:** D&D 5E race definitions with traits and bonuses.

**Key Columns:**
- `id` (PK): Unique identifier
- `name` (UNIQUE): Race name (e.g., 'Elf', 'Dwarf')
- `ability_score_increases`: JSONB mapping abilities to bonuses
- `traits`: JSONB array of racial traits
- `speed`: Base movement speed (default: 30)
- `size`: Size category (default: 'Medium')
- `languages`: Text array of known languages

**Indexes:**
- `idx_races_name` on name

---

#### spells
**Purpose:** Complete D&D 5E spell database with full mechanics.

**Key Columns:**
- `id` (PK): Unique identifier
- `name` (UNIQUE): Spell name
- `level`: 0 for cantrips, 1-9 for leveled spells
- `school`: School of magic
- `concentration`: Boolean for concentration requirement
- `ritual`: Boolean for ritual casting
- `components_verbal`, `components_somatic`, `components_material`: Component requirements
- `material_components`, `material_cost_gp`, `material_consumed`: Material details
- `damage_at_slot_level`: JSONB damage scaling
- `heal_at_slot_level`: JSONB healing scaling
- `area_of_effect`: JSONB area definition

**Relationships:**
- One spell → Many class spells
- One spell → Many character spells

**Indexes:**
- `idx_spells_name` on name
- `idx_spells_level` on level
- `idx_spells_school` on school
- `idx_spells_level_school` on (level, school) - composite

**Design Notes:** Comprehensive spell data structure supporting all D&D 5E spell mechanics.

---

#### class_spells
**Purpose:** Junction table mapping spells to classes (spell lists).

**Key Columns:**
- `id` (PK): Unique identifier
- `class_id` (FK): References classes.id
- `spell_id` (FK): References spells.id
- `spell_level`: Spell level in this class list
- `source_feature`: 'base', 'domain', 'oath', etc.

**Relationships:**
- Many class_spells → One class
- Many class_spells → One spell

**Indexes:**
- `idx_class_spells_class_id` on class_id
- `idx_class_spells_spell_id` on spell_id

**Delete Behavior:** CASCADE on both foreign keys

---

#### character_spells
**Purpose:** Individual character spell selections and preparation.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id (not enforced)
- `spell_id` (FK): References spells.id
- `source_class_id` (FK): References classes.id
- `is_prepared`: Current preparation status
- `is_always_prepared`: Always prepared (domain spells, etc.)
- `spell_level_learned`: Level when spell was learned

**Relationships:**
- Many character_spells → One character
- Many character_spells → One spell
- Many character_spells → One class (source)

**Indexes:**
- `idx_character_spells_character_id` on character_id
- `idx_character_spells_spell_id` on spell_id

**Delete Behavior:** CASCADE when spell or source class is deleted

**Design Notes:** character_id foreign key not enforced in Drizzle to avoid circular dependency with game.ts.

---

### World Module

#### npcs
**Purpose:** Non-player characters in campaigns.

**Key Columns:**
- `id` (PK): Unique identifier
- `campaign_id` (FK): References campaigns.id
- `name`: NPC name
- `race`, `occupation`: Basic info
- `personality`, `backstory`: Character details
- `relationship`: Relationship to party
- `location`: Current location
- `voice_id`: Voice synthesis identifier
- `stats`: JSONB for optional combat stats

**Relationships:**
- Many NPCs → One campaign
- One NPC → Many combat participants
- One NPC → One creature stats (optional)

**Indexes:**
- `idx_npcs_campaign_id` on campaign_id
- `idx_npcs_name` on name

**Delete Behavior:** CASCADE when campaign is deleted

---

#### locations
**Purpose:** Places and areas within campaigns.

**Key Columns:**
- `id` (PK): Unique identifier
- `campaign_id` (FK): References campaigns.id
- `name`: Location name
- `location_type`: 'city', 'dungeon', 'wilderness', etc.
- `notable_features`: Text array
- `connected_locations`: Text array of location IDs
- `map_url`: Map image URL

**Relationships:**
- Many locations → One campaign
- One location → Many quests

**Indexes:**
- `idx_locations_campaign_id` on campaign_id
- `idx_locations_name` on name

**Delete Behavior:** CASCADE when campaign is deleted

---

#### quests
**Purpose:** Missions and objectives within campaigns.

**Key Columns:**
- `id` (PK): Unique identifier
- `campaign_id` (FK): References campaigns.id
- `location_id` (FK): References locations.id
- `title`: Quest title
- `objectives`: Text array of objectives
- `rewards`: Text array of rewards
- `status`: 'available', 'active', 'completed', 'failed'
- `difficulty`: 'easy', 'medium', 'hard', 'deadly'
- `quest_type`: 'main', 'side', 'personal'

**Relationships:**
- Many quests → One campaign
- Many quests → One location (optional)

**Indexes:**
- `idx_quests_campaign_id` on campaign_id
- `idx_quests_status` on status

**Delete Behavior:** CASCADE from campaign, SET NULL from location

---

#### memories
**Purpose:** Episodic memory for AI agents tracking campaign events.

**Key Columns:**
- `id` (PK): Unique identifier
- `campaign_id` (FK): References campaigns.id
- `session_id` (FK): References game_sessions.id
- `memory_type`: 'event', 'character', 'location', 'item', etc.
- `importance`: 1-10 scale for memory priority
- `content`: Memory text
- `embedding`: Vector embedding for semantic search

**Relationships:**
- Many memories → One campaign
- Many memories → One session

**Indexes:**
- `idx_memories_campaign_id` on campaign_id
- `idx_memories_session_id` on session_id
- `idx_memories_memory_type` on memory_type
- `idx_memories_importance` on importance

**Delete Behavior:** CASCADE when campaign or session is deleted

**Design Notes:** Supports RAG (Retrieval-Augmented Generation) pattern with embeddings field.

---

### Combat Module

#### combat_encounters
**Purpose:** Combat encounters within game sessions.

**Key Columns:**
- `id` (PK): Unique identifier
- `session_id` (FK): References game_sessions.id
- `status`: 'active', 'paused', 'completed'
- `current_round`: Active round number
- `current_turn_order`: Active turn index
- `difficulty`: 'easy', 'medium', 'hard', 'deadly'
- `experience_awarded`: XP for encounter

**Relationships:**
- Many encounters → One session
- One encounter → Many participants
- One encounter → Many damage log entries

**Indexes:**
- `idx_combat_encounters_session` on session_id
- `idx_combat_encounters_status` on status

**Delete Behavior:** CASCADE when session is deleted

---

#### combat_participants
**Purpose:** Participants (PCs, NPCs, monsters) in combat.

**Key Columns:**
- `id` (PK): Unique identifier
- `encounter_id` (FK): References combat_encounters.id
- `character_id` (FK): References characters.id (optional)
- `npc_id` (FK): References npcs.id (optional)
- `name`: Participant display name
- `participant_type`: 'player', 'npc', 'enemy', 'monster'
- `initiative`, `initiative_modifier`: Initiative values
- `turn_order`: Turn order position
- `armor_class`, `max_hp`, `speed`: Combat stats
- `damage_resistances`, `damage_immunities`, `damage_vulnerabilities`: Damage modifiers (arrays)

**Relationships:**
- Many participants → One encounter
- Many participants → One character (optional)
- Many participants → One NPC (optional)
- One participant → One status
- One participant → Many conditions
- One participant → Many damage log entries (received)
- One participant → Many damage log entries (dealt)

**Indexes:**
- `idx_combat_participants_encounter` on encounter_id
- `idx_combat_participants_turn_order` on (encounter_id, turn_order)
- `idx_combat_participants_character` on character_id
- `idx_combat_participants_npc` on npc_id
- `idx_combat_participants_initiative` on (encounter_id, initiative)

**Delete Behavior:** CASCADE from encounter, SET NULL from character/NPC

---

#### combat_participant_status
**Purpose:** Current HP, temp HP, and death save tracking.

**Key Columns:**
- `id` (PK): Unique identifier
- `participant_id` (FK, UNIQUE): References combat_participants.id
- `current_hp`, `max_hp`, `temp_hp`: HP tracking
- `is_conscious`: Consciousness state
- `death_saves_successes`, `death_saves_failures`: Death save counters

**Relationships:**
- One status → One participant

**Indexes:**
- `idx_combat_participant_status_participant` on participant_id
- UNIQUE constraint on participant_id

**Delete Behavior:** CASCADE when participant is deleted

**Design Notes:** Separated from participants table for cleaner data organization and update patterns.

---

#### combat_damage_log
**Purpose:** Complete damage history for analytics.

**Key Columns:**
- `id` (PK): Unique identifier
- `encounter_id` (FK): References combat_encounters.id
- `participant_id` (FK): References combat_participants.id (target)
- `source_participant_id` (FK): References combat_participants.id (source)
- `damage_amount`: Damage dealt
- `damage_type`: Type of damage
- `round_number`: Round when damage occurred

**Relationships:**
- Many damage logs → One encounter
- Many damage logs → One participant (target)
- Many damage logs → One participant (source)

**Indexes:**
- `idx_combat_damage_log_encounter` on encounter_id
- `idx_combat_damage_log_participant` on participant_id
- `idx_combat_damage_log_round` on (encounter_id, round_number)

**Delete Behavior:** CASCADE from encounter and participant, SET NULL from source

---

#### conditions_library
**Purpose:** Reference table for all D&D 5E conditions.

**Key Columns:**
- `id` (PK): Unique identifier
- `name` (UNIQUE): Condition name (e.g., 'Blinded', 'Charmed')
- `description`: Condition description
- `mechanical_effects`: Game mechanics text
- `icon_name`: UI icon identifier

**Relationships:**
- One condition → Many applied conditions

**Indexes:**
- `idx_conditions_library_name` on name

**Design Notes:** Contains all 13 core D&D 5E conditions as reference data.

---

#### combat_participant_conditions
**Purpose:** Active conditions on combat participants.

**Key Columns:**
- `id` (PK): Unique identifier
- `participant_id` (FK): References combat_participants.id
- `condition_id` (FK): References conditions_library.id
- `duration_type`: 'rounds', 'minutes', 'hours', 'until_save', 'permanent'
- `duration_value`: Numeric duration
- `save_dc`, `save_ability`: Save mechanics
- `applied_at_round`, `expires_at_round`: Timing
- `is_active`: Active state

**Relationships:**
- Many conditions → One participant
- Many conditions → One condition (library)

**Indexes:**
- `idx_conditions_participant` on participant_id
- `idx_conditions_active` on (participant_id, is_active)
- `idx_conditions_expiry` on (expires_at_round, is_active)

**Delete Behavior:** CASCADE when participant or condition library entry is deleted

---

#### creature_stats
**Purpose:** AC, resistances, vulnerabilities, immunities for creatures.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id (optional)
- `npc_id` (FK): References npcs.id (optional)
- `armor_class`: AC value
- `resistances`, `vulnerabilities`, `immunities`, `condition_immunities`: Damage/condition modifiers (arrays)

**Relationships:**
- One creature_stats → One character (optional)
- One creature_stats → One NPC (optional)

**Indexes:**
- `idx_creature_stats_character` on character_id
- `idx_creature_stats_npc` on npc_id

**Delete Behavior:** CASCADE when character or NPC is deleted

**Design Notes:** Used for attack resolution system.

---

#### weapon_attacks
**Purpose:** Weapon attack data for player characters.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `name`: Weapon name
- `attack_bonus`: To-hit bonus
- `damage_dice`: Damage dice notation (e.g., '1d8')
- `damage_bonus`: Damage bonus
- `damage_type`: Type of damage
- `properties`: Array of weapon properties

**Relationships:**
- Many weapons → One character

**Indexes:**
- `idx_weapon_attacks_character` on character_id

**Delete Behavior:** CASCADE when character is deleted

---

### Rest Module

#### rest_events
**Purpose:** Tracks short and long rest events.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `session_id` (FK): References game_sessions.id
- `rest_type`: 'short' or 'long'
- `started_at`, `completed_at`: Rest timing
- `hp_restored`: HP recovered
- `hit_dice_spent`: Hit dice used
- `resources_restored`: JSON string of restored resources
- `interrupted`: Whether rest was interrupted

**Relationships:**
- Many rest events → One character
- Many rest events → One session

**Indexes:**
- `idx_rest_events_character` on character_id
- `idx_rest_events_session` on session_id
- `idx_rest_events_type` on rest_type
- `idx_rest_events_completed` on completed_at

**Delete Behavior:** CASCADE from character, SET NULL from session

---

#### character_hit_dice
**Purpose:** Hit dice tracking per class (multiclass support).

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `class_name`: Class name
- `die_type`: 'd6', 'd8', 'd10', or 'd12'
- `total_dice`: Maximum hit dice
- `used_dice`: Currently spent hit dice

**Relationships:**
- Many hit dice pools → One character

**Indexes:**
- `idx_hit_dice_character` on character_id
- `idx_hit_dice_class` on class_name

**Delete Behavior:** CASCADE when character is deleted

**Design Notes:** Supports multiclassing by tracking hit dice per class.

---

### Inventory Module

#### inventory_items
**Purpose:** Character inventory with weight, equipment, and attunement.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `name`: Item name
- `item_type`: 'weapon', 'armor', 'consumable', 'ammunition', 'equipment', 'treasure'
- `quantity`: Item count
- `weight`: Numeric weight (precision 5, scale 2)
- `is_equipped`: Equipment state
- `is_attuned`, `requires_attunement`: Attunement tracking
- `properties`: JSON string for flexible properties

**Relationships:**
- Many items → One character
- One item → Many usage log entries

**Indexes:**
- `idx_inventory_character` on character_id
- `idx_inventory_item_type` on (character_id, item_type)

**Delete Behavior:** CASCADE when character is deleted

---

#### consumable_usage_log
**Purpose:** Tracks consumable and ammunition usage.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `item_id` (FK): References inventory_items.id
- `session_id` (FK): References game_sessions.id
- `quantity_used`: Amount consumed
- `context`: Usage context description

**Relationships:**
- Many usage logs → One character
- Many usage logs → One item
- Many usage logs → One session

**Indexes:**
- `idx_consumable_usage_character` on character_id
- `idx_consumable_usage_item` on item_id
- `idx_consumable_usage_session` on session_id
- `idx_consumable_usage_timestamp` on timestamp

**Delete Behavior:** CASCADE from character and item, SET NULL from session

---

### Progression Module

#### experience_events
**Purpose:** XP gain history with source tracking.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `session_id` (FK): References game_sessions.id
- `xp_gained`: Amount of XP awarded
- `source`: 'combat', 'quest', 'roleplay', 'milestone', 'other'
- `description`: XP source description

**Relationships:**
- Many XP events → One character
- Many XP events → One session

**Indexes:**
- `idx_xp_events_character` on character_id
- `idx_xp_events_session` on session_id
- `idx_xp_events_source` on source
- `idx_xp_events_timestamp` on timestamp

**Delete Behavior:** CASCADE from character, SET NULL from session

---

#### level_progression
**Purpose:** Current level and XP tracking for characters.

**Key Columns:**
- `character_id` (PK, FK): References characters.id
- `current_level`: Current character level
- `current_xp`: XP in current level
- `xp_to_next_level`: XP needed for next level
- `total_xp`: Lifetime total XP
- `last_level_up`: Timestamp of last level gain

**Relationships:**
- One progression → One character

**Indexes:**
- `idx_level_progression_level` on current_level
- `idx_level_progression_updated` on updated_at

**Delete Behavior:** CASCADE when character is deleted

**Design Notes:** Uses character_id as primary key (one-to-one relationship). Implements PHB pg. 15 XP thresholds.

---

### Class Features Module

#### class_features_library
**Purpose:** Reference library of all D&D 5E class features.

**Key Columns:**
- `id` (PK): Unique identifier
- `class_name`: Class name
- `subclass_name`: Subclass name (optional)
- `feature_name`: Feature name
- `level_acquired`: Level when feature is gained
- `description`: Feature description
- `mechanical_effects`: Game mechanics text
- `usage_type`: 'passive', 'action', 'bonus_action', 'reaction', 'limited_use'
- `uses_per_rest`: 'at_will', 'short_rest', 'long_rest', 'other'
- `uses_count`: Number of uses

**Relationships:**
- One feature → Many character features
- One feature → Many usage logs

**Indexes:**
- `idx_class_features_class` on (class_name, level_acquired)
- `idx_class_features_subclass` on subclass_name

---

#### character_features
**Purpose:** Features granted to individual characters.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `feature_id` (FK): References class_features_library.id
- `uses_remaining`: Remaining uses for limited-use features
- `is_active`: Whether feature is currently active
- `acquired_at_level`: Level when feature was acquired

**Relationships:**
- Many character features → One character
- Many character features → One feature (library)

**Indexes:**
- `idx_character_features_character` on character_id
- `idx_character_features_feature` on feature_id

**Delete Behavior:** CASCADE when character or feature is deleted

---

#### character_subclasses
**Purpose:** Subclass choices for characters (permanent once chosen).

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `class_name`: Class name
- `subclass_name`: Chosen subclass
- `chosen_at_level`: Level when subclass was chosen

**Relationships:**
- Many subclass choices → One character

**Indexes:**
- `idx_character_subclasses_character` on character_id

**Delete Behavior:** CASCADE when character is deleted

**Design Notes:** Supports multiclassing by allowing multiple subclass choices.

---

#### feature_usage_log
**Purpose:** Tracks when and how features are used.

**Key Columns:**
- `id` (PK): Unique identifier
- `character_id` (FK): References characters.id
- `feature_id` (FK): References class_features_library.id
- `session_id` (FK): References game_sessions.id
- `used_at`: Usage timestamp
- `context`: Usage context description

**Relationships:**
- Many usage logs → One character
- Many usage logs → One feature
- Many usage logs → One session

**Indexes:**
- `idx_feature_usage_character` on character_id
- `idx_feature_usage_feature` on feature_id
- `idx_feature_usage_session` on session_id

**Delete Behavior:** CASCADE from character and feature, SET NULL from session

---

## Schema Design Patterns

### 1. Cascade Deletion Pattern
**Usage:** Throughout the schema
**Purpose:** Maintain referential integrity by cascading deletions from parent to child entities

**Examples:**
- Deleting a campaign cascades to characters, NPCs, locations, quests, memories
- Deleting a character cascades to stats, spells, inventory, progression data
- Deleting a combat encounter cascades to all participants, damage logs, conditions

**Benefit:** Prevents orphaned records and simplifies cleanup operations

---

### 2. Junction Table Pattern
**Usage:** blog_post_categories, blog_post_tags, class_spells
**Purpose:** Implement many-to-many relationships with optional metadata

**Structure:**
- Two foreign keys (both sides of relationship)
- Optional timestamp fields (assigned_at, created_at)
- Optional relationship metadata

**Benefit:** Flexible many-to-many relationships with audit trail

---

### 3. Library + Instance Pattern
**Usage:** conditions_library + combat_participant_conditions, class_features_library + character_features
**Purpose:** Separate reference data from instance data

**Structure:**
- Library table: Immutable reference data (seeded from D&D rules)
- Instance table: Mutable character-specific data with FK to library

**Benefit:** Consistent reference data, efficient storage, easy updates

---

### 4. Audit Trail Pattern
**Usage:** All major tables
**Purpose:** Track creation and modification times

**Structure:**
- `created_at` timestamp (defaultNow)
- `updated_at` timestamp (defaultNow, updated on changes)

**Benefit:** Debugging, analytics, compliance

---

### 5. Soft Foreign Keys Pattern
**Usage:** blog_authors.user_id, characters.user_id, character_spells.character_id
**Purpose:** Reference external schemas without enforcing constraints

**Implementation:**
- UUID field references external table
- No Drizzle .references() call
- Index on foreign key field for performance

**Benefit:** Avoids circular dependencies, maintains loose coupling with auth system

---

### 6. JSONB Flexibility Pattern
**Usage:** metadata fields, stats, multiclass_info, abilities
**Purpose:** Store flexible, schema-less data alongside structured data

**Use Cases:**
- Future extensibility (metadata fields)
- Complex nested structures (ability_score_increases, traits)
- Variable configuration (style_config, rules_config)

**Benefit:** Schema evolution without migrations, complex data structures

---

### 7. Composite Indexing Pattern
**Usage:** idx_spells_level_school, idx_combat_participants_turn_order
**Purpose:** Optimize common query patterns with multi-column indexes

**Examples:**
- `(encounter_id, turn_order)` for turn order queries
- `(level, school)` for spell filtering
- `(character_id, item_type)` for inventory queries

**Benefit:** Improved query performance for common access patterns

---

### 8. Status/Workflow Pattern
**Usage:** blog_posts.status, campaigns.status, game_sessions.status, combat_encounters.status
**Purpose:** Track entity lifecycle and workflow states

**Implementation:**
- Text enum field with specific allowed values
- Index on status field for filtering
- Default value for new records

**Benefit:** Clear state management, workflow support

---

### 9. Event Sourcing Pattern
**Usage:** experience_events, rest_events, feature_usage_log, consumable_usage_log, combat_damage_log
**Purpose:** Store complete history of events for audit and analytics

**Structure:**
- Immutable log table (no updates)
- Timestamp for event ordering
- Foreign keys to entities involved
- Description/context fields

**Benefit:** Complete audit trail, time-travel queries, analytics

---

### 10. Primary Key as Foreign Key Pattern
**Usage:** level_progression.character_id
**Purpose:** One-to-one relationships where child cannot exist without parent

**Implementation:**
- Child table uses parent's PK as its own PK and FK
- Enforces one-to-one relationship at database level

**Benefit:** Guaranteed one-to-one, simplified queries

---

## Foreign Key Relationships Summary

**Total Foreign Keys:** 67

### By Module:
- **Blog:** 6 FKs (2 in posts, 2 in post_categories, 2 in post_tags)
- **Game:** 5 FKs (1 in characters, 2 in game_sessions, 1 in character_stats, 1 in dialogue_history)
- **Reference:** 6 FKs (2 in class_spells, 3 in character_spells)
- **World:** 6 FKs (1 each in npcs/locations/memories, 2 in quests)
- **Combat:** 20 FKs (1 in encounters, 3 in participants, 1 in status, 3 in damage_log, 2 in conditions, 2 in creature_stats, 1 in weapon_attacks, 2 in participant_conditions)
- **Rest:** 4 FKs (2 in rest_events, 1 in character_hit_dice)
- **Inventory:** 5 FKs (1 in inventory_items, 3 in consumable_usage_log)
- **Progression:** 4 FKs (2 in experience_events, 1 in level_progression)
- **Class Features:** 9 FKs (2 in character_features, 1 in character_subclasses, 3 in feature_usage_log)

### Relationship Types:
- **One-to-Many:** 52 relationships
- **Many-to-Many:** 5 relationships (via junction tables)
- **One-to-One:** 4 relationships (character_stats, combat_participant_status, creature_stats, level_progression)

---

## Indexing Strategy

**Total Indexes:** 85+

### Index Categories:

1. **Foreign Key Indexes** (67): All foreign keys are indexed for join performance
2. **Unique Constraint Indexes** (9): Slug fields, name fields with uniqueness
3. **Composite Indexes** (8): Multi-column indexes for common query patterns
4. **Status/Enum Indexes** (6): Workflow state filtering
5. **Timestamp Indexes** (5): Time-based queries and sorting

### High-Value Composite Indexes:
- `idx_combat_participants_turn_order` on (encounter_id, turn_order)
- `idx_combat_participants_initiative` on (encounter_id, initiative)
- `idx_spells_level_school` on (level, school)
- `idx_inventory_item_type` on (character_id, item_type)
- `idx_conditions_active` on (participant_id, is_active)

---

## Schema Statistics

- **Total Tables:** 38
- **Total Foreign Keys:** 67
- **Total Indexes:** 85+
- **Total Unique Constraints:** 9
- **Module Count:** 9
- **Junction Tables:** 5
- **Reference/Library Tables:** 4
- **Event Log Tables:** 5

### Table Size Expectations (per campaign):
- **Small** (<100 rows): campaigns, characters, npcs, locations, quests, classes, races
- **Medium** (100-1000 rows): blog_posts, game_sessions, inventory_items, spells
- **Large** (1000+ rows): dialogue_history, memories, experience_events, combat_damage_log
- **Very Large** (10000+ rows): consumable_usage_log, feature_usage_log

---

## External Dependencies

### Supabase Auth Schema
The following fields reference `auth.users(id)` but are not enforced as foreign keys:

1. `blog_authors.user_id` - Blog author account
2. `campaigns.user_id` - Campaign owner
3. `characters.user_id` - Character owner

**Rationale:** Avoid tight coupling with auth schema, prevent circular dependencies

**Validation:** Application-level validation ensures referential integrity

---

## Migration Strategy

Schema is managed through:
1. **Drizzle ORM** - TypeScript schema definitions in `db/schema/*.ts`
2. **SQL Migrations** - Hand-written migrations in `db/migrations/*.sql`
3. **Seed Scripts** - Reference data population (conditions, classes, races, spells)

See [MIGRATIONS.md](./MIGRATIONS.md) for migration workflow details.

---

## Version History

- **2025-11-14**: Initial comprehensive ERD and documentation (Work Unit 3.7)
- **2025-11-13**: Added class features system (Work Unit 3.2a)
- **2025-11-12**: Added combat system with 8 tables (Work Unit 1.1a)
- **2025-11-11**: Added progression and rest systems (Work Units 2.2a, 3.1a)
- **2025-11-10**: Added inventory system (Work Unit 2.4a)
- **Earlier**: Core game, blog, reference, and world modules

---

## Related Documentation

- [DATABASE_CLIENT.md](./DATABASE_CLIENT.md) - Database client usage patterns
- [MIGRATIONS.md](./MIGRATIONS.md) - Migration workflow and best practices
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling patterns
- [PERFORMANCE_DASHBOARD.md](./PERFORMANCE_DASHBOARD.md) - Query performance monitoring

---

**Document Status:** Complete
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
