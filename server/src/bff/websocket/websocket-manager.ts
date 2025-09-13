/**
 * BFF WebSocket Manager
 * 
 * Manages real-time connections optimized for React components:
 * - Session-based WebSocket rooms for game sessions
 * - Real-time state synchronization with React contexts
 * - Event broadcasting with automatic reconnection
 * - Presence management for multiplayer sessions
 * - Message queuing with acknowledgments
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { BFFWebSocketData, BFFWebSocketEvent, BFFWebSocketEventType } from '../types';

interface BFFWebSocketConnection {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  characterId?: string;
  lastHeartbeat: Date;
  subscriptions: Set<string>;
  messageQueue: BFFWebSocketEvent[];
  isAuthenticated: boolean;
}

interface BFFSessionRoom {
  sessionId: string;
  campaignId: string;
  connections: Map<string, BFFWebSocketConnection>;
  presenceData: Map<string, BFFPresenceData>;
  messageHistory: BFFWebSocketEvent[];
  maxHistorySize: number;
}

interface BFFPresenceData {
  userId: string;
  characterId?: string;
  isTyping: boolean;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy';
}

interface BFFRateLimitConfig {
  maxMessagesPerMinute: number;
  maxConnectionsPerUser: number;
  burstLimit: number;
}

class BFFWebSocketManager {
  private wss?: WebSocketServer;
  private sessions: Map<string, BFFSessionRoom> = new Map();
  private connections: Map<string, BFFWebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private rateLimitConfig: BFFRateLimitConfig = {
    maxMessagesPerMinute: 60,
    maxConnectionsPerUser: 3,
    burstLimit: 10
  };

  /**
   * Initialize the WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/bff/ws',
      clientTracking: true,
      maxPayload: 16 * 1024 // 16KB max message size
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    this.startCleanup();

    console.log('🔌 BFF WebSocket Manager initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    
    console.log(`🔗 New BFF WebSocket connection: ${connectionId}`);

    const connection: BFFWebSocketConnection = {
      ws,
      userId: '',
      sessionId: '',
      characterId: undefined,
      lastHeartbeat: new Date(),
      subscriptions: new Set(),
      messageQueue: [],
      isAuthenticated: false
    };

    this.connections.set(connectionId, connection);

    // Set up connection event handlers
    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnection(connectionId));
    ws.on('error', (error) => this.handleError(connectionId, error));
    ws.on('pong', () => this.handlePong(connectionId));

    // Send connection acknowledgment
    this.sendToConnection(connectionId, {
      type: 'connection_ack',
      payload: { connectionId, timestamp: new Date().toISOString() }
    });

    // Request authentication
    this.sendToConnection(connectionId, {
      type: 'auth_required',
      payload: { message: 'Please authenticate to continue' }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(connectionId: string, data: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const message = JSON.parse(data.toString());
      
      // Update heartbeat
      connection.lastHeartbeat = new Date();

      // Handle different message types
      switch (message.type) {
        case 'auth':
          await this.handleAuth(connectionId, message.payload);
          break;
        
        case 'join_session':
          await this.handleJoinSession(connectionId, message.payload);
          break;
        
        case 'leave_session':
          await this.handleLeaveSession(connectionId);
          break;
        
        case 'send_message':
          await this.handleSendMessage(connectionId, message.payload);
          break;
        
        case 'typing_start':
          await this.handleTypingStart(connectionId);
          break;
        
        case 'typing_stop':
          await this.handleTypingStop(connectionId);
          break;
        
        case 'presence_update':
          await this.handlePresenceUpdate(connectionId, message.payload);
          break;
        
        case 'dice_roll':
          await this.handleDiceRoll(connectionId, message.payload);
          break;
        
        case 'combat_action':
          await this.handleCombatAction(connectionId, message.payload);
          break;
        
        case 'subscribe':
          await this.handleSubscribe(connectionId, message.payload);
          break;
        
        case 'unsubscribe':
          await this.handleUnsubscribe(connectionId, message.payload);
          break;
        
        default:
          console.warn(`🔍 Unknown BFF WebSocket message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ BFF WebSocket message error:`, error);
      this.sendToConnection(connectionId, {
        type: 'error',
        payload: { message: 'Invalid message format' }
      });
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuth(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // TODO: Validate JWT token
      const { token, userId, characterId } = payload;
      
      // Simple validation for now
      if (!userId) {
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          payload: { message: 'Invalid authentication' }
        });
        return;
      }

      // Check connection limits
      const userConns = this.userConnections.get(userId) || new Set();
      if (userConns.size >= this.rateLimitConfig.maxConnectionsPerUser) {
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          payload: { message: 'Too many connections' }
        });
        connection.ws.close(1008, 'Too many connections');
        return;
      }

      // Update connection
      connection.userId = userId;
      connection.characterId = characterId;
      connection.isAuthenticated = true;

      // Track user connections
      userConns.add(connectionId);
      this.userConnections.set(userId, userConns);

      this.sendToConnection(connectionId, {
        type: 'auth_success',
        payload: { 
          userId, 
          characterId,
          features: ['real_time_messages', 'presence', 'typing_indicators', 'combat_sync']
        }
      });

      console.log(`✅ BFF WebSocket authenticated: ${userId} (${connectionId})`);
    } catch (error) {
      console.error('BFF WebSocket auth error:', error);
      this.sendToConnection(connectionId, {
        type: 'auth_failed',
        payload: { message: 'Authentication failed' }
      });
    }
  }

  /**
   * Handle joining a session room
   */
  private async handleJoinSession(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAuthenticated) return;

    const { sessionId, campaignId } = payload;
    
    // Leave current session if any
    if (connection.sessionId) {
      await this.handleLeaveSession(connectionId);
    }

    // Create or get session room
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        campaignId,
        connections: new Map(),
        presenceData: new Map(),
        messageHistory: [],
        maxHistorySize: 100
      };
      this.sessions.set(sessionId, session);
      console.log(`🏠 Created new BFF session room: ${sessionId}`);
    }

    // Add connection to session
    connection.sessionId = sessionId;
    session.connections.set(connectionId, connection);

    // Add presence data
    session.presenceData.set(connection.userId, {
      userId: connection.userId,
      characterId: connection.characterId,
      isTyping: false,
      lastSeen: new Date(),
      status: 'online'
    });

    // Send session data
    this.sendToConnection(connectionId, {
      type: 'session_joined',
      payload: {
        sessionId,
        campaignId,
        messageHistory: session.messageHistory.slice(-20), // Last 20 messages
        presence: Array.from(session.presenceData.values()),
        connectionCount: session.connections.size
      }
    });

    // Notify other users in the session
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      payload: {
        userId: connection.userId,
        characterId: connection.characterId,
        timestamp: new Date().toISOString()
      }
    }, connectionId);

    console.log(`👥 User ${connection.userId} joined BFF session ${sessionId}`);
  }

  /**
   * Handle leaving a session room
   */
  private async handleLeaveSession(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const session = this.sessions.get(connection.sessionId);
    if (session) {
      // Remove from session
      session.connections.delete(connectionId);
      session.presenceData.delete(connection.userId);

      // Notify other users
      this.broadcastToSession(connection.sessionId, {
        type: 'user_left',
        payload: {
          userId: connection.userId,
          characterId: connection.characterId,
          timestamp: new Date().toISOString()
        }
      });

      // Clean up empty sessions
      if (session.connections.size === 0) {
        this.sessions.delete(connection.sessionId);
        console.log(`🗑️ Cleaned up empty BFF session: ${connection.sessionId}`);
      }
    }

    connection.sessionId = '';
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session) return;

    const messageEvent: BFFWebSocketEvent = {
      type: 'message_sent',
      payload: {
        ...payload,
        userId: connection.userId,
        characterId: connection.characterId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: connection.sessionId,
      userId: connection.userId,
      characterId: connection.characterId
    };

    // Add to history
    session.messageHistory.push(messageEvent);
    if (session.messageHistory.length > session.maxHistorySize) {
      session.messageHistory.shift();
    }

    // Broadcast to session
    this.broadcastToSession(connection.sessionId, messageEvent);

    console.log(`💬 BFF Message sent in session ${connection.sessionId}`);
  }

  /**
   * Handle typing indicators
   */
  private async handleTypingStart(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session) return;

    const presence = session.presenceData.get(connection.userId);
    if (presence) {
      presence.isTyping = true;
      presence.lastSeen = new Date();
    }

    this.broadcastToSession(connection.sessionId, {
      type: 'typing_start',
      payload: {
        userId: connection.userId,
        characterId: connection.characterId
      }
    }, connectionId);
  }

  private async handleTypingStop(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session) return;

    const presence = session.presenceData.get(connection.userId);
    if (presence) {
      presence.isTyping = false;
      presence.lastSeen = new Date();
    }

    this.broadcastToSession(connection.sessionId, {
      type: 'typing_stop',
      payload: {
        userId: connection.userId,
        characterId: connection.characterId
      }
    }, connectionId);
  }

  /**
   * Handle presence updates
   */
  private async handlePresenceUpdate(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const session = this.sessions.get(connection.sessionId);
    if (!session) return;

    const presence = session.presenceData.get(connection.userId);
    if (presence) {
      presence.status = payload.status;
      presence.lastSeen = new Date();
    }

    this.broadcastToSession(connection.sessionId, {
      type: 'presence_update',
      payload: {
        userId: connection.userId,
        status: payload.status,
        timestamp: new Date().toISOString()
      }
    }, connectionId);
  }

  /**
   * Handle dice rolls
   */
  private async handleDiceRoll(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const diceEvent: BFFWebSocketEvent = {
      type: 'dice_roll',
      payload: {
        ...payload,
        userId: connection.userId,
        characterId: connection.characterId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: connection.sessionId,
      userId: connection.userId,
      characterId: connection.characterId
    };

    this.broadcastToSession(connection.sessionId, diceEvent);
    console.log(`🎲 BFF Dice roll in session ${connection.sessionId}: ${payload.result}`);
  }

  /**
   * Handle combat actions
   */
  private async handleCombatAction(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const combatEvent: BFFWebSocketEvent = {
      type: 'combat_update',
      payload: {
        ...payload,
        userId: connection.userId,
        characterId: connection.characterId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: connection.sessionId,
      userId: connection.userId,
      characterId: connection.characterId
    };

    this.broadcastToSession(connection.sessionId, combatEvent);
    console.log(`⚔️ BFF Combat action in session ${connection.sessionId}`);
  }

  /**
   * Handle subscriptions to specific event types
   */
  private async handleSubscribe(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { eventTypes } = payload;
    if (Array.isArray(eventTypes)) {
      eventTypes.forEach((type: string) => {
        connection.subscriptions.add(type);
      });
    }

    this.sendToConnection(connectionId, {
      type: 'subscribed',
      payload: { eventTypes, subscriptions: Array.from(connection.subscriptions) }
    });
  }

  private async handleUnsubscribe(connectionId: string, payload: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { eventTypes } = payload;
    if (Array.isArray(eventTypes)) {
      eventTypes.forEach((type: string) => {
        connection.subscriptions.delete(type);
      });
    }

    this.sendToConnection(connectionId, {
      type: 'unsubscribed',
      payload: { eventTypes, subscriptions: Array.from(connection.subscriptions) }
    });
  }

  /**
   * Handle connection errors
   */
  private handleError(connectionId: string, error: Error): void {
    console.error(`❌ BFF WebSocket error for ${connectionId}:`, error);
    // Connection will be cleaned up by the close handler
  }

  /**
   * Handle connection close
   */
  private handleDisconnection(connectionId: string): void {
    console.log(`🔌 BFF WebSocket disconnected: ${connectionId}`);
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Leave session
      if (connection.sessionId) {
        this.handleLeaveSession(connectionId);
      }

      // Clean up user connections tracking
      if (connection.userId) {
        const userConns = this.userConnections.get(connection.userId);
        if (userConns) {
          userConns.delete(connectionId);
          if (userConns.size === 0) {
            this.userConnections.delete(connection.userId);
          }
        }
      }
    }

    this.connections.delete(connectionId);
  }

  /**
   * Handle pong responses
   */
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  /**
   * Send message to a specific connection
   */
  private sendToConnection(connectionId: string, event: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) return;

    try {
      connection.ws.send(JSON.stringify(event));
    } catch (error) {
      console.error(`❌ Failed to send BFF WebSocket message to ${connectionId}:`, error);
    }
  }

  /**
   * Broadcast message to all connections in a session
   */
  private broadcastToSession(sessionId: string, event: BFFWebSocketEvent, excludeConnectionId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const [connectionId, connection] of session.connections) {
      if (excludeConnectionId && connectionId === excludeConnectionId) continue;
      
      // Check subscriptions
      if (connection.subscriptions.size > 0 && !connection.subscriptions.has(event.type)) {
        continue;
      }

      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Broadcast to all connections of a specific user
   */
  public broadcastToUser(userId: string, event: any): void {
    const userConns = this.userConnections.get(userId);
    if (!userConns) return;

    for (const connectionId of userConns) {
      this.sendToConnection(connectionId, event);
    }
  }

  /**
   * Send message to specific session from external source
   */
  public sendToSession(sessionId: string, event: BFFWebSocketEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Add to message history
    session.messageHistory.push(event);
    if (session.messageHistory.length > session.maxHistorySize) {
      session.messageHistory.shift();
    }

    this.broadcastToSession(sessionId, event);
  }

  /**
   * Get session statistics
   */
  public getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      campaignId: session.campaignId,
      connectionCount: session.connections.size,
      messageCount: session.messageHistory.length,
      onlineUsers: Array.from(session.presenceData.values()).filter(p => p.status === 'online'),
      typingUsers: Array.from(session.presenceData.values()).filter(p => p.isTyping)
    };
  }

  /**
   * Get overall WebSocket statistics
   */
  public getOverallStats() {
    return {
      totalConnections: this.connections.size,
      totalSessions: this.sessions.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(c => c.isAuthenticated).length,
      totalUsers: this.userConnections.size,
      avgConnectionsPerUser: this.userConnections.size > 0 ? 
        this.connections.size / this.userConnections.size : 0
    };
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      for (const [connectionId, connection] of this.connections) {
        if (now - connection.lastHeartbeat.getTime() > timeout) {
          console.log(`💔 BFF WebSocket heartbeat timeout: ${connectionId}`);
          connection.ws.terminate();
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start cleanup of stale sessions
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const sessionTimeout = 300000; // 5 minutes

      for (const [sessionId, session] of this.sessions) {
        const hasActiveConnections = Array.from(session.connections.values())
          .some(conn => conn.ws.readyState === WebSocket.OPEN);

        if (!hasActiveConnections) {
          const lastActivity = Math.max(
            ...Array.from(session.presenceData.values()).map(p => p.lastSeen.getTime())
          );

          if (now - lastActivity > sessionTimeout) {
            this.sessions.delete(sessionId);
            console.log(`🧹 Cleaned up stale BFF session: ${sessionId}`);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown the WebSocket manager
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('🔌 BFF WebSocket Manager shut down');
  }
}

// Singleton instance
export const bffWebSocketManager = new BFFWebSocketManager();
export default bffWebSocketManager;