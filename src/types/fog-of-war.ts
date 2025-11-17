/**
 * Fog of War Types
 *
 * Type definitions for fog of war system.
 *
 * @module types/fog-of-war
 */

import type { Point2D } from './scene';

/**
 * A revealed area polygon
 */
export interface RevealedArea {
  id: string;
  points: Point2D[];
  revealedAt: string;
  revealedBy?: string;
  isPermanent: boolean;
}

/**
 * Input type for revealing a new area
 */
export interface RevealAreaInput {
  points: Point2D[];
  revealedBy?: string;
  isPermanent?: boolean;
}

/**
 * Fog state for a point
 */
export type FogState = 'revealed' | 'dim' | 'dark';

/**
 * Fog brush mode
 */
export type FogBrushMode = 'reveal' | 'conceal';

/**
 * Fog brush tool settings
 */
export interface FogBrushSettings {
  mode: FogBrushMode;
  radius: number;
  isPermanent: boolean;
}
