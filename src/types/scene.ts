/**
 * Scene Types for Foundry VTT Integration
 *
 * These types represent scenes (battle maps, exploration areas) in the Foundry VTT system.
 * Scenes are the primary visual representation of game locations where tokens interact.
 */

// ===========================
// Enums
// ===========================

/**
 * Grid types supported by Foundry VTT scenes
 */
export enum GridType {
  SQUARE = 'square',
  HEXAGONAL_HORIZONTAL = 'hexagonal_horizontal',
  HEXAGONAL_VERTICAL = 'hexagonal_vertical',
  GRIDLESS = 'gridless',
}

/**
 * Layer types in a scene's rendering stack
 */
export enum LayerType {
  BACKGROUND = 'background',
  GRID = 'grid',
  TOKENS = 'tokens',
  EFFECTS = 'effects',
  DRAWINGS = 'drawings',
  UI = 'ui',
}

/**
 * Door states for scene elements
 */
export enum DoorState {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

// ===========================
// Core Scene Types
// ===========================

/**
 * Point in 2D space on a scene
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Fog of War data for tracking player exploration
 */
export interface FogOfWarData {
  enabled: boolean;
  revealedAreas: RevealedArea[];
  explorationMode: 'full' | 'gradual' | 'permanent';
  resetOnLoad?: boolean;
}

/**
 * A revealed area in the fog of war (polygon shape)
 */
export interface RevealedArea {
  id: string;
  points: Point2D[];
  revealedAt: string; // ISO timestamp
  revealedBy?: string; // Character/token ID who revealed it
  isPermanent: boolean;
}

/**
 * Vision blocking element (walls, doors, terrain)
 */
export interface VisionBlocker {
  id: string;
  points: Point2D[];
  blocksLight: boolean;
  blocksMovement: boolean;
  blocksSound?: boolean;
  doorState?: DoorState;
  doorId?: string;
  height?: number; // For 3D vision calculations
  terrainType?: string;
}

/**
 * Scene layer configuration
 */
export interface SceneLayer {
  id: string;
  sceneId: string;
  layerType: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  zIndex: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  filters?: string[]; // Visual filters/effects
}

/**
 * Scene-specific settings and configurations
 */
export interface SceneSettings {
  // Grid settings
  gridType: GridType;
  gridSize: number; // pixels per grid square
  gridDistance: number; // feet/meters per grid square
  gridUnits: string; // "ft", "m", etc.
  gridColor: string; // hex color
  gridOpacity: number; // 0-1
  gridOffsetX?: number;
  gridOffsetY?: number;

  // Lighting and vision
  globalLight: boolean; // Entire scene is lit
  globalLightThreshold?: number; // Darkness level threshold
  tokenVision: boolean; // Tokens have vision
  fogExploration: boolean; // Track fog of war

  // Ambient settings
  backgroundColor: string; // hex color
  padding: number; // Padding around the scene in pixels

  // Weather and effects
  weatherEffects?: string[];
  ambientSound?: string; // Audio file URL
  ambientSoundVolume?: number; // 0-1

  // Permissions
  playerViewable: boolean;
  gmOnly: boolean;
}

/**
 * Main Scene interface matching the scenes table schema
 */
export interface Scene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;

  // Image/visual data
  backgroundImage: string; // URL to the scene background
  thumbnailUrl?: string;
  width: number; // pixels
  height: number; // pixels

  // Scene settings
  settings: SceneSettings;

  // Fog of War
  fogOfWar: FogOfWarData;

  // Vision and walls
  visionBlockers: VisionBlocker[];

  // Layers
  layers: SceneLayer[];

  // Navigation
  isActive: boolean; // Currently active scene
  navOrder: number; // Order in scene navigation
  navName?: string; // Display name in navigation

  // Metadata
  createdBy: string; // User ID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Initial view
  initialViewX?: number; // Camera initial X position
  initialViewY?: number; // Camera initial Y position
  initialViewScale?: number; // Camera initial zoom level

  // Journal integration
  journalEntryId?: string; // Link to journal entry about this scene

  // Playlist integration
  playlistId?: string; // Audio playlist for this scene

  // Notes and pins
  notes?: SceneNote[];
}

/**
 * Note/pin on a scene for GM reference or player information
 */
export interface SceneNote {
  id: string;
  sceneId: string;
  x: number;
  y: number;
  icon?: string; // Icon URL
  iconSize?: number;
  text: string;
  textAnchor?: 'top' | 'bottom' | 'left' | 'right';
  fontSize?: number;
  textColor?: string;
  gmOnly: boolean;
  journalEntryId?: string; // Link to detailed journal entry
}

// ===========================
// Scene Creation/Update Types
// ===========================

/**
 * Data required to create a new scene
 */
export interface CreateSceneData {
  campaignId: string;
  name: string;
  description?: string;
  backgroundImage: string;
  width: number;
  height: number;
  settings?: Partial<SceneSettings>;
  fogOfWar?: Partial<FogOfWarData>;
  initialViewX?: number;
  initialViewY?: number;
  initialViewScale?: number;
}

/**
 * Data for updating an existing scene
 */
export interface UpdateSceneData {
  name?: string;
  description?: string;
  backgroundImage?: string;
  width?: number;
  height?: number;
  settings?: Partial<SceneSettings>;
  fogOfWar?: Partial<FogOfWarData>;
  visionBlockers?: VisionBlocker[];
  isActive?: boolean;
  navOrder?: number;
  navName?: string;
  initialViewX?: number;
  initialViewY?: number;
  initialViewScale?: number;
  journalEntryId?: string;
  playlistId?: string;
}

/**
 * Scene with minimal data for lists and navigation
 */
export interface SceneListItem {
  id: string;
  name: string;
  navName?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  navOrder: number;
  createdAt: string;
}

// ===========================
// Default Values
// ===========================

/**
 * Default scene settings for new scenes
 */
export const defaultSceneSettings: SceneSettings = {
  gridType: GridType.SQUARE,
  gridSize: 100,
  gridDistance: 5,
  gridUnits: 'ft',
  gridColor: '#000000',
  gridOpacity: 0.2,
  globalLight: false,
  tokenVision: true,
  fogExploration: true,
  backgroundColor: '#999999',
  padding: 0.25,
  playerViewable: true,
  gmOnly: false,
};

/**
 * Default fog of war configuration
 */
export const defaultFogOfWar: FogOfWarData = {
  enabled: true,
  revealedAreas: [],
  explorationMode: 'permanent',
  resetOnLoad: false,
};
