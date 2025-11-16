/**
 * Vision System Usage Examples
 *
 * Comprehensive examples showing how to integrate the Line of Sight
 * calculation system with React components and the battle map.
 *
 * @module examples/vision-system-usage
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Token } from '@/types/token';
import type { VisionBlocker } from '@/types/scene';
import { VisionPolygon, FogOfWarMask, VisionBoundary } from '@/components/battle-map/VisionPolygon';
import { calculateVisionPolygon } from '@/utils/vision-calculations';
import { buildQuadTree } from '@/utils/spatial-partitioning';
import VisionWorkerManager from '@/utils/vision-worker-manager';
import { calculateSceneLighting } from '@/utils/lighting-integration';

// ===========================
// Example 1: Basic Vision Polygon
// ===========================

/**
 * Simple vision polygon for a single token
 */
export const BasicVisionExample: React.FC<{
  token: Token;
  walls: VisionBlocker[];
}> = ({ token, walls }) => {
  return (
    <svg width="2000" height="2000">
      {/* Render vision polygon */}
      <VisionPolygon
        tokens={token}
        walls={walls}
        showBoundary={false}
      />

      {/* Token representation */}
      <circle
        cx={token.x}
        cy={token.y}
        r={25}
        fill="#4ade80"
        stroke="#22c55e"
        strokeWidth={2}
      />
    </svg>
  );
};

// ===========================
// Example 2: Multiple Tokens with Fog of War
// ===========================

/**
 * Party vision with fog of war masking
 */
export const PartyVisionWithFog: React.FC<{
  playerTokens: Token[];
  walls: VisionBlocker[];
  isGMView: boolean;
}> = ({ playerTokens, walls, isGMView }) => {
  const [visionPolygons, setVisionPolygons] = useState<any[]>([]);

  // Calculate vision for all player tokens
  useEffect(() => {
    if (isGMView) {
      setVisionPolygons([]);
      return;
    }

    const polygons = playerTokens.map((token) =>
      calculateVisionPolygon(token, walls)
    );
    setVisionPolygons(polygons);
  }, [playerTokens, walls, isGMView]);

  return (
    <svg width="2000" height="2000">
      {/* Background map */}
      <image href="/battle-map.jpg" width="2000" height="2000" />

      {/* Fog of War (inverted mask of vision) */}
      {!isGMView && (
        <FogOfWarMask
          polygons={visionPolygons}
          canvasWidth={2000}
          canvasHeight={2000}
          fogColor="#000000"
          fogOpacity={0.85}
        />
      )}

      {/* Vision polygons (highlighted areas) */}
      {playerTokens.map((token) => (
        <VisionPolygon
          key={token.id}
          tokens={token}
          walls={walls}
          showBoundary={isGMView} // Show boundaries only for GM
        />
      ))}

      {/* Tokens */}
      {playerTokens.map((token) => (
        <circle
          key={token.id}
          cx={token.x}
          cy={token.y}
          r={25}
          fill="#4ade80"
        />
      ))}
    </svg>
  );
};

// ===========================
// Example 3: Web Worker for Performance
// ===========================

/**
 * High-performance vision using Web Worker
 */
export const PerformantVisionExample: React.FC<{
  tokens: Token[];
  walls: VisionBlocker[];
}> = ({ tokens, walls }) => {
  const [visionPolygons, setVisionPolygons] = useState<Map<string, any>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function calculateVision() {
      setIsCalculating(true);

      try {
        const manager = VisionWorkerManager.getInstance();
        await manager.initialize();

        // Calculate all polygons in parallel
        const polygons = await manager.calculateMultiVision(tokens, walls);

        if (mounted) {
          setVisionPolygons(polygons);
          setIsCalculating(false);
        }
      } catch (error) {
        console.error('Vision calculation error:', error);
        setIsCalculating(false);
      }
    }

    calculateVision();

    return () => {
      mounted = false;
    };
  }, [tokens, walls]);

  return (
    <svg width="2000" height="2000">
      {/* Show loading state */}
      {isCalculating && (
        <text x="1000" y="1000" textAnchor="middle" fill="white">
          Calculating vision...
        </text>
      )}

      {/* Render vision polygons */}
      {tokens.map((token) => {
        const polygon = visionPolygons.get(token.id);
        if (!polygon) return null;

        return (
          <VisionPolygon
            key={token.id}
            tokens={token}
            walls={walls}
            useWorker={true}
          />
        );
      })}
    </svg>
  );
};

// ===========================
// Example 4: Spatial Partitioning for Large Scenes
// ===========================

/**
 * Optimized vision for scenes with many walls
 */
export const OptimizedVisionExample: React.FC<{
  token: Token;
  walls: VisionBlocker[];
}> = ({ token, walls }) => {
  // Build quadtree once when walls change
  const quadTree = useMemo(() => {
    return buildQuadTree(walls);
  }, [walls]);

  const polygon = useMemo(() => {
    // QuadTree speeds up vision calculation dramatically
    return calculateVisionPolygon(token, walls);
  }, [token, walls]);

  // Log performance stats
  useEffect(() => {
    const stats = quadTree.getStats();
    console.log('QuadTree stats:', stats);
  }, [quadTree]);

  return (
    <svg width="2000" height="2000">
      <VisionPolygon
        tokens={token}
        walls={walls}
      />

      {/* Optional: Visualize quadtree bounds (debug) */}
      {/* <QuadTreeVisualization tree={quadTree} /> */}
    </svg>
  );
};

// ===========================
// Example 5: Vision with Lighting
// ===========================

/**
 * Integrated vision and dynamic lighting
 */
export const VisionWithLightingExample: React.FC<{
  tokens: Token[];
  walls: VisionBlocker[];
}> = ({ tokens, walls }) => {
  const quadTree = useMemo(() => buildQuadTree(walls), [walls]);

  const lighting = useMemo(() => {
    return calculateSceneLighting(tokens, walls, quadTree);
  }, [tokens, walls, quadTree]);

  // Separate player tokens and light sources
  const playerTokens = tokens.filter((t) => t.vision.enabled);
  const lightSources = tokens.filter((t) => t.light.emitsLight);

  return (
    <svg width="2000" height="2000">
      {/* Background */}
      <rect width="2000" height="2000" fill="#1a1a1a" />

      {/* Bright light areas */}
      {lighting.brightLightPolygons.map((light, i) => (
        <path
          key={`bright-${i}`}
          d={polygonToPath(light.points)}
          fill={light.color}
          fillOpacity={light.intensity}
        />
      ))}

      {/* Dim light areas */}
      {lighting.dimLightPolygons.map((light, i) => (
        <path
          key={`dim-${i}`}
          d={polygonToPath(light.points)}
          fill={light.color}
          fillOpacity={light.intensity * 0.5}
        />
      ))}

      {/* Shadows */}
      {lighting.shadows.map((shadow, i) => (
        <path
          key={`shadow-${i}`}
          d={polygonToPath(shadow.points)}
          fill="#000000"
          fillOpacity={shadow.opacity}
        />
      ))}

      {/* Player vision polygons */}
      {playerTokens.map((token) => (
        <VisionPolygon
          key={token.id}
          tokens={token}
          walls={walls}
        />
      ))}

      {/* Tokens */}
      {tokens.map((token) => (
        <g key={token.id}>
          <circle cx={token.x} cy={token.y} r={25} fill="#4ade80" />
          {token.light.emitsLight && (
            <circle
              cx={token.x}
              cy={token.y}
              r={15}
              fill={token.light.lightColor}
              opacity={0.8}
            />
          )}
        </g>
      ))}
    </svg>
  );
};

// ===========================
// Example 6: Limited Vision Cone
// ===========================

/**
 * Token with directional/limited vision (e.g., 90° cone)
 */
export const LimitedVisionConeExample: React.FC<{
  token: Token;
  walls: VisionBlocker[];
}> = ({ token, walls }) => {
  // Token should have vision.angle < 360
  return (
    <svg width="2000" height="2000">
      {/* Vision cone polygon */}
      <VisionPolygon
        tokens={token}
        walls={walls}
        showBoundary={true}
      />

      {/* Vision boundary arc */}
      <VisionBoundary
        token={token}
        color="#fbbf24"
      />

      {/* Token with direction indicator */}
      <g>
        <circle cx={token.x} cy={token.y} r={25} fill="#4ade80" />
        <line
          x1={token.x}
          y1={token.y}
          x2={token.x + Math.cos((token.rotation * Math.PI) / 180) * 40}
          y2={token.y + Math.sin((token.rotation * Math.PI) / 180) * 40}
          stroke="#22c55e"
          strokeWidth={3}
        />
      </g>
    </svg>
  );
};

// ===========================
// Example 7: Real-time Updates with Throttling
// ===========================

/**
 * Vision updates throttled to max 10/sec for performance
 */
export const ThrottledVisionExample: React.FC<{
  token: Token;
  walls: VisionBlocker[];
}> = ({ token, walls }) => {
  const [polygon, setPolygon] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;

    // Throttle to max 10 updates per second
    if (timeSinceLastUpdate < 100) {
      return;
    }

    // Calculate vision
    const poly = calculateVisionPolygon(token, walls);
    setPolygon(poly);
    setLastUpdate(now);
  }, [token.x, token.y, token.rotation, walls]);

  if (!polygon) return null;

  return (
    <svg width="2000" height="2000">
      <path
        d={polygonToPath(polygon.points)}
        fill="#4ade80"
        fillOpacity={0.2}
      />
    </svg>
  );
};

// ===========================
// Example 8: GM Tools - Show All Vision
// ===========================

/**
 * GM view showing all token vision boundaries
 */
export const GMVisionToolsExample: React.FC<{
  tokens: Token[];
  walls: VisionBlocker[];
}> = ({ tokens, walls }) => {
  return (
    <svg width="2000" height="2000">
      {/* Show vision for all tokens */}
      {tokens.map((token) => (
        <g key={token.id}>
          {/* Vision polygon */}
          <VisionPolygon
            tokens={token}
            walls={walls}
            showBoundary={true}
            isGMView={false} // Force calculation even in GM mode
          />

          {/* Vision boundary */}
          <VisionBoundary
            token={token}
            color={token.disposition === 'friendly' ? '#22c55e' : '#ef4444'}
          />

          {/* Token label */}
          <text
            x={token.x}
            y={token.y - 40}
            textAnchor="middle"
            fill="white"
            fontSize="12"
          >
            {token.name} ({token.vision.range}ft)
          </text>
        </g>
      ))}

      {/* Tokens */}
      {tokens.map((token) => (
        <circle
          key={token.id}
          cx={token.x}
          cy={token.y}
          r={25}
          fill={token.disposition === 'friendly' ? '#4ade80' : '#ef4444'}
        />
      ))}
    </svg>
  );
};

// ===========================
// Utility Functions
// ===========================

/**
 * Convert polygon points to SVG path
 */
function polygonToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ' Z';

  return path;
}

// ===========================
// Integration with BattleMap Component
// ===========================

/**
 * Complete integration example with BattleMap
 */
export const BattleMapIntegrationExample: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [walls, setWalls] = useState<VisionBlocker[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);
  const [isGMView, setIsGMView] = useState(false);

  // Build quadtree when walls change
  const quadTree = useMemo(() => buildQuadTree(walls), [walls]);

  // Update worker when walls change
  useEffect(() => {
    const manager = VisionWorkerManager.getInstance();
    manager.updateWalls(walls);
  }, [walls]);

  return (
    <div className="battle-map-container">
      {/* Controls */}
      <div className="controls">
        <button onClick={() => setIsGMView(!isGMView)}>
          {isGMView ? 'Player View' : 'GM View'}
        </button>
      </div>

      {/* Battle Map */}
      <svg width="2000" height="2000">
        {/* Background */}
        <image href="/map-background.jpg" width="2000" height="2000" />

        {/* Lighting */}
        <LightingLayer tokens={tokens} walls={walls} quadTree={quadTree} />

        {/* Fog of War (Player View Only) */}
        {!isGMView && (
          <FogOfWarLayer
            tokens={selectedTokens}
            walls={walls}
            quadTree={quadTree}
          />
        )}

        {/* Walls (visible in GM view) */}
        {isGMView && <WallsLayer walls={walls} />}

        {/* Tokens */}
        <TokensLayer tokens={tokens} />

        {/* Vision Boundaries (GM view) */}
        {isGMView && <VisionBoundariesLayer tokens={tokens} />}
      </svg>
    </div>
  );
};

// Helper components for integration example
const LightingLayer: React.FC<any> = ({ tokens, walls, quadTree }) => null;
const FogOfWarLayer: React.FC<any> = ({ tokens, walls, quadTree }) => null;
const WallsLayer: React.FC<any> = ({ walls }) => null;
const TokensLayer: React.FC<any> = ({ tokens }) => null;
const VisionBoundariesLayer: React.FC<any> = ({ tokens }) => null;

export default BattleMapIntegrationExample;
