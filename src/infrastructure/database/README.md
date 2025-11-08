# Infrastructure Database Layer

This layer provides centralized database client management and configuration for the AI Adventure Scribe application.

## Purpose

The database layer abstracts database connection details and provides a clean, consistent interface for:
- **Supabase**: Authentication, real-time features, and user data storage
- **Drizzle ORM**: Type-safe database queries with PostgreSQL
- **PostgreSQL**: Direct database access via node-postgres

## Architecture

```
src/infrastructure/database/
├── supabase-client.ts    # Supabase client initialization and auth utilities
├── drizzle-client.ts     # Drizzle ORM configuration
├── pg-client.ts          # PostgreSQL connection pool factory
├── types.ts              # Shared type definitions
├── index.ts              # Public API exports
└── README.md             # This file
```

## Usage

### Supabase Client

For authentication, real-time subscriptions, and user data:

```typescript
import { supabase, supabaseService, verifySupabaseToken } from '@/infrastructure/database';

// Standard client (anon key)
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('user_id', userId);

// Service role client (admin operations)
const { data } = await supabaseService
  .from('users')
  .update({ role: 'admin' })
  .eq('id', userId);

// Token verification
const user = await verifySupabaseToken(authToken);
```

### Drizzle ORM

For type-safe database queries:

```typescript
import { db } from '@/infrastructure/database';
import { sessions } from '@/db/session-schema';
import { eq } from 'drizzle-orm';

// Type-safe queries
const session = await db
  .select()
  .from(sessions)
  .where(eq(sessions.id, sessionId))
  .limit(1);
```

### PostgreSQL Pool

For direct database access:

```typescript
import { createPgClient, pgPool } from '@/infrastructure/database';

// Use existing pool from Drizzle
const result = await pgPool.query('SELECT NOW()');

// Create new pool (if needed)
const pool = createPgClient();
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Environment Variables

Required configuration:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
PGSSL=true                    # Enable SSL (optional)
PGPOOL_MAX=10                 # Max connections (optional)
```

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `supabase` | Client | Supabase client with anon key |
| `supabaseService` | Client | Supabase client with service role key |
| `verifySupabaseToken` | Function | JWT token verification utility |
| `db` | DrizzleDb | Drizzle ORM instance with session schema |
| `pgPool` | Pool | PostgreSQL connection pool from Drizzle |
| `createPgClient` | Function | Factory for new PostgreSQL pools |

## Implementation Notes

### Supabase Client (`supabase-client.ts`)
- Provides two clients: standard (`supabase`) and service role (`supabaseService`)
- Includes JWT verification with fallback to Supabase auth
- Service role client used for admin operations that bypass RLS

### Drizzle Client (`drizzle-client.ts`)
- Configured with session schema for type-safe queries
- Shares connection pool with PostgreSQL client
- Exports pool for direct access when needed

### PostgreSQL Client (`pg-client.ts`)
- Factory function for creating new connection pools
- Configurable via environment variables
- Supports SSL connections for production

## Migration from Old Paths

If you're updating imports from old locations:

```typescript
// OLD (server-side)
import { supabase } from '../lib/supabase.js';
import { db } from '../lib/drizzle.js';
import { createClient } from '../lib/db.js';

// NEW (infrastructure layer)
import { supabase, db, createPgClient } from '@/infrastructure/database';
```

```typescript
// OLD (frontend)
import { supabase } from '@/integrations/supabase/client';

// NEW (should still use frontend client for browser)
// Frontend should continue using src/integrations/supabase/client.ts
// This infrastructure layer is primarily for server-side usage
```

## Best Practices

1. **Use Drizzle ORM** for type-safe queries when possible
2. **Use Supabase client** for auth, real-time, and storage features
3. **Use PostgreSQL pool** only for raw SQL or migrations
4. **Service role client** should only be used in backend code, never exposed to frontend
5. **Always handle connection errors** and implement proper retry logic

## Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [node-postgres Documentation](https://node-postgres.com/)
