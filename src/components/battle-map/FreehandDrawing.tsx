/**
 * FreehandDrawing Component
 *
 * Handles freehand drawing on the battle map with smooth curve rendering.
 * Uses Catmull-Rom spline for smooth, natural-looking lines.
 *
 * Features:
 * - Click and drag to draw
 * - Smooth line rendering using Catmull-Rom spline
 * - Stroke width and color control
 * - Real-time preview
 * - Auto-save on release
 *
 * @module components/battle-map/FreehandDrawing
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { smoothPath, pointsToSVGPath } from '@/utils/drawing-smoothing';
import type { Point2D } from '@/types/scene';
import type { StrokeConfig } from '@/types/drawing';
import logger from '@/lib/logger';

// ===========================
// Types
// ===========================

export interface FreehandDrawingProps {
  /** Stroke configuration */
  stroke: StrokeConfig;
  /** Callback when drawing starts */
  onStart?: (point: Point2D) => void;
  /** Callback when drawing updates */
  onUpdate?: (points: Point2D[]) => void;
  /** Callback when drawing completes */
  onComplete?: (points: Point2D[]) => void;
  /** Callback when drawing is cancelled */
  onCancel?: () => void;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Enable drawing */
  enabled?: boolean;
  /** Grid size for snapping (optional) */
  gridSize?: number;
  /** Enable grid snapping */
  snapToGrid?: boolean;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Snap a point to grid
 */
function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Get mouse/touch position relative to SVG element
 */
function getRelativePosition(
  event: React.MouseEvent | React.TouchEvent,
  svgElement: SVGSVGElement
): Point2D {
  const rect = svgElement.getBoundingClientRect();

  let clientX: number;
  let clientY: number;

  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

// ===========================
// Component
// ===========================

export function FreehandDrawing({
  stroke,
  onStart,
  onUpdate,
  onComplete,
  onCancel,
  width,
  height,
  enabled = true,
  gridSize = 0,
  snapToGrid: shouldSnapToGrid = false,
}: FreehandDrawingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [smoothedPath, setSmoothedPath] = useState<string>('');
  const lastPointRef = useRef<Point2D | null>(null);

  // ===========================
  // Drawing Handlers
  // ===========================

  const handleStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled || !svgRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const point = getRelativePosition(event, svgRef.current);
      const finalPoint =
        shouldSnapToGrid && gridSize > 0 ? snapToGrid(point, gridSize) : point;

      setIsDrawing(true);
      setPoints([finalPoint]);
      lastPointRef.current = finalPoint;

      if (onStart) {
        onStart(finalPoint);
      }

      logger.debug('Freehand drawing started', { point: finalPoint });
    },
    [enabled, onStart, shouldSnapToGrid, gridSize]
  );

  const handleMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !enabled || !svgRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const point = getRelativePosition(event, svgRef.current);
      const finalPoint =
        shouldSnapToGrid && gridSize > 0 ? snapToGrid(point, gridSize) : point;

      // Only add point if it's different from the last point
      // This prevents duplicate points and improves performance
      if (
        lastPointRef.current &&
        Math.abs(finalPoint.x - lastPointRef.current.x) < 2 &&
        Math.abs(finalPoint.y - lastPointRef.current.y) < 2
      ) {
        return;
      }

      setPoints((prev) => {
        const newPoints = [...prev, finalPoint];

        // Update smoothed path for preview
        if (newPoints.length > 1) {
          const path = pointsToSVGPath(newPoints, 0.5);
          setSmoothedPath(path);
        }

        if (onUpdate) {
          onUpdate(newPoints);
        }

        return newPoints;
      });

      lastPointRef.current = finalPoint;
    },
    [isDrawing, enabled, onUpdate, shouldSnapToGrid, gridSize]
  );

  const handleEnd = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !enabled) return;

      event.preventDefault();
      event.stopPropagation();

      setIsDrawing(false);

      if (points.length > 1) {
        // Smooth the final path
        const smoothedPoints = smoothPath(points, {
          tension: 0.5,
          minDistance: 2,
          reducePoints: true,
        });

        if (onComplete) {
          onComplete(smoothedPoints);
        }

        logger.debug('Freehand drawing completed', {
          originalPoints: points.length,
          smoothedPoints: smoothedPoints.length,
        });
      } else {
        // If only one point, cancel the drawing
        if (onCancel) {
          onCancel();
        }
      }

      // Reset state
      setPoints([]);
      setSmoothedPath('');
      lastPointRef.current = null;
    },
    [isDrawing, enabled, points, onComplete, onCancel]
  );

  // ===========================
  // Keyboard Handlers
  // ===========================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawing) {
        event.preventDefault();
        setIsDrawing(false);
        setPoints([]);
        setSmoothedPath('');
        lastPointRef.current = null;

        if (onCancel) {
          onCancel();
        }

        logger.debug('Freehand drawing cancelled');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, onCancel]);

  // ===========================
  // Mouse/Touch Event Listeners
  // ===========================

  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMove = (event: MouseEvent | TouchEvent) => {
      if (!svgRef.current) return;

      const syntheticEvent = event as any;
      handleMove(syntheticEvent);
    };

    const handleGlobalEnd = (event: MouseEvent | TouchEvent) => {
      const syntheticEvent = event as any;
      handleEnd(syntheticEvent);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDrawing, handleMove, handleEnd]);

  // ===========================
  // Render
  // ===========================

  if (!enabled) return null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-auto cursor-crosshair"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      style={{ touchAction: 'none' }}
    >
      {/* Drawing preview */}
      {isDrawing && points.length > 0 && (
        <>
          {/* Raw points (debugging - can be removed) */}
          {points.length === 1 && (
            <circle
              cx={points[0].x}
              cy={points[0].y}
              r={stroke.width / 2}
              fill={stroke.color}
              opacity={stroke.alpha}
            />
          )}

          {/* Smoothed path */}
          {points.length > 1 && smoothedPath && (
            <path
              d={smoothedPath}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeOpacity={stroke.alpha}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: stroke.style === 'dashed' ? '5 5' : undefined,
              }}
            />
          )}
        </>
      )}

      {/* Cursor indicator when hovering */}
      {!isDrawing && enabled && (
        <style>
          {`
            .freehand-cursor {
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.2s;
            }
            svg:hover .freehand-cursor {
              opacity: 0.5;
            }
          `}
        </style>
      )}
    </svg>
  );
}

/**
 * FreehandDrawingPreview - Display a completed freehand drawing
 */
export interface FreehandDrawingPreviewProps {
  points: Point2D[];
  stroke: StrokeConfig;
  className?: string;
}

export function FreehandDrawingPreview({
  points,
  stroke,
  className,
}: FreehandDrawingPreviewProps) {
  const pathData = pointsToSVGPath(points, 0.5);

  if (!pathData || points.length < 2) return null;

  return (
    <path
      d={pathData}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeOpacity={stroke.alpha}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        strokeDasharray:
          stroke.style === 'dashed'
            ? `${stroke.dashLength || 5} ${stroke.gapLength || 5}`
            : undefined,
      }}
    />
  );
}
