/**
 * Measurement Tool Component
 *
 * Provides a ruler tool for measuring distances on the battle map.
 * Features:
 * - Click to start measuring
 * - Click to add waypoints
 * - Double-click or ESC to end measurement
 * - Shows distance in feet
 * - Supports diagonal movement (5-10-5 pattern)
 * - Shows total distance and segment distances
 * - Line visualization with arrows
 * - Color-coded by movement range (green/yellow/red)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Point2D } from '@/types/scene';
import {
  calculateMeasurementPath,
  getMovementRangeColor,
  snapToGridCenter,
  MeasurementPath,
} from '@/utils/template-calculations';
import { Html } from '@react-three/drei';

// ===========================
// Types
// ===========================

export interface MeasurementToolProps {
  /** Grid size in pixels */
  gridSize: number;
  /** Whether the tool is active */
  active: boolean;
  /** Movement speed in feet (for color coding) */
  movementSpeed?: number;
  /** Whether to snap to grid */
  snapToGrid?: boolean;
  /** Callback when measurement is complete */
  onMeasurementComplete?: (path: MeasurementPath) => void;
  /** Callback when measurement is cancelled */
  onMeasurementCancel?: () => void;
}

// ===========================
// Component
// ===========================

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  gridSize,
  active,
  movementSpeed = 30,
  snapToGrid = true,
  onMeasurementComplete,
  onMeasurementCancel,
}) => {
  const { camera, raycaster, scene } = useThree();
  const [waypoints, setWaypoints] = useState<Point2D[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Calculate measurement path
  const measurementPath = useMemo(() => {
    if (waypoints.length < 2 && !currentPoint) return null;

    const points = currentPoint ? [...waypoints, currentPoint] : waypoints;
    return calculateMeasurementPath(points, gridSize, true);
  }, [waypoints, currentPoint, gridSize]);

  // Handle mouse move to show preview
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!active || !isActive) return;

      // Get mouse position in world coordinates
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to the ground plane
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersection);

      if (intersection) {
        let point = { x: intersection.x, y: intersection.y };

        if (snapToGrid) {
          point = snapToGridCenter(point, gridSize);
        }

        setCurrentPoint(point);
      }
    },
    [active, isActive, camera, raycaster, snapToGrid, gridSize]
  );

  // Handle click to add waypoint
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!active || !currentPoint) return;

      // Check for double click
      if (event.detail === 2) {
        // Double click - complete measurement
        if (waypoints.length > 0) {
          const finalPath = calculateMeasurementPath(
            [...waypoints, currentPoint],
            gridSize,
            true
          );
          onMeasurementComplete?.(finalPath);
        }
        setWaypoints([]);
        setCurrentPoint(null);
        setIsActive(false);
        return;
      }

      // Single click - add waypoint
      if (!isActive) {
        setIsActive(true);
      }
      setWaypoints((prev) => [...prev, currentPoint]);
    },
    [active, currentPoint, waypoints, gridSize, isActive, onMeasurementComplete]
  );

  // Handle ESC key to cancel
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active) return;

      if (event.key === 'Escape') {
        if (waypoints.length > 0) {
          const finalPath = calculateMeasurementPath(waypoints, gridSize, true);
          onMeasurementComplete?.(finalPath);
        } else {
          onMeasurementCancel?.();
        }
        setWaypoints([]);
        setCurrentPoint(null);
        setIsActive(false);
      }
    },
    [active, waypoints, gridSize, onMeasurementComplete, onMeasurementCancel]
  );

  // Setup event listeners
  useEffect(() => {
    if (!active) {
      setWaypoints([]);
      setCurrentPoint(null);
      setIsActive(false);
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, handlePointerMove, handlePointerDown, handleKeyDown]);

  if (!active || !measurementPath) return null;

  return (
    <group name="measurement-tool">
      {/* Render measurement lines */}
      {measurementPath.segments.map((segment, index) => (
        <MeasurementSegment
          key={index}
          from={segment.from}
          to={segment.to}
          distance={segment.distance}
          totalDistance={measurementPath.totalDistance}
          movementSpeed={movementSpeed}
          showLabel={index === measurementPath.segments.length - 1}
        />
      ))}

      {/* Render waypoint markers */}
      {measurementPath.waypoints.map((point, index) => (
        <WaypointMarker key={index} point={point} index={index} />
      ))}
    </group>
  );
};

// ===========================
// Sub-Components
// ===========================

interface MeasurementSegmentProps {
  from: Point2D;
  to: Point2D;
  distance: number;
  totalDistance: number;
  movementSpeed: number;
  showLabel: boolean;
}

const MeasurementSegment: React.FC<MeasurementSegmentProps> = ({
  from,
  to,
  distance,
  totalDistance,
  movementSpeed,
  showLabel,
}) => {
  const color = getMovementRangeColor(totalDistance, movementSpeed);

  // Calculate line geometry
  const points = useMemo(() => {
    return [new THREE.Vector3(from.x, from.y, 0.5), new THREE.Vector3(to.x, to.y, 0.5)];
  }, [from, to]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  // Calculate arrow direction
  const arrowPosition = useMemo(
    () => new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2, 0.5),
    [from, to]
  );

  const arrowDirection = useMemo(() => {
    const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, 0);
    return dir.normalize();
  }, [from, to]);

  // Label position (at the end of the segment)
  const labelPosition: [number, number, number] = useMemo(
    () => [to.x, to.y, 0.5],
    [to]
  );

  return (
    <group>
      {/* Measurement line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>

      {/* Arrow indicator */}
      <arrowHelper
        args={[arrowDirection, arrowPosition, 20, color, 10, 8]}
      />

      {/* Distance label */}
      {showLabel && (
        <Html position={labelPosition} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: color,
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              border: `2px solid ${color}`,
            }}
          >
            {totalDistance.toFixed(0)} ft
            {distance !== totalDistance && (
              <span style={{ opacity: 0.7, marginLeft: '8px' }}>
                (+{distance.toFixed(0)} ft)
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

interface WaypointMarkerProps {
  point: Point2D;
  index: number;
}

const WaypointMarker: React.FC<WaypointMarkerProps> = ({ point, index }) => {
  return (
    <mesh position={[point.x, point.y, 0.5]}>
      <circleGeometry args={[5, 16]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      {index > 0 && (
        <Html center>
          <div
            style={{
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '0 0 4px black',
              pointerEvents: 'none',
            }}
          >
            {index}
          </div>
        </Html>
      )}
    </mesh>
  );
};

export default MeasurementTool;
