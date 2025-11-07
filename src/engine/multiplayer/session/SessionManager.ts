import { logger } from '../../../lib/logger';
import {
  SharedSession,
  SessionParticipant,
  TurnState,
  SessionSettings,
  SessionEvent,
  WorldSessionSnapshot,
  CreateSessionRequest,
  JoinSessionRequest,
  SessionResult,
  ValidationResult,
  SessionStats,
  SynchronizationState,
  ParticipantSync
} from '../types';
import { SceneState, PlayerIntent, DMAction } from '../../scene/types';
import { WorldGraph } from '../../world/graph';
import { append, markProcessed } from '../../scene/event-log';
import { ConnectionManager } from './ConnectionManager';
import { ParticipantTracker } from './ParticipantTracker';
import { SessionPersistence } from './SessionPersistence';
import { StateSync } from './StateSync';

/**
 * Core session manager facade
 * Orchestrates session lifecycle using modular components
 */
export class SessionManager {
  private sessions: Map<string, SharedSession> = new Map();
  private worldGraphs: Map<string, WorldGraph> = new Map();
  private events: SessionEvent[] = [];

  // Sub-managers
  private connectionManager: ConnectionManager;
  private participantTracker: ParticipantTracker;
  private persistence: SessionPersistence;
  private stateSync: StateSync;

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.participantTracker = new ParticipantTracker();
    this.persistence = new SessionPersistence();
    this.stateSync = new StateSync();

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
      const validation = this.validateSessionRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const sessionCode = this.generateSessionCode();
      const sessionId = this.generateId();

      const settings: SessionSettings = {
        allowSpectators: false,
        requireApproval: false,
        autoSaveInterval: 300,
        turnTimeLimit: 300,
        synchronizationMode: 'turn_based',
        conflictResolution: 'vote',
        spectatorDelay: 30,
        ...request.settings
      };

      const initialGameState = this.createInitialGameState(sessionId, creatorId, request.name);
      const worldGraph = new WorldGraph(sessionId);
      this.worldGraphs.set(sessionId, worldGraph);

      const creatorParticipant = this.createCreatorParticipant(sessionId, creatorId);

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
        worldSnapshot: this.createInitialWorldSnapshot(),
        settings,
        participants: [creatorParticipant],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionId, session);
      this.participantTracker.addParticipant(sessionId, creatorParticipant);

      await this.logSessionEvent(sessionId, {
        eventType: 'system_message',
        data: { action: 'session_created', creatorId, sessionCode },
        message: `Session "${request.name}" created`,
        isSystem: true,
        isBroadcast: true
      });

      return { success: true, data: session };
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
      const session = Array.from(this.sessions.values())
        .find(s => s.sessionCode === request.sessionCode);

      if (!session) {
        return { success: false, error: 'Invalid session code' };
      }

      const validation = this.validateJoinRequest(session, request, userId);
      if (!validation.valid) {
        return { success: false, error: validation.errors.map(e => e.message).join(', ') };
      }

      const participant: SessionParticipant = {
        id: this.generateId(),
        sessionId: session.id,
        userId,
        role: request.role || 'player',
        status: session.settings.requireApproval ? 'invited' : 'joined',
        displayName: request.displayName,
        characterId: request.characterId,
        permissions: this.participantTracker.getDefaultPermissions(request.role || 'player'),
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

      session.participants.push(participant);
      session.currentPlayers = session.participants.filter(p =>
        ['active', 'joined'].includes(p.status)
      ).length;
      session.updatedAt = new Date();
      session.lastActivity = new Date();

      this.participantTracker.addParticipant(session.id, participant);

      await this.logSessionEvent(session.id, {
        eventType: 'player_joined',
        participantId: participant.id,
        data: { userId, displayName: request.displayName, role: participant.role },
        message: `${participant.displayName} joined the session`,
        isBroadcast: true
      });

      if (session.status === 'waiting' && session.currentPlayers >= session.maxPlayers * 0.5) {
        await this.activateSession(session.id);
      }

      return { success: true, data: participant };
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
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    const participant = this.participantTracker.getParticipant(sessionId, participantId);
    if (!participant) return { success: false, error: 'Participant not found' };

    const turnState = this.createTurnState(session, participant, action);

    session.currentTurn = turnState;
    session.gameState.turnCount += 1;
    session.gameState.currentPlayer = participantId;
    session.lastActivity = new Date();
    session.updatedAt = new Date();

    await this.logSessionEvent(sessionId, {
      eventType: 'turn_started',
      participantId,
      data: { turnNumber: turnState.turnNumber, action },
      message: `${participant.displayName} started turn ${turnState.turnNumber}`,
      isBroadcast: true
    });

    return { success: true, data: turnState };
  }

  /**
   * Complete current turn
   */
  async completeTurn(sessionId: string, participantId: string, response?: DMAction): Promise<SessionResult<TurnState>> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTurn) {
      return { success: false, error: 'No active turn found' };
    }

    const turn = session.currentTurn;
    turn.response = response;
    turn.status = 'completed';
    turn.isCompleted = true;
    turn.endedAt = new Date();
    turn.duration = turn.endedAt.getTime() - turn.startedAt.getTime();

    session.gameState.currentPlayer = null;
    session.lastActivity = new Date();

    await this.persistence.saveSession(session);

    return { success: true, data: turn };
  }

  /**
   * Get session synchronization state
   */
  async getSynchronizationState(sessionId: string): Promise<SynchronizationState> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const participantSyncs: ParticipantSync[] = session.participants.map(p => ({
      participantId: p.id,
      lastSyncedTurn: session.gameState.turnCount,
      isCurrent: p.isSynchronized,
      pendingChanges: [],
      conflicts: []
    }));

    const syncHealth = this.stateSync.getSyncHealth(sessionId);

    return {
      sessionId,
      version: session.gameState.turnCount.toString(),
      timestamp: new Date(),
      participantSyncs,
      pendingConflicts: this.stateSync.getPendingConflicts(sessionId),
      resolvedConflicts: this.stateSync.getResolvedConflicts(sessionId),
      isSynchronized: syncHealth.isHealthy,
      synchronizationProgress: syncHealth.isHealthy ? 1.0 : 0.8
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    return {
      totalParticipants: this.participantTracker.getParticipantCount(sessionId),
      onlineParticipants: this.connectionManager.getOnlineCount(sessionId),
      totalTurns: session.gameState.turnCount,
      averageTurnDuration: 0,
      conflictsCount: this.stateSync.getPendingConflicts(sessionId).length,
      lastActivity: session.lastActivity,
      uptime: Date.now() - session.createdAt.getTime(),
      messageCount: this.events.filter(e => e.sessionId === sessionId).length
    };
  }

  // Private helpers

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  private validateSessionRequest(request: CreateSessionRequest): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!request.name || request.name.trim().length < 3) {
      errors.push({ field: 'name', message: 'Session name must be at least 3 characters', severity: 'error' });
    }

    return { valid: errors.length === 0, errors, warnings, recommendations: [] };
  }

  private validateJoinRequest(session: SharedSession, request: JoinSessionRequest, userId: string): ValidationResult {
    const errors: any[] = [];

    if (!request.displayName || request.displayName.trim().length < 2) {
      errors.push({ field: 'displayName', message: 'Display name too short', severity: 'error' });
    }

    if (session.currentPlayers >= session.maxPlayers) {
      errors.push({ field: 'session', message: 'Session is full', severity: 'error' });
    }

    if (this.participantTracker.isUserInSession(session.id, userId)) {
      errors.push({ field: 'user', message: 'User already joined', severity: 'error' });
    }

    return { valid: errors.length === 0, errors, warnings: [], recommendations: [] };
  }

  private createInitialGameState(sessionId: string, creatorId: string, name: string): SceneState {
    return {
      id: sessionId,
      sessionId,
      turnCount: 0,
      roundCount: 1,
      phase: 'setup',
      isActive: false,
      currentPlayer: null,
      participants: [],
      metadata: { startTime: new Date(), creatorId, sessionName: name },
      gameState: { scene: 'preparation', location: 'session_lobby', weather: 'clear', timeOfDay: 'day' }
    };
  }

  private createInitialWorldSnapshot(): WorldSessionSnapshot {
    return {
      entities: [],
      relationships: [],
      facts: [],
      metrics: { entityCount: 0, relationshipCount: 0, factCount: 0, averageConfidence: 0 },
      timestamps: {
        snapshotTime: new Date(),
        lastEntityUpdate: new Date(),
        lastRelationshipUpdate: new Date(),
        lastFactUpdate: new Date()
      }
    };
  }

  private createCreatorParticipant(sessionId: string, creatorId: string): SessionParticipant {
    return {
      id: this.generateId(),
      sessionId,
      userId: creatorId,
      role: 'dm',
      status: 'active',
      displayName: `User-${creatorId.substr(0, 8)}`,
      permissions: this.participantTracker.getDefaultPermissions('dm'),
      connectionState: { isOnline: true, lastPing: new Date(), latency: 0, lostPackets: 0 },
      isTurnReady: false,
      isSynchronized: true,
      joinedAt: new Date(),
      lastSeen: new Date()
    };
  }

  private createTurnState(session: SharedSession, participant: SessionParticipant, action: PlayerIntent): TurnState {
    return {
      id: this.generateId(),
      sessionId: session.id,
      turnNumber: session.gameState.turnCount + 1,
      participantId: participant.id,
      characterId: participant.characterId,
      turnType: 'action',
      action,
      worldChanges: [],
      startedAt: new Date(),
      endsAt: new Date(Date.now() + session.settings.turnTimeLimit * 1000),
      timeRemaining: session.settings.turnTimeLimit,
      status: 'active',
      isCompleted: false,
      isSkipped: false,
      synchronizedParticipants: [],
      pendingParticipants: session.participants
        .filter(p => p.status === 'active' && p.id !== participant.id)
        .map(p => p.id)
    };
  }

  private async activateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'waiting') return;

    session.status = 'active';
    session.startedAt = new Date();
    session.gameState.isActive = true;

    await this.logSessionEvent(sessionId, {
      eventType: 'system_message',
      data: { action: 'session_activated' },
      message: 'Session activated',
      isSystem: true,
      isBroadcast: true
    });
  }

  private async logSessionEvent(sessionId: string, eventData: {
    eventType: any;
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
      isBroadcast: eventData.isBroadcast || false,
      isSystem: eventData.isSystem || false,
      priority: 0,
      processed: false,
      createdAt: new Date()
    };

    this.events.push(event);
    append({ id: event.id, eventType: event.eventType, timestamp: event.createdAt, data: { sessionId, event } });
  }
}
