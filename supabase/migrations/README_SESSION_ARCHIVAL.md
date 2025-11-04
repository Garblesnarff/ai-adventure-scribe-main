# Session Archival System Migration

## Quick Start

This migration implements a comprehensive session archival system to prevent unbounded database growth.

### Apply Migration

```bash
# Via Supabase CLI
supabase db push

# Or manually apply through Supabase Dashboard
# Upload: 20251103_create_session_archive_system.sql
```

### Test It

```sql
-- 1. Dry run to see what would be archived
SELECT * FROM archive_old_sessions(90, TRUE);

-- 2. Check statistics
SELECT * FROM archive_statistics;

-- 3. Actually archive (when ready)
SELECT * FROM archive_old_sessions(90, FALSE);
```

## What This Migration Creates

### Archive Tables (5 tables)

1. **game_sessions_archive** - Archived game sessions
2. **dialogue_history_archive** - Archived dialogue messages
3. **memories_archive** - Archived AI memories
4. **character_voice_mappings_archive** - Archived voice mappings
5. **combat_encounters_archive** - Archived combat encounters

All include an `archived_at TIMESTAMPTZ` column.

### Database Functions (2 functions)

1. **archive_old_sessions(retention_days, dry_run)**
   - Archives sessions older than retention period
   - Safe: Only archives completed sessions
   - Atomic: Transaction-based, all-or-nothing

2. **restore_archived_session(session_id)**
   - Restores a session from archive
   - Moves all related data back to main tables

### View (1 view)

- **archive_statistics** - Real-time statistics on active vs archived data

### Foreign Key Updates

Ensures all session-related tables use `ON DELETE CASCADE`:
- dialogue_history
- memories (already done in previous migration)
- character_voice_mappings
- combat_encounters

## Usage Examples

### Archive Old Sessions

```sql
-- See what would be archived (safe, no changes)
SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := TRUE
);

-- Actually archive
SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := FALSE
);
```

**Example Output:**
```json
{
  "success": true,
  "dry_run": false,
  "sessions_archived": 15,
  "dialogue_archived": 342,
  "memories_archived": 89,
  "voice_mappings_archived": 23,
  "combat_encounters_archived": 7,
  "cutoff_date": "2025-08-05T12:00:00.000Z",
  "message": "Sessions archived successfully"
}
```

### Check Statistics

```sql
SELECT * FROM archive_statistics;
```

**Example Output:**
```
table_name              | active_count | archived_count | active_size | archived_size
------------------------+--------------+----------------+-------------+--------------
game_sessions           |         1250 |            487 | 3.2 MB      | 1.8 MB
dialogue_history        |        45230 |          28945 | 45 MB       | 32 MB
memories                |         8920 |           4567 | 12 MB       | 8 MB
character_voice_mappings|          342 |            189 | 256 kB      | 128 kB
combat_encounters       |          156 |             89 | 512 kB      | 256 kB
```

### Restore Archived Session

```sql
-- Find archived session
SELECT id, campaign_id, end_time, archived_at
FROM game_sessions_archive
WHERE campaign_id = 'your-campaign-id'
ORDER BY end_time DESC
LIMIT 10;

-- Restore it
SELECT * FROM restore_archived_session('session-id-here');
```

## Safety Features

### What Gets Archived

Only sessions matching **ALL** criteria:
- ✅ `status = 'completed'`
- ✅ `end_time IS NOT NULL`
- ✅ `end_time < NOW() - retention_days`
- ✅ `retention_days >= 30` (minimum safety)

### What Doesn't Get Archived

- ❌ Active sessions (`status = 'active'`)
- ❌ Sessions without end_time
- ❌ Sessions less than 30 days old (minimum)
- ❌ Sessions within retention period

### Transaction Safety

All operations are wrapped in database transactions:
- If any step fails, entire operation rolls back
- No partial archives or restorations
- Data consistency guaranteed

## Automation

### Option 1: Supabase pg_cron

```sql
-- Schedule weekly archival at 2 AM Sundays
SELECT cron.schedule(
  'archive-old-sessions',
  '0 2 * * 0',
  $$
    SELECT archive_old_sessions(90, FALSE);
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

### Option 2: External Cron

Call the Edge Function or API endpoint from your scheduler:

```bash
# Via Edge Function
curl -X POST https://PROJECT.supabase.co/functions/v1/archive-sessions \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{"retentionDays": 90, "dryRun": false}'

# Via API endpoint
curl -X POST https://your-api.com/v1/admin/archive-sessions \
  -H "Authorization: Bearer USER_JWT" \
  -d '{"retentionDays": 90, "dryRun": false}'
```

## Monitoring

### Check Archive Health

```sql
-- How many sessions are eligible for archival?
SELECT COUNT(*)
FROM game_sessions
WHERE status = 'completed'
  AND end_time IS NOT NULL
  AND end_time < NOW() - INTERVAL '90 days';

-- When was last archival?
SELECT MAX(archived_at) as last_archival
FROM game_sessions_archive;

-- Archive growth rate
SELECT
  DATE_TRUNC('month', archived_at) as month,
  COUNT(*) as sessions_archived
FROM game_sessions_archive
GROUP BY month
ORDER BY month DESC
LIMIT 6;
```

### Performance Monitoring

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE '%session%' OR tablename LIKE '%archive%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS size
FROM pg_indexes
WHERE tablename LIKE '%archive%'
ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC;
```

## Rollback

If you need to undo this migration:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS archive_old_sessions(INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS restore_archived_session(UUID);

-- Drop view
DROP VIEW IF EXISTS archive_statistics;

-- Drop archive tables (WARNING: deletes archived data!)
DROP TABLE IF EXISTS combat_encounters_archive;
DROP TABLE IF EXISTS character_voice_mappings_archive;
DROP TABLE IF EXISTS memories_archive;
DROP TABLE IF EXISTS dialogue_history_archive;
DROP TABLE IF EXISTS game_sessions_archive;
```

⚠️ **Warning**: Dropping archive tables permanently deletes all archived data!

## Troubleshooting

### "No sessions eligible for archival"

```sql
-- Check if sessions exist at all
SELECT COUNT(*) FROM game_sessions WHERE status = 'completed';

-- Check their ages
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN end_time < NOW() - INTERVAL '90 days' THEN 1 END) as old_enough,
  MIN(end_time) as oldest,
  MAX(end_time) as newest
FROM game_sessions
WHERE status = 'completed' AND end_time IS NOT NULL;
```

### Archive function fails

```sql
-- Check if tables exist
SELECT tablename
FROM pg_tables
WHERE tablename LIKE '%archive%';

-- Check if functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE 'archive%';

-- Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'game_sessions';
```

Expected: All should show `delete_rule = 'CASCADE'`

### Restore fails

```sql
-- Check if session exists in archive
SELECT * FROM game_sessions_archive WHERE id = 'session-id';

-- Check if it already exists in main table
SELECT * FROM game_sessions WHERE id = 'session-id';

-- If in both, it was restored but archive wasn't cleaned
DELETE FROM game_sessions_archive WHERE id = 'session-id';
DELETE FROM dialogue_history_archive WHERE session_id = 'session-id';
DELETE FROM memories_archive WHERE session_id = 'session-id';
DELETE FROM character_voice_mappings_archive WHERE session_id = 'session-id';
DELETE FROM combat_encounters_archive WHERE session_id = 'session-id';
```

## Testing Checklist

Before deploying to production:

- [ ] Run migration in staging/dev environment
- [ ] Test dry run: `SELECT archive_old_sessions(90, TRUE);`
- [ ] Check statistics: `SELECT * FROM archive_statistics;`
- [ ] Archive one session: Create old test session, archive it
- [ ] Restore that session: Verify all data restored correctly
- [ ] Check foreign keys: Verify CASCADE DELETE works
- [ ] Verify indexes exist on archive tables
- [ ] Test API endpoints (if using backend API)
- [ ] Test Edge Function (if using Supabase Functions)

## Performance Impact

Expected improvements after archival:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| game_sessions size | 5 MB | 2.5 MB | 50% |
| dialogue_history size | 60 MB | 24 MB | 60% |
| Query speed (session list) | 250ms | 100ms | 60% |
| Query speed (dialogue fetch) | 180ms | 60ms | 67% |
| Index size | 15 MB | 6 MB | 60% |

*Based on 90-day retention with typical usage patterns*

## Support

For more details, see the full documentation:
- `/docs/SESSION_ARCHIVAL.md` - Complete guide
- Supabase Edge Function: `/supabase/functions/archive-sessions/`
- Backend API: `/server/src/routes/v1/admin.ts`

Questions? Check the main documentation or reach out to the development team.
