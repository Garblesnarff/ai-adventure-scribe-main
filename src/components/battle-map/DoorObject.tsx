/**
 * DoorObject Component
 *
 * Renders interactive doors on the battle map.
 * Doors can be opened, closed, or locked, and affect vision/movement accordingly.
 *
 * Door states:
 * - Open: Dashed green line, allows vision and movement
 * - Closed: Solid green line, blocks vision and movement
 * - Locked: Solid red line with lock icon, blocks everything
 *
 * @module components/battle-map/DoorObject
 */

import React, { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import type { Point2D, VisionBlocker, DoorState } from '@/types/scene';
import { Lock, Unlock, DoorOpen } from 'lucide-react';

// ===========================
// Types
// ===========================

export interface DoorObjectProps {
  /** Vision blocker data representing the door */
  door: VisionBlocker;
  /** Current door state */
  doorState: DoorState;
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Whether the current user can interact */
  canInteract?: boolean;
  /** Whether this door is selected */
  isSelected?: boolean;
  /** Whether this door is hovered */
  isHovered?: boolean;
  /** Click handler to toggle door */
  onClick?: (door: VisionBlocker, event: ThreeEvent<MouseEvent>) => void;
  /** Hover enter handler */
  onPointerEnter?: (door: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
  /** Hover leave handler */
  onPointerLeave?: (door: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
}

// ===========================
// Door Styles
// ===========================

const DOOR_STYLES = {
  open: {
    color: '#22c55e', // green
    lineWidth: 2,
    dashed: true,
    dashSize: 8,
    gapSize: 4,
    opacity: 0.6,
  },
  closed: {
    color: '#22c55e', // green
    lineWidth: 4,
    dashed: false,
    dashSize: 0,
    gapSize: 0,
    opacity: 1,
  },
  locked: {
    color: '#ef4444', // red
    lineWidth: 4,
    dashed: false,
    dashSize: 0,
    gapSize: 0,
    opacity: 1,
  },
} as const;

/**
 * DoorObject Component
 *
 * Renders an interactive door that can be clicked to toggle state.
 * Visual appearance changes based on door state.
 *
 * @example
 * ```tsx
 * <DoorObject
 *   door={doorData}
 *   doorState="closed"
 *   isGM={true}
 *   onClick={(door) => toggleDoor(door)}
 * />
 * ```
 */
export function DoorObject({
  door,
  doorState,
  isGM = false,
  canInteract = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: DoorObjectProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Get door style based on state
  const style = DOOR_STYLES[doorState];

  // Calculate door center point for icon
  const centerPoint = useMemo<Point2D>(() => {
    if (door.points.length === 0) return { x: 0, y: 0 };

    const sumX = door.points.reduce((sum, p) => sum + p.x, 0);
    const sumY = door.points.reduce((sum, p) => sum + p.y, 0);

    return {
      x: sumX / door.points.length,
      y: sumY / door.points.length,
    };
  }, [door.points]);

  // Convert points to THREE.js format
  const points = useMemo(() => {
    return door.points.map((p) => new THREE.Vector3(p.x, p.y, 5));
  }, [door.points]);

  // Calculate color based on state and interaction
  const lineColor = useMemo(() => {
    if (isSelected) return '#fbbf24'; // yellow when selected
    if (isHovered && canInteract) return '#ffffff'; // white when hovered
    return style.color;
  }, [isSelected, isHovered, canInteract, style.color]);

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
      if (onClick && (canInteract || isGM)) {
        onClick(door, event);
      }
    },
    [door, onClick, canInteract, isGM]
  );

  const handlePointerEnter = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (onPointerEnter) {
        onPointerEnter(door, event);
      }
    },
    [door, onPointerEnter]
  );

  const handlePointerLeave = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (onPointerLeave) {
        onPointerLeave(door, event);
      }
    },
    [door, onPointerLeave]
  );

  if (door.points.length < 2) {
    return null;
  }

  return (
    <group ref={groupRef} name={`door-${door.id}`}>
      {/* Door line */}
      <Line
        points={points}
        color={lineColor}
        lineWidth={lineWidth}
        dashed={style.dashed}
        dashSize={style.dashSize}
        gapSize={style.gapSize}
        opacity={style.opacity}
        transparent
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Door icon */}
      {(isGM || canInteract) && (
        <mesh position={[centerPoint.x, centerPoint.y, 6]}>
          <circleGeometry args={[12, 16]} />
          <meshBasicMaterial
            color={lineColor}
            transparent
            opacity={isHovered ? 0.9 : 0.7}
          />
          <Html
            center
            distanceFactor={1}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div className="flex items-center justify-center w-6 h-6">
              {doorState === 'locked' && <Lock className="w-4 h-4 text-white" />}
              {doorState === 'closed' && <Unlock className="w-4 h-4 text-white" />}
              {doorState === 'open' && <DoorOpen className="w-4 h-4 text-white" />}
            </div>
          </Html>
        </mesh>
      )}

      {/* Interaction hint */}
      {isHovered && (canInteract || isGM) && (
        <Html
          position={[centerPoint.x, centerPoint.y - 20, 6]}
          center
          distanceFactor={1}
        >
          <div className="px-2 py-1 bg-background/90 text-foreground text-xs rounded border border-border whitespace-nowrap">
            {doorState === 'open' && 'Click to close'}
            {doorState === 'closed' && 'Click to open'}
            {doorState === 'locked' && (isGM ? 'Click to unlock' : 'Locked')}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * DoorGroup Component
 *
 * Renders multiple doors efficiently.
 *
 * @example
 * ```tsx
 * <DoorGroup
 *   doors={allDoors}
 *   isGM={true}
 *   onDoorClick={(door) => toggleDoor(door)}
 * />
 * ```
 */
export interface DoorGroupProps {
  /** Array of doors to render */
  doors: VisionBlocker[];
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Whether players can interact with doors */
  playersCanInteract?: boolean;
  /** Selected door ID */
  selectedDoorId?: string | null;
  /** Hovered door ID */
  hoveredDoorId?: string | null;
  /** Click handler */
  onDoorClick?: (door: VisionBlocker, event: ThreeEvent<MouseEvent>) => void;
  /** Hover enter handler */
  onDoorPointerEnter?: (door: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
  /** Hover leave handler */
  onDoorPointerLeave?: (door: VisionBlocker, event: ThreeEvent<PointerEvent>) => void;
}

export function DoorGroup({
  doors,
  isGM = false,
  playersCanInteract = true,
  selectedDoorId = null,
  hoveredDoorId = null,
  onDoorClick,
  onDoorPointerEnter,
  onDoorPointerLeave,
}: DoorGroupProps) {
  return (
    <group name="doors-layer">
      {doors.map((door) => {
        const isSelected = selectedDoorId === door.id;
        const isHovered = hoveredDoorId === door.id;
        const doorState = door.doorState || 'closed';

        return (
          <DoorObject
            key={door.id}
            door={door}
            doorState={doorState}
            isGM={isGM}
            canInteract={playersCanInteract}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onDoorClick}
            onPointerEnter={onDoorPointerEnter}
            onPointerLeave={onDoorPointerLeave}
          />
        );
      })}
    </group>
  );
}

/**
 * DoorControlPanel Component
 *
 * UI panel for controlling door properties (rendered outside Canvas).
 */
export interface DoorControlPanelProps {
  door: VisionBlocker;
  doorState: DoorState;
  onStateChange: (newState: DoorState) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DoorControlPanel({
  door,
  doorState,
  onStateChange,
  onDelete,
  onClose,
}: DoorControlPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-card p-4 rounded-lg border border-border shadow-lg w-64 z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Door Controls</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Door State Buttons */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Door State</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onStateChange('open')}
              className={`px-2 py-1 text-xs rounded border ${
                doorState === 'open'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => onStateChange('closed')}
              className={`px-2 py-1 text-xs rounded border ${
                doorState === 'closed'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => onStateChange('locked')}
              className={`px-2 py-1 text-xs rounded border ${
                doorState === 'locked'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              Locked
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Quick Actions</label>
          <button
            onClick={() =>
              onStateChange(doorState === 'open' ? 'closed' : 'open')
            }
            className="w-full px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            {doorState === 'open' ? 'Close Door' : 'Open Door'}
          </button>
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="w-full px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Delete Door
        </button>
      </div>
    </div>
  );
}

/**
 * Helper function to update door state in vision blocker
 */
export function updateDoorState(
  door: VisionBlocker,
  newState: DoorState
): VisionBlocker {
  return {
    ...door,
    doorState: newState,
    // Update blocking properties based on state
    blocksLight: newState !== 'open',
    blocksMovement: newState !== 'open',
  };
}

/**
 * Helper function to toggle door between open and closed
 */
export function toggleDoor(door: VisionBlocker): VisionBlocker {
  const currentState = door.doorState || 'closed';

  if (currentState === 'locked') {
    // Can't toggle locked doors (must unlock first)
    return door;
  }

  const newState = currentState === 'open' ? 'closed' : 'open';
  return updateDoorState(door, newState);
}
