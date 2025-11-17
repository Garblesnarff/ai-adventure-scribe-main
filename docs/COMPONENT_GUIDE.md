# Component Guide - Battle Map System

Comprehensive guide to all battle map components in the Foundry VTT integration.

## Table of Contents

- [Component Hierarchy](#component-hierarchy)
- [Core Components](#core-components)
- [Token Components](#token-components)
- [Vision & Lighting](#vision--lighting)
- [Fog of War](#fog-of-war)
- [Drawing Components](#drawing-components)
- [Template Components](#template-components)
- [Tool Components](#tool-components)
- [UI Panels](#ui-panels)
- [Performance Components](#performance-components)
- [Utility Components](#utility-components)
- [Customization Guide](#customization-guide)
- [Styling Guide](#styling-guide)

## Component Hierarchy

```
BattleCanvas (Root)
├── CameraController
├── BattleScene
│   ├── BackgroundImage
│   ├── GridPlane
│   ├── LayerManager
│   │   ├── Background Layer
│   │   │   └── BackgroundImage
│   │   ├── Grid Layer
│   │   │   └── GridPlane
│   │   ├── Tokens Layer
│   │   │   └── Token[]
│   │   │       ├── TokenImage
│   │   │       ├── TokenBorder
│   │   │       ├── TokenNameplate
│   │   │       ├── TokenHealthBar
│   │   │       ├── TokenResourceBars
│   │   │       ├── TokenConditionIcons
│   │   │       ├── TokenAura
│   │   │       ├── VisionRange
│   │   │       ├── LightSource
│   │   │       └── TokenParticles
│   │   ├── Effects Layer
│   │   │   ├── AoETemplate[]
│   │   │   ├── VisionPolygon[]
│   │   │   └── OpportunityAttackZones[]
│   │   ├── Drawings Layer
│   │   │   ├── FreehandDrawing[]
│   │   │   ├── ShapeDrawing[]
│   │   │   └── TextAnnotation[]
│   │   ├── Fog Layer
│   │   │   └── FogOfWar
│   │   ├── Walls Layer
│   │   │   ├── WallSegment[]
│   │   │   └── DoorObject[]
│   │   └── UI Layer
│   │       ├── MeasurementTool
│   │       └── InitiativeIndicators
│   └── GroundPlane (invisible, for raycasting)
└── UI Overlays (2D)
    ├── LayersPanel
    ├── TemplateConfigPanel
    ├── PerformanceMonitor
    └── DrawingsList
```

## Core Components

### BattleCanvas

Main container for the 3D battle map using React Three Fiber.

**Location:** `/src/components/battle-map/BattleCanvas.tsx`

**Props:**
```typescript
interface BattleCanvasProps {
  sceneId: string;              // Scene to render
  className?: string;           // Additional CSS classes
  children?: React.ReactNode;   // Additional scene content
  onSceneLoad?: () => void;     // Callback when scene loads
  performanceMode?: 'low' | 'medium' | 'high';
}
```

**Usage:**
```tsx
<BattleCanvas
  sceneId="scene-uuid"
  className="w-full h-screen"
  performanceMode="high"
  onSceneLoad={() => console.log('Scene loaded')}
/>
```

**Features:**
- WebGL renderer setup
- Camera configuration
- Lighting setup
- Performance optimization
- Error boundaries

---

### BattleScene

Renders the complete scene with all layers.

**Location:** `/src/components/battle-map/BattleScene.tsx`

**Props:**
```typescript
interface BattleSceneProps {
  sceneId: string;
  showGrid?: boolean;
  showBackground?: boolean;
}
```

**Usage:**
```tsx
<BattleScene
  sceneId="scene-uuid"
  showGrid={true}
  showBackground={true}
/>
```

---

### GridPlane

Renders the battle map grid overlay.

**Location:** `/src/components/battle-map/GridPlane.tsx`

**Props:**
```typescript
interface GridPlaneProps {
  width: number;              // Grid width in world units
  height: number;             // Grid height in world units
  gridSize: number;           // Size of each grid cell
  gridType: GridType;         // 'square', 'hexagonal_horizontal', etc.
  gridColor?: string;         // Grid line color (default: '#000000')
  gridOpacity?: number;       // Grid opacity 0-1 (default: 0.3)
  showLabels?: boolean;       // Show coordinate labels
}
```

**Usage:**
```tsx
<GridPlane
  width={100}
  height={100}
  gridSize={5}
  gridType="square"
  gridColor="#ffffff"
  gridOpacity={0.5}
  showLabels={true}
/>
```

**Features:**
- Square grid
- Hexagonal grid (horizontal/vertical)
- Gridless mode
- Configurable colors and opacity
- Coordinate labels
- Snap-to-grid helpers

---

### BackgroundImage

Displays the scene background image.

**Location:** `/src/components/battle-map/BackgroundImage.tsx`

**Props:**
```typescript
interface BackgroundImageProps {
  imageUrl: string;           // URL of background image
  width: number;              // Width in grid cells
  height: number;             // Height in grid cells
  gridSize: number;           // Size of each grid cell
  lockAspectRatio?: boolean;  // Maintain aspect ratio (default: true)
  opacity?: number;           // Image opacity 0-1 (default: 1)
}
```

**Usage:**
```tsx
<BackgroundImage
  imageUrl="/maps/tavern.jpg"
  width={20}
  height={15}
  gridSize={5}
  lockAspectRatio={true}
  opacity={0.9}
/>
```

**Features:**
- Texture loading with fallback
- Loading placeholder
- Automatic scaling
- Aspect ratio locking
- Texture optimization
- Memory management

---

### LayerManager

Manages rendering order and visibility of all layers.

**Location:** `/src/components/battle-map/LayerManager.tsx`

**Props:**
```typescript
interface LayerManagerProps {
  sceneId: string;
  className?: string;
}
```

**Features:**
- Layer ordering (z-index)
- Layer visibility control
- Layer opacity control
- Layer locking
- Reactive to store updates

## Token Components

### Token

Main token component combining all token visual elements.

**Location:** `/src/components/battle-map/Token.tsx`

**Props:**
```typescript
interface TokenProps {
  token: TokenData;           // Token data
  gridSize: number;           // Grid size in pixels
  isSelected?: boolean;       // Selection state
  isTargeted?: boolean;       // Targeting state
  isHovered?: boolean;        // Hover state
  isOwner?: boolean;          // Ownership flag
  isGM?: boolean;             // GM flag
  onClick?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  onDragStart?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  onDrag?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  onDragEnd?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
}
```

**Usage:**
```tsx
<Token
  token={tokenData}
  gridSize={100}
  isSelected={false}
  onClick={(token) => console.log('Clicked:', token.name)}
  onDrag={(token, event) => handleTokenDrag(token, event)}
/>
```

**Features:**
- Token rendering
- Size-based scaling (tiny to gargantuan)
- Drag and drop
- Selection/targeting states
- Hover effects
- Context menu support

---

### TokenImage

Renders the token's image or avatar.

**Location:** `/src/components/battle-map/TokenImage.tsx`

**Props:**
```typescript
interface TokenImageProps {
  imageUrl: string | null;
  size: number;               // Diameter in world units
  tintColor?: string;
  opacity?: number;
  elevation?: number;
}
```

---

### TokenBorder (MultiLayerBorder)

Renders token borders with disposition colors.

**Location:** `/src/components/battle-map/TokenBorder.tsx`

**Props:**
```typescript
interface MultiLayerBorderProps {
  size: number;               // Token size
  borderWidth: number;
  color?: string;             // Border color
  isSelected?: boolean;
  isTargeted?: boolean;
  isHovered?: boolean;
  disposition?: 'friendly' | 'neutral' | 'hostile';
}
```

**Features:**
- Multiple border layers
- Selection highlight (gold)
- Target highlight (red)
- Hover effect
- Disposition colors

---

### TokenNameplate

Displays token name and status.

**Location:** `/src/components/battle-map/TokenNameplate.tsx`

**Props:**
```typescript
interface TokenNameplateProps {
  name: string;
  position?: 'top' | 'bottom';
  visible?: boolean;
  fontSize?: number;
  backgroundColor?: string;
}
```

---

### TokenHealthBar

Shows token health bar.

**Location:** `/src/components/battle-map/TokenHealthBar.tsx`

**Props:**
```typescript
interface TokenHealthBarProps {
  currentHP: number;
  maxHP: number;
  position?: 'top' | 'bottom';
  width?: number;
  height?: number;
  showText?: boolean;
  visible?: boolean;
}
```

**Features:**
- Color-coded by health percentage
- Animated updates
- Optional text display
- Position control

---

### TokenResourceBars

Additional resource bars (spell slots, ki points, etc.).

**Location:** `/src/components/battle-map/TokenResourceBars.tsx`

**Props:**
```typescript
interface TokenResourceBarsProps {
  resources: Array<{
    current: number;
    max: number;
    color: string;
    label?: string;
  }>;
  position?: 'top' | 'bottom';
}
```

---

### TokenConditionIcons

Shows status condition icons.

**Location:** `/src/components/battle-map/TokenConditionIcons.tsx`

**Props:**
```typescript
interface TokenConditionIconsProps {
  conditions: string[];       // Array of condition names
  position?: 'top' | 'bottom' | 'left' | 'right';
  iconSize?: number;
  maxIcons?: number;
}
```

**Supported Conditions:**
- Blinded
- Charmed
- Deafened
- Frightened
- Grappled
- Incapacitated
- Invisible
- Paralyzed
- Petrified
- Poisoned
- Prone
- Restrained
- Stunned
- Unconscious
- Exhausted (levels 1-6)
- Concentrating

---

### TokenAura

Renders colored auras around tokens.

**Location:** `/src/components/battle-map/TokenAura.tsx`

**Props:**
```typescript
interface TokenAuraProps {
  radius: number;             // Aura radius in feet
  color: string;              // Aura color
  opacity?: number;
  animated?: boolean;
  pulseSpeed?: number;
}
```

**Features:**
- Circular auras
- Pulsing animation
- Multiple simultaneous auras
- Opacity control

---

### TokenParticles

Particle effects for tokens (fire, magic, etc.).

**Location:** `/src/components/battle-map/TokenParticles.tsx`

**Props:**
```typescript
interface TokenParticlesProps {
  particleType: 'fire' | 'magic' | 'healing' | 'poison' | 'ice';
  count?: number;
  size?: number;
  speed?: number;
  enabled?: boolean;
}
```

---

### TokenConcentration

Shows concentration indicator.

**Location:** `/src/components/battle-map/TokenConcentration.tsx`

**Features:**
- Animated swirling effect
- Distinct visual indicator
- Auto-shows when concentrating

---

### TokenDeathState

Visual effect for dead/unconscious tokens.

**Location:** `/src/components/battle-map/TokenDeathState.tsx`

**Features:**
- Red tint overlay
- Skull icon
- Opacity reduction
- X mark for death

---

### ElevationIndicator

Shows token elevation.

**Location:** `/src/components/battle-map/ElevationIndicator.tsx`

**Props:**
```typescript
interface ElevationIndicatorProps {
  elevation: number;          // Elevation in feet
  visible?: boolean;
}
```

## Vision & Lighting

### VisionRange

Displays token vision range.

**Location:** `/src/components/battle-map/VisionRange.tsx`

**Props:**
```typescript
interface VisionRangeProps {
  position: { x: number; y: number; z?: number };
  range: number;              // Range in feet
  color?: string;
  opacity?: number;
  showOutline?: boolean;
}
```

**Usage:**
```tsx
<VisionRange
  position={{ x: 10, y: 15 }}
  range={60}
  color="#4a90e2"
  opacity={0.2}
/>
```

---

### VisionCone

Directional vision cone for limited vision.

**Location:** `/src/components/battle-map/VisionCone.tsx`

**Props:**
```typescript
interface VisionConeProps {
  position: { x: number; y: number };
  rotation: number;           // Rotation in degrees
  range: number;              // Range in feet
  angle: number;              // Cone angle in degrees
  color?: string;
}
```

---

### LightSource

Renders light emitted by token.

**Location:** `/src/components/battle-map/LightSource.tsx`

**Props:**
```typescript
interface LightSourceProps {
  position: { x: number; y: number; z?: number };
  range: number;              // Light range in feet
  color?: string;
  intensity?: number;         // 0-1
  dimRange?: number;          // Dim light range
  castShadows?: boolean;
}
```

**Features:**
- Bright and dim light
- Colored light
- Shadow casting
- Point lights
- Directional lights

---

### VisionPolygon

Calculated vision polygon with wall occlusion.

**Location:** `/src/components/battle-map/VisionPolygon.tsx`

**Props:**
```typescript
interface VisionPolygonProps {
  tokenId: string;
  visionRange: number;
  walls: Array<WallSegment>;
}
```

**Features:**
- Raycasting-based vision
- Wall occlusion
- Polygon rendering
- Performance optimized

## Fog of War

### FogOfWar

Main fog of war component.

**Location:** `/src/components/battle-map/FogOfWar.tsx`

**Props:**
```typescript
interface FogOfWarProps {
  sceneId: string;
  width: number;              // Scene width
  height: number;             // Scene height
  enabled?: boolean;
  showToGM?: boolean;         // GM can see through fog
  brushSize?: number;
  brushMode?: 'reveal' | 'conceal';
}
```

**Usage:**
```tsx
<FogOfWar
  sceneId="scene-uuid"
  width={100}
  height={100}
  enabled={true}
  showToGM={false}
  brushSize={50}
  brushMode="reveal"
/>
```

**Features:**
- Canvas-based rendering
- Brush tools
- GM visibility toggle
- Persistence
- Player-specific fog
- Reveal/conceal modes

## Drawing Components

### FreehandDrawing

Free-form drawing on the map.

**Location:** `/src/components/battle-map/FreehandDrawing.tsx`

**Props:**
```typescript
interface FreehandDrawingProps {
  points: Array<{ x: number; y: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}
```

**Features:**
- Smooth curves
- Line smoothing
- Variable stroke width
- Color customization

---

### ShapeDrawing

Geometric shapes (rectangles, circles, polygons).

**Location:** `/src/components/battle-map/ShapeDrawing.tsx`

**Props:**
```typescript
interface ShapeDrawingProps {
  shapeType: 'rectangle' | 'circle' | 'polygon';
  points: Array<{ x: number; y: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null;
  opacity?: number;
}
```

---

### TextAnnotation

Text labels on the map.

**Location:** `/src/components/battle-map/TextAnnotation.tsx`

**Props:**
```typescript
interface TextAnnotationProps {
  text: string;
  position: { x: number; y: number };
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
}
```

## Template Components

### AoETemplate

Area of Effect templates (cone, sphere, cube, line).

**Location:** `/src/components/battle-map/AoETemplate.tsx`

**Props:**
```typescript
interface AoETemplateProps {
  templateType: 'cone' | 'sphere' | 'cube' | 'line';
  position: { x: number; y: number };
  size: number;               // Size in feet
  rotation?: number;
  color?: string;
  opacity?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
}
```

**Usage:**
```tsx
<AoETemplate
  templateType="cone"
  position={{ x: 10, y: 15 }}
  size={30}
  rotation={45}
  color="#ff6b6b"
  opacity={0.3}
/>
```

---

### ConeTemplate

Cone-shaped template (subcomponent of AoETemplate).

**Location:** `/src/components/battle-map/ConeTemplate.tsx`

---

### SphereTemplate

Spherical/circular template.

**Location:** `/src/components/battle-map/SphereTemplate.tsx`

---

### CubeTemplate

Cubic/square template.

**Location:** `/src/components/battle-map/CubeTemplate.tsx`

---

### LineTemplate

Line template.

**Location:** `/src/components/battle-map/LineTemplate.tsx`

## Tool Components

### MeasurementTool

Distance and area measurement.

**Location:** `/src/components/battle-map/MeasurementTool.tsx`

**Props:**
```typescript
interface MeasurementToolProps {
  sceneId: string;
  unit?: 'feet' | 'meters' | 'squares';
  showDistance?: boolean;
  showArea?: boolean;
}
```

**Features:**
- Click-to-measure
- Multi-point measurement
- Area calculation
- Unit conversion
- Grid snapping

---

### DrawingTool

Drawing interface.

**Location:** `/src/components/battle-map/DrawingTool.tsx`

**Props:**
```typescript
interface DrawingToolProps {
  sceneId: string;
  drawingType: 'freehand' | 'line' | 'rectangle' | 'circle' | 'polygon' | 'text';
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null;
}
```

---

### WallDrawingTool

Tool for drawing walls.

**Location:** `/src/components/battle-map/WallDrawingTool.tsx`

**Props:**
```typescript
interface WallDrawingToolProps {
  sceneId: string;
  wallType: 'solid' | 'door' | 'window' | 'terrain';
  snapToGrid?: boolean;
}
```

## UI Panels

### LayersPanel

Control panel for layers.

**Location:** `/src/components/battle-map/LayersPanel.tsx`

**Props:**
```typescript
interface LayersPanelProps {
  sceneId: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

**Features:**
- Toggle visibility
- Adjust opacity
- Lock/unlock layers
- Quick actions (show all, hide all, reset)

---

### TemplateConfigPanel

Configure AoE templates.

**Location:** `/src/components/battle-map/TemplateConfigPanel.tsx`

**Props:**
```typescript
interface TemplateConfigPanelProps {
  templateType: 'cone' | 'sphere' | 'cube' | 'line';
  size: number;
  color: string;
  onSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  onTypeChange: (type: string) => void;
}
```

---

### DrawingsList

List of all drawings with management.

**Location:** `/src/components/battle-map/DrawingsList.tsx`

**Features:**
- View all drawings
- Delete drawings
- Toggle visibility
- Filter by type

## Performance Components

### PerformanceMonitor

Real-time performance metrics.

**Location:** `/src/components/battle-map/PerformanceMonitor.tsx`

**Props:**
```typescript
interface PerformanceMonitorProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  detailed?: boolean;
  fpsWarningThreshold?: number;
  renderTimeWarningThreshold?: number;
  className?: string;
}
```

**Usage:**
```tsx
<PerformanceMonitor
  visible={true}
  position="top-right"
  detailed={true}
  fpsWarningThreshold={30}
/>
```

**Metrics:**
- FPS (frames per second)
- Render time
- Draw calls
- Triangle count
- Geometries
- Textures
- Programs
- Memory usage

---

### FPSCounter

Minimal FPS display.

**Props:**
```typescript
interface FPSCounterProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
```

## Utility Components

### CameraController

Controls camera movement and zoom.

**Location:** `/src/components/battle-map/CameraController.tsx`

**Features:**
- Pan
- Zoom
- Rotation (optional)
- Constraints
- Smooth interpolation

---

### WallSegment

Renders a single wall segment.

**Location:** `/src/components/battle-map/WallSegment.tsx`

---

### DoorObject

Interactive door on the map.

**Location:** `/src/components/battle-map/DoorObject.tsx`

**Features:**
- Open/closed/locked states
- Click to toggle
- Visual state indicators

## Customization Guide

### Styling Tokens

Tokens can be customized via props:

```tsx
<Token
  token={{
    ...tokenData,
    tintColor: '#ff0000',
    borderColor: '#00ff00',
    borderWidth: 3,
    scale: '1.2',
    opacity: '0.8',
  }}
  // ...
/>
```

### Custom Particle Effects

Create custom particle systems:

```tsx
<TokenParticles
  particleType="custom"
  count={50}
  size={0.5}
  speed={2}
  color="#ff00ff"
/>
```

### Custom Templates

Extend AoETemplate for custom shapes:

```tsx
function CustomTemplate({ position, size }) {
  return (
    <group position={[position.x, position.y, 0]}>
      {/* Custom geometry */}
    </group>
  );
}
```

## Styling Guide

### Tailwind Classes

All 2D UI components use Tailwind CSS:

```tsx
<div className="absolute top-4 right-4 bg-background/80 rounded-lg shadow-lg p-4">
  {/* Content */}
</div>
```

### Theme Integration

Components respect the shadcn/ui theme:

```tsx
import { Card, CardContent } from '@/components/ui/card';

<Card className="w-64">
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Custom Styles

For 3D components, use Three.js materials:

```tsx
const material = new THREE.MeshStandardMaterial({
  color: '#4a90e2',
  opacity: 0.5,
  transparent: true,
  metalness: 0.2,
  roughness: 0.8,
});
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
