# Migration Test Script - Sample Output

This document shows example output from the automated migration testing script.

## Successful Test Run

```bash
$ npm run test:migrations

╔════════════════════════════════════════════╗
║   DATABASE MIGRATION TEST SUITE            ║
╚════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pre-flight Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Verifying Supabase CLI installation...
✓ Supabase CLI found
ℹ Checking project directory structure...
✓ Project directory structure valid
ℹ Counting migration files...
✓ Found 51 migration files
ℹ Checking Supabase status...
✓ Supabase is running


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migrations to Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  20240829_add_game_session_fields.sql
  20240903_enhance_memories_for_fiction.sql
  20250905_add_background_image_to_campaigns.sql
  20250906_add_character_image_and_details.sql
  20250907_add_personality_notes.sql
  20250907_complete_character_columns.sql
  20250908_add_vision_stealth_columns.sql
  20250909_add_magic_item_properties.sql
  20250910_add_environmental_hazards.sql
  20250911_add_multiclassing_columns.sql
  20250914_add_enhancement_options.sql
  20250919_add_cascade_delete_to_memories.sql
  20250920_add_character_voice_mappings.sql
  20250920_add_memory_embeddings.sql
  20250920_create_spellcasting_tables.sql
  20250925_add_character_spell_columns.sql
  20250928_add_personality_background_alignment.sql
  20250930144357_add_avatar_url_to_characters.sql
  20251004_add_session_state_jsonb.sql
  20251006_add_roll_history.sql
  20251006_create_user_profiles.sql
  20251008_create_session_config.sql
  20251009_create_multiplayer_sessions.sql
  20251009_create_safety_audit_trail.sql
  20251009_create_world_fact_ledger.sql
  20251010_add_session_number_to_game_sessions.sql
  20251016_add_images_column_to_dialogue_history.sql
  20251017_create_blog_cms.sql
  20251018_add_campaign_id_and_style_config.sql
  20251018_backfill_character_campaign_ids.sql
  20251018_create_campaign_members_and_policies.sql
  20251018_enforce_campaign_id_not_null_on_characters.sql
  20251020_add_simulate_rls_for_user.sql
  20251020_adjust_simulate_rls_claims_order.sql
  20251020_fix_campaign_members_policies.sql
  20251023_add_public_campaign_templates.sql
  20251030_add_npc_physical_characteristics.sql
  20251103_01_cleanup_duplicate_sessions.sql
  20251103_02_add_session_constraints.sql
  20251103_03_create_session_archive_system.sql
  20251103_create_character_atomic_function.sql
  20251103151855_add_message_sequence_numbers.sql
  20251112_01_add_combat_system_unified.sql
  20251112_02_add_spell_slots.sql
  20251112_03_add_rest_system.sql
  20251112_04_add_inventory_system.sql
  20251112_05_add_progression_system.sql
  20251112_06_add_class_features.sql

Continue with migration test? (y/N) y


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running Migrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Resetting database and applying all migrations...

Applying migration 20240829_add_game_session_fields.sql...
Applying migration 20240903_enhance_memories_for_fiction.sql...
Applying migration 20250905_add_background_image_to_campaigns.sql...
...
Applying migration 20251112_06_add_class_features.sql...

✓ All migrations applied successfully


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating table existence...
✓ Table exists: characters
✓ Table exists: game_sessions
✓ Table exists: campaigns
✓ Table exists: combat_encounters
✓ Table exists: combat_participants
✓ Table exists: combat_participant_status
✓ Table exists: combat_participant_conditions
✓ Table exists: conditions_library
✓ Table exists: character_spell_slots
✓ Table exists: rest_history
✓ Table exists: character_inventory
✓ Table exists: class_features_library
✓ Table exists: character_features
✓ Table exists: character_subclasses


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Column Type Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating critical column types...
✓ characters.current_hp is INTEGER
✓ combat_encounters.current_round is INTEGER
✓ character_spell_slots has required spell level columns


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Foreign Key Constraint Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating foreign key constraints...
✓ Foreign key: combat_participants.encounter_id -> combat_encounters.id
✓ Foreign key: character_features.character_id -> characters.id
✓ Foreign key: character_spell_slots.character_id -> characters.id


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Index Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating critical indexes...
✓ Index exists on combat_participants.encounter_id
✓ Index exists on character_features.character_id


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unique Constraint Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating unique constraints...
✓ Unique constraint exists on character_spell_slots
✓ Unique constraint exists on character_subclasses


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sample Data Insertion Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing basic data insertion and constraints...
✓ Campaign insertion successful
✓ Character insertion successful
✓ Spell slots insertion successful
✓ Game session insertion successful
✓ Conditions library seeded (found 13 conditions)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cascade Delete Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing cascade delete relationships...
✓ Cascade delete: combat_participants deleted with encounter


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unique Constraint Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing unique constraint enforcement...
✓ Unique constraint enforced on character_spell_slots.character_id


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check Constraint Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing check constraint enforcement...
✓ Check constraint enforced: death_saves_successes <= 3


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Relationship Query Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing JOIN queries across relationships...
✓ JOIN query works: characters -> campaigns
✓ JOIN query works: characters -> character_spell_slots


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Performance Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Testing query performance on indexed columns...
✓ Index being used for combat_participants.encounter_id query


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Cleaning up test data...
✓ Test data cleaned up


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 35
Passed: 35
Failed: 0

╔════════════════════════════════════════════╗
║   ALL MIGRATION TESTS PASSED! ✓            ║
╚════════════════════════════════════════════╝
```

## Failed Test Example

When a test fails, you'll see detailed error information:

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating table existence...
✓ Table exists: characters
✗ Table missing: combat_encounters
✓ Table exists: campaigns
...


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Foreign Key Constraint Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Validating foreign key constraints...
✗ Missing FK: combat_participants.encounter_id
...


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 35
Passed: 28
Failed: 7

╔════════════════════════════════════════════╗
║   SOME TESTS FAILED                        ║
╚════════════════════════════════════════════╝

Review the errors above and:
1. Check migration file syntax
2. Verify foreign key references
3. Review constraint definitions
4. Check for missing indexes
```

## Migration Application Failure

If a migration fails to apply, you'll see the SQL error:

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running Migrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Resetting database and applying all migrations...

Applying migration 20251112_01_add_combat_system_unified.sql...
ERROR: relation "game_sessions" does not exist
LINE 28:   session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
                                                 ^

✗ Migration application failed

Error details:
psql:/home/user/project/supabase/migrations/20251112_01_add_combat_system_unified.sql:28:
ERROR: relation "game_sessions" does not exist
LINE 28:   session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
```

## CI/CD Output

In CI/CD environments, the script runs non-interactively:

```bash
$ CI=true npm run test:migrations

╔════════════════════════════════════════════╗
║   DATABASE MIGRATION TEST SUITE            ║
╚════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pre-flight Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Supabase CLI found
✓ Project directory structure valid
✓ Found 51 migration files
✓ Supabase is running

[... tests run automatically without prompts ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 35
Passed: 35
Failed: 0

╔════════════════════════════════════════════╗
║   ALL MIGRATION TESTS PASSED! ✓            ║
╚════════════════════════════════════════════╝
```

## Next Steps

After reviewing test output:

1. **All tests passed**: Your migrations are ready for production deployment
2. **Some tests failed**: Review the specific failures and fix the migrations
3. **Migration application failed**: Fix SQL errors in the failing migration

See the [MIGRATIONS.md](./MIGRATIONS.md) troubleshooting section for detailed guidance on fixing specific types of failures.
