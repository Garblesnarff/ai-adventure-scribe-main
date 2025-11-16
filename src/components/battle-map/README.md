# Battle Map Components

This directory contains components for rendering 3D battle maps using React Three Fiber and Three.js.

## Phase 3.3: Background Layer

### Components

#### BackgroundImage

The main component for displaying background images on battle maps.

**Features:**
- Texture loading with THREE.TextureLoader
- Automatic scaling to scene dimensions (width × height × gridSize)
- Loading state handling with placeholder
- Error handling with visual feedback
- Texture optimization (mipmaps, anisotropic filtering)
- Proper texture disposal on unmount
- Aspect ratio locking option
- Opacity control

**Props:**
```typescript
interface BackgroundImageProps {
  imageUrl: string;          // URL of the background image
  width: number;             // Grid width (in cells)
  height: number;            // Grid height (in cells)
  gridSize: number;          // Size of each grid cell
  lockAspectRatio?: boolean; // Maintain image aspect ratio (default: true)
  opacity?: number;          // Image opacity 0-1 (default: 1)
}
```

**Usage Example:**
```tsx
import { Canvas } from '@react-three/fiber';
import { BackgroundImage } from '@/components/battle-map';

function BattleMapScene() {
  return (
    <Canvas camera={{ position: [0, 0, 10] }}>
      <ambientLight intensity={0.8} />

      <BackgroundImage
        imageUrl="/maps/dungeon-hall.jpg"
        width={20}
        height={15}
        gridSize={1}
        lockAspectRatio={true}
        opacity={0.9}
      />
    </Canvas>
  );
}
```

#### BackgroundPlaceholder

Animated loading placeholder shown while background image loads.

**Features:**
- Matches grid dimensions
- Animated pulsing effect
- Grid pattern overlay
- Rotating loading dots
- Customizable colors

**Props:**
```typescript
interface BackgroundPlaceholderProps {
  width: number;        // Width in world units
  height: number;       // Height in world units
  color?: string;       // Background color (default: '#2c3e50')
  showAnimation?: boolean; // Enable animations (default: true)
}
```

**Usage Example:**
```tsx
import { BackgroundPlaceholder } from '@/components/battle-map';

// Typically used automatically by BackgroundImage,
// but can be used standalone:
<BackgroundPlaceholder
  width={20}
  height={15}
  color="#1a1a1a"
  showAnimation={true}
/>
```

#### SimpleBackgroundPlaceholder

A lightweight version without animations for better performance.

**Usage Example:**
```tsx
import { SimpleBackgroundPlaceholder } from '@/components/battle-map';

<SimpleBackgroundPlaceholder
  width={20}
  height={15}
  color="#2c3e50"
/>
```

### Hooks

#### usePreloadBackgroundImages

Preload multiple background images for better performance.

**Usage Example:**
```tsx
import { usePreloadBackgroundImages } from '@/components/battle-map';

function MapSelector() {
  const mapUrls = [
    '/maps/tavern.jpg',
    '/maps/forest.jpg',
    '/maps/dungeon.jpg'
  ];

  const { isLoading, progress, loadedCount, totalCount } =
    usePreloadBackgroundImages(mapUrls);

  return (
    <div>
      {isLoading ? (
        <p>Loading maps: {loadedCount}/{totalCount} ({Math.round(progress * 100)}%)</p>
      ) : (
        <p>All maps loaded!</p>
      )}
    </div>
  );
}
```

## Complete Example

```tsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  BackgroundImage,
  GridPlane,
  GroundPlane,
  usePreloadBackgroundImages
} from '@/components/battle-map';
import { GridType } from '@/types/scene';

interface BattleMapProps {
  mapUrl: string;
  width?: number;
  height?: number;
  gridSize?: number;
  gridType?: GridType;
}

export const BattleMap: React.FC<BattleMapProps> = ({
  mapUrl,
  width = 20,
  height = 15,
  gridSize = 1,
  gridType = GridType.SQUARE
}) => {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas
        camera={{ position: [10, 10, 20], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />

        {/* Background image */}
        <BackgroundImage
          imageUrl={mapUrl}
          width={width}
          height={height}
          gridSize={gridSize}
          opacity={0.9}
        />

        {/* Grid overlay */}
        <GridPlane
          width={width * gridSize}
          height={height * gridSize}
          gridSize={gridSize}
          gridType={gridType}
          gridColor="#000000"
          gridOpacity={0.3}
        />

        {/* Invisible ground plane for raycasting */}
        <GroundPlane
          width={width * gridSize}
          height={height * gridSize}
          opacity={0}
          visible={true}
        />

        <OrbitControls
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
};

// Usage
function App() {
  const [currentMap, setCurrentMap] = useState('/maps/tavern.jpg');

  return (
    <BattleMap
      mapUrl={currentMap}
      width={25}
      height={20}
      gridSize={1}
      gridType={GridType.SQUARE}
    />
  );
}
```

## Performance Considerations

### Texture Optimization

1. **Image Formats:**
   - Use WebP for best compression
   - JPG for photographs
   - PNG for images requiring transparency

2. **Image Size:**
   - Recommended: 2048x2048 or smaller
   - Larger images are automatically mipmapped
   - Use power-of-two dimensions when possible (512, 1024, 2048)

3. **Texture Settings:**
   - Anisotropic filtering: 16 (maximum quality)
   - Mipmaps: Enabled automatically
   - Color space: sRGB

### Memory Management

The components automatically handle:
- Texture disposal on unmount
- Geometry disposal on unmount
- Material disposal on unmount
- WebGL context cleanup

### Best Practices

1. **Preload images** before showing the map
2. **Use SimpleBackgroundPlaceholder** when rendering multiple placeholders
3. **Set appropriate opacity** to blend background with other elements
4. **Lock aspect ratio** unless you specifically want stretching
5. **Monitor texture memory** usage in production

## Troubleshooting

### Image not loading

- Check that the image URL is accessible
- Verify CORS settings if loading from external domain
- Check browser console for error messages
- Ensure image format is supported (PNG, JPG, WebP)

### Performance issues

- Reduce image size (max 2048x2048 recommended)
- Use WebP format for better compression
- Disable animations in placeholder for multiple instances
- Check texture memory usage

### WebGL context loss

The components handle WebGL context loss gracefully, similar to the DiceRollEmbed component pattern used in this project.

## Phase 3.4: Layer Management

### Components

#### LayerManager

Orchestrates the rendering of all battle map layers in the correct z-index order.

**Features:**
- Manages layer visibility and opacity
- Controls layer rendering order (z-index)
- Prevents interaction with locked layers
- Reactive to store changes
- Six predefined layers (background, grid, tokens, effects, drawings, ui)

**Layer Rendering Order:**
- Layer 0: Background image
- Layer 1: Grid
- Layer 2: Tokens
- Layer 3: Effects
- Layer 4: Drawings
- Layer 5: UI

**Props:**
```typescript
interface LayerManagerProps {
  sceneId: string;      // The scene to render
  className?: string;   // Additional CSS classes
}
```

**Usage Example:**
```tsx
import { LayerManager } from '@/components/battle-map';

function BattleMapView({ sceneId }: { sceneId: string }) {
  return (
    <div className="w-full h-screen">
      <LayerManager sceneId={sceneId} />
    </div>
  );
}
```

#### LayersPanel

UI panel for controlling battle map layers.

**Features:**
- Toggle layer visibility with eye icon
- Lock/unlock layers with lock icon
- Adjust layer opacity with slider
- Syncs with backend via tRPC mutations
- Responsive design (collapsible sheet)
- Quick actions (show all, hide all, reset)
- Uses Shadcn UI components

**Props:**
```typescript
interface LayersPanelProps {
  sceneId: string;                       // The scene to manage
  side?: 'left' | 'right' | 'top' | 'bottom'; // Panel position (default: 'right')
  open?: boolean;                        // Controlled open state
  onOpenChange?: (open: boolean) => void; // Callback for open state changes
}
```

**Usage Example:**
```tsx
import { LayersPanel } from '@/components/battle-map';

function BattleMapControls({ sceneId }: { sceneId: string }) {
  return (
    <div className="absolute top-4 right-4">
      <LayersPanel sceneId={sceneId} side="right" />
    </div>
  );
}
```

### Store

#### useBattleMapStore

Zustand store for managing battle map state with localStorage persistence.

**Features:**
- Layer visibility and opacity control
- Layer lock state
- Camera position and zoom
- Tool selection (select, move, measure, draw, pan)
- Active scene tracking
- Persistent storage of user preferences

**State:**
```typescript
interface BattleMapState {
  activeSceneId: string | null;
  layerVisibility: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  layerLocked: Record<string, boolean>;
  camera: { x: number; y: number; zoom: number };
  selectedTool: 'select' | 'move' | 'measure' | 'draw' | 'pan';
}
```

**Usage Example:**
```tsx
import { useBattleMapStore } from '@/stores/useBattleMapStore';

function LayerControl({ layerId }: { layerId: string }) {
  const toggleVisibility = useBattleMapStore(
    (state) => state.toggleLayerVisibility
  );
  const layerState = useBattleMapStore(
    (state) => state.getLayerState(layerId)
  );

  return (
    <button onClick={() => toggleVisibility(layerId)}>
      {layerState.visible ? 'Hide' : 'Show'} Layer
    </button>
  );
}

// Using selector hooks
import { useLayerState, useSelectedTool } from '@/stores/useBattleMapStore';

function ToolIndicator() {
  const tool = useSelectedTool();
  return <div>Current tool: {tool}</div>;
}
```

**Actions:**
- `setActiveSceneId(sceneId)` - Set the active scene
- `toggleLayerVisibility(layerId)` - Toggle layer visibility
- `setLayerVisibility(layerId, visible)` - Set layer visibility
- `setLayerOpacity(layerId, opacity)` - Set layer opacity (0-1)
- `toggleLayerLock(layerId)` - Toggle layer lock state
- `setLayerLock(layerId, locked)` - Set layer lock state
- `getLayerState(layerId)` - Get complete layer state
- `setCamera(camera)` - Update camera position/zoom
- `resetCamera()` - Reset camera to initial state
- `setTool(tool)` - Set the active tool
- `resetLayers()` - Reset all layer settings to defaults

**Selector Hooks:**
- `useActiveSceneId()` - Get active scene ID
- `useLayerState(layerId)` - Get layer state
- `useCamera()` - Get camera state
- `useSelectedTool()` - Get selected tool
- `useLayerVisibility(layerId)` - Get layer visibility
- `useLayerOpacity(layerId)` - Get layer opacity
- `useLayerLocked(layerId)` - Get layer lock state

### Complete Example with Layers

```tsx
import React from 'react';
import { LayerManager, LayersPanel } from '@/components/battle-map';
import { useBattleMapStore } from '@/stores/useBattleMapStore';

function BattleMapWithLayers({ sceneId }: { sceneId: string }) {
  const selectedTool = useBattleMapStore((state) => state.selectedTool);
  const setTool = useBattleMapStore((state) => state.setTool);

  return (
    <div className="relative w-full h-screen">
      {/* Main battle map canvas */}
      <LayerManager sceneId={sceneId} />

      {/* Layer controls panel */}
      <div className="absolute top-4 right-4 z-50">
        <LayersPanel sceneId={sceneId} side="right" />
      </div>

      {/* Tool selector */}
      <div className="absolute bottom-4 left-4 z-50 flex gap-2">
        {['select', 'move', 'measure', 'draw', 'pan'].map((tool) => (
          <button
            key={tool}
            onClick={() => setTool(tool as any)}
            className={`px-4 py-2 rounded ${
              selectedTool === tool ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            {tool}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Related Components

- **GridPlane** (Phase 3.2): Grid overlay rendering
- **GroundPlane** (Phase 3.2): Clickable surface for raycasting
- **BackgroundImage** (Phase 3.3): Background image rendering
- **LayerManager** (Phase 3.4): Layer orchestration
- **LayersPanel** (Phase 3.4): Layer controls UI

## Future Enhancements

Potential improvements for future phases:
- Image caching across component instances
- Dynamic image swapping with transitions
- Image filters and effects
- Support for tiled backgrounds
- Background animations
- Advanced layer blending modes
- Layer grouping and nesting
