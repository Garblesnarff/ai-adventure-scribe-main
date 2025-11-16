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

// Token Rendering components (Phase 4.1)
export { Token, TokenGroup } from './Token';
export type { TokenProps, TokenGroupProps } from './Token';

export { TokenImage, usePreloadTokenImages, clearTokenTextureCache } from './TokenImage';
export type { TokenImageProps } from './TokenImage';

export { TokenBorder, TokenGlow, MultiLayerBorder } from './TokenBorder';
export type { TokenBorderProps, TokenGlowProps, MultiLayerBorderProps } from './TokenBorder';

export {
  TokenNameplate,
  TokenStatusBar,
  TokenStatusIcons,
} from './TokenNameplate';
export type {
  TokenNameplateProps,
  TokenStatusBarProps,
  TokenStatusIconsProps,
  StatusIcon,
} from './TokenNameplate';

// Vision and Lighting components (Phase 4.4)
export { VisionRange, MultiVisionRange, VisionRangeToggle } from './VisionRange';
export type { VisionRangeProps, VisionRangeToggleProps } from './VisionRange';

export { LightSource, CompositeLightSources } from './LightSource';
export type { LightSourceProps, CompositeLightSourcesProps } from './LightSource';

export { VisionCone, VisionConeIndicator, VisionConeEditor } from './VisionCone';
export type { VisionConeProps, VisionConeEditorProps } from './VisionCone';

// Token Interaction components (Phase 4.2)
export { TokenInteraction, useTokenInteractionState } from './TokenInteraction';
export type { TokenInteractionProps } from './TokenInteraction';

export { TokenContextMenu } from './TokenContextMenu';
export type { TokenContextMenuProps } from './TokenContextMenu';

export { TokenDragGhost, TokenDragGhost2D, GridSnapPreview } from './TokenDragGhost';
export type {
  TokenDragGhostProps,
  TokenDragGhost2DProps,
  GridSnapPreviewProps,
} from './TokenDragGhost';

// Token Health & Status components (Phase 4.3)
export { TokenHealthBar, TokenHealthBarCompact } from './TokenHealthBar';
export type { TokenHealthBarProps } from './TokenHealthBar';

export { TokenConditionIcons } from './TokenConditionIcons';
export type { TokenConditionIconsProps } from './TokenConditionIcons';

export { TokenConcentration, TokenConcentrationCompact } from './TokenConcentration';
export type { TokenConcentrationProps } from './TokenConcentration';

export {
  TokenDeathState,
  TokenProneIndicator,
  TokenDeadOverlay,
} from './TokenDeathState';
export type { TokenDeathStateProps } from './TokenDeathState';

export { TokenResourceBars, TokenSpellSlotsDots } from './TokenResourceBars';
export type { TokenResourceBarsProps, ResourceType } from './TokenResourceBars';

// Token Auras & Visual Effects (Phase 4.5)
export { TokenAura, AuraPresets } from './TokenAura';
export type { TokenAuraProps, AuraConfig } from './TokenAura';
export { AuraVisibility, AuraAnimation } from './TokenAura';

export { TokenParticles, MultiEffectParticles, ParticlePresets } from './TokenParticles';
export type { TokenParticlesProps, MultiEffectParticlesProps } from './TokenParticles';

export { ElevationIndicator, AnimatedElevationIndicator, AutoElevationIndicator } from './ElevationIndicator';
export type {
  ElevationIndicatorProps,
  AnimatedElevationIndicatorProps,
  AutoElevationIndicatorProps,
} from './ElevationIndicator';
export { ElevationMode, ShadowStyle } from './ElevationIndicator';

export { TokenEffectOverlay, conditionToEffectType, conditionsToEffects } from './TokenEffectOverlay';
export type { TokenEffectOverlayProps, EffectOverlayConfig } from './TokenEffectOverlay';
export { StatusEffectType } from './TokenEffectOverlay';

// Toolbar and Controls components (Phase 10)
export { Toolbar, ResponsiveToolbar } from './Toolbar';
export type { ToolbarProps, ResponsiveToolbarProps } from './Toolbar';

export { ToolOptionsPanel } from './ToolOptionsPanel';
export type { ToolOptionsPanelProps, ToolOptions } from './ToolOptionsPanel';

export { QuickActionMenu, useQuickActionMenu, getDefaultQuickActions } from './QuickActionMenu';
export type {
  QuickActionMenuProps,
  QuickAction,
  UseQuickActionMenuOptions,
  UseQuickActionMenuReturn,
} from './QuickActionMenu';

export { HotkeyGuide, HotkeyBadge } from './HotkeyGuide';
export type { HotkeyGuideProps, HotkeyBadgeProps, ShortcutInfo } from './HotkeyGuide';

export { MobileControls, useIsMobile, useTouchGestures } from './MobileControls';
export type { MobileControlsProps, TouchGestureHandlers } from './MobileControls';

export { SettingsPanel, useBattleMapSettings, DEFAULT_SETTINGS, STORAGE_KEY } from './SettingsPanel';
export type { SettingsPanelProps, BattleMapSettings } from './SettingsPanel';
