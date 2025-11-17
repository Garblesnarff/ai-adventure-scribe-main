/**
 * Vision Worker Manager
 *
 * Manages the lifecycle of the vision calculation Web Worker and provides
 * a clean API for calculating vision polygons off the main thread.
 *
 * @module utils/vision-worker-manager
 */

import type { Token } from '@/types/token';
import type { VisionBlocker } from '@/types/scene';
import type { VisionPolygon } from '@/utils/vision-calculations';
import type {
  VisionWorkerMessage,
  VisionWorkerResponse,
} from '@/workers/vision-worker';

// ===========================
// Types
// ===========================

interface PendingRequest {
  resolve: (polygon: VisionPolygon) => void;
  reject: (error: Error) => void;
}

interface MultiPendingRequest {
  resolve: (polygons: Map<string, VisionPolygon>) => void;
  reject: (error: Error) => void;
}

// ===========================
// Vision Worker Manager Class
// ===========================

/**
 * Singleton manager for vision calculation worker
 *
 * Handles worker creation, message passing, request tracking, and cleanup.
 *
 * @example
 * ```ts
 * const manager = VisionWorkerManager.getInstance();
 * const polygon = await manager.calculateVision(token, walls);
 * ```
 */
export class VisionWorkerManager {
  private static instance: VisionWorkerManager | null = null;

  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private pendingMultiRequests = new Map<string, MultiPendingRequest>();
  private isInitialized = false;
  private initializationError: Error | null = null;

  // Performance tracking
  private stats = {
    totalRequests: 0,
    totalCalculations: 0,
    cacheHits: 0,
    averageTime: 0,
  };

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): VisionWorkerManager {
    if (!VisionWorkerManager.instance) {
      VisionWorkerManager.instance = new VisionWorkerManager();
    }
    return VisionWorkerManager.instance;
  }

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof Worker === 'undefined') {
      this.initializationError = new Error('Web Workers not supported in this environment');
      throw this.initializationError;
    }

    try {
      // Create worker
      this.worker = new Worker(
        new URL('../workers/vision-worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      this.worker.onmessage = this.handleMessage.bind(this);

      // Set up error handler
      this.worker.onerror = (error) => {
        console.error('Vision worker error:', error);
        this.initializationError = new Error(`Worker error: ${error.message}`);
      };

      this.isInitialized = true;
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error('Failed to initialize worker');
      throw this.initializationError;
    }
  }

  /**
   * Calculate vision polygon for a single token
   *
   * @param token - Token to calculate vision for
   * @param walls - Vision blocking walls
   * @param range - Optional vision range override
   * @returns Promise resolving to vision polygon
   */
  async calculateVision(
    token: Token,
    walls: VisionBlocker[],
    range?: number
  ): Promise<VisionPolygon> {
    await this.ensureInitialized();

    const requestId = `req-${++this.requestId}`;
    this.stats.totalRequests++;

    return new Promise<VisionPolygon>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      const message: VisionWorkerMessage = {
        type: 'CALCULATE_VISION',
        payload: { token, walls, range },
        requestId,
      };

      this.worker!.postMessage(message);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Vision calculation timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Calculate vision polygons for multiple tokens in parallel
   *
   * @param tokens - Tokens to calculate vision for
   * @param walls - Vision blocking walls
   * @param range - Optional vision range override
   * @returns Promise resolving to map of token IDs to vision polygons
   */
  async calculateMultiVision(
    tokens: Token[],
    walls: VisionBlocker[],
    range?: number
  ): Promise<Map<string, VisionPolygon>> {
    await this.ensureInitialized();

    const requestId = `multi-req-${++this.requestId}`;
    this.stats.totalRequests++;

    return new Promise<Map<string, VisionPolygon>>((resolve, reject) => {
      this.pendingMultiRequests.set(requestId, { resolve, reject });

      const message: VisionWorkerMessage = {
        type: 'CALCULATE_MULTI_VISION',
        payload: { tokens, walls, range },
        requestId,
      };

      this.worker!.postMessage(message);

      // Timeout after 10 seconds for multi-token calculations
      setTimeout(() => {
        if (this.pendingMultiRequests.has(requestId)) {
          this.pendingMultiRequests.delete(requestId);
          reject(new Error('Multi-vision calculation timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Update walls in worker and clear cache
   *
   * Call this whenever walls change to invalidate cached calculations
   *
   * @param walls - Updated wall list
   */
  updateWalls(walls: VisionBlocker[]): void {
    if (!this.isInitialized || !this.worker) return;

    const message: VisionWorkerMessage = {
      type: 'UPDATE_WALLS',
      payload: { walls },
    };

    this.worker.postMessage(message);
  }

  /**
   * Clear vision cache in worker
   */
  clearCache(): void {
    if (!this.isInitialized || !this.worker) return;

    const message: VisionWorkerMessage = {
      type: 'CLEAR_CACHE',
    };

    this.worker.postMessage(message);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalCalculations: 0,
      cacheHits: 0,
      averageTime: 0,
    };
  }

  /**
   * Terminate the worker and clean up
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.pendingRequests.clear();
    this.pendingMultiRequests.clear();
  }

  /**
   * Restart the worker
   */
  async restart(): Promise<void> {
    this.terminate();
    this.initializationError = null;
    await this.initialize();
  }

  // ===========================
  // Private Methods
  // ===========================

  private async ensureInitialized(): Promise<void> {
    if (this.initializationError) {
      throw this.initializationError;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private handleMessage(event: MessageEvent<VisionWorkerResponse>): void {
    const response = event.data;

    switch (response.type) {
      case 'VISION_RESULT': {
        const request = this.pendingRequests.get(response.requestId);
        if (request) {
          request.resolve(response.payload.polygon);
          this.pendingRequests.delete(response.requestId);
          this.stats.totalCalculations++;
        }
        break;
      }

      case 'MULTI_VISION_RESULT': {
        const request = this.pendingMultiRequests.get(response.requestId);
        if (request) {
          // Convert plain object back to Map
          const polygonsMap = new Map<string, VisionPolygon>();
          const polygonsObj = response.payload.polygons as any;

          for (const [key, value] of Object.entries(polygonsObj)) {
            polygonsMap.set(key, value as VisionPolygon);
          }

          request.resolve(polygonsMap);
          this.pendingMultiRequests.delete(response.requestId);
          this.stats.totalCalculations += polygonsMap.size;
        }
        break;
      }

      case 'ERROR': {
        const error = new Error(response.payload.error);

        // Reject pending request
        const request = this.pendingRequests.get(response.requestId);
        if (request) {
          request.reject(error);
          this.pendingRequests.delete(response.requestId);
        }

        const multiRequest = this.pendingMultiRequests.get(response.requestId);
        if (multiRequest) {
          multiRequest.reject(error);
          this.pendingMultiRequests.delete(response.requestId);
        }
        break;
      }
    }
  }
}

// ===========================
// Convenience Functions
// ===========================

/**
 * Calculate vision polygon (convenience function)
 */
export async function calculateVisionAsync(
  token: Token,
  walls: VisionBlocker[],
  range?: number
): Promise<VisionPolygon> {
  const manager = VisionWorkerManager.getInstance();
  return manager.calculateVision(token, walls, range);
}

/**
 * Calculate multiple vision polygons (convenience function)
 */
export async function calculateMultiVisionAsync(
  tokens: Token[],
  walls: VisionBlocker[],
  range?: number
): Promise<Map<string, VisionPolygon>> {
  const manager = VisionWorkerManager.getInstance();
  return manager.calculateMultiVision(tokens, walls, range);
}

/**
 * Update walls and invalidate cache (convenience function)
 */
export function updateVisionWalls(walls: VisionBlocker[]): void {
  const manager = VisionWorkerManager.getInstance();
  manager.updateWalls(walls);
}

/**
 * Clear vision cache (convenience function)
 */
export function clearVisionCache(): void {
  const manager = VisionWorkerManager.getInstance();
  manager.clearCache();
}

// ===========================
// Default Export
// ===========================

export default VisionWorkerManager;
