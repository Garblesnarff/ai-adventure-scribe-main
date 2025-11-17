/**
 * Level of Detail (LOD) Manager
 *
 * Manages rendering quality based on camera distance to optimize performance.
 * Reduces detail for distant objects and increases detail for nearby objects.
 *
 * Features:
 * - Automatic LOD level calculation based on distance
 * - Texture resolution switching
 * - Label visibility management
 * - Geometry simplification
 * - Configurable thresholds
 *
 * @module utils/performance/lod
 */

import * as THREE from 'three';

/**
 * LOD levels for rendering optimization
 */
export enum LODLevel {
  /** Full detail - closest objects */
  HIGH = 'high',
  /** Medium detail - mid-range objects */
  MEDIUM = 'medium',
  /** Low detail - distant objects */
  LOW = 'low',
  /** Minimal/no rendering - very distant objects */
  HIDDEN = 'hidden',
}

/**
 * Configuration for LOD thresholds
 */
export interface LODConfig {
  /** Distance threshold for high detail (in world units) */
  highThreshold: number;
  /** Distance threshold for medium detail (in world units) */
  mediumThreshold: number;
  /** Distance threshold for low detail (in world units) */
  lowThreshold: number;
  /** Distance beyond which objects are hidden (in world units) */
  hiddenThreshold: number;
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  highThreshold: 20,
  mediumThreshold: 50,
  lowThreshold: 100,
  hiddenThreshold: 200,
};

/**
 * LOD settings for a renderable object
 */
export interface LODSettings {
  /** Current LOD level */
  level: LODLevel;
  /** Whether to show labels at this LOD level */
  showLabels: boolean;
  /** Whether to show health bars at this LOD level */
  showHealthBars: boolean;
  /** Whether to show status icons at this LOD level */
  showStatusIcons: boolean;
  /** Whether to show particle effects at this LOD level */
  showParticles: boolean;
  /** Whether to show shadows at this LOD level */
  showShadows: boolean;
  /** Texture resolution multiplier (0.25, 0.5, 1.0) */
  textureResolution: number;
  /** Geometry detail multiplier (0.25, 0.5, 1.0) */
  geometryDetail: number;
}

/**
 * LOD Manager Class
 *
 * Manages level of detail for objects based on camera distance.
 *
 * @example
 * ```ts
 * const lodManager = new LODManager();
 *
 * // In render loop
 * const settings = lodManager.getLODSettings(tokenPosition, cameraPosition);
 * if (settings.showLabels) {
 *   renderLabel();
 * }
 * ```
 */
export class LODManager {
  private config: LODConfig;

  /**
   * Create a new LOD Manager
   * @param config - LOD configuration (optional)
   */
  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
  }

  /**
   * Update LOD configuration
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LODConfig {
    return { ...this.config };
  }

  /**
   * Calculate LOD level based on distance
   * @param distance - Distance from camera to object
   * @returns LOD level
   */
  calculateLODLevel(distance: number): LODLevel {
    if (distance < this.config.highThreshold) {
      return LODLevel.HIGH;
    } else if (distance < this.config.mediumThreshold) {
      return LODLevel.MEDIUM;
    } else if (distance < this.config.lowThreshold) {
      return LODLevel.LOW;
    } else if (distance < this.config.hiddenThreshold) {
      return LODLevel.HIDDEN;
    }
    return LODLevel.HIDDEN;
  }

  /**
   * Calculate distance between two Vector3 positions
   * @param positionA - First position
   * @param positionB - Second position
   * @returns Distance in world units
   */
  calculateDistance(
    positionA: THREE.Vector3 | { x: number; y: number; z?: number },
    positionB: THREE.Vector3 | { x: number; y: number; z?: number }
  ): number {
    const ax = positionA.x;
    const ay = positionA.y;
    const az = 'z' in positionA && positionA.z !== undefined ? positionA.z : 0;

    const bx = positionB.x;
    const by = positionB.y;
    const bz = 'z' in positionB && positionB.z !== undefined ? positionB.z : 0;

    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get LOD settings for an object based on camera distance
   * @param objectPosition - Position of the object
   * @param cameraPosition - Position of the camera
   * @returns LOD settings
   */
  getLODSettings(
    objectPosition: THREE.Vector3 | { x: number; y: number; z?: number },
    cameraPosition: THREE.Vector3 | { x: number; y: number; z?: number }
  ): LODSettings {
    const distance = this.calculateDistance(objectPosition, cameraPosition);
    const level = this.calculateLODLevel(distance);

    return this.getSettingsForLevel(level);
  }

  /**
   * Get LOD settings for a specific LOD level
   * @param level - LOD level
   * @returns LOD settings
   */
  getSettingsForLevel(level: LODLevel): LODSettings {
    switch (level) {
      case LODLevel.HIGH:
        return {
          level,
          showLabels: true,
          showHealthBars: true,
          showStatusIcons: true,
          showParticles: true,
          showShadows: true,
          textureResolution: 1.0,
          geometryDetail: 1.0,
        };

      case LODLevel.MEDIUM:
        return {
          level,
          showLabels: true,
          showHealthBars: true,
          showStatusIcons: true,
          showParticles: false,
          showShadows: true,
          textureResolution: 0.5,
          geometryDetail: 0.75,
        };

      case LODLevel.LOW:
        return {
          level,
          showLabels: false,
          showHealthBars: false,
          showStatusIcons: false,
          showParticles: false,
          showShadows: false,
          textureResolution: 0.25,
          geometryDetail: 0.5,
        };

      case LODLevel.HIDDEN:
        return {
          level,
          showLabels: false,
          showHealthBars: false,
          showStatusIcons: false,
          showParticles: false,
          showShadows: false,
          textureResolution: 0,
          geometryDetail: 0,
        };

      default:
        return this.getSettingsForLevel(LODLevel.MEDIUM);
    }
  }

  /**
   * Check if an object should be rendered at all
   * @param objectPosition - Position of the object
   * @param cameraPosition - Position of the camera
   * @returns True if object should be rendered
   */
  shouldRender(
    objectPosition: THREE.Vector3 | { x: number; y: number; z?: number },
    cameraPosition: THREE.Vector3 | { x: number; y: number; z?: number }
  ): boolean {
    const distance = this.calculateDistance(objectPosition, cameraPosition);
    return distance < this.config.hiddenThreshold;
  }

  /**
   * Get recommended texture size based on LOD level
   * @param level - LOD level
   * @param baseSize - Base texture size
   * @returns Recommended texture size
   */
  getTextureSize(level: LODLevel, baseSize: number = 512): number {
    const settings = this.getSettingsForLevel(level);
    return Math.max(64, Math.floor(baseSize * settings.textureResolution));
  }

  /**
   * Get recommended geometry segments based on LOD level
   * @param level - LOD level
   * @param baseSegments - Base segment count
   * @returns Recommended segment count
   */
  getGeometrySegments(level: LODLevel, baseSegments: number = 32): number {
    const settings = this.getSettingsForLevel(level);
    return Math.max(8, Math.floor(baseSegments * settings.geometryDetail));
  }

  /**
   * Batch calculate LOD levels for multiple objects
   * @param objects - Array of object positions
   * @param cameraPosition - Camera position
   * @returns Map of object index to LOD level
   */
  batchCalculateLOD(
    objects: Array<THREE.Vector3 | { x: number; y: number; z?: number }>,
    cameraPosition: THREE.Vector3 | { x: number; y: number; z?: number }
  ): Map<number, LODLevel> {
    const results = new Map<number, LODLevel>();

    for (let i = 0; i < objects.length; i++) {
      const distance = this.calculateDistance(objects[i], cameraPosition);
      const level = this.calculateLODLevel(distance);
      results.set(i, level);
    }

    return results;
  }

  /**
   * Get statistics about LOD distribution
   * @param lodLevels - Map of LOD levels
   * @returns Statistics object
   */
  getStatistics(lodLevels: Map<number, LODLevel>): {
    total: number;
    high: number;
    medium: number;
    low: number;
    hidden: number;
  } {
    const stats = {
      total: lodLevels.size,
      high: 0,
      medium: 0,
      low: 0,
      hidden: 0,
    };

    for (const level of lodLevels.values()) {
      switch (level) {
        case LODLevel.HIGH:
          stats.high++;
          break;
        case LODLevel.MEDIUM:
          stats.medium++;
          break;
        case LODLevel.LOW:
          stats.low++;
          break;
        case LODLevel.HIDDEN:
          stats.hidden++;
          break;
      }
    }

    return stats;
  }
}

/**
 * Create a default LOD manager instance
 */
export const defaultLODManager = new LODManager();
