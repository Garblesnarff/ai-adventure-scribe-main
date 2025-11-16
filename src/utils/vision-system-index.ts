/**
 * Vision System - Index
 *
 * Central export point for the Line of Sight calculation system.
 * Import everything you need from this single file.
 *
 * @module utils/vision-system-index
 */

// ===========================
// Core Vision Calculations
// ===========================

export {
  // Main functions
  calculateVisionPolygon,
  hasLineOfSight,
  canSeeToken,
  mergeVisionPolygons,

  // Light calculations
  getEffectiveLightLevel,
  calculateLightReach,
  getLightSourcesAtPosition,
  stackLightLevels,

  // Vision utilities
  calculateVisionRadius,
  getActiveVisionType,
  getVisionColor,
  getVisionOpacity,

  // Geometric utilities
  calculateDistance,
  isPointInVisionCone,
  isLineBlocked,
  lineSegmentsIntersect,

  // Types
  type VisionPolygon,
  type LightLevel,
} from './vision-calculations';

// ===========================
// Raycasting Engine
// ===========================

export {
  // Raycasting
  raycastToWalls,
  getAllRayIntersections,
  lineSegmentIntersection,
  sortPointsByAngle,
  sortEndpointsByAngle,
  removeDuplicatePoints,

  // Advanced raycasting
  raycastCone,
  isInShadow,
  calculateReflection,

  // Types
  type Ray,
  type LineSegment,
  type RayIntersection,
  type VisionEndpoint,
} from './raycasting';

// ===========================
// Spatial Partitioning
// ===========================

export {
  // QuadTree
  QuadTree,
  buildQuadTree,

  // Utilities
  calculateWallBounds,
  createBoundsFromRadius,
  expandBounds,
  boundsContainsPoint,
  mergeBounds,

  // Types
  type AABB,
  type QuadTreeNode,
  type QuadTreeConfig,
} from './spatial-partitioning';

// ===========================
// Web Worker Manager
// ===========================

export {
  // Manager
  VisionWorkerManager,

  // Convenience functions
  calculateVisionAsync,
  calculateMultiVisionAsync,
  updateVisionWalls,
  clearVisionCache,
} from './vision-worker-manager';

// ===========================
// Lighting Integration
// ===========================

export {
  // Light calculations
  calculateLightPolygon,
  calculateShadows,
  calculateAmbientOcclusion,
  calculateSceneLighting,
  isPointInLight,

  // Types
  type LightPolygon,
  type ShadowSegment,
  type LightingResult,
} from './lighting-integration';

// ===========================
// React Components
// ===========================

export {
  // Components
  VisionPolygon,
  FogOfWarMask,
  VisionBoundary,

  // Hook
  useVisionPolygon,
} from '@/components/battle-map/VisionPolygon';

// ===========================
// Usage Examples
// ===========================

/**
 * Quick Start Example
 *
 * @example
 * ```tsx
 * import { VisionPolygon, buildQuadTree, VisionWorkerManager } from '@/utils/vision-system-index';
 *
 * // Basic usage
 * function BattleMap({ token, walls }) {
 *   return (
 *     <svg width="2000" height="2000">
 *       <VisionPolygon tokens={token} walls={walls} />
 *     </svg>
 *   );
 * }
 *
 * // Optimized usage
 * function OptimizedMap({ tokens, walls }) {
 *   const quadTree = useMemo(() => buildQuadTree(walls), [walls]);
 *
 *   return (
 *     <svg width="2000" height="2000">
 *       <VisionPolygon
 *         tokens={tokens}
 *         walls={walls}
 *         useWorker={true}
 *       />
 *     </svg>
 *   );
 * }
 *
 * // Async calculation
 * async function calculateVision(token, walls) {
 *   const manager = VisionWorkerManager.getInstance();
 *   await manager.initialize();
 *
 *   const polygon = await manager.calculateVision(token, walls);
 *   return polygon;
 * }
 * ```
 */

// ===========================
// Re-export Types
// ===========================

export type { Token } from '@/types/token';
export type { VisionBlocker, Point2D } from '@/types/scene';
