/**
 * Line Template Component
 *
 * Renders a line-shaped area of effect template for spells like Lightning Bolt.
 * Features:
 * - Width and length input
 * - Show affected squares along line
 * - Snap to grid directions (cardinal + diagonal)
 * - Rotation support
 */

import React, { useMemo, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Point2D } from '@/types/scene';
import { MeasurementTemplate } from '@/types/drawing';
import { Token } from '@/types/token';
import { getLinePoints, getTokensInLine, getAffectedGridSquares } from '@/utils/template-calculations';
import { Html } from '@react-three/drei';

// ===========================
// Types
// ===========================

export interface LineTemplateProps {
  /** Template data */
  template: MeasurementTemplate;
  /** Grid size in pixels */
  gridSize: number;
  /** Tokens on the map */
  tokens?: Token[];
  /** Whether the template is draggable */
  draggable?: boolean;
  /** Whether the template is rotatable */
  rotatable?: boolean;
  /** Whether to highlight affected grid squares */
  showGridHighlight?: boolean;
  /** Whether to highlight affected tokens */
  highlightTokens?: boolean;
  /** Whether the template is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: (template: MeasurementTemplate, event: ThreeEvent<MouseEvent>) => void;
  /** Drag handler */
  onDrag?: (template: MeasurementTemplate, position: Point2D) => void;
  /** Rotation handler */
  onRotate?: (template: MeasurementTemplate, direction: number) => void;
}

// ===========================
// Component
// ===========================

export const LineTemplate: React.FC<LineTemplateProps> = ({
  template,
  gridSize,
  tokens = [],
  draggable = true,
  rotatable = true,
  showGridHighlight = true,
  highlightTokens = true,
  isSelected = false,
  onClick,
  onDrag,
  onRotate,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const origin: Point2D = { x: template.x, y: template.y };
  const length = template.distance;
  const width = template.width || 5;
  const direction = template.direction;

  // Calculate line geometry
  const linePoints = useMemo(
    () => getLinePoints(origin, direction, length, width, gridSize),
    [origin, direction, length, width, gridSize]
  );

  // Create shape geometry
  const shapeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (linePoints.length === 0) return null;

    shape.moveTo(linePoints[0].x, linePoints[0].y);
    for (let i = 1; i < linePoints.length; i++) {
      shape.lineTo(linePoints[i].x, linePoints[i].y);
    }
    shape.closePath();

    return new THREE.ShapeGeometry(shape);
  }, [linePoints]);

  // Get affected tokens
  const affectedTokens = useMemo(() => {
    if (!highlightTokens || !tokens.length) return [];
    return getTokensInLine(origin, direction, width, length, tokens, gridSize);
  }, [origin, direction, width, length, tokens, gridSize, highlightTokens]);

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

  // Handle pointer down for dragging/rotating
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!draggable && !rotatable) return;
    event.stopPropagation();

    // Check if shift key is pressed for rotation
    if (event.nativeEvent.shiftKey && rotatable) {
      setIsRotating(true);
    } else if (draggable) {
      setIsDragging(true);
    }
  };

  // Handle pointer move for dragging/rotating
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging && !isRotating) return;
    event.stopPropagation();

    if (isDragging && onDrag) {
      // Update position
      const newPosition = { x: event.point.x, y: event.point.y };
      onDrag(template, newPosition);
    } else if (isRotating && onRotate) {
      // Calculate angle from origin to cursor
      const dx = event.point.x - origin.x;
      const dy = event.point.y - origin.y;
      const newDirection = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      // Snap to 45-degree increments for lines
      const snappedDirection = Math.round(newDirection / 45) * 45;
      onRotate(template, snappedDirection);
    }
  };

  // Handle pointer up
  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (isDragging || isRotating) {
      event.stopPropagation();
      setIsDragging(false);
      setIsRotating(false);
    }
  };

  if (!shapeGeometry) return null;

  const borderColor = new THREE.Color(template.borderColor);
  const fillColor = new THREE.Color(template.fillColor);

  return (
    <group ref={groupRef} name={`line-template-${template.id}`}>
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

      {/* Line fill */}
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

      {/* Line border */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePoints.length + 1}
            array={
              new Float32Array([
                ...linePoints.flatMap((p) => [p.x, p.y, 0.21]),
                linePoints[0].x,
                linePoints[0].y,
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
              count={linePoints.length + 1}
              array={
                new Float32Array([
                  ...linePoints.flatMap((p) => [p.x, p.y, 0.22]),
                  linePoints[0].x,
                  linePoints[0].y,
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

      {/* Direction arrow */}
      {rotatable && (
        <DirectionArrow origin={origin} direction={direction} length={length} gridSize={gridSize} color={borderColor} />
      )}

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
          {template.spellName || 'Line'}: {length}ft x {width}ft
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

interface DirectionArrowProps {
  origin: Point2D;
  direction: number;
  length: number;
  gridSize: number;
  color: THREE.Color;
}

const DirectionArrow: React.FC<DirectionArrowProps> = ({ origin, direction, length, gridSize, color }) => {
  const directionRad = ((direction - 90) * Math.PI) / 180;
  const arrowLength = (length / 5) * gridSize;

  const endPoint = {
    x: origin.x + Math.cos(directionRad) * arrowLength * 0.5,
    y: origin.y + Math.sin(directionRad) * arrowLength * 0.5,
  };

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([origin.x, origin.y, 0.31, endPoint.x, endPoint.y, 0.31])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>
      <mesh position={[endPoint.x, endPoint.y, 0.31]} rotation={[0, 0, directionRad]}>
        <coneGeometry args={[5, 10, 3]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

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

export default LineTemplate;
