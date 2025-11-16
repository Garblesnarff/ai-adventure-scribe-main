/**
 * BattleScene Component
 *
 * Container for all map elements in a scene.
 * Loads active scene data using tRPC and manages scene switching.
 *
 * @module components/battle-map/BattleScene
 */

import React from 'react';
import { useSceneData } from '@/hooks/use-scene-data';
import { BackgroundImage } from './BackgroundImage';
import { Loader2 } from 'lucide-react';

/**
 * Props for BattleScene component
 */
export interface BattleSceneProps {
  /** ID of the scene to display */
  sceneId: string;
  /** Callback when scene data is loaded */
  onSceneLoaded?: (scene: any) => void;
  /** Whether to show loading state */
  showLoading?: boolean;
}

/**
 * BattleScene Component
 *
 * Manages the rendering of a scene including:
 * - Loading scene data from tRPC
 * - Rendering background image
 * - Managing scene layers
 * - Handling scene settings
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <BattleScene
 *     sceneId="scene-id-123"
 *     onSceneLoaded={(scene) => console.log('Scene loaded:', scene)}
 *   />
 * </Canvas>
 * ```
 */
export function BattleScene({
  sceneId,
  onSceneLoaded,
  showLoading = true,
}: BattleSceneProps) {
  const {
    scene,
    isLoading,
    error,
    width,
    height,
    gridSize,
    backgroundImageUrl,
    settings,
  } = useSceneData({ sceneId });

  // Notify parent when scene is loaded
  React.useEffect(() => {
    if (scene && onSceneLoaded) {
      onSceneLoaded(scene);
    }
  }, [scene, onSceneLoaded]);

  // Loading state - render placeholder
  if (isLoading && showLoading) {
    return (
      <group>
        {/* Simple loading indicator plane */}
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial color="#1a1a2e" opacity={0.95} transparent />
        </mesh>
      </group>
    );
  }

  // Error state
  if (error) {
    return (
      <group>
        {/* Error indicator plane */}
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[1000, 600]} />
          <meshBasicMaterial color="#ff6b6b" opacity={0.3} transparent />
        </mesh>
      </group>
    );
  }

  // No scene data
  if (!scene || !width || !height || !gridSize) {
    return null;
  }

  return (
    <group name="battle-scene">
      {/* Background Image Layer */}
      {backgroundImageUrl && (
        <BackgroundImage
          imageUrl={backgroundImageUrl}
          width={width}
          height={height}
          gridSize={gridSize}
          opacity={settings?.gridOpacity ? parseFloat(String(settings.gridOpacity)) : 1}
        />
      )}

      {/* Future layers will be added here:
       * - Grid Layer (from scene settings)
       * - Tokens Layer (from tokens router)
       * - Drawings Layer (from drawings router)
       * - Effects Layer
       * - Fog of War Layer (from fog-of-war router)
       * - Vision Blockers Layer (from vision-blockers router)
       * - Measurements Layer (from measurements router)
       * - UI Layer
       */}
    </group>
  );
}

/**
 * Loading Indicator Component
 * Displays a loading spinner in 2D overlay
 */
export function SceneLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading scene...</p>
      </div>
    </div>
  );
}

/**
 * Error Display Component
 * Shows error message in 2D overlay
 */
export function SceneErrorOverlay({ error }: { error: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 max-w-md p-6 bg-destructive/10 rounded-lg border border-destructive">
        <p className="text-sm font-semibold text-destructive">Failed to load scene</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    </div>
  );
}
