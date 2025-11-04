# Manual Migration Application Guide

Since the Supabase MCP server requires authentication, you can apply the migrations manually using one of these methods:

## Option 1: Supabase CLI (Recommended)

```bash
cd /home/wonky/ai-adventure-scribe-main
./scripts/apply-all-migrations.sh
```

This script will apply all 5 migrations in the correct order.

## Option 2: Supabase Dashboard (SQL Editor)

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

Copy and paste each migration in order:

### Migration 1: Cleanup Duplicate Sessions (MUST RUN FIRST)
```sql
-- File: supabase/migrations/20251103_01_cleanup_duplicate_sessions.sql
UPDATE game_sessions
SET
  status = 'completed',
  end_time = COALESCE(end_time, NOW()),
  updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      campaign_id,
      character_id,
      start_time,
      ROW_NUMBER() OVER (
        PARTITION BY campaign_id, character_id
        ORDER BY start_time DESC, created_at DESC
      ) as row_num
    FROM game_sessions
    WHERE status = 'active'
  ) ranked_sessions
  WHERE row_num > 1
);
```

Click "Run" and wait for completion.

### Migration 2: Add Session Constraints
Open `supabase/migrations/20251103_02_add_session_constraints.sql`, copy entire contents, paste into SQL Editor, and run.

### Migration 3: Create Session Archive System
Open `supabase/migrations/20251103_03_create_session_archive_system.sql`, copy entire contents, paste into SQL Editor, and run.

### Migration 4: Create Character Atomic Function
Open `supabase/migrations/20251103_create_character_atomic_function.sql`, copy entire contents, paste into SQL Editor, and run.

### Migration 5: Add Message Sequence Numbers
Open `supabase/migrations/20251103151855_add_message_sequence_numbers.sql`, copy entire contents, paste into SQL Editor, and run.

## Option 3: psql Command Line

```bash
# Set your database connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Apply migrations in order
psql $DATABASE_URL -f supabase/migrations/20251103_01_cleanup_duplicate_sessions.sql
psql $DATABASE_URL -f supabase/migrations/20251103_02_add_session_constraints.sql
psql $DATABASE_URL -f supabase/migrations/20251103_03_create_session_archive_system.sql
psql $DATABASE_URL -f supabase/migrations/20251103_create_character_atomic_function.sql
psql $DATABASE_URL -f supabase/migrations/20251103151855_add_message_sequence_numbers.sql
```

## Verification After Migration

Run these queries in the SQL Editor to verify success:

```sql
-- Should return 0 rows (no duplicate active sessions)
SELECT campaign_id, character_id, COUNT(*) as active_count
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1;

-- Should show all new indexes
SELECT indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
AND schemaname = 'public'
ORDER BY indexname;

-- Should show 5 functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'create_character_atomic',
  'update_character_spells',
  'archive_old_sessions',
  'restore_archived_session',
  'get_next_message_sequence',
  'assign_message_sequence_number'
)
ORDER BY routine_name;

-- Should show 5 archive tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%_archive'
ORDER BY table_name;
```

Expected results:
- 0 duplicate sessions
- ~10+ indexes created
- 6 functions created
- 5 archive tables created

## Troubleshooting

### Error: "duplicate key violates unique constraint"
This means there are still duplicate active sessions. Run migration 1 again.

### Error: "relation does not exist"
Check that the table names in the migrations match your actual schema.

### Error: "function already exists"
This is safe to ignore - the migrations use `CREATE OR REPLACE` so they're idempotent.

## Configuration for Supabase MCP

If you want to use the Supabase MCP server for future migrations, set the access token:

```bash
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
```

Or add it to your MCP server configuration.
