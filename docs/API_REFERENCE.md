# API Reference - Foundry VTT Integration

Complete tRPC API reference for the Foundry VTT integration.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Scenes API](#scenes-api)
- [Tokens API](#tokens-api)
- [Fog of War API](#fog-of-war-api)
- [Vision Blockers API](#vision-blockers-api)
- [Drawings API](#drawings-api)
- [Measurements API](#measurements-api)
- [Character Folders API](#character-folders-api)
- [Character Sharing API](#character-sharing-api)
- [Rate Limits](#rate-limits)

## Overview

All API endpoints are exposed through tRPC routers. Use the tRPC client for type-safe API calls.

### Base URL

```
http://localhost:3000/api/trpc
```

### Client Setup

```typescript
import { trpc } from '@/lib/trpc';

// Query example
const { data, isLoading, error } = trpc.scenes.list.useQuery({
  campaignId: 'campaign-uuid',
});

// Mutation example
const createScene = trpc.scenes.create.useMutation();
await createScene.mutateAsync({
  name: 'Dungeon Map',
  campaignId: 'campaign-uuid',
  // ... other fields
});
```

## Authentication

All endpoints require authentication via Supabase auth token.

**Headers:**
```
Authorization: Bearer <supabase-access-token>
```

The token is automatically included when using the tRPC client hooks.

## Error Handling

### Error Codes

- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - User lacks permission for the operation
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input data
- `INTERNAL_SERVER_ERROR` - Server error
- `CONFLICT` - Resource conflict (e.g., duplicate)

### Error Response Format

```typescript
{
  code: 'NOT_FOUND',
  message: 'Scene not found',
  data?: {
    // Additional error details
  }
}
```

### Example Error Handling

```typescript
try {
  await createScene.mutateAsync({ ... });
} catch (error) {
  if (error.data?.code === 'FORBIDDEN') {
    console.error('Permission denied');
  } else if (error.data?.code === 'NOT_FOUND') {
    console.error('Scene not found');
  }
}
```

## Scenes API

Manage battle map scenes (maps/encounters).

### `scenes.list`

Get all scenes for a campaign.

**Input:**
```typescript
{
  campaignId: string; // UUID
}
```

**Response:**
```typescript
{
  scenes: Array<{
    id: string;
    name: string;
    description: string | null;
    width: number;
    height: number;
    gridSize: number;
    gridType: 'square' | 'hexagonal_horizontal' | 'hexagonal_vertical' | 'gridless';
    gridColor: string;
    backgroundImageUrl: string | null;
    thumbnailUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>
}
```

**Example:**
```typescript
const { data } = trpc.scenes.list.useQuery({
  campaignId: 'abc-123',
});
```

---

### `scenes.get`

Get a single scene by ID.

**Input:**
```typescript
{
  id: string; // UUID
}
```

**Response:**
```typescript
{
  scene: {
    id: string;
    name: string;
    description: string | null;
    campaignId: string;
    width: number;
    height: number;
    gridSize: number;
    gridType: 'square' | 'hexagonal_horizontal' | 'hexagonal_vertical' | 'gridless';
    gridColor: string;
    backgroundImageUrl: string | null;
    thumbnailUrl: string | null;
    isActive: boolean;
    settings: {
      enableFogOfWar: boolean;
      enableDynamicLighting: boolean;
      snapToGrid: boolean;
      gridOpacity: string;
      ambientLightLevel: string;
      darknessLevel: string;
      weatherEffects: string | null;
      timeOfDay: string | null;
    };
    layers: Array<{
      id: string;
      layerType: string;
      zIndex: number;
      isVisible: boolean;
      opacity: string;
      locked: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Example:**
```typescript
const { data } = trpc.scenes.get.useQuery({
  id: 'scene-uuid',
});
```

---

### `scenes.create`

Create a new scene.

**Input:**
```typescript
{
  name: string; // 1-255 characters
  description?: string;
  campaignId: string; // UUID
  width?: number; // 1-100, default: 20
  height?: number; // 1-100, default: 15
  gridSize?: number; // 1-50, default: 5
  gridType?: 'square' | 'hexagonal_horizontal' | 'hexagonal_vertical' | 'gridless';
  gridColor?: string; // Hex color, default: '#000000'
  backgroundImageUrl?: string; // URL or empty string
  thumbnailUrl?: string; // URL or empty string
}
```

**Response:**
```typescript
{
  scene: {
    id: string;
    // ... scene fields
  }
}
```

**Example:**
```typescript
const createScene = trpc.scenes.create.useMutation();

await createScene.mutateAsync({
  name: 'Goblin Hideout',
  campaignId: 'campaign-uuid',
  width: 25,
  height: 20,
  gridSize: 5,
  gridType: 'square',
  backgroundImageUrl: 'https://example.com/map.jpg',
});
```

---

### `scenes.update`

Update an existing scene.

**Input:**
```typescript
{
  id: string; // Scene UUID
  name?: string;
  description?: string | null;
  width?: number;
  height?: number;
  gridSize?: number;
  gridType?: 'square' | 'hexagonal_horizontal' | 'hexagonal_vertical' | 'gridless';
  gridColor?: string;
  backgroundImageUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
}
```

**Response:**
```typescript
{
  scene: {
    // Updated scene
  }
}
```

**Example:**
```typescript
const updateScene = trpc.scenes.update.useMutation();

await updateScene.mutateAsync({
  id: 'scene-uuid',
  name: 'Updated Name',
  isActive: true,
});
```

---

### `scenes.delete`

Delete a scene.

**Input:**
```typescript
{
  id: string; // Scene UUID
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

**Example:**
```typescript
const deleteScene = trpc.scenes.delete.useMutation();

await deleteScene.mutateAsync({
  id: 'scene-uuid',
});
```

---

### `scenes.updateSettings`

Update scene settings (fog, lighting, etc.).

**Input:**
```typescript
{
  sceneId: string;
  enableFogOfWar?: boolean;
  enableDynamicLighting?: boolean;
  snapToGrid?: boolean;
  gridOpacity?: string; // Format: "0.00"
  ambientLightLevel?: string; // Format: "0.00"
  darknessLevel?: string; // Format: "0.00"
  weatherEffects?: string | null;
  timeOfDay?: string | null;
}
```

**Response:**
```typescript
{
  settings: {
    // Updated settings
  }
}
```

---

### `scenes.updateLayer`

Update a scene layer configuration.

**Input:**
```typescript
{
  layerId: string;
  layerType?: 'background' | 'grid' | 'tokens' | 'effects' | 'drawings' | 'ui';
  zIndex?: number; // 0-100
  isVisible?: boolean;
  opacity?: string; // Format: "0.00"
  locked?: boolean;
}
```

**Response:**
```typescript
{
  layer: {
    // Updated layer
  }
}
```

## Tokens API

Manage tokens (characters, NPCs, monsters, objects) on scenes.

### `tokens.list`

Get all tokens for a scene.

**Input:**
```typescript
{
  sceneId: string; // UUID
}
```

**Response:**
```typescript
{
  tokens: Array<{
    id: string;
    sceneId: string;
    actorId: string | null;
    name: string;
    tokenType: 'character' | 'npc' | 'monster' | 'object';
    positionX: string;
    positionY: string;
    rotation: string;
    elevation: string;
    imageUrl: string | null;
    avatarUrl: string | null;
    sizeWidth: string;
    sizeHeight: string;
    gridSize: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
    // ... other token properties
  }>
}
```

**Example:**
```typescript
const { data } = trpc.tokens.list.useQuery({
  sceneId: 'scene-uuid',
});
```

---

### `tokens.get`

Get a single token by ID.

**Input:**
```typescript
{
  id: string; // Token UUID
}
```

**Response:**
```typescript
{
  token: {
    id: string;
    // ... all token fields
  }
}
```

---

### `tokens.create`

Create a new token on a scene.

**Input:**
```typescript
{
  sceneId: string; // UUID
  actorId?: string; // UUID - link to character
  name: string; // 1-200 characters
  tokenType: 'character' | 'npc' | 'monster' | 'object';
  positionX: number;
  positionY: number;
  imageUrl?: string; // URL
  sizeWidth?: number;
  sizeHeight?: number;
  gridSize?: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  visionEnabled?: boolean;
  visionRange?: number; // >= 0
  emitsLight?: boolean;
  lightRange?: number; // >= 0
  lightColor?: string;
}
```

**Response:**
```typescript
{
  token: {
    id: string;
    // ... token fields
  }
}
```

**Example:**
```typescript
const createToken = trpc.tokens.create.useMutation();

await createToken.mutateAsync({
  sceneId: 'scene-uuid',
  actorId: 'character-uuid',
  name: 'Aragorn',
  tokenType: 'character',
  positionX: 10,
  positionY: 15,
  gridSize: 'medium',
  visionEnabled: true,
  visionRange: 60,
});
```

---

### `tokens.update`

Update an existing token.

**Input:**
```typescript
{
  id: string; // Token UUID
  name?: string;
  tokenType?: 'character' | 'npc' | 'monster' | 'object';
  positionX?: string;
  positionY?: string;
  rotation?: string;
  elevation?: string;
  imageUrl?: string;
  avatarUrl?: string;
  sizeWidth?: string;
  sizeHeight?: string;
  gridSize?: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  tintColor?: string;
  scale?: string;
  opacity?: string;
  borderColor?: string;
  borderWidth?: number;
  showNameplate?: boolean;
  nameplatePosition?: 'top' | 'bottom';
  isLocked?: boolean;
  isHidden?: boolean;
  isVisible?: boolean;
  movementSpeed?: number;
  hasFlying?: boolean;
  hasSwimming?: boolean;
}
```

**Response:**
```typescript
{
  token: {
    // Updated token
  }
}
```

---

### `tokens.delete`

Delete a token.

**Input:**
```typescript
{
  id: string; // Token UUID
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

### `tokens.updateVision`

Update token vision configuration.

**Input:**
```typescript
{
  tokenId: string;
  visionEnabled?: boolean;
  visionRange?: number; // >= 0
  visionAngle?: number; // 0-360
  nightVision?: boolean;
  darkvisionRange?: number; // >= 0
}
```

**Response:**
```typescript
{
  token: {
    // Updated token
  }
}
```

---

### `tokens.updateLight`

Update token light configuration.

**Input:**
```typescript
{
  tokenId: string;
  emitsLight?: boolean;
  lightRange?: number; // >= 0
  lightAngle?: number; // 0-360
  lightColor?: string;
  lightIntensity?: number; // 0-1
  dimLightRange?: number; // >= 0
}
```

**Response:**
```typescript
{
  token: {
    // Updated token
  }
}
```

## Fog of War API

Manage user-specific fog of war revelation.

### `fogOfWar.getRevealed`

Get revealed areas for current user in a scene.

**Input:**
```typescript
{
  sceneId: string; // UUID
}
```

**Response:**
```typescript
{
  revealedAreas: Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
    revealedBy: string | null;
    isPermanent: boolean;
    createdAt: string;
  }>
}
```

---

### `fogOfWar.reveal`

Reveal a new area on the map.

**Input:**
```typescript
{
  sceneId: string;
  points: Array<{ x: number; y: number }>; // Min 3 points
  revealedBy?: string;
  isPermanent?: boolean;
}
```

**Response:**
```typescript
{
  revealedArea: {
    id: string;
    // ... area fields
  }
}
```

---

### `fogOfWar.conceal`

Conceal (hide) a previously revealed area.

**Input:**
```typescript
{
  areaId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

### `fogOfWar.reset`

Reset all fog for the current user in a scene.

**Input:**
```typescript
{
  sceneId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

## Vision Blockers API

Manage walls, doors, and other vision-blocking elements.

### `visionBlockers.list`

Get all vision blockers for a scene.

**Input:**
```typescript
{
  sceneId: string;
}
```

**Response:**
```typescript
{
  visionBlockers: Array<{
    id: string;
    blockerType: 'wall' | 'door' | 'window' | 'terrain';
    startX: string;
    startY: string;
    endX: string;
    endY: string;
    height: string;
    blocksVision: boolean;
    blocksLight: boolean;
    blocksMovement: boolean;
    doorState?: 'open' | 'closed' | 'locked';
  }>
}
```

---

### `visionBlockers.create`

Create a new vision blocker.

**Input:**
```typescript
{
  sceneId: string;
  blockerType: 'wall' | 'door' | 'window' | 'terrain';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  height?: number;
  blocksVision?: boolean;
  blocksLight?: boolean;
  blocksMovement?: boolean;
  doorState?: 'open' | 'closed' | 'locked';
}
```

**Response:**
```typescript
{
  visionBlocker: {
    id: string;
    // ... blocker fields
  }
}
```

---

### `visionBlockers.update`

Update a vision blocker.

**Input:**
```typescript
{
  id: string;
  blockerType?: 'wall' | 'door' | 'window' | 'terrain';
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  height?: number;
  blocksVision?: boolean;
  blocksLight?: boolean;
  blocksMovement?: boolean;
  doorState?: 'open' | 'closed' | 'locked';
}
```

---

### `visionBlockers.delete`

Delete a vision blocker.

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

## Drawings API

Manage user drawings on scenes.

### `drawings.list`

Get all drawings for a scene.

**Input:**
```typescript
{
  sceneId: string;
}
```

**Response:**
```typescript
{
  drawings: Array<{
    id: string;
    drawingType: 'freehand' | 'line' | 'rectangle' | 'circle' | 'polygon' | 'text';
    points: Array<{ x: number; y: number }>;
    strokeColor: string;
    strokeWidth: number;
    fillColor: string | null;
    text: string | null;
    fontSize: number | null;
    opacity: number;
  }>
}
```

---

### `drawings.create`

Create a new drawing.

**Input:**
```typescript
{
  sceneId: string;
  drawingType: 'freehand' | 'line' | 'rectangle' | 'circle' | 'polygon' | 'text';
  points: Array<{ x: number; y: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null;
  text?: string | null;
  fontSize?: number | null;
  opacity?: number; // 0-1
}
```

**Response:**
```typescript
{
  drawing: {
    id: string;
    // ... drawing fields
  }
}
```

---

### `drawings.update`

Update a drawing.

**Input:**
```typescript
{
  id: string;
  points?: Array<{ x: number; y: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null;
  text?: string | null;
  fontSize?: number | null;
  opacity?: number;
}
```

---

### `drawings.delete`

Delete a drawing.

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

## Measurements API

Manage measurement lines/areas.

### `measurements.list`

Get all measurements for a scene.

**Input:**
```typescript
{
  sceneId: string;
}
```

**Response:**
```typescript
{
  measurements: Array<{
    id: string;
    measurementType: 'line' | 'area';
    points: Array<{ x: number; y: number }>;
    distance: number | null;
    area: number | null;
    unit: 'feet' | 'meters' | 'squares';
  }>
}
```

---

### `measurements.create`

Create a measurement.

**Input:**
```typescript
{
  sceneId: string;
  measurementType: 'line' | 'area';
  points: Array<{ x: number; y: number }>;
  distance?: number;
  area?: number;
  unit?: 'feet' | 'meters' | 'squares';
}
```

---

### `measurements.delete`

Delete a measurement.

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

## Character Folders API

Organize characters into folders.

### `characterFolders.list`

Get all folders for a campaign.

**Input:**
```typescript
{
  campaignId: string;
}
```

**Response:**
```typescript
{
  folders: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    sortOrder: number;
    characterCount: number;
  }>
}
```

---

### `characterFolders.create`

Create a folder.

**Input:**
```typescript
{
  campaignId: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}
```

---

### `characterFolders.update`

Update a folder.

**Input:**
```typescript
{
  id: string;
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}
```

---

### `characterFolders.delete`

Delete a folder.

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

### `characterFolders.addCharacter`

Add a character to a folder.

**Input:**
```typescript
{
  folderId: string;
  characterId: string;
}
```

---

### `characterFolders.removeCharacter`

Remove a character from a folder.

**Input:**
```typescript
{
  folderId: string;
  characterId: string;
}
```

## Character Sharing API

Share characters between campaigns.

### `characterShares.list`

Get all shared characters for a campaign.

**Input:**
```typescript
{
  campaignId: string;
}
```

**Response:**
```typescript
{
  sharedCharacters: Array<{
    id: string;
    characterId: string;
    sourceCampaignId: string;
    permissions: 'view' | 'edit';
    character: {
      name: string;
      class: string;
      level: number;
    }
  }>
}
```

---

### `characterShares.create`

Share a character with another campaign.

**Input:**
```typescript
{
  characterId: string;
  targetCampaignId: string;
  permissions?: 'view' | 'edit';
}
```

---

### `characterShares.updatePermissions`

Update sharing permissions.

**Input:**
```typescript
{
  shareId: string;
  permissions: 'view' | 'edit';
}
```

---

### `characterShares.revoke`

Revoke a share.

**Input:**
```typescript
{
  shareId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

## Rate Limits

Currently, there are no enforced rate limits on the API. However, best practices suggest:

- Maximum 100 requests per second per user
- Batch operations when possible
- Use subscriptions for real-time updates (when available)
- Cache query results appropriately

For production deployments, consider implementing rate limiting middleware.

## Versioning

The API follows semantic versioning. Breaking changes will result in a major version bump.

Current version: **v1.0.0**

---

**Last Updated:** 2025-11-16
**API Version:** 1.0.0
