/**
 * LightSource Component
 *
 * Renders light emission from tokens on the battle map.
 * Displays bright and dim light ranges with optional animations.
 *
 * @module components/battle-map/LightSource
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Token, LightAnimation } from '@/types/token';

/**
 * Props for LightSource component
 */
export interface LightSourceProps {
  /** The token emitting light */
  token: Token;
  /** Grid size in pixels */
  gridSize: number;
  /** Whether lighting is enabled for the scene */
  lightingEnabled?: boolean;
  /** Override light opacity */
  opacity?: number;
  /** Whether to animate the light */
  animated?: boolean;
}

/**
 * LightSource Component
 *
 * Renders light emission from a token as concentric circles:
 * - Bright light: Full color and intensity
 * - Dim light: Faded color, lower opacity
 *
 * Supports:
 * - Color tinting
 * - Directional lights (torches, lanterns)
 * - Animated flicker effects
 * - Smooth falloff at edges
 *
 * @example
 * ```tsx
 * <LightSource
 *   token={token}
 *   gridSize={100}
 *   lightingEnabled={true}
 *   animated={true}
 * />
 * ```
 */
export function LightSource({
  token,
  gridSize,
  lightingEnabled = true,
  opacity: opacityOverride,
  animated = true,
}: LightSourceProps) {
  const brightLightRef = useRef<THREE.Mesh>(null);
  const dimLightRef = useRef<THREE.Mesh>(null);
  const animationRef = useRef({ time: 0, flickerOffset: Math.random() * 100 });

  // Only render if token emits light
  if (!token.light.emitsLight || !lightingEnabled) {
    return null;
  }

  const lightConfig = token.light;
  const brightRange = lightConfig.lightRange || 0;
  const dimRange = lightConfig.dimLightRange || 0;

  if (brightRange === 0 && dimRange === 0) {
    return null;
  }

  // Convert feet to pixels
  const brightRadiusPixels = (brightRange / 5) * gridSize;
  const dimRadiusPixels = ((brightRange + dimRange) / 5) * gridSize;

  const lightColor = lightConfig.lightColor || '#ffffff';
  const lightAlpha = opacityOverride ?? lightConfig.lightAlpha ?? 0.5;
  const colorIntensity = lightConfig.colorIntensity ?? 0.5;
  const isDirectional = (lightConfig.lightAngle ?? 360) < 360;

  // Animation
  useFrame((state, delta) => {
    if (!animated || !lightConfig.lightAnimation) return;

    animationRef.current.time += delta;
    const animation = lightConfig.lightAnimation;

    // Apply animation to meshes
    if (brightLightRef.current) {
      applyAnimation(
        brightLightRef.current,
        animation,
        animationRef.current.time,
        animationRef.current.flickerOffset
      );
    }

    if (dimLightRef.current) {
      applyAnimation(
        dimLightRef.current,
        animation,
        animationRef.current.time,
        animationRef.current.flickerOffset
      );
    }
  });

  return (
    <group
      name={`light-source-${token.id}`}
      position={[token.x, token.y, 0.02]}
      rotation={[0, 0, THREE.MathUtils.degToRad(token.rotation)]}
    >
      {/* Dim Light Layer */}
      {dimRange > 0 && (
        <LightLayer
          ref={dimLightRef}
          radius={dimRadiusPixels}
          color={lightColor}
          opacity={lightAlpha * 0.5}
          colorIntensity={colorIntensity * 0.7}
          isDirectional={isDirectional}
          angle={lightConfig.lightAngle ?? 360}
          isDim={true}
        />
      )}

      {/* Bright Light Layer */}
      {brightRange > 0 && (
        <LightLayer
          ref={brightLightRef}
          radius={brightRadiusPixels}
          color={lightColor}
          opacity={lightAlpha}
          colorIntensity={colorIntensity}
          isDirectional={isDirectional}
          angle={lightConfig.lightAngle ?? 360}
          isDim={false}
        />
      )}
    </group>
  );
}

/**
 * LightLayer Component
 *
 * Individual light circle/cone layer (bright or dim).
 */
interface LightLayerProps {
  radius: number;
  color: string;
  opacity: number;
  colorIntensity: number;
  isDirectional: boolean;
  angle: number;
  isDim: boolean;
}

const LightLayer = React.forwardRef<THREE.Mesh, LightLayerProps>(
  ({ radius, color, opacity, colorIntensity, isDirectional, angle, isDim }, ref) => {
    // Create gradient material
    const material = useMemo(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');

      if (context) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gradientRadius = canvas.width / 2;

        // Create radial gradient
        const gradient = context.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          gradientRadius
        );

        // Parse color and apply intensity
        const baseColor = new THREE.Color(color);
        const white = new THREE.Color('#ffffff');
        const blendedColor = white.lerp(baseColor, colorIntensity);

        const r = Math.round(blendedColor.r * 255);
        const g = Math.round(blendedColor.g * 255);
        const b = Math.round(blendedColor.b * 255);

        // Gradient stops for smooth falloff
        if (isDim) {
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
          gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
          gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.1)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
          gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.8)`);
          gradient.addColorStop(0.9, `rgba(${r}, ${g}, ${b}, 0.3)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        }

        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }, [color, opacity, colorIntensity, isDim]);

    // Create geometry based on directional vs omnidirectional
    const geometry = useMemo(() => {
      if (!isDirectional || angle >= 360) {
        return new THREE.CircleGeometry(radius, 64);
      }

      // Cone geometry for directional light
      const thetaStart = THREE.MathUtils.degToRad(-angle / 2);
      const thetaLength = THREE.MathUtils.degToRad(angle);

      return new THREE.CircleGeometry(radius, 64, thetaStart, thetaLength);
    }, [radius, isDirectional, angle]);

    return (
      <mesh
        ref={ref}
        material={material}
        geometry={geometry}
        renderOrder={0}
      />
    );
  }
);

LightLayer.displayName = 'LightLayer';

/**
 * Apply animation to a light mesh
 */
function applyAnimation(
  mesh: THREE.Mesh,
  animation: LightAnimation,
  time: number,
  flickerOffset: number
): void {
  const { type, speed, intensity, reverse } = animation;
  const animTime = time * speed;
  const direction = reverse ? -1 : 1;

  let scale = 1;
  let opacityMod = 1;

  switch (type) {
    case 'pulse':
      // Smooth pulsing
      scale = 1 + Math.sin(animTime * 2) * intensity * 0.1;
      opacityMod = 1 + Math.sin(animTime * 2) * intensity * 0.2;
      break;

    case 'flicker':
      // Torch-like flicker
      const flicker1 = Math.sin(animTime * 10 + flickerOffset) * 0.5 + 0.5;
      const flicker2 = Math.sin(animTime * 15.7 + flickerOffset * 1.3) * 0.5 + 0.5;
      const flickerValue = (flicker1 + flicker2) / 2;
      scale = 1 + (flickerValue - 0.5) * intensity * 0.15;
      opacityMod = 1 + (flickerValue - 0.5) * intensity * 0.3;
      break;

    case 'wave':
      // Wave effect
      scale = 1 + Math.sin(animTime * direction) * intensity * 0.15;
      break;

    case 'sunburst':
      // Radial sunburst
      const burstPhase = (animTime * direction) % (Math.PI * 2);
      scale = 1 + Math.abs(Math.sin(burstPhase)) * intensity * 0.2;
      opacityMod = 1 + Math.abs(Math.sin(burstPhase)) * intensity * 0.15;
      break;

    case 'torch':
      // Realistic torch flicker (complex)
      const torch1 = Math.sin(animTime * 8 + flickerOffset);
      const torch2 = Math.sin(animTime * 12.3 + flickerOffset * 1.7);
      const torch3 = Math.sin(animTime * 19.1 + flickerOffset * 0.7);
      const torchValue = (torch1 + torch2 * 0.5 + torch3 * 0.3) / 1.8;
      scale = 1 + torchValue * intensity * 0.1;
      opacityMod = 1 + torchValue * intensity * 0.25;
      break;

    case 'revolving':
      // Rotating light (changes direction rather than scale)
      mesh.rotation.z += delta * speed * direction;
      break;

    default:
      break;
  }

  // Apply scale
  if (type !== 'revolving') {
    mesh.scale.set(scale, scale, 1);
  }

  // Apply opacity modification
  if (mesh.material instanceof THREE.Material) {
    const baseMaterial = mesh.material as THREE.MeshBasicMaterial;
    // Store original opacity if not already stored
    if (!(mesh as any).originalOpacity) {
      (mesh as any).originalOpacity = baseMaterial.opacity;
    }
    baseMaterial.opacity = (mesh as any).originalOpacity * opacityMod;
  }
}

/**
 * CompositeLightSources Component
 *
 * Renders all light sources from multiple tokens in a scene.
 *
 * @example
 * ```tsx
 * <CompositeLightSources
 *   tokens={allTokens}
 *   gridSize={100}
 *   lightingEnabled={true}
 * />
 * ```
 */
export interface CompositeLightSourcesProps {
  /** All tokens in the scene */
  tokens: Token[];
  /** Grid size in pixels */
  gridSize: number;
  /** Whether lighting is enabled */
  lightingEnabled?: boolean;
  /** Whether to animate lights */
  animated?: boolean;
}

export function CompositeLightSources({
  tokens,
  gridSize,
  lightingEnabled = true,
  animated = true,
}: CompositeLightSourcesProps) {
  // Filter to only light-emitting tokens
  const lightTokens = useMemo(
    () => tokens.filter((token) => token.light.emitsLight),
    [tokens]
  );

  if (!lightingEnabled || lightTokens.length === 0) {
    return null;
  }

  return (
    <group name="light-sources">
      {lightTokens.map((token) => (
        <LightSource
          key={token.id}
          token={token}
          gridSize={gridSize}
          lightingEnabled={lightingEnabled}
          animated={animated}
        />
      ))}
    </group>
  );
}
