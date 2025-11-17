/**
 * Vision Polygon Component
 *
 * Renders the visible area polygon for tokens and handles fog-of-war clipping.
 * Integrates with the vision worker for efficient calculation.
 *
 * @module components/battle-map/VisionPolygon
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Token } from '@/types/token';
import type { VisionBlocker } from '@/types/scene';
import type { VisionPolygon as VisionPolygonType } from '@/utils/vision-calculations';
import {
  calculateVisionPolygon,
  mergeVisionPolygons,
  getVisionColor,
  getVisionOpacity,
} from '@/utils/vision-calculations';

// ===========================
// Types
// ===========================

interface VisionPolygonProps {
  /** Token(s) to render vision for */
  tokens: Token | Token[];
  /** Vision blocking walls */
  walls: VisionBlocker[];
  /** Override vision range in pixels */
  range?: number;
  /** Whether to show vision boundary (debug) */
  showBoundary?: boolean;
  /** Whether to use Web Worker for calculation */
  useWorker?: boolean;
  /** Custom color override */
  color?: string;
  /** Custom opacity override */
  opacity?: number;
  /** Whether this is GM view (sees all) */
  isGMView?: boolean;
}

interface VisionMaskProps {
  /** Vision polygons to render as fog mask */
  polygons: VisionPolygonType[];
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Fog color */
  fogColor?: string;
  /** Fog opacity */
  fogOpacity?: number;
}

// ===========================
// Vision Polygon Component
// ===========================

/**
 * Render vision polygon for one or more tokens
 *
 * @example
 * ```tsx
 * <VisionPolygon
 *   tokens={playerTokens}
 *   walls={sceneWalls}
 *   range={600}
 *   showBoundary={false}
 * />
 * ```
 */
export const VisionPolygon: React.FC<VisionPolygonProps> = ({
  tokens,
  walls,
  range,
  showBoundary = false,
  useWorker = false,
  color,
  opacity,
  isGMView = false,
}) => {
  const [polygon, setPolygon] = useState<VisionPolygonType | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Normalize tokens to array
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

  // Calculate vision polygon
  useEffect(() => {
    if (isGMView) {
      // GM sees everything, no vision restrictions
      setPolygon(null);
      return;
    }

    if (useWorker && typeof Worker !== 'undefined') {
      // Use Web Worker for heavy calculations
      if (!workerRef.current) {
        // Create worker (path needs to be adjusted based on build config)
        try {
          workerRef.current = new Worker(
            new URL('../../workers/vision-worker.ts', import.meta.url)
          );

          workerRef.current.onmessage = (event) => {
            const response = event.data;

            if (response.type === 'MULTI_VISION_RESULT') {
              const polygons = Object.values(response.payload.polygons);
              if (polygons.length > 0) {
                const merged = mergeVisionPolygons(polygons as VisionPolygonType[]);
                setPolygon(merged);
              }
            } else if (response.type === 'ERROR') {
              console.error('Vision worker error:', response.payload.error);
              // Fallback to synchronous calculation
              calculateSync();
            }
          };
        } catch (error) {
          console.warn('Failed to create vision worker, using sync calculation:', error);
          calculateSync();
          return;
        }
      }

      // Send calculation request
      const requestId = `req-${++requestIdRef.current}`;
      workerRef.current.postMessage({
        type: 'CALCULATE_MULTI_VISION',
        payload: {
          tokens: tokenArray,
          walls,
          range,
        },
        requestId,
      });
    } else {
      // Synchronous calculation
      calculateSync();
    }

    function calculateSync() {
      if (tokenArray.length === 1) {
        const poly = calculateVisionPolygon(tokenArray[0], walls, range);
        setPolygon(poly);
      } else {
        const polygons = tokenArray.map((token) =>
          calculateVisionPolygon(token, walls, range)
        );
        const merged = mergeVisionPolygons(polygons);
        setPolygon(merged);
      }
    }

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [tokens, walls, range, useWorker, isGMView, tokenArray]);

  // Determine visual properties
  const visionColor = useMemo(() => {
    if (color) return color;
    if (!polygon) return '#ffffff';
    return getVisionColor(polygon.visionMode);
  }, [color, polygon]);

  const visionOpacity = useMemo(() => {
    if (opacity !== undefined) return opacity;
    if (!polygon) return 0.15;
    return getVisionOpacity(polygon.visionMode);
  }, [opacity, polygon]);

  // Don't render if no polygon or GM view
  if (!polygon || polygon.points.length === 0 || isGMView) {
    return null;
  }

  // Create SVG path from polygon points
  const pathData = useMemo(() => {
    if (!polygon.points.length) return '';

    const points = polygon.points;
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    path += ' Z'; // Close path
    return path;
  }, [polygon]);

  return (
    <g className="vision-polygon">
      {/* Visible area fill */}
      <path
        d={pathData}
        fill={visionColor}
        fillOpacity={visionOpacity}
        stroke="none"
        pointerEvents="none"
      />

      {/* Optional boundary (debug/GM view) */}
      {showBoundary && (
        <path
          d={pathData}
          fill="none"
          stroke={visionColor}
          strokeWidth={2}
          strokeOpacity={0.5}
          strokeDasharray="5,5"
          pointerEvents="none"
        />
      )}
    </g>
  );
};

// ===========================
// Fog of War Mask Component
// ===========================

/**
 * Render fog of war as inverted mask of vision polygons
 *
 * Uses SVG masking to show fog everywhere except visible areas.
 *
 * @example
 * ```tsx
 * <FogOfWarMask
 *   polygons={visionPolygons}
 *   canvasWidth={2000}
 *   canvasHeight={2000}
 *   fogColor="#000000"
 *   fogOpacity={0.8}
 * />
 * ```
 */
export const FogOfWarMask: React.FC<VisionMaskProps> = ({
  polygons,
  canvasWidth,
  canvasHeight,
  fogColor = '#000000',
  fogOpacity = 0.85,
}) => {
  const maskId = useMemo(() => `fog-mask-${Math.random().toString(36).substr(2, 9)}`, []);

  // Create paths for all vision polygons
  const visionPaths = useMemo(() => {
    return polygons
      .filter((p) => p.points.length > 0)
      .map((polygon, index) => {
        let path = `M ${polygon.points[0].x} ${polygon.points[0].y}`;
        for (let i = 1; i < polygon.points.length; i++) {
          path += ` L ${polygon.points[i].x} ${polygon.points[i].y}`;
        }
        path += ' Z';
        return { path, key: `vision-${index}` };
      });
  }, [polygons]);

  return (
    <g className="fog-of-war">
      <defs>
        <mask id={maskId}>
          {/* White background = show fog */}
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="white" />

          {/* Black areas = hide fog (visible areas) */}
          {visionPaths.map(({ path, key }) => (
            <path key={key} d={path} fill="black" />
          ))}
        </mask>
      </defs>

      {/* Fog layer with mask applied */}
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={fogColor}
        fillOpacity={fogOpacity}
        mask={`url(#${maskId})`}
        pointerEvents="none"
      />
    </g>
  );
};

// ===========================
// Vision Boundary (Debug Component)
// ===========================

interface VisionBoundaryProps {
  token: Token;
  range?: number;
  color?: string;
}

/**
 * Show vision range boundary (debug/GM tool)
 *
 * Renders a simple circle showing maximum vision range
 */
export const VisionBoundary: React.FC<VisionBoundaryProps> = ({
  token,
  range,
  color = '#ffffff',
}) => {
  const effectiveRange = range !== undefined ? range : token.vision.range * 20;

  if (!token.vision.enabled || effectiveRange === 0) {
    return null;
  }

  return (
    <g className="vision-boundary">
      {/* Full circle for 360° vision */}
      {token.vision.angle >= 360 ? (
        <circle
          cx={token.x}
          cy={token.y}
          r={effectiveRange}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.3}
          strokeDasharray="5,5"
          pointerEvents="none"
        />
      ) : (
        /* Arc for limited vision cone */
        <VisionConeArc
          token={token}
          range={effectiveRange}
          color={color}
        />
      )}
    </g>
  );
};

// ===========================
// Vision Cone Arc Component
// ===========================

interface VisionConeArcProps {
  token: Token;
  range: number;
  color: string;
}

/**
 * Render vision cone arc for limited-angle vision
 */
const VisionConeArc: React.FC<VisionConeArcProps> = ({ token, range, color }) => {
  const pathData = useMemo(() => {
    const halfAngle = (token.vision.angle / 2) * (Math.PI / 180);
    const centerAngle = token.rotation * (Math.PI / 180);

    const startAngle = centerAngle - halfAngle;
    const endAngle = centerAngle + halfAngle;

    const startX = token.x + Math.cos(startAngle) * range;
    const startY = token.y + Math.sin(startAngle) * range;
    const endX = token.x + Math.cos(endAngle) * range;
    const endY = token.y + Math.sin(endAngle) * range;

    const largeArcFlag = token.vision.angle > 180 ? 1 : 0;

    return `
      M ${token.x} ${token.y}
      L ${startX} ${startY}
      A ${range} ${range} 0 ${largeArcFlag} 1 ${endX} ${endY}
      Z
    `;
  }, [token, range]);

  return (
    <path
      d={pathData}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeOpacity={0.3}
      strokeDasharray="5,5"
      pointerEvents="none"
    />
  );
};

// ===========================
// Utility Hook
// ===========================

/**
 * Hook to calculate and cache vision polygons
 *
 * @example
 * ```tsx
 * const { polygon, isCalculating } = useVisionPolygon(token, walls, range);
 * ```
 */
export function useVisionPolygon(
  token: Token | null,
  walls: VisionBlocker[],
  range?: number
): {
  polygon: VisionPolygonType | null;
  isCalculating: boolean;
} {
  const [polygon, setPolygon] = useState<VisionPolygonType | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!token) {
      setPolygon(null);
      return;
    }

    setIsCalculating(true);

    // Use requestIdleCallback for non-blocking calculation
    const handle = requestIdleCallback(
      () => {
        const poly = calculateVisionPolygon(token, walls, range);
        setPolygon(poly);
        setIsCalculating(false);
      },
      { timeout: 100 }
    );

    return () => {
      cancelIdleCallback(handle);
      setIsCalculating(false);
    };
  }, [token, walls, range]);

  return { polygon, isCalculating };
}

// ===========================
// Default Export
// ===========================

export default VisionPolygon;
