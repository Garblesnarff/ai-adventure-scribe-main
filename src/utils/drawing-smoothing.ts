/**
 * Drawing Smoothing Utilities
 *
 * Provides curve smoothing algorithms for freehand drawings.
 * Implements Catmull-Rom spline and Bezier curve fitting for smooth, natural-looking paths.
 *
 * @module utils/drawing-smoothing
 */

import type { Point2D } from '@/types/scene';

// ===========================
// Types
// ===========================

export interface SmoothingOptions {
  /** Tension parameter for Catmull-Rom spline (0 = looser, 1 = tighter). Default: 0.5 */
  tension?: number;
  /** Minimum distance between points to keep (for point reduction). Default: 2 */
  minDistance?: number;
  /** Maximum number of points to generate. Default: unlimited */
  maxPoints?: number;
  /** Enable point reduction for performance. Default: true */
  reducePoints?: boolean;
}

// ===========================
// Point Utilities
// ===========================

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Reduce number of points by removing those too close together
 * This improves performance while maintaining shape fidelity
 */
export function reducePoints(points: Point2D[], minDistance: number = 2): Point2D[] {
  if (points.length < 2) return points;

  const reduced: Point2D[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const lastPoint = reduced[reduced.length - 1];
    if (distance(lastPoint, points[i]) >= minDistance) {
      reduced.push(points[i]);
    }
  }

  // Always keep the last point
  reduced.push(points[points.length - 1]);

  return reduced;
}

// ===========================
// Catmull-Rom Spline
// ===========================

/**
 * Calculate a point on a Catmull-Rom spline segment
 *
 * @param p0 - Point before the segment
 * @param p1 - Start point of segment
 * @param p2 - End point of segment
 * @param p3 - Point after the segment
 * @param t - Parameter (0-1) along the segment
 * @param tension - Tension parameter (0-1)
 * @returns Interpolated point
 */
function catmullRomPoint(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number,
  tension: number = 0.5
): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis functions
  const v0 = -tension * t3 + 2 * tension * t2 - tension * t;
  const v1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
  const v2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
  const v3 = tension * t3 - tension * t2;

  return {
    x: v0 * p0.x + v1 * p1.x + v2 * p2.x + v3 * p3.x,
    y: v0 * p0.y + v1 * p1.y + v2 * p2.y + v3 * p3.y,
  };
}

/**
 * Smooth a path using Catmull-Rom spline
 *
 * @param points - Input points to smooth
 * @param options - Smoothing options
 * @returns Smoothed points
 */
export function smoothPath(points: Point2D[], options: SmoothingOptions = {}): Point2D[] {
  const {
    tension = 0.5,
    minDistance = 2,
    maxPoints,
    reducePoints: shouldReduce = true,
  } = options;

  // Need at least 2 points
  if (points.length < 2) return points;

  // If only 2 points, return as-is
  if (points.length === 2) return points;

  // Optionally reduce points first
  const inputPoints = shouldReduce ? reducePoints(points, minDistance) : points;

  if (inputPoints.length < 3) return inputPoints;

  const smoothed: Point2D[] = [];
  const segmentsPerPoint = 8; // Number of interpolation steps per segment

  // Add first point
  smoothed.push(inputPoints[0]);

  // Process each segment
  for (let i = 0; i < inputPoints.length - 1; i++) {
    // Get the four control points for this segment
    const p0 = i > 0 ? inputPoints[i - 1] : inputPoints[i];
    const p1 = inputPoints[i];
    const p2 = inputPoints[i + 1];
    const p3 = i < inputPoints.length - 2 ? inputPoints[i + 2] : inputPoints[i + 1];

    // Interpolate along the segment
    for (let j = 1; j <= segmentsPerPoint; j++) {
      const t = j / segmentsPerPoint;
      const point = catmullRomPoint(p0, p1, p2, p3, t, tension);
      smoothed.push(point);
    }
  }

  // Limit number of points if maxPoints is set
  if (maxPoints && smoothed.length > maxPoints) {
    const step = smoothed.length / maxPoints;
    const limited: Point2D[] = [];
    for (let i = 0; i < maxPoints; i++) {
      const index = Math.floor(i * step);
      limited.push(smoothed[index]);
    }
    // Always include last point
    limited.push(smoothed[smoothed.length - 1]);
    return limited;
  }

  return smoothed;
}

// ===========================
// Bezier Curve Fitting
// ===========================

/**
 * Calculate a point on a quadratic Bezier curve
 *
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @param t - Parameter (0-1) along the curve
 * @returns Point on the curve
 */
function quadraticBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y,
  };
}

/**
 * Fit a quadratic Bezier curve through three points
 * Uses the middle point as a guide for the control point
 */
export function fitQuadraticBezier(points: Point2D[], steps: number = 10): Point2D[] {
  if (points.length < 3) return points;

  const result: Point2D[] = [points[0]];

  for (let i = 0; i < points.length - 2; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = i + 2 < points.length ? points[i + 2] : points[i + 1];

    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      result.push(quadraticBezierPoint(p0, p1, p2, t));
    }
  }

  return result;
}

// ===========================
// SVG Path Generation
// ===========================

/**
 * Convert smoothed points to SVG path string using Catmull-Rom
 *
 * @param points - Points to convert
 * @param tension - Spline tension (0-1)
 * @returns SVG path data string
 */
export function pointsToSVGPath(points: Point2D[], tension: number = 0.5): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const smoothed = smoothPath(points, { tension, reducePoints: true });
  const pathData = [`M ${smoothed[0].x} ${smoothed[0].y}`];

  for (let i = 1; i < smoothed.length; i++) {
    pathData.push(`L ${smoothed[i].x} ${smoothed[i].y}`);
  }

  return pathData.join(' ');
}

/**
 * Convert points to smooth SVG path using quadratic Bezier curves
 *
 * @param points - Points to convert
 * @returns SVG path data string
 */
export function pointsToSmoothSVGPath(points: Point2D[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const pathData = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // Calculate control point as midpoint
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;

    pathData.push(`Q ${p0.x} ${p0.y} ${cx} ${cy}`);
  }

  // Add final point
  const lastPoint = points[points.length - 1];
  pathData.push(`L ${lastPoint.x} ${lastPoint.y}`);

  return pathData.join(' ');
}

// ===========================
// Douglas-Peucker Algorithm
// ===========================

/**
 * Perpendicular distance from a point to a line segment
 */
function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Line segment length squared
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distance(point, lineStart);
  }

  // Calculate the t parameter
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared
    )
  );

  // Project point onto line
  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;

  return distance(point, { x: projectionX, y: projectionY });
}

/**
 * Simplify a path using the Douglas-Peucker algorithm
 * Reduces the number of points while preserving the overall shape
 *
 * @param points - Points to simplify
 * @param epsilon - Maximum distance threshold
 * @returns Simplified points
 */
export function douglasPeucker(points: Point2D[], epsilon: number = 1): Point2D[] {
  if (points.length < 3) return points;

  // Find the point with maximum distance from the line segment
  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDistance) {
      maxDistance = dist;
      index = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);

    // Combine results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  }

  // If max distance is less than epsilon, simplify to just endpoints
  return [points[0], points[points.length - 1]];
}

// ===========================
// Export Default Smoothing Function
// ===========================

/**
 * Default export: smooth a path with sensible defaults
 */
export default smoothPath;
