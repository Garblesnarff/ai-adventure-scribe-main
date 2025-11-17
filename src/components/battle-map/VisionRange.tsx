/**
 * VisionRange Component
 *
 * Renders vision range indicators for tokens on the battle map.
 * Displays circular or conical vision ranges with color coding by vision type.
 *
 * @module components/battle-map/VisionRange
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Token } from '@/types/token';
import {
  calculateVisionRadius,
  getVisionColor,
  getVisionOpacity,
  getActiveVisionType,
} from '@/utils/vision-calculations';
import type { LightLevel } from '@/utils/vision-calculations';

/**
 * Props for VisionRange component
 */
export interface VisionRangeProps {
  /** The token whose vision to display */
  token: Token;
  /** Grid size in pixels */
  gridSize: number;
  /** Current light level at token position */
  lightLevel?: LightLevel;
  /** Whether to show the vision range (GM toggle) */
  visible?: boolean;
  /** Whether to show to all users or GM only */
  showToAll?: boolean;
  /** Current user is GM */
  isGM?: boolean;
  /** Opacity override */
  opacity?: number;
}

/**
 * VisionRange Component
 *
 * Displays a token's vision range as a circle or cone with color coding
 * based on the active vision type.
 *
 * Vision types and colors:
 * - Normal vision: soft white
 * - Darkvision: blue/purple
 * - Blindsight: yellow
 * - Tremorsense: brown
 * - Truesight: gold
 *
 * @example
 * ```tsx
 * <VisionRange
 *   token={token}
 *   gridSize={100}
 *   lightLevel="dim"
 *   visible={true}
 *   isGM={true}
 * />
 * ```
 */
export function VisionRange({
  token,
  gridSize,
  lightLevel = 'bright',
  visible = true,
  showToAll = false,
  isGM = false,
  opacity: opacityOverride,
}: VisionRangeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Only show if visible and (showToAll or isGM)
  const shouldShow = visible && (showToAll || isGM);

  // Calculate vision parameters
  const visionData = useMemo(() => {
    if (!token.vision.enabled) {
      return null;
    }

    const radius = calculateVisionRadius(token);
    if (radius === 0) {
      return null;
    }

    const visionType = getActiveVisionType(token, lightLevel);
    const color = getVisionColor(visionType);
    const baseOpacity = getVisionOpacity(visionType);

    // Convert feet to pixels (5ft = gridSize)
    const radiusInPixels = (radius / 5) * gridSize;

    return {
      radius: radiusInPixels,
      color,
      opacity: opacityOverride ?? baseOpacity,
      visionType,
      angle: token.vision.angle,
    };
  }, [token, gridSize, lightLevel, opacityOverride]);

  // Create gradient material for smooth fade at edges
  const material = useMemo(() => {
    if (!visionData) return null;

    // Create a radial gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    if (context) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width / 2;

      // Create radial gradient
      const gradient = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );

      gradient.addColorStop(0, `${visionData.color}ff`); // Full opacity at center
      gradient.addColorStop(0.7, `${visionData.color}88`); // Medium opacity at 70%
      gradient.addColorStop(0.95, `${visionData.color}22`); // Low opacity at 95%
      gradient.addColorStop(1, `${visionData.color}00`); // Transparent at edge

      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: visionData.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [visionData]);

  // Create geometry based on vision angle
  const geometry = useMemo(() => {
    if (!visionData) return null;

    const radius = visionData.radius;
    const angle = visionData.angle;

    // Full circle for 360° vision
    if (angle >= 360) {
      return new THREE.CircleGeometry(radius, 64);
    }

    // Cone/arc for limited vision
    const thetaStart = THREE.MathUtils.degToRad(-angle / 2);
    const thetaLength = THREE.MathUtils.degToRad(angle);

    return new THREE.CircleGeometry(radius, 64, thetaStart, thetaLength);
  }, [visionData]);

  if (!shouldShow || !visionData || !material || !geometry) {
    return null;
  }

  // Position at token location, slightly above grid
  const position: [number, number, number] = [
    token.x,
    token.y,
    0.05, // Slightly above grid to prevent z-fighting
  ];

  // Rotation to match token facing (for cone vision)
  const rotation: [number, number, number] = [
    0,
    0,
    THREE.MathUtils.degToRad(token.rotation),
  ];

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      material={material}
      geometry={geometry}
      renderOrder={1}
    />
  );
}

/**
 * MultiVisionRange Component
 *
 * Renders multiple vision ranges for tokens with multiple vision types.
 * For example, a token with both normal vision and darkvision shows two ranges.
 *
 * @example
 * ```tsx
 * <MultiVisionRange
 *   token={token}
 *   gridSize={100}
 *   visible={true}
 * />
 * ```
 */
export function MultiVisionRange({
  token,
  gridSize,
  visible = true,
  showToAll = false,
  isGM = false,
}: Omit<VisionRangeProps, 'lightLevel' | 'opacity'>) {
  const ranges = useMemo(() => {
    if (!token.vision.enabled) {
      return [];
    }

    const visionRanges: Array<{
      type: string;
      range: number;
      color: string;
      opacity: number;
    }> = [];

    // Normal vision
    if (token.vision.range > 0) {
      visionRanges.push({
        type: 'basic',
        range: token.vision.range,
        color: getVisionColor('basic'),
        opacity: getVisionOpacity('basic'),
      });
    }

    // Darkvision
    if (token.vision.darkvision && token.vision.darkvision > 0) {
      visionRanges.push({
        type: 'darkvision',
        range: token.vision.darkvision,
        color: getVisionColor('darkvision'),
        opacity: getVisionOpacity('darkvision'),
      });
    }

    // Blindsight
    if (token.vision.blindsight && token.vision.blindsight > 0) {
      visionRanges.push({
        type: 'blindsight',
        range: token.vision.blindsight,
        color: getVisionColor('blindsight'),
        opacity: getVisionOpacity('blindsight'),
      });
    }

    // Tremorsense
    if (token.vision.tremorsense && token.vision.tremorsense > 0) {
      visionRanges.push({
        type: 'tremorsense',
        range: token.vision.tremorsense,
        color: getVisionColor('tremorsense'),
        opacity: getVisionOpacity('tremorsense'),
      });
    }

    // Truesight
    if (token.vision.truesight && token.vision.truesight > 0) {
      visionRanges.push({
        type: 'truesight',
        range: token.vision.truesight,
        color: getVisionColor('truesight'),
        opacity: getVisionOpacity('truesight'),
      });
    }

    // Sort by range (largest first for proper layering)
    return visionRanges.sort((a, b) => b.range - a.range);
  }, [token]);

  if (!visible || ranges.length === 0) {
    return null;
  }

  return (
    <group name={`vision-ranges-${token.id}`}>
      {ranges.map((range, index) => {
        // Create a temporary token with specific vision config
        const tempToken: Token = {
          ...token,
          vision: {
            ...token.vision,
            range: range.range,
            visionMode: range.type as any,
          },
        };

        return (
          <VisionRange
            key={`${token.id}-${range.type}`}
            token={tempToken}
            gridSize={gridSize}
            visible={visible}
            showToAll={showToAll}
            isGM={isGM}
            opacity={range.opacity * (1 - index * 0.1)} // Reduce opacity for inner ranges
          />
        );
      })}
    </group>
  );
}

/**
 * VisionRangeToggle Component
 *
 * UI control for toggling vision range visibility (GM only).
 * This would typically be rendered outside the Canvas in a UI panel.
 */
export interface VisionRangeToggleProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
  showToAll: boolean;
  onShowToAllToggle: (showToAll: boolean) => void;
}

export function VisionRangeToggle({
  visible,
  onToggle,
  showToAll,
  onShowToAllToggle,
}: VisionRangeToggleProps) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-background/80 rounded-md border">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded"
        />
        <span>Show Vision Ranges</span>
      </label>
      {visible && (
        <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={showToAll}
            onChange={(e) => onShowToAllToggle(e.target.checked)}
            className="rounded"
          />
          <span>Show to All Players</span>
        </label>
      )}
    </div>
  );
}
