# Foundry VTT Integration Guide

Complete guide for the Foundry VTT-style virtual tabletop integration in AI Adventure Scribe.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Feature List](#feature-list)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Migration Guide](#migration-guide)
- [Component Overview](#component-overview)
- [Integration Examples](#integration-examples)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Architecture Overview

The Foundry VTT integration provides a complete virtual tabletop system with real-time 3D rendering using React Three Fiber.

### Technology Stack

- **Frontend**: React 18, TypeScript, React Three Fiber, Three.js
- **Backend**: tRPC, Node.js
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Styling**: Tailwind CSS, shadcn/ui

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Battle Map   │  │   Combat     │  │   Character  │     │
│  │ Components   │  │   Tracker    │  │   Sheets     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Zustand Stores (Battle Map, Combat, Camera, Fog)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      tRPC Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Scenes     │  │    Tokens    │  │   Drawings   │     │
│  │   Router     │  │    Router    │  │    Router    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Supabase PostgreSQL (Scenes, Tokens, Fog, etc.)   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Feature List

### ✅ Implemented Features

#### Phase 1: Scene Management
- [x] Scene creation and configuration
- [x] Grid types (square, hexagonal, gridless)
- [x] Background image support
- [x] Scene settings (fog, lighting, grid opacity)
- [x] Layer system (background, grid, tokens, effects, drawings, UI)

#### Phase 2: Token System
- [x] Token creation and positioning
- [x] Token types (character, NPC, monster, object)
- [x] Size categories (tiny, small, medium, large, huge, gargantuan)
- [x] Token images and avatars
- [x] Health bars and status indicators
- [x] Elevation tracking
- [x] Token rotation and scaling
- [x] Border colors and tinting

#### Phase 3: Vision & Lighting
- [x] Dynamic vision system
- [x] Light sources
- [x] Vision blockers (walls, doors, windows)
- [x] Darkvision support
- [x] Vision cone rendering
- [x] Line of sight calculations
- [x] Ambient lighting
- [x] Vision range indicators

#### Phase 4: Fog of War
- [x] Fog of War system
- [x] Fog reveal/conceal tools
- [x] GM fog visibility toggle
- [x] Fog brush with adjustable size
- [x] Fog persistence
- [x] Player-specific fog

#### Phase 5: Drawing Tools
- [x] Freehand drawing
- [x] Shape drawing (rectangles, circles, polygons)
- [x] Text annotations
- [x] Stroke width and color customization
- [x] Fill color support
- [x] Drawing smoothing
- [x] Eraser tool

#### Phase 6: Measurement & Templates
- [x] Measurement tool (distance, area)
- [x] AoE templates (cone, sphere, cube, line)
- [x] Template configuration panel
- [x] Snap to grid
- [x] Distance units (feet, meters, squares)
- [x] Template rotation and sizing

#### Phase 7: Combat Integration
- [x] Initiative tracking
- [x] Turn indicators
- [x] Combat state management
- [x] Attack targeting
- [x] Opportunity attack zones
- [x] Movement tracking
- [x] Action economy display

#### Phase 8: Wall System
- [x] Wall segments
- [x] Wall types (solid, door, window, terrain)
- [x] Wall drawing tool
- [x] Vision blocking
- [x] Door states (open/closed/locked)
- [x] Wall snapping to grid

#### Phase 9: Character Integration
- [x] Character sheet linking
- [x] Character folders
- [x] Token-character association
- [x] HP/AC synchronization
- [x] Condition tracking
- [x] Character sharing between campaigns

#### Phase 10: Advanced Effects
- [x] Particle systems
- [x] Token auras
- [x] Status effect overlays
- [x] Concentration indicators
- [x] Death state visuals
- [x] Drag ghost for tokens

#### Phase 11: Performance Optimizations
- [x] Level of Detail (LOD) system
- [x] Frustum culling
- [x] Performance mode settings
- [x] FPS monitoring
- [x] Texture/geometry optimization
- [x] Render statistics

### 🔄 Partially Implemented

- [ ] Real-time multiplayer synchronization (WebSocket infrastructure ready)
- [ ] Audio integration (hooks in place)
- [ ] Macro system (API structure ready)

### 📋 Planned Features

- [ ] Weather effects
- [ ] Day/night cycle
- [ ] Animated tokens
- [ ] Video backgrounds
- [ ] 3D terrain
- [ ] Advanced pathfinding

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account (or self-hosted Supabase)
- Modern browser with WebGL 2 support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-adventure-scribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to `http://localhost:3000`

### Quick Start Guide

1. **Create a Campaign**
   - Navigate to Campaigns
   - Click "New Campaign"
   - Fill in campaign details

2. **Create a Scene**
   - Open your campaign
   - Go to Scenes tab
   - Click "Create Scene"
   - Configure grid size and type
   - Upload background image (optional)

3. **Add Tokens**
   - Open the scene
   - Click "Add Token" or drag from character sheet
   - Position on the map
   - Configure vision and light settings

4. **Start Playing!**
   - Use tools in the toolbar (select, move, measure, draw)
   - Control layers from the layers panel
   - Manage fog of war from GM controls
   - Track initiative in combat tracker

## Database Setup

### Schema Overview

The Foundry integration uses the following main tables:

- `foundry_scenes` - Battle map scenes
- `foundry_scene_layers` - Layer configuration
- `foundry_tokens` - Tokens on scenes
- `foundry_vision_blockers` - Walls and obstacles
- `foundry_fog_of_war` - Fog data
- `foundry_drawings` - User drawings
- `foundry_measurements` - Measurement data
- `character_folders` - Character organization
- `character_shares` - Cross-campaign character sharing

### Running Migrations

Migrations are located in `/server/src/db/migrations/`.

**Apply all migrations:**
```bash
npm run db:migrate
```

**Rollback last migration:**
```bash
npm run db:rollback
```

**Create new migration:**
```bash
npm run db:migration:create migration-name
```

### Manual Schema Setup

If you prefer to set up the schema manually, execute the SQL files in order:

1. `001_foundry_scenes.sql`
2. `002_foundry_tokens.sql`
3. `003_foundry_vision.sql`
4. `004_foundry_fog.sql`
5. `005_foundry_drawings.sql`
6. `006_character_folders.sql`

See `/server/src/db/migrations/` for the complete migration files.

### Database Indexes

Key indexes for performance:

- `foundry_tokens(scene_id)` - Fast token queries by scene
- `foundry_tokens(actor_id)` - Character-token linking
- `foundry_vision_blockers(scene_id)` - Vision calculations
- `foundry_fog_of_war(scene_id, user_id)` - Fog rendering

## Migration Guide

### From Existing System

If you're adding Foundry integration to an existing AI Adventure Scribe installation:

1. **Backup your database**
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Run Foundry migrations**
   ```bash
   npm run db:migrate
   ```

3. **Update tRPC routers**

   Add Foundry routers to your root router:
   ```typescript
   import { scenesRouter } from './routers/scenes';
   import { tokensRouter } from './routers/tokens';
   // ... other routers

   export const appRouter = router({
     // ... existing routers
     scenes: scenesRouter,
     tokens: tokensRouter,
     // ... other Foundry routers
   });
   ```

4. **Add UI routes**

   Create pages for battle map:
   - `/campaigns/[id]/scenes` - Scene list
   - `/campaigns/[id]/scenes/[sceneId]` - Battle map view

### From Foundry VTT

Currently, there's no automated import from Foundry VTT. To manually migrate:

1. Export scene data from Foundry VTT
2. Transform to our schema format
3. Import via tRPC mutations or direct SQL

A migration tool is planned for future releases.

## Component Overview

### Core Components

#### BattleCanvas
Main 3D canvas container with React Three Fiber.

**Location:** `/src/components/battle-map/BattleCanvas.tsx`

**Usage:**
```tsx
<BattleCanvas sceneId="scene-uuid">
  {/* Scene content */}
</BattleCanvas>
```

#### Token
Renders a token with all visual elements.

**Location:** `/src/components/battle-map/Token.tsx`

**Props:**
- `token` - Token data object
- `gridSize` - Grid size in pixels
- `isSelected` - Selection state
- `onClick` - Click handler

#### FogOfWar
Renders the fog of war layer.

**Location:** `/src/components/battle-map/FogOfWar.tsx`

**Features:**
- Canvas-based fog rendering
- Brush tools for revealing/concealing
- GM visibility toggle
- Player-specific fog data

#### VisionRange
Shows token vision range.

**Location:** `/src/components/battle-map/VisionRange.tsx`

**Props:**
- `position` - Token position
- `range` - Vision range in feet
- `color` - Vision range color

### Tools

#### MeasurementTool
Distance and area measurement.

**Location:** `/src/components/battle-map/MeasurementTool.tsx`

#### DrawingTool
Freehand and shape drawing.

**Location:** `/src/components/battle-map/DrawingTool.tsx`

#### AoETemplate
Area of effect templates (cone, sphere, cube, line).

**Location:** `/src/components/battle-map/AoETemplate.tsx`

### Panels

#### LayersPanel
Control layer visibility, opacity, and lock state.

**Location:** `/src/components/battle-map/LayersPanel.tsx`

#### TemplateConfigPanel
Configure AoE template properties.

**Location:** `/src/components/battle-map/TemplateConfigPanel.tsx`

### Performance

#### PerformanceMonitor
Real-time FPS and render statistics.

**Location:** `/src/components/battle-map/PerformanceMonitor.tsx`

**Usage:**
```tsx
<PerformanceMonitor
  visible={true}
  position="top-right"
  detailed={true}
/>
```

## Integration Examples

### Creating a Scene

```typescript
import { trpc } from '@/lib/trpc';

const createScene = trpc.scenes.create.useMutation();

await createScene.mutateAsync({
  campaignId: 'campaign-uuid',
  name: 'Goblin Hideout',
  width: 25,
  height: 20,
  gridSize: 5,
  gridType: 'square',
  backgroundImageUrl: '/maps/dungeon.jpg',
});
```

### Adding a Token

```typescript
import { trpc } from '@/lib/trpc';

const createToken = trpc.tokens.create.useMutation();

await createToken.mutateAsync({
  sceneId: 'scene-uuid',
  actorId: 'character-uuid', // Optional: link to character
  name: 'Goblin Scout',
  tokenType: 'monster',
  positionX: 10,
  positionY: 15,
  gridSize: 'small',
  visionEnabled: true,
  visionRange: 60,
});
```

### Using the Battle Map Store

```typescript
import { useBattleMapStore } from '@/stores/useBattleMapStore';

function MyComponent() {
  const selectedTool = useBattleMapStore(state => state.selectedTool);
  const setTool = useBattleMapStore(state => state.setTool);
  const camera = useBattleMapStore(state => state.camera);

  return (
    <div>
      <button onClick={() => setTool('measure')}>
        Measure
      </button>
      <p>Current tool: {selectedTool}</p>
      <p>Zoom: {camera.zoom}</p>
    </div>
  );
}
```

### Performance Settings

```typescript
import { useBattleMapStore } from '@/stores/useBattleMapStore';

function PerformanceSettings() {
  const performance = useBattleMapStore(state => state.performance);
  const setPerformanceMode = useBattleMapStore(state => state.setPerformanceMode);

  return (
    <select
      value={performance.performanceMode}
      onChange={(e) => setPerformanceMode(e.target.value as any)}
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  );
}
```

## Performance Tips

### Optimization Strategies

1. **Use Performance Modes**
   - Low: Disable particles, shadows, and animations
   - Medium: Balanced settings
   - High: All features enabled

2. **Enable Frustum Culling**
   - Automatically enabled in performance settings
   - Hides objects outside camera view
   - Significant performance gain on large maps

3. **Use LOD (Level of Detail)**
   - Reduces detail for distant objects
   - Automatically switches texture resolution
   - Configurable distance thresholds

4. **Optimize Images**
   - Use WebP format when possible
   - Keep textures under 2048x2048
   - Use power-of-two dimensions (512, 1024, 2048)

5. **Limit Visible Elements**
   - Set `maxVisibleTokens` in performance settings
   - Use fog of war to hide distant areas
   - Batch similar operations

6. **Monitor Performance**
   - Enable PerformanceMonitor component
   - Watch for FPS drops below 30
   - Check draw call count

### Common Performance Issues

**Problem:** Low FPS on large maps
**Solution:**
- Reduce `maxVisibleTokens`
- Enable frustum culling
- Switch to "low" performance mode
- Reduce background image size

**Problem:** High memory usage
**Solution:**
- Disable particle effects
- Reduce texture sizes
- Clear unused resources
- Limit simultaneous animations

**Problem:** Lag when moving camera
**Solution:**
- Enable LOD system
- Use frustum culling
- Reduce grid opacity
- Disable unnecessary layers

## Troubleshooting

### Scene Not Loading

**Symptoms:** Blank canvas or loading spinner

**Solutions:**
1. Check browser console for errors
2. Verify scene exists in database
3. Check WebGL support: `chrome://gpu`
4. Clear browser cache
5. Verify environment variables

### Tokens Not Appearing

**Symptoms:** Tokens created but not visible

**Solutions:**
1. Check token layer visibility in LayersPanel
2. Verify token `isVisible` and `isHidden` properties
3. Check if token is outside camera view
4. Verify position coordinates are within scene bounds
5. Check console for rendering errors

### Fog of War Issues

**Symptoms:** Fog not updating or incorrect fog state

**Solutions:**
1. Verify fog is enabled in scene settings
2. Check user permissions (GM vs Player)
3. Clear fog cache and reload
4. Verify fog data in database
5. Check `showFogToGM` setting

### Performance Problems

**Symptoms:** Low FPS, stuttering, lag

**Solutions:**
1. Open PerformanceMonitor to diagnose
2. Switch to "low" performance mode
3. Reduce number of visible tokens
4. Disable shadows and particles
5. Optimize background images
6. Check if other browser tabs are using resources

### Vision Not Working

**Symptoms:** Vision ranges or light sources not visible

**Solutions:**
1. Verify `enableDynamicLighting` in scene settings
2. Check token has `visionEnabled` or `emitsLight`
3. Verify vision blockers aren't blocking unexpectedly
4. Check if vision layer is visible
5. Reload vision calculations

## FAQ

### General

**Q: Is this a replacement for Foundry VTT?**
A: No, this is a Foundry-inspired system built into AI Adventure Scribe. It shares concepts but is a separate implementation.

**Q: Can I import from Foundry VTT?**
A: Not currently. A migration tool is planned for future releases.

**Q: Does it work on mobile?**
A: The UI is responsive, but 3D rendering works best on desktop. Touch controls are limited.

### Technical

**Q: What browsers are supported?**
A: Modern browsers with WebGL 2 support: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+.

**Q: Can I use custom shaders?**
A: Not currently, but the THREE.js integration allows for future shader support.

**Q: How do I add custom token images?**
A: Upload images to your asset storage and reference the URL when creating tokens.

**Q: Is real-time multiplayer supported?**
A: The infrastructure is in place, but full multiplayer sync is not yet implemented.

### Performance

**Q: What are the system requirements?**
A:
- Dedicated GPU recommended
- 8GB+ RAM
- Modern browser with WebGL 2
- Stable internet connection

**Q: How many tokens can I have?**
A: Performance depends on your hardware. Generally:
- Low mode: 50 tokens
- Medium mode: 100 tokens
- High mode: 200+ tokens

**Q: Why is my FPS low?**
A: See [Performance Tips](#performance-tips) section for optimization strategies.

### Database

**Q: Can I use a different database?**
A: Currently only PostgreSQL (Supabase) is supported. Support for other databases would require adapter implementation.

**Q: How is fog of war stored?**
A: Fog data is stored as binary blobs in the `foundry_fog_of_war` table, one row per user per scene.

**Q: Can I backup my scenes?**
A: Yes, use standard PostgreSQL backup tools or Supabase's backup features.

## Support

For additional help:

- **Documentation**: `/docs` directory
- **API Reference**: `docs/API_REFERENCE.md`
- **Component Guide**: `docs/COMPONENT_GUIDE.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Issues**: GitHub Issues (if open source)
- **Community**: Discord/Forum (if available)

## License

See main project LICENSE file.

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
**Phase:** 13 (Complete)
