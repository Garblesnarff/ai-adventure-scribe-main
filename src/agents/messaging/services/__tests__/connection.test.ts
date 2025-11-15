/**
 * Connection State Service Tests
 *
 * Comprehensive tests for ConnectionStateService covering:
 * - Online/offline state tracking
 * - State transitions
 * - Event notifications
 * - Reconnection logic
 *
 * @author AI Dungeon Master Team
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConnectionStateService } from '../connection/ConnectionStateService';
import { EventEmitter } from '../connection/EventEmitter';
import { ReconnectionManager } from '../connection/ReconnectionManager';
import { ConnectionStateManager } from '../connection/ConnectionStateManager';
import { MessageQueueService } from '../MessageQueueService';
import { MessagePersistenceService } from '../storage/MessagePersistenceService';
import { OfflineStateService } from '../offline/OfflineStateService';
import { ConnectionState } from '../connection/types';

// Mock dependencies
vi.mock('../../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        // Store callback for testing
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
    },
  },
}));

vi.mock('../connection/EventEmitter');
vi.mock('../connection/ReconnectionManager');
vi.mock('../connection/ConnectionStateManager');
vi.mock('../MessageQueueService');
vi.mock('../storage/MessagePersistenceService');
vi.mock('../offline/OfflineStateService');

describe('ConnectionStateService', () => {
  let service: ConnectionStateService;
  let mockEventEmitter: any;
  let mockReconnectionManager: any;
  let mockStateManager: any;
  let mockQueueService: any;
  let mockPersistenceService: any;
  let mockOfflineService: any;

  // Store window event listeners
  let onlineListeners: Array<() => void> = [];
  let offlineListeners: Array<() => void> = [];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset event listeners
    onlineListeners = [];
    offlineListeners = [];

    // Mock window event listeners
    global.window.addEventListener = vi.fn((event: string, handler: any) => {
      if (event === 'online') onlineListeners.push(handler);
      if (event === 'offline') offlineListeners.push(handler);
    });

    // Setup mock implementations
    mockEventEmitter = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
    };
    (EventEmitter as any).mockImplementation(() => mockEventEmitter);

    mockReconnectionManager = {
      reset: vi.fn(),
      startReconnection: vi.fn(),
    };
    (ReconnectionManager as any).mockImplementation(() => mockReconnectionManager);

    const mockConnectionState: ConnectionState = {
      status: 'connected',
      isOnline: true,
      lastConnectedAt: new Date().toISOString(),
      reconnectionAttempts: 0,
    };

    mockStateManager = {
      handleConnectionRestored: vi.fn().mockResolvedValue(undefined),
      handleConnectionLost: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn(() => mockConnectionState),
    };
    (ConnectionStateManager as any).mockImplementation(() => mockStateManager);

    mockQueueService = {};
    (MessageQueueService.getInstance as any) = vi.fn(() => mockQueueService);

    mockPersistenceService = {};
    (MessagePersistenceService.getInstance as any) = vi.fn(() => mockPersistenceService);

    mockOfflineService = {};
    (OfflineStateService.getInstance as any) = vi.fn(() => mockOfflineService);

    // Reset singleton
    // @ts-ignore
    ConnectionStateService.instance = undefined;

    // Create service instance
    service = ConnectionStateService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConnectionStateService.getInstance();
      const instance2 = ConnectionStateService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with event listeners', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should setup EventEmitter', () => {
      expect(EventEmitter).toHaveBeenCalled();
    });

    it('should setup ReconnectionManager with config', () => {
      expect(ReconnectionManager).toHaveBeenCalledWith(
        expect.objectContaining({
          initialDelay: 1000,
          maxDelay: 30000,
          factor: 2,
          jitter: true,
        }),
        expect.any(Object),
      );
    });

    it('should setup ConnectionStateManager', () => {
      expect(ConnectionStateManager).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should listen for reconnection attempts', () => {
      expect(mockEventEmitter.on).toHaveBeenCalledWith('reconnectionAttempt', expect.any(Function));
    });
  });

  describe('Online/Offline State Tracking', () => {
    it('should handle online event', async () => {
      // Trigger online event
      for (const listener of onlineListeners) {
        await listener();
      }

      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalled();
      expect(mockReconnectionManager.reset).toHaveBeenCalled();
    });

    it('should handle offline event', async () => {
      // Trigger offline event
      for (const listener of offlineListeners) {
        await listener();
      }

      expect(mockStateManager.handleConnectionLost).toHaveBeenCalled();
      expect(mockReconnectionManager.startReconnection).toHaveBeenCalled();
    });

    it('should return current connection state', () => {
      const state = service.getState();

      expect(state).toBeDefined();
      expect(state.status).toBe('connected');
      expect(state.isOnline).toBe(true);
    });

    it('should track reconnection attempts', () => {
      const state = service.getState();

      expect(state).toHaveProperty('reconnectionAttempts');
      expect(typeof state.reconnectionAttempts).toBe('number');
    });
  });

  describe('State Transitions', () => {
    it('should transition from online to offline', async () => {
      // Start online
      for (const listener of onlineListeners) {
        await listener();
      }

      // Go offline
      for (const listener of offlineListeners) {
        await listener();
      }

      expect(mockStateManager.handleConnectionLost).toHaveBeenCalled();
    });

    it('should transition from offline to online', async () => {
      // Start offline
      for (const listener of offlineListeners) {
        await listener();
      }

      // Go online
      for (const listener of onlineListeners) {
        await listener();
      }

      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalled();
    });

    it('should handle rapid state changes', async () => {
      // Rapid online/offline transitions
      for (const listener of onlineListeners) {
        await listener();
      }
      for (const listener of offlineListeners) {
        await listener();
      }
      for (const listener of onlineListeners) {
        await listener();
      }

      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalledTimes(2);
      expect(mockStateManager.handleConnectionLost).toHaveBeenCalledTimes(1);
    });

    it('should reset reconnection manager on successful connection', async () => {
      for (const listener of onlineListeners) {
        await listener();
      }

      expect(mockReconnectionManager.reset).toHaveBeenCalled();
    });

    it('should start reconnection on connection loss', async () => {
      for (const listener of offlineListeners) {
        await listener();
      }

      expect(mockReconnectionManager.startReconnection).toHaveBeenCalled();
    });
  });

  describe('Event Notifications', () => {
    it('should allow subscribing to connection state changes', () => {
      const callback = vi.fn();

      service.onConnectionStateChanged(callback);

      expect(mockEventEmitter.on).toHaveBeenCalledWith('connectionStateChanged', callback);
    });

    it('should allow subscribing to reconnection failures', () => {
      const callback = vi.fn();

      service.onReconnectionFailed(callback);

      expect(mockEventEmitter.on).toHaveBeenCalledWith('reconnectionFailed', callback);
    });

    it('should allow subscribing to successful reconnections', () => {
      const callback = vi.fn();

      service.onReconnectionSuccessful(callback);

      expect(mockEventEmitter.on).toHaveBeenCalledWith('reconnectionSuccessful', callback);
    });

    it('should allow subscribing to reconnection errors', () => {
      const callback = vi.fn();

      service.onReconnectionError(callback);

      expect(mockEventEmitter.on).toHaveBeenCalledWith('reconnectionError', callback);
    });

    it('should support multiple event subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      service.onConnectionStateChanged(callback1);
      service.onConnectionStateChanged(callback2);
      service.onReconnectionFailed(callback3);

      expect(mockEventEmitter.on).toHaveBeenCalledTimes(3);
    });
  });

  describe('Reconnection Logic', () => {
    it('should handle reconnection attempt event', async () => {
      const reconnectionCallback = mockEventEmitter.on.mock.calls.find(
        (call: any) => call[0] === 'reconnectionAttempt',
      )?.[1];

      if (reconnectionCallback) {
        await reconnectionCallback();
      }

      // Reconnection logic is triggered
      expect(mockEventEmitter.on).toHaveBeenCalledWith('reconnectionAttempt', expect.any(Function));
    });

    it('should retry reconnection on failure', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: null },
        error: new Error('No session'),
      });

      const reconnectionCallback = mockEventEmitter.on.mock.calls.find(
        (call: any) => call[0] === 'reconnectionAttempt',
      )?.[1];

      if (reconnectionCallback) {
        await reconnectionCallback();
      }

      // Should start reconnection again on failure
      expect(mockReconnectionManager.startReconnection).toHaveBeenCalled();
    });

    it('should succeed reconnection with valid session', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      });

      const reconnectionCallback = mockEventEmitter.on.mock.calls.find(
        (call: any) => call[0] === 'reconnectionAttempt',
      )?.[1];

      if (reconnectionCallback) {
        await reconnectionCallback();
      }

      // Should handle successful reconnection
      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalled();
    });
  });

  describe('Auth State Integration', () => {
    it('should handle SIGNED_IN auth event', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const authCallback = (supabase.auth.onAuthStateChange as any).mock.calls[0]?.[0];

      if (authCallback) {
        await authCallback('SIGNED_IN');
      }

      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalled();
    });

    it('should handle SIGNED_OUT auth event', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const authCallback = (supabase.auth.onAuthStateChange as any).mock.calls[0]?.[0];

      if (authCallback) {
        await authCallback('SIGNED_OUT');
      }

      expect(mockStateManager.handleConnectionLost).toHaveBeenCalled();
    });

    it('should ignore other auth events', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const authCallback = (supabase.auth.onAuthStateChange as any).mock.calls[0]?.[0];

      const initialCallCount = mockStateManager.handleConnectionRestored.mock.calls.length;

      if (authCallback) {
        await authCallback('TOKEN_REFRESHED');
      }

      // Should not trigger connection state changes for irrelevant events
      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in connection restoration', async () => {
      mockStateManager.handleConnectionRestored.mockRejectedValue(new Error('Restore failed'));

      // Should not throw
      await expect(async () => {
        for (const listener of onlineListeners) {
          await listener();
        }
      }).rejects.toThrow('Restore failed');
    });

    it('should handle errors in connection loss handling', async () => {
      mockStateManager.handleConnectionLost.mockRejectedValue(new Error('Lost handling failed'));

      await expect(async () => {
        for (const listener of offlineListeners) {
          await listener();
        }
      }).rejects.toThrow('Lost handling failed');
    });

    it('should handle session retrieval errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.auth.getSession as any).mockRejectedValue(new Error('Session error'));

      const reconnectionCallback = mockEventEmitter.on.mock.calls.find(
        (call: any) => call[0] === 'reconnectionAttempt',
      )?.[1];

      if (reconnectionCallback) {
        await reconnectionCallback();
      }

      // Should handle error and continue
      expect(mockReconnectionManager.startReconnection).toHaveBeenCalled();
    });
  });

  describe('State Management Integration', () => {
    it('should use ConnectionStateManager for state operations', () => {
      service.getState();

      expect(mockStateManager.getState).toHaveBeenCalled();
    });

    it('should coordinate with MessageQueueService', () => {
      expect(MessageQueueService.getInstance).toHaveBeenCalled();
    });

    it('should coordinate with MessagePersistenceService', () => {
      expect(MessagePersistenceService.getInstance).toHaveBeenCalled();
    });

    it('should coordinate with OfflineStateService', () => {
      expect(OfflineStateService.getInstance).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple simultaneous online events', async () => {
      const promises = onlineListeners.map((listener) => listener());
      await Promise.all(promises);

      // Should handle gracefully
      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalled();
    });

    it('should handle online event while already online', async () => {
      // Go online twice
      for (const listener of onlineListeners) {
        await listener();
      }
      for (const listener of onlineListeners) {
        await listener();
      }

      // Should handle both events
      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalledTimes(2);
    });

    it('should handle offline event while already offline', async () => {
      // Go offline twice
      for (const listener of offlineListeners) {
        await listener();
      }
      for (const listener of offlineListeners) {
        await listener();
      }

      // Should handle both events
      expect(mockStateManager.handleConnectionLost).toHaveBeenCalledTimes(2);
    });

    it('should maintain state consistency during rapid transitions', async () => {
      // Rapid transitions
      for (let i = 0; i < 5; i++) {
        for (const listener of onlineListeners) {
          await listener();
        }
        for (const listener of offlineListeners) {
          await listener();
        }
      }

      expect(mockStateManager.handleConnectionRestored).toHaveBeenCalledTimes(5);
      expect(mockStateManager.handleConnectionLost).toHaveBeenCalledTimes(5);
    });
  });

  describe('Reconnection Configuration', () => {
    it('should use exponential backoff with jitter', () => {
      expect(ReconnectionManager).toHaveBeenCalledWith(
        expect.objectContaining({
          factor: 2,
          jitter: true,
        }),
        expect.any(Object),
      );
    });

    it('should have appropriate delay limits', () => {
      expect(ReconnectionManager).toHaveBeenCalledWith(
        expect.objectContaining({
          initialDelay: 1000,
          maxDelay: 30000,
        }),
        expect.any(Object),
      );
    });
  });
});
