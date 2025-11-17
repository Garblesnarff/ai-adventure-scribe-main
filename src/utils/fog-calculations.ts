/**
 * Fog of War Calculations
 *
 * Utilities for calculating fog of war visibility, vision polygons,
 * and polygon operations (union, intersection, simplification).
 *
 * @module utils/fog-calculations
 */

import type { Point2D, VisionBlocker } from '@/types/scene';
import type { Token } from '@/types/token';
import { isLineBlocked, calculateDistance } from './vision-calculations';

// ===========================
// Types
// ===========================

/**
 * A polygon representing a revealed area
 */
export interface FogPolygon {
  id: string;
  points: Point2D[];
  timestamp: number;
  revealedBy?: string; // Token ID
}

/**
 * Fog state for a point
 */
export type FogState = 'revealed' | 'dim' | 'dark';

// ===========================
// Vision Polygon Calculation
// ===========================

/**
 * Calculate the revealed area polygon for a token based on its vision and walls
 *
 * Uses raycasting to create a visibility polygon that accounts for walls.
 * The polygon represents the area that should be revealed in the fog of war.
 *
 * @param token - The token whose vision to calculate
 * @param walls - Vision blocking elements
 * @param visionRange - Override vision range in feet (uses token's vision if not provided)
 * @param gridSize - Grid size in pixels (default 100)
 * @returns Polygon of revealed area
 *
 * @example
 * ```ts
 * const revealedArea = calculateRevealedArea(token, walls, 60);
 * ```
 */
export function calculateRevealedArea(
  token: Token,
  walls: VisionBlocker[],
  visionRange?: number,
  gridSize: number = 100
): FogPolygon {
  const origin = { x: token.x, y: token.y };

  // Determine vision range
  let range = visionRange;
  if (!range) {
    // Use token's vision range
    if (!token.vision.enabled) {
      range = 0;
    } else {
      range = Math.max(
        token.vision.range || 0,
        token.vision.darkvision || 0,
        token.vision.blindsight || 0,
        token.vision.truesight || 0
      );
    }
  }

  // Convert feet to pixels (5ft = gridSize)
  const rangeInPixels = (range / 5) * gridSize;

  // If no vision, return empty polygon
  if (rangeInPixels === 0) {
    return {
      id: `fog-${token.id}-${Date.now()}`,
      points: [],
      timestamp: Date.now(),
      revealedBy: token.id,
    };
  }

  // Calculate visibility polygon using raycasting
  const visibilityPolygon = calculateVisibilityPolygon(origin, rangeInPixels, walls, token.vision.angle);

  return {
    id: `fog-${token.id}-${Date.now()}`,
    points: visibilityPolygon,
    timestamp: Date.now(),
    revealedBy: token.id,
  };
}

/**
 * Calculate visibility polygon using raycasting
 *
 * Casts rays from the origin in all directions, stopping at walls or max range.
 * Returns a polygon of the visible area.
 *
 * @param origin - The viewpoint origin
 * @param maxRange - Maximum vision range in pixels
 * @param walls - Vision blockers
 * @param visionAngle - Vision cone angle in degrees (360 for full circle)
 * @returns Array of points forming the visibility polygon
 */
export function calculateVisibilityPolygon(
  origin: Point2D,
  maxRange: number,
  walls: VisionBlocker[],
  visionAngle: number = 360
): Point2D[] {
  // Collect all unique angles to cast rays
  const angles = new Set<number>();

  // Add angles for vision cone edges if not full circle
  if (visionAngle < 360) {
    const halfAngle = (visionAngle / 2) * (Math.PI / 180);
    angles.add(-halfAngle);
    angles.add(halfAngle);
  }

  // Add angles for wall endpoints
  walls.forEach((wall) => {
    wall.points.forEach((point) => {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const angle = Math.atan2(dy, dx);

      // Add the angle and slight offsets to catch edges
      angles.add(angle);
      angles.add(angle - 0.0001);
      angles.add(angle + 0.0001);
    });
  });

  // If full circle, add rays at regular intervals
  const numRays = visionAngle >= 360 ? 64 : 32;
  for (let i = 0; i < numRays; i++) {
    const angle = ((i * 360) / numRays) * (Math.PI / 180);
    angles.add(angle);
  }

  // Cast rays and find intersections
  const points: Point2D[] = [];
  const sortedAngles = Array.from(angles).sort((a, b) => a - b);

  sortedAngles.forEach((angle) => {
    // Check if angle is within vision cone
    if (visionAngle < 360) {
      const halfAngle = (visionAngle / 2) * (Math.PI / 180);
      if (angle < -halfAngle || angle > halfAngle) {
        return;
      }
    }

    // Cast ray
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const rayEnd = {
      x: origin.x + dx * maxRange,
      y: origin.y + dy * maxRange,
    };

    // Find nearest intersection with walls
    let nearestIntersection = rayEnd;
    let minDistance = maxRange;

    walls.forEach((wall) => {
      if (!wall.blocksLight) return;

      // Check each segment of the wall
      for (let i = 0; i < wall.points.length - 1; i++) {
        const intersection = rayLineIntersection(
          origin,
          rayEnd,
          wall.points[i],
          wall.points[i + 1]
        );

        if (intersection) {
          const dist = calculateDistance(origin, intersection);
          if (dist < minDistance) {
            minDistance = dist;
            nearestIntersection = intersection;
          }
        }
      }

      // Check closing segment for polygons
      if (wall.points.length > 2) {
        const intersection = rayLineIntersection(
          origin,
          rayEnd,
          wall.points[wall.points.length - 1],
          wall.points[0]
        );

        if (intersection) {
          const dist = calculateDistance(origin, intersection);
          if (dist < minDistance) {
            minDistance = dist;
            nearestIntersection = intersection;
          }
        }
      }
    });

    points.push(nearestIntersection);
  });

  return points;
}

/**
 * Find intersection between a ray and a line segment
 *
 * @param rayOrigin - Ray starting point
 * @param rayEnd - Ray end point (defines direction)
 * @param segmentStart - Line segment start
 * @param segmentEnd - Line segment end
 * @returns Intersection point or null
 */
export function rayLineIntersection(
  rayOrigin: Point2D,
  rayEnd: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D
): Point2D | null {
  const r_px = rayOrigin.x;
  const r_py = rayOrigin.y;
  const r_dx = rayEnd.x - rayOrigin.x;
  const r_dy = rayEnd.y - rayOrigin.y;

  const s_px = segmentStart.x;
  const s_py = segmentStart.y;
  const s_dx = segmentEnd.x - segmentStart.x;
  const s_dy = segmentEnd.y - segmentStart.y;

  const denominator = r_dx * s_dy - r_dy * s_dx;

  if (Math.abs(denominator) < 0.0001) {
    return null; // Parallel
  }

  const t = ((s_px - r_px) * s_dy - (s_py - r_py) * s_dx) / denominator;
  const u = ((s_px - r_px) * r_dy - (s_py - r_py) * r_dx) / denominator;

  if (t >= 0 && u >= 0 && u <= 1) {
    return {
      x: r_px + t * r_dx,
      y: r_py + t * r_dy,
    };
  }

  return null;
}

// ===========================
// Polygon Operations
// ===========================

/**
 * Merge multiple fog polygons into a simplified set
 *
 * Combines overlapping polygons to reduce complexity.
 * This is a simplified implementation - for production, consider using
 * a library like martinez-polygon-clipping or polygon-clipping.
 *
 * @param polygons - Array of polygons to merge
 * @returns Simplified array of merged polygons
 */
export function mergeFogPolygons(polygons: FogPolygon[]): FogPolygon[] {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons;

  // For now, return all polygons (full implementation would use polygon union)
  // In production, use a library like:
  // import { union } from 'polygon-clipping';

  // Simple bounding box merge for performance
  const merged: FogPolygon[] = [];
  const used = new Set<number>();

  for (let i = 0; i < polygons.length; i++) {
    if (used.has(i)) continue;

    let currentPoly = polygons[i];
    let changed = true;

    while (changed) {
      changed = false;
      for (let j = i + 1; j < polygons.length; j++) {
        if (used.has(j)) continue;

        // Check if polygons overlap using bounding boxes
        if (polygonBoundingBoxesOverlap(currentPoly.points, polygons[j].points)) {
          // Merge by combining points (simplified - should use proper union)
          currentPoly = {
            ...currentPoly,
            points: [...currentPoly.points, ...polygons[j].points],
          };
          used.add(j);
          changed = true;
        }
      }
    }

    merged.push(currentPoly);
    used.add(i);
  }

  return merged;
}

/**
 * Check if two polygon bounding boxes overlap
 */
function polygonBoundingBoxesOverlap(points1: Point2D[], points2: Point2D[]): boolean {
  if (points1.length === 0 || points2.length === 0) return false;

  const bbox1 = getPolygonBoundingBox(points1);
  const bbox2 = getPolygonBoundingBox(points2);

  return !(
    bbox1.maxX < bbox2.minX ||
    bbox1.minX > bbox2.maxX ||
    bbox1.maxY < bbox2.minY ||
    bbox1.minY > bbox2.maxY
  );
}

/**
 * Get bounding box of a polygon
 */
function getPolygonBoundingBox(points: Point2D[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Check if a point is inside a revealed area
 *
 * Uses ray casting algorithm to determine if a point is inside a polygon.
 *
 * @param point - The point to check
 * @param revealedAreas - Array of revealed area polygons
 * @returns Whether the point is revealed
 */
export function isPointRevealed(point: Point2D, revealedAreas: FogPolygon[]): boolean {
  for (const area of revealedAreas) {
    if (isPointInPolygon(point, area.points)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point is inside a polygon using ray casting
 *
 * @param point - The point to test
 * @param polygon - The polygon vertices
 * @returns Whether the point is inside the polygon
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Simplify a polygon by removing colinear points
 *
 * Reduces the number of points in a polygon while maintaining its shape.
 *
 * @param points - Polygon points
 * @param tolerance - Tolerance for colinearity (in pixels)
 * @returns Simplified polygon
 */
export function simplifyPolygon(points: Point2D[], tolerance: number = 1.0): Point2D[] {
  if (points.length < 3) return points;

  const simplified: Point2D[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate cross product to check colinearity
    const cross =
      (curr.x - prev.x) * (next.y - prev.y) -
      (curr.y - prev.y) * (next.x - prev.x);

    if (Math.abs(cross) > tolerance) {
      simplified.push(curr);
    }
  }

  // Always include the last point
  simplified.push(points[points.length - 1]);

  return simplified;
}

/**
 * Simplify a polygon using Douglas-Peucker algorithm
 *
 * More sophisticated simplification that maintains shape better than
 * simple colinearity checking.
 *
 * @param points - Polygon points
 * @param epsilon - Maximum distance threshold (in pixels)
 * @returns Simplified polygon
 */
export function douglasPeucker(points: Point2D[], epsilon: number = 2.0): Point2D[] {
  if (points.length < 3) return points;

  // Find the point with maximum distance from line between first and last
  let maxDistance = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const rightSegment = douglasPeucker(points.slice(maxIndex), epsilon);

    // Combine results (remove duplicate middle point)
    return [...leftSegment.slice(0, -1), ...rightSegment];
  } else {
    // Base case: just return endpoints
    return [points[0], points[end]];
  }
}

/**
 * Calculate perpendicular distance from point to line
 *
 * @param point - The point to measure from
 * @param lineStart - Start of the line
 * @param lineEnd - End of the line
 * @returns Distance in pixels
 */
function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Handle degenerate case where line is a point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  // Calculate perpendicular distance using cross product
  const numerator = Math.abs(
    dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);

  return numerator / denominator;
}

/**
 * Calculate the area of a polygon
 *
 * @param points - Polygon vertices
 * @returns Area in square pixels
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Create a circular revealed area polygon
 *
 * Helper for manual fog reveals with brush tool.
 *
 * @param center - Center point
 * @param radius - Radius in pixels
 * @param segments - Number of segments (default 32)
 * @returns Circular polygon
 */
export function createCircularPolygon(
  center: Point2D,
  radius: number,
  segments: number = 32
): Point2D[] {
  const points: Point2D[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return points;
}

/**
 * Create a rectangular revealed area polygon
 *
 * @param topLeft - Top-left corner
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Rectangular polygon
 */
export function createRectangularPolygon(
  topLeft: Point2D,
  width: number,
  height: number
): Point2D[] {
  return [
    topLeft,
    { x: topLeft.x + width, y: topLeft.y },
    { x: topLeft.x + width, y: topLeft.y + height },
    { x: topLeft.x, y: topLeft.y + height },
  ];
}

/**
 * Convert a polygon to a THREE.Shape for rendering
 *
 * @param points - Polygon points
 * @returns Points suitable for THREE.Shape
 */
export function polygonToThreeShape(points: Point2D[]): Array<[number, number]> {
  return points.map((p) => [p.x, p.y]);
}
