/**
 * Token Types for Foundry VTT Integration
 *
 * These types represent tokens (character/creature representations) on scenes in Foundry VTT.
 * Tokens are the primary interactive elements on battle maps and exploration scenes.
 */

import type { Point2D } from './scene';

// ===========================
// Enums
// ===========================

/**
 * Token types in the game world
 */
export enum TokenType {
  CHARACTER = 'character',
  NPC = 'npc',
  MONSTER = 'monster',
  OBJECT = 'object',
}

/**
 * Token size categories (D&D 5e)
 */
export enum TokenSize {
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  HUGE = 'huge',
  GARGANTUAN = 'gargantuan',
}

/**
 * Nameplate position relative to token
 */
export enum NameplatePosition {
  TOP = 'top',
  BOTTOM = 'bottom',
}

/**
 * Token disposition/attitude
 */
export enum TokenDisposition {
  FRIENDLY = 'friendly',
  NEUTRAL = 'neutral',
  HOSTILE = 'hostile',
  SECRET = 'secret', // Hidden from players
}

// ===========================
// Vision Configuration
// ===========================

/**
 * Token vision configuration
 */
export interface TokenVisionConfig {
  enabled: boolean; // Does this token have vision?
  range: number; // Vision range in feet
  angle: number; // Vision cone angle (360 for full circle)
  dimVision?: number; // Dim light vision range

  // Vision types
  darkvision?: number; // Darkvision range in feet
  blindsight?: number; // Blindsight range in feet
  tremorsense?: number; // Tremorsense range in feet
  truesight?: number; // Truesight range in feet

  // Vision modifiers
  sightAngle?: number; // Limited sight angle (degrees)
  visionMode?: 'basic' | 'darkvision' | 'monochrome' | 'tremorsense' | 'blindsight' | 'truesight';
  brightness?: number; // Brightness multiplier
  saturation?: number; // Color saturation
  contrast?: number; // Contrast adjustment
}

// ===========================
// Light Configuration
// ===========================

/**
 * Token light emission configuration
 */
export interface TokenLightConfig {
  emitsLight: boolean; // Does this token emit light?
  lightRange: number; // Bright light range in feet
  dimLightRange?: number; // Dim light range beyond bright light
  lightColor: string; // Hex color code
  lightAlpha?: number; // Light opacity (0-1)
  lightAnimation?: LightAnimation;

  // Advanced lighting
  luminosity?: number; // Light intensity
  lightAngle?: number; // Directional light angle (360 for omnidirectional)
  lightRotation?: number; // Rotation of directional light
  colorIntensity?: number; // How strong the color tint is
}

/**
 * Light animation configuration
 */
export interface LightAnimation {
  type: 'none' | 'pulse' | 'flicker' | 'wave' | 'sunburst' | 'torch' | 'revolving';
  speed: number; // Animation speed multiplier
  intensity: number; // Animation intensity
  reverse?: boolean; // Reverse animation direction
}

// ===========================
// Token Configuration
// ===========================

/**
 * Default token configuration (for characters)
 */
export interface TokenConfiguration {
  // Visual
  imageUrl: string;
  scale: number; // Scale multiplier (1.0 = normal)
  rotation: number; // Rotation in degrees
  tint?: string; // Color tint (hex)
  alpha?: number; // Opacity (0-1)

  // Size and grid
  width: number; // Grid squares wide
  height: number; // Grid squares tall
  size: TokenSize;

  // Display
  displayName: boolean;
  nameplate: NameplatePosition;
  displayBars: 'always' | 'hover' | 'owner' | 'none';
  barColor: string; // Primary bar color (HP)
  bar2Color?: string; // Secondary bar color

  // Vision and lighting
  vision: TokenVisionConfig;
  light: TokenLightConfig;

  // Behavior
  lockRotation: boolean;
  randomRotation: boolean; // Randomize rotation on placement
}

// ===========================
// Resource Bars
// ===========================

/**
 * Token resource bar (HP, etc.)
 */
export interface TokenResourceBar {
  attribute: string; // "hitPoints", "spellSlots", etc.
  value: number;
  max: number;
  temp?: number; // Temporary HP, temporary bonuses
  color?: string; // Override bar color
  label?: string;
  visible: boolean;
}

// ===========================
// Main Token Interface
// ===========================

/**
 * Token instance on a scene
 */
export interface Token {
  id: string;
  sceneId: string;
  characterId?: string; // Linked character sheet
  name: string;
  tokenType: TokenType;

  // Position
  x: number; // X coordinate in pixels
  y: number; // Y coordinate in pixels
  elevation: number; // Elevation in feet/meters

  // Visual properties
  imageUrl: string;
  width: number; // Grid squares wide
  height: number; // Grid squares tall
  size: TokenSize;
  scale: number; // Scale multiplier
  rotation: number; // Rotation in degrees
  tint?: string; // Color tint
  alpha: number; // Opacity (0-1)

  // Display
  displayName: boolean;
  nameplate: NameplatePosition;
  nameVisibility: 'all' | 'owner' | 'hover' | 'gm';
  displayBars: 'always' | 'hover' | 'owner' | 'none';
  bar1: TokenResourceBar; // Primary bar (usually HP)
  bar2?: TokenResourceBar; // Secondary bar

  // Vision and detection
  vision: TokenVisionConfig;
  light: TokenLightConfig;

  // Status and effects
  statusEffects: TokenStatusEffect[];
  conditions: string[]; // Condition names

  // Behavior
  disposition: TokenDisposition;
  lockRotation: boolean;
  hidden: boolean; // Hidden from players
  locked: boolean; // Prevent movement

  // Combat
  combatantId?: string; // Link to combat tracker
  initiative?: number;

  // Movement
  movementHistory?: Point2D[]; // Path taken during movement
  lastMovedAt?: string; // ISO timestamp

  // Permissions
  ownerIds: string[]; // User IDs who can control this token
  observerIds: string[]; // User IDs who can observe this token

  // Metadata
  createdBy: string; // User ID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Flags for modules/extensions
  flags?: Record<string, any>;
}

// ===========================
// Status Effects
// ===========================

/**
 * Status effect/icon on a token
 */
export interface TokenStatusEffect {
  id: string;
  icon: string; // Icon URL or identifier
  label?: string;
  duration?: number; // Rounds remaining
  description?: string;
  overlay?: boolean; // Display as overlay on token
  tint?: string; // Color tint for the effect
}

// ===========================
// Token Creation/Update Types
// ===========================

/**
 * Data required to create a new token
 */
export interface CreateTokenData {
  sceneId: string;
  characterId?: string;
  name: string;
  tokenType: TokenType;
  x: number;
  y: number;
  imageUrl: string;
  size?: TokenSize;
  width?: number;
  height?: number;
  vision?: Partial<TokenVisionConfig>;
  light?: Partial<TokenLightConfig>;
  disposition?: TokenDisposition;
  ownerIds?: string[];
}

/**
 * Data for updating an existing token
 */
export interface UpdateTokenData {
  x?: number;
  y?: number;
  elevation?: number;
  rotation?: number;
  imageUrl?: string;
  width?: number;
  height?: number;
  size?: TokenSize;
  scale?: number;
  tint?: string;
  alpha?: number;
  hidden?: boolean;
  locked?: boolean;
  displayName?: boolean;
  nameplate?: NameplatePosition;
  vision?: Partial<TokenVisionConfig>;
  light?: Partial<TokenLightConfig>;
  bar1?: Partial<TokenResourceBar>;
  bar2?: Partial<TokenResourceBar>;
  statusEffects?: TokenStatusEffect[];
  conditions?: string[];
  disposition?: TokenDisposition;
}

/**
 * Token with minimal data for lists
 */
export interface TokenListItem {
  id: string;
  sceneId: string;
  name: string;
  tokenType: TokenType;
  imageUrl: string;
  hidden: boolean;
  disposition: TokenDisposition;
  x: number;
  y: number;
}

// ===========================
// Token Movement
// ===========================

/**
 * Token movement data
 */
export interface TokenMovement {
  tokenId: string;
  from: Point2D;
  to: Point2D;
  path?: Point2D[]; // Waypoints in movement path
  distance: number; // Distance in feet/meters
  timestamp: string; // ISO timestamp
  triggeredOpportunityAttacks?: string[]; // Token IDs that can make OAs
}

// ===========================
// Default Values
// ===========================

/**
 * Token size to grid squares mapping
 */
export const tokenSizeToGridSquares: Record<TokenSize, number> = {
  [TokenSize.TINY]: 0.5,
  [TokenSize.SMALL]: 1,
  [TokenSize.MEDIUM]: 1,
  [TokenSize.LARGE]: 2,
  [TokenSize.HUGE]: 3,
  [TokenSize.GARGANTUAN]: 4,
};

/**
 * Default token vision configuration
 */
export const defaultTokenVision: TokenVisionConfig = {
  enabled: false,
  range: 0,
  angle: 360,
  visionMode: 'basic',
  brightness: 0,
  saturation: 0,
  contrast: 0,
};

/**
 * Default token light configuration
 */
export const defaultTokenLight: TokenLightConfig = {
  emitsLight: false,
  lightRange: 0,
  lightColor: '#ffffff',
  lightAlpha: 0.5,
  luminosity: 0.5,
  lightAngle: 360,
  colorIntensity: 0.5,
};

/**
 * Default token configuration
 */
export const defaultTokenConfiguration: TokenConfiguration = {
  imageUrl: '',
  scale: 1.0,
  rotation: 0,
  alpha: 1.0,
  width: 1,
  height: 1,
  size: TokenSize.MEDIUM,
  displayName: true,
  nameplate: NameplatePosition.BOTTOM,
  displayBars: 'owner',
  barColor: '#ff0000',
  vision: defaultTokenVision,
  light: defaultTokenLight,
  lockRotation: false,
  randomRotation: false,
};
