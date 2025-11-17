/**
 * TokenBorder Component
 *
 * Renders a border/ring around tokens to indicate disposition, selection, and targeting states.
 * Supports different colors, thicknesses, and animations.
 *
 * @module components/battle-map/TokenBorder
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TokenDisposition } from '@/types/token';

// ===========================
// Constants
// ===========================

/**
 * Disposition colors for token borders
 */
const DISPOSITION_COLORS: Record<TokenDisposition, string> = {
  [TokenDisposition.FRIENDLY]: '#00ff00', // Green
  [TokenDisposition.NEUTRAL]: '#ffff00', // Yellow
  [TokenDisposition.HOSTILE]: '#ff0000', // Red
  [TokenDisposition.SECRET]: '#9900ff', // Purple (GM only)
};

/**
 * Selection state colors
 */
const SELECTION_COLOR = '#00bfff'; // Deep sky blue
const TARGETED_COLOR = '#ff00ff'; // Magenta
const HOVER_COLOR = '#ffffff'; // White

// ===========================
// Props Interface
// ===========================

export interface TokenBorderProps {
  /** Size (diameter/width) of the token */
  size: number;
  /** Whether the token is circular or square */
  circular?: boolean;
  /** Token disposition (friendly/neutral/hostile) */
  disposition: TokenDisposition;
  /** Whether the token is selected */
  isSelected?: boolean;
  /** Whether the token is targeted */
  isTargeted?: boolean;
  /** Whether the token is hovered */
  isHovered?: boolean;
  /** Base border width (multiplied by state) */
  borderWidth?: number;
  /** Z-position offset */
  zOffset?: number;
  /** Override border color */
  color?: string;
}

// ===========================
// Component
// ===========================

/**
 * TokenBorder Component
 *
 * Renders a colored border around tokens with support for selection,
 * targeting, and hover states. Includes pulsing animation for targeted tokens.
 *
 * @example
 * ```tsx
 * <TokenBorder
 *   size={100}
 *   circular={true}
 *   disposition={TokenDisposition.FRIENDLY}
 *   isSelected={true}
 *   borderWidth={0.05}
 * />
 * ```
 */
export const TokenBorder: React.FC<TokenBorderProps> = ({
  size,
  circular = true,
  disposition,
  isSelected = false,
  isTargeted = false,
  isHovered = false,
  borderWidth = 0.05,
  zOffset = 0.01,
  color,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulsePhase = useRef(0);

  // Determine border color based on state priority
  const borderColor = useMemo(() => {
    if (color) return color;
    if (isSelected) return SELECTION_COLOR;
    if (isTargeted) return TARGETED_COLOR;
    if (isHovered) return HOVER_COLOR;
    return DISPOSITION_COLORS[disposition];
  }, [color, isSelected, isTargeted, isHovered, disposition]);

  // Determine border thickness based on state
  const thickness = useMemo(() => {
    let multiplier = 1;
    if (isSelected) multiplier = 2;
    else if (isTargeted) multiplier = 1.8;
    else if (isHovered) multiplier = 1.3;
    return size * borderWidth * multiplier;
  }, [size, borderWidth, isSelected, isTargeted, isHovered]);

  // Create border geometry
  const geometry = useMemo(() => {
    if (circular) {
      // Use RingGeometry for circular tokens
      const radius = size / 2;
      const innerRadius = radius - thickness;
      return new THREE.RingGeometry(innerRadius, radius, 64);
    } else {
      // Create square border using line segments or shape
      const halfSize = size / 2;
      const innerHalfSize = halfSize - thickness;

      // Create a shape with outer and inner rectangles
      const shape = new THREE.Shape();

      // Outer rectangle
      shape.moveTo(-halfSize, -halfSize);
      shape.lineTo(halfSize, -halfSize);
      shape.lineTo(halfSize, halfSize);
      shape.lineTo(-halfSize, halfSize);
      shape.lineTo(-halfSize, -halfSize);

      // Inner rectangle (hole)
      const hole = new THREE.Path();
      hole.moveTo(-innerHalfSize, -innerHalfSize);
      hole.lineTo(-innerHalfSize, innerHalfSize);
      hole.lineTo(innerHalfSize, innerHalfSize);
      hole.lineTo(innerHalfSize, -innerHalfSize);
      hole.lineTo(-innerHalfSize, -innerHalfSize);
      shape.holes.push(hole);

      return new THREE.ShapeGeometry(shape);
    }
  }, [size, thickness, circular]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Animate targeted tokens with pulsing effect
  useFrame((state, delta) => {
    if (!isTargeted || !meshRef.current) return;

    // Update pulse phase
    pulsePhase.current += delta * 3; // 3 = pulse speed
    if (pulsePhase.current > Math.PI * 2) {
      pulsePhase.current -= Math.PI * 2;
    }

    // Pulse opacity between 0.6 and 1.0
    const opacity = 0.6 + Math.sin(pulsePhase.current) * 0.4;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
  });

  // Determine opacity based on state
  const baseOpacity = useMemo(() => {
    if (isTargeted) return 0.8; // Will be animated
    if (isSelected) return 0.9;
    if (isHovered) return 0.7;
    return 0.6;
  }, [isSelected, isTargeted, isHovered]);

  return (
    <mesh ref={meshRef} position={[0, 0, zOffset]} geometry={geometry}>
      <meshBasicMaterial
        color={borderColor}
        transparent
        opacity={baseOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * TokenGlow Component
 *
 * Adds a glowing effect around tokens for enhanced selection/hover feedback.
 * Renders as a larger, semi-transparent ring behind the border.
 *
 * @example
 * ```tsx
 * <TokenGlow
 *   size={100}
 *   circular={true}
 *   color="#00bfff"
 *   intensity={0.5}
 * />
 * ```
 */
export interface TokenGlowProps {
  /** Size (diameter/width) of the token */
  size: number;
  /** Whether the token is circular or square */
  circular?: boolean;
  /** Glow color */
  color: string;
  /** Glow intensity (0-1) */
  intensity?: number;
  /** Glow expansion beyond token size */
  glowSize?: number;
  /** Z-position offset (should be behind border) */
  zOffset?: number;
}

export const TokenGlow: React.FC<TokenGlowProps> = ({
  size,
  circular = true,
  color,
  intensity = 0.5,
  glowSize = 0.15,
  zOffset = -0.01,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulsePhase = useRef(0);

  // Create glow geometry
  const geometry = useMemo(() => {
    const expandedSize = size * (1 + glowSize);

    if (circular) {
      return new THREE.CircleGeometry(expandedSize / 2, 64);
    } else {
      return new THREE.PlaneGeometry(expandedSize, expandedSize);
    }
  }, [size, glowSize, circular]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Animate glow with subtle pulsing
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    pulsePhase.current += delta * 2;
    if (pulsePhase.current > Math.PI * 2) {
      pulsePhase.current -= Math.PI * 2;
    }

    // Gentle pulse between 0.8 and 1.0 of base intensity
    const opacity = intensity * (0.8 + Math.sin(pulsePhase.current) * 0.2);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, zOffset]} geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={intensity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

/**
 * MultiLayerBorder Component
 *
 * Renders multiple borders for complex states (e.g., selected AND targeted).
 * Displays both disposition border and state borders.
 *
 * @example
 * ```tsx
 * <MultiLayerBorder
 *   size={100}
 *   circular={true}
 *   disposition={TokenDisposition.HOSTILE}
 *   isSelected={true}
 *   isTargeted={true}
 * />
 * ```
 */
export interface MultiLayerBorderProps {
  size: number;
  circular?: boolean;
  disposition: TokenDisposition;
  isSelected?: boolean;
  isTargeted?: boolean;
  isHovered?: boolean;
  borderWidth?: number;
}

export const MultiLayerBorder: React.FC<MultiLayerBorderProps> = ({
  size,
  circular = true,
  disposition,
  isSelected = false,
  isTargeted = false,
  isHovered = false,
  borderWidth = 0.05,
}) => {
  // If only one state is active, use single border
  const activeStates = [isSelected, isTargeted, isHovered].filter(Boolean).length;

  if (activeStates <= 1) {
    return (
      <>
        <TokenBorder
          size={size}
          circular={circular}
          disposition={disposition}
          isSelected={isSelected}
          isTargeted={isTargeted}
          isHovered={isHovered}
          borderWidth={borderWidth}
        />
        {isSelected && (
          <TokenGlow
            size={size}
            circular={circular}
            color={SELECTION_COLOR}
            intensity={0.4}
          />
        )}
      </>
    );
  }

  // Multiple states - show layered borders
  return (
    <>
      {/* Base disposition border */}
      <TokenBorder
        size={size}
        circular={circular}
        disposition={disposition}
        borderWidth={borderWidth}
        zOffset={0.01}
      />

      {/* Selection border (outer) */}
      {isSelected && (
        <>
          <TokenBorder
            size={size * 1.1}
            circular={circular}
            disposition={disposition}
            color={SELECTION_COLOR}
            borderWidth={borderWidth * 0.8}
            zOffset={0.02}
          />
          <TokenGlow
            size={size}
            circular={circular}
            color={SELECTION_COLOR}
            intensity={0.4}
            zOffset={-0.01}
          />
        </>
      )}

      {/* Targeted border (middle) */}
      {isTargeted && (
        <TokenBorder
          size={size * 1.05}
          circular={circular}
          disposition={disposition}
          color={TARGETED_COLOR}
          isTargeted={true}
          borderWidth={borderWidth * 0.6}
          zOffset={0.03}
        />
      )}
    </>
  );
};
