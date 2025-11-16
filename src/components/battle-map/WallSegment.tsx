/**
 * WallSegment Component
 *
 * Renders wall segments that block vision and/or movement on the battle map.
 * Walls are invisible to players by default (GM only).
 *
 * Wall types:
 * - Solid walls: Orange thick line
 * - Doors: Green line with door icon
 * - Windows: Blue dashed line
 * - Terrain: Brown dotted line
 *
 * @module components/battle-map/WallSegment
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Point2D, VisionBlocker, DoorState } from '@/types/scene';

// ===========================
// Types
// ===========================

export type WallType = 'solid' | 'door' | 'window' | 'terrain';

export interface WallSegmentProps {
  /** Wall data */
  wall: VisionBlocker;
  /** Wall type for visual styling */
  wallType?: WallType;
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Show walls to all users */
  showToAll?: boolean;
  /** Whether this wall is selected */
  isSelected?: boolean;
  /** Whether this wall is hovered */
  isHovered?: boolean;
  /** Click handler */
  onClick?: (wall: VisionBlocker, event: ThreeEvent<MouseEvent>) => void;
  /** Hover enter handler */
  onPointerEnter?: (wall: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
  /** Hover leave handler */
  onPointerLeave?: (wall: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
}

// ===========================
// Wall Styles
// ===========================

const WALL_STYLES = {
  solid: {
    color: '#f97316', // orange
    lineWidth: 4,
    dashed: false,
    dashSize: 0,
    gapSize: 0,
  },
  door: {
    color: '#22c55e', // green
    lineWidth: 3,
    dashed: false,
    dashSize: 0,
    gapSize: 0,
  },
  window: {
    color: '#3b82f6', // blue
    lineWidth: 3,
    dashed: true,
    dashSize: 10,
    gapSize: 5,
  },
  terrain: {
    color: '#92400e', // brown
    lineWidth: 2,
    dashed: true,
    dashSize: 5,
    gapSize: 3,
  },
} as const;

/**
 * WallSegment Component
 *
 * Renders a vision/movement blocking wall segment.
 * Walls are typically only visible to the GM unless showToAll is true.
 *
 * @example
 * ```tsx
 * <WallSegment
 *   wall={wallData}
 *   wallType="solid"
 *   isGM={true}
 *   onClick={(wall) => console.log('Wall clicked:', wall.id)}
 * />
 * ```
 */
export function WallSegment({
  wall,
  wallType = 'solid',
  isGM = false,
  showToAll = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: WallSegmentProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Determine if wall should be visible
  const isVisible = isGM || showToAll;

  // Get wall style
  const style = WALL_STYLES[wallType];

  // Convert points to THREE.js format
  const points = useMemo(() => {
    return wall.points.map((p) => new THREE.Vector3(p.x, p.y, 5));
  }, [wall.points]);

  // Calculate color based on state
  const lineColor = useMemo(() => {
    if (isSelected) return '#fbbf24'; // yellow when selected
    if (isHovered) return '#ffffff'; // white when hovered
    return style.color;
  }, [isSelected, isHovered, style.color]);

  // Calculate line width based on state
  const lineWidth = useMemo(() => {
    if (isSelected) return style.lineWidth + 2;
    if (isHovered) return style.lineWidth + 1;
    return style.lineWidth;
  }, [isSelected, isHovered, style.lineWidth]);

  // Handlers
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (onClick) {
        onClick(wall, event);
      }
    },
    [wall, onClick]
  );

  const handlePointerEnter = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (onPointerEnter) {
        onPointerEnter(wall, event);
      }
    },
    [wall, onPointerEnter]
  );

  const handlePointerLeave = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (onPointerLeave) {
        onPointerLeave(wall, event);
      }
    },
    [wall, onPointerLeave]
  );

  if (!isVisible || wall.points.length < 2) {
    return null;
  }

  return (
    <group ref={groupRef} name={`wall-${wall.id}`}>
      <Line
        points={points}
        color={lineColor}
        lineWidth={lineWidth}
        dashed={style.dashed}
        dashSize={style.dashSize}
        gapSize={style.gapSize}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Endpoint markers (for editing) */}
      {isGM && (isSelected || isHovered) && (
        <>
          {wall.points.map((point, index) => (
            <WallEndpoint
              key={`${wall.id}-endpoint-${index}`}
              position={point}
              index={index}
              isSelected={isSelected}
            />
          ))}
        </>
      )}
    </group>
  );
}

/**
 * WallEndpoint Component
 *
 * Renders a draggable endpoint for wall editing.
 */
interface WallEndpointProps {
  position: Point2D;
  index: number;
  isSelected: boolean;
}

function WallEndpoint({ position, index, isSelected }: WallEndpointProps) {
  const [isHovered, setIsHovered] = useState(false);

  const color = isHovered ? '#fbbf24' : isSelected ? '#ffffff' : '#94a3b8';
  const size = isHovered ? 8 : 6;

  return (
    <mesh
      position={[position.x, position.y, 6]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <circleGeometry args={[size, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

/**
 * WallGroup Component
 *
 * Renders multiple walls efficiently.
 *
 * @example
 * ```tsx
 * <WallGroup
 *   walls={allWalls}
 *   isGM={true}
 *   onWallClick={(wall) => selectWall(wall)}
 * />
 * ```
 */
export interface WallGroupProps {
  /** Array of walls to render */
  walls: VisionBlocker[];
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Show walls to all users */
  showToAll?: boolean;
  /** Selected wall ID */
  selectedWallId?: string | null;
  /** Hovered wall ID */
  hoveredWallId?: string | null;
  /** Click handler */
  onWallClick?: (wall: VisionBlocker, event: ThreeEvent<MouseEvent>) => void;
  /** Hover enter handler */
  onWallPointerEnter?: (wall: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
  /** Hover leave handler */
  onWallPointerLeave?: (wall: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
}

export function WallGroup({
  walls,
  isGM = false,
  showToAll = false,
  selectedWallId = null,
  hoveredWallId = null,
  onWallClick,
  onWallPointerEnter,
  onWallPointerLeave,
}: WallGroupProps) {
  // Determine wall type from wall properties
  const getWallType = (wall: VisionBlocker): WallType => {
    if (wall.doorState !== undefined) return 'door';
    if (!wall.blocksMovement && wall.blocksLight) return 'window';
    if (wall.terrainType) return 'terrain';
    return 'solid';
  };

  return (
    <group name="walls-layer">
      {walls.map((wall) => {
        const isSelected = selectedWallId === wall.id;
        const isHovered = hoveredWallId === wall.id;
        const wallType = getWallType(wall);

        return (
          <WallSegment
            key={wall.id}
            wall={wall}
            wallType={wallType}
            isGM={isGM}
            showToAll={showToAll}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onWallClick}
            onPointerEnter={onWallPointerEnter}
            onPointerLeave={onWallPointerLeave}
          />
        );
      })}
    </group>
  );
}

/**
 * WallPropertiesPanel Component
 *
 * UI panel for editing wall properties (rendered outside Canvas).
 */
export interface WallPropertiesPanelProps {
  wall: VisionBlocker;
  onUpdate: (updates: Partial<VisionBlocker>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function WallPropertiesPanel({
  wall,
  onUpdate,
  onDelete,
  onClose,
}: WallPropertiesPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-card p-4 rounded-lg border border-border shadow-lg w-64 z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Wall Properties</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Blocks Light */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={wall.blocksLight}
            onChange={(e) => onUpdate({ blocksLight: e.target.checked })}
            className="rounded"
          />
          <span>Blocks Vision/Light</span>
        </label>

        {/* Blocks Movement */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={wall.blocksMovement}
            onChange={(e) => onUpdate({ blocksMovement: e.target.checked })}
            className="rounded"
          />
          <span>Blocks Movement</span>
        </label>

        {/* Blocks Sound */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={wall.blocksSound ?? false}
            onChange={(e) => onUpdate({ blocksSound: e.target.checked })}
            className="rounded"
          />
          <span>Blocks Sound</span>
        </label>

        {/* Height */}
        <div>
          <label className="text-sm text-muted-foreground">Height (ft)</label>
          <input
            type="number"
            value={wall.height ?? 10}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) })}
            className="w-full mt-1 px-2 py-1 text-sm border border-border rounded"
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="w-full px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Delete Wall
        </button>
      </div>
    </div>
  );
}
