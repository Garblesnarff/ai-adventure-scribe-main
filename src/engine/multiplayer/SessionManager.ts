import { logger } from '../../lib/logger';
import {
  SharedSession,
  SessionParticipant,
  TurnState,
  SessionSettings,
  SessionEvent,
  SessionConflict,
  WorldSessionSnapshot,
  CreateSessionRequest,
  JoinSessionRequest,
  SessionResult,
  ValidationResult,
  SessionStats,
  TurnOrder,
  SynchronizationState,
  ConnectionState,
  ParticipantSync,
  ConflictType,
  ConflictStatus,
  TurnStatus,
  SessionEventType
} from './types';
import { SceneState, PlayerIntent, DMAction } from '../scene/types';
import { WorldGraph } from '../world/graph';
import { append, markProcessed } from '../scene/event-log';

/**
 * Core multiplayer session management system
 * Handles session lifecycle, participant management, and state synchronization
 */
export class SessionManager {
  private sessions: Map<string, SharedSession> = new Map();
  private participantsByUser: Map<string, SessionParticipant[]> = new Map();
  private events: SessionEvent[] = [];
  private conflicts: SessionConflict[] = [];
  private worldGraphs: Map<string, WorldGraph> = new Map();

  constructor() {
    // Initialize logging for multiplayer
    markProcessed('multiplayer-session-initialized');
    append({
      id: 'multiplayer-init',
      eventType: 'system',
      timestamp: new Date(),
      data: { message: 'Multiplayer session manager initialized' }
    });
  }

  /**
   * Create a new shared session
   */
  async createSession(request: CreateSessionRequest, creatorId: string): Promise<SessionResult<SharedSession>> {
    try {
      // Validate request
      const validation = this.validateSessionRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Generate unique session code
      const sessionCode = this.generateSessionCode();
      const sessionId = this.generateId();

      // Create session settings
      const settings: SessionSettings = {
        allowSpectators: false,
        requireApproval: false,
        autoSaveInterval: 300, // 5 minutes
        turnTimeLimit: 300, // 5 minutes
        synchronizationMode: 'turn_based',
        conflictResolution: 'vote',
        spectatorDelay: 30, // 30 seconds
        ...request.settings
      };

      // Create initial game state
      const initialGameState: SceneState = {
        id: sessionId,
        sessionId,
        turnCount: 0,
        roundCount: 1,
        phase: 'setup',
        isActive: false,
        currentPlayer: null,
        participants: [],
        metadata: {
          startTime: new Date(),
          creatorId,
          sessionName: request.name
        },
        gameState: {
          scene: 'preparation',
          location: 'session_lobby',
          weather: 'clear',
          timeOfDay: 'day'
        }
      };

      // Create world graph for session
      const worldGraph = new WorldGraph(sessionId);
      this.worldGraphs.set(sessionId, worldGraph);

      const initialWorldSnapshot: WorldSessionSnapshot = {
        entities: [],
        relationships: [],
        facts: [],
        metrics: {
          entityCount: 0,
          relationshipCount: 0,
          factCount: 0,
          averageConfidence: 0
        },
        timestamps: {
          snapshotTime: new Date(),
          lastEntityUpdate: new Date(),
          lastRelationshipUpdate: new Date(),
          lastFactUpdate: new Date()
        }
      };

      // Create creator participant
      const creatorParticipant: SessionParticipant = {
        id: this.generateId(),
        sessionId,
        userId: creatorId,
        role: 'dm',
        status: 'active',
        displayName: this.extractDisplayNameFromUser(creatorId),
        permissions: {
          canControlEntities: true,
          canWorldBuild: true,
          canInvitePlayers: true,
          canModerateChat: true,
          canPauseGame: true,
          canEndSession: true,
          canResolveConflicts: true
        },
        connectionState: {
          isOnline: true,
          lastPing: new Date(),
          latency: 0,
          lostPackets: 0
        },
        isTurnReady: false,
        isSynchronized: true,
        joinedAt: new Date(),
        lastSeen: new Date()
      };

      // Create session
      const session: SharedSession = {
        id: sessionId,
        sessionCode,
        name: request.name,
        description: request.description,
        creatorId,
        isPublic: false,
        maxPlayers: 4,
        currentPlayers: 1,
        status: 'waiting',
        gameState: initialGameState,
        worldSnapshot: initialWorldSnapshot,
        settings,
        participants: [creatorParticipant],
        
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      };

      // Store session
      this.sessions.set(sessionId, session);
      this.trackParticipant(creatorParticipant);

      // Log creation event
      await this.logSessionEvent(sessionId, {
        eventType: 'system_message',
        data: {
          action: 'session_created',
          creatorId,
          sessionCode
        },
        message: `Session "${request.name}" created by ${creatorParticipant.displayName}`,
        isSystem: true,
        isBroadcast: true
      });

      // Initialize world graph state
      await this.initializeWorldGraph(sessionId, request.initialState);

      return {
        success: true,
        data: session
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating session'
      };
    }
  }

  /**
   * Join an existing session
   */
  async joinSession(request: JoinSessionRequest, userId: string): Promise<SessionResult<SessionParticipant>> {
    try {
      // Find session by code
      const session = Array.from(this.sessions.values())
        .find(s => s.sessionCode === request.sessionCode);

      if (!session) {
        return {
          success: false,
          error: 'Invalid session code'
        };
      }

      // Check if user can join
      const validation = this.validateJoinRequest(session, request, userId);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      // Create participant
      const participant: SessionParticipant = {
        id: this.generateId(),
        sessionId: session.id,
        userId,
        role: request.role || 'player',
        status: session.settings.requireApproval ? 'invited' : 'joined',
        displayName: request.displayName,
        characterId: request.characterId,
        permissions: this.getDefaultPermissions(request.role || 'player'),
        connectionState: {
          isOnline: true,
          lastPing: new Date(),
          latency: 0,
          lostPackets: 0
        },
        isTurnReady: false,
        isSynchronized: false,
        joinedAt: new Date(),
        lastSeen: new Date()
      };

      // Add participant to session
      session.participants.push(participant);
      session.currentPlayers = session.participants.filter(p => 
        ['active', 'joined'].includes(p.status)
      ).length;
      session.lastActivity = new Date();
      session.updatedAt = new Date();

      // Track participant
      this.trackParticipant(participant);

      // Log join event
      await this.logSessionEvent(session.id, {
        eventType: 'player_joined',
        participantId: participant.id,
        data: {
          userId,
          displayName: request.displayName,
          role: participant.role
        },
        message: `${participant.displayName} joined the session`,
        isBroadcast: true
      });

      // If session is waiting and has minimum players, activate it
      if (session.status === 'waiting' && session.currentPlayers >= session.maxPlayers * 0.5) {
        await this.activateSession(session.id);
      }

      return {
        success: true,
        data: participant
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error joining session'
      };
    }
  }

  /**
   * Submit a turn action
   */
  async submitTurn(sessionId: string, participantId: string, action: PlayerIntent): Promise<SessionResult<TurnState>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      const participant = session.participants.find(p => p.id === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found'
        };
      }

      if (!this.canAct(sessionId, participantId)) {
        return {
          success: false,
          error: 'Participant cannot act at this time'
        };
      }

      // Create turn state
      const turnState: TurnState = {
        id: this.generateId(),
        sessionId,
        turnNumber: session.gameState.turnCount + 1,
        participantId,
        characterId: participant.characterId,
        turnType: this.inferTurnType(action),
        action,
        worldChanges: [],
        startedAt: new Date(),
        endsAt: new Date(Date.now() + session.settings.turnTimeLimit * 1000),
        timeRemaining: session.settings.turnTimeLimit,
        status: 'active',
        isCompleted: false,
        isSkipped: false,
        synchronizedParticipants: [], // Will be populated during processing
        pendingParticipants: session.participants
          .filter(p => p.status === 'active' && p.id !== participantId)
          .map(p => p.id)
      };

      // Process turn through world graph
      const worldGraph = this.worldGraphs.get(sessionId);
      if (worldGraph) {
        await this.processTurnThroughWorld(worldGraph, action, participantId);
      }

      // Update session state
      session.currentTurn = turnState;
      session.gameState.turnCount += 1;
      session.gameState.currentPlayer = participantId;
      session.lastActivity = new Date();
      session.updatedAt = new Date();

      // Log turn event
      await this.logSessionEvent(sessionId, {
        eventType: 'turn_started',
        participantId,
        data: {
          turnNumber: turnState.turnNumber,
          action,
          timeLimit: session.settings.turnTimeLimit
        },
        message: `${participant.displayName} started turn ${turnState.turnNumber}`,
        isBroadcast: true
      });

      // Start turn timeout if configured
      this.scheduleTurnTimeout(sessionId, turnState.id, session.settings.turnTimeLimit * 1000);

      return {
        success: true,
        data: turnState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error submitting turn'
      };
    }
  }

  /**
   * Complete current turn
   */
  async completeTurn(sessionId: string, participantId: string, response?: DMAction): Promise<SessionResult<TurnState>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.currentTurn) {
        return {
          success: false,
          error: 'No active turn found'
        };
      }

      const turn = session.currentTurn;
      if (turn.participantId !== participantId) {
        return {
          success: false,
          error: 'Cannot complete another participant\'s turn'
        };
      }

      // Finalize turn
      turn.response = response;
      turn.status = 'completed';
      turn.isCompleted = true;
      turn.endedAt = new Date();
      turn.duration = turn.endedAt.getTime() - turn.startedAt.getTime();
      turn.timeRemaining = 0;

      // Update session state
      session.gameState.currentPlayer = null;
      session.lastActivity = new Date();
      session.updatedAt = new Date();

      // Check for conflicts
      await this.checkForTurnConflicts(sessionId, turn);

      // Log completion event
      await this.logSessionEvent(sessionId, {
        eventType: 'turn_completed',
        participantId,
        data: {
          turnNumber: turn.turnNumber,
          duration: turn.duration,
          response
        },
        message: `${session.participants.find(p => p.id === participantId)?.displayName} completed turn ${turn.turnNumber}`,
        isBroadcast: true
      });

      // Update world snapshot
      await this.updateWorldSnapshot(sessionId);

      // Start next turn if applicable
      await this.startNextTurn(sessionId);

      return {
        success: true,
        data: turn
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error completing turn'
      };
    }
  }

  /**
   * Get session synchronization state
   */
  async getSynchronizationState(sessionId: string): Promise<SynchronizationState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participantSyncs: ParticipantSync[] = session.participants.map(participant => ({
      participantId: participant.id,
      lastSyncedTurn: session.gameState.turnCount,
      isCurrent: participant.isSynchronized,
      pendingChanges: [], // Would be populated from actual change tracking
      conflicts: this.conflicts
        .filter(c => c.sessionId === sessionId && c.affectedParticipants.includes(participant.id))
        .map(c => c.id)
    }));

    const pendingConflicts = this.conflicts.filter(c => 
      c.sessionId === sessionId && c.status === 'active'
    );

    const resolvedConflicts = this.conflicts.filter(c => 
      c.sessionId === sessionId && c.status === 'resolved'
    );

    const totalParticipants = participantSyncs.length;
    const synchronizedParticipants = participantSyncs.filter(p => p.isCurrent).length;
    const synchronizationProgress = totalParticipants > 0 ? synchronizedParticipants / totalParticipants : 1;

    return {
      sessionId,
      version: session.gameState.turnCount.toString(),
      timestamp: new Date(),
      participantSyncs,
      pendingConflicts,
      resolvedConflicts,
      isSynchronized: synchronizationProgress >= 0.9,
      synchronizationProgress
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const onlineParticipants = session.participants.filter(p => p.connectionState.isOnline).length;
    const totalTurns = session.gameState.turnCount;
    const conflictsCount = this.conflicts.filter(c => c.sessionId === sessionId && c.status === 'active').length;
    
    const uptime = session.endedAt ? 
      session.endedAt.getTime() - session.createdAt.getTime() :
      Date.now() - session.createdAt.getTime();

    const messageCount = this.events.filter(e => 
      e.sessionId === sessionId && (e.eventType === 'chat_message' || e.eventType === 'action')
    ).length;

    return {
      totalParticipants: session.participants.length,
      onlineParticipants,
      totalTurns,
      averageTurnDuration: totalTurns > 0 ? uptime / totalTurns : 0,
      conflictsCount,
      lastActivity: session.lastActivity,
      uptime,
      messageCount
    };
  }

  // Private helper methods

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private validateSessionRequest(request: CreateSessionRequest): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!request.name || request.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Session name must be at least 3 characters long',
        severity: 'error',
        code: 'NAME_TOO_SHORT'
      });
    }

    if (request.name && request.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Session name cannot exceed 100 characters',
        severity: 'error',
        code: 'NAME_TOO_LONG'
      });
    }

    if (request.description && request.description.length > 500) {
      warnings.push({
        field: 'description',
        message: 'Description is quite long, consider shortening it',
        suggestion: 'Keep description under 300 characters for better readability'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: []
    };
  }

  private validateJoinRequest(session: SharedSession, request: JoinSessionRequest, userId: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!request.displayName || request.displayName.trim().length < 2) {
      errors.push({
        field: 'displayName',
        message: 'Display name must be at least 2 characters long',
        severity: 'error'
      });
    }

    if (session.currentPlayers >= session.maxPlayers) {
      errors.push({
        field: 'session',
        message: 'Session is full',
        severity: 'error'
      });
    }

    // Check if user already in session
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      errors.push({
        field: 'user',
        message: 'User already joined this session',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: []
    };
  }

  private async logSessionEvent(sessionId: string, eventData: {
    eventType: SessionEventType;
    participantId?: string;
    data: Record<string, any>;
    message: string;
    isBroadcast?: boolean;
    isSystem?: boolean;
  }): Promise<void> {
    const event: SessionEvent = {
      id: this.generateId(),
      sessionId,
      participantId: eventData.participantId,
      eventType: eventData.eventType,
      data: eventData.data,
      message: eventData.message,
      targetParticipants: [],
      isBroadcast: eventData.isBroadcast || false,
      isSystem: eventData.isSystem || false,
      priority: 0,
      processed: false,
      createdAt: new Date()
    };

    this.events.push(event);
    append({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.createdAt,
      data: { sessionId, event }
    });
  }

  private extractDisplayNameFromUser(userId: string): string {
    // In a real implementation, this would query the user's profile
    return `User-${userId.substr(0, 8)}`;
  }

  private getDefaultPermissions(role: 'player' | 'dm' | 'spectator') {
    const basePermissions = {
      canControlEntities: false,
      canWorldBuild: false,
      canInvitePlayers: false,
      canModerateChat: false,
      canPauseGame: false,
      canEndSession: false,
      canResolveConflicts: false
    };

    if (role === 'player') {
      return {
        ...basePermissions,
        canControlEntities: true,
        canInvitePlayers: true
      };
    }

    if (role === 'dm') {
      return {
        ...basePermissions,
        canControlEntities: true,
        canWorldBuild: true,
        canInvitePlayers: true,
        canModerateChat: true,
        canPauseGame: true,
        canEndSession: true,
        canResolveConflicts: true
      };
    }

    return basePermissions; // spectator
  }

  private trackParticipant(participant: SessionParticipant): void {
    const userId = participant.userId;
    if (!this.participantsByUser.has(userId)) {
      this.participantsByUser.set(userId, []);
    }
    this.participantsByUser.get(userId)!.push(participant);
  }

  private async initializeWorldGraph(sessionId: string, initialState?: any): Promise<void> {
    const worldGraph = this.worldGraphs.get(sessionId);
    if (!worldGraph) return;

    // Initialize world with basic defaults
    if (initialState) {
      // Apply initial state to world graph
    }
  }

  private async activateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'waiting') return;

    session.status = 'active';
    session.startedAt = new Date();
    session.gameState.isActive = true;
    session.gameState.phase = 'combat'; // or appropriate initial phase

    await this.logSessionEvent(sessionId, {
      eventType: 'system_message',
      data: { action: 'session_activated' },
      message: 'Session activated',
      isSystem: true,
      isBroadcast: true
    });
  }

  private canAct(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return false;

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant || !participant.permissions.canControlEntities) return false;

    // Check if it's this participant's turn
    return session.currentTurn?.participantId === participantId;
  }

  private inferTurnType(action: PlayerIntent): TurnState['turnType'] {
    // Simple inference based on action content
    const content = action.content?.toLowerCase() || '';
    
    if (content.includes('attack') || content.includes('fight') || content.includes('cast')) {
      return 'combat';
    }
    if (content.includes('move') || content.includes('go') || content.includes('walk')) {
      return 'movement';
    }
    if (content.includes('talk') || content.includes('say') || content.includes('ask')) {
      return 'dialogue';
    }
    if (content.includes('rest') || content.includes('sleep') || content.includes('camp')) {
      return 'rest';
    }
    
    return 'action';
  }

  private async processTurnThroughWorld(worldGraph: WorldGraph, action: PlayerIntent, participantId: string): Promise<void> {
    // Process action through world graph
    // This would integrate with the world orchestrator
  }

  private async updateWorldSnapshot(sessionId: string): Promise<void> {
    const worldGraph = this.worldGraphs.get(sessionId);
    const session = this.sessions.get(sessionId);
    if (!worldGraph || !session) return;

    session.worldSnapshot = worldGraph.createSnapshot();
  }

  private scheduleTurnTimeout(sessionId: string, turnId: string, delay: number): void {
    setTimeout(async () => {
      try {
        const session = this.sessions.get(sessionId);
        if (!session || !session.currentTurn || session.currentTurn.id !== turnId) {
          return; // Turn already completed or different turn
        }

        await this.handleTurnTimeout(sessionId, turnId);
      } catch (error) {
        logger.error('Error handling turn timeout:', error);
      }
    }, delay);
  }

  private async handleTurnTimeout(sessionId: string, turnId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTurn) return;

    const turn = session.currentTurn;
    turn.status = 'timeout';
    turn.timeRemaining = 0;
    turn.isSkipped = true;

    await this.logSessionEvent(sessionId, {
      eventType: 'turn_timeout',
      participantId: turn.participantId,
      data: { turnNumber: turn.turnNumber },
      message: `Turn ${turn.turnNumber} timed out and was skipped`,
      isBroadcast: true
    });

    await this.completeTurn(sessionId, turn.participantId);
  }

  private async checkForTurnConflicts(sessionId: string, turn: TurnState): Promise<void> {
    // Check for conflicts with other participants' actions
    // Implementation would depend on specific conflict detection logic
  }

  private async startNextTurn(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Simple round-robin turn order
    const activeParticipants = session.participants.filter(p => 
      p.status === 'active' && p.permissions.canControlEntities
    );

    if (activeParticipants.length === 0) return;

    const currentIndex = session.currentTurn ? 
      activeParticipants.findIndex(p => p.id === session.currentTurn!.participantId) : -1;
    
    const nextIndex = (currentIndex + 1) % activeParticipants.length;
    const nextParticipant = activeParticipants[nextIndex];

    // Create next turn (or end session if back to creator and session complete)
    // This would involve more sophisticated turn management in a real implementation
  }
}
