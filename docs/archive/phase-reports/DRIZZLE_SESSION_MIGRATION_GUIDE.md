# Drizzle Session Migration Quick Reference

## For Developers: Migrating from Supabase Client to SessionService

This guide helps you replace Supabase client calls with type-safe Drizzle ORM queries.

---

## Common Patterns

### 1. Create a Game Session

**Before:**
```typescript
const { data, error } = await supabase
  .from('game_sessions')
  .insert({
    campaign_id: campaignId,
    character_id: characterId,
    status: 'active',
  })
  .select()
  .single();

if (error) throw error;
```

**After:**
```typescript
import { SessionService } from '@/server/src/services/session-service';

const session = await SessionService.createSession({
  campaignId,
  characterId,
  status: 'active',
});
// No error checking needed - throws on failure
// session is fully typed: GameSession
```

---

### 2. Get Session by ID

**Before:**
```typescript
const { data, error } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();

if (error) throw error;
if (!data) throw new Error('Not found');
```

**After:**
```typescript
const session = await SessionService.getSessionById(sessionId);

if (!session) {
  throw new Error('Session not found');
}
// session: GameSession | undefined
```

---

### 3. Get Active Session

**Before:**
```typescript
const { data, error } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('campaign_id', campaignId)
  .is('end_time', null)
  .single();
```

**After:**
```typescript
const session = await SessionService.getActiveSession({
  campaignId,
});
// Automatically filters by null end_time
```

---

### 4. Add Message to Session

**Before:**
```typescript
const { data, error } = await supabase
  .from('dialogue_history')
  .insert({
    session_id: sessionId,
    speaker_type: 'player',
    message: text,
    context: { location: 'tavern' },
  })
  .select()
  .single();
```

**After:**
```typescript
const message = await SessionService.addMessage({
  sessionId,
  speakerType: 'player',
  message: text,
  context: { location: 'tavern' },
});
// message: DialogueHistory
```

---

### 5. Get Messages with Pagination

**Before:**
```typescript
const start = page * 50;
const end = start + 49;

const { data, error, count } = await supabase
  .from('dialogue_history')
  .select('*', { count: 'exact' })
  .eq('session_id', sessionId)
  .order('timestamp', { ascending: false })
  .range(start, end);
```

**After:**
```typescript
const { messages, hasMore, total } = await SessionService.getRecentMessages(
  sessionId,
  50,  // limit
  page * 50  // offset
);
// messages: DialogueHistory[]
// hasMore: boolean
// total: number
```

---

### 6. Update Session State (JSONB)

**Before:**
```typescript
const { data: current } = await supabase
  .from('game_sessions')
  .select('session_state')
  .eq('id', sessionId)
  .single();

const newState = {
  ...(current?.session_state || {}),
  currentScene: 'combat',
  enemyCount: 3,
};

const { error } = await supabase
  .from('game_sessions')
  .update({ session_state: newState })
  .eq('id', sessionId);
```

**After:**
```typescript
const session = await SessionService.updateSessionState(sessionId, {
  currentScene: 'combat',
  enemyCount: 3,
});
// Automatic merge with existing state
// session: GameSession with updated state
```

---

### 7. Complete Session

**Before:**
```typescript
const { data, error } = await supabase
  .from('game_sessions')
  .update({
    end_time: new Date().toISOString(),
    status: 'completed',
    summary: 'Epic battle!',
  })
  .eq('id', sessionId)
  .select()
  .single();
```

**After:**
```typescript
const session = await SessionService.completeSession(
  sessionId,
  'Epic battle!'
);
// Automatically sets end_time and status
```

---

### 8. Get Session with Message History

**Before:**
```typescript
const { data: session } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();

const { data: messages } = await supabase
  .from('dialogue_history')
  .select('*')
  .eq('session_id', sessionId)
  .order('timestamp', { ascending: true })
  .limit(50);
```

**After:**
```typescript
const { session, messages, total } = await SessionService.getSessionWithMessages(
  sessionId,
  { limit: 50, offset: 0 }
);
// Single query with relational data
```

---

### 9. Get All Sessions for Campaign

**Before:**
```typescript
const { data, error } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('campaign_id', campaignId)
  .order('session_number', { ascending: false });
```

**After:**
```typescript
const sessions = await SessionService.getCampaignSessions(campaignId);
// Automatically sorted by session_number DESC
```

---

### 10. Append Combat Log Entry

**Before:**
```typescript
const { data: current } = await supabase
  .from('game_sessions')
  .select('session_state')
  .eq('id', sessionId)
  .single();

const combatLog = current?.session_state?.combatLog || [];
const newLog = [
  ...combatLog,
  { timestamp: new Date(), event: 'attack' }
].slice(-500);  // Keep last 500

await supabase
  .from('game_sessions')
  .update({
    session_state: {
      ...(current?.session_state || {}),
      combatLog: newLog
    }
  })
  .eq('id', sessionId);
```

**After:**
```typescript
await SessionService.appendCombatLog(sessionId, { event: 'attack' });
// Automatic timestamp, retention cap, and merge
```

---

## Type Safety Benefits

### Autocomplete
```typescript
const session = await SessionService.getSessionById(id);

// TypeScript knows all fields
session?.campaignId  // ✓ Valid
session?.campaign_id // ✗ TypeScript error
session?.invalidField // ✗ TypeScript error
```

### Type Inference
```typescript
// No manual type assertions needed
const messages = await SessionService.getRecentMessages(sessionId, 50, 0);

messages.messages.forEach(msg => {
  // TypeScript knows msg is DialogueHistory
  console.log(msg.speakerType);  // ✓ Valid
  console.log(msg.speaker_type); // ✗ Error (camelCase)
});
```

### Compile-Time Checking
```typescript
// TypeScript catches errors at compile time
await SessionService.createSession({
  campaignId: 'valid-uuid',
  invalidField: 'test',  // ✗ TypeScript error
});
```

---

## REST API Endpoints

For client-side code, use these REST endpoints (already migrated):

```typescript
// Create session
POST /api/v1/sessions
Body: { campaign_id, character_id, session_number }

// Get session
GET /api/v1/sessions/:id

// Get session with messages
GET /api/v1/sessions/:id/messages?limit=50&offset=0

// Complete session
POST /api/v1/sessions/:id/complete
Body: { summary }

// Add message
POST /api/v1/sessions/:id/messages
Body: { speaker_type, message, context }

// Update session state
PATCH /api/v1/sessions/:id/state
Body: { currentScene, ... }
```

---

## Performance Tips

### 1. Use Pagination
```typescript
// ✗ Bad - loads all messages
const { messages } = await SessionService.getSessionWithMessages(sessionId);

// ✓ Good - loads 50 at a time
const { messages, hasMore } = await SessionService.getRecentMessages(
  sessionId,
  50,
  page * 50
);
```

### 2. Limit Fields in Relational Queries
```typescript
// The service already optimizes queries
// No need to manually select fields
```

### 3. Batch State Updates
```typescript
// ✗ Bad - multiple updates
await SessionService.updateSessionState(id, { field1: 'a' });
await SessionService.updateSessionState(id, { field2: 'b' });

// ✓ Good - single update
await SessionService.updateSessionState(id, {
  field1: 'a',
  field2: 'b',
});
```

---

## Error Handling

### Service throws on errors
```typescript
try {
  const session = await SessionService.createSession({...});
} catch (error) {
  console.error('Failed to create session:', error);
  // Handle error
}
```

### Check for null/undefined
```typescript
const session = await SessionService.getSessionById(id);

if (!session) {
  return res.status(404).json({ error: 'Not found' });
}

// session is guaranteed to exist here
return res.json(session);
```

---

## Migration Checklist

When replacing Supabase client calls:

- [ ] Import SessionService instead of supabase client
- [ ] Replace `.from('game_sessions')` with `SessionService.*`
- [ ] Replace `.from('dialogue_history')` with message methods
- [ ] Remove manual error checking (service throws on error)
- [ ] Update field names from snake_case to camelCase
- [ ] Remove manual JSONB merge logic (service handles it)
- [ ] Remove manual pagination math (service provides it)
- [ ] Update type assertions to use inferred types
- [ ] Test with real data
- [ ] Update tests to mock SessionService instead of supabase

---

## Common Gotchas

### 1. Field Name Casing
```typescript
// ✗ Supabase uses snake_case
data.campaign_id

// ✓ Drizzle uses camelCase
session.campaignId
```

### 2. Return Types
```typescript
// ✗ Supabase returns { data, error }
const { data, error } = await supabase...

// ✓ Drizzle returns data directly (throws on error)
const session = await SessionService...
```

### 3. Null vs Undefined
```typescript
// Supabase returns null for missing rows
if (data === null) { ... }

// Drizzle returns undefined for missing rows
if (session === undefined) { ... }
// Or use optional chaining
session?.campaignId
```

---

## Questions?

- **Schema:** See `/db/session-schema.ts`
- **Service:** See `/server/src/services/session-service.ts`
- **Examples:** See `/server/src/routes/v1/sessions.ts`
- **Docs:** See `/server/src/services/README.md`

Happy migrating! 🚀
