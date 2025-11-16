/**
 * CameraController Component
 *
 * Provides orthographic camera controls for top-down battle map view.
 * Includes pan, zoom, and fit-to-scene functionality.
 *
 * @module components/battle-map/CameraController
 */

import { OrthographicCamera } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

/**
 * Props for CameraController component
 */
export interface CameraControllerProps {
  /** Scene width in grid units */
  sceneWidth?: number;
  /** Scene height in grid units */
  sceneHeight?: number;
  /** Grid size in pixels */
  gridSize?: number;
  /** Minimum zoom level (0.5 = zoomed out) */
  minZoom?: number;
  /** Maximum zoom level (4 = zoomed in) */
  maxZoom?: number;
  /** Enable pan controls */
  enablePan?: boolean;
  /** Enable zoom controls */
  enableZoom?: boolean;
}

/**
 * CameraController Component
 *
 * Manages camera controls for the battle map including:
 * - Pan controls (middle mouse drag or spacebar + drag)
 * - Zoom controls (scroll wheel)
 * - Fit-to-scene functionality
 * - Camera bounds limiting
 * - Smooth zoom transitions
 * - Double-click to center on point
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <CameraController
 *     sceneWidth={20}
 *     sceneHeight={20}
 *     gridSize={100}
 *     minZoom={0.5}
 *     maxZoom={4}
 *   />
 * </Canvas>
 * ```
 */
export function CameraController({
  sceneWidth = 20,
  sceneHeight = 20,
  gridSize = 100,
  minZoom = 0.5,
  maxZoom = 4,
  enablePan = true,
  enableZoom = true,
}: CameraControllerProps) {
  const { gl, size } = useThree();
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  // Camera state
  const [zoom, setZoom] = useState(1);
  const [targetZoom, setTargetZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [targetPanOffset, setTargetPanOffset] = useState({ x: 0, y: 0 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  /**
   * Fit camera to scene bounds
   */
  const fitToScene = useCallback(() => {
    const scenePixelWidth = sceneWidth * gridSize;
    const scenePixelHeight = sceneHeight * gridSize;
    const aspect = size.width / size.height;

    // Calculate zoom to fit scene with padding
    const padding = 1.1;
    const zoomX = (size.width / scenePixelWidth) * padding;
    const zoomY = (size.height / scenePixelHeight) * padding;
    const newZoom = Math.min(zoomX, zoomY);

    setTargetZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
    setTargetPanOffset({ x: 0, y: 0 });
  }, [sceneWidth, sceneHeight, gridSize, size, minZoom, maxZoom]);

  /**
   * Initialize camera on mount
   */
  useEffect(() => {
    fitToScene();
  }, [fitToScene]);

  /**
   * Handle wheel zoom
   */
  useEffect(() => {
    if (!enableZoom) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const delta = event.deltaY;
      const zoomSpeed = 0.001;
      const newZoom = targetZoom * (1 - delta * zoomSpeed);

      setTargetZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
    };

    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl, targetZoom, minZoom, maxZoom, enableZoom]);

  /**
   * Handle keyboard for spacebar pan
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isSpacePressed) {
        event.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  /**
   * Handle mouse events for panning
   */
  useEffect(() => {
    if (!enablePan) return;

    const canvas = gl.domElement;

    const handleMouseDown = (event: MouseEvent) => {
      // Middle mouse button or left mouse + spacebar
      if (event.button === 1 || (event.button === 0 && isSpacePressed)) {
        event.preventDefault();
        setIsPanning(true);
        setPanStart({ x: event.clientX, y: event.clientY });
        setPanStartOffset({ ...targetPanOffset });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isPanning) return;

      const deltaX = event.clientX - panStart.x;
      const deltaY = event.clientY - panStart.y;

      // Scale movement by zoom level
      const moveScale = 1 / targetZoom;

      setTargetPanOffset({
        x: panStartOffset.x + deltaX * moveScale,
        y: panStartOffset.y - deltaY * moveScale,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      event.preventDefault();

      // Calculate world position from click
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Pan to clicked position
      setTargetPanOffset({
        x: -x * (size.width / 2) / targetZoom,
        y: -y * (size.height / 2) / targetZoom,
      });
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [gl, isPanning, isSpacePressed, panStart, panStartOffset, targetPanOffset, targetZoom, size, enablePan]);

  /**
   * Handle touch events for mobile
   */
  useEffect(() => {
    if (!enablePan) return;

    const canvas = gl.domElement;
    let lastTouchDistance = 0;
    let lastTouchCenter = { x: 0, y: 0 };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // Single touch - pan
        const touch = event.touches[0];
        setPanStart({ x: touch.clientX, y: touch.clientY });
        setPanStartOffset({ ...targetPanOffset });
        setIsPanning(true);
      } else if (event.touches.length === 2) {
        // Two finger - zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];

        lastTouchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        lastTouchCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1 && isPanning) {
        // Single touch - pan
        const touch = event.touches[0];
        const deltaX = touch.clientX - panStart.x;
        const deltaY = touch.clientY - panStart.y;

        const moveScale = 1 / targetZoom;

        setTargetPanOffset({
          x: panStartOffset.x + deltaX * moveScale,
          y: panStartOffset.y - deltaY * moveScale,
        });
      } else if (event.touches.length === 2 && enableZoom) {
        // Two finger - zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];

        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        if (lastTouchDistance > 0) {
          const zoomDelta = distance / lastTouchDistance;
          const newZoom = targetZoom * zoomDelta;
          setTargetZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
        }

        lastTouchDistance = distance;
      }
    };

    const handleTouchEnd = () => {
      setIsPanning(false);
      lastTouchDistance = 0;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl, isPanning, panStart, panStartOffset, targetPanOffset, targetZoom, minZoom, maxZoom, enablePan, enableZoom]);

  /**
   * Smooth camera transitions each frame
   */
  useFrame(() => {
    if (!cameraRef.current) return;

    // Smooth zoom transition
    const zoomDiff = targetZoom - zoom;
    if (Math.abs(zoomDiff) > 0.001) {
      const newZoom = zoom + zoomDiff * 0.1;
      setZoom(newZoom);
      cameraRef.current.zoom = newZoom;
      cameraRef.current.updateProjectionMatrix();
    }

    // Smooth pan transition
    const panDiffX = targetPanOffset.x - panOffset.x;
    const panDiffY = targetPanOffset.y - panOffset.y;

    if (Math.abs(panDiffX) > 0.1 || Math.abs(panDiffY) > 0.1) {
      const newPanOffset = {
        x: panOffset.x + panDiffX * 0.1,
        y: panOffset.y + panDiffY * 0.1,
      };
      setPanOffset(newPanOffset);
      cameraRef.current.position.set(newPanOffset.x, newPanOffset.y, 100);
    }
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      zoom={zoom}
      position={[panOffset.x, panOffset.y, 100]}
      near={0.1}
      far={1000}
      left={-size.width / 2}
      right={size.width / 2}
      top={size.height / 2}
      bottom={-size.height / 2}
    />
  );
}
