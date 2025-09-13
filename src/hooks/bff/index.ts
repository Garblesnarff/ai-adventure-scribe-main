/**
 * BFF (Backend-for-Frontend) Hooks Export
 * 
 * Centralized export for all BFF React Query hooks optimized for React components.
 * These hooks eliminate the impedance mismatch between generic APIs and frontend needs.
 */

// Game Session Hooks
export {
  useBFFGameSession,
  useBFFCreateGameSession,
  useBFFUpdateGameSession,
  useBFFWebSocketSend,
  useBFFWebSocketSubscribe
} from './use-bff-game-session';

// Character Dashboard Hooks
export {
  useBFFCharacterDashboard,
  useBFFCharacterQuickStats,
  useBFFUpdateCharacter,
  useBFFCharacterHitPoints,
  useBFFCharacterProgression,
  useBFFPrefetchCharacterDashboard
} from './use-bff-character-dashboard';

// Streaming Chat Hooks
export {
  useBFFSessionMessages,
  useBFFStreamingChat,
  useBFFAcknowledgeMessage,
  useBFFMessagePagination
} from './use-bff-streaming-chat';

// Re-export types for convenience
export type {
  BFFGameSessionData,
  BFFGameSessionRequest,
  BFFGameSessionResponse,
  BFFCharacterDashboard,
  BFFCharacterDashboardRequest,
  BFFCharacterDashboardResponse,
  BFFMessageData,
  BFFStreamingChatRequest,
  BFFStreamingChatResponse,
  BFFWebSocketData,
  BFFWebSocketEvent
} from '../../../server/src/bff/types';

/**
 * BFF Configuration
 */
export const BFF_CONFIG = {
  baseUrl: import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/bff',
  wsUrl: import.meta.env.VITE_BFF_WS_URL || 'ws://localhost:4000/bff/ws',
  defaultCacheTime: 300000, // 5 minutes
  defaultStaleTime: 60000,   // 1 minute
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * BFF Error Types for React Error Boundaries
 */
export class BFFError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly userFriendlyMessage: string;

  constructor(
    message: string, 
    code = 'BFF_ERROR', 
    retryable = true,
    userFriendlyMessage?: string
  ) {
    super(message);
    this.name = 'BFFError';
    this.code = code;
    this.retryable = retryable;
    this.userFriendlyMessage = userFriendlyMessage || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * BFF React Query Default Options
 */
export const BFF_QUERY_DEFAULTS = {
  queries: {
    staleTime: BFF_CONFIG.defaultStaleTime,
    cacheTime: BFF_CONFIG.defaultCacheTime,
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors (except 408)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
        return false;
      }
      return failureCount < BFF_CONFIG.retryAttempts;
    },
    retryDelay: (attemptIndex: number) => 
      Math.min(1000 * 2 ** attemptIndex, BFF_CONFIG.retryDelay * 10),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  },
  mutations: {
    retry: false, // Don't retry mutations by default
    onError: (error: any) => {
      console.error('BFF Mutation Error:', error);
    }
  }
};

/**
 * BFF Hook Usage Examples (for documentation)
 */
export const BFF_EXAMPLES = {
  gameSession: `
    // Game session with real-time updates
    const { data: session, connectionStatus } = useBFFGameSession(sessionId, {
      campaignId,
      characterId,
      enableRealtime: true,
      suspense: true
    });
  `,
  
  characterDashboard: `
    // Character dashboard with quick stats fallback
    const { data: dashboard } = useBFFCharacterDashboard(characterId, {
      campaignId,
      suspense: false
    });
    
    // Quick stats for React Suspense
    const { data: quickStats } = useBFFCharacterQuickStats(characterId);
  `,
  
  streamingChat: `
    // Streaming chat with Server-Sent Events
    const { 
      sendMessage, 
      streamingState, 
      isTyping, 
      startTyping, 
      stopTyping 
    } = useBFFStreamingChat(sessionId);
    
    // Send message with audio
    sendMessage("Hello world!", { 
      includeAudio: true, 
      voiceId: 'narrator' 
    });
  `,
  
  webSocket: `
    // WebSocket real-time events
    const sendWSMessage = useBFFWebSocketSend();
    
    useBFFWebSocketSubscribe('dice_roll', (data) => {
      console.log('Dice rolled:', data.payload.result);
    });
  `,
  
  optimisticUpdates: `
    // Character hit points with optimistic updates
    const { takeDamage, heal, setHitPoints } = useBFFCharacterHitPoints(characterId);
    
    // Damage is applied immediately, then synced
    takeDamage(15);
  `
};

/**
 * Utility function to check if an error is a BFF error
 */
export function isBFFError(error: any): error is BFFError {
  return error instanceof BFFError || error?.name === 'BFFError';
}

/**
 * Utility function to extract user-friendly message from any error
 */
export function getBFFErrorMessage(error: any): string {
  if (isBFFError(error)) {
    return error.userFriendlyMessage;
  }
  
  if (error?.message) {
    // Transform common error messages
    const message = error.message.toLowerCase();
    if (message.includes('network')) {
      return 'Connection issue detected. Please check your internet connection.';
    }
    if (message.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again.';
    }
    if (message.includes('unauthorized')) {
      return 'You need to sign in to access this feature.';
    }
    if (message.includes('not found')) {
      return 'The requested data could not be found.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Utility function to determine if an error is retryable
 */
export function isBFFErrorRetryable(error: any): boolean {
  if (isBFFError(error)) {
    return error.retryable;
  }
  
  // Network errors are usually retryable
  if (error?.message?.toLowerCase().includes('network')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error?.message?.toLowerCase().includes('timeout')) {
    return true;
  }
  
  // 5xx errors are retryable
  if (error?.status >= 500) {
    return true;
  }
  
  // 4xx errors are usually not retryable (except 408, 429)
  if (error?.status >= 400 && error?.status < 500) {
    return error?.status === 408 || error?.status === 429;
  }
  
  return false;
}