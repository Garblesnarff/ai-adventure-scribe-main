/**
 * Battle Map Example Component
 *
 * Demonstrates usage of BackgroundImage and BackgroundPlaceholder
 * components for rendering battle maps with background images.
 *
 * This is a reference implementation showing best practices.
 */

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { BackgroundImage } from './BackgroundImage';
import { GridPlane, GroundPlane } from './GridPlane';
import { GridType } from '@/types/scene';

interface BattleMapExampleProps {
  /** URL of the background image */
  imageUrl?: string;

  /** Grid width in cells */
  width?: number;

  /** Grid height in cells */
  height?: number;

  /** Size of each grid cell in world units */
  gridSize?: number;

  /** Type of grid overlay */
  gridType?: GridType;

  /** Background image opacity */
  backgroundOpacity?: number;

  /** Grid line opacity */
  gridOpacity?: number;
}

/**
 * Battle Map Scene Component
 * Contains the 3D scene with background, grid, and controls
 */
const BattleMapScene: React.FC<BattleMapExampleProps> = ({
  imageUrl = '/maps/example-dungeon.jpg',
  width = 20,
  height = 15,
  gridSize = 1,
  gridType = GridType.SQUARE,
  backgroundOpacity = 0.9,
  gridOpacity = 0.3,
}) => {
  const worldWidth = width * gridSize;
  const worldHeight = height * gridSize;
  const centerX = worldWidth / 2;
  const centerY = worldHeight / 2;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      {/* Camera positioned to view the entire map */}
      <PerspectiveCamera
        makeDefault
        position={[centerX, centerY, Math.max(worldWidth, worldHeight)]}
        fov={50}
      />

      {/* Background Image Layer */}
      <group position={[centerX, centerY, 0]}>
        <BackgroundImage
          imageUrl={imageUrl}
          width={width}
          height={height}
          gridSize={gridSize}
          lockAspectRatio={true}
          opacity={backgroundOpacity}
        />
      </group>

      {/* Grid Overlay Layer */}
      <group position={[0, 0, 0.1]}>
        <GridPlane
          width={worldWidth}
          height={worldHeight}
          gridSize={gridSize}
          gridType={gridType}
          gridColor="#000000"
          gridOpacity={gridOpacity}
        />
      </group>

      {/* Ground Plane for raycasting (invisible) */}
      <group position={[0, 0, 0]}>
        <GroundPlane
          width={worldWidth}
          height={worldHeight}
          opacity={0}
          visible={true}
        />
      </group>

      {/* Camera Controls */}
      <OrbitControls
        target={[centerX, centerY, 0]}
        enableRotate={true}
        enableZoom={true}
        enablePan={true}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={0}
        minDistance={5}
        maxDistance={100}
      />
    </>
  );
};

/**
 * Battle Map Example - Main Component
 * Wraps the scene in a Canvas with proper configuration
 */
export const BattleMapExample: React.FC<BattleMapExampleProps> = (props) => {
  const [key, setKey] = useState(0);

  // Handle WebGL context loss
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    console.warn('WebGL context lost, attempting recovery...');
  };

  const handleContextRestored = () => {
    console.info('WebGL context restored');
    setKey((k) => k + 1); // Force canvas recreation
  };

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <Canvas
        key={key}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', handleContextLost);
          canvas.addEventListener('webglcontextrestored', handleContextRestored);
        }}
        shadows={false}
        dpr={[1, 2]} // Responsive pixel ratio
      >
        <BattleMapScene {...props} />
      </Canvas>

      {/* UI Controls Overlay (optional) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}
      >
        <div>Controls:</div>
        <div>• Left Mouse: Rotate</div>
        <div>• Right Mouse: Pan</div>
        <div>• Scroll: Zoom</div>
      </div>
    </div>
  );
};

/**
 * Example usage with different configurations
 */
export const BattleMapExamples = {
  // Standard dungeon map
  dungeon: (
    <BattleMapExample
      imageUrl="/maps/dungeon-hall.jpg"
      width={25}
      height={20}
      gridSize={1}
      gridType={GridType.SQUARE}
      backgroundOpacity={0.9}
      gridOpacity={0.3}
    />
  ),

  // Outdoor forest map with hex grid
  forest: (
    <BattleMapExample
      imageUrl="/maps/forest-clearing.jpg"
      width={30}
      height={25}
      gridSize={1}
      gridType={GridType.HEXAGONAL_VERTICAL}
      backgroundOpacity={0.85}
      gridOpacity={0.25}
    />
  ),

  // Tavern map, smaller size
  tavern: (
    <BattleMapExample
      imageUrl="/maps/tavern-interior.jpg"
      width={15}
      height={12}
      gridSize={1}
      gridType={GridType.SQUARE}
      backgroundOpacity={1}
      gridOpacity={0.4}
    />
  ),

  // Gridless battlemap for theater of mind
  gridless: (
    <BattleMapExample
      imageUrl="/maps/abstract-background.jpg"
      width={20}
      height={20}
      gridSize={1}
      gridType={GridType.GRIDLESS}
      backgroundOpacity={0.7}
    />
  ),
};

export default BattleMapExample;
