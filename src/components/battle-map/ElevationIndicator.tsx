/**
 * ElevationIndicator Component
 *
 * Displays elevation for flying, levitating, or climbing tokens.
 * Shows visual indicators including shadows, elevation text, and connecting lines.
 *
 * Supports different rendering styles for:
 * - Flying creatures
 * - Levitating characters
 * - Climbing tokens
 * - Underwater/swimming
 * - Falling
 *
 * @module components/battle-map/ElevationIndicator
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// ===========================
// Types
// ===========================

/**
 * Elevation display mode
 */
export enum ElevationMode {
  FLYING = 'flying', // Flying creature
  LEVITATING = 'levitating', // Magical levitation
  CLIMBING = 'climbing', // Climbing on wall/surface
  SWIMMING = 'swimming', // Swimming/underwater
  FALLING = 'falling', // Currently falling
  BURROWING = 'burrowing', // Underground
}

/**
 * Shadow style
 */
export enum ShadowStyle {
  CIRCLE = 'circle', // Simple circular shadow
  GRADIENT = 'gradient', // Gradient shadow (realistic)
  NONE = 'none', // No shadow
}

/**
 * Props for ElevationIndicator component
 */
export interface ElevationIndicatorProps {
  /** Position of the token at ground level */
  groundPosition: [number, number, number];

  /** Elevation in feet */
  elevationFeet: number;

  /** Elevation mode */
  mode?: ElevationMode;

  /** Shadow style */
  shadowStyle?: ShadowStyle;

  /** Token size (for scaling shadow) */
  tokenSize?: number;

  /** Whether to show elevation text */
  showText?: boolean;

  /** Whether to show connecting line */
  showLine?: boolean;

  /** Custom color for indicator */
  color?: string;

  /** Font size for elevation text */
  fontSize?: number;

  /** Whether to animate the indicator */
  animated?: boolean;
}

// ===========================
// Constants
// ===========================

const FEET_TO_WORLD_SCALE = 0.2; // 1 foot = 0.2 world units (5ft grid square = 1 unit)
const MIN_ELEVATION_TO_SHOW = 5; // Don't show indicator below 5 feet
const SHADOW_OPACITY_BASE = 0.4;
const SHADOW_SIZE_BASE = 1.0;
const LINE_DASH_SPEED = 2.0;

// ===========================
// Helper Functions
// ===========================

function feetToWorldUnits(feet: number): number {
  return feet * FEET_TO_WORLD_SCALE;
}

function getShadowOpacity(elevationFeet: number): number {
  // Shadow gets lighter as elevation increases
  const maxElevation = 100; // Shadow completely fades at 100ft
  const opacity = SHADOW_OPACITY_BASE * (1 - Math.min(elevationFeet / maxElevation, 0.8));
  return Math.max(0.1, opacity);
}

function getShadowSize(tokenSize: number, elevationFeet: number): number {
  // Shadow grows slightly with elevation (perspective effect)
  const sizeMultiplier = 1 + elevationFeet * 0.01;
  return tokenSize * SHADOW_SIZE_BASE * sizeMultiplier;
}

function getColorForMode(mode: ElevationMode): string {
  switch (mode) {
    case ElevationMode.FLYING:
      return '#4169e1'; // Royal blue
    case ElevationMode.LEVITATING:
      return '#9370db'; // Medium purple
    case ElevationMode.CLIMBING:
      return '#8b4513'; // Saddle brown
    case ElevationMode.SWIMMING:
      return '#00ced1'; // Dark turquoise
    case ElevationMode.FALLING:
      return '#ff4500'; // Orange red
    case ElevationMode.BURROWING:
      return '#654321'; // Dark brown
    default:
      return '#888888';
  }
}

// ===========================
// Shadow Component
// ===========================

interface ShadowProps {
  position: [number, number, number];
  size: number;
  opacity: number;
  style: ShadowStyle;
}

const Shadow: React.FC<ShadowProps> = ({ position, size, opacity, style }) => {
  const geometry = useMemo(() => {
    return new THREE.CircleGeometry(size / 2, 32);
  }, [size]);

  const material = useMemo(() => {
    if (style === ShadowStyle.GRADIENT) {
      // Create gradient texture
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }

      const texture = new THREE.CanvasTexture(canvas);

      return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
      });
    }

    // Simple circle shadow
    return new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    });
  }, [style, opacity]);

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      if (material.map) {
        material.map.dispose();
      }
    };
  }, [geometry, material]);

  if (style === ShadowStyle.NONE) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[position[0], position[1], position[2] + 0.01]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

// ===========================
// Connecting Line Component
// ===========================

interface ConnectingLineProps {
  groundPosition: [number, number, number];
  elevatedPosition: [number, number, number];
  color: string;
  animated: boolean;
}

const ConnectingLine: React.FC<ConnectingLineProps> = ({
  groundPosition,
  elevatedPosition,
  color,
  animated,
}) => {
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(groundPosition[0], groundPosition[1], groundPosition[2] + 0.1),
      new THREE.Vector3(elevatedPosition[0], elevatedPosition[1], elevatedPosition[2]),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [groundPosition, elevatedPosition]);

  const material = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: new THREE.Color(color),
      dashSize: 0.2,
      gapSize: 0.1,
      opacity: 0.6,
      transparent: true,
      depthWrite: false,
    });
  }, [color]);

  // Animate dashed line
  useFrame((state, delta) => {
    if (animated && lineRef.current) {
      lineRef.current.material.dashSize = 0.2 + 0.05 * Math.sin(state.clock.elapsedTime * LINE_DASH_SPEED);
    }
  });

  React.useEffect(() => {
    if (geometry) {
      geometry.computeLineDistances();
    }
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <line ref={lineRef} geometry={geometry} material={material} />;
};

// ===========================
// Elevation Text Component
// ===========================

interface ElevationTextProps {
  position: [number, number, number];
  elevationFeet: number;
  fontSize: number;
  color: string;
  mode: ElevationMode;
}

const ElevationText: React.FC<ElevationTextProps> = ({ position, elevationFeet, fontSize, color, mode }) => {
  const textContent = useMemo(() => {
    const sign = elevationFeet >= 0 ? '+' : '';
    const modeIndicator = mode === ElevationMode.SWIMMING ? '↓' : mode === ElevationMode.FALLING ? '↓↓' : '';
    return `${sign}${Math.round(elevationFeet)}ft ${modeIndicator}`;
  }, [elevationFeet, mode]);

  return (
    <Text
      position={[position[0], position[1], position[2] + 0.5]}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {textContent}
    </Text>
  );
};

// ===========================
// Main Component
// ===========================

/**
 * ElevationIndicator Component
 *
 * Displays elevation for tokens above or below ground level
 *
 * @example
 * ```tsx
 * <ElevationIndicator
 *   groundPosition={[10, 10, 0]}
 *   elevationFeet={20}
 *   mode={ElevationMode.FLYING}
 *   showText={true}
 *   showLine={true}
 *   shadowStyle={ShadowStyle.GRADIENT}
 * />
 * ```
 */
export const ElevationIndicator: React.FC<ElevationIndicatorProps> = ({
  groundPosition,
  elevationFeet,
  mode = ElevationMode.FLYING,
  shadowStyle = ShadowStyle.GRADIENT,
  tokenSize = 1.0,
  showText = true,
  showLine = true,
  color,
  fontSize = 0.3,
  animated = true,
}) => {
  // Don't show indicator for minimal elevation
  if (Math.abs(elevationFeet) < MIN_ELEVATION_TO_SHOW) {
    return null;
  }

  const elevationWorldUnits = feetToWorldUnits(Math.abs(elevationFeet));
  const elevatedPosition: [number, number, number] = [
    groundPosition[0],
    groundPosition[1],
    groundPosition[2] + (elevationFeet > 0 ? elevatedWorldUnits : -elevatedWorldUnits),
  ];

  const indicatorColor = color || getColorForMode(mode);
  const shadowOpacity = getShadowOpacity(Math.abs(elevationFeet));
  const shadowSize = getShadowSize(tokenSize, Math.abs(elevationFeet));

  // For burrowing, hide the shadow
  const effectiveShadowStyle = mode === ElevationMode.BURROWING ? ShadowStyle.NONE : shadowStyle;

  return (
    <group name="elevation-indicator">
      {/* Shadow on ground */}
      {elevationFeet > 0 && (
        <Shadow
          position={groundPosition}
          size={shadowSize}
          opacity={shadowOpacity}
          style={effectiveShadowStyle}
        />
      )}

      {/* Connecting line from ground to elevated position */}
      {showLine && (
        <ConnectingLine
          groundPosition={groundPosition}
          elevatedPosition={elevatedPosition}
          color={indicatorColor}
          animated={animated}
        />
      )}

      {/* Elevation text */}
      {showText && (
        <ElevationText
          position={elevatedPosition}
          elevationFeet={elevationFeet}
          fontSize={fontSize}
          color={indicatorColor}
          mode={mode}
        />
      )}
    </group>
  );
};

// ===========================
// Utility Components
// ===========================

/**
 * Animated elevation indicator (pulsing effect)
 */
export interface AnimatedElevationIndicatorProps extends ElevationIndicatorProps {
  pulseSpeed?: number;
}

export const AnimatedElevationIndicator: React.FC<AnimatedElevationIndicatorProps> = ({
  pulseSpeed = 2.0,
  ...props
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const scale = 1 + 0.05 * Math.sin(state.clock.elapsedTime * pulseSpeed);
      groupRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group ref={groupRef}>
      <ElevationIndicator {...props} animated={true} />
    </group>
  );
};

/**
 * Helper component to show elevation for a token with automatic mode detection
 */
export interface AutoElevationIndicatorProps {
  groundPosition: [number, number, number];
  elevationFeet: number;
  tokenSize?: number;
  isFlying?: boolean;
  isLevitating?: boolean;
  isClimbing?: boolean;
  isSwimming?: boolean;
  isFalling?: boolean;
  isBurrowing?: boolean;
}

export const AutoElevationIndicator: React.FC<AutoElevationIndicatorProps> = ({
  groundPosition,
  elevationFeet,
  tokenSize = 1.0,
  isFlying = false,
  isLevitating = false,
  isClimbing = false,
  isSwimming = false,
  isFalling = false,
  isBurrowing = false,
}) => {
  const mode = useMemo(() => {
    if (isFalling) return ElevationMode.FALLING;
    if (isBurrowing) return ElevationMode.BURROWING;
    if (isSwimming) return ElevationMode.SWIMMING;
    if (isClimbing) return ElevationMode.CLIMBING;
    if (isLevitating) return ElevationMode.LEVITATING;
    if (isFlying) return ElevationMode.FLYING;
    return ElevationMode.FLYING; // Default
  }, [isFlying, isLevitating, isClimbing, isSwimming, isFalling, isBurrowing]);

  return (
    <ElevationIndicator
      groundPosition={groundPosition}
      elevationFeet={elevationFeet}
      mode={mode}
      tokenSize={tokenSize}
      showText={true}
      showLine={true}
      shadowStyle={ShadowStyle.GRADIENT}
      animated={true}
    />
  );
};

// ===========================
// Exports
// ===========================

export default ElevationIndicator;
