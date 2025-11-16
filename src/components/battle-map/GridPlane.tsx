/**
 * GridPlane Component
 *
 * Renders a grid overlay for battle maps using Three.js.
 * Supports square grids, hexagonal grids (pointy-top and flat-top), and gridless mode.
 * Optimized for performance using BufferGeometry and material reuse.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GridType } from '@/types/scene';
import { getHexesInArea, hexToWorld, getHexGridPoints } from '@/utils/grid-snapping';

// ===========================
// Component Props
// ===========================

export interface GridPlaneProps {
  /** Width of the battle map in world units */
  width: number;

  /** Height of the battle map in world units */
  height: number;

  /** Size of each grid cell in world units */
  gridSize: number;

  /** Type of grid to render */
  gridType: GridType;

  /** Color of grid lines (hex string) */
  gridColor?: string;

  /** Opacity of grid lines (0-1) */
  gridOpacity?: number;
}

// ===========================
// Grid Geometry Generators
// ===========================

/**
 * Creates BufferGeometry for a square grid
 */
function createSquareGridGeometry(
  width: number,
  height: number,
  gridSize: number
): THREE.BufferGeometry {
  const positions: number[] = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    positions.push(x, 0, 0.01); // Start point (slight z offset to avoid z-fighting)
    positions.push(x, height, 0.01); // End point
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    positions.push(0, y, 0.01); // Start point
    positions.push(width, y, 0.01); // End point
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  return geometry;
}

/**
 * Creates BufferGeometry for a hexagonal grid
 */
function createHexagonalGridGeometry(
  width: number,
  height: number,
  gridSize: number,
  hexType: 'pointy' | 'flat'
): THREE.BufferGeometry {
  const positions: number[] = [];

  // Get all hexes in the area
  const hexes = getHexesInArea(width, height, gridSize, hexType);

  // Draw each hexagon
  for (const hex of hexes) {
    const points = getHexGridPoints(hex.r, hex.q, gridSize, hexType);

    // Draw lines between adjacent corners
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      positions.push(current.x, current.y, 0.01);
      positions.push(next.x, next.y, 0.01);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  return geometry;
}

// ===========================
// Main Component
// ===========================

/**
 * GridPlane component - renders a grid overlay for battle maps
 */
export const GridPlane: React.FC<GridPlaneProps> = ({
  width,
  height,
  gridSize,
  gridType,
  gridColor = '#000000',
  gridOpacity = 0.2,
}) => {
  // Create grid geometry based on grid type
  const gridGeometry = useMemo(() => {
    if (gridType === GridType.GRIDLESS) {
      return null;
    }

    if (gridType === GridType.SQUARE) {
      return createSquareGridGeometry(width, height, gridSize);
    }

    if (gridType === GridType.HEXAGONAL_VERTICAL) {
      return createHexagonalGridGeometry(width, height, gridSize, 'pointy');
    }

    if (gridType === GridType.HEXAGONAL_HORIZONTAL) {
      return createHexagonalGridGeometry(width, height, gridSize, 'flat');
    }

    return null;
  }, [width, height, gridSize, gridType]);

  // Create material for grid lines (reused for all lines)
  const gridMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(gridColor),
      opacity: gridOpacity,
      transparent: gridOpacity < 1,
      depthWrite: false, // Prevent z-fighting
      depthTest: true,
    });
  }, [gridColor, gridOpacity]);

  // Cleanup geometry on unmount or when it changes
  React.useEffect(() => {
    return () => {
      if (gridGeometry) {
        gridGeometry.dispose();
      }
    };
  }, [gridGeometry]);

  // Cleanup material on unmount or when it changes
  React.useEffect(() => {
    return () => {
      gridMaterial.dispose();
    };
  }, [gridMaterial]);

  // Don't render anything for gridless mode
  if (gridType === GridType.GRIDLESS || !gridGeometry) {
    return null;
  }

  return (
    <lineSegments geometry={gridGeometry} material={gridMaterial}>
      {/* LineSegments component automatically handles rendering */}
    </lineSegments>
  );
};

// ===========================
// Helper Components (Optional)
// ===========================

/**
 * Ground plane component to serve as a base for the grid
 * This is optional but useful for providing a clickable surface
 */
export interface GroundPlaneProps {
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  visible?: boolean;
}

export const GroundPlane: React.FC<GroundPlaneProps> = ({
  width,
  height,
  color = '#ffffff',
  opacity = 0,
  visible = true,
}) => {
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(width, height);
  }, [width, height]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
    });
  }, [color, opacity]);

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!visible) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[width / 2, height / 2, 0]}
    />
  );
};

// ===========================
// Exports
// ===========================

export default GridPlane;
