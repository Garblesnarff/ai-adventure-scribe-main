/**
 * Fog Brush Manager
 *
 * Handles fog brush tool with debouncing and batching for performance.
 * Accumulates brush strokes and sends them in batches via WebSocket.
 *
 * @module components/battle-map/FogBrushManager
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Point2D } from '@/types/scene';
import type { RevealAreaInput } from '@/types/fog-of-war';
import { createCircularPolygon, douglasPeucker } from '@/utils/fog-calculations';
import { trpc } from '@/lib/trpc';

/**
 * Fog brush stroke accumulator
 */
interface BrushStroke {
  center: Point2D;
  radius: number;
  timestamp: number;
}

/**
 * Fog brush manager options
 */
export interface FogBrushManagerOptions {
  sceneId: string;
  userId: string;
  mode: 'reveal' | 'conceal';
  debounceMs?: number;
  batchSize?: number;
  simplificationTolerance?: number;
}

/**
 * useFogBrushManager Hook
 *
 * Manages fog brush strokes with automatic batching and debouncing.
 * Accumulates strokes and sends them to server in optimized batches.
 *
 * @param options - Brush manager configuration
 * @returns Brush control functions
 *
 * @example
 * ```tsx
 * const { addStroke, flush, isProcessing } = useFogBrushManager({
 *   sceneId: 'scene-123',
 *   userId: 'user-456',
 *   mode: 'reveal',
 * });
 *
 * // Add strokes as user drags
 * onMouseMove={(e) => {
 *   addStroke({ x: e.x, y: e.y }, 50);
 * }}
 *
 * // Flush on release
 * onMouseUp={() => {
 *   flush();
 * }}
 * ```
 */
export function useFogBrushManager(options: FogBrushManagerOptions) {
  const {
    sceneId,
    userId,
    mode,
    debounceMs = 100,
    batchSize = 10,
    simplificationTolerance = 2,
  } = options;

  const strokesRef = useRef<BrushStroke[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // tRPC mutations
  const revealMutation = trpc.fogOfWar.revealBatch.useMutation();
  const concealMutation = trpc.fogOfWar.concealBatch.useMutation();

  /**
   * Convert accumulated strokes to polygons
   */
  const strokesToPolygons = useCallback(
    (strokes: BrushStroke[]): RevealAreaInput[] => {
      const polygons: RevealAreaInput[] = [];

      for (const stroke of strokes) {
        // Create circular polygon for stroke
        const points = createCircularPolygon(stroke.center, stroke.radius, 16);

        // Simplify polygon using Douglas-Peucker algorithm to reduce point count
        const simplifiedPoints = douglasPeucker(points, simplificationTolerance);

        if (simplifiedPoints.length >= 3) {
          polygons.push({
            points: simplifiedPoints,
            revealedBy: userId,
            isPermanent: true,
          });
        }
      }

      return polygons;
    },
    [userId, simplificationTolerance]
  );

  /**
   * Process and send accumulated strokes
   */
  const processStrokes = useCallback(async () => {
    if (strokesRef.current.length === 0 || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Convert strokes to polygons
      const polygons = strokesToPolygons(strokesRef.current);

      if (polygons.length === 0) {
        return;
      }

      // Send batch to server
      if (mode === 'reveal') {
        await revealMutation.mutateAsync({
          sceneId,
          polygons,
          targetUserId: userId,
        });
      } else {
        // For conceal mode, we need to get area IDs first
        // This is a simplified implementation
        // In production, you'd track which areas to remove
        console.warn('Batch conceal not fully implemented');
      }

      // Clear processed strokes
      strokesRef.current = [];
    } catch (error) {
      console.error('Error processing fog brush strokes:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [mode, sceneId, userId, strokesToPolygons, revealMutation]);

  /**
   * Add a brush stroke
   */
  const addStroke = useCallback(
    (center: Point2D, radius: number) => {
      strokesRef.current.push({
        center,
        radius,
        timestamp: Date.now(),
      });

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Use requestAnimationFrame for smooth visual updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        // Visual feedback happens here in parent component
      });

      // Process batch if we've accumulated enough strokes
      if (strokesRef.current.length >= batchSize) {
        processStrokes();
      } else {
        // Otherwise, debounce the processing
        debounceTimerRef.current = setTimeout(() => {
          processStrokes();
        }, debounceMs);
      }
    },
    [batchSize, debounceMs, processStrokes]
  );

  /**
   * Flush all pending strokes immediately
   */
  const flush = useCallback(() => {
    // Clear timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Process immediately
    processStrokes();
  }, [processStrokes]);

  /**
   * Clear all pending strokes without processing
   */
  const clear = useCallback(() => {
    strokesRef.current = [];

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Flush remaining strokes on unmount
      if (strokesRef.current.length > 0) {
        processStrokes();
      }
    };
  }, [processStrokes]);

  return {
    addStroke,
    flush,
    clear,
    isProcessing: isProcessingRef.current,
    pendingStrokeCount: strokesRef.current.length,
  };
}

/**
 * FogBrushVisualizer Component
 *
 * Renders preview of pending brush strokes before they're sent to server.
 *
 * @example
 * ```tsx
 * <FogBrushVisualizer
 *   strokes={pendingStrokes}
 *   mode="reveal"
 * />
 * ```
 */
export interface FogBrushVisualizerProps {
  strokes: Array<{ center: Point2D; radius: number }>;
  mode: 'reveal' | 'conceal';
}

export function FogBrushVisualizer({ strokes, mode }: FogBrushVisualizerProps) {
  const color = mode === 'reveal' ? '#4ade80' : '#f87171';

  return (
    <group name="fog-brush-preview" position={[0, 0, 20]}>
      {strokes.map((stroke, index) => (
        <mesh
          key={index}
          position={[stroke.center.x, stroke.center.y, 0]}
          renderOrder={300}
        >
          <circleGeometry args={[stroke.radius, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
