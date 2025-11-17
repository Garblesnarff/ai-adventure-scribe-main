/**
 * Movement Tracking Component
 *
 * Tracks and visualizes movement during a combat turn.
 *
 * Features:
 * - Track movement used this turn
 * - Show remaining movement (colored ring)
 * - Highlight reachable squares (flood fill)
 * - Prevent exceeding speed
 * - Account for difficult terrain
 * - Reset on turn end
 *
 * @module components/battle-map/MovementTracking
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { CombatParticipant } from '@/types/combat';
import type { Token } from '@/types/token';
import {
  calculateReachableSquares,
  getMovementCapabilities,
  pixelToGrid,
  gridToPixel,
  type GridCoordinate,
  type TerrainInfo,
  type Wall,
} from '@/utils/movement-validation';
import * as THREE from 'three';
import logger from '@/lib/logger';

// ===========================
// Props Interface
// ===========================

export interface MovementTrackingProps {
  /** Token being moved */
  token: Token;
  /** Combat participant data */
  participant: CombatParticipant;
  /** Grid size in pixels */
  gridSize: number;
  /** Movement remaining in feet */
  movementRemaining: number;
  /** Terrain map (optional) */
  terrain?: Map<string, TerrainInfo>;
  /** Walls that block movement (optional) */
  walls?: Wall[];
  /** Whether to show reachable squares */
  showReachable?: boolean;
  /** Whether to show movement ring */
  showMovementRing?: boolean;
  /** Whether to show path preview */
  showPathPreview?: boolean;
  /** Callback when movement is completed */
  onMovementComplete?: (tokenId: string, distance: number) => void;
}

// ===========================
// Component
// ===========================

/**
 * Movement Tracking Component
 *
 * Visualizes available movement and tracks movement used during a turn.
 *
 * @example
 * ```tsx
 * <MovementTracking
 *   token={currentToken}
 *   participant={currentParticipant}
 *   gridSize={100}
 *   movementRemaining={30}
 *   showReachable={true}
 * />
 * ```
 */
export const MovementTracking: React.FC<MovementTrackingProps> = ({
  token,
  participant,
  gridSize,
  movementRemaining,
  terrain,
  walls = [],
  showReachable = true,
  showMovementRing = true,
  showPathPreview = false,
  onMovementComplete,
}) => {
  const [hoveredSquare, setHoveredSquare] = useState<GridCoordinate | null>(null);

  // ===========================
  // Calculate Reachable Squares
  // ===========================

  const reachableSquares = useMemo(() => {
    if (!showReachable) return [];

    const capabilities = getMovementCapabilities(token);

    return calculateReachableSquares(
      token,
      movementRemaining,
      walls,
      terrain,
      capabilities,
    );
  }, [token, movementRemaining, walls, terrain, showReachable]);

  // ===========================
  // Movement Ring Color
  // ===========================

  const movementRingColor = useMemo(() => {
    const percentRemaining = movementRemaining / participant.speed;

    if (percentRemaining > 0.66) {
      return '#00FF00'; // Green - lots of movement
    } else if (percentRemaining > 0.33) {
      return '#FFFF00'; // Yellow - some movement
    } else if (percentRemaining > 0) {
      return '#FF8800'; // Orange - little movement
    } else {
      return '#FF0000'; // Red - no movement
    }
  }, [movementRemaining, participant.speed]);

  // ===========================
  // Render
  // ===========================

  return (
    <group name="movement-tracking">
      {/* Movement Ring */}
      {showMovementRing && (
        <MovementRing
          token={token}
          movementRemaining={movementRemaining}
          totalMovement={participant.speed}
          color={movementRingColor}
          gridSize={gridSize}
        />
      )}

      {/* Reachable Squares */}
      {showReachable && (
        <ReachableSquares
          squares={reachableSquares}
          gridSize={gridSize}
          hoveredSquare={hoveredSquare}
          onSquareHover={setHoveredSquare}
        />
      )}

      {/* Path Preview */}
      {showPathPreview && hoveredSquare && (
        <PathPreview
          from={pixelToGrid(token.x, token.y, gridSize)}
          to={hoveredSquare}
          gridSize={gridSize}
        />
      )}

      {/* Movement Text Display */}
      <MovementDisplay
        token={token}
        movementRemaining={movementRemaining}
        totalMovement={participant.speed}
        gridSize={gridSize}
      />
    </group>
  );
};

// ===========================
// Movement Ring Component
// ===========================

interface MovementRingProps {
  token: Token;
  movementRemaining: number;
  totalMovement: number;
  color: string;
  gridSize: number;
}

const MovementRing: React.FC<MovementRingProps> = ({
  token,
  movementRemaining,
  totalMovement,
  color,
  gridSize,
}) => {
  const size = token.width * gridSize;
  const radius = (size / 2) * 1.15;
  const ringWidth = 4;

  // Calculate arc angle based on movement remaining
  const arcAngle = (movementRemaining / totalMovement) * Math.PI * 2;

  // Create arc geometry for movement ring
  const arcGeometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(
      0,
      0,
      radius,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + arcAngle,
      false,
      0,
    );

    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return geometry;
  }, [radius, arcAngle]);

  return (
    <group position={[token.x, token.y, 6]}>
      {/* Background ring (gray) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[radius - ringWidth / 2, radius + ringWidth / 2, 64]} />
        <meshBasicMaterial color="#333333" opacity={0.3} transparent />
      </mesh>

      {/* Movement remaining arc */}
      <line position={[0, 0, 0.1]}>
        <bufferGeometry attach="geometry" {...arcGeometry} />
        <lineBasicMaterial attach="material" color={color} linewidth={ringWidth} />
      </line>
    </group>
  );
};

// ===========================
// Reachable Squares Component
// ===========================

interface ReachableSquaresProps {
  squares: GridCoordinate[];
  gridSize: number;
  hoveredSquare: GridCoordinate | null;
  onSquareHover: (square: GridCoordinate | null) => void;
}

const ReachableSquares: React.FC<ReachableSquaresProps> = ({
  squares,
  gridSize,
  hoveredSquare,
  onSquareHover,
}) => {
  return (
    <group name="reachable-squares">
      {squares.map((square, index) => {
        const pixelPos = gridToPixel(square.x, square.y, gridSize);
        const isHovered =
          hoveredSquare?.x === square.x && hoveredSquare?.y === square.y;

        return (
          <mesh
            key={`${square.x}-${square.y}`}
            position={[pixelPos.x, pixelPos.y, 2]}
            onPointerEnter={() => onSquareHover(square)}
            onPointerLeave={() => onSquareHover(null)}
          >
            <planeGeometry args={[gridSize * 0.9, gridSize * 0.9]} />
            <meshBasicMaterial
              color={isHovered ? '#00FF00' : '#00FFFF'}
              opacity={isHovered ? 0.5 : 0.3}
              transparent
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ===========================
// Path Preview Component
// ===========================

interface PathPreviewProps {
  from: GridCoordinate;
  to: GridCoordinate;
  gridSize: number;
}

const PathPreview: React.FC<PathPreviewProps> = ({ from, to, gridSize }) => {
  // Create simple straight line for preview
  const points = useMemo(() => {
    const fromPixel = gridToPixel(from.x, from.y, gridSize);
    const toPixel = gridToPixel(to.x, to.y, gridSize);

    return [
      new THREE.Vector3(fromPixel.x, fromPixel.y, 3),
      new THREE.Vector3(toPixel.x, toPixel.y, 3),
    ];
  }, [from, to, gridSize]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial
        attach="material"
        color="#FFFF00"
        linewidth={3}
        opacity={0.7}
        transparent
      />
    </line>
  );
};

// ===========================
// Movement Display Component
// ===========================

interface MovementDisplayProps {
  token: Token;
  movementRemaining: number;
  totalMovement: number;
  gridSize: number;
}

const MovementDisplay: React.FC<MovementDisplayProps> = ({
  token,
  movementRemaining,
  totalMovement,
  gridSize,
}) => {
  const size = token.width * gridSize;
  const yOffset = size / 2 + 30;

  const displayText = `${movementRemaining}/${totalMovement} ft`;

  return (
    <group position={[token.x, token.y + yOffset, 10]}>
      {/* Background */}
      <mesh>
        <planeGeometry args={[60, 20]} />
        <meshBasicMaterial color="#000000" opacity={0.7} transparent />
      </mesh>

      {/* Text (simplified - in production use Text3D or sprite) */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[50, 12]} />
        <meshBasicMaterial color="#FFFFFF" opacity={0.9} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Helper Functions
// ===========================

/**
 * Calculate movement cost for a path
 */
function calculatePathCost(
  path: GridCoordinate[],
  terrain?: Map<string, TerrainInfo>,
): number {
  let totalCost = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Base cost: 5 feet per square, 7.5 for diagonal (5e rules)
    const isDiagonal = dx > 0 && dy > 0;
    let cost = isDiagonal ? 7.5 : 5;

    // Apply terrain multiplier
    const terrainKey = `${to.x},${to.y}`;
    const terrainInfo = terrain?.get(terrainKey);

    if (terrainInfo?.type === 'difficult') {
      cost *= 2;
    }

    totalCost += cost;
  }

  return totalCost;
}

/**
 * Check if a path is valid (doesn't exceed movement)
 */
export function isPathValid(
  path: GridCoordinate[],
  movementRemaining: number,
  terrain?: Map<string, TerrainInfo>,
): boolean {
  const cost = calculatePathCost(path, terrain);
  return cost <= movementRemaining;
}
