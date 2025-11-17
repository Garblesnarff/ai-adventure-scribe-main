# Token Rendering Components - Phase 4.1

This document provides usage examples for the Token Rendering components created in Phase 4.1.

## Components Created

### 1. Utilities (`/src/utils/token-sizing.ts`)
Token sizing calculation utilities for positioning and scaling tokens on the grid.

**Functions:**
- `getTokenDimensions(tokenSize, gridSize, customWidth?, customHeight?)` - Get token dimensions in grid squares and pixels
- `getTokenScale(tokenSize)` - Get scale multiplier for a token size
- `centerTokenOnGrid(gridX, gridY, tokenSize, gridSize)` - Center a token on a grid cell
- `pixelToGrid(pixelX, pixelY, gridSize)` - Convert pixel coordinates to grid coordinates
- `snapToGrid(pixelX, pixelY, tokenSize, gridSize)` - Snap pixel coordinates to nearest grid cell center
- `getBorderWidth(tokenSize, baseBorderWidth?)` - Calculate border width based on token size
- `getNameplateOffset(tokenSize, gridSize)` - Get nameplate offset distance from token edge

**Example:**
```typescript
import { getTokenDimensions, centerTokenOnGrid } from '@/utils/token-sizing';
import { TokenSize } from '@/types/token';

// Get dimensions for a large token (2x2 grid squares)
const dimensions = getTokenDimensions(TokenSize.LARGE, 100);
// Returns: { width: 2, height: 2, pixelWidth: 200, pixelHeight: 200 }

// Center token at grid position (5, 5)
const position = centerTokenOnGrid(5, 5, TokenSize.LARGE, 100);
// Returns: { x: 550, y: 550 }
```

### 2. TokenImage Component (`/src/components/battle-map/TokenImage.tsx`)
Loads and displays token images with fallback support and visual effects.

**Features:**
- Texture loading with caching
- Automatic fallback to portrait or default images
- Circular or square token shapes
- Tint color and opacity control
- Loading and error states

**Example:**
```tsx
import { TokenImage } from '@/components/battle-map';
import { TokenType } from '@/types/token';

<TokenImage
  imageUrl="https://example.com/dragon.png"
  tokenType={TokenType.MONSTER}
  size={200}
  circular={true}
  tintColor="#ff0000"
  opacity={0.9}
/>
```

### 3. TokenBorder Component (`/src/components/battle-map/TokenBorder.tsx`)
Renders colored borders around tokens to indicate disposition, selection, and targeting states.

**Components:**
- `TokenBorder` - Single border ring
- `TokenGlow` - Glowing effect
- `MultiLayerBorder` - Multiple borders for complex states

**Example:**
```tsx
import { MultiLayerBorder } from '@/components/battle-map';
import { TokenDisposition } from '@/types/token';

<MultiLayerBorder
  size={200}
  circular={true}
  disposition={TokenDisposition.HOSTILE}
  isSelected={true}
  isTargeted={false}
  isHovered={false}
  borderWidth={0.05}
/>
```

### 4. TokenNameplate Component (`/src/components/battle-map/TokenNameplate.tsx`)
Displays token names and status information using HTML overlays.

**Components:**
- `TokenNameplate` - Token name display
- `TokenStatusBar` - Health/resource bars
- `TokenStatusIcons` - Status effect icons

**Example:**
```tsx
import { TokenNameplate, TokenStatusBar, TokenStatusIcons } from '@/components/battle-map';
import { NameplatePosition } from '@/types/token';

// Name display
<TokenNameplate
  name="Thorin Ironshield"
  position={NameplatePosition.BOTTOM}
  tokenSize={200}
  visible={true}
  nameVisibility="all"
  isOwner={true}
  isGM={false}
/>

// Health bar
<TokenStatusBar
  value={50}
  max={100}
  temp={10}
  tokenSize={200}
  position="top"
  color="#ff0000"
  showValue={true}
/>

// Status icons
<TokenStatusIcons
  icons={[
    { id: '1', icon: '/icons/stunned.png', label: 'Stunned' },
    { id: '2', icon: '/icons/poisoned.png', label: 'Poisoned' }
  ]}
  tokenSize={200}
  iconSize={20}
  position="bottom"
/>
```

### 5. Token Component (`/src/components/battle-map/Token.tsx`)
Main token component that combines all sub-components into a complete token representation.

**Features:**
- Renders token image, border, nameplate, and status displays
- Handles click, right-click, hover, and drag interactions
- Manages selection, targeting, and hover states
- Supports ownership and GM visibility controls

**Example (Single Token):**
```tsx
import { Token } from '@/components/battle-map';
import { Token as TokenData, TokenType, TokenSize, TokenDisposition } from '@/types/token';

const tokenData: TokenData = {
  id: 'token-1',
  sceneId: 'scene-1',
  name: 'Ancient Red Dragon',
  tokenType: TokenType.MONSTER,
  x: 500,
  y: 500,
  elevation: 0,
  imageUrl: 'https://example.com/dragon.png',
  width: 4,
  height: 4,
  size: TokenSize.GARGANTUAN,
  scale: 1.0,
  rotation: 0,
  alpha: 1.0,
  displayName: true,
  nameplate: NameplatePosition.BOTTOM,
  nameVisibility: 'all',
  displayBars: 'always',
  bar1: {
    attribute: 'hitPoints',
    value: 546,
    max: 546,
    visible: true,
  },
  disposition: TokenDisposition.HOSTILE,
  statusEffects: [],
  conditions: [],
  vision: defaultTokenVision,
  light: defaultTokenLight,
  lockRotation: false,
  hidden: false,
  locked: false,
  ownerIds: [],
  observerIds: [],
  createdBy: 'gm-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

<Token
  token={tokenData}
  gridSize={100}
  isSelected={false}
  isTargeted={false}
  isHovered={false}
  isOwner={false}
  isGM={true}
  onClick={(token, event) => {
    console.log('Token clicked:', token.name);
  }}
  onContextMenu={(token, event) => {
    console.log('Token right-clicked:', token.name);
  }}
/>
```

**Example (Multiple Tokens with TokenGroup):**
```tsx
import { TokenGroup } from '@/components/battle-map';
import { useSelectedTokenIds, useTargetedTokenIds, useHoveredTokenId } from '@/stores/useBattleMapStore';

function BattleMapTokens({ tokens, gridSize, userId, isGM }) {
  const selectedTokenIds = useSelectedTokenIds();
  const targetedTokenIds = useTargetedTokenIds();
  const hoveredTokenId = useHoveredTokenId();

  const handleTokenClick = (token, event) => {
    // Handle token selection
    if (event.shiftKey) {
      // Multi-select
      useBattleMapStore.getState().selectToken(token.id, true);
    } else {
      // Single select
      useBattleMapStore.getState().selectToken(token.id, false);
    }
  };

  const handleTokenContextMenu = (token, event) => {
    // Show context menu
    console.log('Show context menu for:', token.name);
  };

  return (
    <TokenGroup
      tokens={tokens}
      gridSize={gridSize}
      selectedTokenIds={selectedTokenIds}
      targetedTokenIds={targetedTokenIds}
      hoveredTokenId={hoveredTokenId}
      userId={userId}
      isGM={isGM}
      onTokenClick={handleTokenClick}
      onTokenContextMenu={handleTokenContextMenu}
    />
  );
}
```

## Integration with Battle Map Store

The token rendering components integrate with the Zustand battle map store for state management:

```typescript
import { useBattleMapStore } from '@/stores/useBattleMapStore';

// Select a token
useBattleMapStore.getState().selectToken('token-1');

// Select multiple tokens (multi-select)
useBattleMapStore.getState().selectToken('token-2', true);

// Deselect a token
useBattleMapStore.getState().deselectToken('token-1');

// Clear all selections
useBattleMapStore.getState().clearSelection();

// Target a token
useBattleMapStore.getState().targetToken('token-3');

// Set hovered token
useBattleMapStore.getState().setHoveredToken('token-4');

// Using hooks
const selectedTokenIds = useSelectedTokenIds();
const isSelected = useIsTokenSelected('token-1');
const isTargeted = useIsTokenTargeted('token-2');
const isHovered = useIsTokenHovered('token-3');
```

## Complete Integration Example

```tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { BattleCanvas, TokenGroup } from '@/components/battle-map';
import { useBattleMapStore, useSelectedTokenIds, useTargetedTokenIds, useHoveredTokenId } from '@/stores/useBattleMapStore';

function BattleMapWithTokens({ sceneId, tokens, gridSize }) {
  const selectedTokenIds = useSelectedTokenIds();
  const targetedTokenIds = useTargetedTokenIds();
  const hoveredTokenId = useHoveredTokenId();
  const selectToken = useBattleMapStore((state) => state.selectToken);
  const clearSelection = useBattleMapStore((state) => state.clearSelection);

  return (
    <BattleCanvas sceneId={sceneId}>
      <TokenGroup
        tokens={tokens}
        gridSize={gridSize}
        selectedTokenIds={selectedTokenIds}
        targetedTokenIds={targetedTokenIds}
        hoveredTokenId={hoveredTokenId}
        userId="current-user-id"
        isGM={true}
        onTokenClick={(token, event) => {
          if (event.shiftKey) {
            selectToken(token.id, true);
          } else {
            selectToken(token.id, false);
          }
        }}
        onTokenContextMenu={(token) => {
          console.log('Context menu for:', token.name);
        }}
      />
    </BattleCanvas>
  );
}
```

## Notes

- All token rendering components use THREE.js and React Three Fiber
- Texture caching is automatically handled for performance
- Token selection, targeting, and hover states are managed via Zustand store
- Components support both circular and square token shapes
- Nameplate and status displays scale based on camera zoom level
- Token interactions respect ownership and GM permissions
