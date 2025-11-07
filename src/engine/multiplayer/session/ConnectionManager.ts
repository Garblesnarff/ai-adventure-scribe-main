import { logger } from '../../../lib/logger';
import { ConnectionState, SessionEvent } from '../types';

/**
 * Manages WebSocket connections and participant presence
 * Handles connection lifecycle, heartbeats, and broadcasting
 */
export class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private eventListeners: Map<string, Set<(event: SessionEvent) => void>> = new Map();

  /**
   * Add a new connection for a participant
   */
  addConnection(sessionId: string, participantId: string, connection: WebSocket): void {
    const key = this.getKey(sessionId, participantId);
    this.removeConnection(sessionId, participantId);
    this.connections.set(key, connection);
    this.setupHandlers(sessionId, participantId, connection);
    this.startHeartbeat(sessionId, participantId);
    logger.info(`Connection added: ${participantId} in ${sessionId}`);
  }

  /**
   * Remove a participant's connection
   */
  removeConnection(sessionId: string, participantId: string): void {
    const key = this.getKey(sessionId, participantId);
    this.stopHeartbeat(sessionId, participantId);
    const conn = this.connections.get(key);
    if (conn?.readyState === WebSocket.OPEN) conn.close();
    this.connections.delete(key);
  }

  /**
   * Check if participant is connected
   */
  isConnected(sessionId: string, participantId: string): boolean {
    const conn = this.connections.get(this.getKey(sessionId, participantId));
    return conn?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(sessionId: string, participantId: string): ConnectionState {
    return {
      isOnline: this.isConnected(sessionId, participantId),
      connectionId: this.getKey(sessionId, participantId),
      lastPing: new Date(),
      latency: 0,
      lostPackets: 0
    };
  }

  /**
   * Broadcast to all participants
   */
  broadcastToAll(sessionId: string, message: any): void {
    const data = JSON.stringify(message);
    let sent = 0;

    for (const [key, conn] of this.connections) {
      if (key.startsWith(sessionId) && conn.readyState === WebSocket.OPEN) {
        try { conn.send(data); sent++; }
        catch (e) { logger.error(`Broadcast failed: ${key}`, e); }
      }
    }
    logger.debug(`Broadcast to ${sent} participants in ${sessionId}`);
  }

  /**
   * Send to specific participants
   */
  sendToParticipants(sessionId: string, participantIds: string[], message: any): void {
    const data = JSON.stringify(message);
    for (const id of participantIds) {
      const conn = this.connections.get(this.getKey(sessionId, id));
      if (conn?.readyState === WebSocket.OPEN) {
        try { conn.send(data); }
        catch (e) { logger.error(`Send failed: ${id}`, e); }
      }
    }
  }

  /**
   * Send to single participant
   */
  sendToParticipant(sessionId: string, participantId: string, message: any): boolean {
    const conn = this.connections.get(this.getKey(sessionId, participantId));
    if (!conn || conn.readyState !== WebSocket.OPEN) return false;
    try { conn.send(JSON.stringify(message)); return true; }
    catch (e) { logger.error(`Send failed: ${participantId}`, e); return false; }
  }

  /**
   * Get online participant count
   */
  getOnlineCount(sessionId: string): number {
    return Array.from(this.connections.entries())
      .filter(([k, c]) => k.startsWith(sessionId) && c.readyState === WebSocket.OPEN)
      .length;
  }

  /**
   * Register event listener
   */
  addEventListener(sessionId: string, listener: (event: SessionEvent) => void): void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    this.eventListeners.get(sessionId)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(sessionId: string, listener: (event: SessionEvent) => void): void {
    this.eventListeners.get(sessionId)?.delete(listener);
  }

  /**
   * Clean up all connections for session
   */
  cleanupSession(sessionId: string): void {
    const keys = Array.from(this.connections.keys())
      .filter(k => k.startsWith(sessionId));

    for (const key of keys) {
      const [, pid] = key.split(':');
      this.removeConnection(sessionId, pid);
    }
    this.eventListeners.delete(sessionId);
  }

  // Private helpers

  private getKey(sessionId: string, participantId: string): string {
    return `${sessionId}:${participantId}`;
  }

  private setupHandlers(sessionId: string, participantId: string, conn: WebSocket): void {
    conn.onmessage = (e) => this.handleMessage(sessionId, participantId, e.data);
    conn.onerror = (e) => logger.error(`Connection error: ${participantId}`, e);
    conn.onclose = () => {
      this.removeConnection(sessionId, participantId);
      this.emitEvent(sessionId, {
        id: `e-${Date.now()}`,
        sessionId,
        participantId,
        eventType: 'player_disconnected',
        data: { participantId },
        message: `Participant disconnected`,
        isBroadcast: true,
        isSystem: true,
        priority: 1,
        processed: false,
        createdAt: new Date()
      });
    };
  }

  private handleMessage(sessionId: string, participantId: string, data: any): void {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') {
        this.sendToParticipant(sessionId, participantId, { type: 'pong' });
        return;
      }
      this.emitEvent(sessionId, {
        id: `e-${Date.now()}`,
        sessionId,
        participantId,
        eventType: msg.eventType || 'chat_message',
        data: msg,
        message: msg.content || '',
        isBroadcast: false,
        isSystem: false,
        priority: 0,
        processed: false,
        createdAt: new Date()
      });
    } catch (e) { logger.error('Parse error:', e); }
  }

  private startHeartbeat(sessionId: string, participantId: string): void {
    const key = this.getKey(sessionId, participantId);
    const interval = setInterval(() => {
      if (!this.isConnected(sessionId, participantId)) {
        this.stopHeartbeat(sessionId, participantId);
      } else {
        this.sendToParticipant(sessionId, participantId, { type: 'ping' });
      }
    }, this.HEARTBEAT_INTERVAL);
    this.heartbeatIntervals.set(key, interval);
  }

  private stopHeartbeat(sessionId: string, participantId: string): void {
    const interval = this.heartbeatIntervals.get(this.getKey(sessionId, participantId));
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(this.getKey(sessionId, participantId));
    }
  }

  private emitEvent(sessionId: string, event: SessionEvent): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      for (const listener of listeners) {
        try { listener(event); }
        catch (e) { logger.error('Listener error:', e); }
      }
    }
  }
}
