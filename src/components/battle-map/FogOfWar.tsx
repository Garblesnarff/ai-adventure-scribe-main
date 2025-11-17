/**
 * Fog of War Component
 *
 * Renders dark overlay over unrevealed areas of the battle map.
 * Supports three fog states:
 * - Dark (never seen): Fully opaque
 * - Dim (previously seen): Semi-transparent
 * - Revealed (currently visible): No fog
 *
 * Real-time synchronization via WebSocket for multi-user sessions.
 *
 * @module components/battle-map/FogOfWar
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Point2D } from '@/types/scene';
import type { FogPolygon } from '@/utils/fog-calculations';
import { polygonToThreeShape, simplifyPolygon } from '@/utils/fog-calculations';
import type { RevealedArea } from '@/types/fog-of-war';
import { useFogWebSocket } from '@/hooks/useFogWebSocket';

// ===========================
// Types
// ===========================

export interface FogOfWarProps {
  /** Scene width in pixels */
  width: number;
  /** Scene height in pixels */
  height: number;
  /** Permanently revealed areas */
  revealedAreas: FogPolygon[];
  /** Currently visible areas (temporary) */
  currentlyVisible?: FogPolygon[];
  /** Whether fog is enabled */
  enabled?: boolean;
  /** Dark fog opacity (0-1) */
  darkOpacity?: number;
  /** Dim fog opacity (0-1) */
  dimOpacity?: number;
  /** Fog color */
  fogColor?: string;
  /** Current user is GM */
  isGM?: boolean;
  /** Show fog to GM */
  showToGM?: boolean;
  /** Scene ID for WebSocket sync */
  sceneId?: string;
  /** Auth token for WebSocket */
  token?: string;
  /** Current user ID */
  userId?: string;
  /** Callback when revealed areas updated from WebSocket */
  onRevealedAreasUpdate?: (areas: RevealedArea[]) => void;
  /** Enable real-time synchronization */
  enableSync?: boolean;
}

/**
 * FogOfWar Component
 *
 * Renders fog of war overlay on the battle map. Creates a dark overlay
 * that covers the entire scene, then cuts out revealed areas using
 * THREE.Shape holes.
 *
 * Fog states:
 * - Never seen: Full dark fog (darkOpacity)
 * - Previously seen: Dim fog (dimOpacity)
 * - Currently visible: No fog
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <FogOfWar
 *     width={2000}
 *     height={1500}
 *     revealedAreas={permanentlyRevealed}
 *     currentlyVisible={visibleNow}
 *     enabled={true}
 *   />
 * </Canvas>
 * ```
 */
export function FogOfWar({
  width,
  height,
  revealedAreas,
  currentlyVisible = [],
  enabled = true,
  darkOpacity = 0.95,
  dimOpacity = 0.4,
  fogColor = '#000000',
  isGM = false,
  showToGM = false,
  sceneId,
  token,
  userId,
  onRevealedAreasUpdate,
  enableSync = false,
}: FogOfWarProps) {
  const darkFogRef = useRef<THREE.Mesh>(null);
  const dimFogRef = useRef<THREE.Mesh>(null);

  // State for remote fog updates
  const [remoteFogAreas, setRemoteFogAreas] = useState<RevealedArea[]>([]);
  const [isUpdatingByOther, setIsUpdatingByOther] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket integration for real-time sync
  const { isConnected, sendReveal, sendConceal } = useFogWebSocket(
    {
      sceneId,
      token,
      autoConnect: enableSync && !!sceneId && !!token,
    },
    {
      onReveal: useCallback(
        (areas: RevealedArea[], sourceUserId: string) => {
          // Only process if from another user
          if (sourceUserId !== userId) {
            setRemoteFogAreas((prev) => [...prev, ...areas]);
            setIsUpdatingByOther(true);

            // Clear existing timeout
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
            }

            // Reset visual feedback after 2 seconds
            updateTimeoutRef.current = setTimeout(() => {
              setIsUpdatingByOther(false);
            }, 2000);

            // Notify parent component
            if (onRevealedAreasUpdate) {
              onRevealedAreasUpdate(areas);
            }
          }
        },
        [userId, onRevealedAreasUpdate]
      ),
      onConceal: useCallback(
        (areas: RevealedArea[], sourceUserId: string) => {
          // Only process if from another user
          if (sourceUserId !== userId) {
            const areaIds = new Set(areas.map((a) => a.id));
            setRemoteFogAreas((prev) => prev.filter((a) => !areaIds.has(a.id)));
            setIsUpdatingByOther(true);

            // Clear existing timeout
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
            }

            // Reset visual feedback after 2 seconds
            updateTimeoutRef.current = setTimeout(() => {
              setIsUpdatingByOther(false);
            }, 2000);
          }
        },
        [userId]
      ),
    }
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Merge local and remote revealed areas
  const allRevealedAreas = useMemo(() => {
    return [...revealedAreas, ...remoteFogAreas];
  }, [revealedAreas, remoteFogAreas]);

  // Don't show to GM unless explicitly enabled
  const shouldShow = enabled && (!isGM || showToGM);

  // Create dark fog geometry (full scene with currently visible areas cut out)
  const darkFogGeometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Outer rectangle (full scene)
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
    shape.closePath();

    // Cut out currently visible areas (holes)
    currentlyVisible.forEach((area) => {
      if (area.points.length < 3) return;

      const hole = new THREE.Path();
      hole.moveTo(area.points[0].x, area.points[0].y);

      for (let i = 1; i < area.points.length; i++) {
        hole.lineTo(area.points[i].x, area.points[i].y);
      }

      hole.closePath();
      shape.holes.push(hole);
    });

    // Also cut out all revealed areas (local + remote)
    allRevealedAreas.forEach((area) => {
      if (area.points.length < 3) return;

      const hole = new THREE.Path();
      hole.moveTo(area.points[0].x, area.points[0].y);

      for (let i = 1; i < area.points.length; i++) {
        hole.lineTo(area.points[i].x, area.points[i].y);
      }

      hole.closePath();
      shape.holes.push(hole);
    });

    return new THREE.ShapeGeometry(shape);
  }, [width, height, allRevealedAreas, currentlyVisible]);

  // Create dim fog geometry (full scene with only currently visible cut out)
  const dimFogGeometry = useMemo(() => {
    // Only show dim fog over previously revealed areas
    if (allRevealedAreas.length === 0) return null;

    const shapes: THREE.Shape[] = [];

    allRevealedAreas.forEach((area) => {
      if (area.points.length < 3) return;

      const shape = new THREE.Shape();
      shape.moveTo(area.points[0].x, area.points[0].y);

      for (let i = 1; i < area.points.length; i++) {
        shape.lineTo(area.points[i].x, area.points[i].y);
      }

      shape.closePath();
      shapes.push(shape);
    });

    if (shapes.length === 0) return null;

    return new THREE.ShapeGeometry(shapes);
  }, [allRevealedAreas]);

  // Material for dark fog
  const darkFogMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: fogColor,
        transparent: true,
        opacity: darkOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [fogColor, darkOpacity]
  );

  // Material for dim fog
  const dimFogMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: fogColor,
        transparent: true,
        opacity: dimOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [fogColor, dimOpacity]
  );

  // Update geometries when they change
  useEffect(() => {
    if (darkFogRef.current) {
      darkFogRef.current.geometry = darkFogGeometry;
    }
  }, [darkFogGeometry]);

  useEffect(() => {
    if (dimFogRef.current && dimFogGeometry) {
      dimFogRef.current.geometry = dimFogGeometry;
    }
  }, [dimFogGeometry]);

  if (!shouldShow) {
    return null;
  }

  return (
    <group name="fog-of-war" position={[0, 0, 10]}>
      {/* Dark fog layer (covers unrevealed areas) */}
      <mesh
        ref={darkFogRef}
        geometry={darkFogGeometry}
        material={darkFogMaterial}
        renderOrder={100}
      />

      {/* Dim fog layer (covers previously seen areas) */}
      {dimFogGeometry && (
        <mesh
          ref={dimFogRef}
          geometry={dimFogGeometry}
          material={dimFogMaterial}
          renderOrder={101}
        />
      )}

      {/* Visual feedback when fog is being updated by another user */}
      {isUpdatingByOther && enableSync && (
        <mesh position={[width / 2, height / 2, 15]} renderOrder={200}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            color="#4ade80"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * SimpleFogOfWar Component
 *
 * Simplified fog rendering using canvas texture instead of geometry.
 * Better performance for complex fog patterns.
 *
 * @example
 * ```tsx
 * <SimpleFogOfWar
 *   width={2000}
 *   height={1500}
 *   revealedAreas={allRevealed}
 * />
 * ```
 */
export function SimpleFogOfWar({
  width,
  height,
  revealedAreas,
  enabled = true,
  darkOpacity = 0.95,
  fogColor = '#000000',
  isGM = false,
  showToGM = false,
}: Omit<FogOfWarProps, 'currentlyVisible' | 'dimOpacity'>) {
  const meshRef = useRef<THREE.Mesh>(null);

  const shouldShow = enabled && (!isGM || showToGM);

  // Create fog texture using canvas
  const fogTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const scale = 0.5; // Render at half resolution for performance
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill with dark fog
    ctx.fillStyle = fogColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out revealed areas using composite operation
    ctx.globalCompositeOperation = 'destination-out';

    revealedAreas.forEach((area) => {
      if (area.points.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(area.points[0].x * scale, area.points[0].y * scale);

      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x * scale, area.points[i].y * scale);
      }

      ctx.closePath();
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [width, height, revealedAreas, fogColor]);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: fogTexture,
        transparent: true,
        opacity: darkOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [fogTexture, darkOpacity]
  );

  if (!shouldShow || !fogTexture) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[width / 2, height / 2, 10]}
      material={material}
      renderOrder={100}
    >
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

/**
 * FogBrushPreview Component
 *
 * Shows a preview circle for the fog brush tool.
 *
 * @example
 * ```tsx
 * <FogBrushPreview
 *   position={{ x: 500, y: 300 }}
 *   radius={50}
 *   mode="reveal"
 * />
 * ```
 */
export interface FogBrushPreviewProps {
  /** Brush position */
  position: Point2D;
  /** Brush radius in pixels */
  radius: number;
  /** Brush mode */
  mode: 'reveal' | 'conceal';
  /** Visible */
  visible?: boolean;
}

export function FogBrushPreview({
  position,
  radius,
  mode,
  visible = true,
}: FogBrushPreviewProps) {
  const color = mode === 'reveal' ? '#4ade80' : '#f87171'; // green for reveal, red for conceal

  if (!visible) return null;

  return (
    <mesh position={[position.x, position.y, 15]} renderOrder={200}>
      <ringGeometry args={[radius - 2, radius, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * FogResetConfirmation Component
 *
 * UI component for confirming fog reset action.
 * Rendered outside Canvas in a 2D overlay.
 */
export interface FogResetConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function FogResetConfirmation({ onConfirm, onCancel }: FogResetConfirmationProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="bg-card p-6 rounded-lg border border-border shadow-lg max-w-md">
        <h3 className="text-lg font-semibold mb-2">Reset Fog of War?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This will clear all revealed areas and reset the fog of war to its initial state.
          This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reset Fog
          </button>
        </div>
      </div>
    </div>
  );
}
