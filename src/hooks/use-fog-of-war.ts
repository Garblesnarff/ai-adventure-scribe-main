/**
 * Fog of War Hook
 *
 * Manages fog of war state for a scene, including:
 * - Loading revealed areas from database
 * - Tracking revealed polygons
 * - Updating fog when tokens move
 * - Merging overlapping reveals
 * - Resetting fog state
 *
 * @module hooks/use-fog-of-war
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Point2D, VisionBlocker } from '@/types/scene';
import type { Token } from '@/types/token';
import {
  FogPolygon,
  calculateRevealedArea,
  mergeFogPolygons,
  isPointRevealed,
  createCircularPolygon,
} from '@/utils/fog-calculations';

// Note: tRPC integration would be added here
// import { trpc } from '@/infrastructure/api';

// ===========================
// Types
// ===========================

export interface FogOfWarOptions {
  /** Scene ID to manage fog for */
  sceneId: string;
  /** Whether fog of war is enabled */
  enabled?: boolean;
  /** Exploration mode */
  explorationMode?: 'full' | 'gradual' | 'permanent';
  /** Auto-merge polygons after N polygons */
  autoMergeThreshold?: number;
}

export interface FogOfWarState {
  /** All revealed areas */
  revealedAreas: FogPolygon[];
  /** Currently visible areas (temporary, resets each turn) */
  currentlyVisible: FogPolygon[];
  /** Whether fog is enabled */
  enabled: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

export interface FogOfWarActions {
  /** Reveal area from token's vision */
  revealFromToken: (token: Token, walls: VisionBlocker[], gridSize?: number) => void;
  /** Reveal multiple areas from tokens */
  revealFromTokens: (tokens: Token[], walls: VisionBlocker[], gridSize?: number) => void;
  /** Manually reveal area with brush */
  revealArea: (points: Point2D[]) => void;
  /** Manually conceal area with brush */
  concealArea: (points: Point2D[]) => void;
  /** Reveal circular area (brush tool) */
  revealCircle: (center: Point2D, radius: number) => void;
  /** Check if a point is revealed */
  isRevealed: (point: Point2D) => boolean;
  /** Reset all fog of war */
  resetFog: () => void;
  /** Merge overlapping polygons */
  mergePolygons: () => void;
  /** Save fog state to database */
  saveFogState: () => Promise<void>;
  /** Load fog state from database */
  loadFogState: () => Promise<void>;
}

// ===========================
// Hook
// ===========================

/**
 * Hook for managing fog of war state
 *
 * Provides state and actions for fog of war management including
 * revealing areas, concealing areas, and syncing to database.
 *
 * @param options - Hook configuration
 * @returns Fog state and actions
 *
 * @example
 * ```tsx
 * function BattleMap({ sceneId }: { sceneId: string }) {
 *   const fog = useFogOfWar({
 *     sceneId,
 *     enabled: true,
 *     explorationMode: 'permanent',
 *   });
 *
 *   // Reveal area when token moves
 *   const handleTokenMove = (token: Token) => {
 *     fog.revealFromToken(token, walls);
 *   };
 *
 *   return <FogOfWar revealedAreas={fog.revealedAreas} />;
 * }
 * ```
 */
export function useFogOfWar(options: FogOfWarOptions): FogOfWarState & FogOfWarActions {
  const {
    sceneId,
    enabled = true,
    explorationMode = 'permanent',
    autoMergeThreshold = 100,
  } = options;

  // State
  const [revealedAreas, setRevealedAreas] = useState<FogPolygon[]>([]);
  const [currentlyVisible, setCurrentlyVisible] = useState<FogPolygon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // tRPC hooks would go here
  // const { data: fogData, isLoading: loadingFog } = trpc.fogOfWar.getBySceneId.useQuery(
  //   { sceneId },
  //   { enabled: enabled && !!sceneId }
  // );
  // const saveFogMutation = trpc.fogOfWar.update.useMutation();

  // ===========================
  // Actions
  // ===========================

  /**
   * Reveal area from a token's vision
   */
  const revealFromToken = useCallback(
    (token: Token, walls: VisionBlocker[], gridSize: number = 100) => {
      if (!enabled) return;

      const newArea = calculateRevealedArea(token, walls, undefined, gridSize);

      if (newArea.points.length === 0) return;

      // Add to currently visible
      setCurrentlyVisible((prev) => [...prev, newArea]);

      // Add to permanent revealed areas if in permanent mode
      if (explorationMode === 'permanent') {
        setRevealedAreas((prev) => {
          const updated = [...prev, newArea];

          // Auto-merge if threshold reached
          if (updated.length > autoMergeThreshold) {
            return mergeFogPolygons(updated);
          }

          return updated;
        });
      }
    },
    [enabled, explorationMode, autoMergeThreshold]
  );

  /**
   * Reveal areas from multiple tokens
   */
  const revealFromTokens = useCallback(
    (tokens: Token[], walls: VisionBlocker[], gridSize: number = 100) => {
      if (!enabled) return;

      const newAreas = tokens
        .map((token) => calculateRevealedArea(token, walls, undefined, gridSize))
        .filter((area) => area.points.length > 0);

      if (newAreas.length === 0) return;

      // Add to currently visible
      setCurrentlyVisible((prev) => [...prev, ...newAreas]);

      // Add to permanent revealed areas if in permanent mode
      if (explorationMode === 'permanent') {
        setRevealedAreas((prev) => {
          const updated = [...prev, ...newAreas];

          // Auto-merge if threshold reached
          if (updated.length > autoMergeThreshold) {
            return mergeFogPolygons(updated);
          }

          return updated;
        });
      }
    },
    [enabled, explorationMode, autoMergeThreshold]
  );

  /**
   * Manually reveal an area
   */
  const revealArea = useCallback(
    (points: Point2D[]) => {
      if (!enabled) return;

      const newArea: FogPolygon = {
        id: `manual-reveal-${Date.now()}`,
        points,
        timestamp: Date.now(),
      };

      setRevealedAreas((prev) => [...prev, newArea]);
    },
    [enabled]
  );

  /**
   * Reveal circular area (brush tool)
   */
  const revealCircle = useCallback(
    (center: Point2D, radius: number) => {
      if (!enabled) return;

      const points = createCircularPolygon(center, radius);
      revealArea(points);
    },
    [enabled, revealArea]
  );

  /**
   * Manually conceal an area (remove from revealed)
   *
   * This is a simplified implementation that removes overlapping polygons.
   * A full implementation would use polygon difference operations.
   */
  const concealArea = useCallback(
    (points: Point2D[]) => {
      if (!enabled) return;

      // For now, just clear all revealed areas (simplified)
      // Full implementation would use polygon difference
      console.warn('concealArea: Full implementation requires polygon clipping library');
    },
    [enabled]
  );

  /**
   * Check if a point is revealed
   */
  const isRevealed = useCallback(
    (point: Point2D): boolean => {
      if (!enabled) return true; // If fog disabled, everything is revealed

      // Check permanent revealed areas
      if (isPointRevealed(point, revealedAreas)) {
        return true;
      }

      // Check currently visible areas
      if (isPointRevealed(point, currentlyVisible)) {
        return true;
      }

      return false;
    },
    [enabled, revealedAreas, currentlyVisible]
  );

  /**
   * Reset all fog of war
   */
  const resetFog = useCallback(() => {
    setRevealedAreas([]);
    setCurrentlyVisible([]);
  }, []);

  /**
   * Merge overlapping polygons
   */
  const mergePolygons = useCallback(() => {
    setRevealedAreas((prev) => mergeFogPolygons(prev));
  }, []);

  /**
   * Save fog state to database
   */
  const saveFogState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // tRPC mutation would go here
      // await saveFogMutation.mutateAsync({
      //   sceneId,
      //   revealedAreas: revealedAreas.map((area) => ({
      //     points: area.points,
      //     revealedAt: new Date(area.timestamp).toISOString(),
      //     revealedBy: area.revealedBy,
      //     isPermanent: true,
      //   })),
      // });

      console.log('Fog state saved:', { sceneId, count: revealedAreas.length });
    } catch (err) {
      setError(err as Error);
      console.error('Failed to save fog state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sceneId, revealedAreas]);

  /**
   * Load fog state from database
   */
  const loadFogState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // tRPC query would go here
      // const data = await trpc.fogOfWar.getBySceneId.fetch({ sceneId });
      // if (data) {
      //   setRevealedAreas(
      //     data.revealedAreas.map((area) => ({
      //       id: area.id,
      //       points: area.points,
      //       timestamp: new Date(area.revealedAt).getTime(),
      //       revealedBy: area.revealedBy,
      //     }))
      //   );
      // }

      console.log('Fog state loaded:', { sceneId });
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load fog state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sceneId]);

  // Load fog state on mount
  useEffect(() => {
    if (enabled && sceneId) {
      loadFogState();
    }
  }, [enabled, sceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear currently visible areas when exploration mode changes
  useEffect(() => {
    if (explorationMode !== 'permanent') {
      setCurrentlyVisible([]);
    }
  }, [explorationMode]);

  // ===========================
  // Return
  // ===========================

  return {
    // State
    revealedAreas,
    currentlyVisible,
    enabled,
    isLoading,
    error,

    // Actions
    revealFromToken,
    revealFromTokens,
    revealArea,
    concealArea,
    revealCircle,
    isRevealed,
    resetFog,
    mergePolygons,
    saveFogState,
    loadFogState,
  };
}

/**
 * Hook to get combined fog areas (revealed + currently visible)
 */
export function useCombinedFogAreas(
  revealedAreas: FogPolygon[],
  currentlyVisible: FogPolygon[]
): FogPolygon[] {
  return useMemo(
    () => [...revealedAreas, ...currentlyVisible],
    [revealedAreas, currentlyVisible]
  );
}

/**
 * Hook to check if any area is revealed
 */
export function useHasRevealedAreas(revealedAreas: FogPolygon[]): boolean {
  return useMemo(() => revealedAreas.length > 0, [revealedAreas]);
}
