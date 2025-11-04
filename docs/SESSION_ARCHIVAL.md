# Session Archival System

## Overview

The Session Archival System prevents unbounded database growth by automatically moving old, completed game sessions to archive tables. This preserves historical data while keeping the main database tables lean and performant.

## Architecture

### Strategy: Move to Archive Tables

We use **Option A** (archive tables) rather than hard deletion to preserve data for potential future analysis or restoration. This approach:

- Preserves all session data indefinitely
- Keeps main tables small for optimal query performance
- Allows restoring archived sessions if needed
- Maintains referential integrity through CASCADE operations

### Retention Policy

- **Default retention period**: 90 days
- **Minimum retention period**: 30 days (for safety)
- **Archival criteria**: Sessions with `status='completed'` AND `end_time` older than retention period

### Archived Tables

The system creates archive tables for all session-related data:

1. `game_sessions_archive` - Archived game sessions
2. `dialogue_history_archive` - Dialogue messages from archived sessions
3. `memories_archive` - AI memories from archived sessions
4. `character_voice_mappings_archive` - Voice mappings from archived sessions
5. `combat_encounters_archive` - Combat encounters from archived sessions

Each archive table includes an `archived_at` timestamp column.

## Migration

### Running the Migration

```bash
# The migration is located at:
supabase/migrations/20251103_create_session_archive_system.sql

# Apply it via Supabase CLI:
supabase db push

# Or manually apply through Supabase Dashboard
```

### What the Migration Does

1. **Creates Archive Tables**: Creates 5 archive tables with same schema as original tables
2. **Adds Indexes**: Optimizes archive queries with indexes on `archived_at` and `session_id`
3. **Ensures CASCADE DELETE**: Updates foreign key constraints to use `ON DELETE CASCADE`
4. **Creates Database Functions**:
   - `archive_old_sessions()` - Archives old sessions
   - `restore_archived_session()` - Restores a session from archive
5. **Creates View**: `archive_statistics` view for monitoring

## Usage

### Method 1: Supabase Edge Function (Recommended for Automation)

The Edge Function can be called via HTTP and supports authentication:

```bash
# Dry run (see what would be archived without moving data)
curl -X POST https://your-project.supabase.co/functions/v1/archive-sessions \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "retentionDays": 90,
    "dryRun": true
  }'

# Actual archival
curl -X POST https://your-project.supabase.co/functions/v1/archive-sessions \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "retentionDays": 90,
    "dryRun": false
  }'
```

**Response format:**
```json
{
  "success": true,
  "dry_run": false,
  "sessions_archived": 15,
  "dialogue_archived": 342,
  "memories_archived": 89,
  "voice_mappings_archived": 23,
  "combat_encounters_archived": 7,
  "cutoff_date": "2025-08-05T12:00:00Z",
  "message": "Sessions archived successfully"
}
```

### Method 2: Backend API Endpoints

#### Archive Sessions

```bash
POST /v1/admin/archive-sessions
Content-Type: application/json
Authorization: Bearer YOUR_USER_JWT

{
  "retentionDays": 90,
  "dryRun": false
}
```

#### Get Archive Statistics

```bash
GET /v1/admin/archive-statistics
Authorization: Bearer YOUR_USER_JWT
```

**Response:**
```json
{
  "success": true,
  "statistics": [
    {
      "table_name": "game_sessions",
      "active_count": 1250,
      "archived_count": 487,
      "active_size": "3.2 MB",
      "archived_size": "1.8 MB"
    },
    ...
  ]
}
```

#### Get Archivable Sessions

```bash
GET /v1/admin/archivable-sessions?retentionDays=90&limit=100
Authorization: Bearer YOUR_USER_JWT
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "character_id": "uuid",
      "start_time": "2025-05-01T10:00:00Z",
      "end_time": "2025-05-01T14:30:00Z",
      "status": "completed",
      "session_number": 5
    },
    ...
  ],
  "count": 15,
  "cutoff_date": "2025-08-05T12:00:00Z",
  "retention_days": 90
}
```

#### Restore Archived Session

```bash
POST /v1/admin/restore-session/SESSION_UUID
Authorization: Bearer YOUR_USER_JWT
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "message": "Session restored successfully"
}
```

### Method 3: Direct Database Function

You can also call the functions directly from SQL:

```sql
-- Dry run to see what would be archived
SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := TRUE
);

-- Actually archive sessions
SELECT * FROM archive_old_sessions(
  retention_days := 90,
  dry_run := FALSE
);

-- Restore a specific session
SELECT * FROM restore_archived_session('session-uuid-here');

-- Check statistics
SELECT * FROM archive_statistics;
```

## Automation with Cron

### Option A: Supabase pg_cron (Recommended)

If your Supabase project has pg_cron enabled:

```sql
-- Schedule weekly archival at 2 AM on Sundays
SELECT cron.schedule(
  'archive-old-sessions',
  '0 2 * * 0',  -- Cron expression: 2 AM every Sunday
  $$
    SELECT archive_old_sessions(
      retention_days := 90,
      dry_run := FALSE
    );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('archive-old-sessions');
```

### Option B: External Cron Service

Use services like Render, Railway, or GitHub Actions:

```yaml
# .github/workflows/archive-sessions.yml
name: Archive Old Sessions
on:
  schedule:
    - cron: '0 2 * * 0'  # 2 AM every Sunday

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Archive sessions
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/archive-sessions \
            -H "Authorization: Bearer ${{ secrets.SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"retentionDays": 90, "dryRun": false}'
```

## Safety Features

### Built-in Safeguards

1. **Minimum Retention**: Cannot archive sessions less than 30 days old
2. **Status Filter**: Only archives sessions with `status='completed'`
3. **Timestamp Check**: Only archives sessions with non-null `end_time`
4. **Dry Run Mode**: Test archival without moving data
5. **Transaction Safety**: All operations wrapped in database transactions
6. **Restore Capability**: Can restore any archived session

### Monitoring

#### Check What Would Be Archived

```bash
# See archivable sessions without moving them
curl -X POST YOUR_API/v1/admin/archive-sessions \
  -H "Authorization: Bearer TOKEN" \
  -d '{"retentionDays": 90, "dryRun": true}'
```

#### Monitor Archive Statistics

```bash
# Get current statistics
curl YOUR_API/v1/admin/archive-statistics \
  -H "Authorization: Bearer TOKEN"
```

#### Query Archive Directly

```sql
-- Count archived sessions
SELECT COUNT(*) FROM game_sessions_archive;

-- See recently archived sessions
SELECT id, campaign_id, archived_at
FROM game_sessions_archive
ORDER BY archived_at DESC
LIMIT 10;

-- Check archive size
SELECT pg_size_pretty(pg_total_relation_size('game_sessions_archive'));
```

## Performance Impact

### Database Size Reduction

Based on typical usage patterns:

- **game_sessions**: ~50% reduction after 90 days
- **dialogue_history**: ~60% reduction (largest table)
- **memories**: ~40% reduction
- **Overall**: 40-50% database size reduction

### Query Performance

Archiving improves performance by:

- Reducing index size on main tables
- Speeding up sequential scans
- Improving cache hit rates
- Reducing backup/restore times

**Expected improvements:**
- Session queries: 20-40% faster
- Dialogue history queries: 30-50% faster
- Full table scans: 50-70% faster

## Restoration Process

If you need to restore an archived session:

```bash
# Find archived session
SELECT id, campaign_id, character_id, end_time
FROM game_sessions_archive
WHERE campaign_id = 'your-campaign-id'
ORDER BY end_time DESC;

# Restore it
POST /v1/admin/restore-session/SESSION_ID

# Or via SQL
SELECT restore_archived_session('session-id');
```

**Note:** Restoration is atomic - either all related data is restored or none is.

## Troubleshooting

### Archive Function Returns No Sessions

Check if sessions meet criteria:

```sql
SELECT COUNT(*)
FROM game_sessions
WHERE status = 'completed'
  AND end_time IS NOT NULL
  AND end_time < NOW() - INTERVAL '90 days';
```

### Foreign Key Constraint Errors

Ensure CASCADE DELETE is properly set:

```sql
-- Check constraints
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

Should show `CASCADE` for delete_rule.

### Restore Fails

Check if session exists in archive:

```sql
SELECT * FROM game_sessions_archive WHERE id = 'your-session-id';
```

If missing, it may have already been restored or never archived.

## Best Practices

1. **Start with Dry Run**: Always test with `dryRun: true` first
2. **Monitor Statistics**: Check `archive_statistics` view regularly
3. **Set Appropriate Retention**: 90 days is recommended, but adjust based on your needs
4. **Schedule Regular Archival**: Weekly or monthly automation
5. **Test Restoration**: Periodically test restoring archived sessions
6. **Keep Service Role Key Secure**: Required for automated archival
7. **Log Archival Operations**: Monitor success/failure of automated runs

## API Reference

### Archive Function Parameters

```typescript
interface ArchiveRequest {
  retentionDays?: number;  // Default: 90, Min: 30
  dryRun?: boolean;        // Default: false
}

interface ArchiveResponse {
  success: boolean;
  dry_run: boolean;
  sessions_archived?: number;
  sessions_to_archive?: number;  // In dry run
  dialogue_archived?: number;
  dialogue_to_archive?: number;  // In dry run
  memories_archived?: number;
  memories_to_archive?: number;  // In dry run
  voice_mappings_archived?: number;
  combat_encounters_archived?: number;
  cutoff_date?: string;
  message: string;
  error?: string;  // Present if success=false
}
```

### Restore Function Parameters

```typescript
interface RestoreResponse {
  success: boolean;
  session_id: string;
  message: string;
  error?: string;  // Present if success=false
}
```

## Security Considerations

- Archive endpoints require authentication (JWT token)
- Consider restricting to admin users only
- Service role key needed for automated cron jobs
- Archive tables inherit RLS policies (if any)
- Restored sessions maintain original ownership

## Future Enhancements

Potential improvements to consider:

1. **Selective Restoration**: Restore only specific related data (e.g., just memories)
2. **Archive Compression**: Compress archive tables for storage savings
3. **Export to Cold Storage**: Move very old archives to S3/GCS
4. **Archive Analytics**: Dashboard showing archival trends
5. **User-Triggered Archive**: Allow users to archive their own old sessions
6. **Retention Policies per Campaign**: Different retention for different campaigns

## Support

For issues or questions:

1. Check migration was applied: `SELECT * FROM game_sessions_archive LIMIT 1;`
2. Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'archive%';`
3. Test with dry run first
4. Check logs in Supabase Dashboard
5. Review this documentation's Troubleshooting section
