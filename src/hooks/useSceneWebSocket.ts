/**
 * Scene WebSocket Hook
 *
 * React hook for connecting to a scene WebSocket room.
 * Handles auto-connect/disconnect, reconnection logic, and typed message send/receive.
 *
 * Features:
 * - Auto-connect when scene ID changes
 * - Auto-disconnect on unmount
 * - Automatic reconnection on connection loss
 * - Typed message send/receive
 * - Scene room join/leave management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

// WebSocket message types matching server
export type WebSocketMessageType =
  | 'welcome'
  | 'scene:join'
  | 'scene:leave'
  | 'token:update'
  | 'token:create'
  | 'token:delete'
  | 'fog:reveal'
  | 'fog:conceal'
  | 'wall:update'
  | 'drawing:create'
  | 'drawing:delete';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  sceneId?: string;
  userId?: string;
  timestamp?: number;
  data?: any;
}

export interface TokenUpdateData {
  tokenId: string;
  positionX: number;
  positionY: number;
  rotation?: number;
  optimisticId?: string;
  updates?: Record<string, any>;
}

export interface UseSceneWebSocketOptions {
  /** Scene ID to connect to */
  sceneId: string | null;
  /** Callback when a message is received */
  onMessage?: (message: WebSocketMessage) => void;
  /** Callback when token is updated */
  onTokenUpdate?: (data: TokenUpdateData) => void;
  /** Enable auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (0 = unlimited) */
  maxReconnectAttempts?: number;
}

export interface UseSceneWebSocketReturn {
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Send a message to the WebSocket */
  sendMessage: (message: WebSocketMessage) => void;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Current connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
}

/**
 * Hook for scene WebSocket connection
 */
export function useSceneWebSocket(
  options: UseSceneWebSocketOptions
): UseSceneWebSocketReturn {
  const {
    sceneId,
    onMessage,
    onTokenUpdate,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const { session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  >('disconnected');

  /**
   * Send a message to the WebSocket
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected', message);
    }
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;

        // Call general message handler
        if (onMessage) {
          onMessage(message);
        }

        // Handle specific message types
        if (message.type === 'token:update' && onTokenUpdate && message.data) {
          onTokenUpdate(message.data as TokenUpdateData);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    },
    [onMessage, onTokenUpdate]
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!sceneId || !session?.access_token) {
      console.warn('[WebSocket] Cannot connect: missing sceneId or token');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const isReconnect = reconnectAttemptsRef.current > 0;
    setConnectionState(isReconnect ? 'reconnecting' : 'connecting');

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${session.access_token}&sessionId=scene:${sceneId}`;

    console.log('[WebSocket] Connecting to:', wsUrl.replace(session.access_token, '***'));

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected to scene:', sceneId);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;

      // Join the scene room
      sendMessage({
        type: 'scene:join',
        sceneId,
      });
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setConnectionState('error');
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      wsRef.current = null;
      setConnectionState('disconnected');

      // Auto-reconnect if enabled and not manually disconnected
      if (
        autoReconnect &&
        !isManualDisconnectRef.current &&
        (maxReconnectAttempts === 0 || reconnectAttemptsRef.current < maxReconnectAttempts)
      ) {
        reconnectAttemptsRef.current += 1;
        console.log(
          `[WebSocket] Reconnecting (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts || '∞'})...`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    };
  }, [
    sceneId,
    session?.access_token,
    handleMessage,
    sendMessage,
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
  ]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      // Send leave message before closing
      if (sceneId && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'scene:leave',
            sceneId,
          })
        );
      }

      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [sceneId]);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(() => {
    isManualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  /**
   * Connect when scene ID changes
   */
  useEffect(() => {
    if (sceneId && session?.access_token) {
      isManualDisconnectRef.current = false;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sceneId, session?.access_token, connect, disconnect]);

  return {
    isConnected: connectionState === 'connected',
    sendMessage,
    reconnect,
    disconnect,
    connectionState,
  };
}
