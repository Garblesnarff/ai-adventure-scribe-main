/**
 * Frustum Culling Utilities
 *
 * Implements frustum culling to avoid rendering objects outside the camera's view.
 * This significantly improves performance by skipping rendering for invisible objects.
 *
 * Features:
 * - Frustum calculation from camera
 * - Point, sphere, and box culling tests
 * - Batch culling for multiple objects
 * - Optimized visibility tests
 * - Support for various object types (tokens, drawings, effects)
 *
 * @module utils/performance/culling
 */

import * as THREE from 'three';

/**
 * Represents an object that can be culled
 */
export interface CullableObject {
  /** Unique identifier */
  id: string;
  /** Position in world space */
  position: { x: number; y: number; z?: number };
  /** Bounding radius (for sphere culling) */
  radius?: number;
  /** Bounding box (for box culling) */
  boundingBox?: {
    min: { x: number; y: number; z?: number };
    max: { x: number; y: number; z?: number };
  };
}

/**
 * Culling result for an object
 */
export interface CullingResult {
  /** Object ID */
  id: string;
  /** Whether the object is visible */
  isVisible: boolean;
  /** Distance from camera (optional) */
  distance?: number;
}

/**
 * Frustum Culler Class
 *
 * Manages frustum culling for scene objects to improve rendering performance.
 *
 * @example
 * ```ts
 * const culler = new FrustumCuller();
 *
 * // Update frustum from camera
 * culler.updateFromCamera(camera);
 *
 * // Test if token is visible
 * const isVisible = culler.isPointVisible(tokenPosition);
 * if (isVisible) {
 *   renderToken();
 * }
 * ```
 */
export class FrustumCuller {
  private frustum: THREE.Frustum;
  private projectionMatrix: THREE.Matrix4;
  private viewMatrix: THREE.Matrix4;
  private combinedMatrix: THREE.Matrix4;
  private cameraPosition: THREE.Vector3;

  /**
   * Create a new Frustum Culler
   */
  constructor() {
    this.frustum = new THREE.Frustum();
    this.projectionMatrix = new THREE.Matrix4();
    this.viewMatrix = new THREE.Matrix4();
    this.combinedMatrix = new THREE.Matrix4();
    this.cameraPosition = new THREE.Vector3();
  }

  /**
   * Update frustum from camera
   * Call this whenever the camera moves or when rendering a new frame
   *
   * @param camera - THREE.js camera
   */
  updateFromCamera(camera: THREE.Camera): void {
    // Update camera matrices
    camera.updateMatrixWorld(false);
    camera.updateProjectionMatrix();

    // Get view and projection matrices
    this.viewMatrix.copy(camera.matrixWorldInverse);
    this.projectionMatrix.copy(camera.projectionMatrix);

    // Combine matrices
    this.combinedMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);

    // Update frustum
    this.frustum.setFromProjectionMatrix(this.combinedMatrix);

    // Store camera position
    this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
  }

  /**
   * Update frustum from explicit matrices
   * Use when you have pre-calculated matrices
   *
   * @param projectionMatrix - Camera projection matrix
   * @param viewMatrix - Camera view matrix
   */
  updateFromMatrices(projectionMatrix: THREE.Matrix4, viewMatrix: THREE.Matrix4): void {
    this.projectionMatrix.copy(projectionMatrix);
    this.viewMatrix.copy(viewMatrix);
    this.combinedMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
    this.frustum.setFromProjectionMatrix(this.combinedMatrix);
  }

  /**
   * Test if a point is visible in the frustum
   *
   * @param position - Point position
   * @returns True if point is visible
   */
  isPointVisible(position: THREE.Vector3 | { x: number; y: number; z?: number }): boolean {
    const point = new THREE.Vector3(position.x, position.y, 'z' in position ? position.z ?? 0 : 0);
    return this.frustum.containsPoint(point);
  }

  /**
   * Test if a sphere is visible in the frustum
   * More accurate than point test for objects with size
   *
   * @param center - Sphere center
   * @param radius - Sphere radius
   * @returns True if sphere intersects frustum
   */
  isSphereVisible(
    center: THREE.Vector3 | { x: number; y: number; z?: number },
    radius: number
  ): boolean {
    const sphere = new THREE.Sphere(
      new THREE.Vector3(center.x, center.y, 'z' in center ? center.z ?? 0 : 0),
      radius
    );
    return this.frustum.intersectsSphere(sphere);
  }

  /**
   * Test if a box is visible in the frustum
   * Most accurate test but slightly slower
   *
   * @param min - Box minimum corner
   * @param max - Box maximum corner
   * @returns True if box intersects frustum
   */
  isBoxVisible(
    min: THREE.Vector3 | { x: number; y: number; z?: number },
    max: THREE.Vector3 | { x: number; y: number; z?: number }
  ): boolean {
    const box = new THREE.Box3(
      new THREE.Vector3(min.x, min.y, 'z' in min ? min.z ?? 0 : 0),
      new THREE.Vector3(max.x, max.y, 'z' in max ? max.z ?? 0 : 0)
    );
    return this.frustum.intersectsBox(box);
  }

  /**
   * Test if an object is visible
   * Automatically chooses the best culling method based on available data
   *
   * @param object - Cullable object
   * @returns True if object is visible
   */
  isObjectVisible(object: CullableObject): boolean {
    // Use box culling if bounding box is available (most accurate)
    if (object.boundingBox) {
      return this.isBoxVisible(object.boundingBox.min, object.boundingBox.max);
    }

    // Use sphere culling if radius is available
    if (object.radius !== undefined) {
      return this.isSphereVisible(object.position, object.radius);
    }

    // Fallback to point culling
    return this.isPointVisible(object.position);
  }

  /**
   * Calculate distance from camera to position
   *
   * @param position - Position to check
   * @returns Distance in world units
   */
  getDistanceFromCamera(position: THREE.Vector3 | { x: number; y: number; z?: number }): number {
    const point = new THREE.Vector3(position.x, position.y, 'z' in position ? position.z ?? 0 : 0);
    return this.cameraPosition.distanceTo(point);
  }

  /**
   * Batch cull multiple objects
   * More efficient than testing individually
   *
   * @param objects - Array of cullable objects
   * @param includeDistance - Whether to include distance in results
   * @returns Array of culling results
   */
  cullObjects(objects: CullableObject[], includeDistance: boolean = false): CullingResult[] {
    const results: CullingResult[] = [];

    for (const object of objects) {
      const isVisible = this.isObjectVisible(object);
      const result: CullingResult = {
        id: object.id,
        isVisible,
      };

      if (includeDistance && isVisible) {
        result.distance = this.getDistanceFromCamera(object.position);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get only visible objects from a batch
   *
   * @param objects - Array of cullable objects
   * @returns Array of visible object IDs
   */
  getVisibleObjects(objects: CullableObject[]): string[] {
    const visible: string[] = [];

    for (const object of objects) {
      if (this.isObjectVisible(object)) {
        visible.push(object.id);
      }
    }

    return visible;
  }

  /**
   * Get visible objects sorted by distance from camera
   *
   * @param objects - Array of cullable objects
   * @param ascending - Sort order (true = nearest first, false = farthest first)
   * @returns Array of visible object IDs sorted by distance
   */
  getVisibleObjectsSorted(objects: CullableObject[], ascending: boolean = true): string[] {
    const visibleWithDistance: Array<{ id: string; distance: number }> = [];

    for (const object of objects) {
      if (this.isObjectVisible(object)) {
        const distance = this.getDistanceFromCamera(object.position);
        visibleWithDistance.push({ id: object.id, distance });
      }
    }

    visibleWithDistance.sort((a, b) => (ascending ? a.distance - b.distance : b.distance - a.distance));

    return visibleWithDistance.map((item) => item.id);
  }

  /**
   * Get culling statistics
   *
   * @param objects - Array of cullable objects
   * @returns Statistics about visible/culled objects
   */
  getStatistics(objects: CullableObject[]): {
    total: number;
    visible: number;
    culled: number;
    cullRate: number;
  } {
    const visible = this.getVisibleObjects(objects);

    return {
      total: objects.length,
      visible: visible.length,
      culled: objects.length - visible.length,
      cullRate: objects.length > 0 ? (objects.length - visible.length) / objects.length : 0,
    };
  }

  /**
   * Get current frustum planes (for debugging)
   *
   * @returns Array of frustum planes
   */
  getFrustumPlanes(): THREE.Plane[] {
    return this.frustum.planes;
  }

  /**
   * Get current camera position (for debugging)
   *
   * @returns Camera position
   */
  getCameraPosition(): THREE.Vector3 {
    return this.cameraPosition.clone();
  }
}

/**
 * Helper function to create a cullable object from token data
 *
 * @param token - Token data
 * @param gridSize - Grid size in world units
 * @returns Cullable object
 */
export function createCullableFromToken(
  token: {
    id: string;
    positionX: number;
    positionY: number;
    elevation?: number;
    sizeWidth?: number;
    sizeHeight?: number;
  },
  gridSize: number = 1
): CullableObject {
  const width = (token.sizeWidth ?? 1) * gridSize;
  const height = (token.sizeHeight ?? 1) * gridSize;
  const radius = Math.max(width, height) / 2;

  return {
    id: token.id,
    position: {
      x: token.positionX,
      y: token.positionY,
      z: token.elevation ?? 0,
    },
    radius,
    boundingBox: {
      min: {
        x: token.positionX - width / 2,
        y: token.positionY - height / 2,
        z: (token.elevation ?? 0) - 0.1,
      },
      max: {
        x: token.positionX + width / 2,
        y: token.positionY + height / 2,
        z: (token.elevation ?? 0) + 0.1,
      },
    },
  };
}

/**
 * Helper function to create a cullable object from drawing data
 *
 * @param drawing - Drawing data
 * @returns Cullable object
 */
export function createCullableFromDrawing(drawing: {
  id: string;
  points: Array<{ x: number; y: number }>;
  strokeWidth?: number;
}): CullableObject {
  if (drawing.points.length === 0) {
    return {
      id: drawing.id,
      position: { x: 0, y: 0, z: 0 },
      radius: 0,
    };
  }

  // Calculate bounding box from points
  let minX = drawing.points[0].x;
  let minY = drawing.points[0].y;
  let maxX = drawing.points[0].x;
  let maxY = drawing.points[0].y;

  for (const point of drawing.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  // Add stroke width to bounding box
  const strokePadding = (drawing.strokeWidth ?? 1) / 2;
  minX -= strokePadding;
  minY -= strokePadding;
  maxX += strokePadding;
  maxY += strokePadding;

  // Calculate center and radius
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const radius = Math.sqrt(width * width + height * height) / 2;

  return {
    id: drawing.id,
    position: { x: centerX, y: centerY, z: 0 },
    radius,
    boundingBox: {
      min: { x: minX, y: minY, z: -0.1 },
      max: { x: maxX, y: maxY, z: 0.1 },
    },
  };
}

/**
 * Create a default frustum culler instance
 */
export const defaultFrustumCuller = new FrustumCuller();
