/**
 * BFF Game Session Hook
 * 
 * React Query hook optimized for BFF game session endpoints.
 * Provides real-time session data with WebSocket integration.
 * 
 * Features:
 * - Automatic refetching on session updates
 * - Real-time WebSocket integration
 * - Optimistic updates for session state
 * - React Suspense compatibility
 * - Error boundary integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  BFFGameSessionData, 
  BFFGameSessionRequest, 
  BFFGameSessionResponse 
} from '../../../server/src/bff/types';

const BFF_BASE_URL = import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/bff';
const WS_BASE_URL = import.meta.env.VITE_BFF_WS_URL || 'ws://localhost:4000/bff/ws';

// WebSocket connection manager
class BFFWebSocketManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  connect(sessionId?: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    console.log('🔌 BFF: Connecting to WebSocket...');

    this.ws = new WebSocket(WS_BASE_URL);

    this.ws.onopen = () => {
      console.log('✅ BFF: WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Send authentication if available
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const characterId = localStorage.getItem('currentCharacterId');
      
      if (token && userId) {
        this.ws?.send(JSON.stringify({
          type: 'auth',
          payload: { token, userId, characterId }
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data.type, data);
      } catch (error) {
        console.error('❌ BFF: WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 BFF: WebSocket disconnected');
      this.isConnecting = false;
      this.ws = null;
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 BFF: Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(sessionId), this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ BFF: WebSocket error:', error);
      this.isConnecting = false;
    };
  }

  joinSession(sessionId: string, campaignId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join_session',
        payload: { sessionId, campaignId }
      }));
    }
  }

  leaveSession() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'leave_session',
        payload: {}
      }));
    }
  }

  addListener(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  removeListener(eventType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// Singleton WebSocket manager
const wsManager = new BFFWebSocketManager();

/**
 * Hook for BFF game session data with real-time updates
 */
export function useBFFGameSession(
  sessionId: string | null,
  options: {
    campaignId?: string;
    characterId?: string;
    enableRealtime?: boolean;
    suspense?: boolean;
  } = {}
) {
  const queryClient = useQueryClient();
  const { campaignId, characterId, enableRealtime = true, suspense = false } = options;
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const wsListenersRef = useRef<Array<{ type: string; callback: (data: any) => void }>>([]);

  // Query for session data
  const sessionQuery = useQuery({
    queryKey: ['bff-game-session', sessionId],
    queryFn: async (): Promise<BFFGameSessionData> => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const params = new URLSearchParams();
      if (enableRealtime) params.append('realtime', 'true');

      const response = await fetch(`${BFF_BASE_URL}/game-session/${sessionId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      const result: BFFGameSessionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load session');
      }

      return result.data;
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    suspense
  });

  // WebSocket connection management
  useEffect(() => {
    if (!sessionId || !enableRealtime) return;

    console.log('🔌 BFF: Setting up WebSocket for session', sessionId);
    setConnectionStatus('connecting');
    
    // Connect to WebSocket
    wsManager.connect(sessionId);

    // Session update listeners
    const listeners = [
      {
        type: 'auth_success',
        callback: (data: any) => {
          console.log('✅ BFF: WebSocket authenticated');
          setConnectionStatus('connected');
          if (campaignId) {
            wsManager.joinSession(sessionId, campaignId);
          }
        }
      },
      {
        type: 'session_joined',
        callback: (data: any) => {
          console.log('🎮 BFF: Joined session room');
          // Invalidate and refetch session data to get latest state
          queryClient.invalidateQueries({ queryKey: ['bff-game-session', sessionId] });
        }
      },
      {
        type: 'session_update',
        callback: (data: any) => {
          console.log('🔄 BFF: Session updated via WebSocket');
          // Optimistically update the cache
          queryClient.setQueryData(['bff-game-session', sessionId], (old: BFFGameSessionData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              ...data.payload.updates,
              _updatedViaWebSocket: true
            };
          });
        }
      },
      {
        type: 'message_sent',
        callback: (data: any) => {
          console.log('💬 BFF: New message via WebSocket');
          // Add message to recent messages
          queryClient.setQueryData(['bff-game-session', sessionId], (old: BFFGameSessionData | undefined) => {
            if (!old) return old;
            
            const newMessage = data.payload;
            const updatedMessages = [...old.recentMessages, newMessage];
            
            // Keep only the last 50 messages
            if (updatedMessages.length > 50) {
              updatedMessages.shift();
            }
            
            return {
              ...old,
              recentMessages: updatedMessages
            };
          });
        }
      },
      {
        type: 'combat_update',
        callback: (data: any) => {
          console.log('⚔️ BFF: Combat update via WebSocket');
          // Update combat status
          queryClient.setQueryData(['bff-game-session', sessionId], (old: BFFGameSessionData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              combatStatus: {
                ...old.combatStatus,
                ...data.payload
              }
            };
          });
        }
      },
      {
        type: 'user_joined',
        callback: (data: any) => {
          console.log('👥 BFF: User joined session');
        }
      },
      {
        type: 'user_left',
        callback: (data: any) => {
          console.log('👋 BFF: User left session');
        }
      }
    ];

    // Register all listeners
    listeners.forEach(({ type, callback }) => {
      wsManager.addListener(type, callback);
    });
    
    wsListenersRef.current = listeners;

    // Cleanup function
    return () => {
      console.log('🧹 BFF: Cleaning up WebSocket listeners');
      wsListenersRef.current.forEach(({ type, callback }) => {
        wsManager.removeListener(type, callback);
      });
      wsListenersRef.current = [];
      wsManager.leaveSession();
    };
  }, [sessionId, enableRealtime, campaignId, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsListenersRef.current.length === 0) {
        wsManager.disconnect();
      }
    };
  }, []);

  return {
    data: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
    isError: sessionQuery.isError,
    refetch: sessionQuery.refetch,
    connectionStatus
  };
}

/**
 * Hook for creating or joining a game session
 */
export function useBFFCreateGameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BFFGameSessionRequest): Promise<BFFGameSessionData> => {
      const response = await fetch(`${BFF_BASE_URL}/game-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result: BFFGameSessionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      return result.data;
    },
    onSuccess: (data) => {
      // Cache the new session
      queryClient.setQueryData(['bff-game-session', data.id], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['bff-character-dashboard', data.characterId] 
      });
      
      console.log('✅ BFF: Session created successfully:', data.id);
    },
    onError: (error) => {
      console.error('❌ BFF: Failed to create session:', error);
    }
  });
}

/**
 * Hook for updating game session state
 */
export function useBFFUpdateGameSession(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<BFFGameSessionData>): Promise<void> => {
      const response = await fetch(`${BFF_BASE_URL}/game-session/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update session');
      }
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bff-game-session', sessionId] });

      // Snapshot previous value
      const previousSession = queryClient.getQueryData<BFFGameSessionData>(['bff-game-session', sessionId]);

      // Optimistically update
      if (previousSession) {
        queryClient.setQueryData(['bff-game-session', sessionId], {
          ...previousSession,
          ...updates
        });
      }

      return { previousSession };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousSession) {
        queryClient.setQueryData(['bff-game-session', sessionId], context.previousSession);
      }
      console.error('❌ BFF: Failed to update session:', error);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['bff-game-session', sessionId] });
    }
  });
}

/**
 * Hook for sending WebSocket events
 */
export function useBFFWebSocketSend() {
  return useCallback((eventType: string, payload: any) => {
    if (wsManager) {
      const message = { type: eventType, payload };
      
      if (wsManager.ws?.readyState === WebSocket.OPEN) {
        wsManager.ws.send(JSON.stringify(message));
      } else {
        console.warn('⚠️ BFF: WebSocket not connected, cannot send:', eventType);
      }
    }
  }, []);
}

/**
 * Hook for subscribing to WebSocket events
 */
export function useBFFWebSocketSubscribe(eventType: string, callback: (data: any) => void) {
  useEffect(() => {
    wsManager.addListener(eventType, callback);
    
    return () => {
      wsManager.removeListener(eventType, callback);
    };
  }, [eventType, callback]);
}