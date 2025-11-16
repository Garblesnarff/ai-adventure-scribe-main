/**
 * WallDrawingTool Component
 *
 * Interactive tool for GMs to draw walls on the battle map.
 *
 * Features:
 * - Click to add points
 * - Double-click to finish
 * - ESC to cancel
 * - Snap to grid option
 * - Edit existing walls (drag endpoints)
 * - Delete walls
 *
 * @module components/battle-map/WallDrawingTool
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import type { Point2D, VisionBlocker } from '@/types/scene';
import { snapToGrid } from '@/utils/grid-snapping';
import { GridType } from '@/types/scene';

// ===========================
// Types
// ===========================

export interface WallDrawingToolProps {
  /** Whether the tool is active */
  active: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Grid type for snapping */
  gridType?: GridType;
  /** Whether to snap to grid */
  snapToGridEnabled?: boolean;
  /** Default wall properties */
  defaultWallProperties?: Partial<VisionBlocker>;
  /** Callback when wall is created */
  onWallCreated?: (wall: Omit<VisionBlocker, 'id'>) => void;
  /** Callback when tool is cancelled */
  onCancel?: () => void;
}

/**
 * WallDrawingTool Component
 *
 * Allows GM to draw walls by clicking points on the map.
 * Shows preview line as mouse moves.
 *
 * @example
 * ```tsx
 * <WallDrawingTool
 *   active={isDrawingWall}
 *   gridSize={100}
 *   snapToGridEnabled={true}
 *   onWallCreated={(wall) => saveWall(wall)}
 *   onCancel={() => setIsDrawingWall(false)}
 * />
 * ```
 */
export function WallDrawingTool({
  active,
  gridSize,
  gridType = GridType.SQUARE,
  snapToGridEnabled = true,
  defaultWallProperties = {},
  onWallCreated,
  onCancel,
}: WallDrawingToolProps) {
  const { camera } = useThree();
  const [points, setPoints] = useState<Point2D[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reset when tool becomes inactive
  useEffect(() => {
    if (!active) {
      setPoints([]);
      setPreviewPoint(null);
      setIsDrawing(false);
    }
  }, [active]);

  // Handle keyboard events
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel drawing
        setPoints([]);
        setPreviewPoint(null);
        setIsDrawing(false);
        if (onCancel) {
          onCancel();
        }
      } else if (e.key === 'Enter' && points.length >= 2) {
        // Finish drawing
        finishWall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, points, onCancel]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle mouse move to update preview point
   */
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!active) return;

      event.stopPropagation();

      const point = { x: event.point.x, y: event.point.y };

      // Snap to grid if enabled
      const finalPoint = snapToGridEnabled
        ? snapToGrid(point.x, point.y, gridSize, gridType)
        : point;

      setPreviewPoint(finalPoint);
    },
    [active, gridSize, gridType, snapToGridEnabled]
  );

  /**
   * Handle click to add point
   */
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!active) return;

      event.stopPropagation();

      const point = { x: event.point.x, y: event.point.y };

      // Snap to grid if enabled
      const finalPoint = snapToGridEnabled
        ? snapToGrid(point.x, point.y, gridSize, gridType)
        : point;

      setPoints((prev) => [...prev, finalPoint]);
      setIsDrawing(true);
    },
    [active, gridSize, gridType, snapToGridEnabled]
  );

  /**
   * Handle double click to finish wall
   */
  const handleDoubleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!active || points.length < 1) return;

      event.stopPropagation();
      finishWall();
    },
    [active, points.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Finish wall creation
   */
  const finishWall = useCallback(() => {
    if (points.length < 2) {
      console.warn('Wall must have at least 2 points');
      return;
    }

    const newWall: Omit<VisionBlocker, 'id'> = {
      points,
      blocksLight: true,
      blocksMovement: true,
      ...defaultWallProperties,
    };

    if (onWallCreated) {
      onWallCreated(newWall);
    }

    // Reset state
    setPoints([]);
    setPreviewPoint(null);
    setIsDrawing(false);
  }, [points, defaultWallProperties, onWallCreated]);

  if (!active) {
    return null;
  }

  // Convert points to THREE.js vectors
  const linePoints = points.map((p) => new THREE.Vector3(p.x, p.y, 7));

  // Add preview point if available
  if (previewPoint && points.length > 0) {
    linePoints.push(new THREE.Vector3(previewPoint.x, previewPoint.y, 7));
  }

  return (
    <group name="wall-drawing-tool">
      {/* Invisible plane to capture mouse events */}
      <mesh
        position={[0, 0, 0]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Preview line */}
      {linePoints.length > 0 && (
        <Line
          points={linePoints}
          color="#fbbf24"
          lineWidth={3}
          dashed
          dashSize={10}
          gapSize={5}
        />
      )}

      {/* Point markers */}
      {points.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, 8]}>
          <circleGeometry args={[6, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      ))}

      {/* Preview point marker */}
      {previewPoint && (
        <mesh position={[previewPoint.x, previewPoint.y, 8]}>
          <ringGeometry args={[4, 6, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Instructions overlay */}
      {points.length === 0 && (
        <Html position={[0, 0, 0]} center>
          <div className="px-3 py-2 bg-background/90 text-foreground text-sm rounded border border-border">
            Click to place wall points • Double-click or Enter to finish • ESC to cancel
          </div>
        </Html>
      )}

      {points.length > 0 && (
        <Html position={[points[points.length - 1].x, points[points.length - 1].y - 20, 0]} center>
          <div className="px-2 py-1 bg-background/90 text-foreground text-xs rounded border border-border">
            {points.length} point{points.length !== 1 ? 's' : ''} •{' '}
            {points.length >= 2 ? 'Double-click to finish' : 'Add more points'}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * WallEditTool Component
 *
 * Allows editing existing walls by dragging endpoints.
 */
export interface WallEditToolProps {
  /** Wall being edited */
  wall: VisionBlocker;
  /** Grid size for snapping */
  gridSize: number;
  /** Grid type */
  gridType?: GridType;
  /** Snap to grid */
  snapToGridEnabled?: boolean;
  /** Callback when wall is updated */
  onWallUpdated?: (wall: VisionBlocker) => void;
  /** Callback when editing is finished */
  onFinish?: () => void;
}

export function WallEditTool({
  wall,
  gridSize,
  gridType = GridType.SQUARE,
  snapToGridEnabled = true,
  onWallUpdated,
  onFinish,
}: WallEditToolProps) {
  const [editedPoints, setEditedPoints] = useState<Point2D[]>(wall.points);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Handle endpoint drag
  const handleEndpointDrag = useCallback(
    (index: number, event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();

      const point = { x: event.point.x, y: event.point.y };

      // Snap to grid if enabled
      const finalPoint = snapToGridEnabled
        ? snapToGrid(point.x, point.y, gridSize, gridType)
        : point;

      setEditedPoints((prev) => {
        const updated = [...prev];
        updated[index] = finalPoint;
        return updated;
      });
    },
    [gridSize, gridType, snapToGridEnabled]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);

    if (onWallUpdated) {
      onWallUpdated({
        ...wall,
        points: editedPoints,
      });
    }
  }, [wall, editedPoints, onWallUpdated]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (onFinish) {
          onFinish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFinish]);

  const linePoints = editedPoints.map((p) => new THREE.Vector3(p.x, p.y, 7));

  return (
    <group name="wall-edit-tool">
      {/* Wall preview */}
      <Line points={linePoints} color="#fbbf24" lineWidth={4} />

      {/* Draggable endpoints */}
      {editedPoints.map((point, index) => (
        <mesh
          key={index}
          position={[point.x, point.y, 8]}
          onPointerDown={() => setDraggingIndex(index)}
          onPointerMove={
            draggingIndex === index
              ? (e) => handleEndpointDrag(index, e)
              : undefined
          }
          onPointerUp={handleDragEnd}
        >
          <circleGeometry args={[8, 16]} />
          <meshBasicMaterial
            color={draggingIndex === index ? '#ffffff' : '#fbbf24'}
          />
        </mesh>
      ))}

      {/* Instructions */}
      <Html position={[editedPoints[0].x, editedPoints[0].y - 20, 0]} center>
        <div className="px-2 py-1 bg-background/90 text-foreground text-xs rounded border border-border">
          Drag endpoints to edit • Enter or ESC to finish
        </div>
      </Html>
    </group>
  );
}

/**
 * WallToolbar Component
 *
 * UI toolbar for wall drawing controls (rendered outside Canvas).
 */
export interface WallToolbarProps {
  isDrawing: boolean;
  snapToGrid: boolean;
  onToggleDrawing: () => void;
  onToggleSnap: () => void;
  onClear: () => void;
  wallType: 'solid' | 'door' | 'window' | 'terrain';
  onWallTypeChange: (type: 'solid' | 'door' | 'window' | 'terrain') => void;
}

export function WallToolbar({
  isDrawing,
  snapToGrid,
  onToggleDrawing,
  onToggleSnap,
  onClear,
  wallType,
  onWallTypeChange,
}: WallToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card p-3 rounded-lg border border-border shadow-lg z-10">
      <div className="flex items-center gap-3">
        {/* Draw Wall Button */}
        <button
          onClick={onToggleDrawing}
          className={`px-3 py-2 text-sm rounded ${
            isDrawing
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {isDrawing ? 'Stop Drawing' : 'Draw Wall'}
        </button>

        {/* Wall Type Selector */}
        <div className="flex gap-1 border-l border-border pl-3">
          <button
            onClick={() => onWallTypeChange('solid')}
            className={`px-2 py-1 text-xs rounded ${
              wallType === 'solid'
                ? 'bg-orange-500 text-white'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
            title="Solid Wall"
          >
            Wall
          </button>
          <button
            onClick={() => onWallTypeChange('door')}
            className={`px-2 py-1 text-xs rounded ${
              wallType === 'door'
                ? 'bg-green-500 text-white'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
            title="Door"
          >
            Door
          </button>
          <button
            onClick={() => onWallTypeChange('window')}
            className={`px-2 py-1 text-xs rounded ${
              wallType === 'window'
                ? 'bg-blue-500 text-white'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
            title="Window"
          >
            Window
          </button>
          <button
            onClick={() => onWallTypeChange('terrain')}
            className={`px-2 py-1 text-xs rounded ${
              wallType === 'terrain'
                ? 'bg-amber-700 text-white'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
            title="Terrain"
          >
            Terrain
          </button>
        </div>

        {/* Snap to Grid Toggle */}
        <label className="flex items-center gap-2 text-sm border-l border-border pl-3">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => onToggleSnap()}
            className="rounded"
          />
          <span>Snap to Grid</span>
        </label>

        {/* Clear Button */}
        <button
          onClick={onClear}
          className="px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
