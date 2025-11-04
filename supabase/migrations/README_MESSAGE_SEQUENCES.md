# Message Sequence Numbers

## Quick Reference

**Migration**: `20251103151855_add_message_sequence_numbers.sql`
**Feature**: Automatic sequence number assignment for dialogue messages
**Purpose**: Prevent message ordering issues in multi-tab concurrent scenarios

## What It Does

Adds a `sequence_number` column to `dialogue_history` that ensures messages are ordered correctly even when:
- Multiple browser tabs send messages simultaneously
- Timestamps are identical (same millisecond)
- Network delays cause out-of-order arrival

## How It Works

1. **Database Trigger**: Automatically assigns sequence numbers on INSERT
2. **Advisory Locks**: Prevents race conditions using PostgreSQL advisory locks
3. **Unique Constraint**: Ensures no duplicate sequences per session
4. **Backfill**: Existing messages get sequences based on timestamp order

## Usage

### Applying the Migration

```bash
# Using the helper script
node scripts/apply-sequence-migration.js

# Or manually via Supabase SQL Editor
# Copy contents of 20251103151855_add_message_sequence_numbers.sql
```

### Querying Messages

```sql
-- Get messages in correct order
SELECT * FROM dialogue_history
WHERE session_id = 'session-uuid'
ORDER BY sequence_number ASC;

-- Check for any issues
SELECT session_id, sequence_number, COUNT(*)
FROM dialogue_history
GROUP BY session_id, sequence_number
HAVING COUNT(*) > 1; -- Should return 0 rows
```

### Application Code

No changes needed! The trigger handles everything automatically:

```typescript
// Old code still works - sequence is assigned automatically
await supabase.from('dialogue_history').insert({
  session_id: sessionId,
  message: 'Hello world',
  speaker_type: 'player',
  timestamp: new Date().toISOString(),
  // sequence_number is assigned by trigger
});

// Just update your ORDER BY clause
.order('sequence_number', { ascending: true })
// instead of
.order('timestamp', { ascending: true })
```

## Testing

### Automated Test

```bash
node scripts/test-message-sequences.js
```

This test:
- Inserts 10 messages concurrently
- Verifies sequence uniqueness and correctness
- Tests timestamp conflict scenarios

### Manual Multi-Tab Test

1. Open application in 2+ browser tabs
2. Send messages from each tab simultaneously
3. Verify messages appear in same order in all tabs

Expected: Sequences are continuous (1, 2, 3...) with no gaps or duplicates.

## Technical Details

### Concurrency Guarantee

Uses PostgreSQL advisory locks:
```sql
-- Per-session lock (doesn't block other sessions)
lock_key := ('x' || substring(session_id::text, 1, 16))::bit(64)::bigint;
PERFORM pg_advisory_xact_lock(lock_key);

-- Get next sequence atomically
SELECT COALESCE(MAX(sequence_number), 0) + 1
FROM dialogue_history
WHERE session_id = NEW.session_id;
```

### Performance Impact

- **Minimal**: Lock held for microseconds
- **Scalable**: Only same-session inserts are serialized
- **Fast**: Integer comparison faster than timestamp

### Schema

```sql
ALTER TABLE dialogue_history
  ADD COLUMN sequence_number INTEGER NOT NULL;

CREATE UNIQUE INDEX idx_dialogue_sequence
  ON dialogue_history(session_id, sequence_number);

CREATE INDEX idx_dialogue_session_sequence
  ON dialogue_history(session_id, sequence_number);
```

## Rollback

If you need to remove sequence numbers:

```sql
BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_assign_message_sequence ON dialogue_history;
DROP FUNCTION IF EXISTS assign_message_sequence_number();
DROP FUNCTION IF EXISTS get_next_message_sequence(uuid);

-- Drop indexes
DROP INDEX IF EXISTS idx_dialogue_sequence;
DROP INDEX IF EXISTS idx_dialogue_session_sequence;

-- Drop column
ALTER TABLE dialogue_history DROP COLUMN sequence_number;

COMMIT;
```

Then revert code changes:
- `src/hooks/use-messages.ts`
- `src/services/ai-service.ts`
- `src/hooks/use-game-session.ts`
- `src/hooks/session/session-utils.ts`
- `src/components/game/SimpleGameChatWithVoice.tsx`
- `src/integrations/supabase/database.types.ts`

## Verification Queries

```sql
-- Check sequence coverage
SELECT
  session_id,
  COUNT(*) as message_count,
  MIN(sequence_number) as min_seq,
  MAX(sequence_number) as max_seq,
  MAX(sequence_number) - MIN(sequence_number) + 1 as expected_count
FROM dialogue_history
GROUP BY session_id
HAVING COUNT(*) != (MAX(sequence_number) - MIN(sequence_number) + 1);
-- Should return 0 rows (no gaps)

-- Check for duplicates
SELECT session_id, sequence_number, COUNT(*)
FROM dialogue_history
GROUP BY session_id, sequence_number
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Sample messages with sequences
SELECT
  session_id,
  sequence_number,
  LEFT(message, 50) as message_preview,
  timestamp
FROM dialogue_history
ORDER BY session_id, sequence_number
LIMIT 20;
```

## Troubleshooting

### Issue: Duplicate sequence numbers

**Cause**: Migration failed or was partially applied

**Solution**:
```sql
-- Rerun the backfill section
WITH numbered_messages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp ASC, created_at ASC, id ASC) as seq
  FROM dialogue_history
)
UPDATE dialogue_history
SET sequence_number = numbered_messages.seq
FROM numbered_messages
WHERE dialogue_history.id = numbered_messages.id;
```

### Issue: New messages don't get sequences

**Cause**: Trigger not created or dropped

**Solution**:
```sql
-- Recreate trigger
CREATE TRIGGER trg_assign_message_sequence
  BEFORE INSERT ON dialogue_history
  FOR EACH ROW
  EXECUTE FUNCTION assign_message_sequence_number();
```

### Issue: Lock contention

**Symptom**: Slow message inserts

**Check**:
```sql
-- View current locks
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Check for long-running transactions
SELECT pid, now() - xact_start as duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

**Solution**: Advisory locks are transaction-scoped and release automatically. If seeing contention, check for:
- Long-running transactions holding locks
- Application code not committing transactions

## References

- **Migration File**: `supabase/migrations/20251103151855_add_message_sequence_numbers.sql`
- **Test Script**: `scripts/test-message-sequences.js`
- **Apply Script**: `scripts/apply-sequence-migration.js`
- **Implementation Report**: `UNIT_12_MESSAGE_SEQUENCES_REPORT.md`

---

**Last Updated**: 2025-11-03
**PostgreSQL Version**: 13+
**Status**: Production Ready
