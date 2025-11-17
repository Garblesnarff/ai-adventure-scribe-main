/**
 * Token Drag Hook
 *
 * Handles token dragging with grid snapping, movement validation, and optimistic updates.
 * Integrates with tRPC for persisting token position changes.
 *
 * Features:
 * - Drag detection and tracking
 * - Grid snapping
 * - Movement distance validation
 * - Optimistic UI updates
 * - Ghost token preview during drag
 * - Valid/invalid drop zone indicators
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import type { Token } from '@/types/token';
import type { SceneSettings } from '@/types/scene';

export interface Point2D {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  startPosition: Point2D | null;
  currentPosition: Point2D | null;
  snappedPosition: Point2D | null;
  isValidDrop: boolean;
}

export interface UseTokenDragOptions {
  token: Token;
  sceneSettings: SceneSettings;
  onDragStart?: (tokenId: string, position: Point2D) => void;
  onDragMove?: (tokenId: string, position: Point2D) => void;
  onDragEnd?: (tokenId: string, position: Point2D) => void;
  validateMovement?: (from: Point2D, to: Point2D, distance: number) => boolean;
  gridSize?: number;
}

export interface UseTokenDragReturn {
  dragState: DragState;
  handlePointerDown: (event: PointerEvent | React.PointerEvent) => void;
  handlePointerMove: (event: PointerEvent | React.PointerEvent) => void;
  handlePointerUp: (event: PointerEvent | React.PointerEvent) => void;
  cancelDrag: () => void;
}

/**
 * Snap a position to the grid
 */
function snapToGrid(position: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

/**
 * Calculate distance between two points in pixels
 */
function calculateDistance(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert pixel distance to grid units (feet/meters)
 */
function pixelsToGridUnits(pixels: number, gridSize: number, gridDistance: number): number {
  const gridSquares = pixels / gridSize;
  return gridSquares * gridDistance;
}

/**
 * Hook for handling token drag operations
 */
export function useTokenDrag(options: UseTokenDragOptions): UseTokenDragReturn {
  const {
    token,
    sceneSettings,
    onDragStart,
    onDragMove,
    onDragEnd,
    validateMovement,
    gridSize = sceneSettings.gridSize,
  } = options;

  const setDraggedToken = useBattleMapStore((state) => state.setDraggedToken);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPosition: null,
    currentPosition: null,
    snappedPosition: null,
    isValidDrop: true,
  });

  const dragStartRef = useRef<Point2D | null>(null);
  const isDraggingRef = useRef(false);
  const dragThreshold = 5; // pixels to move before considering it a drag

  /**
   * Validate if the movement is allowed
   */
  const validateDrop = useCallback(
    (from: Point2D, to: Point2D): boolean => {
      if (validateMovement) {
        const distancePixels = calculateDistance(from, to);
        const distanceUnits = pixelsToGridUnits(
          distancePixels,
          gridSize,
          sceneSettings.gridDistance,
        );
        return validateMovement(from, to, distanceUnits);
      }
      return true; // Allow all movements by default
    },
    [validateMovement, gridSize, sceneSettings.gridDistance],
  );

  /**
   * Handle pointer down (start potential drag)
   */
  const handlePointerDown = useCallback(
    (event: PointerEvent | React.PointerEvent) => {
      // Only handle left mouse button or primary touch
      if ('button' in event && event.button !== 0) return;

      const target = event.target as HTMLElement;
      target.setPointerCapture?.(event.pointerId);

      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    [],
  );

  /**
   * Handle pointer move (track drag)
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent | React.PointerEvent) => {
      if (!dragStartRef.current) return;

      const currentPos = {
        x: event.clientX,
        y: event.clientY,
      };

      // Check if we've moved enough to start dragging
      if (!isDraggingRef.current) {
        const distance = calculateDistance(dragStartRef.current, currentPos);
        if (distance > dragThreshold) {
          isDraggingRef.current = true;
          setDraggedToken(token.id);

          const startPosition = { x: token.x, y: token.y };
          setDragState({
            isDragging: true,
            startPosition,
            currentPosition: startPosition,
            snappedPosition: startPosition,
            isValidDrop: true,
          });

          if (onDragStart) {
            onDragStart(token.id, startPosition);
          }
        }
        return;
      }

      // Calculate new position based on drag delta
      const deltaX = currentPos.x - dragStartRef.current.x;
      const deltaY = currentPos.y - dragStartRef.current.y;

      const newPosition = {
        x: token.x + deltaX,
        y: token.y + deltaY,
      };

      const snapped = snapToGrid(newPosition, gridSize);
      const isValid = validateDrop({ x: token.x, y: token.y }, snapped);

      setDragState((prev) => ({
        ...prev,
        currentPosition: newPosition,
        snappedPosition: snapped,
        isValidDrop: isValid,
      }));

      if (onDragMove) {
        onDragMove(token.id, snapped);
      }
    },
    [token, gridSize, validateDrop, onDragStart, onDragMove, setDraggedToken],
  );

  /**
   * Handle pointer up (end drag)
   */
  const handlePointerUp = useCallback(
    (event: PointerEvent | React.PointerEvent) => {
      const target = event.target as HTMLElement;
      target.releasePointerCapture?.(event.pointerId);

      if (isDraggingRef.current && dragState.snappedPosition && dragState.isValidDrop) {
        // End the drag and update token position
        if (onDragEnd) {
          onDragEnd(token.id, dragState.snappedPosition);
        }
      }

      // Reset drag state
      dragStartRef.current = null;
      isDraggingRef.current = false;
      setDraggedToken(null);

      setDragState({
        isDragging: false,
        startPosition: null,
        currentPosition: null,
        snappedPosition: null,
        isValidDrop: true,
      });
    },
    [dragState, token.id, onDragEnd, setDraggedToken],
  );

  /**
   * Cancel drag operation
   */
  const cancelDrag = useCallback(() => {
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDraggedToken(null);

    setDragState({
      isDragging: false,
      startPosition: null,
      currentPosition: null,
      snappedPosition: null,
      isValidDrop: true,
    });
  }, [setDraggedToken]);

  // Cancel drag on ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDraggingRef.current) {
        cancelDrag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelDrag]);

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelDrag,
  };
}

/**
 * Extended hook with tRPC integration for persisting token moves
 */
export interface UseTokenDragWithMutationOptions extends UseTokenDragOptions {
  onMutationSuccess?: (token: Token) => void;
  onMutationError?: (error: Error) => void;
}

/**
 * Hook for token dragging with automatic tRPC mutation
 * Note: You'll need to implement the actual tRPC mutation call based on your setup
 */
export function useTokenDragWithMutation(
  options: UseTokenDragWithMutationOptions,
): UseTokenDragReturn {
  const { onMutationSuccess, onMutationError, ...dragOptions } = options;

  // TODO: Add tRPC mutation hook when tRPC client is configured
  // const moveMutation = trpc.tokens.move.useMutation({
  //   onSuccess: onMutationSuccess,
  //   onError: onMutationError,
  // });

  const handleDragEnd = useCallback(
    (tokenId: string, position: Point2D) => {
      // Optimistically update UI
      if (dragOptions.onDragEnd) {
        dragOptions.onDragEnd(tokenId, position);
      }

      // TODO: Call tRPC mutation
      // moveMutation.mutate({
      //   tokenId,
      //   x: position.x,
      //   y: position.y,
      // });
    },
    [dragOptions],
  );

  return useTokenDrag({
    ...dragOptions,
    onDragEnd: handleDragEnd,
  });
}
