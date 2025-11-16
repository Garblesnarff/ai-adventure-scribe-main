/**
 * Vision Calculation Web Worker
 *
 * Offloads heavy vision polygon calculations to a separate thread
 * to prevent blocking the main UI thread. Handles multiple tokens
 * and caches results when tokens don't move.
 *
 * @module workers/vision-worker
 */

import type { Point2D, VisionBlocker } from '@/types/scene';
import type { Token } from '@/types/token';
import type { VisionPolygon } from '@/utils/vision-calculations';

// ===========================
// Message Types
// ===========================

/**
 * Message types for worker communication
 */
export type VisionWorkerMessage =
  | {
      type: 'CALCULATE_VISION';
      payload: {
        token: Token;
        walls: VisionBlocker[];
        range?: number;
      };
      requestId: string;
    }
  | {
      type: 'CALCULATE_MULTI_VISION';
      payload: {
        tokens: Token[];
        walls: VisionBlocker[];
        range?: number;
      };
      requestId: string;
    }
  | {
      type: 'UPDATE_WALLS';
      payload: {
        walls: VisionBlocker[];
      };
    }
  | {
      type: 'CLEAR_CACHE';
    };

/**
 * Response from worker
 */
export type VisionWorkerResponse =
  | {
      type: 'VISION_RESULT';
      payload: {
        tokenId: string;
        polygon: VisionPolygon;
      };
      requestId: string;
    }
  | {
      type: 'MULTI_VISION_RESULT';
      payload: {
        polygons: Map<string, VisionPolygon>;
      };
      requestId: string;
    }
  | {
      type: 'ERROR';
      payload: {
        error: string;
      };
      requestId: string;
    };

// ===========================
// Vision Cache
// ===========================

/**
 * Cache entry for vision polygon
 */
interface CacheEntry {
  polygon: VisionPolygon;
  tokenPosition: Point2D;
  tokenRotation: number;
  visionRange: number;
  timestamp: number;
}

/**
 * Vision calculation cache
 */
class VisionCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxAge = 5000; // 5 seconds
  private readonly maxEntries = 100;

  /**
   * Get cached polygon if token hasn't moved
   */
  get(token: Token, range?: number): VisionPolygon | null {
    const entry = this.cache.get(token.id);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(token.id);
      return null;
    }

    // Check if token position/rotation changed
    const effectiveRange = range !== undefined ? range : token.vision.range;
    if (
      entry.tokenPosition.x !== token.x ||
      entry.tokenPosition.y !== token.y ||
      entry.tokenRotation !== token.rotation ||
      entry.visionRange !== effectiveRange
    ) {
      return null;
    }

    return entry.polygon;
  }

  /**
   * Store polygon in cache
   */
  set(token: Token, polygon: VisionPolygon, range?: number): void {
    // Limit cache size
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const effectiveRange = range !== undefined ? range : token.vision.range;

    this.cache.set(token.id, {
      polygon,
      tokenPosition: { x: token.x, y: token.y },
      tokenRotation: token.rotation,
      visionRange: effectiveRange,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove specific token from cache
   */
  remove(tokenId: string): void {
    this.cache.delete(tokenId);
  }
}

// ===========================
// Worker State
// ===========================

const cache = new VisionCache();
let walls: VisionBlocker[] = [];

// ===========================
// Worker Message Handler
// ===========================

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<VisionWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'CALCULATE_VISION':
        handleCalculateVision(message);
        break;

      case 'CALCULATE_MULTI_VISION':
        handleCalculateMultiVision(message);
        break;

      case 'UPDATE_WALLS':
        handleUpdateWalls(message);
        break;

      case 'CLEAR_CACHE':
        cache.clear();
        break;

      default:
        // @ts-ignore
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      requestId: 'requestId' in message ? message.requestId : 'unknown',
    } as VisionWorkerResponse);
  }
};

// ===========================
// Message Handlers
// ===========================

/**
 * Calculate vision for a single token
 */
function handleCalculateVision(
  message: Extract<VisionWorkerMessage, { type: 'CALCULATE_VISION' }>
): void {
  const { token, walls: messageWalls, range } = message.payload;
  const effectiveWalls = messageWalls || walls;

  // Check cache first
  let polygon = cache.get(token, range);

  if (!polygon) {
    // Calculate new polygon
    polygon = calculateVisionPolygonInWorker(token, effectiveWalls, range);
    cache.set(token, polygon, range);
  }

  self.postMessage({
    type: 'VISION_RESULT',
    payload: {
      tokenId: token.id,
      polygon,
    },
    requestId: message.requestId,
  } as VisionWorkerResponse);
}

/**
 * Calculate vision for multiple tokens (parallel processing)
 */
function handleCalculateMultiVision(
  message: Extract<VisionWorkerMessage, { type: 'CALCULATE_MULTI_VISION' }>
): void {
  const { tokens, walls: messageWalls, range } = message.payload;
  const effectiveWalls = messageWalls || walls;

  const polygons = new Map<string, VisionPolygon>();

  for (const token of tokens) {
    // Check cache first
    let polygon = cache.get(token, range);

    if (!polygon) {
      // Calculate new polygon
      polygon = calculateVisionPolygonInWorker(token, effectiveWalls, range);
      cache.set(token, polygon, range);
    }

    polygons.set(token.id, polygon);
  }

  // Note: Map cannot be directly serialized, convert to object
  const polygonsObj: Record<string, VisionPolygon> = {};
  for (const [key, value] of polygons) {
    polygonsObj[key] = value;
  }

  self.postMessage({
    type: 'MULTI_VISION_RESULT',
    payload: {
      polygons: polygonsObj,
    },
    requestId: message.requestId,
  } as any); // Cast needed due to Map serialization
}

/**
 * Update stored walls and clear cache
 */
function handleUpdateWalls(
  message: Extract<VisionWorkerMessage, { type: 'UPDATE_WALLS' }>
): void {
  walls = message.payload.walls;
  cache.clear(); // Wall changes invalidate all cached polygons
}

// ===========================
// Vision Calculation (Worker Implementation)
// ===========================

/**
 * Calculate vision polygon in worker context
 *
 * This is a standalone implementation that doesn't rely on external modules
 * to avoid module loading issues in Web Workers.
 */
function calculateVisionPolygonInWorker(
  token: Token,
  walls: VisionBlocker[],
  range?: number
): VisionPolygon {
  if (!token.vision.enabled) {
    return {
      points: [],
      range: 0,
      visionMode: token.vision.visionMode || 'basic',
    };
  }

  // Calculate effective range
  const visionRange = range !== undefined ? range : calculateVisionRadius(token) * 20;
  const origin: Point2D = { x: token.x, y: token.y };

  // Filter walls based on vision type
  const effectiveWalls = filterWallsByVisionType(token, walls);

  // Get all ray intersections
  const endpoints = getAllRayIntersections(origin, effectiveWalls, visionRange);

  // Sort by angle
  const sortedEndpoints = endpoints.sort((a, b) => a.angle - b.angle);

  // Extract points
  let points = sortedEndpoints.map((ep) => ep.point);

  // Handle vision cone (limited angle)
  if (token.vision.angle < 360) {
    points = clipPolygonToCone(
      points,
      origin,
      token.rotation,
      token.vision.angle,
      visionRange
    );
  }

  // Remove duplicate points
  points = removeDuplicatePoints(points);

  // Ensure polygon is closed
  if (points.length > 0) {
    const first = points[0];
    const last = points[points.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    if (Math.sqrt(dx * dx + dy * dy) > 0.1) {
      points.push(first);
    }
  }

  return {
    points,
    range: visionRange,
    visionMode: token.vision.visionMode || 'basic',
    coneAngle: token.vision.angle < 360 ? token.vision.angle : undefined,
    rotation: token.vision.angle < 360 ? token.rotation : undefined,
  };
}

/**
 * Calculate vision radius from token
 */
function calculateVisionRadius(token: Token): number {
  if (!token.vision.enabled) return 0;

  const vision = token.vision;
  let maxRange = vision.range || 0;

  if (vision.truesight) maxRange = Math.max(maxRange, vision.truesight);
  if (vision.blindsight) maxRange = Math.max(maxRange, vision.blindsight);
  if (vision.tremorsense) maxRange = Math.max(maxRange, vision.tremorsense);
  if (vision.darkvision) maxRange = Math.max(maxRange, vision.darkvision);

  return maxRange;
}

/**
 * Filter walls by vision type
 */
function filterWallsByVisionType(token: Token, walls: VisionBlocker[]): VisionBlocker[] {
  const visionType = token.vision.visionMode || 'basic';

  if (visionType === 'truesight' || visionType === 'blindsight') {
    return walls.filter((wall) => wall.blocksLight && wall.blocksMovement);
  }

  if (visionType === 'tremorsense') {
    return [];
  }

  return walls.filter((wall) => wall.blocksLight);
}

/**
 * Get all ray intersections
 */
function getAllRayIntersections(
  origin: Point2D,
  walls: VisionBlocker[],
  maxRange: number
): Array<{ point: Point2D; angle: number; distance: number }> {
  const endpoints: Array<{ point: Point2D; angle: number; distance: number }> = [];
  const uniqueAngles = new Set<number>();

  // Collect all wall vertices
  const wallVertices: Point2D[] = [];
  for (const wall of walls) {
    if (!wall.blocksLight) continue;
    for (const point of wall.points) {
      wallVertices.push(point);
    }
  }

  // Cast rays to each vertex with small angle offsets
  for (const vertex of wallVertices) {
    const dx = vertex.x - origin.x;
    const dy = vertex.y - origin.y;
    const angle = Math.atan2(dy, dx);

    const offsetAngles = [angle - 0.00001, angle, angle + 0.00001];

    for (const testAngle of offsetAngles) {
      const roundedAngle = Math.round(testAngle * 100000) / 100000;
      if (uniqueAngles.has(roundedAngle)) continue;
      uniqueAngles.add(roundedAngle);

      const direction = { x: Math.cos(testAngle), y: Math.sin(testAngle) };
      const intersection = raycastToWalls(origin, direction, walls, maxRange);

      if (intersection) {
        endpoints.push({
          point: intersection.point,
          angle: testAngle,
          distance: intersection.distance,
        });
      } else {
        endpoints.push({
          point: {
            x: origin.x + direction.x * maxRange,
            y: origin.y + direction.y * maxRange,
          },
          angle: testAngle,
          distance: maxRange,
        });
      }
    }
  }

  // If no walls, create circle
  if (endpoints.length === 0) {
    const numPoints = 32;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      endpoints.push({
        point: {
          x: origin.x + direction.x * maxRange,
          y: origin.y + direction.y * maxRange,
        },
        angle,
        distance: maxRange,
      });
    }
  }

  return endpoints;
}

/**
 * Raycast to walls
 */
function raycastToWalls(
  origin: Point2D,
  direction: Point2D,
  walls: VisionBlocker[],
  maxDistance: number
): { point: Point2D; distance: number } | null {
  let closestIntersection: { point: Point2D; distance: number } | null = null;
  let closestDistance = maxDistance;

  for (const wall of walls) {
    if (!wall.blocksLight) continue;

    for (let i = 0; i < wall.points.length - 1; i++) {
      const intersection = rayLineSegmentIntersection(
        origin,
        direction,
        wall.points[i],
        wall.points[i + 1]
      );

      if (intersection && intersection.distance < closestDistance) {
        closestDistance = intersection.distance;
        closestIntersection = intersection;
      }
    }

    if (wall.points.length > 2) {
      const intersection = rayLineSegmentIntersection(
        origin,
        direction,
        wall.points[wall.points.length - 1],
        wall.points[0]
      );

      if (intersection && intersection.distance < closestDistance) {
        closestDistance = intersection.distance;
        closestIntersection = intersection;
      }
    }
  }

  return closestIntersection;
}

/**
 * Ray-line segment intersection
 */
function rayLineSegmentIntersection(
  origin: Point2D,
  direction: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D
): { point: Point2D; distance: number } | null {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const det = dx * direction.y - dy * direction.x;

  if (Math.abs(det) < 1e-10) return null;

  const u =
    ((origin.y - segmentStart.y) * direction.x - (origin.x - segmentStart.x) * direction.y) /
    det;
  const t = ((origin.y - segmentStart.y) * dx - (origin.x - segmentStart.x) * dy) / det;

  if (u >= 0 && u <= 1 && t >= 0) {
    return {
      point: {
        x: origin.x + t * direction.x,
        y: origin.y + t * direction.y,
      },
      distance: t,
    };
  }

  return null;
}

/**
 * Clip polygon to cone
 */
function clipPolygonToCone(
  points: Point2D[],
  origin: Point2D,
  rotation: number,
  angle: number,
  maxRange: number
): Point2D[] {
  const clipped: Point2D[] = [];
  const halfAngle = (angle / 2) * (Math.PI / 180);
  const centerAngle = rotation * (Math.PI / 180);

  const startAngle = centerAngle - halfAngle;
  const endAngle = centerAngle + halfAngle;

  clipped.push({
    x: origin.x + Math.cos(startAngle) * maxRange,
    y: origin.y + Math.sin(startAngle) * maxRange,
  });

  for (const point of points) {
    if (isPointInVisionCone(origin, rotation, angle, point)) {
      clipped.push(point);
    }
  }

  clipped.push({
    x: origin.x + Math.cos(endAngle) * maxRange,
    y: origin.y + Math.sin(endAngle) * maxRange,
  });

  clipped.push(origin);

  return clipped;
}

/**
 * Check if point is in vision cone
 */
function isPointInVisionCone(
  origin: Point2D,
  rotation: number,
  angle: number,
  target: Point2D
): boolean {
  if (angle >= 360) return true;

  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const normalizedTargetAngle = ((angleToTarget % 360) + 360) % 360;

  let diff = Math.abs(normalizedTargetAngle - normalizedRotation);
  if (diff > 180) diff = 360 - diff;

  return diff <= angle / 2;
}

/**
 * Remove duplicate points
 */
function removeDuplicatePoints(points: Point2D[], tolerance: number = 0.1): Point2D[] {
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

// Export for TypeScript
export {};
