/**
 * Custom Hook: useSceneData
 *
 * Fetches scene data including settings and layers using tRPC.
 * Handles loading states, error states, and provides type-safe scene data.
 *
 * @module hooks/use-scene-data
 */

import { trpc } from '@/infrastructure/api';

/**
 * Props for useSceneData hook
 */
export interface UseSceneDataProps {
  sceneId: string;
  enabled?: boolean;
}

/**
 * Hook for fetching scene data with settings and layers
 *
 * @param props - Hook configuration
 * @returns Scene data with loading and error states
 *
 * @example
 * ```tsx
 * function BattleScene({ sceneId }: { sceneId: string }) {
 *   const { scene, isLoading, error } = useSceneData({ sceneId });
 *
 *   if (isLoading) return <div>Loading scene...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!scene) return <div>Scene not found</div>;
 *
 *   return <div>{scene.name}</div>;
 * }
 * ```
 */
export function useSceneData({ sceneId, enabled = true }: UseSceneDataProps) {
  // Fetch scene using tRPC query
  const {
    data: scene,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = trpc.scenes.getById.useQuery(
    { sceneId },
    {
      enabled: enabled && !!sceneId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    scene,
    isLoading,
    isRefetching,
    error,
    refetch,
    // Convenience accessors
    settings: scene?.settings,
    layers: scene?.layers,
    width: scene?.width,
    height: scene?.height,
    gridSize: scene?.gridSize,
    gridType: scene?.gridType,
    backgroundImageUrl: scene?.backgroundImageUrl,
  };
}
