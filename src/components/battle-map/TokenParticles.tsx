/**
 * TokenParticles Component
 *
 * Renders particle effects around tokens for spell effects, combat animations,
 * and environmental effects. Uses THREE.Points for performance-optimized rendering.
 *
 * Supports multiple particle systems with different effects:
 * - Fire, Ice, Lightning, Healing, Poison, Necrotic, Radiant
 * - Blood, Smoke, and custom effects
 *
 * @module components/battle-map/TokenParticles
 */

import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  ParticleSystemConfig,
  ParticleQuality,
  getParticleSystem,
  ParticleSystemType,
  randomInRange,
  randomColor,
  calculateParticleOpacity,
  calculateParticleScale,
} from '@/utils/particle-systems';

// ===========================
// Types
// ===========================

/**
 * Individual particle state
 */
interface Particle {
  /** Current position */
  position: THREE.Vector3;

  /** Current velocity */
  velocity: THREE.Vector3;

  /** Age in seconds */
  age: number;

  /** Color */
  color: THREE.Color;

  /** Current size */
  size: number;

  /** Current opacity */
  opacity: number;

  /** Rotation (for textured particles) */
  rotation: number;

  /** Rotation speed */
  rotationSpeed: number;

  /** Is this particle alive? */
  alive: boolean;
}

/**
 * Props for TokenParticles component
 */
export interface TokenParticlesProps {
  /** Position of the token in world coordinates */
  position: [number, number, number];

  /** Type of particle effect */
  effectType: ParticleSystemType | 'custom';

  /** Custom particle system config (if effectType is 'custom') */
  customConfig?: ParticleSystemConfig;

  /** Performance quality level */
  quality?: ParticleQuality;

  /** Whether the effect is currently active */
  active?: boolean;

  /** Callback when effect completes (for non-looping effects) */
  onComplete?: () => void;

  /** Scale multiplier for particle size */
  sizeMultiplier?: number;

  /** Intensity multiplier (affects spawn rate) */
  intensity?: number;
}

// ===========================
// Particle Pool Component
// ===========================

/**
 * TokenParticles Component
 *
 * Manages a pool of particles and renders them using THREE.Points for performance.
 *
 * @example
 * ```tsx
 * <TokenParticles
 *   position={[10, 10, 1]}
 *   effectType="fire"
 *   quality={ParticleQuality.MEDIUM}
 *   active={true}
 * />
 * ```
 */
export const TokenParticles: React.FC<TokenParticlesProps> = ({
  position,
  effectType,
  customConfig,
  quality = ParticleQuality.MEDIUM,
  active = true,
  onComplete,
  sizeMultiplier = 1.0,
  intensity = 1.0,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const spawnAccumulatorRef = useRef(0);
  const hasCompletedRef = useRef(false);

  // Get particle system configuration
  const config = useMemo(() => {
    if (effectType === 'custom' && customConfig) {
      return customConfig;
    }
    return getParticleSystem(effectType as ParticleSystemType, quality);
  }, [effectType, customConfig, quality]);

  const maxParticles = config.particleCount;

  // Create geometry and material
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Create attribute buffers
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const alphas = new Float32Array(maxParticles);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Create material
    const mat = new THREE.PointsMaterial({
      size: config.appearance.size * sizeMultiplier,
      vertexColors: true,
      transparent: true,
      opacity: config.appearance.opacity,
      blending: config.appearance.blending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return { geometry: geo, material: mat };
  }, [maxParticles, config, sizeMultiplier]);

  // Initialize particle pool
  const initializeParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: maxParticles }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      color: new THREE.Color(),
      size: 0,
      opacity: 0,
      rotation: 0,
      rotationSpeed: 0,
      alive: false,
    }));
  }, [maxParticles]);

  // Initialize on mount
  React.useEffect(() => {
    initializeParticles();
  }, [initializeParticles]);

  // Spawn a new particle
  const spawnParticle = useCallback(() => {
    // Find dead particle
    const particle = particlesRef.current.find((p) => !p.alive);
    if (!particle) return;

    // Reset particle
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * config.spawnRadius;

    particle.position.set(
      position[0] + Math.cos(angle) * radius,
      position[1] + Math.sin(angle) * radius,
      position[2]
    );

    particle.velocity.set(
      randomInRange(config.behavior.velocityRange.x[0], config.behavior.velocityRange.x[1]),
      randomInRange(config.behavior.velocityRange.y[0], config.behavior.velocityRange.y[1]),
      randomInRange(config.behavior.velocityRange.z[0], config.behavior.velocityRange.z[1])
    );

    particle.color = randomColor(config.appearance.colors);
    particle.size = config.appearance.size * (1 + (Math.random() - 0.5) * config.appearance.sizeVariation) * sizeMultiplier;
    particle.opacity = config.appearance.opacity;
    particle.age = 0;
    particle.alive = true;

    if (config.behavior.rotationSpeed) {
      particle.rotationSpeed = randomInRange(
        config.behavior.rotationSpeed[0],
        config.behavior.rotationSpeed[1]
      );
    }
  }, [config, position, sizeMultiplier]);

  // Update particles
  const updateParticles = useCallback(
    (delta: number) => {
      const particles = particlesRef.current;
      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        if (!particle.alive) continue;

        // Update age
        particle.age += delta;

        // Kill old particles
        if (particle.age >= config.behavior.lifetime) {
          particle.alive = false;
          continue;
        }

        aliveCount++;

        // Update velocity with acceleration
        particle.velocity.x += config.behavior.acceleration.x * delta;
        particle.velocity.y += config.behavior.acceleration.y * delta;
        particle.velocity.z += config.behavior.acceleration.z * delta;

        // Update position
        particle.position.x += particle.velocity.x * delta;
        particle.position.y += particle.velocity.y * delta;
        particle.position.z += particle.velocity.z * delta;

        // Update rotation
        if (config.behavior.rotationSpeed) {
          particle.rotation += particle.rotationSpeed * delta;
        }

        // Update opacity (fade in/out)
        particle.opacity = calculateParticleOpacity(
          particle.age,
          config.behavior.lifetime,
          config.appearance.opacity,
          config.behavior.fadeIn,
          config.behavior.fadeOut
        );

        // Update scale
        if (config.behavior.scaleOverTime) {
          const scale = calculateParticleScale(
            particle.age,
            config.behavior.lifetime,
            config.behavior.scaleOverTime.start,
            config.behavior.scaleOverTime.end
          );
          particle.size = config.appearance.size * scale * sizeMultiplier;
        }
      }

      // Check for completion
      if (!config.loop && aliveCount === 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (onComplete) {
          onComplete();
        }
      }

      return aliveCount;
    },
    [config, sizeMultiplier, onComplete]
  );

  // Update geometry buffers
  const updateBuffers = useCallback(() => {
    if (!geometry) return;

    const particles = particlesRef.current;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const alphas = geometry.attributes.alpha.array as Float32Array;

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const i3 = i * 3;

      if (particle.alive) {
        positions[i3] = particle.position.x;
        positions[i3 + 1] = particle.position.y;
        positions[i3 + 2] = particle.position.z;

        colors[i3] = particle.color.r;
        colors[i3 + 1] = particle.color.g;
        colors[i3 + 2] = particle.color.b;

        sizes[i] = particle.size;
        alphas[i] = particle.opacity;
      } else {
        // Move dead particles far away
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = -10000;

        alphas[i] = 0;
        sizes[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
  }, [geometry]);

  // Animation loop
  useFrame((state, delta) => {
    if (!active) return;

    timeRef.current += delta;

    // Spawn particles
    if (config.loop || timeRef.current < config.behavior.lifetime) {
      spawnAccumulatorRef.current += delta * config.spawnRate * intensity;

      while (spawnAccumulatorRef.current >= 1) {
        spawnParticle();
        spawnAccumulatorRef.current -= 1;
      }
    }

    // Update particles
    updateParticles(delta);

    // Update buffers
    updateBuffers();
  });

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
    };
  }, [geometry, material]);

  // Reset on active change
  React.useEffect(() => {
    if (active) {
      timeRef.current = 0;
      spawnAccumulatorRef.current = 0;
      hasCompletedRef.current = false;
      initializeParticles();
    }
  }, [active, initializeParticles]);

  if (!active) {
    return null;
  }

  return <points ref={pointsRef} geometry={geometry} material={material} />;
};

// ===========================
// Utility Components
// ===========================

/**
 * Multi-Effect Particles
 * Renders multiple particle effects simultaneously
 */
export interface MultiEffectParticlesProps {
  position: [number, number, number];
  effects: Array<{
    type: ParticleSystemType;
    intensity?: number;
  }>;
  quality?: ParticleQuality;
  active?: boolean;
}

export const MultiEffectParticles: React.FC<MultiEffectParticlesProps> = ({
  position,
  effects,
  quality = ParticleQuality.MEDIUM,
  active = true,
}) => {
  return (
    <group name="multi-effect-particles">
      {effects.map((effect, index) => (
        <TokenParticles
          key={`${effect.type}-${index}`}
          position={position}
          effectType={effect.type}
          quality={quality}
          active={active}
          intensity={effect.intensity}
        />
      ))}
    </group>
  );
};

// ===========================
// Preset Combinations
// ===========================

/**
 * Common particle effect combinations
 */
export const ParticlePresets = {
  /**
   * Burning token (fire + smoke)
   */
  burning: (position: [number, number, number], quality?: ParticleQuality) => (
    <MultiEffectParticles
      position={position}
      effects={[
        { type: 'fire', intensity: 1.0 },
        { type: 'smoke', intensity: 0.5 },
      ]}
      quality={quality}
    />
  ),

  /**
   * Frozen token (ice particles)
   */
  frozen: (position: [number, number, number], quality?: ParticleQuality) => (
    <TokenParticles position={position} effectType="ice" quality={quality} />
  ),

  /**
   * Electrocuted token (lightning)
   */
  electrocuted: (position: [number, number, number], quality?: ParticleQuality) => (
    <TokenParticles position={position} effectType="lightning" quality={quality} intensity={1.5} />
  ),

  /**
   * Regenerating health (healing particles)
   */
  regenerating: (position: [number, number, number], quality?: ParticleQuality) => (
    <TokenParticles position={position} effectType="healing" quality={quality} />
  ),

  /**
   * Poisoned token (poison miasma)
   */
  poisoned: (position: [number, number, number], quality?: ParticleQuality) => (
    <TokenParticles position={position} effectType="poison" quality={quality} />
  ),

  /**
   * Blessed token (radiant + healing)
   */
  blessed: (position: [number, number, number], quality?: ParticleQuality) => (
    <MultiEffectParticles
      position={position}
      effects={[
        { type: 'radiant', intensity: 0.7 },
        { type: 'healing', intensity: 0.5 },
      ]}
      quality={quality}
    />
  ),

  /**
   * Cursed token (necrotic)
   */
  cursed: (position: [number, number, number], quality?: ParticleQuality) => (
    <TokenParticles position={position} effectType="necrotic" quality={quality} />
  ),
};

// ===========================
// Exports
// ===========================

export default TokenParticles;
