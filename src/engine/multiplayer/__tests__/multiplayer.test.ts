import { SessionManager } from '../SessionManager';
import { TurnManager } from '../TurnManager';
import { SynchronizationManager } from '../SynchronizationManager';
import { WorldGraph } from '../../world/graph';
import {
  SharedSession,
  SessionParticipant,
  TurnState,
  SessionSettings,
  CreateSessionRequest,
  JoinSessionRequest,
  SessionEvent
} from '../types';
import { PlayerIntent } from '../../scene/types';

describe('Multiplayer Session Management', () => {
  let sessionManager: SessionManager;
  let turnManager: TurnManager;
  let syncManager: SynchronizationManager;
  let worldGraphs: Map<string, WorldGraph>;

  beforeEach(() => {
    worldGraphs = new Map();
    sessionManager = new SessionManager();
    turnManager = new TurnManager(worldGraphs);
    syncManager = new SynchronizationManager(worldGraphs);
  });

  describe('Session Creation', () => {
    it('should create a new session successfully', async () => {
      const request: CreateSessionRequest = {
        name: 'Test Session',
        description: 'A test multiplayer session',
        settings: {
          maxPlayers: 4,
          turnTimeLimit: 300,
          allowSpectators: true
        }
      };

      const result = await sessionManager.createSession(request, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Test Session');
      expect(result.data.creatorId).toBe('user-123');
      expect(result.data.status).toBe('waiting');
      expect(result.data.currentPlayers).toBe(1);
      expect(result.data.maxPlayers).toBe(4);
      expect(result.data.sessionCode).toHaveLength(6);
    });

    it('should validate session creation requests', async () => {
      const invalidRequest: CreateSessionRequest = {
        name: 'A', // Too short
        description: 'x'.repeat(600) // Too long
      };

      const result = await sessionManager.createSession(invalidRequest, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should default settings when not provided', async () => {
      const request: CreateSessionRequest = {
        name: 'Minimal Session'
      };

      const result = await sessionManager.createSession(request, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data.settings.turnTimeLimit).toBe(300);
      expect(result.data.settings.allowSpectators).toBe(false);
      expect(result.data.settings.requireApproval).toBe(false);
    });
  });

  describe('Session Joining', () => {
    let session: SharedSession;
    const creatorId = 'creator-123';

    beforeEach(async () => {
      const createResult = await sessionManager.createSession({
        name: 'Test Session',
        settings: { maxPlayers: 3 }
      }, creatorId);
      
      session = createResult.data!;
    });

    it('should allow players to join a session', async () => {
      const joinRequest: JoinSessionRequest = {
        sessionCode: session.sessionCode,
        displayName: 'TestPlayer',
        role: 'player'
      };

      const result = await sessionManager.joinSession(joinRequest, 'player-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.displayName).toBe('TestPlayer');
      expect(result.data.role).toBe('player');
      expect(result.data.status).toBe('joined');
    });

    it('should reject duplicate joins', async () => {
      const joinRequest: JoinSessionRequest = {
        sessionCode: session.sessionCode,
        displayName: 'TestPlayer'
      };

      // First join succeeds
      const firstResult = await sessionManager.joinSession(joinRequest, 'player-123');
      expect(firstResult.success).toBe(true);

      // Second join with same user fails
      const secondResult = await sessionManager.joinSession(joinRequest, 'player-123');
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already joined');
    });

    it('should reject joins to full sessions', async () => {
      // Fill the session with players
      const players = ['p1', 'p2'];
      for (const playerId of players) {
        await sessionManager.joinSession({
          sessionCode: session.sessionCode,
          displayName: `Player ${playerId}`
        }, playerId);
      }

      // Try to join when full (creator + 2 players = max 3)
      const result = await sessionManager.joinSession({
        sessionCode: session.sessionCode,
        displayName: 'Extra Player'
      }, 'extra-player');

      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });

    it('should handle spectators joining', async () => {
      const joinRequest: JoinSessionRequest = {
        sessionCode: session.sessionCode,
        displayName: 'Spectator',
        role: 'spectator'
      };

      // Update session to allow spectators
      session.settings.allowSpectators = true;

      const result = await sessionManager.joinSession(joinRequest, 'spectator-123');

      expect(result.success).toBe(true);
      expect(result.data.role).toBe('spectator');
      expect(result.data.permissions.canControlEntities).toBe(false);
    });
  });

  describe('Turn Management', () => {
    let sessionId: string;
    let participants: SessionParticipant[];

    beforeEach(async () => {
      const sessionResult = await sessionManager.createSession({
        name: 'Turn Test Session'
      }, 'dm-123');

      sessionId = sessionResult.data!.id;

      // Add participants
      const player1Result = await sessionManager.joinSession({
        sessionCode: sessionResult.data!.sessionCode,
        displayName: 'Player 1'
      }, 'player-1');

      const player2Result = await sessionManager.joinSession({
        sessionCode: sessionResult.data!.sessionCode,
        displayName: 'Player 2'
      }, 'player-2');

      participants = [
        sessionResult.data!.participants[0], // DM
        player1Result.data!,
        player2Result.data!
      ];

      // Initialize turn order
      turnManager.initializeTurnOrder(sessionId, participants);
    });

    it('should manage turn order correctly', () => {
      const turnOrder = turnManager.getTurnOrder(sessionId);

      expect(turnOrder).toBeDefined();
      expect(turnOrder.participantIds).toHaveLength(3);
      expect(turnOrder.currentTurnIndex).toBe(0);
      
      // DM should be first
      const dmId = participants.find(p => p.role === 'dm')!.id;
      expect(turnOrder!.participantIds[0]).toBe(dmId);
    });

    it('should start next turn successfully', async () => {
      const result = await turnManager.startNextTurn(sessionId, {
        ...sessionManager['sessions'].get(sessionId)!,
        settings: { turnTimeLimit: 60 } as SessionSettings,
        gameState: { turnCount: 0 } as any
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
      expect(result.data.timeRemaining).toBe(60);
    });

    it('should handle turn timeouts', async () => {
      jest.useFakeTimers();

      // Start a turn with short timeout
      const session = sessionManager['sessions'].get(sessionId)!;
      session.settings.turnTimeLimit = 1; // 1 second

      const result = await turnManager.startNextTurn(sessionId, session);
      expect(result.success).toBe(true);

      // Fast-forward time beyond timeout
      jest.advanceTimersByTime(1500);

      // Check that turn was skipped
      const updatedTurn = turnManager.getCurrentTurn(sessionId);
      expect(updatedTurn.status).toBe('timeout');
      expect(updatedTurn.isSkipped).toBe(true);

      jest.useRealTimers();
    });

    it('should track turn history', async () => {
      // Complete several turns
      for (let i = 0; i < 3; i++) {
        const turnResult = await turnManager.startNextTurn(sessionId, {
          ...sessionManager['sessions'].get(sessionId)!,
          settings: { turnTimeLimit: 60 } as SessionSettings,
          gameState: { turnCount: i } as any
        });

        if (turnResult.success) {
          await turnManager.skipTurn(sessionId, turnResult.data.participantId, 'Test completion');
        }
      }

      const history = turnManager.getTurnHistory(sessionId);
      expect(history).toHaveLength(3);
      expect(history[0].turnNumber).toBe(1);
      expect(history[1].turnNumber).toBe(2);
      expect(history[2].turnNumber).toBe(3);
    });

    it('should handle turn submission and completion', async () => {
      const turnResult = await turnManager.startNextTurn(sessionId, {
        ...sessionManager['sessions'].get(sessionId)!,
        settings: { turnTimeLimit: 60 } as SessionSettings,
        gameState: { turnCount: 0 } as any
      });

      expect(turnResult.success).toBe(true);
      
      const turn = turnResult.data!;
      const participantId = turn.participantId;

      // Submit action
      const action: PlayerIntent = {
        id: 'action-1',
        type: 'action',
        content: 'I attack the goblin',
        participantId,
        timestamp: new Date(),
        metadata: {}
      };

      const submitResult = await turnManager.submitTurnAction(sessionId, participantId, action);
      expect(submitResult.success).toBe(true);
      expect(turn.action.content).toBe('I attack the goblin');
      expect(turn.turnType).toBe('combat');

      // Complete turn
      const completeResult = await turnManager.completeTurn(sessionId, participantId);
      expect(completeResult.success).toBe(true);
      expect(completeResult.data.isCompleted).toBe(true);
    });
  });

  describe('Synchronization', () => {
    let sessionId: string;
    let participants: SessionParticipant[];

    beforeEach(async () => {
      const sessionResult = await sessionManager.createSession({
        name: 'Sync Test Session'
      }, 'dm-123');

      sessionId = sessionResult.data!.id;

      // Add participants
      const player1Result = await sessionManager.joinSession({
        sessionCode: sessionResult.data!.sessionCode,
        displayName: 'Player 1'
      }, 'player-1');

      const player2Result = await sessionManager.joinSession({
        sessionCode: sessionResult.data!.sessionCode,
        displayName: 'Player 2'
      }, 'player-2');

      participants = [
        sessionResult.data!.participants[0], // DM
        player1Result.data!,
        player2Result.data!
      ];

      // Initialize synchronization
      syncManager.initializeSynchronization(sessionId, participants);
    });

    it('should initialize synchronization state', () => {
      const syncState = syncManager.getSynchronizationState(sessionId);

      expect(syncState).toBeDefined();
      expect(syncState.sessionId).toBe(sessionId);
      expect(syncState.version).toBe('1.0.0');
      expect(syncState.isSynchronized).toBe(true);
      expect(syncState.synchronizationProgress).toBe(1.0);
      expect(syncState.participantSyncs).toHaveLength(3);
    });

    it('should handle participant synchronization requests', async () => {
      const participant = participants.find(p => p.role === 'player')!;
      
      const syncRequest = {
        participantId: participant.id,
        includeFullState: true
      };

      const response = await syncManager.requestSynchronization(sessionId, syncRequest);

      expect(response.gameState).toBeDefined();
      expect(response.worldState).toBeDefined();
      expect(response.participantStates).toBeDefined();
      expect(response.conflicts).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should track participant sync states', () => {
      const syncState = syncManager.getSynchronizationState(sessionId);

      participants.forEach(participant => {
        const participantSync = syncManager.getParticipantSync(sessionId, participant.id);
        expect(participantSync).toBeDefined();
        expect(participantSync!.participantId).toBe(participant.id);
        expect(participantSync!.isCurrent).toBe(true);
        expect(participantSync!.lastSyncedTurn).toBe(0);
      });
    });

    it('should handle participant connection/disconnection', () => {
      const participant = participants.find(p => p.role === 'player')!;

      // Disconnect participant
      syncManager.handleParticipantDisconnect(sessionId, participant.id);

      let participantSync = syncManager.getParticipantSync(sessionId, participant.id);
      expect(participantSync!.isCurrent).toBe(false);
      expect(participantSync!.lastSyncedTurn).toBe(0);

      // Reconnect participant
      syncManager.handleParticipantConnect(sessionId, participant.id, 'conn-123');

      participantSync = syncManager.getParticipantSync(sessionId, participant.id);
      expect(participantSync!.isCurrent).toBe(false); // Needs sync after reconnection
    });

    it('should assess sync health status', () => {
      const healthStatus = syncManager.getSyncHealthStatus(sessionId);

      expect(healthStatus).toBeDefined();
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.issues).toHaveLength(0);
      expect(healthStatus.suggestions).toHaveLength(0);
    });

    it('should force resynchronization', async () => {
      const result = await syncManager.forceResynchronization(sessionId);
      expect(result).toBe(true);

      const syncState = syncManager.getSynchronizationState(sessionId);
      syncState.participantSyncs.forEach(participantSync => {
        expect(participantSync.isCurrent).toBe(false);
        expect(participantSync.pendingChanges).toHaveLength(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete multiplayer session workflow', async () => {
      // 1. Create session
      const createResult = await sessionManager.createSession({
        name: 'Integration Test Session',
        settings: {
          maxPlayers: 4,
          turnTimeLimit: 60
        }
      }, 'dm-integration');

      expect(createResult.success).toBe(true);
      const session = createResult.data!;
      const sessionId = session.id;

      // 2. Add players
      const players = [];
      for (let i = 1; i <= 3; i++) {
        const joinResult = await sessionManager.joinSession({
          sessionCode: session.sessionCode,
          displayName: `Player ${i}`,
          role: 'player'
        }, `player-${i}`);

        expect(joinResult.success).toBe(true);
        players.push(joinResult.data!);
      }

      // Update session reference with new participants
      const updatedSession = sessionManager['sessions'].get(sessionId)!;

      // 3. Initialize systems
      turnManager.initializeTurnOrder(sessionId, updatedSession.participants);
      syncManager.initializeSynchronization(sessionId, updatedSession.participants);

      // 4. Start first turn
      const turnResult = await turnManager.startNextTurn(sessionId, updatedSession);
      expect(turnResult.success).toBe(true);
      const firstTurn = turnResult.data!;

      // 5. Submit action
      const action: PlayerIntent = {
        id: 'action-integration',
        type: 'action',
        content: 'I begin investigating the mysterious footprints',
        participantId: firstTurn.participantId,
        timestamp: new Date(),
        metadata: {}
      };

      const submitResult = await turnManager.submitTurnAction(sessionId, firstTurn.participantId, action);
      expect(submitResult.success).toBe(true);

      // 6. Complete turn
      const completeResult = await turnManager.completeTurn(sessionId, firstTurn.participantId);
      expect(completeResult.success).toBe(true);

      // 7. Check synchronization
      const syncState = syncManager.getSynchronizationState(sessionId);
      expect(syncState.isSynchronized).toBe(true);

      // 8. Get session statistics
      const stats = await sessionManager.getSessionStats(sessionId);
      expect(stats.totalParticipants).toBe(4);
      expect(stats.totalTurns).toBe(1);
      expect(stats.onlineParticipants).toBe(0); // No connections tracked in test

      // 9. Check turn history
      const history = turnManager.getTurnHistory(sessionId);
      expect(history).toHaveLength(1);
      expect(history[0].turnNumber).toBe(1);

      // 10. Verify session state
      const finalSession = sessionManager['sessions'].get(sessionId);
      expect(finalSession.currentPlayers).toBe(4);
      expect(finalSession.gameState.turnCount).toBe(1);
    });

    it('should handle conflict resolution', async () => {
      // Create session with multiple players
      const createResult = await sessionManager.createSession({
        name: 'Conflict Test Session',
        settings: { maxPlayers: 3 }
      }, 'dm-conflict');

      const session = createResult.data!;
      
      // Add two players
      await sessionManager.joinSession({
        sessionCode: session.sessionCode,
        displayName: 'Player 1'
      }, 'player-1');

      await sessionManager.joinSession({
        sessionCode: session.sessionCode,
        displayName: 'Player 2'
      }, 'player-2');

      const updatedSession = sessionManager['sessions'].get(session.id)!;
      
      // Initialize systems
      turnManager.initializeTurnOrder(session.id, updatedSession.participants);
      syncManager.initializeSynchronization(session.id, updatedSession.participants);

      // Simulate conflicting world changes
      const worldChange1 = {
        type: 'entity_updated' as const,
        entityId: 'entity-1',
        newValue: { position: 'north' },
        oldValue: { position: 'south' },
        participantId: 'player-1',
        timestamp: new Date()
      };

      const worldChange2 = {
        type: 'entity_updated' as const,
        entityId: 'entity-1', // Same entity - conflict!
        newValue: { position: 'east' },
        oldValue: { position: 'south' },
        participantId: 'player-2',
        timestamp: new Date()
      };

      // Process first change
      const conflict1 = await syncManager.processWorldChanges(session.id, [worldChange1], 'player-1');
      expect(conflict1).toBe(true);

      // Process conflicting second change
      const conflict2 = await syncManager.processWorldChanges(session.id, [worldChange2], 'player-2');
      expect(conflict2).toBe(false); // Should return false due to conflict

      // Check conflicts
      const syncState = syncManager.getSynchronizationState(session.id);
      expect(syncState.pendingConflicts.length).toBeGreaterThan(0);
      expect(syncState.isSynchronized).toBe(false);
    });
  });
});
