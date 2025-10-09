-- Safety audit trail for all safety commands and triggers
create table if not exists public.safety_audit_trail (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Event details
  event_type text not null check (event_type in ('x_card', 'veil', 'pause', 'resume', 'auto_trigger')),
  triggered_by text not null check (triggered_by in ('explicit_command', 'auto_detect', 'system')),
  trigger_word text,
  
  -- Content context
  player_message text,
  ai_response text,
  context_snippet text,
  
  -- Auto-trigger details
  auto_triggered boolean default false,
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1),
  
  -- System response
  system_response text,
  action_taken text not null check (action_taken in ('paused_session', 'rewound_content', 'veiled_content', 'resumed_session', 'logged_only')),
  
  -- Session state
  was_paused_before boolean default false,
  is_paused_after boolean default false,
  scene_description_before text,
  scene_description_after text,
  
  -- Metadata
  ip_address inet,
  user_agent text,
  session_turn_number int,
  
  -- References
  previous_safety_events int default 0,
  related_content_warning text[]
);

-- Indexes for performance
create index if not exists idx_safety_audit_trail_session_id on public.safety_audit_trail(session_id);
create index if not exists idx_safety_audit_trail_user_id on public.safety_audit_trail(user_id);
create index if not exists idx_safety_audit_trail_created_at on public.safety_audit_trail(created_at desc);
create index if not exists idx_safety_audit_trail_event_type on public.safety_audit_trail(event_type);
create index if not exists idx_safety_audit_trail_auto_triggered on public.safety_audit_trail(auto_triggered);

-- Row Level Security
alter table public.safety_audit_trail enable row level security;

-- Policies: Users can only access their own safety audit logs
create policy "Users can view their own safety audit trail"
  on public.safety_audit_trail for select
  using (
    user_id = auth.uid()
  );

create policy "Users can insert their own safety audit entries"
  on public.safety_audit_trail for insert
  with check (
    user_id = auth.uid()
  );

-- Comments for documentation
comment on table public.safety_audit_trail is 'Audit trail for all safety system events including X-card, veil, pause/resume commands and auto-triggers';
comment on column public.safety_audit_trail.event_type is 'Type of safety event that occurred';
comment on column public.safety_audit_trail.triggered_by is 'How the safety event was triggered (manual command, auto-detection, system)';
comment on column public.safety_audit_trail.trigger_word is 'The word or phrase that triggered the auto-detection';
comment on column public.safety_audit_trail.context_snippet is 'Relevant context around the trigger (max 500 chars)';
comment on column public.safety_audit_trail.confidence_score is 'AI confidence score for auto-triggered events (0-1)';
comment on column public.safety_audit_trail.action_taken is 'What action the safety system took in response';
comment on column public.safety_audit_trail.previous_safety_events is 'Count of previous safety events in this session';
