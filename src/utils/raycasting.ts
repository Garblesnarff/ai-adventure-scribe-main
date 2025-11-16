/**
 * Raycasting Utilities
 *
 * Efficient ray-line intersection algorithms for vision polygon calculation
 * and line-of-sight calculations in Foundry VTT integration.
 *
 * @module utils/raycasting
 */

import type { Point2D, VisionBlocker } from '@/types/scene';

// ===========================
// Types
// ===========================

/**
 * Line segment defined by two points
 */
export interface LineSegment {
  start: Point2D;
  end: Point2D;
}

/**
 * Ray defined by origin and direction
 */
export interface Ray {
  origin: Point2D;
  direction: Point2D; // Normalized direction vector
}

/**
 * Intersection result with detailed information
 */
export interface RayIntersection {
  point: Point2D;
  distance: number;
  wallId: string;
  segmentIndex: number;
  normal?: Point2D; // Surface normal at intersection
}

/**
 * Vision endpoint for polygon calculation
 */
export interface VisionEndpoint {
  point: Point2D;
  angle: number;
  distance: number;
  isWallVertex: boolean;
  wallId?: string;
}

// ===========================
// Core Raycasting Functions
// ===========================

/**
 * Cast a ray from origin in direction and find the first wall intersection
 *
 * Uses efficient ray-line segment intersection algorithm with early exit optimization.
 *
 * @param origin - Starting point of the ray
 * @param direction - Direction vector (will be normalized)
 * @param walls - Vision blocking walls to test against
 * @param maxDistance - Maximum ray distance (default: Infinity)
 * @returns Intersection data or null if no intersection
 *
 * @example
 * ```ts
 * const hit = raycastToWalls(
 *   { x: 100, y: 100 },
 *   { x: 1, y: 0 },
 *   walls,
 *   500
 * );
 * if (hit) {
 *   console.log(`Hit wall at ${hit.point.x}, ${hit.point.y}`);
 * }
 * ```
 */
export function raycastToWalls(
  origin: Point2D,
  direction: Point2D,
  walls: VisionBlocker[],
  maxDistance: number = Infinity
): RayIntersection | null {
  // Normalize direction
  const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (dirLength === 0) return null;

  const normalizedDir = {
    x: direction.x / dirLength,
    y: direction.y / dirLength,
  };

  let closestIntersection: RayIntersection | null = null;
  let closestDistance = maxDistance;

  for (const wall of walls) {
    if (!wall.blocksLight) continue;

    // Check each segment of the wall
    for (let i = 0; i < wall.points.length - 1; i++) {
      const intersection = rayLineSegmentIntersection(
        origin,
        normalizedDir,
        wall.points[i],
        wall.points[i + 1]
      );

      if (intersection && intersection.distance < closestDistance) {
        closestDistance = intersection.distance;
        closestIntersection = {
          ...intersection,
          wallId: wall.id,
          segmentIndex: i,
        };
      }
    }

    // Check closing segment if wall forms a polygon
    if (wall.points.length > 2) {
      const intersection = rayLineSegmentIntersection(
        origin,
        normalizedDir,
        wall.points[wall.points.length - 1],
        wall.points[0]
      );

      if (intersection && intersection.distance < closestDistance) {
        closestDistance = intersection.distance;
        closestIntersection = {
          ...intersection,
          wallId: wall.id,
          segmentIndex: wall.points.length - 1,
        };
      }
    }
  }

  return closestIntersection;
}

/**
 * Get all ray intersections from origin to all wall endpoints and corners
 *
 * This is the core of vision polygon calculation. Casts rays to all wall vertices
 * and slightly offset angles to handle edge cases properly.
 *
 * @param origin - Center point (token position)
 * @param walls - All walls in the scene
 * @param maxRange - Maximum vision range in pixels
 * @returns Array of vision endpoints sorted by angle
 *
 * @example
 * ```ts
 * const endpoints = getAllRayIntersections(tokenPos, walls, 600);
 * // endpoints are sorted clockwise from -PI to PI
 * ```
 */
export function getAllRayIntersections(
  origin: Point2D,
  walls: VisionBlocker[],
  maxRange: number = 1000
): VisionEndpoint[] {
  const endpoints: VisionEndpoint[] = [];
  const uniqueAngles = new Set<number>();

  // Collect all wall vertices
  const wallVertices: Array<{ point: Point2D; wallId: string }> = [];
  for (const wall of walls) {
    if (!wall.blocksLight) continue;

    for (const point of wall.points) {
      wallVertices.push({ point, wallId: wall.id });
    }
  }

  // Cast rays to each vertex and slightly offset angles
  for (const vertex of wallVertices) {
    const dx = vertex.point.x - origin.x;
    const dy = vertex.point.y - origin.y;
    const angle = Math.atan2(dy, dx);

    // Cast rays at vertex angle and small offsets to handle edge cases
    const offsetAngles = [
      angle - 0.00001,
      angle,
      angle + 0.00001,
    ];

    for (const testAngle of offsetAngles) {
      // Skip if we've already tested this angle (with some tolerance)
      const roundedAngle = Math.round(testAngle * 100000) / 100000;
      if (uniqueAngles.has(roundedAngle)) continue;
      uniqueAngles.add(roundedAngle);

      const direction = {
        x: Math.cos(testAngle),
        y: Math.sin(testAngle),
      };

      const intersection = raycastToWalls(origin, direction, walls, maxRange);

      if (intersection) {
        endpoints.push({
          point: intersection.point,
          angle: testAngle,
          distance: intersection.distance,
          isWallVertex: true,
          wallId: intersection.wallId,
        });
      } else {
        // No wall hit, extend to max range
        endpoints.push({
          point: {
            x: origin.x + direction.x * maxRange,
            y: origin.y + direction.y * maxRange,
          },
          angle: testAngle,
          distance: maxRange,
          isWallVertex: false,
        });
      }
    }
  }

  // If no walls, create a circle of endpoints
  if (endpoints.length === 0) {
    const numPoints = 32; // Circle approximation
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI;
      const direction = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };

      endpoints.push({
        point: {
          x: origin.x + direction.x * maxRange,
          y: origin.y + direction.y * maxRange,
        },
        angle,
        distance: maxRange,
        isWallVertex: false,
      });
    }
  }

  return endpoints;
}

/**
 * Calculate intersection between ray and line segment
 *
 * Uses parametric form for efficient calculation:
 * Ray: P = origin + t * direction
 * Line: P = start + s * (end - start)
 *
 * @param origin - Ray origin
 * @param direction - Ray direction (should be normalized)
 * @param segmentStart - Line segment start point
 * @param segmentEnd - Line segment end point
 * @returns Intersection with distance or null
 */
function rayLineSegmentIntersection(
  origin: Point2D,
  direction: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D
): { point: Point2D; distance: number; normal: Point2D } | null {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;

  const det = dx * direction.y - dy * direction.x;

  // Parallel or coincident
  if (Math.abs(det) < 1e-10) {
    return null;
  }

  const u = ((origin.y - segmentStart.y) * direction.x - (origin.x - segmentStart.x) * direction.y) / det;
  const t = ((origin.y - segmentStart.y) * dx - (origin.x - segmentStart.x) * dy) / det;

  // Check if intersection is within segment and ray
  if (u >= 0 && u <= 1 && t >= 0) {
    const point = {
      x: origin.x + t * direction.x,
      y: origin.y + t * direction.y,
    };

    // Calculate surface normal (perpendicular to wall segment)
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    const normal = {
      x: -dy / segmentLength,
      y: dx / segmentLength,
    };

    return {
      point,
      distance: t,
      normal,
    };
  }

  return null;
}

// ===========================
// Line Segment Intersection
// ===========================

/**
 * Calculate exact intersection point between two line segments
 *
 * Returns the intersection point if segments intersect, null otherwise.
 * This is more precise than the boolean check in vision-calculations.ts
 *
 * @param line1 - First line segment
 * @param line2 - Second line segment
 * @returns Intersection point or null
 *
 * @example
 * ```ts
 * const intersection = lineSegmentIntersection(
 *   { start: {x: 0, y: 0}, end: {x: 10, y: 10} },
 *   { start: {x: 0, y: 10}, end: {x: 10, y: 0} }
 * );
 * // Returns {x: 5, y: 5}
 * ```
 */
export function lineSegmentIntersection(
  line1: LineSegment,
  line2: LineSegment
): Point2D | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;
  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Parallel or coincident
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

// ===========================
// Sorting and Utilities
// ===========================

/**
 * Sort points by angle around origin (clockwise from east)
 *
 * Used to order vision polygon vertices for proper rendering.
 *
 * @param origin - Center point
 * @param points - Points to sort
 * @returns Sorted array of points
 *
 * @example
 * ```ts
 * const sorted = sortPointsByAngle(tokenPos, visionPoints);
 * // Points now ordered clockwise
 * ```
 */
export function sortPointsByAngle(origin: Point2D, points: Point2D[]): Point2D[] {
  return points.slice().sort((a, b) => {
    const angleA = Math.atan2(a.y - origin.y, a.x - origin.x);
    const angleB = Math.atan2(b.y - origin.y, b.x - origin.x);
    return angleA - angleB;
  });
}

/**
 * Sort vision endpoints by angle
 *
 * Convenience wrapper for sorting VisionEndpoint arrays
 *
 * @param endpoints - Endpoints to sort
 * @returns Sorted endpoints
 */
export function sortEndpointsByAngle(endpoints: VisionEndpoint[]): VisionEndpoint[] {
  return endpoints.slice().sort((a, b) => a.angle - b.angle);
}

/**
 * Remove duplicate points within tolerance
 *
 * Prevents polygon calculation issues from near-duplicate vertices
 *
 * @param points - Array of points
 * @param tolerance - Distance tolerance (default: 0.1 pixels)
 * @returns Deduplicated points
 */
export function removeDuplicatePoints(
  points: Point2D[],
  tolerance: number = 0.1
): Point2D[] {
  if (points.length === 0) return [];

  const unique: Point2D[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    let isDuplicate = false;

    for (const existing of unique) {
      const dx = point.x - existing.x;
      const dy = point.y - existing.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < tolerance) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(point);
    }
  }

  return unique;
}

// ===========================
// Advanced Raycasting
// ===========================

/**
 * Cast multiple rays in a cone from origin
 *
 * Useful for vision cones with limited angle
 *
 * @param origin - Starting point
 * @param centerAngle - Center direction in radians
 * @param coneAngle - Total cone width in radians
 * @param numRays - Number of rays to cast
 * @param walls - Walls to test against
 * @param maxDistance - Maximum ray distance
 * @returns Array of intersections
 */
export function raycastCone(
  origin: Point2D,
  centerAngle: number,
  coneAngle: number,
  numRays: number,
  walls: VisionBlocker[],
  maxDistance: number = 1000
): RayIntersection[] {
  const intersections: RayIntersection[] = [];
  const startAngle = centerAngle - coneAngle / 2;
  const angleStep = coneAngle / (numRays - 1);

  for (let i = 0; i < numRays; i++) {
    const angle = startAngle + i * angleStep;
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    const hit = raycastToWalls(origin, direction, walls, maxDistance);
    if (hit) {
      intersections.push(hit);
    }
  }

  return intersections;
}

/**
 * Check if point is in shadow of wall relative to light source
 *
 * Used for shadow casting from light sources
 *
 * @param point - Point to test
 * @param lightSource - Light position
 * @param wall - Wall that might cast shadow
 * @returns Whether point is in shadow
 */
export function isInShadow(
  point: Point2D,
  lightSource: Point2D,
  wall: VisionBlocker
): boolean {
  if (!wall.blocksLight) return false;

  // Check each segment of the wall
  for (let i = 0; i < wall.points.length - 1; i++) {
    const wallStart = wall.points[i];
    const wallEnd = wall.points[i + 1];

    // Ray from light to point
    const dx = point.x - lightSource.x;
    const dy = point.y - lightSource.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) continue;

    const direction = {
      x: dx / distance,
      y: dy / distance,
    };

    const intersection = rayLineSegmentIntersection(
      lightSource,
      direction,
      wallStart,
      wallEnd
    );

    if (intersection && intersection.distance < distance - 0.1) {
      return true; // Wall blocks light before reaching point
    }
  }

  return false;
}

/**
 * Calculate reflection vector for a ray hitting a surface
 *
 * Used for advanced lighting effects (mirrors, reflective surfaces)
 *
 * @param incident - Incident ray direction (normalized)
 * @param normal - Surface normal (normalized)
 * @returns Reflected ray direction
 */
export function calculateReflection(incident: Point2D, normal: Point2D): Point2D {
  // R = I - 2(I·N)N
  const dot = incident.x * normal.x + incident.y * normal.y;
  return {
    x: incident.x - 2 * dot * normal.x,
    y: incident.y - 2 * dot * normal.y,
  };
}
