CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"genre" text,
	"difficulty_level" text,
	"campaign_length" text,
	"tone" text,
	"era" text,
	"location" text,
	"atmosphere" text,
	"setting_details" jsonb,
	"thematic_elements" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"background_image" text,
	"art_style" text,
	"style_config" jsonb,
	"rules_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"strength" integer DEFAULT 10 NOT NULL,
	"dexterity" integer DEFAULT 10 NOT NULL,
	"constitution" integer DEFAULT 10 NOT NULL,
	"intelligence" integer DEFAULT 10 NOT NULL,
	"wisdom" integer DEFAULT 10 NOT NULL,
	"charisma" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"campaign_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"race" text,
	"class" text,
	"level" integer DEFAULT 1 NOT NULL,
	"alignment" text,
	"experience_points" integer DEFAULT 0,
	"background" text,
	"image_url" text,
	"avatar_url" text,
	"background_image" text,
	"appearance" text,
	"personality_traits" text,
	"personality_notes" text,
	"backstory_elements" text,
	"cantrips" text,
	"known_spells" text,
	"prepared_spells" text,
	"ritual_spells" text,
	"vision_types" text[],
	"obscurement" text,
	"is_hidden" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "class_spells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"spell_id" uuid NOT NULL,
	"spell_level" integer NOT NULL,
	"source_feature" text DEFAULT 'base',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hit_die" integer NOT NULL,
	"spellcasting_ability" text,
	"caster_type" text,
	"spell_slots_start_level" integer DEFAULT 1,
	"ritual_casting" boolean DEFAULT false,
	"spellcasting_focus_type" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dialogue_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"speaker_type" text,
	"speaker_id" uuid,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"character_id" uuid,
	"session_number" integer,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"status" text DEFAULT 'active',
	"current_scene_description" text,
	"summary" text,
	"session_notes" text,
	"turn_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location_type" text,
	"description" text,
	"population" integer,
	"climate" text,
	"terrain" text,
	"notable_features" text[],
	"connected_locations" text[],
	"image_url" text,
	"map_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"session_id" uuid,
	"memory_type" text,
	"importance" integer DEFAULT 5,
	"content" text NOT NULL,
	"context" jsonb,
	"embedding" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"race" text,
	"occupation" text,
	"personality" text,
	"description" text,
	"backstory" text,
	"relationship" text,
	"location" text,
	"image_url" text,
	"voice_id" text,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"quest_giver" text,
	"objectives" text[],
	"rewards" text[],
	"status" text DEFAULT 'available',
	"difficulty" text,
	"quest_type" text,
	"location_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ability_score_increases" jsonb,
	"traits" jsonb,
	"speed" integer DEFAULT 30,
	"size" text DEFAULT 'Medium',
	"languages" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "races_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "spells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"school" text NOT NULL,
	"casting_time" text NOT NULL,
	"range_text" text NOT NULL,
	"duration" text NOT NULL,
	"concentration" boolean DEFAULT false,
	"ritual" boolean DEFAULT false,
	"components_verbal" boolean DEFAULT false,
	"components_somatic" boolean DEFAULT false,
	"components_material" boolean DEFAULT false,
	"material_components" text,
	"material_cost_gp" integer DEFAULT 0,
	"material_consumed" boolean DEFAULT false,
	"description" text NOT NULL,
	"higher_level_text" text,
	"attack_type" text,
	"damage_type" text,
	"damage_at_slot_level" jsonb,
	"heal_at_slot_level" jsonb,
	"area_of_effect" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "spells_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "character_stats" ADD CONSTRAINT "character_stats_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_spells" ADD CONSTRAINT "class_spells_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_spells" ADD CONSTRAINT "class_spells_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialogue_history" ADD CONSTRAINT "dialogue_history_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaigns_user_id" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_status" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_character_stats_character_id" ON "character_stats" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "idx_characters_user_id" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_characters_campaign_id" ON "characters" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_characters_name" ON "characters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_characters_created_at" ON "characters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_class_spells_class_id" ON "class_spells" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_spells_spell_id" ON "class_spells" USING btree ("spell_id");--> statement-breakpoint
CREATE INDEX "idx_classes_name" ON "classes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_classes_caster_type" ON "classes" USING btree ("caster_type");--> statement-breakpoint
CREATE INDEX "idx_dialogue_history_session_id" ON "dialogue_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_dialogue_history_timestamp" ON "dialogue_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_campaign_id" ON "game_sessions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_character_id" ON "game_sessions" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "idx_game_sessions_status" ON "game_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_locations_campaign_id" ON "locations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_locations_name" ON "locations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_memories_campaign_id" ON "memories" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_memories_session_id" ON "memories" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_memories_memory_type" ON "memories" USING btree ("memory_type");--> statement-breakpoint
CREATE INDEX "idx_memories_importance" ON "memories" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "idx_npcs_campaign_id" ON "npcs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_npcs_name" ON "npcs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_quests_campaign_id" ON "quests" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_quests_status" ON "quests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_races_name" ON "races" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_spells_name" ON "spells" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_spells_level" ON "spells" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_spells_school" ON "spells" USING btree ("school");--> statement-breakpoint
CREATE INDEX "idx_spells_level_school" ON "spells" USING btree ("level","school");