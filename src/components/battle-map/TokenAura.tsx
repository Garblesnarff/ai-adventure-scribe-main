/**
 * TokenAura Component
 *
 * Renders circular auras around tokens for spell effects, class features, and abilities.
 * Supports multiple auras per token with configurable radius, color, and animations.
 *
 * Use cases:
 * - Paladin Aura of Protection (10ft)
 * - Spirit Guardians (15ft)
 * - Bless/Bane spells
 * - Cloudkill area
 * - Custom spell effects
 *
 * @module components/battle-map/TokenAura
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ===========================
// Types
// ===========================

/**
 * Aura visibility settings
 */
export enum AuraVisibility {
  ALL = 'all', // Visible to everyone
  GM_ONLY = 'gm-only', // Only GM can see
  OWNER = 'owner', // Only token owner can see
  PLAYERS = 'players', // All players can see
}

/**
 * Aura animation types
 */
export enum AuraAnimation {
  NONE = 'none',
  PULSE = 'pulse', // Pulsing opacity
  WAVE = 'wave', // Expanding wave
  ROTATE = 'rotate', // Rotating pattern
  SHIMMER = 'shimmer', // Shimmering effect
}

/**
 * Aura configuration
 */
export interface AuraConfig {
  /** Unique identifier for this aura */
  id: string;

  /** Radius in feet (will be converted to world units) */
  radiusFeet: number;

  /** Aura color (hex string) */
  color: string;

  /** Base opacity (0-1) */
  opacity?: number;

  /** Animation type */
  animation?: AuraAnimation;

  /** Animation speed multiplier */
  animationSpeed?: number;

  /** Visibility settings */
  visibility?: AuraVisibility;

  /** Optional label for the aura */
  label?: string;

  /** Border width in pixels (0 for no border) */
  borderWidth?: number;

  /** Border color (hex string) */
  borderColor?: string;

  /** Z-offset for layering multiple auras */
  zOffset?: number;
}

/**
 * Props for TokenAura component
 */
export interface TokenAuraProps {
  /** Position of the token in world coordinates */
  position: [number, number, number];

  /** Array of aura configurations */
  auras: AuraConfig[];

  /** Size of a grid square in world units (default: 5) */
  gridSize?: number;

  /** Whether this is being viewed by GM (affects visibility) */
  isGM?: boolean;

  /** Current user ID (affects owner visibility) */
  userId?: string;

  /** Token owner IDs */
  tokenOwnerIds?: string[];
}

// ===========================
// Constants
// ===========================

const FEET_TO_WORLD_SCALE = 1; // 1 foot = 1 world unit (adjust based on your grid scale)
const DEFAULT_OPACITY = 0.2;
const DEFAULT_ANIMATION_SPEED = 1.0;
const PULSE_MIN_OPACITY = 0.1;
const PULSE_MAX_OPACITY = 0.3;

// ===========================
// Helper Functions
// ===========================

/**
 * Converts feet to world units based on grid size
 */
function feetToWorldUnits(feet: number, gridSize: number = 5): number {
  return (feet / gridSize) * gridSize;
}

/**
 * Determines if an aura should be visible to the current user
 */
function isAuraVisible(
  aura: AuraConfig,
  isGM: boolean = false,
  userId?: string,
  tokenOwnerIds?: string[]
): boolean {
  const visibility = aura.visibility || AuraVisibility.ALL;

  switch (visibility) {
    case AuraVisibility.ALL:
      return true;
    case AuraVisibility.GM_ONLY:
      return isGM;
    case AuraVisibility.OWNER:
      return isGM || (userId && tokenOwnerIds?.includes(userId)) || false;
    case AuraVisibility.PLAYERS:
      return !isGM; // Only non-GMs see it
    default:
      return true;
  }
}

// ===========================
// Single Aura Component
// ===========================

interface SingleAuraProps {
  aura: AuraConfig;
  position: [number, number, number];
  gridSize: number;
}

const SingleAura: React.FC<SingleAuraProps> = ({ aura, position, gridSize }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const {
    radiusFeet,
    color,
    opacity = DEFAULT_OPACITY,
    animation = AuraAnimation.NONE,
    animationSpeed = DEFAULT_ANIMATION_SPEED,
    borderWidth = 0,
    borderColor = '#ffffff',
    zOffset = 0,
  } = aura;

  // Convert feet to world units
  const radius = feetToWorldUnits(radiusFeet, gridSize);

  // Create ring geometry for the aura
  const geometry = useMemo(() => {
    const segments = Math.max(32, Math.floor(radius * 2)); // More segments for larger auras
    return new THREE.RingGeometry(
      radius * 0.95, // Inner radius (slight gap in center)
      radius, // Outer radius
      segments
    );
  }, [radius]);

  // Create material for the aura
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // Additive blending for glow effect
    });
  }, [color, opacity]);

  // Create border geometry if needed
  const borderGeometry = useMemo(() => {
    if (borderWidth <= 0) return null;
    const segments = Math.max(64, Math.floor(radius * 4));
    return new THREE.RingGeometry(radius, radius + 0.1, segments);
  }, [radius, borderWidth]);

  const borderMaterial = useMemo(() => {
    if (borderWidth <= 0) return null;
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(borderColor),
      opacity: opacity * 1.5,
      transparent: true,
      linewidth: borderWidth,
    });
  }, [borderColor, borderWidth, opacity]);

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || animation === AuraAnimation.NONE) return;

    timeRef.current += delta * animationSpeed;
    const mesh = meshRef.current;

    switch (animation) {
      case AuraAnimation.PULSE: {
        // Pulsing opacity
        const pulseOpacity =
          PULSE_MIN_OPACITY +
          (PULSE_MAX_OPACITY - PULSE_MIN_OPACITY) *
            (0.5 + 0.5 * Math.sin(timeRef.current * 2));
        mesh.material.opacity = pulseOpacity;
        break;
      }

      case AuraAnimation.WAVE: {
        // Expanding wave effect (scale oscillation)
        const scale = 1 + 0.05 * Math.sin(timeRef.current * 3);
        mesh.scale.set(scale, scale, 1);
        mesh.material.opacity = opacity * (1.2 - scale * 0.2);
        break;
      }

      case AuraAnimation.ROTATE: {
        // Rotating pattern
        mesh.rotation.z = timeRef.current * 0.5;
        break;
      }

      case AuraAnimation.SHIMMER: {
        // Shimmering effect (opacity variation)
        const shimmer = opacity * (0.8 + 0.2 * Math.sin(timeRef.current * 4));
        mesh.material.opacity = shimmer;
        break;
      }
    }
  });

  // Cleanup
  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      if (borderGeometry) borderGeometry.dispose();
      if (borderMaterial) borderMaterial.dispose();
    };
  }, [geometry, material, borderGeometry, borderMaterial]);

  const auraPosition: [number, number, number] = [
    position[0],
    position[1],
    position[2] + 0.01 + zOffset,
  ];

  return (
    <group position={auraPosition}>
      {/* Main aura ring */}
      <mesh ref={meshRef} geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Border ring (if enabled) */}
      {borderGeometry && borderMaterial && (
        <lineLoop geometry={borderGeometry} material={borderMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      )}
    </group>
  );
};

// ===========================
// Main Component
// ===========================

/**
 * TokenAura Component
 *
 * Renders multiple auras around a token for visual spell/ability effects
 *
 * @example
 * ```tsx
 * <TokenAura
 *   position={[10, 10, 0]}
 *   auras={[
 *     {
 *       id: 'paladin-aura',
 *       radiusFeet: 10,
 *       color: '#ffd700',
 *       opacity: 0.2,
 *       animation: AuraAnimation.PULSE,
 *       label: 'Aura of Protection',
 *     },
 *     {
 *       id: 'spirit-guardians',
 *       radiusFeet: 15,
 *       color: '#4169e1',
 *       opacity: 0.15,
 *       animation: AuraAnimation.ROTATE,
 *       label: 'Spirit Guardians',
 *     },
 *   ]}
 *   gridSize={5}
 * />
 * ```
 */
export const TokenAura: React.FC<TokenAuraProps> = ({
  position,
  auras,
  gridSize = 5,
  isGM = false,
  userId,
  tokenOwnerIds,
}) => {
  // Filter auras based on visibility
  const visibleAuras = useMemo(() => {
    return auras.filter((aura) => isAuraVisible(aura, isGM, userId, tokenOwnerIds));
  }, [auras, isGM, userId, tokenOwnerIds]);

  if (visibleAuras.length === 0) {
    return null;
  }

  return (
    <group name="token-auras">
      {visibleAuras.map((aura) => (
        <SingleAura key={aura.id} aura={aura} position={position} gridSize={gridSize} />
      ))}
    </group>
  );
};

// ===========================
// Preset Aura Configurations
// ===========================

/**
 * Common D&D 5E aura presets
 */
export const AuraPresets = {
  /**
   * Paladin Aura of Protection (10ft radius)
   */
  paladinAuraOfProtection: (): AuraConfig => ({
    id: 'paladin-aura-protection',
    radiusFeet: 10,
    color: '#ffd700', // Gold
    opacity: 0.2,
    animation: AuraAnimation.PULSE,
    animationSpeed: 0.5,
    label: 'Aura of Protection',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Spirit Guardians (15ft radius)
   */
  spiritGuardians: (): AuraConfig => ({
    id: 'spirit-guardians',
    radiusFeet: 15,
    color: '#4169e1', // Royal blue
    opacity: 0.25,
    animation: AuraAnimation.ROTATE,
    animationSpeed: 0.3,
    label: 'Spirit Guardians',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Bless spell (30ft radius from caster)
   */
  bless: (): AuraConfig => ({
    id: 'bless',
    radiusFeet: 30,
    color: '#32cd32', // Lime green
    opacity: 0.15,
    animation: AuraAnimation.SHIMMER,
    animationSpeed: 1.0,
    label: 'Bless',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Bane spell (30ft radius from caster)
   */
  bane: (): AuraConfig => ({
    id: 'bane',
    radiusFeet: 30,
    color: '#8b0000', // Dark red
    opacity: 0.15,
    animation: AuraAnimation.PULSE,
    animationSpeed: 1.2,
    label: 'Bane',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Cloudkill (20ft radius)
   */
  cloudkill: (): AuraConfig => ({
    id: 'cloudkill',
    radiusFeet: 20,
    color: '#228b22', // Forest green
    opacity: 0.4,
    animation: AuraAnimation.WAVE,
    animationSpeed: 0.8,
    label: 'Cloudkill',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Darkness spell (15ft radius)
   */
  darkness: (): AuraConfig => ({
    id: 'darkness',
    radiusFeet: 15,
    color: '#000000', // Black
    opacity: 0.6,
    animation: AuraAnimation.PULSE,
    animationSpeed: 0.4,
    label: 'Darkness',
    visibility: AuraVisibility.ALL,
  }),

  /**
   * Custom aura factory
   */
  custom: (
    id: string,
    radiusFeet: number,
    color: string,
    options?: Partial<AuraConfig>
  ): AuraConfig => ({
    id,
    radiusFeet,
    color,
    opacity: DEFAULT_OPACITY,
    animation: AuraAnimation.NONE,
    visibility: AuraVisibility.ALL,
    ...options,
  }),
};

// ===========================
// Exports
// ===========================

export default TokenAura;
