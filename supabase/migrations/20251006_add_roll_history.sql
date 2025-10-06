-- roll_history table for durable analytics of dice events
create table if not exists public.roll_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('check','save','attack','initiative','damage')),
  purpose text,
  formula text,
  dc int,
  ac int,
  result_total int,
  result_natural int,
  advantage boolean,
  disadvantage boolean,
  success boolean,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_roll_history_session_time on public.roll_history(session_id, created_at desc);
