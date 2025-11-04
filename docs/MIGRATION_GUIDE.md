# Database Optimizations - Migration Guide

**Last Updated:** November 3, 2025
**Estimated Time:** 30-60 minutes
**Recommended Environment:** Staging first, then production

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Verification Procedures](#verification-procedures)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Migration Testing](#post-migration-testing)

---

## Overview

This guide provides step-by-step instructions to apply all database optimizations from Units 1-12. The migrations are organized into phases that must be executed in order.

### What Will Change

**Backend Code:**
- Spell validation logic (N+1 query fixes)
- Character spell loading logic
- Admin API endpoints added

**Database:**
- New unique constraints
- New performance indexes
- Archive tables created
- Database functions created

**Frontend:**
- IndexedDB auto-cleanup
- Optional debug UI components

### Migration Order

**Important:** Execute in this exact order to avoid conflicts.

```
Phase 1: Query Optimizations (Code changes)
Phase 2: Database Cleanup (Required before constraints)
Phase 3: Database Constraints (Prevents duplicates)
Phase 4: Archival System (Prevents growth)
Phase 5: Client-Side Cleanup (Browser storage)
Phase 6: Backend APIs (Admin endpoints)
```

---

## Prerequisites

### Required Access

- [x] Supabase project access (SQL Editor permissions)
- [x] Git repository access
- [x] Node.js/npm installed locally
- [x] Environment variables configured

### Required Knowledge

- [x] Basic SQL understanding
- [x] Familiarity with Supabase dashboard
- [x] Understanding of git operations
- [x] Basic command-line usage

### Backup Recommendations

**Critical:** Take database backup before starting:

```bash
# If using Supabase CLI
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase dashboard
# Project Settings → Database → Backup & Restore → Create Backup
```

---

## Pre-Migration Checklist

### 1. Check Current State

```bash
# Verify you're on the correct branch
git status

# Check for uncommitted changes
git diff

# Ensure all dependencies installed
npm install
cd server && npm install
```

### 2. Test Current Functionality

**Critical paths to test:**
- [ ] Character creation
- [ ] Spell selection and validation
- [ ] Starting a game session
- [ ] Loading existing sessions
- [ ] Message history display

### 3. Review Database State

Run these queries in Supabase SQL Editor:

```sql
-- Check for duplicate active sessions
SELECT campaign_id, character_id, COUNT(*) as active_count
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1;
-- Note the count for later comparison

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
-- Note sizes for game_sessions, dialogue_history

-- Check old session count
SELECT COUNT(*)
FROM game_sessions
WHERE status = 'completed'
  AND end_time IS NOT NULL
  AND end_time < NOW() - INTERVAL '90 days';
-- Note count of archivable sessions
```

### 4. Notify Stakeholders

If running in production:
- [ ] Schedule maintenance window (optional, can be zero-downtime)
- [ ] Notify users of potential brief slowness during migration
- [ ] Have rollback plan ready
- [ ] Coordinate with team members

---

## Migration Steps

### Phase 1: Query Optimizations (Units 2-3)

**Estimated Time:** 5 minutes
**Downtime Required:** None
**Rollback:** Git revert

These changes are already in your codebase. Verify they're working:

#### Step 1.1: Build Backend

```bash
cd /home/wonky/ai-adventure-scribe-main
npm run server:build
```

**Expected Output:**
```
> infinite-realms@0.0.0 server:build
> tsc -p server/tsconfig.json

✓ Compilation successful
```

**Troubleshooting:**
- If TypeScript errors occur, review the error messages
- Ensure `server/src/routes/v1/characters.ts` has the optimized code
- Check that all imports are correct

#### Step 1.2: Test Backend

```bash
npm run server:start
```

In another terminal:
```bash
# Test spell validation endpoint (replace with valid IDs)
curl -X POST http://localhost:8888/v1/characters/CHAR_ID/spells \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spells": ["spell-id-1", "spell-id-2"],
    "className": "Wizard"
  }'
```

**Expected:** Should complete in < 200ms (check server logs)

#### Step 1.3: Verify Query Count

Enable Supabase query logging:
1. Go to Supabase Dashboard → Project Settings → Database → Query Performance
2. Make a spell validation request
3. Confirm only 1-2 queries executed (not 6+ queries)

**Verification Checklist:**
- [ ] Backend builds without errors
- [ ] Spell validation endpoint works
- [ ] Character spell loading endpoint works
- [ ] Response times improved (check logs)
- [ ] No breaking changes in API responses

---

### Phase 2: Database Cleanup (Unit 5)

**Estimated Time:** 1-5 minutes (depends on duplicate count)
**Downtime Required:** None (updates non-blocking)
**Rollback:** Data changes are permanent (but safe)

**Important:** This MUST run before Phase 3 (constraints).

#### Step 2.1: Review Duplicates

```sql
-- Check current duplicate count
SELECT campaign_id, character_id, COUNT(*) as active_count
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1
ORDER BY active_count DESC;
```

**Note:** Record the total number of rows. These will be marked as 'completed'.

#### Step 2.2: Apply Cleanup Migration

**Via Supabase Dashboard:**

1. Go to: SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of: `/home/wonky/ai-adventure-scribe-main/supabase/migrations/20251103_cleanup_duplicate_sessions.sql`
4. Paste into editor
5. Click "Run"

**Via Supabase CLI (if installed):**

```bash
supabase db push --file supabase/migrations/20251103_cleanup_duplicate_sessions.sql
```

**Expected Output:**
```
UPDATE X  -- X = number of duplicate sessions cleaned up
```

#### Step 2.3: Verify Cleanup

```sql
-- Should return 0 rows now
SELECT campaign_id, character_id, COUNT(*) as active_count
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1;
```

**Expected:** 0 rows (no more duplicates)

**Verification Checklist:**
- [ ] Cleanup migration executed successfully
- [ ] No duplicate active sessions remain
- [ ] Sessions still exist (just marked as 'completed')
- [ ] Most recent session per campaign+character is still 'active'

---

### Phase 3: Database Constraints (Unit 4)

**Estimated Time:** 1-2 minutes
**Downtime Required:** None
**Rollback:** Drop indexes (reversible)

**Important:** Only run this AFTER Phase 2 cleanup is complete.

#### Step 3.1: Apply Constraints Migration

**Via Supabase Dashboard:**

1. Go to: SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of: `/home/wonky/ai-adventure-scribe-main/supabase/migrations/20251103_add_session_constraints.sql`
4. Paste into editor
5. Click "Run"

**Via Supabase CLI:**

```bash
supabase db push --file supabase/migrations/20251103_add_session_constraints.sql
```

**Expected Output:**
```
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
```

#### Step 3.2: Test Constraint

Try to create a duplicate active session (should fail):

```sql
-- Get an existing active session
SELECT campaign_id, character_id
FROM game_sessions
WHERE status = 'active'
LIMIT 1;

-- Try to create duplicate (should FAIL)
INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
VALUES (
  'campaign-id-from-above',
  'character-id-from-above',
  999,
  'active',
  NOW()
);
```

**Expected Error:**
```
ERROR: duplicate key value violates unique constraint "idx_active_session_per_character"
```

#### Step 3.3: Verify Indexes

```sql
-- List all new indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('game_sessions', 'dialogue_history', 'character_spells')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected:** Should see:
- `idx_active_session_per_character`
- `idx_game_sessions_status`
- `idx_dialogue_history_session_speaker`
- `idx_character_spells_spell_id`

**Verification Checklist:**
- [ ] Constraints migration executed successfully
- [ ] Unique constraint prevents duplicate active sessions
- [ ] All performance indexes created
- [ ] Completed sessions can still duplicate (test this)
- [ ] Application handles constraint errors gracefully

---

### Phase 4: Archival System (Units 6-7)

**Estimated Time:** 2-5 minutes
**Downtime Required:** None
**Rollback:** Drop tables/functions (reversible)

#### Step 4.1: Apply Archival Migration

**Via Supabase Dashboard:**

1. Go to: SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of: `/home/wonky/ai-adventure-scribe-main/supabase/migrations/20251103_create_session_archive_system.sql`
4. Paste into editor
5. Click "Run"

**Via Supabase CLI:**

```bash
supabase db push --file supabase/migrations/20251103_create_session_archive_system.sql
```

**Expected Output:**
```
CREATE TABLE (×5)
CREATE INDEX (×10)
CREATE FUNCTION (×2)
CREATE VIEW (×1)
```

#### Step 4.2: Test Dry Run

```sql
-- Test archival with dry run (no changes made)
SELECT * FROM archive_old_sessions(90, TRUE);
```

**Expected Output:**
```json
{
  "success": true,
  "dry_run": true,
  "sessions_to_archive": X,
  "dialogue_entries": Y,
  "memories": Z,
  ...
}
```

**Note:** If `sessions_to_archive` is 0, no sessions meet the 90-day criteria yet (normal for new installations).

#### Step 4.3: View Statistics

```sql
SELECT * FROM archive_statistics;
```

**Expected Output:**
```
active_sessions: X
archived_sessions: 0 (initially)
active_dialogue_entries: Y
...
```

#### Step 4.4: Deploy Edge Function (Optional)

If you want HTTP access to archival:

```bash
# Deploy the Edge Function
supabase functions deploy archive-sessions

# Test the endpoint
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/archive-sessions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 90, "dryRun": true}'
```

#### Step 4.5: Set Up Automation (Optional)

**Option A: Using pg_cron (if enabled)**

```sql
-- Schedule weekly archival at 2 AM Sunday
SELECT cron.schedule(
  'archive-old-sessions',
  '0 2 * * 0',  -- Cron syntax: minute hour day month weekday
  $$ SELECT archive_old_sessions(90, FALSE); $$
);

-- Verify cron job created
SELECT * FROM cron.job;
```

**Option B: Using GitHub Actions**

Create `.github/workflows/archive-sessions.yml`:

```yaml
name: Archive Old Sessions
on:
  schedule:
    - cron: '0 2 * * 0'  # 2 AM every Sunday
  workflow_dispatch:  # Allow manual trigger

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Archive sessions
        run: |
          curl -X POST ${{ secrets.API_URL }}/v1/admin/archive-sessions \
            -H "Authorization: Bearer ${{ secrets.SERVICE_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"retentionDays": 90, "dryRun": false}'
```

**Verification Checklist:**
- [ ] Archive tables created
- [ ] Archive functions work
- [ ] Dry run returns expected results
- [ ] Statistics view shows correct data
- [ ] Edge Function deployed (if using)
- [ ] Automation scheduled (if using)

---

### Phase 5: Client-Side Cleanup (Unit 8)

**Estimated Time:** 1 minute
**Downtime Required:** None
**Rollback:** Code revert

This is already in your codebase. Just verify it's working:

#### Step 5.1: Verify Configuration

Check `/home/wonky/ai-adventure-scribe-main/src/agents/messaging/services/storage/config/StorageConfig.ts`:

```typescript
cleanup: {
  maxMessageAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  checkIntervalMs: 6 * 60 * 60 * 1000,  // 6 hours
}
```

Adjust if needed for your use case.

#### Step 5.2: Test in Browser

1. Open the application
2. Open Browser DevTools → Console
3. Run:

```javascript
const service = window.IndexedDBService?.getInstance();
if (service) {
  const stats = await service.getCleanupStats();
  console.log('Cleanup stats:', stats);

  // Test manual cleanup
  const deleted = await service.manualCleanup();
  console.log('Deleted messages:', deleted);
}
```

#### Step 5.3: Verify Auto-Cleanup

1. Use the application to generate messages
2. Wait for cleanup interval (6 hours) or manually trigger
3. Check IndexedDB in DevTools → Application → IndexedDB → agentMessaging → messages
4. Verify old messages are removed

**Verification Checklist:**
- [ ] Cleanup configuration exists
- [ ] `getCleanupStats()` returns valid data
- [ ] `manualCleanup()` works
- [ ] Messages older than 24 hours are removed
- [ ] Pending/failed messages are preserved

---

### Phase 6: Backend APIs (Units 9-10)

**Estimated Time:** 5 minutes
**Downtime Required:** None
**Rollback:** Code revert

#### Step 6.1: Register Admin Routes

Verify `/home/wonky/ai-adventure-scribe-main/server/src/routes/index.ts` includes:

```typescript
import adminRoutes from './v1/admin';
router.use('/v1/admin', adminRoutes);
```

#### Step 6.2: Build and Start Backend

```bash
npm run server:build
npm run server:start
```

#### Step 6.3: Test Admin Endpoints

```bash
# Get archival statistics
curl http://localhost:8888/v1/admin/archive-statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# List archivable sessions
curl http://localhost:8888/v1/admin/archivable-sessions?retentionDays=90 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test dry run archival
curl -X POST http://localhost:8888/v1/admin/archive-sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 90, "dryRun": true}'
```

**Expected:** JSON responses with archival data

**Verification Checklist:**
- [ ] Admin routes registered
- [ ] Endpoints respond correctly
- [ ] Authentication required
- [ ] Dry run mode works
- [ ] Statistics endpoint works

---

## Verification Procedures

### End-to-End Tests

Run these tests to verify everything works:

#### Test 1: Character Creation with Spells

```bash
# Create character and select spells
# Should complete in < 500ms total
curl -X POST http://localhost:8888/v1/characters/CHAR_ID/spells \
  -H "Authorization: Bearer TOKEN" \
  -d '{"spells": ["id1", "id2", "id3", "id4", "id5", "id6"], "className": "Wizard"}'
```

**Expected:**
- Fast response (< 200ms)
- Only 1-2 database queries
- Spell validation works correctly

#### Test 2: Session Creation

```bash
# Create session
curl -X POST http://localhost:8888/v1/game-sessions \
  -H "Authorization: Bearer TOKEN" \
  -d '{"campaignId": "...", "characterId": "..."}'

# Try creating duplicate (should fail or return existing)
curl -X POST http://localhost:8888/v1/game-sessions \
  -H "Authorization: Bearer TOKEN" \
  -d '{"campaignId": "...", "characterId": "..."}'
```

**Expected:**
- First request creates session
- Second request either fails or returns existing session

#### Test 3: Archival System

```sql
-- Dry run archival
SELECT * FROM archive_old_sessions(90, TRUE);

-- Check statistics
SELECT * FROM archive_statistics;

-- If sessions are eligible, archive them
SELECT * FROM archive_old_sessions(90, FALSE);
```

**Expected:**
- Dry run shows what would be archived
- Actual archival moves data to archive tables
- Statistics update correctly

#### Test 4: IndexedDB Cleanup

```javascript
// Browser console
const service = IndexedDBService.getInstance();

// Check stats
const stats = await service.getCleanupStats();
console.log(stats);

// Manual cleanup
const deleted = await service.manualCleanup(1 * 60 * 60 * 1000); // 1 hour
console.log(`Deleted ${deleted} messages`);
```

**Expected:**
- Stats show last cleanup time
- Manual cleanup removes old messages
- Pending/failed messages preserved

### Performance Verification

Before/after comparison:

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM game_sessions WHERE status = 'active';

EXPLAIN ANALYZE
SELECT * FROM dialogue_history
WHERE session_id = 'some-id' AND speaker_type = 'player';
```

**Expected:** Query times should show improvement (especially for large tables)

---

## Rollback Procedures

### Phase 1: Query Optimizations

```bash
# Revert code changes
git revert COMMIT_HASH

# Rebuild
npm run server:build
npm run server:start
```

### Phase 2-3: Database Constraints

```sql
-- Drop unique constraint
DROP INDEX IF EXISTS idx_active_session_per_character;

-- Drop performance indexes
DROP INDEX IF EXISTS idx_game_sessions_status;
DROP INDEX IF EXISTS idx_dialogue_history_session_speaker;
DROP INDEX IF EXISTS idx_character_spells_spell_id;
```

**Note:** Duplicate sessions marked as 'completed' will NOT revert (data is safe).

### Phase 4: Archival System

```sql
-- Drop functions
DROP FUNCTION IF EXISTS archive_old_sessions(integer, boolean);
DROP FUNCTION IF EXISTS restore_archived_session(uuid);

-- Drop view
DROP VIEW IF EXISTS archive_statistics;

-- Drop tables (only if you want to remove archived data)
DROP TABLE IF EXISTS combat_encounters_archive;
DROP TABLE IF EXISTS character_voice_mappings_archive;
DROP TABLE IF EXISTS memories_archive;
DROP TABLE IF EXISTS dialogue_history_archive;
DROP TABLE IF EXISTS game_sessions_archive;
```

**Warning:** Dropping archive tables will delete all archived data!

### Phase 5-6: Code Changes

```bash
# Revert client-side and backend changes
git revert COMMIT_HASH
npm run server:build
```

---

## Post-Migration Testing

### Critical Path Tests

Run through these scenarios:

1. **User Registration & Login**
   - [ ] Can create new account
   - [ ] Can log in successfully

2. **Campaign Management**
   - [ ] Can create campaign
   - [ ] Can view campaign list
   - [ ] Can delete campaign

3. **Character Creation**
   - [ ] Can create character
   - [ ] Can select class
   - [ ] Can select spells (for spellcasters)
   - [ ] Spell validation works correctly
   - [ ] Character saves successfully

4. **Game Sessions**
   - [ ] Can start game session
   - [ ] Can send messages
   - [ ] Can receive AI responses
   - [ ] Session persists correctly
   - [ ] Cannot create duplicate active sessions

5. **Session Management**
   - [ ] Can end session
   - [ ] Can resume session
   - [ ] Session history loads correctly

### Performance Tests

Use browser DevTools Network tab:

1. **Measure Response Times**
   - Spell validation: < 200ms
   - Character spell loading: < 150ms
   - Session creation: < 300ms

2. **Check Query Counts**
   - Enable Supabase query logging
   - Verify batch queries being used
   - Confirm indexes being hit

3. **Monitor Database Size**
   - Check table sizes before/after archival
   - Verify growth is controlled

---

## Support & Troubleshooting

If you encounter issues:

1. **Check Error Logs**
   - Supabase Dashboard → Database → Logs
   - Server console output
   - Browser console errors

2. **Review Documentation**
   - `/home/wonky/ai-adventure-scribe-main/docs/DATABASE_OPTIMIZATIONS.md`
   - Unit-specific documentation files
   - Migration README files

3. **Verify Prerequisites**
   - All previous phases completed
   - Migrations applied in order
   - No schema conflicts

4. **Test Queries Manually**
   - Run verification queries in SQL Editor
   - Check for constraint violations
   - Verify indexes exist

---

## Summary

After completing all phases:

✅ Query optimizations applied (5-12× faster)
✅ Race conditions eliminated (unique constraints)
✅ Database growth controlled (archival system)
✅ Client storage managed (auto-cleanup)
✅ Admin APIs available (manual control)

**Next Steps:**
1. Monitor application performance
2. Set up automated archival (if not already done)
3. Review cleanup logs periodically
4. Share documentation with team

---

**Last Updated:** November 3, 2025
**Version:** 1.0
**Questions?** Review `/home/wonky/ai-adventure-scribe-main/docs/DATABASE_OPTIMIZATIONS.md`
