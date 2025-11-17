/**
 * Battle Map WebSocket Synchronization Component
 *
 * Handles real-time synchronization of battle map state via WebSocket.
 * Listens for token updates from other users and updates local state accordingly.
 *
 * This component should be rendered once per battle map scene to enable
 * real-time collaboration features.
 *
 * Features:
 * - Token position synchronization
 * - Optimistic update reconciliation
 * - Visual indicators for remote token movements
 * - Automatic reconnection
 */

import { useEffect, useState, useCallback } from 'react';
import { useSceneWebSocket, type TokenUpdateData } from '@/hooks/useSceneWebSocket';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { trpc } from '@/infrastructure/api/trpc-client';

export interface BattleMapWebSocketSyncProps {
  /** Scene ID to sync */
  sceneId: string | null;
  /** User ID of current user */
  currentUserId: string;
  /** Callback when a remote token update is received */
  onRemoteTokenUpdate?: (tokenId: string, data: TokenUpdateData) => void;
}

/**
 * Component that handles WebSocket synchronization for battle map
 */
export function BattleMapWebSocketSync({
  sceneId,
  currentUserId,
  onRemoteTokenUpdate,
}: BattleMapWebSocketSyncProps) {
  const removeOptimisticUpdate = useBattleMapStore((state) => state.removeOptimisticUpdate);
  const [remoteMovingTokens, setRemoteMovingTokens] = useState<Set<string>>(new Set());

  // Get tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  /**
   * Handle token updates from WebSocket
   */
  const handleTokenUpdate = useCallback(
    (data: TokenUpdateData) => {
      console.log('[BattleMapWebSocketSync] Token update received:', data);

      // If this update has an optimisticId, remove it from our pending updates
      if (data.optimisticId) {
        removeOptimisticUpdate(data.optimisticId);
      }

      // Mark token as being moved by another user (temporarily)
      setRemoteMovingTokens((prev) => {
        const next = new Set(prev);
        next.add(data.tokenId);
        return next;
      });

      // Clear the indicator after a short delay
      setTimeout(() => {
        setRemoteMovingTokens((prev) => {
          const next = new Set(prev);
          next.delete(data.tokenId);
          return next;
        });
      }, 1000);

      // Invalidate token query cache to refetch updated positions
      utils.tokens.list.invalidate();

      // Call custom callback if provided
      if (onRemoteTokenUpdate) {
        onRemoteTokenUpdate(data.tokenId, data);
      }
    },
    [removeOptimisticUpdate, utils.tokens.list, onRemoteTokenUpdate]
  );

  /**
   * Connect to scene WebSocket
   */
  const { isConnected, connectionState } = useSceneWebSocket({
    sceneId,
    onTokenUpdate: handleTokenUpdate,
  });

  /**
   * Log connection state changes
   */
  useEffect(() => {
    console.log('[BattleMapWebSocketSync] Connection state:', connectionState);
  }, [connectionState]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to check if a token is being moved by another user
 */
export function useIsTokenBeingMovedByOther(tokenId: string): boolean {
  // This would need to be tracked in the store or via a context
  // For now, we'll return false as a placeholder
  // In a full implementation, you'd track this in the BattleMapWebSocketSync component
  // and expose it via a context or store
  return false;
}
