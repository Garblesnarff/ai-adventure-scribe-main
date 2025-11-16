/**
 * BattleCanvas Component
 *
 * Main canvas component for the battle map.
 * Uses React Three Fiber to render the 3D scene with orthographic camera.
 *
 * @module components/battle-map/BattleCanvas
 */

import React, { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { BattleScene, SceneLoadingOverlay, SceneErrorOverlay } from './BattleScene';
import { CameraController } from './CameraController';
import logger from '@/lib/logger';

/**
 * Props for BattleCanvas component
 */
export interface BattleCanvasProps {
  /** ID of the scene to display */
  sceneId: string;
  /** Background color for the canvas */
  backgroundColor?: string;
  /** Canvas className for styling */
  className?: string;
  /** Enable camera pan controls */
  enablePan?: boolean;
  /** Enable camera zoom controls */
  enableZoom?: boolean;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Callback when scene is loaded */
  onSceneLoaded?: (scene: any) => void;
}

/**
 * BattleCanvas Component
 *
 * Main canvas component that sets up the React Three Fiber scene including:
 * - Orthographic camera for top-down view
 * - Basic lighting (ambient + directional)
 * - Scene background color
 * - Canvas size (fullscreen in container)
 * - Touch and mouse event handling
 * - WebGL error handling
 *
 * @example
 * ```tsx
 * <div className="w-full h-screen">
 *   <BattleCanvas
 *     sceneId="scene-id-123"
 *     backgroundColor="#1a1a2e"
 *     enablePan={true}
 *     enableZoom={true}
 *     minZoom={0.5}
 *     maxZoom={4}
 *   />
 * </div>
 * ```
 */
export function BattleCanvas({
  sceneId,
  backgroundColor = '#1a1a2e',
  className = 'w-full h-full',
  enablePan = true,
  enableZoom = true,
  minZoom = 0.5,
  maxZoom = 4,
  onSceneLoaded,
}: BattleCanvasProps) {
  const [sceneData, setSceneData] = useState<any>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  /**
   * Handle WebGL context loss and restoration
   */
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
      logger.warn('BattleCanvas WebGL context lost');
    };

    const onRestored = () => {
      setContextLost(false);
      setCanvasKey((k) => k + 1);
      logger.info('BattleCanvas WebGL context restored');
    };

    canvas.addEventListener('webglcontextlost', onLost as any, { passive: false });
    canvas.addEventListener('webglcontextrestored', onRestored as any);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost as any);
      canvas.removeEventListener('webglcontextrestored', onRestored as any);
    };
  }, []);

  /**
   * Handle scene loaded callback
   */
  const handleSceneLoaded = useCallback(
    (scene: any) => {
      setSceneData(scene);
      if (onSceneLoaded) {
        onSceneLoaded(scene);
      }
    },
    [onSceneLoaded]
  );

  /**
   * Handle canvas errors
   */
  const handleError = useCallback((error: any) => {
    logger.error('BattleCanvas error:', error);
    setCanvasError(error?.message || 'Failed to initialize canvas');
  }, []);

  // Show error overlay if canvas failed to initialize
  if (canvasError) {
    return (
      <div className={`relative ${className}`}>
        <SceneErrorOverlay error={canvasError} />
      </div>
    );
  }

  // Show context lost overlay
  if (contextLost) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 max-w-md p-6 bg-warning/10 rounded-lg border border-warning">
            <p className="text-sm font-semibold text-warning">Graphics context lost</p>
            <p className="text-xs text-muted-foreground">
              The graphics context was lost. The scene will automatically restore when possible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        key={canvasKey}
        onCreated={handleCreated}
        onError={handleError}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: false,
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
        }}
        dpr={[1, 2]} // Device pixel ratio for sharp rendering on retina displays
        frameloop="demand" // Only render when needed for better performance
        style={{
          background: backgroundColor,
          touchAction: 'none', // Prevent default touch actions
        }}
      >
        {/* Camera Controller */}
        <CameraController
          sceneWidth={sceneData?.width || 20}
          sceneHeight={sceneData?.height || 20}
          gridSize={sceneData?.gridSize || 100}
          minZoom={minZoom}
          maxZoom={maxZoom}
          enablePan={enablePan}
          enableZoom={enableZoom}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={0.5}
          castShadow={false}
        />

        {/* Scene Content */}
        <BattleScene
          sceneId={sceneId}
          onSceneLoaded={handleSceneLoaded}
          showLoading={true}
        />

        {/* Optional: Add performance monitor in development */}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </Canvas>
    </div>
  );
}

/**
 * Performance Monitor Component (Development Only)
 * Logs FPS and performance warnings
 */
function PerformanceMonitor() {
  const [fps, setFps] = React.useState(60);
  const lastTime = React.useRef(performance.now());
  const frames = React.useRef(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime.current;
      const currentFps = Math.round((frames.current * 1000) / delta);

      setFps(currentFps);

      if (currentFps < 30) {
        logger.warn('Low FPS detected:', currentFps);
      }

      frames.current = 0;
      lastTime.current = currentTime;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Increment frame counter on each render
  React.useEffect(() => {
    frames.current += 1;
  });

  return null; // This is just for monitoring, no visual output
}

/**
 * Export loading and error overlays for use in parent components
 */
export { SceneLoadingOverlay, SceneErrorOverlay };
