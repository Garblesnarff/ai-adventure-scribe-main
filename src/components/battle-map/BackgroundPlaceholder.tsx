import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface BackgroundPlaceholderProps {
  width: number;
  height: number;
  color?: string;
  showAnimation?: boolean;
}

/**
 * BackgroundPlaceholder component
 * Displays an animated loading placeholder while the background image loads
 * Matches the grid size and provides visual feedback
 */
export const BackgroundPlaceholder: React.FC<BackgroundPlaceholderProps> = ({
  width,
  height,
  color = '#2c3e50',
  showAnimation = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Animate the placeholder
  useFrame((state, delta) => {
    if (!showAnimation) return;

    timeRef.current += delta;

    // Pulse animation for the loading indicator
    if (pulseRef.current) {
      const scale = 1 + Math.sin(timeRef.current * 3) * 0.1;
      pulseRef.current.scale.set(scale, scale, 1);

      // Fade opacity
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(timeRef.current * 2) * 0.2;
    }

    // Subtle rotation for the group
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(timeRef.current * 0.5) * 0.02;
    }
  });

  // Create a grid pattern for visual interest
  const gridLines = React.useMemo(() => {
    const lines: JSX.Element[] = [];
    const cellSize = Math.min(width, height) / 10;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = -width / 2 + i * cellSize;
      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([x, -height / 2, 0, x, height / 2, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial attach="material" color="#ffffff" opacity={0.1} transparent />
        </line>
      );
    }

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = -height / 2 + i * cellSize;
      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-width / 2, y, 0, width / 2, y, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial attach="material" color="#ffffff" opacity={0.1} transparent />
        </line>
      );
    }

    return lines;
  }, [width, height]);

  return (
    <group ref={groupRef} position={[0, 0, -0.1]}>
      {/* Base background */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={color} opacity={0.5} transparent />
      </mesh>

      {/* Grid pattern */}
      {gridLines}

      {/* Loading indicator circles */}
      <group position={[0, 0, 0.01]}>
        {/* Outer pulse circle */}
        <mesh ref={pulseRef}>
          <ringGeometry args={[Math.min(width, height) * 0.05, Math.min(width, height) * 0.08, 32]} />
          <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>

        {/* Inner circle */}
        <mesh>
          <circleGeometry args={[Math.min(width, height) * 0.04, 32]} />
          <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
        </mesh>

        {/* Rotating dots */}
        <LoadingDots
          radius={Math.min(width, height) * 0.1}
          dotCount={8}
          dotSize={Math.min(width, height) * 0.01}
        />
      </group>
    </group>
  );
};

/**
 * LoadingDots component
 * Animated rotating dots for loading indication
 */
interface LoadingDotsProps {
  radius: number;
  dotCount?: number;
  dotSize?: number;
  rotationSpeed?: number;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({
  radius,
  dotCount = 8,
  dotSize = 0.05,
  rotationSpeed = 2,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * rotationSpeed;
    }
  });

  const dots = React.useMemo(() => {
    const dotElements: JSX.Element[] = [];
    const angleStep = (Math.PI * 2) / dotCount;

    for (let i = 0; i < dotCount; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const opacity = 0.3 + (i / dotCount) * 0.7;

      dotElements.push(
        <mesh key={i} position={[x, y, 0]}>
          <circleGeometry args={[dotSize, 16]} />
          <meshBasicMaterial color="#ffffff" opacity={opacity} transparent />
        </mesh>
      );
    }

    return dotElements;
  }, [radius, dotCount, dotSize]);

  return <group ref={groupRef}>{dots}</group>;
};

/**
 * SimpleBackgroundPlaceholder - A lightweight version without animations
 * Useful for better performance when many placeholders are needed
 */
interface SimpleBackgroundPlaceholderProps {
  width: number;
  height: number;
  color?: string;
}

export const SimpleBackgroundPlaceholder: React.FC<SimpleBackgroundPlaceholderProps> = ({
  width,
  height,
  color = '#2c3e50',
}) => {
  return (
    <mesh position={[0, 0, -0.1]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} opacity={0.5} transparent />
    </mesh>
  );
};
