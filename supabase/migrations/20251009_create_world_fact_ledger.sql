-- World Fact Ledger for maintaining consistent world state
-- Module 4: World Graph & Fact Ledger

-- Core entities table - represents people, places, things in the world
create table if not exists public.world_entities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Entity identification
  entity_type text not null check (entity_type in ('person', 'place', 'item', 'organization', 'event', 'concept', 'creature')),
  name text not null,
  aliases text[] default '{}',
  
  -- Entity properties
  description text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  
  -- Status and lifecycle
  status text check (status in ('active', 'inactive', 'destroyed', 'unknown')) default 'unknown',
  lifespan_start timestamptz,
  lifespan_end timestamptz,
  
  -- Location tracking
  current_location_id uuid references public.world_entities(id),
  location_history jsonb not null default '[]'::jsonb,
  
  -- Ownership and relationships
  owner_id uuid references public.world_entities(id),
  organization_id uuid references public.world_entities(id),
  
  -- Tags and categories
  tags text[] default '{}',
  category text,
  
  -- Verification tracking
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1) default 0.5,
  source_type text check (source_type in ('player_action', 'dm_statement', 'rule_derivation', 'external_fact')),
  source_session_id uuid references public.game_sessions(id),
  
  constraints unique_entities_per_session unique(session_id, name, entity_type)
);

-- Relationships between entities
create table if not exists public.world_relationships (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Relationship identification
  subject_id uuid not null references public.world_entities(id) on delete cascade,
  object_id uuid not null references public.world_entities(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'owns', 'located_in', 'member_of', 'knows', 'allied_with', 'enemy_of', 
    'works_for', 'leads', 'parent_of', 'child_of', 'married_to', 'friend_of',
    'uses', 'carries', 'guards', 'serves', 'follows', 'trades_with', 'lives_in',
    'controls', 'protects', 'hunts', 'fears', 'hates', 'respects', 'trusts'
  )),
  
  -- Relationship properties
  description text,
  strength numeric check (strength >= -1 and strength <= 1) default 0, -- -1 (hates) to 1 (loves)
  mutual boolean default false,
  
  -- Temporal properties
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  
  -- Verification tracking
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1) default 0.5,
  source_type text check (source_type in ('player_action', 'dm_statement', 'rule_derivation', 'inferred')),
  source_session_id uuid references public.game_sessions(id),
  
  constraints unique_relationship unique(subject_id, object_id, relationship_type, valid_from, coalesce(valid_until, 'infinity'::timestamptz))
);

-- Fact ledger - stores verified and temporal facts about the world
create table if not exists public.world_facts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Fact identification
  fact_type text not null check (fact_type in (
    'entity_property', 'entity_location', 'relationship_property', 
    'event_occurrence', 'world_state', 'rule_fact', 'derived_fact'
  )),
  subject_id uuid references public.world_entities(id) on delete cascade,
  object_id uuid references public.world_entities(id) on delete cascade,
  property_key text,
  property_value jsonb,
  previous_value jsonb,
  
  -- Temporal properties
  observed_at timestamptz not null default now(),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  
  -- Fact verification
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1) default 0.5,
  verification_method text check (verification_method in ('direct', 'inferred', 'stated', 'observed', 'derived')),
  source_type text check (source_type in ('player_action', 'dm_statement', 'automatic', 'rule_based')),
  source_session_id uuid references public.game_sessions(id),
  
  -- Consistency tracking
  contradictions uuid[],
  supporting_facts uuid[],
  confidence_history jsonb not null default '[]'::jsonb,
  
  constraints unique_facts unique(session_id, fact_type, subject_id, coalesce(object_id, session_id::uuid), property_key, valid_from, coalesce(valid_until, 'infinity'::timestamptz))
);

-- Conflict detection and resolution
create table if not exists public.world_conflicts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  
  -- Conflict details
  conflict_type text not null check (conflict_type in ('property_conflict', 'relationship_conflict', 'location_conflict', 'temporal_conflict')),
  description text not null,
  severity text check (severity in ('low', 'medium', 'high', 'critical')) default 'medium',
  
  -- Conflicting facts
  fact_a uuid not null references public.world_facts(id) on delete cascade,
  fact_b uuid not null references public.world_facts(id) on delete cascade,
  
  -- Resolution
  resolution_method text check (resolution_method in ('manual', 'automatic', 'weighted', 'most_recent', 'dm_override')),
  resolution_details jsonb,
  resolved_by text, -- 'system', 'dm', 'automatic'
  
  -- Status
  status text check (status in ('open', 'in_review', 'resolved', 'ignored')) default 'open'
);

-- Rules and constraints for world consistency
create table if not exists public.world_rules (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Rule definition
  name text not null,
  description text,
  rule_type text check (rule_type in ('consistency', 'constraint', 'derivation', 'business_logic')),
  
  -- Rule conditions
  conditions jsonb not null default '{}'::jsonb, -- JSON logic for when rule applies
  consequences jsonb not null default '{}'::jsonb, -- What happens when violated
  
  -- Rule metadata
  priority int default 1, -- Higher priority = enforced first
  enabled boolean default true,
  severity text check (severity in ('warning', 'error', 'critical')) default 'warning',
  
  -- Rule tracking
  triggered_count int default 0,
  last_triggered timestamptz,
  auto_resolve boolean default false
);

-- Create indexes for performance
create index if not exists idx_world_entities_session_type on public.world_entities(session_id, entity_type);
create index if not exists idx_world_entities_name on public.world_entities(name);
create index if not exists idx_world_entities_current_location on public.world_entities(current_location_id) where current_location_id is not null;
create index if not exists idx_world_entities_status on public.world_entities(status);
create index if not exists idx_world_entities_updated_at on public.world_entities(updated_at desc);

create index if not exists idx_world_relationships_session on public.world_relationships(session_id);
create index if not exists idx_world_relationships_subject on public.world_relationships(subject_id);
create index if not exists idx_world_relationships_object on public.world_relationships(object_id);
create index if not exists idx_world_relationships_type on public.world_relationships(relationship_type);
create index if not exists idx_world_relationships_validity on public.world_relationships(valid_from, valid_until);

create index if not exists idx_world_facts_session_type on public.world_facts(session_id, fact_type);
create index if not exists idx_world_facts_subject on public.world_facts(subject_id);
create index if not exists idx_world_facts_object on public.world_facts(object_id);
create index if not exists idx_world_facts_observed on public.world_facts(observed_at desc);
create index if not exists idx_world_facts_validity on public.world_facts(valid_from, valid_until);

create index if not exists idx_world_conflicts_session on public.world_conflicts(session_id);
create index if not exists idx_world_conflicts_status on public.world_conflicts(status);
create index if not exists idx_world_conflicts_created on public.world_conflicts(created_at desc);

create index if not exists idx_world_rules_session on public.world_rules(session_id);
create index if not exists idx_world_rules_enabled on public.world_rules(enabled) where enabled = true;
create index if not exists idx_world_rules_priority on public.world_rules(priority desc);

-- Update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers to all tables
create trigger world_entities_updated_at
  before update on public.world_entities
  for each row
  execute function public.update_updated_at_column();

create trigger world_relationships_updated_at
  before update on public.world_relationships
  for each row
  execute function public.update_updated_at_column();

create trigger world_facts_updated_at
  before update on public.world_facts
  for each row
  execute function public.update_updated_at_column();

-- Row Level Security
alter table public.world_entities enable row level security;
alter table public.world_relationships enable row level security;
alter table public.world_facts enable row level security;
alter table public.world_conflicts enable row level security;
alter table public.world_rules enable row level security;

-- Policies: Users can only access their own session data
create policy "Users can view their own world entities"
  on public.world_entities for select
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert their own world entities"
  on public.world_entities for insert
  with check (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can update their own world entities"
  on public.world_entities for update
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

-- Similar policies for relationships, facts, conflicts, and rules...
create policy "Users can view their own world relationships"
  on public.world_relationships for select
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert their own world relationships"
  on public.world_relationships for insert
  with check (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can view their own world facts"
  on public.world_facts for select
  using (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert their own world facts"
  on public.world_facts for insert
  with check (
    session_id in (
      select id from public.game_sessions 
      where user_id = auth.uid()
    )
  );

-- Comments for documentation
comment on table public.world_entities is 'Core entities representing people, places, things, and concepts in the game world';
comment on table public.world_relationships is 'Relationships between entities with temporal and confidence tracking';
comment on table public.world_facts is 'Verified and temporal facts about the world with consistency tracking';
comment on table public.world_conflicts is 'Detection and resolution of contradictions in world state';
comment on table public.world_rules is 'Rules and constraints for maintaining world consistency';

comment on column public.world_entities.confidence_score is 'Confidence in entity accuracy (0-1)';
comment on column public.world_relationships.strength is 'Relationship strength from -1 (hates) to 1 (loves)';
comment on column public.world_facts.verification_method is 'How this fact was verified';
comment on column public.world_conflicts.resolution_method is 'How the conflict was resolved';
comment on column public.world_rules.auto_resolve is 'Whether conflicts are automatically resolved';
