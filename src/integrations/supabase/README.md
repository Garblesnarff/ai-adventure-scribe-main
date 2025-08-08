# Supabase Integration

## Purpose

This directory contains all code related to the integration with Supabase, which serves as the primary backend for the AI Dungeon Master application. This includes the Supabase client setup, database type definitions, and any custom Supabase-specific types or utilities.

## Structure and Important Files

- **`client.ts`**: This file is responsible for initializing and exporting the Supabase client instance. This client is then used throughout the application to interact with Supabase services (Database, Auth, Functions, Storage).
- **`database.types.ts`**: This crucial file contains TypeScript definitions automatically generated from your Supabase database schema (e.g., using `supabase gen types typescript`). It provides type safety when querying and manipulating database tables.
- **`types.ts`**: This file may contain additional custom TypeScript types or interfaces that are specific to Supabase interactions but not directly part of the auto-generated database schema types. For example, it might define types for function arguments or specific data structures returned by Supabase queries if they are more complex than the raw table rows.

## How Components Interact

- The Supabase client initialized in `client.ts` is imported by various parts of the application:
    - **Hooks** (in `src/hooks/`): Custom React hooks use the client to fetch data from or save data to the Supabase database (e.g., `useGameSession`, `useCharacterData`, `useMemories`).
    - **Services** (e.g., in `src/agents/services/`): Backend services or agent-related logic might use the client for data persistence.
    - **Supabase Edge Functions** (in `supabase/functions/`): While Edge Functions run on Supabase's servers, they might also use a Supabase client (often imported differently within the Deno environment) to interact with the database or other Supabase services. Frontend code in this directory primarily concerns client-side interactions.
- `database.types.ts` is imported wherever database interactions occur to provide type checking and IntelliSense for table names, columns, and data structures.
- `types.ts` (if used) would be imported by modules that need those specific custom Supabase-related type definitions.

## Usage Example

```typescript
// Importing and using the Supabase client:
import { supabase } from '@/integrations/supabase/client';
import { type Tables } from '@/integrations/supabase/database.types'; // Assuming 'Tables' is exported or similar

async function fetchCampaigns() {
  // Type safety thanks to database.types.ts
  const { data, error } = await supabase
    .from('campaigns') // 'campaigns' would be a known table name
    .select('id, name, description'); // 'id', 'name', 'description' would be known columns

  if (error) {
    console.error("Error fetching campaigns:", error);
    return null;
  }
  return data as Tables<'campaigns'>[]; // Cast to the specific table row type
}
```

## Notes

- This directory is fundamental for all backend interactions.
- Keeping `database.types.ts` up-to-date with your database schema is essential for type safety. This is usually done by running a Supabase CLI command.
- API keys and other sensitive Supabase configuration details should be managed via environment variables, which `client.ts` would use during initialization.
- See the main `/src/integrations/README.md` for the overall integrations strategy.
