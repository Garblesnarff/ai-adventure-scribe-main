/**
 * Template Calculations Utilities
 *
 * This module provides mathematical utilities for calculating areas of effect,
 * determining affected tokens, and managing measurement templates on the battle map.
 */

import { Token } from '@/types/token';
import { MeasurementTemplate, TemplateType } from '@/types/drawing';
import { Point2D } from '@/types/scene';
import { GridType } from '@/types/scene';

// ===========================
// Types
// ===========================

export interface TemplateGeometry {
  points: Point2D[]; // Polygon points defining the template boundary
  gridSquares: Point2D[]; // Grid coordinates of affected squares
}

export interface MeasurementSegment {
  from: Point2D;
  to: Point2D;
  distance: number; // Distance in feet
}

export interface MeasurementPath {
  waypoints: Point2D[];
  segments: MeasurementSegment[];
  totalDistance: number;
}

// ===========================
// Constants
// ===========================

const FEET_PER_GRID_SQUARE = 5; // D&D 5e standard

// ===========================
// Distance Calculations
// ===========================

/**
 * Calculates Euclidean distance between two points
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates grid distance using D&D 5e rules (5-10-5 diagonal pattern)
 * @param p1 - First point in pixels
 * @param p2 - Second point in pixels
 * @param gridSize - Grid size in pixels
 * @returns Distance in feet
 */
export function gridDistance(p1: Point2D, p2: Point2D, gridSize: number): number {
  const dx = Math.abs(p2.x - p1.x) / gridSize;
  const dy = Math.abs(p2.y - p1.y) / gridSize;

  // Use the D&D 5e diagonal rule: every other diagonal costs 10 feet
  const straight = Math.abs(dx - dy);
  const diagonal = Math.min(dx, dy);

  // Count diagonals: alternate between 5ft and 10ft
  const fullDiagonalPairs = Math.floor(diagonal / 2);
  const remainingDiagonal = diagonal % 2;

  const diagonalDistance = (fullDiagonalPairs * 15) + (remainingDiagonal * 5);
  const straightDistance = straight * 5;

  return diagonalDistance + straightDistance;
}

/**
 * Calculates distance in feet between two points
 * @param p1 - First point in pixels
 * @param p2 - Second point in pixels
 * @param gridSize - Grid size in pixels
 * @param useGridDistance - Whether to use D&D grid distance rules
 * @returns Distance in feet
 */
export function calculateDistance(
  p1: Point2D,
  p2: Point2D,
  gridSize: number,
  useGridDistance: boolean = true
): number {
  if (useGridDistance) {
    return gridDistance(p1, p2, gridSize);
  }

  const pixelDistance = euclideanDistance(p1, p2);
  return (pixelDistance / gridSize) * FEET_PER_GRID_SQUARE;
}

/**
 * Calculates a measurement path with waypoints
 */
export function calculateMeasurementPath(
  waypoints: Point2D[],
  gridSize: number,
  useGridDistance: boolean = true
): MeasurementPath {
  const segments: MeasurementSegment[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const distance = calculateDistance(from, to, gridSize, useGridDistance);

    segments.push({ from, to, distance });
    totalDistance += distance;
  }

  return { waypoints, segments, totalDistance };
}

// ===========================
// Cone Template Calculations
// ===========================

/**
 * Calculates the polygon points for a cone template
 * @param origin - Cone origin point in pixels
 * @param direction - Direction in degrees (0 = north/up)
 * @param distance - Cone distance in feet
 * @param angle - Cone angle in degrees (default 90)
 * @param gridSize - Grid size in pixels
 * @returns Polygon points defining the cone
 */
export function getConePoints(
  origin: Point2D,
  direction: number,
  distance: number,
  angle: number = 90,
  gridSize: number
): Point2D[] {
  const distancePixels = (distance / FEET_PER_GRID_SQUARE) * gridSize;
  const halfAngle = (angle / 2) * (Math.PI / 180);
  const directionRad = (direction - 90) * (Math.PI / 180); // Convert to standard math angle

  // Calculate the two edge rays of the cone
  const leftAngle = directionRad - halfAngle;
  const rightAngle = directionRad + halfAngle;

  const points: Point2D[] = [origin];

  // Create arc points at the end of the cone
  const arcSteps = Math.max(8, Math.ceil(angle / 15)); // More steps for wider cones
  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const currentAngle = leftAngle + (rightAngle - leftAngle) * t;
    points.push({
      x: origin.x + Math.cos(currentAngle) * distancePixels,
      y: origin.y + Math.sin(currentAngle) * distancePixels,
    });
  }

  return points;
}

/**
 * Gets tokens within a cone template
 */
export function getTokensInCone(
  origin: Point2D,
  direction: number,
  angle: number,
  distance: number,
  tokens: Token[],
  gridSize: number
): Token[] {
  const conePoints = getConePoints(origin, direction, distance, angle, gridSize);
  return tokens.filter((token) => {
    const tokenCenter = { x: token.x + gridSize / 2, y: token.y + gridSize / 2 };
    return isPointInPolygon(tokenCenter, conePoints);
  });
}

// ===========================
// Sphere/Circle Template Calculations
// ===========================

/**
 * Calculates the points for a circular template
 */
export function getSpherePoints(
  origin: Point2D,
  radius: number,
  gridSize: number,
  segments: number = 32
): Point2D[] {
  const radiusPixels = (radius / FEET_PER_GRID_SQUARE) * gridSize;
  const points: Point2D[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      x: origin.x + Math.cos(angle) * radiusPixels,
      y: origin.y + Math.sin(angle) * radiusPixels,
    });
  }

  return points;
}

/**
 * Gets tokens within a sphere/circle template
 */
export function getTokensInSphere(
  origin: Point2D,
  radius: number,
  tokens: Token[],
  gridSize: number,
  useGridDistance: boolean = true
): Token[] {
  return tokens.filter((token) => {
    const tokenCenter = { x: token.x + gridSize / 2, y: token.y + gridSize / 2 };
    const distance = calculateDistance(origin, tokenCenter, gridSize, useGridDistance);
    return distance <= radius;
  });
}

// ===========================
// Cube/Square Template Calculations
// ===========================

/**
 * Calculates the points for a cube/square template
 */
export function getCubePoints(
  origin: Point2D,
  size: number,
  gridSize: number,
  rotation: number = 0
): Point2D[] {
  const sizePixels = (size / FEET_PER_GRID_SQUARE) * gridSize;
  const halfSize = sizePixels / 2;

  // Create square centered on origin
  const corners: Point2D[] = [
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ];

  // Apply rotation and translation
  const rotationRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  return corners.map((corner) => ({
    x: origin.x + corner.x * cos - corner.y * sin,
    y: origin.y + corner.x * sin + corner.y * cos,
  }));
}

/**
 * Gets tokens within a cube/square template
 */
export function getTokensInCube(
  origin: Point2D,
  size: number,
  tokens: Token[],
  gridSize: number,
  rotation: number = 0
): Token[] {
  const cubePoints = getCubePoints(origin, size, gridSize, rotation);
  return tokens.filter((token) => {
    const tokenCenter = { x: token.x + gridSize / 2, y: token.y + gridSize / 2 };
    return isPointInPolygon(tokenCenter, cubePoints);
  });
}

// ===========================
// Line Template Calculations
// ===========================

/**
 * Calculates the points for a line template
 */
export function getLinePoints(
  origin: Point2D,
  direction: number,
  length: number,
  width: number,
  gridSize: number
): Point2D[] {
  const lengthPixels = (length / FEET_PER_GRID_SQUARE) * gridSize;
  const widthPixels = (width / FEET_PER_GRID_SQUARE) * gridSize;
  const halfWidth = widthPixels / 2;

  const directionRad = (direction - 90) * (Math.PI / 180);
  const cos = Math.cos(directionRad);
  const sin = Math.sin(directionRad);

  // Calculate perpendicular direction for width
  const perpCos = Math.cos(directionRad + Math.PI / 2);
  const perpSin = Math.sin(directionRad + Math.PI / 2);

  // Create rectangle for the line
  return [
    {
      x: origin.x - perpCos * halfWidth,
      y: origin.y - perpSin * halfWidth,
    },
    {
      x: origin.x + perpCos * halfWidth,
      y: origin.y + perpSin * halfWidth,
    },
    {
      x: origin.x + cos * lengthPixels + perpCos * halfWidth,
      y: origin.y + sin * lengthPixels + perpSin * halfWidth,
    },
    {
      x: origin.x + cos * lengthPixels - perpCos * halfWidth,
      y: origin.y + sin * lengthPixels - perpSin * halfWidth,
    },
  ];
}

/**
 * Gets tokens within a line template
 */
export function getTokensInLine(
  origin: Point2D,
  direction: number,
  width: number,
  length: number,
  tokens: Token[],
  gridSize: number
): Token[] {
  const linePoints = getLinePoints(origin, direction, length, width, gridSize);
  return tokens.filter((token) => {
    const tokenCenter = { x: token.x + gridSize / 2, y: token.y + gridSize / 2 };
    return isPointInPolygon(tokenCenter, linePoints);
  });
}

// ===========================
// Grid Square Calculations
// ===========================

/**
 * Gets grid squares affected by a template
 */
export function getAffectedGridSquares(
  template: MeasurementTemplate,
  gridSize: number,
  gridType: GridType = GridType.SQUARE
): Point2D[] {
  if (gridType !== GridType.SQUARE) {
    // TODO: Implement hexagonal grid support
    return [];
  }

  let points: Point2D[] = [];

  // Get template geometry
  switch (template.templateType) {
    case TemplateType.CONE:
      points = getConePoints(
        { x: template.x, y: template.y },
        template.direction,
        template.distance,
        template.angle || 90,
        gridSize
      );
      break;

    case TemplateType.SPHERE:
    case TemplateType.CYLINDER:
      points = getSpherePoints(
        { x: template.x, y: template.y },
        template.distance,
        gridSize
      );
      break;

    case TemplateType.CUBE:
      points = getCubePoints(
        { x: template.x, y: template.y },
        template.distance,
        gridSize,
        template.direction
      );
      break;

    case TemplateType.LINE:
    case TemplateType.RAY:
      points = getLinePoints(
        { x: template.x, y: template.y },
        template.direction,
        template.distance,
        template.width || 5,
        gridSize
      );
      break;
  }

  // Find bounding box
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  // Check each grid square in the bounding box
  const affectedSquares: Point2D[] = [];
  for (let x = Math.floor(minX / gridSize); x <= Math.ceil(maxX / gridSize); x++) {
    for (let y = Math.floor(minY / gridSize); y <= Math.ceil(maxY / gridSize); y++) {
      const squareCenter = {
        x: x * gridSize + gridSize / 2,
        y: y * gridSize + gridSize / 2,
      };

      // Include square if its center is within the template
      if (isPointInPolygon(squareCenter, points)) {
        affectedSquares.push({ x, y });
      }
    }
  }

  return affectedSquares;
}

// ===========================
// Geometry Utilities
// ===========================

/**
 * Determines if a point is inside a polygon using ray casting
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Snaps a point to the nearest grid intersection
 */
export function snapToGridIntersection(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Snaps a point to the center of the nearest grid square
 */
export function snapToGridCenter(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.floor(point.x / gridSize) * gridSize + gridSize / 2,
    y: Math.floor(point.y / gridSize) * gridSize + gridSize / 2,
  };
}

/**
 * Snaps an angle to the nearest 45-degree increment
 */
export function snapAngleTo45Degrees(angle: number): number {
  return Math.round(angle / 45) * 45;
}

// ===========================
// Movement Range Colors
// ===========================

export interface MovementRangeColors {
  normal: string; // Green
  dash: string; // Yellow
  beyond: string; // Red
}

export const defaultMovementColors: MovementRangeColors = {
  normal: '#00ff00',
  dash: '#ffff00',
  beyond: '#ff0000',
};

/**
 * Gets the color for a movement distance based on movement speed
 * @param distance - Distance in feet
 * @param speed - Movement speed in feet
 * @returns Hex color string
 */
export function getMovementRangeColor(
  distance: number,
  speed: number,
  colors: MovementRangeColors = defaultMovementColors
): string {
  if (distance <= speed) {
    return colors.normal;
  } else if (distance <= speed * 2) {
    return colors.dash;
  } else {
    return colors.beyond;
  }
}
