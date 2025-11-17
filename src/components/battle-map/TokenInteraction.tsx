/**
 * Token Interaction Wrapper
 *
 * Wraps a token component with all interaction handlers:
 * - Click to select
 * - Multi-select with Ctrl/Cmd+Click
 * - Drag to move
 * - Right-click context menu
 * - Double-click to open character sheet
 * - Touch support (tap, long-press, drag)
 * - Hover states
 *
 * This component handles all user interactions and delegates to the appropriate handlers.
 */

import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { TokenContextMenu } from './TokenContextMenu';
import { TokenDragGhost2D } from './TokenDragGhost';
import { useTokenSelection } from '@/hooks/use-token-selection';
import { useTokenDrag } from '@/hooks/use-token-drag';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { trpc } from '@/infrastructure/api/trpc-client';
import type { Token } from '@/types/token';
import type { SceneSettings } from '@/types/scene';
import type { LayerType } from '@/types/scene';

export interface TokenInteractionProps {
  /** The token to wrap with interactions */
  token: Token;
  /** Scene settings for grid configuration */
  sceneSettings: SceneSettings;
  /** The token visual component to render */
  children: React.ReactNode;
  /** Callback when token is clicked */
  onClick?: (token: Token, event: React.MouseEvent) => void;
  /** Callback when token is double-clicked */
  onDoubleClick?: (token: Token) => void;
  /** Callback when token movement is complete */
  onMoveComplete?: (token: Token, x: number, y: number) => void;
  /** Callback to view character sheet */
  onViewCharacterSheet?: (token: Token) => void;
  /** Callback to edit token */
  onEditToken?: (token: Token) => void;
  /** Callback to remove token */
  onRemoveToken?: (token: Token) => void;
  /** Callback to move token to different layer */
  onMoveToLayer?: (token: Token, layer: LayerType) => void;
  /** Callback to duplicate token */
  onDuplicateToken?: (token: Token) => void;
  /** Whether this token can be edited */
  canEdit?: boolean;
  /** Whether this token can be deleted */
  canDelete?: boolean;
  /** Whether dragging is enabled */
  enableDrag?: boolean;
  /** Whether selection is enabled */
  enableSelection?: boolean;
  /** Custom movement validation function */
  validateMovement?: (from: { x: number; y: number }, to: { x: number; y: number }, distance: number) => boolean;
}

/**
 * Token interaction wrapper component
 */
export function TokenInteraction({
  token,
  sceneSettings,
  children,
  onClick,
  onDoubleClick,
  onMoveComplete,
  onViewCharacterSheet,
  onEditToken,
  onRemoveToken,
  onMoveToLayer,
  onDuplicateToken,
  canEdit = true,
  canDelete = true,
  enableDrag = true,
  enableSelection = true,
  validateMovement,
}: TokenInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const [isHovered, setIsHovered] = useState(false);

  const setHoveredToken = useBattleMapStore((state) => state.setHoveredToken);
  const addOptimisticUpdate = useBattleMapStore((state) => state.addOptimisticUpdate);
  const removeOptimisticUpdate = useBattleMapStore((state) => state.removeOptimisticUpdate);

  // tRPC mutation for moving tokens
  const moveTokenMutation = trpc.tokens.move.useMutation();

  // Selection hook
  const { isSelected, handleTokenClick } = useTokenSelection({
    enableKeyboardShortcuts: true,
  });

  // Drag hook with optimistic updates
  const { dragState, handlePointerDown, handlePointerMove, handlePointerUp } = useTokenDrag({
    token,
    sceneSettings,
    validateMovement,
    onDragEnd: (tokenId, position) => {
      // Generate optimistic ID for reconciliation
      const optimisticId = `${tokenId}-${Date.now()}-${Math.random()}`;

      // Add optimistic update immediately
      addOptimisticUpdate(tokenId, position.x, position.y, optimisticId);

      // Call tRPC mutation
      moveTokenMutation.mutate(
        {
          tokenId,
          x: position.x,
          y: position.y,
          optimisticId,
        },
        {
          onSuccess: () => {
            // Remove optimistic update when server confirms
            removeOptimisticUpdate(optimisticId);

            // Call original callback if provided
            if (onMoveComplete) {
              onMoveComplete(token, position.x, position.y);
            }
          },
          onError: (error) => {
            // Remove failed optimistic update
            removeOptimisticUpdate(optimisticId);
            console.error('[TokenInteraction] Failed to move token:', error);
          },
        }
      );
    },
  });

  const selected = isSelected(token.id);
  const isBeingDragged = dragState.isDragging;

  /**
   * Handle click with single/double click detection
   */
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      // Don't handle clicks if we just finished dragging
      if (isBeingDragged) return;

      event.stopPropagation();

      clickCountRef.current += 1;

      // Clear existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      // Wait to distinguish single vs double click
      clickTimeoutRef.current = setTimeout(
        () => {
          if (clickCountRef.current === 1) {
            // Single click - select token
            if (enableSelection) {
              handleTokenClick(token.id, {
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
              });
            }

            if (onClick) {
              onClick(token, event);
            }
          } else if (clickCountRef.current >= 2) {
            // Double click - open character sheet
            if (onDoubleClick) {
              onDoubleClick(token);
            } else if (onViewCharacterSheet) {
              onViewCharacterSheet(token);
            }
          }

          clickCountRef.current = 0;
        },
        clickCountRef.current >= 2 ? 0 : 250, // Immediate for double-click, delay for single
      );
    },
    [
      token,
      isBeingDragged,
      enableSelection,
      handleTokenClick,
      onClick,
      onDoubleClick,
      onViewCharacterSheet,
    ],
  );

  /**
   * Handle pointer down for drag start
   */
  const handlePointerDownWrapper = useCallback(
    (event: React.PointerEvent) => {
      if (!enableDrag || token.locked) return;

      // Only handle left mouse button
      if (event.button !== 0) return;

      event.stopPropagation();
      handlePointerDown(event);
    },
    [enableDrag, token.locked, handlePointerDown],
  );

  /**
   * Handle pointer move for dragging
   */
  const handlePointerMoveWrapper = useCallback(
    (event: React.PointerEvent) => {
      if (!enableDrag) return;
      handlePointerMove(event);
    },
    [enableDrag, handlePointerMove],
  );

  /**
   * Handle pointer up for drag end
   */
  const handlePointerUpWrapper = useCallback(
    (event: React.PointerEvent) => {
      if (!enableDrag) return;
      handlePointerUp(event);
    },
    [enableDrag, handlePointerUp],
  );

  /**
   * Handle mouse enter for hover state
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setHoveredToken(token.id);
  }, [token.id, setHoveredToken]);

  /**
   * Handle mouse leave for hover state
   */
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setHoveredToken(null);
  }, [setHoveredToken]);

  /**
   * Handle context menu (right-click)
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handle touch long-press for context menu on mobile
   */
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    // TODO: Implement long-press detection for mobile context menu
    // This would require a timeout that shows the context menu after 500ms
  }, []);

  /**
   * Cleanup on unmount
   */
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <TokenContextMenu
        token={token}
        onViewCharacterSheet={onViewCharacterSheet}
        onEditToken={onEditToken}
        onRemoveToken={onRemoveToken}
        onMoveToLayer={onMoveToLayer}
        onDuplicateToken={onDuplicateToken}
        canEdit={canEdit}
        canDelete={canDelete}
      >
        <div
          ref={containerRef}
          className="token-interaction-wrapper"
          onClick={handleClick}
          onPointerDown={handlePointerDownWrapper}
          onPointerMove={handlePointerMoveWrapper}
          onPointerUp={handlePointerUpWrapper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          data-token-id={token.id}
          data-selected={selected}
          data-hovered={isHovered}
          data-dragging={isBeingDragged}
          style={{
            cursor: enableDrag && !token.locked ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
            outline: selected ? '2px solid #3b82f6' : undefined, // blue-500
            outlineOffset: '2px',
            transition: 'outline 0.15s ease-in-out',
            opacity: isBeingDragged ? 0.5 : 1,
          }}
        >
          {children}
        </div>
      </TokenContextMenu>

      {/* Drag ghost preview */}
      {dragState.isDragging && dragState.snappedPosition && (
        <TokenDragGhost2D
          token={token}
          position={dragState.snappedPosition}
          isValidDrop={dragState.isValidDrop}
          visible={true}
          opacity={0.7}
        />
      )}
    </>
  );
}

/**
 * Hook for token interaction state (for external use)
 */
export function useTokenInteractionState(tokenId: string) {
  const isSelected = useBattleMapStore((state) => state.selectedTokenIds.includes(tokenId));
  const isTargeted = useBattleMapStore((state) => state.targetedTokenIds.includes(tokenId));
  const isHovered = useBattleMapStore((state) => state.hoveredTokenId === tokenId);
  const isDragged = useBattleMapStore((state) => state.draggedTokenId === tokenId);

  return {
    isSelected,
    isTargeted,
    isHovered,
    isDragged,
  };
}

export default TokenInteraction;
