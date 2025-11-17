/**
 * Sphere Template Component
 *
 * Renders a sphere/circle-shaped area of effect template for spells like Fireball.
 * Features:
 * - Radius input
 * - Origin point selection
 * - Show affected squares
 * - Edge squares: include if center is in radius
 * - Distance calculation options (Euclidean vs grid)
 */

import React, { useMemo, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Point2D } from '@/types/scene';
import { MeasurementTemplate } from '@/types/drawing';
import { Token } from '@/types/token';
import { getSpherePoints, getTokensInSphere, getAffectedGridSquares } from '@/utils/template-calculations';
import { Html } from '@react-three/drei';

// ===========================
// Types
// ===========================

export interface SphereTemplateProps {
  /** Template data */
  template: MeasurementTemplate;
  /** Grid size in pixels */
  gridSize: number;
  /** Tokens on the map */
  tokens?: Token[];
  /** Whether the template is draggable */
  draggable?: boolean;
  /** Whether to highlight affected grid squares */
  showGridHighlight?: boolean;
  /** Whether to highlight affected tokens */
  highlightTokens?: boolean;
  /** Whether to use grid distance calculation */
  useGridDistance?: boolean;
  /** Whether the template is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: (template: MeasurementTemplate, event: ThreeEvent<MouseEvent>) => void;
  /** Drag handler */
  onDrag?: (template: MeasurementTemplate, position: Point2D) => void;
}

// ===========================
// Component
// ===========================

export const SphereTemplate: React.FC<SphereTemplateProps> = ({
  template,
  gridSize,
  tokens = [],
  draggable = true,
  showGridHighlight = true,
  highlightTokens = true,
  useGridDistance = true,
  isSelected = false,
  onClick,
  onDrag,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);

  const origin: Point2D = { x: template.x, y: template.y };
  const radius = template.distance;

  // Calculate sphere geometry
  const spherePoints = useMemo(
    () => getSpherePoints(origin, radius, gridSize, 64),
    [origin, radius, gridSize]
  );

  // Create shape geometry
  const shapeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (spherePoints.length === 0) return null;

    shape.moveTo(spherePoints[0].x, spherePoints[0].y);
    for (let i = 1; i < spherePoints.length; i++) {
      shape.lineTo(spherePoints[i].x, spherePoints[i].y);
    }
    shape.closePath();

    return new THREE.ShapeGeometry(shape);
  }, [spherePoints]);

  // Get affected tokens
  const affectedTokens = useMemo(() => {
    if (!highlightTokens || !tokens.length) return [];
    return getTokensInSphere(origin, radius, tokens, gridSize, useGridDistance);
  }, [origin, radius, tokens, gridSize, useGridDistance, highlightTokens]);

  // Get affected grid squares
  const affectedSquares = useMemo(() => {
    if (!showGridHighlight) return [];
    return getAffectedGridSquares(template, gridSize);
  }, [template, gridSize, showGridHighlight]);

  // Handle click
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onClick?.(template, event);
  };

  // Handle pointer down for dragging
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    event.stopPropagation();
    setIsDragging(true);
  };

  // Handle pointer move for dragging
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !onDrag) return;
    event.stopPropagation();

    const newPosition = { x: event.point.x, y: event.point.y };
    onDrag(template, newPosition);
  };

  // Handle pointer up
  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      event.stopPropagation();
      setIsDragging(false);
    }
  };

  if (!shapeGeometry) return null;

  const borderColor = new THREE.Color(template.borderColor);
  const fillColor = new THREE.Color(template.fillColor);

  return (
    <group ref={groupRef} name={`sphere-template-${template.id}`}>
      {/* Affected grid squares highlight */}
      {showGridHighlight &&
        affectedSquares.map((square, index) => (
          <mesh key={index} position={[square.x * gridSize + gridSize / 2, square.y * gridSize + gridSize / 2, 0.1]}>
            <planeGeometry args={[gridSize * 0.95, gridSize * 0.95]} />
            <meshBasicMaterial
              color={fillColor}
              transparent
              opacity={template.fillAlpha * 0.3}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Sphere fill */}
      <mesh
        position={[0, 0, 0.2]}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <primitive object={shapeGeometry} />
        <meshBasicMaterial
          color={fillColor}
          transparent
          opacity={template.fillAlpha}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sphere border */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={spherePoints.length + 1}
            array={
              new Float32Array([
                ...spherePoints.flatMap((p) => [p.x, p.y, 0.21]),
                spherePoints[0].x,
                spherePoints[0].y,
                0.21,
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={borderColor} linewidth={2} opacity={template.borderAlpha} transparent />
      </line>

      {/* Selection indicator */}
      {isSelected && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={spherePoints.length + 1}
              array={
                new Float32Array([
                  ...spherePoints.flatMap((p) => [p.x, p.y, 0.22]),
                  spherePoints[0].x,
                  spherePoints[0].y,
                  0.22,
                ])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={4} />
        </line>
      )}

      {/* Origin marker */}
      <mesh position={[origin.x, origin.y, 0.3]}>
        <circleGeometry args={[5, 16]} />
        <meshBasicMaterial color={borderColor} transparent opacity={template.borderAlpha} />
      </mesh>

      {/* Radius indicator line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([
                origin.x,
                origin.y,
                0.25,
                origin.x,
                origin.y - (radius / 5) * gridSize,
                0.25,
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={borderColor} linewidth={1} opacity={template.borderAlpha * 0.7} transparent />
      </line>

      {/* Template label */}
      <Html position={[origin.x, origin.y - 20, 0.3]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `1px solid ${template.borderColor}`,
          }}
        >
          {template.spellName || 'Sphere'}: {radius}ft radius
          {affectedTokens.length > 0 && (
            <span style={{ marginLeft: '8px', color: '#ff6b6b' }}>
              ({affectedTokens.length} targets)
            </span>
          )}
        </div>
      </Html>

      {/* Token highlights */}
      {highlightTokens &&
        affectedTokens.map((token) => (
          <TokenHighlight key={token.id} token={token} gridSize={gridSize} color={template.borderColor} />
        ))}
    </group>
  );
};

// ===========================
// Sub-Components
// ===========================

interface TokenHighlightProps {
  token: Token;
  gridSize: number;
  color: string;
}

const TokenHighlight: React.FC<TokenHighlightProps> = ({ token, gridSize, color }) => {
  const tokenCenter = {
    x: token.x + gridSize / 2,
    y: token.y + gridSize / 2,
  };

  return (
    <mesh position={[tokenCenter.x, tokenCenter.y, 0.4]}>
      <ringGeometry args={[gridSize * 0.4, gridSize * 0.5, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};

export default SphereTemplate;
