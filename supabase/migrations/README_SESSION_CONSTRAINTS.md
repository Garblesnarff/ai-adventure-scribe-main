# Session Constraints Migration

## Overview

This migration prevents race conditions when creating game sessions by adding a unique constraint that ensures only ONE active session can exist for a given campaign+character combination at any time.

## Problem Statement

Multiple browser tabs can currently create duplicate active sessions for the same character in the same campaign, leading to:
- Data inconsistency
- Confused game state
- Multiple "active" sessions when only one should exist

## Solution

Add a **partial unique index** on `game_sessions` that prevents duplicate active sessions while allowing historical (completed/expired) sessions to coexist.

## Migration Files

### 1. `20251103_01_cleanup_duplicate_sessions.sql`
**Must be run FIRST**

This migration cleans up existing duplicate active sessions by:
- Identifying all campaign+character combinations with multiple active sessions
- Keeping the MOST RECENT active session
- Marking all older duplicates as `completed`

**Safety:** Historical data is preserved; only the status changes.

### 2. `20251103_02_add_session_constraints.sql`
**Run AFTER cleanup**

This migration adds:

#### Primary Constraint
```sql
CREATE UNIQUE INDEX idx_active_session_per_character
ON game_sessions(campaign_id, character_id)
WHERE status = 'active';
```

**How it works:**
- The `WHERE status = 'active'` clause makes this a **partial index**
- Only active sessions are subject to the uniqueness constraint
- Completed/expired sessions can have duplicates (correct for historical records)
- PostgreSQL efficiently enforces this at the database level

#### Performance Indexes
```sql
-- Status lookups (checking for active sessions)
CREATE INDEX idx_game_sessions_status
ON game_sessions(status);

-- Dialogue history by session and speaker
CREATE INDEX idx_dialogue_history_session_speaker
ON dialogue_history(session_id, speaker_type);

-- Character spell reverse lookups
CREATE INDEX idx_character_spells_spell_id
ON character_spells(spell_id);
```

## How to Apply

### Method 1: Supabase Dashboard (Recommended)

1. **Apply Cleanup Migration:**
   - Go to: [Supabase SQL Editor](https://supabase.com/dashboard/project/your-project-id/sql)
   - Open: `supabase/migrations/20251103_01_cleanup_duplicate_sessions.sql`
   - Copy contents and paste into SQL Editor
   - Click **Run**
   - Verify: Check that duplicates were resolved

2. **Apply Constraints Migration:**
   - Open: `supabase/migrations/20251103_02_add_session_constraints.sql`
   - Copy contents and paste into SQL Editor
   - Click **Run**
   - Verify: Check that indexes were created

### Method 2: Supabase CLI

```bash
# Apply both migrations
supabase db push

# Or apply individually
supabase db push --file supabase/migrations/20251103_01_cleanup_duplicate_sessions.sql
supabase db push --file supabase/migrations/20251103_02_add_session_constraints.sql
```

### Method 3: Programmatic Pre-flight Check

```bash
# Run pre-flight checks
node scripts/apply-session-constraints-migration.js

# This will:
# - Check for existing duplicates
# - Provide SQL to fix them
# - Verify tables exist
# - Guide you through manual application
```

## Testing

### Automated Testing

```bash
# Run comprehensive tests
node scripts/test-session-constraints.js
```

This test script will:
1. ✅ Check for duplicate active sessions
2. ✅ Verify query performance with indexes
3. ✅ Test that tables are accessible
4. ✅ Attempt to create duplicate session (should fail after constraint applied)

### Manual Testing

#### Test 1: Verify No Duplicates
```sql
SELECT campaign_id, character_id, COUNT(*) as active_count
FROM game_sessions
WHERE status = 'active'
GROUP BY campaign_id, character_id
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows (no duplicates)

#### Test 2: Try Creating Duplicate (Should Fail)
```sql
-- Find an existing active session
SELECT campaign_id, character_id FROM game_sessions WHERE status = 'active' LIMIT 1;

-- Try to create duplicate with same campaign_id and character_id
INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
VALUES ('existing-campaign-uuid', 'existing-character-uuid', 2, 'active', NOW());

-- Expected error:
-- ERROR: duplicate key value violates unique constraint "idx_active_session_per_character"
```

#### Test 3: Verify Completed Sessions Can Duplicate (Should Succeed)
```sql
-- This SHOULD work (historical sessions can have duplicates)
INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time, end_time)
VALUES ('existing-campaign-uuid', 'existing-character-uuid', 3, 'completed', NOW() - INTERVAL '1 day', NOW());
```

#### Test 4: Verify Status Change Allows New Active Session
```sql
-- Mark existing active session as completed
UPDATE game_sessions SET status = 'completed', end_time = NOW()
WHERE campaign_id = 'test-campaign-uuid' AND character_id = 'test-character-uuid' AND status = 'active';

-- Now creating new active session should work
INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
VALUES ('test-campaign-uuid', 'test-character-uuid', 4, 'active', NOW());

-- Expected: Success!
```

## Current Database State

**Before Cleanup:**
- 8 campaign+character combinations with duplicate active sessions
- Notable: `null-null` combination has 356 active sessions
- Total duplicates: ~419 sessions that need status update

**After Cleanup:**
- Each campaign+character has max 1 active session
- Older sessions marked as `completed` with `end_time` set to NOW()
- Historical data preserved

**After Constraints:**
- Unique constraint prevents future duplicates
- Indexes improve query performance
- Race conditions eliminated

## Impact on Application Code

### Frontend (React)
No changes required. The constraint enforcement happens at the database level:
- Attempting to create duplicate session will throw error
- Frontend should catch error and handle gracefully
- Recommended: Check for existing active session before creating new one

```typescript
// Recommended pattern
const { data: existing } = await supabase
  .from('game_sessions')
  .select('id')
  .eq('campaign_id', campaignId)
  .eq('character_id', characterId)
  .eq('status', 'active')
  .maybeSingle();

if (existing) {
  // Resume existing session
  return existing;
} else {
  // Create new session
  const { data: newSession } = await supabase
    .from('game_sessions')
    .insert({ campaign_id, character_id, status: 'active', ... })
    .single();
  return newSession;
}
```

### Backend (Express)
Consider adding endpoint to get-or-create session:

```typescript
// GET /api/v1/sessions/active?campaign_id=X&character_id=Y
// Returns existing active session or creates new one
router.get('/active', async (req, res) => {
  const { campaign_id, character_id } = req.query;

  // Try to get existing
  let session = await getActiveSession(campaign_id, character_id);

  if (!session) {
    // Create new
    session = await createSession(campaign_id, character_id);
  }

  res.json(session);
});
```

## Performance Impact

### Query Improvements

**Before:**
- Status lookups: Table scan
- Session checks: Multiple queries

**After:**
- Status lookups: Index scan (~10-100x faster)
- Session checks: Single indexed query
- Constraint validation: O(1) with unique index

### Estimated Performance Gains
- `WHERE status = 'active'`: ~50ms → ~5ms
- Duplicate check: 2-3 queries → 0 queries (handled by constraint)
- Dialogue history by session: ~100ms → ~10ms

## Rollback Procedure

If issues arise, you can rollback by dropping the indexes:

```sql
-- Drop unique constraint
DROP INDEX IF EXISTS idx_active_session_per_character;

-- Drop performance indexes (optional)
DROP INDEX IF EXISTS idx_game_sessions_status;
DROP INDEX IF EXISTS idx_dialogue_history_session_speaker;
DROP INDEX IF EXISTS idx_character_spells_spell_id;
```

**Note:** Rolling back does NOT restore duplicate sessions. They were marked as `completed` for data consistency.

## Future Considerations

### 1. Session Expiration
Consider adding automatic session expiration:
```sql
-- Mark old active sessions as expired
UPDATE game_sessions
SET status = 'expired', end_time = NOW()
WHERE status = 'active'
  AND start_time < NOW() - INTERVAL '24 hours';
```

### 2. Session Resume
Add logic to resume expired sessions:
```typescript
// Allow users to resume expired sessions
// Changes status back to 'active' with new start_time
```

### 3. Multi-Character Campaigns
If campaigns support multiple characters per user in the future:
- Current constraint allows 1 active session per character
- Multiple characters = multiple concurrent sessions (intended behavior)

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause:** Attempting to create duplicate active session

**Solution:**
1. Check for existing active session first
2. Either resume existing or mark it completed before creating new one

### Error: "relation 'game_sessions' does not exist"

**Cause:** Migration applied to wrong database or tables not created

**Solution:**
1. Verify you're connected to correct Supabase project
2. Check that base schema migrations were applied

### Warning: "Found X duplicate active sessions"

**Cause:** Cleanup migration not yet applied

**Solution:**
1. Apply `20251103_cleanup_duplicate_sessions.sql` first
2. Then apply `20251103_add_session_constraints.sql`

## References

- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Database Constraints Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_NULL_FALSE)

## Migration Checklist

- [x] Create cleanup migration
- [x] Create constraints migration
- [x] Create test scripts
- [x] Document everything
- [ ] Apply cleanup migration to database
- [ ] Verify duplicates are resolved
- [ ] Apply constraints migration to database
- [ ] Run test suite to verify
- [ ] Monitor application for errors
- [ ] Update application code if needed

---

**Created:** 2025-11-03
**Author:** Claude Code
**Status:** Ready to apply
