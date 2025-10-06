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
