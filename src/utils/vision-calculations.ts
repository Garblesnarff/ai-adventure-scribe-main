/**
 * Vision Calculations Utilities
 *
 * Utilities for calculating vision ranges, light levels, and line-of-sight
 * for Foundry VTT token vision system.
 *
 * @module utils/vision-calculations
 */

import type { Token, TokenVisionConfig, TokenLightConfig } from '@/types/token';
import type { Point2D, VisionBlocker } from '@/types/scene';

// ===========================
// Types
// ===========================

/**
 * Light level at a position
 */
export type LightLevel = 'bright' | 'dim' | 'dark';

/**
 * Vision type priority (higher = better)
 */
const VISION_TYPE_PRIORITY = {
  truesight: 5,
  blindsight: 4,
  tremorsense: 3,
  darkvision: 2,
  basic: 1,
} as const;

// ===========================
// Vision Range Calculations
// ===========================

/**
 * Calculate the effective vision radius for a token
 *
 * Takes into account the token's vision configuration and returns
 * the maximum vision range in feet.
 *
 * @param token - The token to calculate vision for
 * @returns Vision radius in feet
 *
 * @example
 * ```ts
 * const range = calculateVisionRadius(token);
 * console.log(`Token can see ${range} feet`);
 * ```
 */
export function calculateVisionRadius(token: Token): number {
  if (!token.vision.enabled) {
    return 0;
  }

  const vision = token.vision;
  let maxRange = vision.range || 0;

  // Check special vision types and use the maximum
  if (vision.truesight) {
    maxRange = Math.max(maxRange, vision.truesight);
  }
  if (vision.blindsight) {
    maxRange = Math.max(maxRange, vision.blindsight);
  }
  if (vision.tremorsense) {
    maxRange = Math.max(maxRange, vision.tremorsense);
  }
  if (vision.darkvision) {
    maxRange = Math.max(maxRange, vision.darkvision);
  }

  return maxRange;
}

/**
 * Get the active vision type for a token based on light level
 *
 * @param token - The token to check
 * @param lightLevel - The current light level at the token's position
 * @returns The active vision mode
 */
export function getActiveVisionType(
  token: Token,
  lightLevel: LightLevel
): TokenVisionConfig['visionMode'] {
  const vision = token.vision;

  // Truesight works everywhere
  if (vision.truesight && vision.truesight > 0) {
    return 'truesight';
  }

  // Blindsight works everywhere
  if (vision.blindsight && vision.blindsight > 0) {
    return 'blindsight';
  }

  // Tremorsense for ground-based detection
  if (vision.tremorsense && vision.tremorsense > 0) {
    return 'tremorsense';
  }

  // Darkvision in dim/dark light
  if (lightLevel === 'dim' || lightLevel === 'dark') {
    if (vision.darkvision && vision.darkvision > 0) {
      return 'darkvision';
    }
  }

  return vision.visionMode || 'basic';
}

// ===========================
// Light Level Calculations
// ===========================

/**
 * Calculate the effective light level at a position based on nearby light sources
 *
 * @param position - The position to check
 * @param tokens - All tokens in the scene (potential light sources)
 * @param globalLight - Whether the scene has global illumination
 * @returns The light level at the position
 *
 * @example
 * ```ts
 * const lightLevel = getEffectiveLightLevel(
 *   { x: 100, y: 200 },
 *   allTokens,
 *   false
 * );
 * ```
 */
export function getEffectiveLightLevel(
  position: Point2D,
  tokens: Token[],
  globalLight: boolean = false
): LightLevel {
  // If global light is enabled, everything is bright
  if (globalLight) {
    return 'bright';
  }

  let brightestLevel: LightLevel = 'dark';

  // Check each token for light emission
  for (const token of tokens) {
    if (!token.light.emitsLight) {
      continue;
    }

    const distance = calculateDistance(
      { x: token.x, y: token.y },
      position
    );

    // Convert pixels to feet (assuming standard 5ft grid = 100px)
    const distanceInFeet = distance / 20; // 100px / 5ft = 20px per foot

    // Check bright light range
    const brightRange = token.light.lightRange || 0;
    if (distanceInFeet <= brightRange) {
      return 'bright'; // Bright light takes precedence
    }

    // Check dim light range
    const dimRange = token.light.dimLightRange || 0;
    if (distanceInFeet <= brightRange + dimRange) {
      if (brightestLevel === 'dark') {
        brightestLevel = 'dim';
      }
    }
  }

  return brightestLevel;
}

/**
 * Calculate if light from a source reaches a position
 *
 * @param lightSource - The token emitting light
 * @param target - The target position
 * @param walls - Vision blockers that might block light
 * @returns Object containing whether light reaches and at what level
 */
export function calculateLightReach(
  lightSource: Token,
  target: Point2D,
  walls: VisionBlocker[] = []
): { reaches: boolean; level: LightLevel; distance: number } {
  if (!lightSource.light.emitsLight) {
    return { reaches: false, level: 'dark', distance: 0 };
  }

  const distance = calculateDistance(
    { x: lightSource.x, y: lightSource.y },
    target
  );
  const distanceInFeet = distance / 20;

  const brightRange = lightSource.light.lightRange || 0;
  const dimRange = lightSource.light.dimLightRange || 0;
  const totalRange = brightRange + dimRange;

  // Check if within range
  if (distanceInFeet > totalRange) {
    return { reaches: false, level: 'dark', distance: distanceInFeet };
  }

  // Check if blocked by walls
  const isBlocked = isLineBlocked(
    { x: lightSource.x, y: lightSource.y },
    target,
    walls
  );

  if (isBlocked) {
    return { reaches: false, level: 'dark', distance: distanceInFeet };
  }

  // Determine light level
  const level: LightLevel = distanceInFeet <= brightRange ? 'bright' : 'dim';

  return { reaches: true, level, distance: distanceInFeet };
}

// ===========================
// Line of Sight Calculations
// ===========================

/**
 * Check if one token can see another token
 *
 * Takes into account vision ranges, vision types, light levels, and vision blockers.
 *
 * @param viewer - The token doing the viewing
 * @param target - The token being viewed
 * @param walls - Vision blocking elements
 * @param allTokens - All tokens for light calculations
 * @param globalLight - Whether scene has global light
 * @returns Whether the viewer can see the target
 *
 * @example
 * ```ts
 * const canSee = canSeeToken(playerToken, monsterToken, walls, allTokens);
 * if (canSee) {
 *   console.log('Monster is visible!');
 * }
 * ```
 */
export function canSeeToken(
  viewer: Token,
  target: Token,
  walls: VisionBlocker[] = [],
  allTokens: Token[] = [],
  globalLight: boolean = false
): boolean {
  // Check if viewer has vision enabled
  if (!viewer.vision.enabled) {
    return false;
  }

  // Calculate distance
  const distance = calculateDistance(
    { x: viewer.x, y: viewer.y },
    { x: target.x, y: target.y }
  );
  const distanceInFeet = distance / 20;

  // Get vision radius
  const visionRadius = calculateVisionRadius(viewer);
  if (visionRadius > 0 && distanceInFeet > visionRadius) {
    return false;
  }

  // Check vision cone/angle
  if (viewer.vision.angle < 360) {
    const isInCone = isPointInVisionCone(
      { x: viewer.x, y: viewer.y },
      viewer.rotation,
      viewer.vision.angle,
      { x: target.x, y: target.y }
    );
    if (!isInCone) {
      return false;
    }
  }

  // Blindsight and Truesight ignore darkness and some walls
  const visionType = viewer.vision.visionMode || 'basic';
  if (visionType === 'blindsight' || visionType === 'truesight') {
    // Check appropriate range
    const specialRange = visionType === 'truesight'
      ? viewer.vision.truesight || 0
      : viewer.vision.blindsight || 0;

    if (distanceInFeet <= specialRange) {
      // Only hard walls block these
      const hardWalls = walls.filter((w) => w.blocksLight && w.blocksMovement);
      return !isLineBlocked(
        { x: viewer.x, y: viewer.y },
        { x: target.x, y: target.y },
        hardWalls
      );
    }
  }

  // Tremorsense detects ground movement
  if (visionType === 'tremorsense' && viewer.vision.tremorsense) {
    if (distanceInFeet <= viewer.vision.tremorsense && target.elevation === viewer.elevation) {
      return true; // Tremorsense ignores walls
    }
  }

  // Check for vision blockers
  const lineBlocked = isLineBlocked(
    { x: viewer.x, y: viewer.y },
    { x: target.x, y: target.y },
    walls
  );

  if (lineBlocked) {
    return false;
  }

  // Check light level requirements
  const lightLevel = getEffectiveLightLevel(
    { x: target.x, y: target.y },
    allTokens,
    globalLight
  );

  // Normal vision requires light
  if (visionType === 'basic' && lightLevel === 'dark') {
    return false;
  }

  // Darkvision treats darkness as dim light
  if (visionType === 'darkvision') {
    const darkvisionRange = viewer.vision.darkvision || 0;
    if (lightLevel === 'dark' && distanceInFeet > darkvisionRange) {
      return false;
    }
  }

  return true;
}

// ===========================
// Geometric Utilities
// ===========================

/**
 * Calculate Euclidean distance between two points
 *
 * @param a - First point
 * @param b - Second point
 * @returns Distance in pixels
 */
export function calculateDistance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a point is within a vision cone
 *
 * @param origin - The origin of the cone
 * @param rotation - The rotation/facing of the cone in degrees
 * @param angle - The width of the cone in degrees
 * @param target - The point to check
 * @returns Whether the point is in the cone
 */
export function isPointInVisionCone(
  origin: Point2D,
  rotation: number,
  angle: number,
  target: Point2D
): boolean {
  // Full circle vision
  if (angle >= 360) {
    return true;
  }

  // Calculate angle to target
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);

  // Normalize angles
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const normalizedTargetAngle = ((angleToTarget % 360) + 360) % 360;

  // Calculate angle difference
  let diff = Math.abs(normalizedTargetAngle - normalizedRotation);
  if (diff > 180) {
    diff = 360 - diff;
  }

  // Check if within cone
  return diff <= angle / 2;
}

/**
 * Check if a line between two points is blocked by walls
 *
 * Uses line segment intersection to check if any wall blocks the line of sight.
 *
 * @param from - Start point
 * @param to - End point
 * @param walls - Vision blocking elements
 * @returns Whether the line is blocked
 */
export function isLineBlocked(
  from: Point2D,
  to: Point2D,
  walls: VisionBlocker[]
): boolean {
  for (const wall of walls) {
    if (!wall.blocksLight) {
      continue;
    }

    // Check each segment of the wall
    for (let i = 0; i < wall.points.length - 1; i++) {
      const wallStart = wall.points[i];
      const wallEnd = wall.points[i + 1];

      if (lineSegmentsIntersect(from, to, wallStart, wallEnd)) {
        return true;
      }
    }

    // Check closing segment if wall is a polygon
    if (wall.points.length > 2) {
      const wallStart = wall.points[wall.points.length - 1];
      const wallEnd = wall.points[0];

      if (lineSegmentsIntersect(from, to, wallStart, wallEnd)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 *
 * @param a1 - First point of line A
 * @param a2 - Second point of line A
 * @param b1 - First point of line B
 * @param b2 - Second point of line B
 * @returns Whether the line segments intersect
 */
export function lineSegmentsIntersect(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): boolean {
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);

  if (det === 0) {
    return false; // Parallel lines
  }

  const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;

  return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
}

// ===========================
// Light Stacking
// ===========================

/**
 * Calculate combined light level from multiple sources
 *
 * Bright light always takes precedence. Multiple dim lights don't combine to bright.
 *
 * @param lightLevels - Array of light levels at a position
 * @returns The combined light level
 */
export function stackLightLevels(lightLevels: LightLevel[]): LightLevel {
  if (lightLevels.includes('bright')) {
    return 'bright';
  }
  if (lightLevels.includes('dim')) {
    return 'dim';
  }
  return 'dark';
}

/**
 * Get all light sources affecting a position
 *
 * @param position - The position to check
 * @param tokens - All tokens in the scene
 * @param walls - Vision blockers
 * @returns Array of light source data
 */
export function getLightSourcesAtPosition(
  position: Point2D,
  tokens: Token[],
  walls: VisionBlocker[] = []
): Array<{
  token: Token;
  level: LightLevel;
  distance: number;
}> {
  const sources: Array<{
    token: Token;
    level: LightLevel;
    distance: number;
  }> = [];

  for (const token of tokens) {
    const result = calculateLightReach(token, position, walls);
    if (result.reaches) {
      sources.push({
        token,
        level: result.level,
        distance: result.distance,
      });
    }
  }

  return sources;
}

// ===========================
// Vision Color Utilities
// ===========================

/**
 * Get the color for a vision type
 *
 * @param visionMode - The vision mode
 * @returns Hex color string
 */
export function getVisionColor(visionMode: TokenVisionConfig['visionMode']): string {
  const colors: Record<NonNullable<TokenVisionConfig['visionMode']>, string> = {
    basic: '#ffffff',
    darkvision: '#6366f1', // indigo/blue
    monochrome: '#9ca3af', // gray
    tremorsense: '#92400e', // brown
    blindsight: '#fbbf24', // yellow
    truesight: '#fbbf24', // gold
  };

  return colors[visionMode || 'basic'];
}

/**
 * Get opacity for vision type
 *
 * @param visionMode - The vision mode
 * @returns Opacity value 0-1
 */
export function getVisionOpacity(visionMode: TokenVisionConfig['visionMode']): number {
  const opacities: Record<NonNullable<TokenVisionConfig['visionMode']>, number> = {
    basic: 0.15,
    darkvision: 0.2,
    monochrome: 0.2,
    tremorsense: 0.25,
    blindsight: 0.3,
    truesight: 0.35,
  };

  return opacities[visionMode || 'basic'];
}
