/**
 * Grid Snapping Utilities
 *
 * This module provides utilities for grid-based coordinate systems including:
 * - Square grid snapping and conversion
 * - Hexagonal grid (pointy-top and flat-top) calculations
 * - World-to-grid and grid-to-world coordinate conversion
 */

import { GridType } from '@/types/scene';

// ===========================
// Types
// ===========================

export interface GridCoordinates {
  col: number;
  row: number;
}

export interface WorldCoordinates {
  x: number;
  y: number;
}

export interface HexPoint {
  x: number;
  y: number;
}

export type HexType = 'pointy' | 'flat';

// ===========================
// Square Grid Functions
// ===========================

/**
 * Snaps world coordinates to the nearest grid point
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param gridSize - Size of each grid cell in world units
 * @param gridType - Type of grid system to use
 * @returns Snapped world coordinates
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: number,
  gridType: GridType
): WorldCoordinates {
  if (gridType === GridType.GRIDLESS) {
    return { x, y };
  }

  if (gridType === GridType.SQUARE) {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }

  // For hexagonal grids, convert to hex coordinates, round, then convert back
  const hexType =
    gridType === GridType.HEXAGONAL_VERTICAL ? 'pointy' : 'flat';
  const hexCoords = worldToHex(x, y, gridSize, hexType);
  const roundedHex = roundHexCoordinates(hexCoords.q, hexCoords.r);
  return hexToWorld(roundedHex.q, roundedHex.r, gridSize, hexType);
}

/**
 * Converts world coordinates to grid cell coordinates (square grid)
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param gridSize - Size of each grid cell in world units
 * @returns Grid cell coordinates
 */
export function worldToGrid(
  x: number,
  y: number,
  gridSize: number
): GridCoordinates {
  return {
    col: Math.floor(x / gridSize),
    row: Math.floor(y / gridSize),
  };
}

/**
 * Converts grid cell coordinates to world coordinates (square grid)
 * Returns the center of the grid cell
 * @param col - Grid column
 * @param row - Grid row
 * @param gridSize - Size of each grid cell in world units
 * @returns World coordinates at the center of the grid cell
 */
export function gridToWorld(
  col: number,
  row: number,
  gridSize: number
): WorldCoordinates {
  return {
    x: (col + 0.5) * gridSize,
    y: (row + 0.5) * gridSize,
  };
}

// ===========================
// Hexagonal Grid Functions
// ===========================

/**
 * Axial hex coordinates (q, r system)
 */
export interface AxialCoordinates {
  q: number; // column axis
  r: number; // row axis
}

/**
 * Converts world coordinates to hexagonal grid coordinates (axial system)
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param gridSize - Size of each hex in world units
 * @param hexType - Type of hex orientation ('pointy' or 'flat')
 * @returns Axial hex coordinates
 */
export function worldToHex(
  x: number,
  y: number,
  gridSize: number,
  hexType: HexType
): AxialCoordinates {
  if (hexType === 'pointy') {
    // Pointy-top hexagon (vertical orientation)
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / gridSize;
    const r = ((2 / 3) * y) / gridSize;
    return { q, r };
  } else {
    // Flat-top hexagon (horizontal orientation)
    const q = ((2 / 3) * x) / gridSize;
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / gridSize;
    return { q, r };
  }
}

/**
 * Converts hexagonal grid coordinates to world coordinates
 * @param q - Hex column coordinate (axial)
 * @param r - Hex row coordinate (axial)
 * @param gridSize - Size of each hex in world units
 * @param hexType - Type of hex orientation ('pointy' or 'flat')
 * @returns World coordinates at the center of the hex
 */
export function hexToWorld(
  q: number,
  r: number,
  gridSize: number,
  hexType: HexType
): WorldCoordinates {
  if (hexType === 'pointy') {
    // Pointy-top hexagon
    const x = gridSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = gridSize * ((3 / 2) * r);
    return { x, y };
  } else {
    // Flat-top hexagon
    const x = gridSize * ((3 / 2) * q);
    const y = gridSize * (Math.sqrt(3) / 2) * q + Math.sqrt(3) * r;
    return { x, y };
  }
}

/**
 * Rounds fractional hex coordinates to the nearest hex
 * Uses cube coordinate rounding for accuracy
 * @param q - Hex column (axial)
 * @param r - Hex row (axial)
 * @returns Rounded axial coordinates
 */
export function roundHexCoordinates(q: number, r: number): AxialCoordinates {
  // Convert axial to cube coordinates
  const x = q;
  const z = r;
  const y = -x - z;

  // Round cube coordinates
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  // Calculate rounding errors
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  // Reset the component with the largest rounding error
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  // Convert back to axial
  return { q: rx, r: rz };
}

/**
 * Gets the corner points of a hexagonal grid cell
 * @param row - Grid row
 * @param col - Grid column
 * @param gridSize - Size of each hex in world units
 * @param hexType - Type of hex orientation ('pointy' or 'flat')
 * @returns Array of 6 corner points in clockwise order
 */
export function getHexGridPoints(
  row: number,
  col: number,
  gridSize: number,
  hexType: HexType
): HexPoint[] {
  // Get center of hex
  const center = hexToWorld(col, row, gridSize, hexType);

  const points: HexPoint[] = [];

  if (hexType === 'pointy') {
    // Pointy-top hexagon - corners are at 30, 90, 150, 210, 270, 330 degrees
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      points.push({
        x: center.x + gridSize * Math.cos(angle),
        y: center.y + gridSize * Math.sin(angle),
      });
    }
  } else {
    // Flat-top hexagon - corners are at 0, 60, 120, 180, 240, 300 degrees
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * 60 * i;
      points.push({
        x: center.x + gridSize * Math.cos(angle),
        y: center.y + gridSize * Math.sin(angle),
      });
    }
  }

  return points;
}

/**
 * Gets all hexagonal cells within a rectangular area
 * Useful for rendering a hex grid
 * @param width - Width of the area in world units
 * @param height - Height of the area in world units
 * @param gridSize - Size of each hex in world units
 * @param hexType - Type of hex orientation
 * @returns Array of axial coordinates for each hex
 */
export function getHexesInArea(
  width: number,
  height: number,
  gridSize: number,
  hexType: HexType
): AxialCoordinates[] {
  const hexes: AxialCoordinates[] = [];

  // Determine the bounds in hex coordinates
  const topLeft = worldToHex(0, 0, gridSize, hexType);
  const bottomRight = worldToHex(width, height, gridSize, hexType);

  const minQ = Math.floor(Math.min(topLeft.q, bottomRight.q)) - 1;
  const maxQ = Math.ceil(Math.max(topLeft.q, bottomRight.q)) + 1;
  const minR = Math.floor(Math.min(topLeft.r, bottomRight.r)) - 1;
  const maxR = Math.ceil(Math.max(topLeft.r, bottomRight.r)) + 1;

  // Iterate through possible hex coordinates
  for (let q = minQ; q <= maxQ; q++) {
    for (let r = minR; r <= maxR; r++) {
      // Check if hex center is within bounds
      const center = hexToWorld(q, r, gridSize, hexType);
      if (center.x >= -gridSize && center.x <= width + gridSize &&
          center.y >= -gridSize && center.y <= height + gridSize) {
        hexes.push({ q, r });
      }
    }
  }

  return hexes;
}

/**
 * Calculates the distance between two hex cells
 * @param q1 - First hex column
 * @param r1 - First hex row
 * @param q2 - Second hex column
 * @param r2 - Second hex row
 * @returns Distance in hex cells
 */
export function hexDistance(
  q1: number,
  r1: number,
  q2: number,
  r2: number
): number {
  // Convert to cube coordinates for easier distance calculation
  const x1 = q1;
  const z1 = r1;
  const y1 = -x1 - z1;

  const x2 = q2;
  const z2 = r2;
  const y2 = -x2 - z2;

  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}
