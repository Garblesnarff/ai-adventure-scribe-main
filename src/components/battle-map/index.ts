/**
 * Battle Map Components
 *
 * Export all battle map related components
 */

// Canvas and Scene components (Phase 3.1)
export { BattleCanvas, SceneLoadingOverlay, SceneErrorOverlay } from './BattleCanvas';
export type { BattleCanvasProps } from './BattleCanvas';

export { BattleScene } from './BattleScene';
export type { BattleSceneProps } from './BattleScene';

export { CameraController } from './CameraController';
export type { CameraControllerProps } from './CameraController';

// Grid components (Phase 3.2)
export { GridPlane, GroundPlane } from './GridPlane';
export type { GridPlaneProps, GroundPlaneProps } from './GridPlane';

// Background components (Phase 3.3)
export { BackgroundImage, usePreloadBackgroundImages } from './BackgroundImage';
export { BackgroundPlaceholder, SimpleBackgroundPlaceholder } from './BackgroundPlaceholder';
export type { BackgroundImageProps } from './BackgroundImage';
export type { BackgroundPlaceholderProps } from './BackgroundPlaceholder';

// Layer management components (Phase 3.4)
export { LayerManager, LAYER_CONFIGS } from './LayerManager';
export type { LayerManagerProps, LayerConfig } from './LayerManager';

export { LayersPanel } from './LayersPanel';
export type { LayersPanelProps } from './LayersPanel';
