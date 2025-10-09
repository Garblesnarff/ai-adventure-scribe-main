-- Multi-User Orchestration Schema
-- Supports session sharing, turn management, and player synchronization

-- Create shared sessions table for collaborative gameplay
CREATE TABLE IF NOT EXISTS shared_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code TEXT UNIQUE NOT NULL, -- 6-character join code
    name TEXT NOT NULL, -- Session name
    description TEXT, -- Session description
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false, -- Public discovery
    max_players INTEGER DEFAULT 4, -- Maximum players
    current_players INTEGER DEFAULT 1, -- Current player count
    
    -- Session state
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'archived')),
    game_state JSONB DEFAULT '{}', -- Current shared game state
    world_snapshot JSONB DEFAULT '{}', -- Current world state snapshot
    
    -- Session settings
    allow_spectators BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false, -- Host must approve join requests
    auto_save_interval INTEGER DEFAULT 300, -- Auto-save every 5 minutes
    turn_time_limit INTEGER DEFAULT 300, -- 5 minutes per turn default
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_activity TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_player_count CHECK (current_players >= 0 AND current_players <= max_players),
    CONSTRAINT valid_turn_limit CHECK (turn_time_limit >= 30 AND turn_time_limit <= 3600),
    CONSTRAINT valid_auto_save CHECK (auto_save_interval >= 60)
);

-- Session participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participant details
    role TEXT DEFAULT 'player' CHECK (role IN ('player', 'dm', 'spectator')),
    status TEXT DEFAULT 'active' CHECK (status IN ('invited', 'joined', 'active', 'away', 'disconnected', 'left')),
    display_name TEXT NOT NULL, -- Player's chosen display name
    character_id UUID, -- Reference to character in world graph
    
    -- Permissions
    can_control_entities BOOLEAN DEFAULT true, -- Can control own character
    can_world_build BOOLEAN DEFAULT false, -- Can modify world state
    can_invite_players BOOLEAN DEFAULT false, -- Can invite other players
    is_turn_ready BOOLEAN DEFAULT false, -- Ready for next turn
    
    -- Connection state
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now(),
    connection_count INTEGER DEFAULT 0, -- Number of connections
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(session_id, user_id),
    CONSTRAINT valid_display_name CHECK (LENGTH(display_name) >= 2 AND LENGTH(display_name) <= 50)
);

-- Turn management table
CREATE TABLE IF NOT EXISTS session_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    
    -- Turn details
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    character_id UUID, -- Character acting this turn
    turn_type TEXT DEFAULT 'action' CHECK (turn_type IN ('action', 'dialogue', 'movement', 'combat', 'rest', 'other')),
    
    -- Turn content
    action JSONB NOT NULL DEFAULT '{}', -- Structured action data
    narrative_response TEXT, -- DM's narrative response
    world_changes JSONB DEFAULT '{}', -- Changes to world state
    
    -- Turn timing
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER, -- Actual turn duration
    
    -- Turn state
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'timeout')),
    is_sync BOOLEAN DEFAULT false, -- Synchronized with world graph
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional turn data
    
    -- Constraints
    UNIQUE(session_id, turn_number),
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Session events table for real-time updates
CREATE TABLE IF NOT EXISTS session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES session_participants(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'player_joined', 'player_left', 'turn_started', 'turn_completed', 
        'world_updated', 'chat_message', 'system_message', 'error',
        'state_sync', 'conflict_detected', 'conflict_resolved'
    )),
    
    -- Event content
    data JSONB NOT NULL DEFAULT '{}', -- Event-specific data
    message TEXT, -- Human-readable message
    
    -- Event targeting
    target_participants TEXT[], -- Specific participants to notify
    is_broadcast BOOLEAN DEFAULT false, -- Send to all participants
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    -- Processing state
    is_processed BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0 -- Higher priority events processed first
);

-- Session conflicts table for disagreement resolution
CREATE TABLE IF NOT EXISTS session_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type TEXT NOT NULL CHECK (conflict_type IN (
        'character_action', 'world_state', 'narrative', 'rules', 'turn_order', 'timeout'
    )),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'ignored')),
    
    -- Conflict data
    initiating_participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    affected_participants UUID[], -- Participants affected by conflict
    
    -- Conflict content
    original_action JSONB, -- The action that caused conflict
    conflicting_states JSONB[], -- Different proposed states
    resolution JSONB, -- Final resolution
    
    -- Resolution
    resolved_by UUID REFERENCES session_participants(id) ON DELETE SET NULL, -- Who resolved
    resolution_method TEXT CHECK (resolution_method IN ('vote', 'dm_override', 'auto_resolve', 'negotiated')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ, -- When auto-resolution occurs
    
    -- Constraints
    CONSTRAINT valid_deadline CHECK (deadline IS NULL OR deadline > created_at)
);

-- Session snapshots table for state recovery
CREATE TABLE IF NOT EXISTS session_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    
    -- Snapshot content
    game_state JSONB NOT NULL DEFAULT '{}', -- Complete game state
    world_state JSONB NOT NULL DEFAULT '{}', -- World graph state
    participant_states JSONB DEFAULT '{}', -- Individual participant states
    
    -- Snapshot metadata
    snapshot_type TEXT DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual', 'turn_end', 'crash')),
    version INTEGER DEFAULT 1, -- Snapshot version for compatibility
    checksum TEXT, -- Data integrity checksum
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    size_bytes INTEGER, -- Snapshot size
    
    -- Constraints
    UNIQUE(session_id, turn_number, snapshot_type)
);

-- Session chat/history table for persistent communication
CREATE TABLE IF NOT EXISTS session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES session_participants(id) ON DELETE SET NULL,
    
    -- Message details
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'action', 'ooc', 'dice_roll', 'error')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Additional message data
    
    -- Message targeting
    is_private BOOLEAN DEFAULT false, -- Private message
    target_participants UUID[], -- Specific recipients for private messages
    
    -- Moderation
    is_deleted BOOLEAN DEFAULT false,
    moderated_by UUID REFERENCES session_participants(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    edited_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_content CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_shared_sessions_creator ON shared_sessions(creator_id);
CREATE INDEX idx_shared_sessions_status ON shared_sessions(status);
CREATE INDEX idx_shared_sessions_public ON shared_sessions(is_public, status);
CREATE INDEX idx_shared_sessions_activity ON shared_sessions(last_activity DESC);
CREATE INDEX idx_shared_sessions_code ON shared_sessions(session_code);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_participants_status ON session_participants(status);
CREATE INDEX idx_session_participants_role ON session_participants(role);

CREATE INDEX idx_session_turns_session ON session_turns(session_id);
CREATE INDEX idx_session_turns_participant ON session_turns(participant_id);
CREATE INDEX idx_session_turns_number ON session_turns(session_id, turn_number DESC);
CREATE INDEX idx_session_turns_status ON session_turns(status);

CREATE INDEX idx_session_events_session ON session_events(session_id);
CREATE INDEX idx_session_events_created ON session_events(created_at DESC);
CREATE INDEX idx_session_events_unprocessed ON session_events(is_processed, priority DESC, created_at);

CREATE INDEX idx_session_conflicts_session ON session_conflicts(session_id);
CREATE INDEX idx_session_conflicts_status ON session_conflicts(status);
CREATE INDEX idx_session_conflicts_created ON session_conflicts(created_at DESC);

CREATE INDEX idx_session_snapshots_session ON session_snapshots(session_id);
CREATE INDEX idx_session_snapshots_turn ON session_snapshots(session_id, turn_number DESC);
CREATE INDEX idx_session_snapshots_created ON session_snapshots(created_at DESC);

CREATE INDEX idx_session_messages_session ON session_messages(session_id);
CREATE INDEX idx_session_messages_created ON session_messages(created_at DESC);
CREATE INDEX idx_session_messages_participant ON session_messages(participant_id);

-- RLS Policies
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON shared_sessions
    FOR SELECT USING (auth.uid() = creator_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create their own sessions" ON shared_sessions
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions" ON shared_sessions
    FOR UPDATE USING (auth.uid() = creator_id);

-- Session participants can access session data
CREATE POLICY "Participants can view session" ON shared_sessions
    FOR SELECT USING (
        id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Participants can view session data
CREATE POLICY "Participants can view sessions they belong to" ON session_participants
    FOR SELECT USING (user_id = auth.uid());

-- Participants can insert themselves into sessions
CREATE POLICY "Users can join sessions" ON session_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Participants can update their own data
CREATE POLICY "Participants can update their data" ON session_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Session participants can access turns
CREATE POLICY "Participants can view session turns" ON session_turns
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Session participants can access events
CREATE POLICY "Participants can view session events" ON session_events
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Session participants can access conflicts
CREATE POLICY "Participants can view session conflicts" ON session_conflicts
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Session participants can access snapshots
CREATE POLICY "Participants can view session snapshots" ON session_snapshots
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Session participants can access messages
CREATE POLICY "Participants can view session messages" ON session_messages
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Participants can send messages
CREATE POLICY "Participants can send messages" ON session_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        participant_id IN (
            SELECT id FROM session_participants 
            WHERE session_id = session_messages.session_id AND user_id = auth.uid()
        )
    );

-- Create function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shared_sessions 
    SET last_activity = now(), updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity tracking
CREATE TRIGGER update_session_activity_on_turn
    AFTER INSERT OR UPDATE ON session_turns
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

CREATE TRIGGER update_session_activity_on_message
    AFTER INSERT ON session_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- Create function to generate unique session codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    WHILE attempts < max_attempts LOOP
        code := UPPER(
            substr(
                regexp_replace(
                    encode(gen_random_bytes(4), 'hex'), 
                    '[^A-Z0-9]', '', 'g'
                ), 1, 6
            )
        );
        
        IF NOT EXISTS (SELECT 1 FROM shared_sessions WHERE session_code = code) THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
    END LOOP;
    
    RAISE EXCEPTION 'Failed to generate unique session code after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate session statistics
CREATE OR REPLACE FUNCTION calculate_session_stats(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_participants', COUNT(*) FILTER (WHERE status = 'active'),
        'online_participants', COUNT(*) FILTER (WHERE is_online = true),
        'total_turns', (SELECT COUNT(*) FROM session_turns WHERE session_id = p_session_id),
        'average_turn_duration', (
            SELECT COALESCE(AVG(duration_seconds), 0) 
            FROM session_turns 
            WHERE session_id = p_session_id AND status = 'completed'
        ),
        'conflicts_count', (
            SELECT COUNT(*) 
            FROM session_conflicts 
            WHERE session_id = p_session_id AND status = 'active'
        ),
        'last_activity', (
            SELECT MAX(created_at) 
            FROM session_events 
            WHERE session_id = p_session_id
        )
    ) INTO result
    FROM session_participants 
    WHERE session_id = p_session_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON shared_sessions TO authenticated;
GRANT ALL ON session_participants TO authenticated;
GRANT ALL ON session_turns TO authenticated;
GRANT ALL ON session_events TO authenticated;
GRANT ALL ON session_conflicts TO authenticated;
GRANT ALL ON session_snapshots TO authenticated;
GRANT ALL ON session_messages TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
