-- MIGRATION: Create User Profiles Table
-- PURPOSE: To store user-specific metadata, particularly for billing and subscription plans. This table links the application's user model to the authentication provider (Supabase Auth).
--
-- BUSINESS IMPACT:
-- - Essential for the monetization model; the 'plan' column determines a user's access to paid features.
-- - Provides a central location for user-related data that doesn't belong in the auth schema.
--
-- SCHEMA CHANGES:
-- - New table: user_profiles (stores plan, user_id, and timestamps).
-- - New function: set_updated_at (a trigger function to automatically update the updated_at timestamp).
-- - New trigger: trg_user_profiles_updated_at (applies the set_updated_at function to the user_profiles table).
--
-- RLS POLICIES:
-- - No new policies in this migration. It is CRITICAL that RLS be enabled on this table in a subsequent migration to prevent users from seeing or modifying each other's profiles.
--
-- MIGRATION SAFETY:
-- - Backward compatible: YES (can rollback without data loss: YES, the new table, function, and trigger will be dropped)
-- - Requires downtime: NO (creating a new table and related objects is a non-blocking operation)
-- - Data migration needed: NO
--
-- IF REVERTING THIS MIGRATION:
-- - The user_profiles table will be dropped, and all subscription data will be lost.
-- - The monetization system will be non-functional.
--
-- TESTED BY:
-- - Verified that the table, function, and trigger are created correctly.
-- - Verified that the updated_at column is automatically updated on a row update.

-- Create user_profiles table for billing/subscription metadata managed via Supabase
create table if not exists public.user_profiles (
  email text primary key,
  user_id uuid unique,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

comment on table public.user_profiles is 'Per-user profile and plan info managed by backend. Primary key: email.';
