import { SceneState, PlayerIntent, DMAction } from '../scene/types';
import { WorldEntity, WorldRelationship, WorldFact } from '../world/types';

// Session configuration
export interface SharedSession {
  id: string;
  sessionCode: string;
  name: string;
  description?: string;
  creatorId: string;
  isPublic: boolean;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'archived';
  gameState: SceneState;
  worldSnapshot: WorldSessionSnapshot;
  settings: SessionSettings;
  participants: SessionParticipant[];
  currentTurn?: TurnState;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface WorldSessionSnapshot {
  entities: WorldEntity[];
  relationships: WorldRelationship[];
  facts: WorldFact[];
  metrics: {
    entityCount: number;
    relationshipCount: number;
    factCount: number;
    averageConfidence: number;
  };
  timestamps: {
    snapshotTime: Date;
    lastEntityUpdate: Date;
    lastRelationshipUpdate: Date;
    lastFactUpdate: Date;
  };
}

export interface SessionSettings {
  allowSpectators: boolean;
  requireApproval: boolean;
  autoSaveInterval: number; // seconds
  turnTimeLimit: number; // seconds
  synchronizationMode: 'realtime' | 'turn_based' | 'hybrid';
  conflictResolution: 'automatic' | 'vote' | 'dm_override';
  spectatorDelay: number; // seconds delay for spectators
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: 'player' | 'dm' | 'spectator';
  status: 'invited' | 'joined' | 'active' | 'away' | 'disconnected' | 'left';
  displayName: string;
  characterId?: string;
  
  // Permissions
  permissions: ParticipantPermissions;
  
  // Connection state
  connectionState: ConnectionState;
  
  // Readiness
  isTurnReady: boolean;
  isSynchronized: boolean;
  
  // Timestamps
  joinedAt: Date;
  leftAt?: Date;
  lastSeen: Date;
}

export interface ParticipantPermissions {
  canControlEntities: boolean;
  canWorldBuild: boolean;
  canInvitePlayers: boolean;
  canModerateChat: boolean;
  canPauseGame: boolean;
  canEndSession: boolean;
  canResolveConflicts: boolean;
}

export interface ConnectionState {
  isOnline: boolean;
  connectionId?: string;
  lastPing: Date;
  latency: number;
  lostPackets: number;
}

// Turn management
export interface TurnState {
  id: string;
  sessionId: string;
  turnNumber: number;
  participantId: string;
  characterId?: string;
  turnType: TurnType;
  
  // Turn content
  action: PlayerIntent;
  response?: DMAction;
  worldChanges: WorldChange[];
  
  // Timing
  startedAt: Date;
  endsAt: Date;
  duration?: number;
  timeRemaining: number;
  
  // State
  status: TurnStatus;
  isCompleted: boolean;
  isSkipped: boolean;
  
  // Synchronization
  synchronizedParticipants: string[];
  pendingParticipants: string[];
}

export type TurnType = 'action' | 'dialogue' | 'movement' | 'combat' | 'rest' | 'exploration' | 'social';

export type TurnStatus = 'pending' | 'active' | 'waiting' | 'completed' | 'skipped' | 'timeout' | 'conflict';

// World changes
export interface WorldChange {
  type: 'entity_created' | 'entity_updated' | 'entity_removed' | 
        'relationship_created' | 'relationship_updated' | 'relationship_removed' |
        'fact_created' | 'fact_updated' | 'fact_removed';
  entityId?: string;
  relationshipId?: string;
  factId?: string;
  
  // Change details
  oldValue?: any;
  newValue?: any;
  participantId: string;
  timestamp: Date;
  
  // Metadata
  reason?: string;
  confidence?: number;
}

// Synchronization
export interface SynchronizationState {
  sessionId: string;
  version: string;
  timestamp: Date;
  
  // Participant sync status
  participantSyncs: ParticipantSync[];
  
  // Conflict status
  pendingConflicts: SessionConflict[];
  resolvedConflicts: SessionConflict[];
  
  // Global state
  isSynchronized: boolean;
  synchronizationProgress: number;
}

export interface ParticipantSync {
  participantId: string;
  lastSyncedTurn: number;
  isCurrent: boolean;
  pendingChanges: WorldChange[];
  conflicts: string[];
}

// Conflicts
export interface SessionConflict {
  id: string;
  sessionId: string;
  conflictType: ConflictType;
  status: ConflictStatus;
  
  // Conflict details
  initiatorId: string;
  affectedParticipants: string[];
  
  // Conflicting data
  originalAction: TurnState;
  proposedResolution?: TurnState;
  conflictingStates: TurnState[];
  
  // Resolution
  resolvedBy?: string;
  resolutionMethod?: ResolutionMethod;
  resolutionVotes?: ConflictVote[];
  
  // Timing
  createdAt: Date;
  deadline?: Date;
  resolvedAt?: Date;
  
  // Metadata
  severity: 'low' | 'medium' | 'high';
  canProceed: boolean;
}

export type ConflictType = 
  | 'character_action'      // Multiple participants try to control same character
  | 'world_state'          // Conflicting world state changes
  | 'narrative'            // Conflicting narrative descriptions
  | 'rules'               // Rules interpretation conflicts
  | 'turn_order'          // Turn sequence conflicts
  | 'timeout'             // Turn timeout conflicts
  | 'resources'           // Resource allocation conflicts;

export type ConflictStatus = 'active' | 'resolved' | 'escalated' | 'ignored' | 'expired';

export type ResolutionMethod = 'vote' | 'dm_override' | 'auto_resolve' | 'negotiated' | 'timeout';

export interface ConflictVote {
  participantId: string;
  choice: 'accept' | 'reject' | 'abstain';
  reason?: string;
  timestamp: Date;
}

// Events
export interface SessionEvent {
  id: string;
  sessionId: string;
  participantId?: string;
  eventType: SessionEventType;
  
  // Event content
  data: Record<string, any>;
  message: string;
  
  // Targeting
  targetParticipants?: string[];
  isBroadcast: boolean;
  isSystem: boolean;
  
  // Processing
  priority: number;
  processed: boolean;
  processedAt?: Date;
  
  // Timestamps
  createdAt: Date;
}

export type SessionEventType = 
  | 'player_joined'
  | 'player_left'
  | 'player_disconnected'
  | 'player_reconnected'
  | 'turn_started'
  | 'turn_completed'
  | 'turn_skipped'
  | 'turn_timeout'
  | 'world_updated'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'chat_message'
  | 'system_message'
  | 'error'
  | 'state_sync'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  | 'snapshot_created';

// Chat/Communication
export interface SessionMessage {
  id: string;
  sessionId: string;
  participantId?: string;
  
  // Message details
  messageType: MessageType;
  content: string;
  metadata?: Record<string, any>;
  
  // Targeting
  isPrivate: boolean;
  targetParticipants?: string[];
  
  // Moderation
  isEdited: boolean;
  isDeleted: boolean;
  moderatedBy?: string;
  
  // Timestamps
  createdAt: Date;
  editedAt?: Date;
}

export type MessageType = 
  | 'chat'         // Regular chat message
  | 'action'       // Player action description
  | 'ooc'          // Out of character
  | 'dice_roll'    // Dice roll result
  | 'system'       // System message
  | 'error'        // Error message
  | 'announcement' // DM announcement;

// Snapshots and Recovery
export interface SessionSnapshot {
  id: string;
  sessionId: string;
  turnNumber: number;
  
  // State data
  gameState: SceneState;
  worldState: WorldSessionSnapshot;
  participantStates: Record<string, ParticipantState>;
  
  // Snapshot metadata
  type: SnapshotType;
  version: string;
  checksum: string;
  size: number;
  
  // Timestamps
  createdAt: Date;
}

export type SnapshotType = 'auto' | 'manual' | 'turn_end' | 'crash' | 'conflict';

export interface ParticipantState {
  participantId: string;
  lastSyncedTurn: number;
  localState: Record<string, any>;
  pendingActions: PlayerIntent[];
  confidence: number;
}

// Request/Response types
export interface CreateSessionRequest {
  name: string;
  description?: string;
  settings?: Partial<SessionSettings>;
  initialState?: Partial<SceneState>;
}

export interface JoinSessionRequest {
  sessionCode: string;
  displayName: string;
  role?: 'player' | 'spectator';
  characterId?: string;
}

export interface UpdateParticipantRequest {
  participantId: string;
  updates: Partial<SessionParticipant>;
}

export interface SubmitTurnRequest {
  participantId: string;
  action: PlayerIntent;
  metadata?: Record<string, any>;
}

export interface ResolveConflictRequest {
  conflictId: string;
  resolution: TurnState;
  method: ResolutionMethod;
  reason?: string;
}

export interface SendMessageRequest {
  participantId: string;
  content: string;
  messageType?: MessageType;
  targetParticipants?: string[];
  isPrivate?: boolean;
}

// Result types
export interface SessionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Utility types
export interface SessionStats {
  totalParticipants: number;
  onlineParticipants: number;
  totalTurns: number;
  averageTurnDuration: number;
  conflictsCount: number;
  lastActivity: Date;
  uptime: number;
  messageCount: number;
}

export interface SessionSearchOptions {
  isPublic?: boolean;
  status?: SharedSession['status'];
  maxParticipants?: number;
  creatorId?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface TurnOrder {
  participantIds: string[];
  currentTurnIndex: number;
  startIndex: number;
  cycleCount: number;
}

export interface SynchronizationRequest {
  participantId: string;
  fromTurn?: number;
  includeFullState?: boolean;
}

export interface SynchronizationResponse {
  gameState: SceneState;
  worldState: WorldSessionSnapshot;
  participantStates: Record<string, ParticipantState>;
  missingTurns: TurnState[];
  conflicts: SessionConflict[];
  version: string;
  timestamp: Date;
}
