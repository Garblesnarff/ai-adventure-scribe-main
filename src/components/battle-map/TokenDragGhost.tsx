/**
 * Token Drag Ghost
 *
 * Semi-transparent preview of a token being dragged.
 * Shows valid/invalid drop zones with colored outlines.
 * Snaps to grid to preview final placement.
 *
 * Features:
 * - Semi-transparent token during drag
 * - Green outline for valid drop zones
 * - Red outline for invalid drop zones
 * - Smooth fade in/out animations
 * - Grid-snapped position preview
 */

import * as React from 'react';
import { useSpring, animated } from '@react-spring/three';
import type { Token } from '@/types/token';
import type { Point2D } from '@/types/scene';

export interface TokenDragGhostProps {
  /** The token being dragged */
  token: Token;
  /** Current drag position (snapped to grid) */
  position: Point2D;
  /** Whether the current position is valid for dropping */
  isValidDrop: boolean;
  /** Whether the ghost should be visible */
  visible: boolean;
  /** Grid size for scaling */
  gridSize: number;
  /** Opacity of the ghost (0-1) */
  opacity?: number;
}

/**
 * Drag ghost component for React Three Fiber
 */
export function TokenDragGhost({
  token,
  position,
  isValidDrop,
  visible,
  gridSize,
  opacity = 0.6,
}: TokenDragGhostProps) {
  // Animate opacity and scale on appearance
  const springs = useSpring({
    opacity: visible ? opacity : 0,
    scale: visible ? 1 : 0.8,
    config: { tension: 300, friction: 20 },
  });

  // Calculate token size in pixels
  const tokenWidth = token.width * gridSize;
  const tokenHeight = token.height * gridSize;

  // Outline color based on validity
  const outlineColor = isValidDrop ? '#22c55e' : '#ef4444'; // green-500 : red-500

  if (!visible) {
    return null;
  }

  return (
    <animated.group
      position={[position.x, position.y, 0.1]} // Slightly elevated
      scale={springs.scale}
    >
      {/* Token image */}
      <mesh>
        <planeGeometry args={[tokenWidth, tokenHeight]} />
        <animated.meshBasicMaterial
          map={null} // TODO: Load token texture
          transparent
          opacity={springs.opacity}
        />
      </mesh>

      {/* Outline ring */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[tokenWidth / 2 - 2, tokenWidth / 2, 32]} />
        <animated.meshBasicMaterial
          color={outlineColor}
          transparent
          opacity={springs.opacity.to((o) => o * 0.8)}
        />
      </mesh>

      {/* Glow effect for valid drop */}
      {isValidDrop && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[tokenWidth + 10, tokenHeight + 10]} />
          <animated.meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={springs.opacity.to((o) => o * 0.2)}
          />
        </mesh>
      )}
    </animated.group>
  );
}

/**
 * Alternative 2D DOM-based drag ghost (for non-Three.js implementations)
 */
export interface TokenDragGhost2DProps {
  /** The token being dragged */
  token: Token;
  /** Current drag position in screen coordinates */
  position: Point2D;
  /** Whether the current position is valid for dropping */
  isValidDrop: boolean;
  /** Whether the ghost should be visible */
  visible: boolean;
  /** Opacity of the ghost (0-1) */
  opacity?: number;
}

/**
 * 2D DOM-based drag ghost for simpler implementations
 */
export function TokenDragGhost2D({
  token,
  position,
  isValidDrop,
  visible,
  opacity = 0.6,
}: TokenDragGhost2DProps) {
  if (!visible) {
    return null;
  }

  const outlineColor = isValidDrop ? 'border-green-500' : 'border-red-500';

  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-all duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        opacity: visible ? opacity : 0,
      }}
    >
      <div
        className={`relative rounded-full border-4 ${outlineColor} shadow-lg transition-all`}
        style={{
          width: `${token.width * 50}px`, // Approximate size
          height: `${token.height * 50}px`,
        }}
      >
        {/* Token image */}
        <img
          src={token.imageUrl}
          alt={token.name}
          className="h-full w-full rounded-full object-cover"
          draggable={false}
        />

        {/* Glow effect */}
        {isValidDrop && (
          <div
            className="absolute inset-0 -z-10 animate-pulse rounded-full bg-green-500/20 blur-md"
            style={{
              width: '110%',
              height: '110%',
              left: '-5%',
              top: '-5%',
            }}
          />
        )}
      </div>

      {/* Distance indicator (optional) */}
      <div className="mt-2 text-center text-xs font-medium text-white drop-shadow-lg">
        {token.name}
      </div>
    </div>
  );
}

/**
 * Grid snap preview overlay (for showing where the token will land)
 */
export interface GridSnapPreviewProps {
  position: Point2D;
  gridSize: number;
  tokenWidth: number;
  tokenHeight: number;
  isValid: boolean;
  visible: boolean;
}

/**
 * Shows a grid-aligned preview of where the token will snap to
 */
export function GridSnapPreview({
  position,
  gridSize,
  tokenWidth,
  tokenHeight,
  isValid,
  visible,
}: GridSnapPreviewProps) {
  if (!visible) {
    return null;
  }

  const width = tokenWidth * gridSize;
  const height = tokenHeight * gridSize;
  const fillColor = isValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'; // green/red with transparency
  const strokeColor = isValid ? '#22c55e' : '#ef4444';

  return (
    <mesh position={[position.x, position.y, 0.05]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={fillColor} transparent opacity={0.3} />
      {/* Border */}
      <lineSegments>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.PlaneGeometry(width, height)]}
        />
        <lineBasicMaterial attach="material" color={strokeColor} linewidth={2} />
      </lineSegments>
    </mesh>
  );
}

// Export all variants
export default TokenDragGhost;
