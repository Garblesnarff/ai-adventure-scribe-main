# Automated Deployment Script (For Claude with Supabase MCP Access)

If you have a Claude Code instance with Supabase MCP authentication configured, you can run this automated deployment.

## What Another Claude Instance With MCP Permissions Could Do

### 1. Apply All Migrations Automatically

```typescript
// Migration 1: Cleanup duplicates
await mcp__supabase__apply_migration({
  name: "cleanup_duplicate_sessions",
  query: "UPDATE game_sessions SET status = 'completed'..."
});

// Migration 2: Add constraints
await mcp__supabase__apply_migration({
  name: "add_session_constraints",
  query: "CREATE UNIQUE INDEX idx_active_session_per_character..."
});

// Migration 3: Archive system
await mcp__supabase__apply_migration({
  name: "create_session_archive_system",
  query: "CREATE TABLE game_sessions_archive..."
});

// Migration 4: Atomic character function
await mcp__supabase__apply_migration({
  name: "create_character_atomic_function",
  query: "CREATE OR REPLACE FUNCTION create_character_atomic..."
});

// Migration 5: Message sequences
await mcp__supabase__apply_migration({
  name: "add_message_sequence_numbers",
  query: "ALTER TABLE dialogue_history ADD COLUMN sequence_number..."
});
```

### 2. Verify Migrations Automatically

```typescript
// Check for duplicate sessions
const duplicates = await mcp__supabase__execute_sql({
  query: `
    SELECT campaign_id, character_id, COUNT(*) as active_count
    FROM game_sessions
    WHERE status = 'active'
    GROUP BY campaign_id, character_id
    HAVING COUNT(*) > 1;
  `
});
// Should be empty

// Verify indexes created
const indexes = await mcp__supabase__execute_sql({
  query: `
    SELECT indexname FROM pg_indexes
    WHERE indexname LIKE 'idx_%' AND schemaname = 'public';
  `
});
// Should show ~15 indexes

// Verify functions created
const functions = await mcp__supabase__execute_sql({
  query: `
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
      'create_character_atomic', 'archive_old_sessions',
      'restore_archived_session', 'get_next_message_sequence'
    );
  `
});
// Should show 6 functions

// Verify archive tables
const archiveTables = await mcp__supabase__execute_sql({
  query: `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE '%_archive';
  `
});
// Should show 5 archive tables
```

### 3. Test Archive Function

```typescript
// Run dry-run archival test
const archiveTest = await mcp__supabase__execute_sql({
  query: "SELECT archive_old_sessions(90, TRUE);"
});

// Check archive statistics
const archiveStats = await mcp__supabase__execute_sql({
  query: "SELECT * FROM archive_statistics;"
});
```

### 4. Verify Performance Improvements

```typescript
// Test that sequence numbers are working
const sequenceTest = await mcp__supabase__execute_sql({
  query: `
    INSERT INTO dialogue_history (session_id, message, speaker_type, timestamp)
    VALUES ('test-session-id', 'Test message', 'player', NOW())
    RETURNING sequence_number;
  `
});
// Should return sequence_number = 1

// Check unique constraint works
try {
  const constraintTest = await mcp__supabase__execute_sql({
    query: `
      INSERT INTO game_sessions (campaign_id, character_id, status, start_time)
      SELECT campaign_id, character_id, 'active', NOW()
      FROM game_sessions WHERE status = 'active' LIMIT 1;
    `
  });
  // Should FAIL with unique constraint violation
} catch (error) {
  console.log("✓ Unique constraint working correctly");
}
```

## How to Enable This

To run automated deployment, another Claude Code instance would need:

### Option A: Set Environment Variable
```bash
export SUPABASE_ACCESS_TOKEN="your-personal-access-token"
```

### Option B: Configure MCP Server
Add to Claude Code MCP configuration:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

### Where to Get Access Token
1. Go to Supabase Dashboard
2. Settings → API
3. Generate a new service role key or personal access token
4. Copy and set as `SUPABASE_ACCESS_TOKEN`

## Then Just Ask Claude

With authentication configured, you could simply say:

> "Apply all the database migrations and verify they worked"

And Claude would:
1. ✅ Apply all 5 migrations in order
2. ✅ Verify each migration succeeded
3. ✅ Run verification queries
4. ✅ Test the constraints and functions
5. ✅ Provide a detailed success report

**Much faster than manual deployment!**

## What I Did Instead

Since I didn't have MCP authentication, I:
- ✅ Created all the migration files
- ✅ Created manual deployment scripts
- ✅ Created comprehensive documentation
- ✅ Created verification queries for you to run

**You have to run the migrations manually using one of the methods in DEPLOYMENT_READY.md**
