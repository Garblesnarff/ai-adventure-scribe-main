/**
 * Layer Manager Component
 *
 * Orchestrates the rendering of all battle map layers in the correct z-index order.
 * Manages layer visibility, opacity, and interaction states.
 *
 * Layer Rendering Order (z-index):
 * - Layer 0: Background image
 * - Layer 1: Grid
 * - Layer 2: Tokens (placeholder for now)
 * - Layer 3: Effects (placeholder)
 * - Layer 4: Drawings (placeholder)
 * - Layer 5: UI (placeholder)
 *
 * Features:
 * - Respects layer visibility settings
 * - Applies layer opacity
 * - Prevents interaction with locked layers
 * - Reactive to store changes
 */

import React from 'react';

import { useBattleMapStore } from '@/stores/useBattleMapStore';

// ===========================
// Types
// ===========================

export interface LayerManagerProps {
  sceneId: string;
  className?: string;
}

interface LayerConfig {
  id: string;
  name: string;
  type: 'background' | 'grid' | 'tokens' | 'effects' | 'drawings' | 'ui';
  zIndex: number;
}

// ===========================
// Layer Definitions
// ===========================

const LAYER_CONFIGS: LayerConfig[] = [
  { id: 'background', name: 'Background', type: 'background', zIndex: 0 },
  { id: 'grid', name: 'Grid', type: 'grid', zIndex: 1 },
  { id: 'tokens', name: 'Tokens', type: 'tokens', zIndex: 2 },
  { id: 'effects', name: 'Effects', type: 'effects', zIndex: 3 },
  { id: 'drawings', name: 'Drawings', type: 'drawings', zIndex: 4 },
  { id: 'ui', name: 'UI', type: 'ui', zIndex: 5 },
];

// ===========================
// Layer Components (Placeholders)
// ===========================

const BackgroundLayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Background image will be rendered here */}
      <div className="flex items-center justify-center h-full text-slate-500">
        Background Layer (Scene: {sceneId})
      </div>
    </div>
  );
};

const GridLayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid will be rendered here */}
      <svg className="w-full h-full">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};

const TokensLayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Tokens will be rendered here */}
      <div className="flex items-center justify-center h-full text-slate-400 text-sm opacity-50">
        Tokens Layer (Placeholder)
      </div>
    </div>
  );
};

const EffectsLayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Effects will be rendered here */}
    </div>
  );
};

const DrawingsLayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawings will be rendered here */}
    </div>
  );
};

const UILayer: React.FC<{ sceneId: string }> = ({ sceneId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* UI overlays will be rendered here */}
    </div>
  );
};

// ===========================
// Layer Component Map
// ===========================

const LAYER_COMPONENTS: Record<
  LayerConfig['type'],
  React.FC<{ sceneId: string }>
> = {
  background: BackgroundLayer,
  grid: GridLayer,
  tokens: TokensLayer,
  effects: EffectsLayer,
  drawings: DrawingsLayer,
  ui: UILayer,
};

// ===========================
// Individual Layer Wrapper
// ===========================

interface LayerProps {
  config: LayerConfig;
  sceneId: string;
}

const Layer: React.FC<LayerProps> = ({ config, sceneId }) => {
  const getLayerState = useBattleMapStore((state) => state.getLayerState);
  const layerState = getLayerState(config.id);

  const LayerComponent = LAYER_COMPONENTS[config.type];

  // Don't render if not visible
  if (!layerState.visible) {
    return null;
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        zIndex: config.zIndex,
        opacity: layerState.opacity,
        pointerEvents: layerState.locked ? 'none' : 'auto',
      }}
      data-layer-id={config.id}
      data-layer-type={config.type}
      data-layer-locked={layerState.locked}
    >
      <LayerComponent sceneId={sceneId} />
    </div>
  );
};

// ===========================
// Main LayerManager Component
// ===========================

export const LayerManager: React.FC<LayerManagerProps> = ({ sceneId, className = '' }) => {
  React.useEffect(() => {
    // Update active scene ID when component mounts or sceneId changes
    const setActiveSceneId = useBattleMapStore.getState().setActiveSceneId;
    setActiveSceneId(sceneId);

    return () => {
      // Optional: Clear active scene when unmounting
      // setActiveSceneId(null);
    };
  }, [sceneId]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}>
      {/* Render all layers in order */}
      {LAYER_CONFIGS.map((config) => (
        <Layer key={config.id} config={config} sceneId={sceneId} />
      ))}
    </div>
  );
};

// ===========================
// Export Layer Configs for LayersPanel
// ===========================

export { LAYER_CONFIGS };
export type { LayerConfig };
