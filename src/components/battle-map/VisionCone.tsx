/**
 * VisionCone Component
 *
 * Renders directional vision cones for tokens with limited vision angles.
 * Displays cone shape that rotates with token facing and darkens areas outside the cone.
 *
 * @module components/battle-map/VisionCone
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Token } from '@/types/token';
import { calculateVisionRadius, getVisionColor } from '@/utils/vision-calculations';

/**
 * Props for VisionCone component
 */
export interface VisionConeProps {
  /** The token whose vision cone to display */
  token: Token;
  /** Grid size in pixels */
  gridSize: number;
  /** Whether to show the cone */
  visible?: boolean;
  /** Opacity of the cone */
  opacity?: number;
  /** Whether to show darkness outside cone */
  showDarkness?: boolean;
  /** Opacity of darkness outside cone */
  darknessOpacity?: number;
}

/**
 * VisionCone Component
 *
 * Displays a token's directional vision as a cone shape.
 * Useful for creatures with limited vision angles.
 *
 * Features:
 * - Cone shape rendering
 * - Rotates with token facing
 * - Gradient fade at edges
 * - Optional darkness overlay for areas outside cone
 * - Adjustable cone width
 *
 * @example
 * ```tsx
 * <VisionCone
 *   token={token}
 *   gridSize={100}
 *   visible={true}
 *   showDarkness={true}
 * />
 * ```
 */
export function VisionCone({
  token,
  gridSize,
  visible = true,
  opacity = 0.3,
  showDarkness = true,
  darknessOpacity = 0.6,
}: VisionConeProps) {
  const coneRef = useRef<THREE.Mesh>(null);
  const darknessRef = useRef<THREE.Mesh>(null);

  // Calculate cone parameters
  const coneData = useMemo(() => {
    if (!token.vision.enabled || token.vision.angle >= 360) {
      return null;
    }

    const radius = calculateVisionRadius(token);
    if (radius === 0) {
      return null;
    }

    const radiusInPixels = (radius / 5) * gridSize;
    const angle = token.vision.angle;
    const color = getVisionColor(token.vision.visionMode);

    return {
      radius: radiusInPixels,
      angle,
      color,
    };
  }, [token, gridSize]);

  // Create cone geometry
  const coneGeometry = useMemo(() => {
    if (!coneData) return null;

    const thetaStart = THREE.MathUtils.degToRad(-coneData.angle / 2);
    const thetaLength = THREE.MathUtils.degToRad(coneData.angle);

    return new THREE.CircleGeometry(coneData.radius, 64, thetaStart, thetaLength);
  }, [coneData]);

  // Create cone material with gradient
  const coneMaterial = useMemo(() => {
    if (!coneData) return null;

    // Create a radial gradient that fades at edges
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

      gradient.addColorStop(0, `${coneData.color}80`);
      gradient.addColorStop(0.7, `${coneData.color}40`);
      gradient.addColorStop(0.95, `${coneData.color}10`);
      gradient.addColorStop(1, `${coneData.color}00`);

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
      blending: THREE.NormalBlending,
    });
  }, [coneData, opacity]);

  // Create darkness geometry (inverted cone)
  const darknessGeometry = useMemo(() => {
    if (!coneData || !showDarkness) return null;

    // Large circle with a hole for the cone
    // We'll use a ring to represent the "not visible" area
    const innerRadius = 0;
    const outerRadius = coneData.radius * 3; // Large enough to cover viewport

    return new THREE.RingGeometry(innerRadius, outerRadius, 64);
  }, [coneData, showDarkness]);

  // Darkness material
  const darknessMaterial = useMemo(() => {
    if (!coneData || !showDarkness) return null;

    return new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: darknessOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [coneData, showDarkness, darknessOpacity]);

  if (!visible || !coneData || !coneGeometry || !coneMaterial) {
    return null;
  }

  const position: [number, number, number] = [
    token.x,
    token.y,
    0.06, // Above vision range
  ];

  const rotation: [number, number, number] = [
    0,
    0,
    THREE.MathUtils.degToRad(token.rotation),
  ];

  return (
    <group name={`vision-cone-${token.id}`}>
      {/* Darkness outside cone */}
      {showDarkness && darknessGeometry && darknessMaterial && (
        <ConeDarknessOverlay
          ref={darknessRef}
          token={token}
          coneAngle={coneData.angle}
          coneRadius={coneData.radius}
          opacity={darknessOpacity}
        />
      )}

      {/* Vision cone */}
      <mesh
        ref={coneRef}
        position={position}
        rotation={rotation}
        geometry={coneGeometry}
        material={coneMaterial}
        renderOrder={2}
      />
    </group>
  );
}

/**
 * ConeDarknessOverlay Component
 *
 * Renders a dark overlay for areas outside the vision cone.
 * Uses a custom shader to create an inverted cone effect.
 */
interface ConeDarknessOverlayProps {
  token: Token;
  coneAngle: number;
  coneRadius: number;
  opacity: number;
}

const ConeDarknessOverlay = React.forwardRef<THREE.Mesh, ConeDarknessOverlayProps>(
  ({ token, coneAngle, coneRadius, opacity }, ref) => {
    // Create a large plane that covers the viewport
    const geometry = useMemo(() => {
      return new THREE.PlaneGeometry(coneRadius * 4, coneRadius * 4, 1, 1);
    }, [coneRadius]);

    // Custom shader material for inverted cone
    const material = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          tokenPosition: { value: new THREE.Vector2(0, 0) },
          coneAngle: { value: THREE.MathUtils.degToRad(coneAngle) },
          coneRotation: { value: THREE.MathUtils.degToRad(token.rotation) },
          coneRadius: { value: coneRadius },
          opacity: { value: opacity },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;

          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec2 tokenPosition;
          uniform float coneAngle;
          uniform float coneRotation;
          uniform float coneRadius;
          uniform float opacity;

          varying vec2 vUv;
          varying vec3 vPosition;

          void main() {
            // Calculate position relative to token
            vec2 relativePos = vPosition.xy - tokenPosition;
            float distance = length(relativePos);

            // Calculate angle from token to this point
            float angle = atan(relativePos.y, relativePos.x);

            // Normalize angle to cone rotation
            float angleDiff = angle - coneRotation;

            // Normalize to -PI to PI
            if (angleDiff > 3.14159) angleDiff -= 6.28318;
            if (angleDiff < -3.14159) angleDiff += 6.28318;

            // Check if inside cone
            float halfConeAngle = coneAngle / 2.0;
            bool inCone = abs(angleDiff) <= halfConeAngle && distance <= coneRadius;

            // If inside cone, make transparent; otherwise dark
            float alpha = inCone ? 0.0 : opacity;

            // Smooth transition at cone edges
            float edgeSoftness = 0.1;
            if (!inCone && abs(abs(angleDiff) - halfConeAngle) < edgeSoftness) {
              float edgeFactor = abs(abs(angleDiff) - halfConeAngle) / edgeSoftness;
              alpha *= edgeFactor;
            }

            gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }, [coneAngle, token.rotation, coneRadius, opacity]);

    // Update uniforms when token moves or rotates
    useFrame(() => {
      if (material.uniforms) {
        material.uniforms.tokenPosition.value.set(token.x, token.y);
        material.uniforms.coneRotation.value = THREE.MathUtils.degToRad(token.rotation);
      }
    });

    return (
      <mesh
        ref={ref}
        position={[token.x, token.y, 0.05]}
        geometry={geometry}
        material={material}
        renderOrder={1}
      />
    );
  }
);

ConeDarknessOverlay.displayName = 'ConeDarknessOverlay';

/**
 * VisionConeIndicator Component
 *
 * Simplified vision cone for UI/preview purposes (no darkness overlay).
 */
export function VisionConeIndicator({
  token,
  gridSize,
  visible = true,
  opacity = 0.2,
}: Omit<VisionConeProps, 'showDarkness' | 'darknessOpacity'>) {
  return (
    <VisionCone
      token={token}
      gridSize={gridSize}
      visible={visible}
      opacity={opacity}
      showDarkness={false}
    />
  );
}

/**
 * VisionConeEditor Component
 *
 * Interactive vision cone editor for adjusting cone angle.
 * Renders handles for adjusting the cone width.
 */
export interface VisionConeEditorProps {
  token: Token;
  gridSize: number;
  onAngleChange: (angle: number) => void;
}

export function VisionConeEditor({
  token,
  gridSize,
  onAngleChange,
}: VisionConeEditorProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [currentAngle, setCurrentAngle] = React.useState(token.vision.angle);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      onAngleChange(currentAngle);
      setIsDragging(false);
    }
  };

  const handlePointerMove = (event: any) => {
    if (!isDragging) return;

    // Calculate new angle based on pointer position
    // This would need to be implemented based on your input system
    // For now, just a placeholder
    const newAngle = Math.max(15, Math.min(360, currentAngle));
    setCurrentAngle(newAngle);
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <VisionCone
        token={{
          ...token,
          vision: {
            ...token.vision,
            angle: currentAngle,
          },
        }}
        gridSize={gridSize}
        visible={true}
        opacity={isDragging ? 0.5 : 0.3}
        showDarkness={false}
      />
    </group>
  );
}
