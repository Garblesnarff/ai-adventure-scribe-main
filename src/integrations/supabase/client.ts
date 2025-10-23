/**
 * SUPABASE INTEGRATION (CLIENT-SIDE)
 *
 * WHAT IS SUPABASE:
 * - A Backend-as-a-Service provider that gives us a PostgreSQL database, authentication, and more.
 * - We use it as our primary database and for user authentication.
 *
 * CONNECTION (Client-Side):
 * - URL: The project-specific Supabase URL (from an environment variable).
 * - Key: The public "anon" key (from an environment variable). This key is safe to expose in the browser.
 *
 * USAGE PATTERN (Client-Side):
 * - The client-side `supabase` object is used for all direct database interactions from the browser.
 * - Row-Level Security (RLS) is CRITICAL. All queries made with this client are subject to RLS policies defined in the database.
 * - This means that a query like `supabase.from('characters').select('*')` will only return the rows that the currently authenticated user is allowed to see.
 *
 * COMMON BUGS:
 * - Forgetting that RLS is always in effect. If a query returns no data, the first thing to check is the RLS policy for that table.
 * - Trying to perform admin-level actions. The "anon" key has limited privileges. Any action that requires elevated privileges must be done on the server-side with the service role key.
 *
 * IF SUPABASE IS DOWN:
 * - Most of the application will be non-functional.
 * - The frontend will likely be stuck in a loading state, and users will see errors when trying to fetch or save data.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase URL and Anon Key are required.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
