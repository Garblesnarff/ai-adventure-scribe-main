/**
 * Spatial Partitioning Utilities
 *
 * Quadtree implementation for efficient spatial queries on walls and tokens.
 * Dramatically improves performance when checking line-of-sight against many walls.
 *
 * @module utils/spatial-partitioning
 */

import type { Point2D, VisionBlocker } from '@/types/scene';

// ===========================
// Types
// ===========================

/**
 * Axis-aligned bounding box
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Quadtree node
 */
export interface QuadTreeNode {
  bounds: AABB;
  walls: VisionBlocker[];
  children: QuadTreeNode[] | null;
  level: number;
}

/**
 * Quadtree configuration
 */
export interface QuadTreeConfig {
  maxWalls: number; // Max walls per node before splitting
  maxLevel: number; // Max tree depth
}

// ===========================
// Default Configuration
// ===========================

const DEFAULT_QUADTREE_CONFIG: QuadTreeConfig = {
  maxWalls: 10,
  maxLevel: 8,
};

// ===========================
// QuadTree Class
// ===========================

/**
 * QuadTree for spatial partitioning of walls
 *
 * Organizes walls into a hierarchical grid structure for O(log n) queries.
 * Significantly faster than checking all walls for every line-of-sight calculation.
 *
 * @example
 * ```ts
 * const quadTree = new QuadTree(bounds, walls);
 * const nearbyWalls = quadTree.query({ minX: 90, minY: 90, maxX: 110, maxY: 110 });
 * // Only returns walls near (100, 100)
 * ```
 */
export class QuadTree {
  private root: QuadTreeNode;
  private config: QuadTreeConfig;

  constructor(
    bounds: AABB,
    walls: VisionBlocker[],
    config: Partial<QuadTreeConfig> = {}
  ) {
    this.config = { ...DEFAULT_QUADTREE_CONFIG, ...config };
    this.root = this.createNode(bounds, walls, 0);
  }

  /**
   * Query the quadtree for walls within a bounding box
   *
   * @param bounds - Query bounding box
   * @returns Walls that intersect the query bounds
   */
  query(bounds: AABB): VisionBlocker[] {
    const result: VisionBlocker[] = [];
    const seen = new Set<string>();

    this.queryNode(this.root, bounds, result, seen);

    return result;
  }

  /**
   * Query for walls near a point within a radius
   *
   * @param point - Center point
   * @param radius - Search radius in pixels
   * @returns Walls within radius
   */
  queryRadius(point: Point2D, radius: number): VisionBlocker[] {
    return this.query({
      minX: point.x - radius,
      minY: point.y - radius,
      maxX: point.x + radius,
      maxY: point.y + radius,
    });
  }

  /**
   * Query for walls along a line segment
   *
   * @param start - Line start point
   * @param end - Line end point
   * @param padding - Extra padding around line (default: 1)
   * @returns Walls that might intersect the line
   */
  queryLine(start: Point2D, end: Point2D, padding: number = 1): VisionBlocker[] {
    const bounds: AABB = {
      minX: Math.min(start.x, end.x) - padding,
      minY: Math.min(start.y, end.y) - padding,
      maxX: Math.max(start.x, end.x) + padding,
      maxY: Math.max(start.y, end.y) + padding,
    };

    return this.query(bounds);
  }

  /**
   * Rebuild the entire quadtree with new walls
   *
   * Call this when walls are added, removed, or modified
   *
   * @param walls - Updated wall list
   */
  rebuild(walls: VisionBlocker[]): void {
    this.root = this.createNode(this.root.bounds, walls, 0);
  }

  /**
   * Get statistics about the quadtree
   *
   * Useful for debugging and optimization
   *
   * @returns Tree statistics
   */
  getStats(): {
    totalNodes: number;
    maxDepth: number;
    totalWalls: number;
    avgWallsPerLeaf: number;
  } {
    const stats = {
      totalNodes: 0,
      maxDepth: 0,
      totalWalls: 0,
      leafNodes: 0,
      wallsInLeaves: 0,
    };

    this.collectStats(this.root, stats);

    return {
      totalNodes: stats.totalNodes,
      maxDepth: stats.maxDepth,
      totalWalls: stats.totalWalls,
      avgWallsPerLeaf: stats.leafNodes > 0 ? stats.wallsInLeaves / stats.leafNodes : 0,
    };
  }

  // ===========================
  // Private Methods
  // ===========================

  private createNode(
    bounds: AABB,
    walls: VisionBlocker[],
    level: number
  ): QuadTreeNode {
    const node: QuadTreeNode = {
      bounds,
      walls: [],
      children: null,
      level,
    };

    // Filter walls that intersect this node's bounds
    for (const wall of walls) {
      if (this.wallIntersectsBounds(wall, bounds)) {
        node.walls.push(wall);
      }
    }

    // Split if we have too many walls and haven't reached max depth
    if (
      node.walls.length > this.config.maxWalls &&
      level < this.config.maxLevel
    ) {
      this.split(node);
    }

    return node;
  }

  private split(node: QuadTreeNode): void {
    const { bounds, walls, level } = node;
    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;

    // Create four child quadrants
    const childBounds: AABB[] = [
      // Top-left
      { minX: bounds.minX, minY: bounds.minY, maxX: midX, maxY: midY },
      // Top-right
      { minX: midX, minY: bounds.minY, maxX: bounds.maxX, maxY: midY },
      // Bottom-left
      { minX: bounds.minX, minY: midY, maxX: midX, maxY: bounds.maxY },
      // Bottom-right
      { minX: midX, minY: midY, maxX: bounds.maxX, maxY: bounds.maxY },
    ];

    node.children = childBounds.map((childBound) =>
      this.createNode(childBound, walls, level + 1)
    );

    // Clear walls from parent node (they're now in children)
    // Keep reference to avoid recreating for query optimization
  }

  private queryNode(
    node: QuadTreeNode,
    queryBounds: AABB,
    result: VisionBlocker[],
    seen: Set<string>
  ): void {
    // Check if query bounds intersect this node
    if (!this.boundsIntersect(node.bounds, queryBounds)) {
      return;
    }

    // Add walls from this node
    for (const wall of node.walls) {
      if (!seen.has(wall.id)) {
        seen.add(wall.id);
        result.push(wall);
      }
    }

    // Recursively query children
    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, queryBounds, result, seen);
      }
    }
  }

  private collectStats(
    node: QuadTreeNode,
    stats: {
      totalNodes: number;
      maxDepth: number;
      totalWalls: number;
      leafNodes: number;
      wallsInLeaves: number;
    }
  ): void {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, node.level);

    if (!node.children) {
      // Leaf node
      stats.leafNodes++;
      stats.wallsInLeaves += node.walls.length;
    }

    // Count unique walls
    stats.totalWalls += node.walls.length;

    if (node.children) {
      for (const child of node.children) {
        this.collectStats(child, stats);
      }
    }
  }

  private wallIntersectsBounds(wall: VisionBlocker, bounds: AABB): boolean {
    // Check if any wall segment intersects the bounds
    for (const point of wall.points) {
      if (this.pointInBounds(point, bounds)) {
        return true;
      }
    }

    // Check if any edge of the wall crosses the bounds
    for (let i = 0; i < wall.points.length - 1; i++) {
      if (this.lineIntersectsBounds(wall.points[i], wall.points[i + 1], bounds)) {
        return true;
      }
    }

    // Check closing segment for polygons
    if (wall.points.length > 2) {
      if (
        this.lineIntersectsBounds(
          wall.points[wall.points.length - 1],
          wall.points[0],
          bounds
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private pointInBounds(point: Point2D, bounds: AABB): boolean {
    return (
      point.x >= bounds.minX &&
      point.x <= bounds.maxX &&
      point.y >= bounds.minY &&
      point.y <= bounds.maxY
    );
  }

  private lineIntersectsBounds(
    p1: Point2D,
    p2: Point2D,
    bounds: AABB
  ): boolean {
    // Check if line segment intersects AABB
    // Uses Liang-Barsky algorithm for efficiency

    let t0 = 0;
    let t1 = 1;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const edges = [
      { p: -dx, q: p1.x - bounds.minX }, // Left
      { p: dx, q: bounds.maxX - p1.x }, // Right
      { p: -dy, q: p1.y - bounds.minY }, // Top
      { p: dy, q: bounds.maxY - p1.y }, // Bottom
    ];

    for (const edge of edges) {
      if (edge.p === 0) {
        if (edge.q < 0) return false; // Parallel and outside
      } else {
        const t = edge.q / edge.p;
        if (edge.p < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }

    return t0 <= t1;
  }

  private boundsIntersect(a: AABB, b: AABB): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY
    );
  }
}

// ===========================
// Helper Functions
// ===========================

/**
 * Build a quadtree from an array of walls
 *
 * Automatically calculates bounds from wall positions
 *
 * @param walls - Walls to index
 * @param padding - Extra padding around bounds (default: 100)
 * @param config - Quadtree configuration
 * @returns Quadtree instance
 *
 * @example
 * ```ts
 * const quadTree = buildQuadTree(sceneWalls);
 * ```
 */
export function buildQuadTree(
  walls: VisionBlocker[],
  padding: number = 100,
  config?: Partial<QuadTreeConfig>
): QuadTree {
  const bounds = calculateWallBounds(walls, padding);
  return new QuadTree(bounds, walls, config);
}

/**
 * Calculate bounding box encompassing all walls
 *
 * @param walls - Walls to bound
 * @param padding - Extra padding
 * @returns Bounding box
 */
export function calculateWallBounds(
  walls: VisionBlocker[],
  padding: number = 0
): AABB {
  if (walls.length === 0) {
    return {
      minX: -padding,
      minY: -padding,
      maxX: padding,
      maxY: padding,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const wall of walls) {
    for (const point of wall.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

/**
 * Create bounding box from point and radius
 *
 * @param center - Center point
 * @param radius - Radius in pixels
 * @returns Bounding box
 */
export function createBoundsFromRadius(center: Point2D, radius: number): AABB {
  return {
    minX: center.x - radius,
    minY: center.y - radius,
    maxX: center.x + radius,
    maxY: center.y + radius,
  };
}

/**
 * Expand bounding box by amount
 *
 * @param bounds - Original bounds
 * @param amount - Amount to expand
 * @returns Expanded bounds
 */
export function expandBounds(bounds: AABB, amount: number): AABB {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}

/**
 * Check if bounds contains a point
 *
 * @param bounds - Bounding box
 * @param point - Point to test
 * @returns Whether point is inside bounds
 */
export function boundsContainsPoint(bounds: AABB, point: Point2D): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Merge multiple bounding boxes
 *
 * @param boundsList - Array of bounding boxes
 * @returns Merged bounding box
 */
export function mergeBounds(boundsList: AABB[]): AABB {
  if (boundsList.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of boundsList) {
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  return { minX, minY, maxX, maxY };
}
