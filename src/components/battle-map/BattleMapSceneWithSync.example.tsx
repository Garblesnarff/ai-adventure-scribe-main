/**
 * Battle Map Scene with Real-Time Sync - Example Usage
 *
 * This example shows how to integrate all the real-time synchronization
 * components into a battle map scene.
 *
 * Key Components:
 * 1. BattleMapWebSocketSync - Handles WebSocket connection and message routing
 * 2. TokenInteraction - Handles optimistic updates and tRPC mutations
 * 3. Token - Displays visual indicators for remote movements
 */

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { BattleMapWebSocketSync } from './BattleMapWebSocketSync';
import { Token } from './Token';
import { TokenInteraction } from './TokenInteraction';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { trpc } from '@/infrastructure/api/trpc-client';
import { useAuth } from '@/contexts/auth-context';
import type { Token as TokenData } from '@/types/token';
import type { SceneSettings } from '@/types/scene';

interface BattleMapSceneProps {
  sceneId: string;
  sceneSettings: SceneSettings;
}

/**
 * Example Battle Map Scene Component with Real-Time Sync
 */
export function BattleMapSceneWithSync({ sceneId, sceneSettings }: BattleMapSceneProps) {
  const { user } = useAuth();
  const [remoteMovingTokens, setRemoteMovingTokens] = useState<Set<string>>(new Set());

  // Fetch tokens for the scene
  const { data: tokens = [], refetch } = trpc.tokens.list.useQuery({ sceneId });

  // Get optimistic updates from store
  const optimisticUpdates = useBattleMapStore((state) => state.optimisticTokenUpdates);
  const selectedTokenIds = useBattleMapStore((state) => state.selectedTokenIds);
  const hoveredTokenId = useBattleMapStore((state) => state.hoveredTokenId);

  /**
   * Apply optimistic updates to token positions
   */
  const getTokenPosition = (token: TokenData): { x: number; y: number } => {
    const optimisticUpdate = optimisticUpdates.get(token.id);
    if (optimisticUpdate) {
      return { x: optimisticUpdate.x, y: optimisticUpdate.y };
    }
    return { x: token.x, y: token.y };
  };

  /**
   * Handle remote token updates
   */
  const handleRemoteTokenUpdate = (tokenId: string) => {
    // Show visual indicator that this token was moved remotely
    setRemoteMovingTokens((prev) => {
      const next = new Set(prev);
      next.add(tokenId);
      return next;
    });

    // Clear indicator after animation
    setTimeout(() => {
      setRemoteMovingTokens((prev) => {
        const next = new Set(prev);
        next.delete(tokenId);
        return next;
      });

      // Refetch tokens to get latest positions
      refetch();
    }, 1000);
  };

  return (
    <div className="battle-map-scene">
      {/* WebSocket Sync Component - handles real-time updates */}
      <BattleMapWebSocketSync
        sceneId={sceneId}
        currentUserId={user?.userId || ''}
        onRemoteTokenUpdate={handleRemoteTokenUpdate}
      />

      {/* 3D Canvas for rendering tokens */}
      <Canvas>
        {tokens.map((token) => {
          const position = getTokenPosition(token);
          const isSelected = selectedTokenIds.includes(token.id);
          const isHovered = hoveredTokenId === token.id;
          const isOwner = token.ownerIds.includes(user?.userId || '');
          const isBeingMovedByOther = remoteMovingTokens.has(token.id);

          // Create a modified token with optimistic position
          const tokenWithOptimisticPos = {
            ...token,
            x: position.x,
            y: position.y,
          };

          return (
            <TokenInteraction
              key={token.id}
              token={tokenWithOptimisticPos}
              sceneSettings={sceneSettings}
              enableDrag={isOwner}
              enableSelection={true}
            >
              <Token
                token={tokenWithOptimisticPos}
                gridSize={sceneSettings.gridSize}
                isSelected={isSelected}
                isHovered={isHovered}
                isOwner={isOwner}
                isBeingMovedByOther={isBeingMovedByOther}
              />
            </TokenInteraction>
          );
        })}
      </Canvas>
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * import { BattleMapSceneWithSync } from '@/components/battle-map/BattleMapSceneWithSync.example';
 *
 * function MyBattleMapPage() {
 *   const sceneId = "your-scene-id";
 *   const sceneSettings = {
 *     gridSize: 100,
 *     gridDistance: 5,
 *     // ... other settings
 *   };
 *
 *   return (
 *     <BattleMapSceneWithSync
 *       sceneId={sceneId}
 *       sceneSettings={sceneSettings}
 *     />
 *   );
 * }
 * ```
 *
 * How it works:
 *
 * 1. **Optimistic Updates Flow:**
 *    - User drags token → TokenInteraction immediately updates local state
 *    - TokenInteraction sends mutation to server with optimisticId
 *    - Server processes and broadcasts to other users
 *    - On success, optimistic update is removed
 *
 * 2. **WebSocket Update Flow:**
 *    - Other user moves token → Server broadcasts update
 *    - BattleMapWebSocketSync receives update
 *    - Cache is invalidated, tokens refetched
 *    - Visual indicator shows token was moved remotely
 *
 * 3. **Conflict Resolution:**
 *    - Uses last-write-wins strategy
 *    - OptimisticId ensures updates from same user don't conflict
 *    - Server is source of truth, optimistic updates are reconciled
 */
