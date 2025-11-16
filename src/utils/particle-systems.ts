/**
 * Particle System Utilities
 *
 * Provides reusable particle system configurations for spell effects,
 * combat animations, and environmental effects.
 *
 * Performance-optimized with configurable quality settings.
 *
 * @module utils/particle-systems
 */

import * as THREE from 'three';

// ===========================
// Types
// ===========================

/**
 * Performance quality settings
 */
export enum ParticleQuality {
  LOW = 'low', // Minimal particles, simple effects
  MEDIUM = 'medium', // Balanced quality/performance
  HIGH = 'high', // Maximum visual fidelity
}

/**
 * Particle behavior configuration
 */
export interface ParticleBehavior {
  /** Initial velocity range */
  velocityRange: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
  };

  /** Acceleration (gravity, wind, etc.) */
  acceleration: {
    x: number;
    y: number;
    z: number;
  };

  /** Particle lifetime in seconds */
  lifetime: number;

  /** Fade in duration (0-1 of lifetime) */
  fadeIn?: number;

  /** Fade out duration (0-1 of lifetime) */
  fadeOut?: number;

  /** Rotation speed range (radians/second) */
  rotationSpeed?: [number, number];

  /** Scale change over time */
  scaleOverTime?: {
    start: number;
    end: number;
  };
}

/**
 * Particle appearance configuration
 */
export interface ParticleAppearance {
  /** Particle colors (will be randomly selected) */
  colors: string[];

  /** Particle size in world units */
  size: number;

  /** Size variation (0-1) */
  sizeVariation: number;

  /** Base opacity */
  opacity: number;

  /** Blending mode */
  blending: THREE.Blending;

  /** Optional texture URL */
  texture?: string;

  /** Shape type */
  shape?: 'square' | 'circle' | 'spark';
}

/**
 * Complete particle system configuration
 */
export interface ParticleSystemConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Number of particles to spawn */
  particleCount: number;

  /** Particles spawned per second */
  spawnRate: number;

  /** Particle behavior */
  behavior: ParticleBehavior;

  /** Particle appearance */
  appearance: ParticleAppearance;

  /** Whether to loop the effect */
  loop: boolean;

  /** Spawn area radius */
  spawnRadius: number;

  /** Performance quality level */
  quality: ParticleQuality;
}

// ===========================
// Quality Multipliers
// ===========================

const QUALITY_MULTIPLIERS: Record<ParticleQuality, number> = {
  [ParticleQuality.LOW]: 0.3,
  [ParticleQuality.MEDIUM]: 0.6,
  [ParticleQuality.HIGH]: 1.0,
};

/**
 * Adjusts particle count based on quality setting
 */
function adjustForQuality(baseCount: number, quality: ParticleQuality): number {
  return Math.max(1, Math.floor(baseCount * QUALITY_MULTIPLIERS[quality]));
}

// ===========================
// Fire Particles
// ===========================

/**
 * Creates a fire particle system configuration
 * Orange/red particles with upward motion
 */
export function createFireParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'fire',
    name: 'Fire',
    particleCount: adjustForQuality(100, quality),
    spawnRate: 50,
    loop: true,
    spawnRadius: 0.3,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.2, 0.2],
        y: [-0.2, 0.2],
        z: [0.5, 1.5], // Upward
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0.3, // Slight upward acceleration
      },
      lifetime: 1.5,
      fadeIn: 0.1,
      fadeOut: 0.3,
      rotationSpeed: [-Math.PI, Math.PI],
      scaleOverTime: {
        start: 1.0,
        end: 0.3,
      },
    },
    appearance: {
      colors: ['#ff4500', '#ff6347', '#ff8c00', '#ffa500', '#ffff00'],
      size: 0.3,
      sizeVariation: 0.4,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Ice Particles
// ===========================

/**
 * Creates an ice particle system configuration
 * Blue/white crystalline particles
 */
export function createIceParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'ice',
    name: 'Ice',
    particleCount: adjustForQuality(80, quality),
    spawnRate: 40,
    loop: true,
    spawnRadius: 0.4,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.3, 0.3],
        y: [-0.3, 0.3],
        z: [-0.5, 0.1], // Slight downward bias
      },
      acceleration: {
        x: 0,
        y: 0,
        z: -0.2, // Gravity
      },
      lifetime: 2.0,
      fadeIn: 0.2,
      fadeOut: 0.4,
      rotationSpeed: [-Math.PI * 0.5, Math.PI * 0.5],
      scaleOverTime: {
        start: 0.5,
        end: 1.0,
      },
    },
    appearance: {
      colors: ['#87ceeb', '#add8e6', '#b0e0e6', '#e0ffff', '#f0f8ff'],
      size: 0.25,
      sizeVariation: 0.5,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      shape: 'spark',
    },
  };
}

// ===========================
// Lightning Particles
// ===========================

/**
 * Creates a lightning particle system configuration
 * Electric blue sparks with rapid motion
 */
export function createLightningParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'lightning',
    name: 'Lightning',
    particleCount: adjustForQuality(60, quality),
    spawnRate: 80,
    loop: true,
    spawnRadius: 0.2,
    quality,
    behavior: {
      velocityRange: {
        x: [-1.5, 1.5],
        y: [-1.5, 1.5],
        z: [-1.5, 1.5],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0,
      },
      lifetime: 0.5, // Short, rapid bursts
      fadeIn: 0.0,
      fadeOut: 0.5,
      rotationSpeed: [-Math.PI * 2, Math.PI * 2],
      scaleOverTime: {
        start: 1.0,
        end: 0.2,
      },
    },
    appearance: {
      colors: ['#00bfff', '#1e90ff', '#4169e1', '#0000ff', '#ffffff'],
      size: 0.2,
      sizeVariation: 0.6,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      shape: 'spark',
    },
  };
}

// ===========================
// Healing Particles
// ===========================

/**
 * Creates a healing particle system configuration
 * Green/gold sparkles with gentle upward motion
 */
export function createHealingParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'healing',
    name: 'Healing',
    particleCount: adjustForQuality(70, quality),
    spawnRate: 35,
    loop: true,
    spawnRadius: 0.5,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.2, 0.2],
        y: [-0.2, 0.2],
        z: [0.3, 0.8],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0.1,
      },
      lifetime: 2.5,
      fadeIn: 0.3,
      fadeOut: 0.4,
      rotationSpeed: [-Math.PI * 0.3, Math.PI * 0.3],
      scaleOverTime: {
        start: 0.8,
        end: 1.2,
      },
    },
    appearance: {
      colors: ['#00ff00', '#32cd32', '#98fb98', '#ffd700', '#ffff00'],
      size: 0.15,
      sizeVariation: 0.3,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Poison Particles
// ===========================

/**
 * Creates a poison particle system configuration
 * Green miasma with slow, spreading motion
 */
export function createPoisonParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'poison',
    name: 'Poison',
    particleCount: adjustForQuality(90, quality),
    spawnRate: 30,
    loop: true,
    spawnRadius: 0.3,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.15, 0.15],
        y: [-0.15, 0.15],
        z: [-0.1, 0.2],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0.05,
      },
      lifetime: 3.0,
      fadeIn: 0.4,
      fadeOut: 0.5,
      rotationSpeed: [-Math.PI * 0.2, Math.PI * 0.2],
      scaleOverTime: {
        start: 0.5,
        end: 1.5,
      },
    },
    appearance: {
      colors: ['#228b22', '#2e8b57', '#3cb371', '#00ff00', '#7fff00'],
      size: 0.4,
      sizeVariation: 0.5,
      opacity: 0.5,
      blending: THREE.NormalBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Necrotic Particles
// ===========================

/**
 * Creates a necrotic particle system configuration
 * Dark purple/black wisps with eerie movement
 */
export function createNecroticParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'necrotic',
    name: 'Necrotic',
    particleCount: adjustForQuality(85, quality),
    spawnRate: 40,
    loop: true,
    spawnRadius: 0.4,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.25, 0.25],
        y: [-0.25, 0.25],
        z: [-0.3, 0.3],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: -0.1,
      },
      lifetime: 2.2,
      fadeIn: 0.3,
      fadeOut: 0.6,
      rotationSpeed: [-Math.PI * 0.4, Math.PI * 0.4],
      scaleOverTime: {
        start: 1.0,
        end: 0.5,
      },
    },
    appearance: {
      colors: ['#4b0082', '#8b008b', '#9400d3', '#483d8b', '#2f4f4f'],
      size: 0.35,
      sizeVariation: 0.4,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Radiant Particles
// ===========================

/**
 * Creates a radiant particle system configuration
 * Bright white/yellow light particles
 */
export function createRadiantParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'radiant',
    name: 'Radiant',
    particleCount: adjustForQuality(75, quality),
    spawnRate: 45,
    loop: true,
    spawnRadius: 0.3,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.4, 0.4],
        y: [-0.4, 0.4],
        z: [0.2, 0.6],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0.2,
      },
      lifetime: 1.8,
      fadeIn: 0.1,
      fadeOut: 0.4,
      rotationSpeed: [-Math.PI, Math.PI],
      scaleOverTime: {
        start: 1.2,
        end: 0.4,
      },
    },
    appearance: {
      colors: ['#ffffff', '#fffacd', '#ffffe0', '#fafad2', '#ffd700'],
      size: 0.2,
      sizeVariation: 0.3,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Smoke Particles
// ===========================

/**
 * Creates a smoke particle system configuration
 * Gray smoke with upward drift
 */
export function createSmokeParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'smoke',
    name: 'Smoke',
    particleCount: adjustForQuality(60, quality),
    spawnRate: 25,
    loop: true,
    spawnRadius: 0.2,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.1, 0.1],
        y: [-0.1, 0.1],
        z: [0.2, 0.5],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0.15,
      },
      lifetime: 3.5,
      fadeIn: 0.5,
      fadeOut: 0.7,
      rotationSpeed: [-Math.PI * 0.1, Math.PI * 0.1],
      scaleOverTime: {
        start: 0.5,
        end: 2.0,
      },
    },
    appearance: {
      colors: ['#696969', '#808080', '#a9a9a9', '#c0c0c0', '#d3d3d3'],
      size: 0.5,
      sizeVariation: 0.6,
      opacity: 0.4,
      blending: THREE.NormalBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Blood Particles
// ===========================

/**
 * Creates a blood particle system configuration
 * Red droplets with downward motion (for damage effects)
 */
export function createBloodParticles(quality: ParticleQuality = ParticleQuality.MEDIUM): ParticleSystemConfig {
  return {
    id: 'blood',
    name: 'Blood',
    particleCount: adjustForQuality(50, quality),
    spawnRate: 100,
    loop: false, // One-shot effect
    spawnRadius: 0.2,
    quality,
    behavior: {
      velocityRange: {
        x: [-0.5, 0.5],
        y: [-0.5, 0.5],
        z: [0.1, 0.5],
      },
      acceleration: {
        x: 0,
        y: 0,
        z: -2.0, // Strong gravity
      },
      lifetime: 1.0,
      fadeIn: 0.0,
      fadeOut: 0.3,
      scaleOverTime: {
        start: 1.0,
        end: 0.5,
      },
    },
    appearance: {
      colors: ['#8b0000', '#a52a2a', '#dc143c', '#b22222'],
      size: 0.15,
      sizeVariation: 0.4,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      shape: 'circle',
    },
  };
}

// ===========================
// Particle System Registry
// ===========================

/**
 * Registry of all available particle systems
 */
export const ParticleSystemRegistry = {
  fire: createFireParticles,
  ice: createIceParticles,
  lightning: createLightningParticles,
  healing: createHealingParticles,
  poison: createPoisonParticles,
  necrotic: createNecroticParticles,
  radiant: createRadiantParticles,
  smoke: createSmokeParticles,
  blood: createBloodParticles,
} as const;

export type ParticleSystemType = keyof typeof ParticleSystemRegistry;

/**
 * Gets a particle system configuration by type
 */
export function getParticleSystem(
  type: ParticleSystemType,
  quality: ParticleQuality = ParticleQuality.MEDIUM
): ParticleSystemConfig {
  const factory = ParticleSystemRegistry[type];
  return factory(quality);
}

// ===========================
// Utility Functions
// ===========================

/**
 * Creates a random velocity within a range
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Creates a random color from an array
 */
export function randomColor(colors: string[]): THREE.Color {
  const colorString = colors[Math.floor(Math.random() * colors.length)];
  return new THREE.Color(colorString);
}

/**
 * Calculates particle opacity based on lifetime progress
 */
export function calculateParticleOpacity(
  age: number,
  lifetime: number,
  baseOpacity: number,
  fadeIn: number = 0,
  fadeOut: number = 0
): number {
  const progress = age / lifetime;

  // Fade in
  if (progress < fadeIn) {
    return baseOpacity * (progress / fadeIn);
  }

  // Fade out
  if (progress > 1 - fadeOut) {
    return baseOpacity * ((1 - progress) / fadeOut);
  }

  return baseOpacity;
}

/**
 * Calculates particle scale based on lifetime progress
 */
export function calculateParticleScale(
  age: number,
  lifetime: number,
  startScale: number,
  endScale: number
): number {
  const progress = age / lifetime;
  return startScale + (endScale - startScale) * progress;
}

// ===========================
// Exports
// ===========================

export default {
  createFireParticles,
  createIceParticles,
  createLightningParticles,
  createHealingParticles,
  createPoisonParticles,
  createNecroticParticles,
  createRadiantParticles,
  createSmokeParticles,
  createBloodParticles,
  getParticleSystem,
  ParticleSystemRegistry,
};
