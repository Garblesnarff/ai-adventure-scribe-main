/**
 * ShapeDrawing Component
 *
 * Handles shape drawing on the battle map (rectangles, circles, polygons, lines).
 *
 * Features:
 * - Rectangle: click start, drag to size
 * - Circle: click center, drag to radius
 * - Polygon: click points, double-click to close
 * - Line: click start, drag to end
 * - Filled or outline mode
 * - Shift key to constrain proportions (square/circle)
 *
 * @module components/battle-map/ShapeDrawing
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Point2D } from '@/types/scene';
import type { StrokeConfig, FillConfig, DrawingType } from '@/types/drawing';
import logger from '@/lib/logger';

// ===========================
// Types
// ===========================

export interface ShapeDrawingProps {
  /** Type of shape to draw */
  shapeType: 'rectangle' | 'circle' | 'polygon' | 'line';
  /** Stroke configuration */
  stroke: StrokeConfig;
  /** Fill configuration */
  fill: FillConfig;
  /** Callback when drawing starts */
  onStart?: (point: Point2D) => void;
  /** Callback when drawing updates */
  onUpdate?: (data: ShapeData) => void;
  /** Callback when drawing completes */
  onComplete?: (data: ShapeData) => void;
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

export interface ShapeData {
  type: 'rectangle' | 'circle' | 'polygon' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: Point2D[];
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

/**
 * Calculate distance between two points
 */
function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Constrain a rectangle to a square
 */
function constrainToSquare(start: Point2D, end: Point2D): Point2D {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));

  return {
    x: start.x + (dx >= 0 ? size : -size),
    y: start.y + (dy >= 0 ? size : -size),
  };
}

// ===========================
// Component
// ===========================

export function ShapeDrawing({
  shapeType,
  stroke,
  fill,
  onStart,
  onUpdate,
  onComplete,
  onCancel,
  width,
  height,
  enabled = true,
  gridSize = 0,
  snapToGrid: shouldSnapToGrid = false,
}: ShapeDrawingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point2D | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point2D[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const lastClickTimeRef = useRef<number>(0);

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

      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;
      lastClickTimeRef.current = now;

      // Polygon mode: double-click to complete
      if (shapeType === 'polygon') {
        // Double-click detection (< 300ms)
        if (timeSinceLastClick < 300 && polygonPoints.length >= 2) {
          // Complete the polygon
          const shapeData: ShapeData = {
            type: 'polygon',
            x: polygonPoints[0].x,
            y: polygonPoints[0].y,
            points: polygonPoints,
          };

          if (onComplete) {
            onComplete(shapeData);
          }

          setPolygonPoints([]);
          setIsDrawing(false);
          logger.debug('Polygon drawing completed', { points: polygonPoints.length });
          return;
        }

        // Add point to polygon
        setPolygonPoints((prev) => [...prev, finalPoint]);
        setIsDrawing(true);

        if (polygonPoints.length === 0 && onStart) {
          onStart(finalPoint);
        }

        logger.debug('Polygon point added', { point: finalPoint, total: polygonPoints.length + 1 });
        return;
      }

      // For other shapes: start drawing
      setStartPoint(finalPoint);
      setCurrentPoint(finalPoint);
      setIsDrawing(true);

      if (onStart) {
        onStart(finalPoint);
      }

      logger.debug('Shape drawing started', { type: shapeType, point: finalPoint });
    },
    [enabled, shapeType, onStart, shouldSnapToGrid, gridSize, polygonPoints, onComplete]
  );

  const handleMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled || !svgRef.current) return;

      const point = getRelativePosition(event, svgRef.current);
      const finalPoint =
        shouldSnapToGrid && gridSize > 0 ? snapToGrid(point, gridSize) : point;

      // Polygon mode: just update cursor position for preview
      if (shapeType === 'polygon' && polygonPoints.length > 0) {
        setCurrentPoint(finalPoint);
        return;
      }

      // Other shapes: update during drag
      if (isDrawing && startPoint) {
        event.preventDefault();
        event.stopPropagation();

        const adjustedPoint = isShiftPressed ? constrainToSquare(startPoint, finalPoint) : finalPoint;
        setCurrentPoint(adjustedPoint);

        // Calculate shape data
        const shapeData = calculateShapeData(shapeType, startPoint, adjustedPoint);

        if (onUpdate && shapeData) {
          onUpdate(shapeData);
        }
      }
    },
    [enabled, isDrawing, startPoint, shapeType, isShiftPressed, onUpdate, shouldSnapToGrid, gridSize, polygonPoints]
  );

  const handleEnd = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Polygon mode: handled in handleStart
      if (shapeType === 'polygon') return;

      if (!isDrawing || !enabled || !startPoint || !currentPoint) return;

      event.preventDefault();
      event.stopPropagation();

      const adjustedPoint = isShiftPressed ? constrainToSquare(startPoint, currentPoint) : currentPoint;
      const shapeData = calculateShapeData(shapeType, startPoint, adjustedPoint);

      if (shapeData && onComplete) {
        onComplete(shapeData);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);

      logger.debug('Shape drawing completed', { type: shapeType, data: shapeData });
    },
    [isDrawing, enabled, startPoint, currentPoint, shapeType, isShiftPressed, onComplete]
  );

  // ===========================
  // Shape Calculation
  // ===========================

  const calculateShapeData = useCallback(
    (type: string, start: Point2D, end: Point2D): ShapeData | null => {
      switch (type) {
        case 'rectangle': {
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const width = Math.abs(end.x - start.x);
          const height = Math.abs(end.y - start.y);
          return { type: 'rectangle', x, y, width, height };
        }

        case 'circle': {
          const radius = distance(start, end);
          return { type: 'circle', x: start.x, y: start.y, radius };
        }

        case 'line': {
          return { type: 'line', x: start.x, y: start.y, points: [start, end] };
        }

        default:
          return null;
      }
    },
    []
  );

  // ===========================
  // Keyboard Handlers
  // ===========================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }

      if (event.key === 'Escape' && (isDrawing || polygonPoints.length > 0)) {
        event.preventDefault();
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setPolygonPoints([]);

        if (onCancel) {
          onCancel();
        }

        logger.debug('Shape drawing cancelled');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDrawing, polygonPoints, onCancel]);

  // ===========================
  // Mouse/Touch Event Listeners
  // ===========================

  useEffect(() => {
    if (!isDrawing || shapeType === 'polygon') return;

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
  }, [isDrawing, shapeType, handleMove, handleEnd]);

  // ===========================
  // Render Preview
  // ===========================

  const renderPreview = () => {
    if (!startPoint || !currentPoint) return null;

    const adjustedPoint = isShiftPressed ? constrainToSquare(startPoint, currentPoint) : currentPoint;

    switch (shapeType) {
      case 'rectangle': {
        const x = Math.min(startPoint.x, adjustedPoint.x);
        const y = Math.min(startPoint.y, adjustedPoint.y);
        const w = Math.abs(adjustedPoint.x - startPoint.x);
        const h = Math.abs(adjustedPoint.y - startPoint.y);

        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill={fill.type !== 'none' ? fill.color : 'none'}
            fillOpacity={fill.type !== 'none' ? fill.alpha : 0}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeOpacity={stroke.alpha}
          />
        );
      }

      case 'circle': {
        const radius = distance(startPoint, adjustedPoint);
        return (
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={radius}
            fill={fill.type !== 'none' ? fill.color : 'none'}
            fillOpacity={fill.type !== 'none' ? fill.alpha : 0}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeOpacity={stroke.alpha}
          />
        );
      }

      case 'line': {
        return (
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={adjustedPoint.x}
            y2={adjustedPoint.y}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeOpacity={stroke.alpha}
            strokeLinecap="round"
          />
        );
      }

      case 'polygon': {
        if (polygonPoints.length === 0) return null;

        const points = [...polygonPoints, currentPoint];
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
          <>
            {/* Polygon preview */}
            <path
              d={pathData}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeOpacity={stroke.alpha}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={stroke.width * 1.5}
                fill={stroke.color}
                fillOpacity={0.5}
              />
            ))}
          </>
        );
      }

      default:
        return null;
    }
  };

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
      onMouseMove={handleMove}
      onTouchStart={handleStart}
      style={{ touchAction: 'none' }}
    >
      {(isDrawing || polygonPoints.length > 0) && renderPreview()}

      {/* Hint text for polygon */}
      {shapeType === 'polygon' && polygonPoints.length > 0 && (
        <text
          x={10}
          y={30}
          fill={stroke.color}
          fontSize={14}
          fontFamily="sans-serif"
        >
          Double-click to complete polygon
        </text>
      )}

      {/* Shift key hint */}
      {(shapeType === 'rectangle' || shapeType === 'circle') && isShiftPressed && (
        <text
          x={10}
          y={30}
          fill={stroke.color}
          fontSize={14}
          fontFamily="sans-serif"
        >
          {shapeType === 'rectangle' ? 'Square mode' : 'Circle mode'}
        </text>
      )}
    </svg>
  );
}
