# Foundry VTT Integration - Quick Reference

AI Adventure Scribe now includes a complete Foundry VTT-inspired virtual tabletop system with 3D battle maps, dynamic lighting, fog of war, and comprehensive D&D 5e integration.

![Battle Map Screenshot](./docs/screenshots/battle-map-placeholder.png)
*[Screenshot placeholder - Battle map with tokens, grid, and fog of war]*

## Features at a Glance

### 🗺️ Battle Maps
- **3D Rendering** - React Three Fiber powered battle maps
- **Grid Types** - Square, hexagonal (horizontal/vertical), gridless
- **Background Images** - Upload custom maps with automatic scaling
- **Layer System** - 6 layers (background, grid, tokens, effects, drawings, UI)

### 🎭 Token Management
- **Token Types** - Characters, NPCs, monsters, objects
- **Size Categories** - Tiny to gargantuan with automatic scaling
- **Vision & Light** - Dynamic vision, darkvision, light sources
- **Status Tracking** - HP bars, conditions, resources, elevation
- **Drag & Drop** - Smooth token movement with grid snapping

### 👁️ Vision & Lighting
- **Dynamic Vision** - Real-time line of sight calculations
- **Light Sources** - Configurable range, color, intensity
- **Vision Blockers** - Walls, doors, windows, terrain
- **Darkvision** - 60ft, 120ft, and custom ranges
- **GM Control** - Toggle player vision modes

### 🌫️ Fog of War
- **GM Tools** - Reveal/conceal with brush tools
- **Player-Specific** - Each player has unique revealed areas
- **Persistent** - Fog state saved per scene
- **Performance** - Optimized rendering for large maps

### ✏️ Drawing Tools
- **Freehand** - Draw custom shapes and paths
- **Shapes** - Rectangles, circles, polygons
- **Text** - Add labels and annotations
- **Colors & Styles** - Customizable stroke and fill

### 📐 Measurements & Templates
- **Measurement Tool** - Distance and area calculation
- **AoE Templates** - Cone, sphere, cube, line
- **Unit Conversion** - Feet, meters, grid squares
- **Template Config** - Adjust size, color, rotation

### ⚔️ Combat Integration
- **Initiative Tracking** - Synchronized with combat tracker
- **Turn Indicators** - Visual current turn highlight
- **Attack Targeting** - Click to target tokens
- **Opportunity Attacks** - Visual threat zones
- **Movement Tracking** - Distance traveled per turn

### 🧱 Wall System
- **Wall Types** - Solid, door, window, terrain
- **Vision Blocking** - Integrated with vision system
- **Door States** - Open, closed, locked
- **Drawing Tool** - Easy wall placement

### 👥 Character Integration
- **Sheet Linking** - Connect tokens to character sheets
- **HP Sync** - Real-time health updates
- **Folders** - Organize characters into folders
- **Sharing** - Share characters across campaigns

### ⚡ Performance
- **LOD System** - Level of detail optimization
- **Frustum Culling** - Only render visible objects
- **Performance Modes** - Low, medium, high presets
- **FPS Monitor** - Real-time performance metrics
- **Optimized Rendering** - Efficient 3D pipeline

## Quick Start

### 1. Create a Campaign
```
Navigate to: Campaigns → New Campaign
```

### 2. Create a Scene
```
Campaign → Scenes → Create Scene
- Name: "Goblin Hideout"
- Grid: 25×20 (5ft squares)
- Upload background image
```

### 3. Add Tokens
```
Scene → Add Token
- Name: "Goblin Scout"
- Type: Monster
- Size: Small
- Position on map
- Configure vision (60ft darkvision)
```

### 4. Configure Fog of War
```
Scene Settings → Enable Fog of War
Use fog brush to reveal areas
Toggle "Show Fog to GM" for planning
```

### 5. Start Combat!
```
Add tokens to combat tracker
Roll initiative
Begin encounter with full visual support
```

## Screenshots

### Battle Map View
![Battle Map](./docs/screenshots/battle-map-full.png)
*[Placeholder - Full battle map interface with toolbar and panels]*

### Token Management
![Tokens](./docs/screenshots/tokens-example.png)
*[Placeholder - Various tokens showing HP bars, conditions, selection]*

### Fog of War
![Fog of War](./docs/screenshots/fog-of-war.png)
*[Placeholder - Fog of war with revealed areas]*

### Drawing Tools
![Drawing](./docs/screenshots/drawing-tools.png)
*[Placeholder - Drawing interface with shapes and freehand]*

### AoE Templates
![Templates](./docs/screenshots/aoe-templates.png)
*[Placeholder - Cone, sphere, and line templates]*

## Documentation

### Complete Guides
- **[Integration Guide](./docs/FOUNDRY_INTEGRATION_GUIDE.md)** - Complete feature documentation and architecture
- **[API Reference](./docs/API_REFERENCE.md)** - tRPC API endpoints and usage
- **[Component Guide](./docs/COMPONENT_GUIDE.md)** - All components with props and examples
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

### Component Documentation
- **[Battle Map Components](./src/components/battle-map/README.md)** - Detailed component documentation

### Additional Resources
- **[Database Schema](./docs/DATABASE_SCHEMA.md)** - Complete schema documentation
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Database migrations
- **[Vision System](./docs/VISION_SYSTEM.md)** - Vision and lighting details

## Technology Stack

- **Frontend**: React 18, TypeScript, Next.js 14
- **3D Rendering**: React Three Fiber, Three.js
- **State**: Zustand with persistence
- **API**: tRPC with type safety
- **Database**: PostgreSQL (Supabase)
- **Styling**: Tailwind CSS, shadcn/ui
- **Testing**: Jest, React Testing Library

## System Requirements

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+
- **WebGL 2 required**

### Recommended Hardware
- **GPU**: Dedicated graphics card
- **RAM**: 8GB+
- **Connection**: Broadband internet
- **Display**: 1920×1080 or higher

### Performance Modes
- **Low**: 50 tokens, no particles/shadows
- **Medium**: 100 tokens, particles only
- **High**: 200+ tokens, all features

## API Example

```typescript
import { trpc } from '@/lib/trpc';

// Create a scene
const createScene = trpc.scenes.create.useMutation();
await createScene.mutateAsync({
  campaignId: 'campaign-uuid',
  name: 'Dragon\'s Lair',
  width: 30,
  height: 25,
  gridSize: 5,
  gridType: 'square',
  backgroundImageUrl: '/maps/dragon-lair.jpg',
});

// Add a token
const createToken = trpc.tokens.create.useMutation();
await createToken.mutateAsync({
  sceneId: 'scene-uuid',
  name: 'Ancient Red Dragon',
  tokenType: 'monster',
  positionX: 15,
  positionY: 12,
  gridSize: 'gargantuan',
  visionEnabled: true,
  visionRange: 120,
  emitsLight: true,
  lightRange: 60,
  lightColor: '#ff4500',
});
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## Support

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Discord**: [Join our Discord](#) (if available)
- **Email**: support@your-domain.com

### Reporting Bugs
Please include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots (if applicable)
5. Console errors

### Feature Requests
Open a GitHub issue with:
- Clear description
- Use case
- Mockups (if applicable)
- Implementation ideas (optional)

## Roadmap

### Phase 14: Multiplayer (Q1 2026)
- [ ] WebSocket real-time sync
- [ ] Cursor sharing
- [ ] Live token movement
- [ ] Chat integration

### Phase 15: Advanced Features (Q2 2026)
- [ ] Weather effects
- [ ] Day/night cycle
- [ ] Animated tokens (GIF/video)
- [ ] 3D terrain/obstacles

### Phase 16: Enhancements (Q3 2026)
- [ ] Macro system
- [ ] Audio integration
- [ ] Custom shaders
- [ ] Mobile optimization

## License

This project is licensed under the [MIT License](./LICENSE).

## Acknowledgments

- **Foundry VTT** - Inspiration for features and UX
- **React Three Fiber** - Amazing 3D library
- **Supabase** - Database and auth platform
- **shadcn/ui** - Beautiful UI components
- **D&D 5E SRD** - Game rules and content

## Version

**Current Version:** 1.0.0
**Last Updated:** 2025-11-16
**Status:** Production Ready

---

**Built with ❤️ for the TTRPG community**

For more information, visit our [complete documentation](./docs/FOUNDRY_INTEGRATION_GUIDE.md).
