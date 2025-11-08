/**
 * Session Service
 *
 * Type-safe game session management using Drizzle ORM.
 * Handles session lifecycle, message history, and state management.
 */

import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../../src/infrastructure/database/index.js';
import { gameSessions, dialogueHistory, type GameSession, type NewGameSession, type DialogueHistory, type NewDialogueHistory } from '../../../db/session-schema.js';

/**
 * Message with pagination metadata
 */
export interface MessagePage {
  messages: DialogueHistory[];
  hasMore: boolean;
  total: number;
}

/**
 * Session Service
 * Provides type-safe database operations for game sessions and messages
 */
export class SessionService {
  /**
   * Create a new game session
   */
  static async createSession(data: {
    campaignId?: string | null;
    characterId?: string | null;
    sessionNumber?: number;
    status?: string;
  }): Promise<GameSession> {
    const [session] = await db
      .insert(gameSessions)
      .values({
        campaignId: data.campaignId || null,
        characterId: data.characterId || null,
        sessionNumber: data.sessionNumber || 1,
        status: data.status || 'active',
        startTime: new Date(),
      })
      .returning();

    if (!session) throw new Error('Failed to create session');
    return session;
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<GameSession | undefined> {
    return await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
    });
  }

  /**
   * Get session with message history
   */
  static async getSessionWithMessages(
    sessionId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    session: GameSession | undefined;
    messages: DialogueHistory[];
    total: number;
  }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const session = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
    });

    if (!session) {
      return { session: undefined, messages: [], total: 0 };
    }

    // Get messages with pagination
    const messages = await db.query.dialogueHistory.findMany({
      where: eq(dialogueHistory.sessionId, sessionId),
      orderBy: asc(dialogueHistory.sequenceNumber),
      limit,
      offset,
    });

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dialogueHistory)
      .where(eq(dialogueHistory.sessionId, sessionId));

    return {
      session,
      messages,
      total: countResult[0]?.count || 0,
    };
  }

  /**
   * Get active session for campaign/character
   */
  static async getActiveSession(params: {
    campaignId?: string;
    characterId?: string;
  }): Promise<GameSession | undefined> {
    const conditions = [isNull(gameSessions.endTime)];

    if (params.campaignId) {
      conditions.push(eq(gameSessions.campaignId, params.campaignId));
    }

    if (params.characterId) {
      conditions.push(eq(gameSessions.characterId, params.characterId));
    }

    return await db.query.gameSessions.findFirst({
      where: and(...conditions),
    });
  }

  /**
   * Complete/end a session
   */
  static async completeSession(
    sessionId: string,
    summary?: string
  ): Promise<GameSession> {
    const [updated] = await db
      .update(gameSessions)
      .set({
        endTime: new Date(),
        status: 'completed',
        summary: summary || null,
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId))
      .returning();

    if (!updated) throw new Error('Failed to complete session');
    return updated;
  }

  /**
   * Update session state (JSONB column)
   */
  static async updateSessionState(
    sessionId: string,
    stateUpdate: Record<string, any>
  ): Promise<GameSession> {
    // Get current state
    const current = await this.getSessionById(sessionId);
    const currentState = (current?.sessionState as Record<string, any>) || {};

    // Merge with update
    const newState = {
      ...currentState,
      ...stateUpdate,
      lastUpdate: new Date().toISOString(),
    };

    const [updated] = await db
      .update(gameSessions)
      .set({
        sessionState: newState,
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId))
      .returning();

    if (!updated) throw new Error('Failed to update session state');
    return updated;
  }

  /**
   * Add message to session
   */
  static async addMessage(data: {
    sessionId: string;
    speakerType: string;
    speakerId?: string;
    message: string;
    context?: Record<string, any>;
    images?: any[];
  }): Promise<DialogueHistory> {
    const [msg] = await db
      .insert(dialogueHistory)
      .values({
        sessionId: data.sessionId,
        speakerType: data.speakerType,
        speakerId: data.speakerId || null,
        message: data.message,
        context: data.context || null,
        images: data.images || null,
        timestamp: new Date(),
      })
      .returning();

    if (!msg) throw new Error('Failed to add message');
    return msg;
  }

  /**
   * Get recent messages for session (paginated)
   */
  static async getRecentMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessagePage> {
    // Get messages ordered by sequence number (newest first for pagination)
    const messages = await db.query.dialogueHistory.findMany({
      where: eq(dialogueHistory.sessionId, sessionId),
      orderBy: desc(dialogueHistory.sequenceNumber),
      limit,
      offset,
    });

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dialogueHistory)
      .where(eq(dialogueHistory.sessionId, sessionId));

    const total = countResult[0]?.count || 0;
    const hasMore = offset + limit < total;

    return {
      messages: messages.reverse(), // Reverse to get oldest to newest for display
      hasMore,
      total,
    };
  }

  /**
   * Get session history for campaign
   */
  static async getCampaignSessions(
    campaignId: string
  ): Promise<GameSession[]> {
    return await db.query.gameSessions.findMany({
      where: eq(gameSessions.campaignId, campaignId),
      orderBy: desc(gameSessions.sessionNumber),
    });
  }

  /**
   * Append combat log entry to session state
   */
  static async appendCombatLog(
    sessionId: string,
    entry: any,
    maxEntries: number = 500
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) return;

    const currentState = (session.sessionState as any) || {};
    const combatLog = currentState.combatLog || [];

    const newEntry = {
      timestamp: new Date().toISOString(),
      entry,
    };

    const merged = [...combatLog, newEntry];
    const trimmed = merged.length > maxEntries
      ? merged.slice(merged.length - maxEntries)
      : merged;

    await this.updateSessionState(sessionId, {
      combatLog: trimmed,
    });
  }

  /**
   * Append roll event to combat log
   */
  static async appendRollEvent(
    sessionId: string,
    event: { kind: string; payload: any }
  ): Promise<void> {
    await this.appendCombatLog(sessionId, {
      kind: event.kind,
      payload: event.payload,
    });
  }
}
