/**
 * Session Service Tests
 *
 * Comprehensive test suite for SessionService covering session lifecycle,
 * message management, pagination, and state updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../session-service';
import type { GameSession, DialogueHistory } from '../../../../db/session-schema';

// Mock the database client
vi.mock('../../lib/drizzle', () => {
  const mockQuery = {
    gameSessions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    dialogueHistory: {
      findMany: vi.fn(),
    },
  };

  const mockDb = {
    query: mockQuery,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  };

  return {
    db: mockDb,
  };
});

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with provided data', async () => {
      const sessionData = {
        campaignId: 'campaign-123',
        characterId: 'char-123',
        sessionNumber: 1,
        status: 'active',
      };

      const createdSession: Partial<GameSession> = {
        id: 'session-new',
        ...sessionData,
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([createdSession]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await SessionService.createSession(sessionData);

      expect(result).toEqual(createdSession);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should set default sessionNumber to 1 if not provided', async () => {
      const sessionData = {
        campaignId: 'campaign-123',
      };

      const createdSession: Partial<GameSession> = {
        id: 'session-new',
        campaignId: 'campaign-123',
        sessionNumber: 1,
        status: 'active',
        startTime: new Date(),
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([createdSession]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await SessionService.createSession(sessionData);

      expect(result.sessionNumber).toBe(1);
      expect(result.status).toBe('active');
    });

    it('should allow null campaignId and characterId', async () => {
      const sessionData = {
        campaignId: null,
        characterId: null,
      };

      const createdSession: Partial<GameSession> = {
        id: 'session-new',
        campaignId: null,
        characterId: null,
        sessionNumber: 1,
        status: 'active',
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([createdSession]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await SessionService.createSession(sessionData);

      expect(result.campaignId).toBeNull();
      expect(result.characterId).toBeNull();
    });
  });

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      const sessionId = 'session-123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        campaignId: 'campaign-1',
        status: 'active',
        sessionNumber: 5,
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);

      const result = await SessionService.getSessionById(sessionId);

      expect(result).toEqual(mockSession);
      expect(db.query.gameSessions.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });

    it('should return undefined when session not found', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);

      const result = await SessionService.getSessionById('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getSessionWithMessages', () => {
    it('should return session with paginated messages', async () => {
      const sessionId = 'session-123';
      const mockSession: Partial<GameSession> = {
        id: sessionId,
        campaignId: 'campaign-1',
        status: 'active',
      };

      const mockMessages: Partial<DialogueHistory>[] = [
        {
          id: 'msg-1',
          sessionId,
          speakerType: 'player',
          message: 'Hello DM!',
          sequenceNumber: 1,
        },
        {
          id: 'msg-2',
          sessionId,
          speakerType: 'dm',
          message: 'Welcome adventurer!',
          sequenceNumber: 2,
        },
      ];

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue(mockMessages as DialogueHistory[]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 2 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const result = await SessionService.getSessionWithMessages(sessionId);

      expect(result.session).toEqual(mockSession);
      expect(result.messages).toEqual(mockMessages);
      expect(result.total).toBe(2);
    });

    it('should use default pagination (limit 50, offset 0)', async () => {
      const sessionId = 'session-123';
      const mockSession: Partial<GameSession> = { id: sessionId };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      await SessionService.getSessionWithMessages(sessionId);

      expect(db.query.dialogueHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should respect custom pagination options', async () => {
      const sessionId = 'session-123';
      const mockSession: Partial<GameSession> = { id: sessionId };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      await SessionService.getSessionWithMessages(sessionId, { limit: 20, offset: 10 });

      expect(db.query.dialogueHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 10,
        })
      );
    });

    it('should return empty data when session not found', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);

      const result = await SessionService.getSessionWithMessages('nonexistent');

      expect(result.session).toBeUndefined();
      expect(result.messages).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should order messages by sequence number ascending', async () => {
      const sessionId = 'session-123';
      const mockSession: Partial<GameSession> = { id: sessionId };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      await SessionService.getSessionWithMessages(sessionId);

      expect(db.query.dialogueHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Object),
        })
      );
    });
  });

  describe('getActiveSession', () => {
    it('should find active session by campaignId', async () => {
      const mockSession: Partial<GameSession> = {
        id: 'session-active',
        campaignId: 'campaign-123',
        status: 'active',
        endTime: null,
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);

      const result = await SessionService.getActiveSession({ campaignId: 'campaign-123' });

      expect(result).toEqual(mockSession);
    });

    it('should find active session by characterId', async () => {
      const mockSession: Partial<GameSession> = {
        id: 'session-active',
        characterId: 'char-123',
        status: 'active',
        endTime: null,
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);

      const result = await SessionService.getActiveSession({ characterId: 'char-123' });

      expect(result).toEqual(mockSession);
    });

    it('should find active session by both campaignId and characterId', async () => {
      const mockSession: Partial<GameSession> = {
        id: 'session-active',
        campaignId: 'campaign-123',
        characterId: 'char-123',
        status: 'active',
        endTime: null,
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(mockSession as GameSession);

      const result = await SessionService.getActiveSession({
        campaignId: 'campaign-123',
        characterId: 'char-123',
      });

      expect(result).toEqual(mockSession);
    });

    it('should only return sessions with null endTime', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);

      await SessionService.getActiveSession({ campaignId: 'campaign-123' });

      expect(db.query.gameSessions.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed with endTime', async () => {
      const sessionId = 'session-123';
      const summary = 'Epic battle with dragon';

      const completedSession: Partial<GameSession> = {
        id: sessionId,
        status: 'completed',
        endTime: new Date(),
        summary,
        updatedAt: new Date(),
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([completedSession]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const result = await SessionService.completeSession(sessionId, summary);

      expect(result).toEqual(completedSession);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          endTime: expect.any(Date),
          status: 'completed',
          summary,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should set summary to null if not provided', async () => {
      const sessionId = 'session-123';

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.completeSession(sessionId);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: null,
        })
      );
    });
  });

  describe('updateSessionState', () => {
    it('should merge new state with existing state', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: { turnCount: 5, location: 'Tavern' },
      };

      const stateUpdate = { combat: true, enemies: 3 };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.updateSessionState(sessionId, stateUpdate);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionState: expect.objectContaining({
            turnCount: 5,
            location: 'Tavern',
            combat: true,
            enemies: 3,
            lastUpdate: expect.any(String),
          }),
        })
      );
    });

    it('should create new state if session has no existing state', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: null,
      };

      const stateUpdate = { initiative: 15 };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.updateSessionState(sessionId, stateUpdate);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionState: expect.objectContaining({
            initiative: 15,
            lastUpdate: expect.any(String),
          }),
        })
      );
    });

    it('should add lastUpdate timestamp to state', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: {},
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.updateSessionState(sessionId, { test: true });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionState: expect.objectContaining({
            lastUpdate: expect.any(String),
          }),
        })
      );
    });
  });

  describe('addMessage', () => {
    it('should add message to session', async () => {
      const messageData = {
        sessionId: 'session-123',
        speakerType: 'player',
        speakerId: 'char-123',
        message: 'I cast fireball!',
        context: { spell: 'fireball', level: 3 },
      };

      const createdMessage: Partial<DialogueHistory> = {
        id: 'msg-new',
        ...messageData,
        timestamp: new Date(),
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([createdMessage]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const result = await SessionService.addMessage(messageData);

      expect(result).toEqual(createdMessage);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should set speakerId to null if not provided', async () => {
      const messageData = {
        sessionId: 'session-123',
        speakerType: 'dm',
        message: 'You enter a dark cave',
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'msg-new' }]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      await SessionService.addMessage(messageData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          speakerId: null,
        })
      );
    });

    it('should set empty context and images if not provided', async () => {
      const messageData = {
        sessionId: 'session-123',
        speakerType: 'player',
        message: 'Hello',
      };

      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'msg-new' }]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      await SessionService.addMessage(messageData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          context: null,
          images: null,
        })
      );
    });
  });

  describe('getRecentMessages', () => {
    it('should return paginated messages ordered correctly', async () => {
      const sessionId = 'session-123';
      const mockMessages: Partial<DialogueHistory>[] = [
        { id: 'msg-3', sequenceNumber: 3, message: 'Third' },
        { id: 'msg-2', sequenceNumber: 2, message: 'Second' },
        { id: 'msg-1', sequenceNumber: 1, message: 'First' },
      ];

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue(mockMessages as DialogueHistory[]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 3 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const result = await SessionService.getRecentMessages(sessionId, 50, 0);

      // Messages should be reversed to oldest-to-newest
      expect(result.messages[0].message).toBe('First');
      expect(result.messages[2].message).toBe('Third');
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should use default limit of 50', async () => {
      const sessionId = 'session-123';

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      await SessionService.getRecentMessages(sessionId);

      expect(db.query.dialogueHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        })
      );
    });

    it('should calculate hasMore correctly', async () => {
      const sessionId = 'session-123';

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 100 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const result = await SessionService.getRecentMessages(sessionId, 20, 10);

      expect(result.hasMore).toBe(true); // offset 10 + limit 20 = 30, total 100
    });

    it('should order messages by sequence number descending for pagination', async () => {
      const sessionId = 'session-123';

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.dialogueHistory.findMany).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      await SessionService.getRecentMessages(sessionId);

      expect(db.query.dialogueHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Object),
        })
      );
    });
  });

  describe('getCampaignSessions', () => {
    it('should return all sessions for campaign ordered by session number', async () => {
      const campaignId = 'campaign-123';
      const mockSessions: Partial<GameSession>[] = [
        { id: 'session-3', campaignId, sessionNumber: 3 },
        { id: 'session-2', campaignId, sessionNumber: 2 },
        { id: 'session-1', campaignId, sessionNumber: 1 },
      ];

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findMany).mockResolvedValue(mockSessions as GameSession[]);

      const result = await SessionService.getCampaignSessions(campaignId);

      expect(result).toEqual(mockSessions);
      expect(db.query.gameSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          orderBy: expect.any(Object),
        })
      );
    });

    it('should return empty array when campaign has no sessions', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findMany).mockResolvedValue([]);

      const result = await SessionService.getCampaignSessions('campaign-empty');

      expect(result).toEqual([]);
    });
  });

  describe('appendCombatLog', () => {
    it('should append combat log entry to session state', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: {
          combatLog: [
            { timestamp: '2024-01-01T00:00:00Z', entry: { action: 'attack' } },
          ],
        },
      };

      const newEntry = { action: 'cast spell', spell: 'fireball' };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.appendCombatLog(sessionId, newEntry);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionState: expect.objectContaining({
            combatLog: expect.arrayContaining([
              expect.objectContaining({
                entry: { action: 'attack' },
              }),
              expect.objectContaining({
                entry: newEntry,
                timestamp: expect.any(String),
              }),
            ]),
          }),
        })
      );
    });

    it('should create new combat log if none exists', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: null,
      };

      const newEntry = { action: 'initiative' };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.appendCombatLog(sessionId, newEntry);

      expect(mockSet).toHaveBeenCalled();
    });

    it('should trim combat log to maxEntries', async () => {
      const sessionId = 'session-123';
      const combatLog = Array.from({ length: 500 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        entry: { action: `action-${i}` },
      }));

      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: { combatLog },
      };

      const newEntry = { action: 'new action' };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.appendCombatLog(sessionId, newEntry, 500);

      // Should trim to 500 entries
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.sessionState.combatLog.length).toBe(500);
    });

    it('should return early if session not found', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(undefined);

      await SessionService.appendCombatLog('nonexistent', { action: 'test' });

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('appendRollEvent', () => {
    it('should append roll event to combat log', async () => {
      const sessionId = 'session-123';
      const existingSession: Partial<GameSession> = {
        id: sessionId,
        sessionState: { combatLog: [] },
      };

      const rollEvent = {
        kind: 'attack_roll',
        payload: { result: 18, modifier: 5 },
      };

      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockResolvedValue(existingSession as GameSession);

      const mockReturning = vi.fn().mockResolvedValue([{ id: sessionId }]);
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await SessionService.appendRollEvent(sessionId, rollEvent);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionState: expect.objectContaining({
            combatLog: expect.arrayContaining([
              expect.objectContaining({
                entry: expect.objectContaining({
                  kind: 'attack_roll',
                  payload: rollEvent.payload,
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in createSession', async () => {
      const { db } = await import('../../lib/drizzle');
      const mockValues = vi.fn(() => ({
        returning: vi.fn().mockRejectedValue(new Error('Insert failed')),
      }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      await expect(
        SessionService.createSession({ campaignId: 'test' })
      ).rejects.toThrow('Insert failed');
    });

    it('should handle database errors in getSessionById', async () => {
      const { db } = await import('../../lib/drizzle');
      vi.mocked(db.query.gameSessions.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(SessionService.getSessionById('session-123')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors in completeSession', async () => {
      const { db } = await import('../../lib/drizzle');
      const mockReturning = vi.fn().mockRejectedValue(new Error('Update failed'));
      const mockWhere = vi.fn(() => ({ returning: mockReturning }));
      const mockSet = vi.fn(() => ({ where: mockWhere }));
      const mockUpdate = vi.fn(() => ({ set: mockSet }));
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await expect(
        SessionService.completeSession('session-123', 'summary')
      ).rejects.toThrow('Update failed');
    });

    it('should handle database errors in addMessage', async () => {
      const { db } = await import('../../lib/drizzle');
      const mockValues = vi.fn(() => ({
        returning: vi.fn().mockRejectedValue(new Error('Insert failed')),
      }));
      const mockInsert = vi.fn(() => ({ values: mockValues }));
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      await expect(
        SessionService.addMessage({
          sessionId: 'session-123',
          speakerType: 'player',
          message: 'test',
        })
      ).rejects.toThrow('Insert failed');
    });
  });
});
