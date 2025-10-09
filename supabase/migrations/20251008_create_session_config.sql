-- Session configuration for safety settings and game options
create table if not exists public.session_config (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Safety tools configuration
  x_card_enabled boolean not null default true,
  veil_enabled boolean not null default true,
  pause_enabled boolean not null default true,
  auto_pause_on_trigger boolean not null default false,
  
  -- Configurable trigger words
  custom_x_card_triggers text[] default '{}',
  custom_veil_triggers text[] default '{}',
  custom_pause_triggers text[] default '{}',
  strict_mode_triggers boolean not null default false, -- Use only custom triggers if true
  
  -- Content filters and boundaries  
  content_warnings text[] default '{}',
  hard_boundaries text[] default '{}',
  comfort_level text check (comfort_level in ('pg','pg13','r','custom')) default 'pg13',
  
  -- Table rules and expectations
  table_rules text[] default '{}',
  house_rules_enabled boolean default false,
  rule_consistency_mode text check (rule_consistency_mode in ('strict','balanced','loose')) default 'balanced',
  
  -- Transparency and logging
  show_roll_transcripts boolean default true,
  show_rule_explanations boolean default true,
  audit_trail_enabled boolean default true,
  
  -- Game balance settings
  difficulty_adjustment numeric check (difficulty_adjustment >= -0.5 and difficulty_adjustment <= 0.5) default 0,
  encounter_scaling text check (encounter_scaling in ('none','balanced','dynamic')) default 'balanced',
  
  -- AI DM behavior
  dm_style text check (dm_style in ('traditional','narrative','mechanical','player_driven')) default 'balanced',
  response_time_mode text check (response_time_mode in ('fast','balanced','detailed')) default 'balanced',
  
  -- Integration flags
  enable_vrf_verification boolean default false,
  enable_community_rules boolean default false,
  
  -- Audit configuration
  audit_retention_days int default 90,
  auto_save_frequency_minutes int default 5,
  
  -- Metadata
  config_version int not null default 1,
  
  constraint unique_session_config unique(session_id)
);

-- Indexes for performance
create index if not exists idx_session_config_session_id on public.session_config(session_id);
create index if not exists idx_session_config_updated_at on public.session_config(updated_at desc);

-- Trigger to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger session_config_updated_at
  before update on public.session_config
  for each row
  execute function public.update_updated_at_column();

-- Row Level Security
alter table public.session_config enable row level security;

-- Policies: Users can only access their own session configurations
create policy "Users can view their own session config"
  on public.session_config for select
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert their own session config"
  on public.session_config for insert
  with check (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can update their own session config"
  on public.session_config for update
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete their own session config"
  on public.session_config for delete
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

-- Default session config function
create or replace function public.create_default_session_config(session_uuid uuid)
returns uuid as $$
declare
  config_id uuid;
begin
  insert into public.session_config (session_id)
  values (session_uuid)
  returning id into config_id;
  
  return config_id;
end;
$$ language plpgsql;

-- Comments for documentation
comment on table public.session_config is 'Configuration for session safety settings, rules, and AI DM behavior';
comment on column public.session_config.x_card_enabled is 'Enable X-card for immediate content stop';
comment on column public.session_config.veil_enabled is 'Enable veil tool to fade uncomfortable content';
comment on column public.session_config.pause_enabled is 'Enable pause/resume functionality';
comment on column public.session_config.auto_pause_on_trigger is 'Automatically pause on safety triggers';
comment on column public.session_config.content_warnings is 'List of content warnings to display';
comment on column public.session_config.hard_boundaries is 'Content topics that are completely off-limits';
comment on column public.session_config.comfort_level is 'Overall comfort level (PG, PG-13, R, Custom)';
comment on column public.session_config.table_rules is 'Custom table rules and expectations';
comment on column public.session_config.rule_consistency_mode is 'How strictly rules are enforced';
comment on column public.session_config.show_roll_transcripts is 'Show detailed roll transcripts to players';
comment on column public.session_config.show_rule_explanations is 'Show RAW/RAI/ROF explanations';
comment on column public.session_config.audit_trail_enabled is 'Enable full audit trail logging';
comment on column public.session_config.difficulty_adjustment is 'Difficulty modifier (-0.5 easier to +0.5 harder)';
comment on column public.session_config.encounter_scaling is 'How encounters scale to party level';
comment on column public.session_config.dm_style is 'AI DM narrative style preference';
comment on column public.session_config.response_time_mode is 'AI response generation speed vs detail balance';
comment on column public.session_config.enable_vrf_verification is 'Enable VRF for cryptographic randomness';
comment on column public.session_config.enable_community_rules is 'Enable community-voted rule clarifications';
comment on column public.session_config.audit_retention_days is 'How long to keep audit logs';
comment on column public.session_config.auto_save_frequency_minutes is 'Auto-save interval for session state';
