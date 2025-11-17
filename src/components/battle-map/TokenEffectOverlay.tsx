/**
 * TokenEffectOverlay Component
 *
 * Provides visual overlays for token status effects and conditions.
 * Stacks multiple effects and uses blend modes for visual clarity.
 *
 * Supported effects:
 * - Invisible (ghostly translucent)
 * - Petrified (stone texture)
 * - Prone (visual indicator)
 * - Burning (fire overlay)
 * - Frozen (ice texture)
 * - Paralyzed (static effect)
 * - Stunned (swirling effect)
 * - Charmed (hearts/sparkles)
 * - Frightened (shadowy)
 *
 * @module components/battle-map/TokenEffectOverlay
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TokenParticles, MultiEffectParticles } from './TokenParticles';
import { ParticleQuality } from '@/utils/particle-systems';

// ===========================
// Types
// ===========================

/**
 * Status effect types
 */
export enum StatusEffectType {
  INVISIBLE = 'invisible',
  PETRIFIED = 'petrified',
  PRONE = 'prone',
  BURNING = 'burning',
  FROZEN = 'frozen',
  PARALYZED = 'paralyzed',
  STUNNED = 'stunned',
  CHARMED = 'charmed',
  FRIGHTENED = 'frightened',
  BLINDED = 'blinded',
  DEAFENED = 'deafened',
  POISONED = 'poisoned',
  RESTRAINED = 'restrained',
  UNCONSCIOUS = 'unconscious',
  EXHAUSTED = 'exhausted',
}

/**
 * Effect overlay configuration
 */
export interface EffectOverlayConfig {
  /** Effect type */
  type: StatusEffectType;

  /** Custom intensity (0-1) */
  intensity?: number;

  /** Custom color override */
  color?: string;

  /** Duration remaining (for time-based visual changes) */
  durationRemaining?: number;
}

/**
 * Props for TokenEffectOverlay component
 */
export interface TokenEffectOverlayProps {
  /** Position of the token */
  position: [number, number, number];

  /** Size of the token */
  size: number;

  /** Array of active effects */
  effects: EffectOverlayConfig[];

  /** Performance quality */
  quality?: ParticleQuality;

  /** Whether to show particle effects */
  showParticles?: boolean;
}

// ===========================
// Effect Overlay Components
// ===========================

interface OverlayPlaneProps {
  position: [number, number, number];
  size: number;
  color: string;
  opacity: number;
  blending?: THREE.Blending;
  texture?: THREE.Texture;
  animated?: boolean;
  animationSpeed?: number;
}

const OverlayPlane: React.FC<OverlayPlaneProps> = ({
  position,
  size,
  color,
  opacity,
  blending = THREE.NormalBlending,
  texture,
  animated = false,
  animationSpeed = 1.0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size);
  }, [size]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      opacity,
      transparent: true,
      blending,
      depthWrite: false,
      side: THREE.DoubleSide,
      map: texture || null,
    });
  }, [color, opacity, blending, texture]);

  // Animation
  useFrame((state, delta) => {
    if (!meshRef.current || !animated) return;

    // Pulse opacity
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * animationSpeed * 2);
    meshRef.current.material.opacity = opacity * (0.7 + 0.3 * pulse);
  });

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[position[0], position[1], position[2] + 0.05]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

// ===========================
// Invisible Effect
// ===========================

const InvisibleOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#ffffff"
      opacity={0.1 + intensity * 0.2}
      blending={THREE.AdditiveBlending}
      animated={true}
      animationSpeed={0.5}
    />
  );
};

// ===========================
// Petrified Effect
// ===========================

const PetrifiedOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#808080"
      opacity={0.6 * intensity}
      blending={THREE.MultiplyBlending}
      animated={false}
    />
  );
};

// ===========================
// Prone Effect
// ===========================

const ProneOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  // Show diagonal lines to indicate prone status
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-size / 2, -size / 2, 0.1),
      new THREE.Vector3(size / 2, size / 2, 0.1),
      new THREE.Vector3(-size / 2, size / 2, 0.1),
      new THREE.Vector3(size / 2, -size / 2, 0.1),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#ff6b6b',
      opacity: 0.7,
      transparent: true,
      linewidth: 2,
    });
  }, []);

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <lineSegments geometry={geometry} material={material} position={position} />;
};

// ===========================
// Frozen Effect
// ===========================

const FrozenOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#87ceeb"
      opacity={0.5 * intensity}
      blending={THREE.AdditiveBlending}
      animated={true}
      animationSpeed={0.3}
    />
  );
};

// ===========================
// Paralyzed Effect
// ===========================

const ParalyzedOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Static/jitter effect
      const jitter = 0.02;
      meshRef.current.position.x = position[0] + (Math.random() - 0.5) * jitter * intensity;
      meshRef.current.position.y = position[1] + (Math.random() - 0.5) * jitter * intensity;
    }
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffff00',
        opacity: 0.3 * intensity,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [intensity]
  );

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[position[0], position[1], position[2] + 0.05]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

// ===========================
// Stunned Effect
// ===========================

const StunnedOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <OverlayPlane
        position={[0, 0, 0.05]}
        size={size}
        color="#ffff00"
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        animated={true}
        animationSpeed={1.5}
      />
    </group>
  );
};

// ===========================
// Charmed Effect
// ===========================

const CharmedOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#ff69b4"
      opacity={0.3}
      blending={THREE.AdditiveBlending}
      animated={true}
      animationSpeed={1.0}
    />
  );
};

// ===========================
// Frightened Effect
// ===========================

const FrightenedOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#2f4f4f"
      opacity={0.4 * intensity}
      blending={THREE.MultiplyBlending}
      animated={true}
      animationSpeed={1.5}
    />
  );
};

// ===========================
// Blinded Effect
// ===========================

const BlindedOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#000000"
      opacity={0.6}
      blending={THREE.MultiplyBlending}
      animated={false}
    />
  );
};

// ===========================
// Poisoned Effect
// ===========================

const PoisonedOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#228b22"
      opacity={0.3 * intensity}
      blending={THREE.AdditiveBlending}
      animated={true}
      animationSpeed={0.8}
    />
  );
};

// ===========================
// Restrained Effect
// ===========================

const RestrainedOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  // Show binding/rope pattern
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#8b4513"
      opacity={0.4}
      blending={THREE.MultiplyBlending}
      animated={false}
    />
  );
};

// ===========================
// Unconscious Effect
// ===========================

const UnconsciousOverlay: React.FC<{ position: [number, number, number]; size: number }> = ({ position, size }) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#696969"
      opacity={0.5}
      blending={THREE.MultiplyBlending}
      animated={true}
      animationSpeed={0.5}
    />
  );
};

// ===========================
// Exhausted Effect
// ===========================

const ExhaustedOverlay: React.FC<{ position: [number, number, number]; size: number; intensity: number }> = ({
  position,
  size,
  intensity,
}) => {
  return (
    <OverlayPlane
      position={position}
      size={size}
      color="#4a4a4a"
      opacity={0.2 + intensity * 0.3}
      blending={THREE.MultiplyBlending}
      animated={false}
    />
  );
};

// ===========================
// Main Component
// ===========================

/**
 * TokenEffectOverlay Component
 *
 * Renders visual overlays for multiple status effects on a token
 *
 * @example
 * ```tsx
 * <TokenEffectOverlay
 *   position={[10, 10, 0]}
 *   size={1.0}
 *   effects={[
 *     { type: StatusEffectType.BURNING, intensity: 1.0 },
 *     { type: StatusEffectType.POISONED, intensity: 0.7 },
 *   ]}
 *   quality={ParticleQuality.MEDIUM}
 *   showParticles={true}
 * />
 * ```
 */
export const TokenEffectOverlay: React.FC<TokenEffectOverlayProps> = ({
  position,
  size,
  effects,
  quality = ParticleQuality.MEDIUM,
  showParticles = true,
}) => {
  if (effects.length === 0) {
    return null;
  }

  return (
    <group name="token-effect-overlay">
      {effects.map((effect, index) => {
        const intensity = effect.intensity ?? 1.0;
        const key = `${effect.type}-${index}`;

        // Render overlay based on effect type
        switch (effect.type) {
          case StatusEffectType.INVISIBLE:
            return <InvisibleOverlay key={key} position={position} size={size} intensity={intensity} />;

          case StatusEffectType.PETRIFIED:
            return <PetrifiedOverlay key={key} position={position} size={size} intensity={intensity} />;

          case StatusEffectType.PRONE:
            return <ProneOverlay key={key} position={position} size={size} />;

          case StatusEffectType.BURNING:
            return showParticles ? (
              <MultiEffectParticles
                key={key}
                position={position}
                effects={[
                  { type: 'fire', intensity: intensity },
                  { type: 'smoke', intensity: intensity * 0.5 },
                ]}
                quality={quality}
              />
            ) : null;

          case StatusEffectType.FROZEN:
            return (
              <React.Fragment key={key}>
                <FrozenOverlay position={position} size={size} intensity={intensity} />
                {showParticles && <TokenParticles position={position} effectType="ice" quality={quality} />}
              </React.Fragment>
            );

          case StatusEffectType.PARALYZED:
            return <ParalyzedOverlay key={key} position={position} size={size} intensity={intensity} />;

          case StatusEffectType.STUNNED:
            return <StunnedOverlay key={key} position={position} size={size} />;

          case StatusEffectType.CHARMED:
            return (
              <React.Fragment key={key}>
                <CharmedOverlay position={position} size={size} />
                {showParticles && (
                  <TokenParticles
                    position={position}
                    effectType="radiant"
                    quality={quality}
                    intensity={0.5}
                  />
                )}
              </React.Fragment>
            );

          case StatusEffectType.FRIGHTENED:
            return <FrightenedOverlay key={key} position={position} size={size} intensity={intensity} />;

          case StatusEffectType.BLINDED:
            return <BlindedOverlay key={key} position={position} size={size} />;

          case StatusEffectType.POISONED:
            return (
              <React.Fragment key={key}>
                <PoisonedOverlay position={position} size={size} intensity={intensity} />
                {showParticles && <TokenParticles position={position} effectType="poison" quality={quality} />}
              </React.Fragment>
            );

          case StatusEffectType.RESTRAINED:
            return <RestrainedOverlay key={key} position={position} size={size} />;

          case StatusEffectType.UNCONSCIOUS:
            return <UnconsciousOverlay key={key} position={position} size={size} />;

          case StatusEffectType.EXHAUSTED:
            return <ExhaustedOverlay key={key} position={position} size={size} intensity={intensity} />;

          default:
            return null;
        }
      })}
    </group>
  );
};

// ===========================
// Utility Functions
// ===========================

/**
 * Maps D&D 5e condition names to effect types
 */
export function conditionToEffectType(conditionName: string): StatusEffectType | null {
  const normalized = conditionName.toLowerCase().trim();

  const mapping: Record<string, StatusEffectType> = {
    invisible: StatusEffectType.INVISIBLE,
    petrified: StatusEffectType.PETRIFIED,
    prone: StatusEffectType.PRONE,
    burning: StatusEffectType.BURNING,
    frozen: StatusEffectType.FROZEN,
    paralyzed: StatusEffectType.PARALYZED,
    stunned: StatusEffectType.STUNNED,
    charmed: StatusEffectType.CHARMED,
    frightened: StatusEffectType.FRIGHTENED,
    blinded: StatusEffectType.BLINDED,
    deafened: StatusEffectType.DEAFENED,
    poisoned: StatusEffectType.POISONED,
    restrained: StatusEffectType.RESTRAINED,
    unconscious: StatusEffectType.UNCONSCIOUS,
    exhausted: StatusEffectType.EXHAUSTED,
    exhaustion: StatusEffectType.EXHAUSTED,
  };

  return mapping[normalized] || null;
}

/**
 * Converts an array of condition names to effect overlay configs
 */
export function conditionsToEffects(conditions: string[]): EffectOverlayConfig[] {
  return conditions
    .map((condition) => {
      const type = conditionToEffectType(condition);
      return type ? { type } : null;
    })
    .filter((effect): effect is EffectOverlayConfig => effect !== null);
}

// ===========================
// Exports
// ===========================

export default TokenEffectOverlay;
