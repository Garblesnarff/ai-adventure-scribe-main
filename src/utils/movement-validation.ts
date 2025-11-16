/**
 * Movement Validation Utilities
 *
 * Provides functions for validating token movement based on D&D 5e rules.
 * Handles difficult terrain, flying, climbing, swimming, and movement costs.
 *
 * @module utils/movement-validation
 */

import type { Token } from '@/types/token';

// ===========================
// Types
// ===========================

export interface GridCoordinate {
  x: number;
  y: number;
}

export interface TerrainInfo {
  type: 'normal' | 'difficult' | 'impassable' | 'water' | 'climbing';
  cost: number; // Movement cost multiplier (1 = normal, 2 = difficult, Infinity = impassable)
}

export interface Wall {
  from: GridCoordinate;
  to: GridCoordinate;
  blocks: 'movement' | 'sight' | 'both';
}

export interface MovementMode {
  walking: boolean;
  flying: boolean;
  swimming: boolean;
  climbing: boolean;
  burrowing: boolean;
}

export interface MovementCapabilities {
  speed: number; // Base walking speed in feet
  flySpeed?: number; // Flying speed in feet
  swimSpeed?: number; // Swimming speed in feet
  climbSpeed?: number; // Climbing speed in feet
  burrowSpeed?: number; // Burrowing speed in feet
  hover?: boolean; // Can hover (ignores falling)
}

// ===========================
// Constants
// ===========================

const GRID_SIZE_FEET = 5; // Each grid square is 5 feet
const DIAGONAL_COST = 1.5; // D&D 5e diagonal movement cost (alternating 5/10 ft, averaged)

// ===========================
// Movement Cost Calculation
// ===========================

/**
 * Calculate the movement cost to move from one grid position to another
 *
 * @param from - Starting grid coordinate
 * @param to - Ending grid coordinate
 * @param terrain - Terrain map (optional)
 * @param mode - Movement mode (walking, flying, etc.)
 * @returns Movement cost in feet
 */
export function getMovementCost(
  from: GridCoordinate,
  to: GridCoordinate,
  terrain?: Map<string, TerrainInfo>,
  mode: keyof MovementMode = 'walking',
): number {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);

  // Calculate base distance (diagonal movement)
  const isDiagonal = dx > 0 && dy > 0;
  const gridDistance = Math.max(dx, dy);
  const baseCost = isDiagonal ? gridDistance * DIAGONAL_COST : gridDistance;
  const feetCost = baseCost * GRID_SIZE_FEET;

  // Get terrain at destination
  const terrainKey = `${to.x},${to.y}`;
  const terrainInfo = terrain?.get(terrainKey);

  // Flying ignores ground terrain (unless landing)
  if (mode === 'flying' && terrainInfo?.type !== 'impassable') {
    return feetCost;
  }

  // Burrowing ignores most terrain
  if (mode === 'burrowing') {
    return feetCost;
  }

  // Apply terrain cost multiplier
  const terrainMultiplier = terrainInfo?.cost ?? 1;

  // Difficult terrain: double cost
  if (terrainInfo?.type === 'difficult') {
    return feetCost * 2;
  }

  // Water terrain: half speed if no swim speed
  if (terrainInfo?.type === 'water' && mode !== 'swimming') {
    return feetCost * 2;
  }

  // Climbing: half speed if no climb speed
  if (terrainInfo?.type === 'climbing' && mode !== 'climbing') {
    return feetCost * 2;
  }

  return feetCost * terrainMultiplier;
}

/**
 * Check if movement between two grid positions is blocked by walls
 *
 * @param from - Starting grid coordinate
 * @param to - Ending grid coordinate
 * @param walls - Array of wall segments
 * @param mode - Movement mode (flying can ignore some walls)
 * @returns True if movement is blocked
 */
export function isMovementBlocked(
  from: GridCoordinate,
  to: GridCoordinate,
  walls: Wall[],
  mode: keyof MovementMode = 'walking',
): boolean {
  // Flying can potentially move over some walls
  if (mode === 'flying') {
    return false; // Simplified: flying ignores walls
  }

  // Check if any wall blocks the movement path
  for (const wall of walls) {
    if (wall.blocks === 'sight') continue; // Only sight walls don't block movement

    // Check if the movement path intersects the wall
    if (linesIntersect(from, to, wall.from, wall.to)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 *
 * @param a1 - First point of line A
 * @param a2 - Second point of line A
 * @param b1 - First point of line B
 * @param b2 - Second point of line B
 * @returns True if lines intersect
 */
function linesIntersect(
  a1: GridCoordinate,
  a2: GridCoordinate,
  b1: GridCoordinate,
  b2: GridCoordinate,
): boolean {
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);
  if (det === 0) return false; // Parallel lines

  const lambda =
    ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;

  return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
}

// ===========================
// Reachable Squares Calculation
// ===========================

/**
 * Calculate all grid squares reachable with remaining movement
 * Uses flood-fill algorithm to find all valid destinations
 *
 * @param token - Token attempting to move
 * @param movementRemaining - Movement remaining in feet
 * @param walls - Array of walls that block movement
 * @param terrain - Terrain map
 * @param capabilities - Movement capabilities of the token
 * @returns Array of reachable grid coordinates
 */
export function calculateReachableSquares(
  token: Token,
  movementRemaining: number,
  walls: Wall[],
  terrain?: Map<string, TerrainInfo>,
  capabilities?: MovementCapabilities,
): GridCoordinate[] {
  const startX = Math.floor(token.x / GRID_SIZE_FEET);
  const startY = Math.floor(token.y / GRID_SIZE_FEET);
  const start: GridCoordinate = { x: startX, y: startY };

  const reachable: GridCoordinate[] = [];
  const visited = new Set<string>();
  const queue: Array<{ coord: GridCoordinate; costSoFar: number }> = [
    { coord: start, costSoFar: 0 },
  ];

  // Determine movement mode based on capabilities
  const canFly = (capabilities?.flySpeed ?? 0) > 0;
  const canSwim = (capabilities?.swimSpeed ?? 0) > 0;
  const canClimb = (capabilities?.climbSpeed ?? 0) > 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.coord.x},${current.coord.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Add to reachable list
    if (current.costSoFar <= movementRemaining) {
      reachable.push(current.coord);
    }

    // Explore neighbors (8 directions)
    const neighbors: GridCoordinate[] = [
      { x: current.coord.x + 1, y: current.coord.y }, // Right
      { x: current.coord.x - 1, y: current.coord.y }, // Left
      { x: current.coord.x, y: current.coord.y + 1 }, // Down
      { x: current.coord.x, y: current.coord.y - 1 }, // Up
      { x: current.coord.x + 1, y: current.coord.y + 1 }, // Down-right
      { x: current.coord.x + 1, y: current.coord.y - 1 }, // Up-right
      { x: current.coord.x - 1, y: current.coord.y + 1 }, // Down-left
      { x: current.coord.x - 1, y: current.coord.y - 1 }, // Up-left
    ];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (visited.has(neighborKey)) continue;

      // Determine movement mode for this terrain
      const terrainInfo = terrain?.get(neighborKey);
      let mode: keyof MovementMode = 'walking';

      if (canFly && terrainInfo?.type !== 'impassable') {
        mode = 'flying';
      } else if (terrainInfo?.type === 'water' && canSwim) {
        mode = 'swimming';
      } else if (terrainInfo?.type === 'climbing' && canClimb) {
        mode = 'climbing';
      }

      // Calculate movement cost
      const moveCost = getMovementCost(current.coord, neighbor, terrain, mode);

      // Check if movement is blocked by walls
      if (isMovementBlocked(current.coord, neighbor, walls, mode)) {
        continue;
      }

      // Check if we have enough movement
      const totalCost = current.costSoFar + moveCost;
      if (totalCost <= movementRemaining) {
        queue.push({ coord: neighbor, costSoFar: totalCost });
      }
    }
  }

  return reachable;
}

/**
 * Get movement capabilities from a token
 *
 * @param token - Token to extract capabilities from
 * @returns Movement capabilities
 */
export function getMovementCapabilities(token: Token): MovementCapabilities {
  // Extract from token data or character sheet
  // This is a simplified version - would need to integrate with character data
  return {
    speed: 30, // Default walking speed
    flySpeed: token.flags?.flySpeed,
    swimSpeed: token.flags?.swimSpeed,
    climbSpeed: token.flags?.climbSpeed,
    burrowSpeed: token.flags?.burrowSpeed,
    hover: token.flags?.hover,
  };
}

// ===========================
// Path Calculation
// ===========================

/**
 * Calculate the shortest path between two grid coordinates
 * Uses A* pathfinding algorithm
 *
 * @param from - Starting grid coordinate
 * @param to - Ending grid coordinate
 * @param walls - Array of walls that block movement
 * @param terrain - Terrain map
 * @param capabilities - Movement capabilities
 * @returns Array of grid coordinates forming the path, or null if no path exists
 */
export function calculatePath(
  from: GridCoordinate,
  to: GridCoordinate,
  walls: Wall[],
  terrain?: Map<string, TerrainInfo>,
  capabilities?: MovementCapabilities,
): GridCoordinate[] | null {
  const openSet = new Set<string>([`${from.x},${from.y}`]);
  const cameFrom = new Map<string, GridCoordinate>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(`${from.x},${from.y}`, 0);
  fScore.set(`${from.x},${from.y}`, heuristic(from, to));

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let current: GridCoordinate | null = null;
    let currentKey = '';
    let lowestScore = Infinity;

    for (const key of openSet) {
      const score = fScore.get(key) ?? Infinity;
      if (score < lowestScore) {
        lowestScore = score;
        currentKey = key;
        const [x, y] = key.split(',').map(Number);
        current = { x, y };
      }
    }

    if (!current) break;

    // Check if we reached the goal
    if (current.x === to.x && current.y === to.y) {
      return reconstructPath(cameFrom, current);
    }

    openSet.delete(currentKey);

    // Explore neighbors
    const neighbors: GridCoordinate[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 },
    ];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      // Check if movement is blocked
      if (isMovementBlocked(current, neighbor, walls)) {
        continue;
      }

      // Calculate tentative gScore
      const moveCost = getMovementCost(current, neighbor, terrain);
      const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + moveCost;

      if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, to));

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        }
      }
    }
  }

  // No path found
  return null;
}

/**
 * Heuristic function for A* pathfinding (Manhattan distance)
 *
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Estimated cost
 */
function heuristic(from: GridCoordinate, to: GridCoordinate): number {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return (dx + dy) * GRID_SIZE_FEET;
}

/**
 * Reconstruct path from A* cameFrom map
 *
 * @param cameFrom - Map of previous nodes
 * @param current - Current (goal) node
 * @returns Path as array of coordinates
 */
function reconstructPath(
  cameFrom: Map<string, GridCoordinate>,
  current: GridCoordinate,
): GridCoordinate[] {
  const path: GridCoordinate[] = [current];
  let currentKey = `${current.x},${current.y}`;

  while (cameFrom.has(currentKey)) {
    const prev = cameFrom.get(currentKey)!;
    path.unshift(prev);
    currentKey = `${prev.x},${prev.y}`;
  }

  return path;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Convert pixel coordinates to grid coordinates
 *
 * @param pixelX - X coordinate in pixels
 * @param pixelY - Y coordinate in pixels
 * @param gridSize - Grid size in pixels
 * @returns Grid coordinate
 */
export function pixelToGrid(pixelX: number, pixelY: number, gridSize: number): GridCoordinate {
  return {
    x: Math.floor(pixelX / gridSize),
    y: Math.floor(pixelY / gridSize),
  };
}

/**
 * Convert grid coordinates to pixel coordinates (center of square)
 *
 * @param gridX - Grid X coordinate
 * @param gridY - Grid Y coordinate
 * @param gridSize - Grid size in pixels
 * @returns Pixel coordinates
 */
export function gridToPixel(gridX: number, gridY: number, gridSize: number): { x: number; y: number } {
  return {
    x: (gridX + 0.5) * gridSize,
    y: (gridY + 0.5) * gridSize,
  };
}

/**
 * Calculate distance between two grid coordinates in feet
 *
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Distance in feet
 */
export function gridDistance(from: GridCoordinate, to: GridCoordinate): number {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const gridDist = Math.max(dx, dy);
  return gridDist * GRID_SIZE_FEET;
}
