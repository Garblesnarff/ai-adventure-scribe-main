/**
 * Token Sizing Utilities
 *
 * Helper functions for calculating token dimensions and scales based on
 * TokenSize enum and grid size. Used by token rendering components to
 * position and size tokens correctly on the battle map.
 *
 * @module utils/token-sizing
 */

import { TokenSize, tokenSizeToGridSquares } from '@/types/token';

/**
 * Token dimensions in grid squares
 */
export interface TokenDimensions {
  /** Width in grid squares */
  width: number;
  /** Height in grid squares */
  height: number;
  /** Width in pixels (world units) */
  pixelWidth: number;
  /** Height in pixels (world units) */
  pixelHeight: number;
}

/**
 * Get token dimensions based on size and grid settings
 *
 * @param tokenSize - The size category of the token (tiny, small, medium, etc.)
 * @param gridSize - Size of one grid square in pixels/world units
 * @param customWidth - Optional custom width override in grid squares
 * @param customHeight - Optional custom height override in grid squares
 * @returns Token dimensions in both grid squares and pixels
 *
 * @example
 * ```ts
 * const dims = getTokenDimensions(TokenSize.LARGE, 100);
 * // Returns: { width: 2, height: 2, pixelWidth: 200, pixelHeight: 200 }
 * ```
 */
export function getTokenDimensions(
  tokenSize: TokenSize,
  gridSize: number,
  customWidth?: number,
  customHeight?: number
): TokenDimensions {
  // Use custom dimensions if provided, otherwise use size-based defaults
  const gridSquares = tokenSizeToGridSquares[tokenSize];
  const width = customWidth ?? gridSquares;
  const height = customHeight ?? gridSquares;

  return {
    width,
    height,
    pixelWidth: width * gridSize,
    pixelHeight: height * gridSize,
  };
}

/**
 * Get scale multiplier for a token size
 *
 * Used for scaling token visual elements (borders, nameplates, etc.)
 * relative to the base medium size.
 *
 * @param tokenSize - The size category of the token
 * @returns Scale multiplier (1.0 = medium size)
 *
 * @example
 * ```ts
 * const scale = getTokenScale(TokenSize.HUGE);
 * // Returns: 3.0
 * ```
 */
export function getTokenScale(tokenSize: TokenSize): number {
  return tokenSizeToGridSquares[tokenSize];
}

/**
 * Center a token on a grid cell
 *
 * Converts grid coordinates (cell indices) to world coordinates (pixels)
 * and centers the token based on its size.
 *
 * @param gridX - Grid X coordinate (cell index)
 * @param gridY - Grid Y coordinate (cell index)
 * @param tokenSize - The size category of the token
 * @param gridSize - Size of one grid square in pixels
 * @returns Position in world coordinates (pixels) where token should be centered
 *
 * @example
 * ```ts
 * // Place a large token (2x2) at grid cell (5, 5)
 * const pos = centerTokenOnGrid(5, 5, TokenSize.LARGE, 100);
 * // Returns: { x: 550, y: 550 }
 * // (5 cells + 0.5 offset for centering a 2x2 token = 5.5 * 100)
 * ```
 */
export function centerTokenOnGrid(
  gridX: number,
  gridY: number,
  tokenSize: TokenSize,
  gridSize: number
): { x: number; y: number } {
  const gridSquares = tokenSizeToGridSquares[tokenSize];

  // For tokens larger than 1x1, we need to offset to center them
  // A 2x2 token should be offset by 0.5 squares, a 3x3 by 1 square, etc.
  const offset = (gridSquares - 1) / 2;

  return {
    x: (gridX + offset) * gridSize,
    y: (gridY + offset) * gridSize,
  };
}

/**
 * Convert pixel coordinates to grid coordinates
 *
 * @param pixelX - X coordinate in pixels
 * @param pixelY - Y coordinate in pixels
 * @param gridSize - Size of one grid square in pixels
 * @returns Grid cell coordinates (floored to nearest cell)
 *
 * @example
 * ```ts
 * const gridPos = pixelToGrid(550, 550, 100);
 * // Returns: { x: 5, y: 5 }
 * ```
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  gridSize: number
): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / gridSize),
    y: Math.floor(pixelY / gridSize),
  };
}

/**
 * Snap pixel coordinates to nearest grid cell center
 *
 * @param pixelX - X coordinate in pixels
 * @param pixelY - Y coordinate in pixels
 * @param tokenSize - The size category of the token
 * @param gridSize - Size of one grid square in pixels
 * @returns Snapped pixel coordinates centered on grid
 *
 * @example
 * ```ts
 * const snapped = snapToGrid(547, 553, TokenSize.MEDIUM, 100);
 * // Returns: { x: 550, y: 550 } (center of cell at grid 5,5)
 * ```
 */
export function snapToGrid(
  pixelX: number,
  pixelY: number,
  tokenSize: TokenSize,
  gridSize: number
): { x: number; y: number } {
  const gridPos = pixelToGrid(pixelX, pixelY, gridSize);
  return centerTokenOnGrid(gridPos.x, gridPos.y, tokenSize, gridSize);
}

/**
 * Calculate border width based on token size
 *
 * Larger tokens get proportionally thicker borders for better visibility
 *
 * @param tokenSize - The size category of the token
 * @param baseBorderWidth - Base border width for medium tokens (default: 0.05)
 * @returns Border width as fraction of grid size
 *
 * @example
 * ```ts
 * const borderWidth = getBorderWidth(TokenSize.HUGE, 0.05);
 * // Returns: 0.1 (doubled for huge tokens)
 * ```
 */
export function getBorderWidth(
  tokenSize: TokenSize,
  baseBorderWidth: number = 0.05
): number {
  const scale = getTokenScale(tokenSize);
  // Scale border width proportionally, but not linearly (use sqrt for better visual balance)
  return baseBorderWidth * Math.sqrt(scale);
}

/**
 * Get nameplate offset distance from token edge
 *
 * @param tokenSize - The size category of the token
 * @param gridSize - Size of one grid square in pixels
 * @returns Offset distance in pixels
 *
 * @example
 * ```ts
 * const offset = getNameplateOffset(TokenSize.LARGE, 100);
 * // Returns: 110 (token radius + padding)
 * ```
 */
export function getNameplateOffset(tokenSize: TokenSize, gridSize: number): number {
  const dimensions = getTokenDimensions(tokenSize, gridSize);
  // Offset is half the token height plus a small padding
  const padding = gridSize * 0.1;
  return dimensions.pixelHeight / 2 + padding;
}
