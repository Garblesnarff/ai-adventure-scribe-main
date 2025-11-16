/**
 * Lighting Integration with Line of Sight
 *
 * Integrates light sources with vision calculations to create realistic
 * lighting and shadow effects that respect walls and line-of-sight.
 *
 * @module utils/lighting-integration
 */

import type { Point2D, VisionBlocker } from '@/types/scene';
import type { Token } from '@/types/token';
import { raycastToWalls, isInShadow } from './raycasting';
import { QuadTree } from './spatial-partitioning';

// ===========================
// Types
// ===========================

/**
 * Light polygon for rendering
 */
export interface LightPolygon {
  points: Point2D[];
  color: string;
  intensity: number;
  isBright: boolean; // true = bright light, false = dim light
}

/**
 * Shadow segment cast by wall
 */
export interface ShadowSegment {
  points: Point2D[];
  opacity: number;
}

/**
 * Combined lighting result
 */
export interface LightingResult {
  brightLightPolygons: LightPolygon[];
  dimLightPolygons: LightPolygon[];
  shadows: ShadowSegment[];
  ambientOcclusion?: number[]; // Grid of ambient occlusion values
}

// ===========================
// Light Polygon Calculation
// ===========================

/**
 * Calculate light polygon for a light source
 *
 * Similar to vision polygon but for light emission. Respects walls
 * and creates proper shadow boundaries.
 *
 * @param lightSource - Token emitting light
 * @param walls - Vision blocking walls
 * @param quadTree - Optional quadtree for performance
 * @returns Light polygons for bright and dim light
 *
 * @example
 * ```ts
 * const lighting = calculateLightPolygon(torch, walls);
 * // lighting.brightLightPolygons for bright light
 * // lighting.dimLightPolygons for dim light
 * ```
 */
export function calculateLightPolygon(
  lightSource: Token,
  walls: VisionBlocker[],
  quadTree?: QuadTree
): { bright: LightPolygon | null; dim: LightPolygon | null } {
  if (!lightSource.light.emitsLight) {
    return { bright: null, dim: null };
  }

  const origin: Point2D = { x: lightSource.x, y: lightSource.y };
  const brightRange = lightSource.light.lightRange * 20; // Convert feet to pixels
  const dimRange = (lightSource.light.dimLightRange || 0) * 20;
  const totalRange = brightRange + dimRange;

  // Use quadtree if available for better performance
  const relevantWalls = quadTree
    ? quadTree.queryRadius(origin, totalRange)
    : walls;

  // Filter walls that block light
  const lightBlockingWalls = relevantWalls.filter((w) => w.blocksLight);

  // Calculate light polygon using raycasting
  const lightPolygonPoints = calculateLightRays(origin, lightBlockingWalls, totalRange);

  // Split into bright and dim regions
  const brightPolygon: LightPolygon | null = brightRange > 0 ? {
    points: clipPolygonToRadius(lightPolygonPoints, origin, brightRange),
    color: lightSource.light.lightColor,
    intensity: lightSource.light.luminosity || 0.5,
    isBright: true,
  } : null;

  const dimPolygon: LightPolygon | null = dimRange > 0 ? {
    points: subtractPolygons(
      clipPolygonToRadius(lightPolygonPoints, origin, totalRange),
      brightPolygon?.points || []
    ),
    color: lightSource.light.lightColor,
    intensity: (lightSource.light.luminosity || 0.5) * 0.5,
    isBright: false,
  } : null;

  return { bright: brightPolygon, dim: dimPolygon };
}

/**
 * Calculate light rays from origin with wall blocking
 */
function calculateLightRays(
  origin: Point2D,
  walls: VisionBlocker[],
  maxRange: number
): Point2D[] {
  const points: Point2D[] = [];
  const angles: number[] = [];

  // Collect angles to all wall vertices
  for (const wall of walls) {
    for (const point of wall.points) {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const angle = Math.atan2(dy, dx);

      // Add small offsets to handle edge cases
      angles.push(angle - 0.00001, angle, angle + 0.00001);
    }
  }

  // If no walls, create a circle
  if (angles.length === 0) {
    const numPoints = 32;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      angles.push(angle);
    }
  }

  // Cast rays at each angle
  for (const angle of angles) {
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    const hit = raycastToWalls(origin, direction, walls, maxRange);

    if (hit) {
      points.push(hit.point);
    } else {
      points.push({
        x: origin.x + direction.x * maxRange,
        y: origin.y + direction.y * maxRange,
      });
    }
  }

  // Sort by angle
  return points.sort((a, b) => {
    const angleA = Math.atan2(a.y - origin.y, a.x - origin.x);
    const angleB = Math.atan2(b.y - origin.y, b.x - origin.x);
    return angleA - angleB;
  });
}

// ===========================
// Shadow Casting
// ===========================

/**
 * Calculate shadows cast by walls from a light source
 *
 * Creates shadow polygons extending from walls away from light.
 *
 * @param lightSource - Light emitting token
 * @param walls - Walls that cast shadows
 * @param maxShadowLength - How far shadows extend
 * @returns Array of shadow segments
 *
 * @example
 * ```ts
 * const shadows = calculateShadows(torch, walls, 1000);
 * // Render shadows with opacity
 * ```
 */
export function calculateShadows(
  lightSource: Token,
  walls: VisionBlocker[],
  maxShadowLength: number = 2000
): ShadowSegment[] {
  if (!lightSource.light.emitsLight) {
    return [];
  }

  const origin: Point2D = { x: lightSource.x, y: lightSource.y };
  const shadows: ShadowSegment[] = [];

  for (const wall of walls) {
    if (!wall.blocksLight) continue;

    // Process each wall segment
    for (let i = 0; i < wall.points.length - 1; i++) {
      const p1 = wall.points[i];
      const p2 = wall.points[i + 1];

      // Calculate shadow polygon
      const shadow = castShadowFromSegment(origin, p1, p2, maxShadowLength);
      if (shadow) {
        shadows.push({
          points: shadow,
          opacity: 0.7,
        });
      }
    }

    // Handle closing segment for polygons
    if (wall.points.length > 2) {
      const p1 = wall.points[wall.points.length - 1];
      const p2 = wall.points[0];
      const shadow = castShadowFromSegment(origin, p1, p2, maxShadowLength);
      if (shadow) {
        shadows.push({
          points: shadow,
          opacity: 0.7,
        });
      }
    }
  }

  return shadows;
}

/**
 * Cast shadow from a wall segment
 */
function castShadowFromSegment(
  lightPos: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D,
  shadowLength: number
): Point2D[] | null {
  // Calculate if wall faces light
  const toStart = { x: segmentStart.x - lightPos.x, y: segmentStart.y - lightPos.y };
  const toEnd = { x: segmentEnd.x - lightPos.x, y: segmentEnd.y - lightPos.y };

  // Wall normal (perpendicular)
  const wallDx = segmentEnd.x - segmentStart.x;
  const wallDy = segmentEnd.y - segmentStart.y;
  const normalX = -wallDy;
  const normalY = wallDx;

  // Check if wall faces away from light (casts shadow)
  const dotProduct = toStart.x * normalX + toStart.y * normalY;
  if (dotProduct > 0) {
    return null; // Wall faces light, no shadow on this side
  }

  // Project segment endpoints away from light
  const startLength = Math.sqrt(toStart.x * toStart.x + toStart.y * toStart.y);
  const endLength = Math.sqrt(toEnd.x * toEnd.x + toEnd.y * toEnd.y);

  const projectedStart = {
    x: segmentStart.x + (toStart.x / startLength) * shadowLength,
    y: segmentStart.y + (toStart.y / startLength) * shadowLength,
  };

  const projectedEnd = {
    x: segmentEnd.x + (toEnd.x / endLength) * shadowLength,
    y: segmentEnd.y + (toEnd.y / endLength) * shadowLength,
  };

  // Create shadow quad
  return [segmentStart, projectedStart, projectedEnd, segmentEnd];
}

// ===========================
// Ambient Occlusion
// ===========================

/**
 * Calculate ambient occlusion approximation
 *
 * Samples light accessibility at grid points to create soft shadowing.
 * This is a simplified approximation, not true ambient occlusion.
 *
 * @param bounds - Area to calculate AO for
 * @param walls - Walls that block light
 * @param gridSize - Size of sampling grid
 * @param sampleRadius - Radius to sample around each point
 * @returns Grid of occlusion values (0 = fully occluded, 1 = fully lit)
 */
export function calculateAmbientOcclusion(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  walls: VisionBlocker[],
  gridSize: number = 50,
  sampleRadius: number = 100
): number[][] {
  const width = Math.ceil((bounds.maxX - bounds.minX) / gridSize);
  const height = Math.ceil((bounds.maxY - bounds.minY) / gridSize);

  const grid: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];

    for (let x = 0; x < width; x++) {
      const worldX = bounds.minX + x * gridSize;
      const worldY = bounds.minY + y * gridSize;

      // Sample multiple directions
      const numSamples = 16;
      let visibleSamples = 0;

      for (let i = 0; i < numSamples; i++) {
        const angle = (i / numSamples) * Math.PI * 2;
        const sampleX = worldX + Math.cos(angle) * sampleRadius;
        const sampleY = worldY + Math.sin(angle) * sampleRadius;

        // Check if ray to sample point is blocked
        let isBlocked = false;
        for (const wall of walls) {
          if (!wall.blocksLight) continue;

          for (let j = 0; j < wall.points.length - 1; j++) {
            if (
              lineSegmentsIntersect(
                { x: worldX, y: worldY },
                { x: sampleX, y: sampleY },
                wall.points[j],
                wall.points[j + 1]
              )
            ) {
              isBlocked = true;
              break;
            }
          }

          if (isBlocked) break;
        }

        if (!isBlocked) {
          visibleSamples++;
        }
      }

      // Occlusion value: 0 = fully occluded, 1 = fully lit
      row.push(visibleSamples / numSamples);
    }

    grid.push(row);
  }

  return grid;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Clip polygon to radius
 */
function clipPolygonToRadius(points: Point2D[], center: Point2D, radius: number): Point2D[] {
  return points.filter((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  });
}

/**
 * Subtract one polygon from another (simplified)
 */
function subtractPolygons(outer: Point2D[], inner: Point2D[]): Point2D[] {
  // Simplified: just return outer if different from inner
  if (outer.length !== inner.length) return outer;

  // For proper polygon subtraction, use a library like polygon-clipping
  // This is a placeholder implementation
  return outer.filter((point) => {
    return !inner.some((p) => p.x === point.x && p.y === point.y);
  });
}

/**
 * Check line segment intersection
 */
function lineSegmentsIntersect(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): boolean {
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);

  if (det === 0) return false;

  const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;

  return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
}

// ===========================
// Combined Lighting Calculation
// ===========================

/**
 * Calculate complete lighting for a scene
 *
 * Combines multiple light sources, vision, and shadows.
 *
 * @param tokens - All tokens (potential light sources)
 * @param walls - Vision/light blocking walls
 * @param quadTree - Optional quadtree for performance
 * @returns Complete lighting result
 */
export function calculateSceneLighting(
  tokens: Token[],
  walls: VisionBlocker[],
  quadTree?: QuadTree
): LightingResult {
  const brightLightPolygons: LightPolygon[] = [];
  const dimLightPolygons: LightPolygon[] = [];
  const shadows: ShadowSegment[] = [];

  // Process each light source
  for (const token of tokens) {
    if (!token.light.emitsLight) continue;

    // Calculate light polygons
    const { bright, dim } = calculateLightPolygon(token, walls, quadTree);

    if (bright) brightLightPolygons.push(bright);
    if (dim) dimLightPolygons.push(dim);

    // Calculate shadows
    const tokenShadows = calculateShadows(token, walls);
    shadows.push(...tokenShadows);
  }

  return {
    brightLightPolygons,
    dimLightPolygons,
    shadows,
  };
}

/**
 * Check if a point is in light (for visibility calculations)
 *
 * @param point - Point to check
 * @param lightSources - Light emitting tokens
 * @param walls - Light blocking walls
 * @returns Whether point is illuminated
 */
export function isPointInLight(
  point: Point2D,
  lightSources: Token[],
  walls: VisionBlocker[]
): boolean {
  for (const source of lightSources) {
    if (!source.light.emitsLight) continue;

    const dx = point.x - source.x;
    const dy = point.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const distanceInFeet = distance / 20;

    const totalRange =
      source.light.lightRange + (source.light.dimLightRange || 0);

    if (distanceInFeet <= totalRange) {
      // Check if blocked by walls
      if (!isInShadow(point, { x: source.x, y: source.y }, walls[0])) {
        return true;
      }
    }
  }

  return false;
}
