/**
 * Drawing Types for Foundry VTT Integration
 *
 * These types represent drawings and measurement templates on scenes.
 * Drawings are used for GM annotations, terrain marking, and spell effect visualization.
 */

import type { Point2D } from './scene';

// ===========================
// Enums
// ===========================

/**
 * Drawing types available in Foundry VTT
 */
export enum DrawingType {
  FREEHAND = 'freehand',
  LINE = 'line',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  POLYGON = 'polygon',
  TEXT = 'text',
}

/**
 * Measurement template types (for spells and abilities)
 */
export enum TemplateType {
  CONE = 'cone',
  CUBE = 'cube',
  SPHERE = 'sphere',
  CYLINDER = 'cylinder',
  LINE = 'line',
  RAY = 'ray',
}

/**
 * Fill types for drawings
 */
export enum FillType {
  NONE = 'none',
  SOLID = 'solid',
  PATTERN = 'pattern',
  TEXTURE = 'texture',
}

/**
 * Text alignment options
 */
export enum TextAlignment {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

// ===========================
// Drawing Configuration
// ===========================

/**
 * Stroke/border configuration for drawings
 */
export interface StrokeConfig {
  width: number; // Stroke width in pixels
  color: string; // Hex color
  alpha: number; // Opacity (0-1)
  style?: 'solid' | 'dashed' | 'dotted';
  dashLength?: number; // For dashed lines
  gapLength?: number; // For dashed lines
}

/**
 * Fill configuration for drawings
 */
export interface FillConfig {
  type: FillType;
  color: string; // Hex color
  alpha: number; // Opacity (0-1)
  texture?: string; // Texture URL for FillType.TEXTURE
  patternType?: 'horizontal' | 'vertical' | 'diagonal' | 'cross' | 'dots';
}

/**
 * Text configuration for text drawings
 */
export interface TextConfig {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign: TextAlignment;
  color: string; // Hex color
  alpha: number; // Opacity (0-1)
  stroke?: StrokeConfig; // Text outline
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

// ===========================
// Main Drawing Interface
// ===========================

/**
 * Scene drawing - GM annotations and terrain markers
 */
export interface SceneDrawing {
  id: string;
  sceneId: string;
  drawingType: DrawingType;

  // Position and dimensions
  x: number; // X coordinate in pixels
  y: number; // Y coordinate in pixels
  width?: number; // For rectangles, text boxes
  height?: number; // For rectangles, text boxes
  radius?: number; // For circles

  // Shape data
  points?: Point2D[]; // For freehand, polygons, lines
  rotation?: number; // Rotation in degrees

  // Visual properties
  stroke: StrokeConfig;
  fill: FillConfig;
  zIndex: number; // Layer ordering

  // Text-specific
  text?: TextConfig;

  // Behavior
  locked: boolean; // Prevent editing
  hidden: boolean; // Hidden from players

  // Permissions
  authorId: string; // User ID of creator
  gmOnly: boolean; // Only visible to GMs

  // Metadata
  label?: string; // Drawing label for organization
  notes?: string; // GM notes about this drawing
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Flags for modules/extensions
  flags?: Record<string, any>;
}

// ===========================
// Measurement Templates
// ===========================

/**
 * Measurement template for spells and abilities
 */
export interface MeasurementTemplate {
  id: string;
  sceneId: string;
  templateType: TemplateType;

  // Position
  x: number; // Origin X in pixels
  y: number; // Origin Y in pixels
  elevation?: number; // Elevation in feet/meters

  // Dimensions (in feet/meters, converted to grid)
  distance: number; // Radius/length of the template
  width?: number; // Width for lines and rectangles
  height?: number; // Height for cubes
  angle?: number; // Cone angle or rotation

  // Direction
  direction: number; // Direction in degrees (0 = north/up)

  // Visual properties
  borderColor: string; // Hex color
  fillColor: string; // Hex color
  borderAlpha: number; // Border opacity (0-1)
  fillAlpha: number; // Fill opacity (0-1)
  texture?: string; // Optional texture overlay

  // Source information
  sourceTokenId?: string; // Token that created this template
  spellName?: string; // Spell/ability name
  spellLevel?: number;
  saveDC?: number; // Save DC if applicable
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  damageType?: string;

  // Behavior
  locked: boolean;
  hidden: boolean; // Hidden from players initially
  persistent: boolean; // Remains after placement

  // Affected tokens
  affectedTokenIds?: string[]; // Tokens within the template

  // Permissions
  authorId: string;
  controlledBy?: string[]; // User IDs who can manipulate

  // Metadata
  createdAt: string; // ISO timestamp
  expiresAt?: string; // Auto-remove timestamp

  // Flags for modules/extensions
  flags?: Record<string, any>;
}

// ===========================
// Template Calculations
// ===========================

/**
 * Template area calculation result
 */
export interface TemplateArea {
  templateId: string;
  points: Point2D[]; // Polygon points defining the area
  gridSquares: Point2D[]; // Grid squares covered by template
  tokensInArea: string[]; // Token IDs within the area
  areaSize: number; // Total area in square feet/meters
}

// ===========================
// Drawing Creation/Update Types
// ===========================

/**
 * Data required to create a new drawing
 */
export interface CreateDrawingData {
  sceneId: string;
  drawingType: DrawingType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: Point2D[];
  stroke?: Partial<StrokeConfig>;
  fill?: Partial<FillConfig>;
  text?: Partial<TextConfig>;
  gmOnly?: boolean;
  label?: string;
}

/**
 * Data for updating an existing drawing
 */
export interface UpdateDrawingData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: Point2D[];
  rotation?: number;
  stroke?: Partial<StrokeConfig>;
  fill?: Partial<FillConfig>;
  text?: Partial<TextConfig>;
  locked?: boolean;
  hidden?: boolean;
  label?: string;
  notes?: string;
}

/**
 * Data required to create a new measurement template
 */
export interface CreateTemplateData {
  sceneId: string;
  templateType: TemplateType;
  x: number;
  y: number;
  distance: number;
  width?: number;
  height?: number;
  angle?: number;
  direction: number;
  sourceTokenId?: string;
  spellName?: string;
  spellLevel?: number;
  saveDC?: number;
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  damageType?: string;
  fillColor?: string;
  borderColor?: string;
  persistent?: boolean;
}

/**
 * Data for updating a measurement template
 */
export interface UpdateTemplateData {
  x?: number;
  y?: number;
  distance?: number;
  width?: number;
  direction?: number;
  fillColor?: string;
  borderColor?: string;
  fillAlpha?: number;
  borderAlpha?: number;
  locked?: boolean;
  hidden?: boolean;
  persistent?: boolean;
}

// ===========================
// Default Values
// ===========================

/**
 * Default stroke configuration
 */
export const defaultStroke: StrokeConfig = {
  width: 2,
  color: '#000000',
  alpha: 1.0,
  style: 'solid',
};

/**
 * Default fill configuration
 */
export const defaultFill: FillConfig = {
  type: FillType.SOLID,
  color: '#ffffff',
  alpha: 0.5,
};

/**
 * Default text configuration
 */
export const defaultTextConfig: TextConfig = {
  content: '',
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: TextAlignment.LEFT,
  color: '#000000',
  alpha: 1.0,
};

/**
 * Template type to default dimensions (in feet)
 */
export const templateTypeDefaults: Record<TemplateType, { distance: number; width?: number; angle?: number }> = {
  [TemplateType.CONE]: { distance: 15, angle: 90 },
  [TemplateType.CUBE]: { distance: 10, width: 10 },
  [TemplateType.SPHERE]: { distance: 20 },
  [TemplateType.CYLINDER]: { distance: 20 },
  [TemplateType.LINE]: { distance: 60, width: 5 },
  [TemplateType.RAY]: { distance: 120, width: 5 },
};

/**
 * Common spell template configurations
 */
export const commonSpellTemplates: Record<string, Partial<CreateTemplateData>> = {
  'Burning Hands': {
    templateType: TemplateType.CONE,
    distance: 15,
    angle: 90,
    fillColor: '#ff4500',
    damageType: 'fire',
  },
  'Fireball': {
    templateType: TemplateType.SPHERE,
    distance: 20,
    fillColor: '#ff4500',
    damageType: 'fire',
  },
  'Lightning Bolt': {
    templateType: TemplateType.LINE,
    distance: 100,
    width: 5,
    fillColor: '#00bfff',
    damageType: 'lightning',
  },
  'Cone of Cold': {
    templateType: TemplateType.CONE,
    distance: 60,
    angle: 90,
    fillColor: '#4169e1',
    damageType: 'cold',
  },
  'Thunderwave': {
    templateType: TemplateType.CUBE,
    distance: 15,
    width: 15,
    fillColor: '#9370db',
    damageType: 'thunder',
  },
};
