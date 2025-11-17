/**
 * Token Component
 *
 * Main token component that renders a complete token on the battle map.
 * Combines image, border, nameplate, and interaction handlers.
 *
 * @module components/battle-map/Token
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Token as TokenData } from '@/types/token';
import { TokenImage } from './TokenImage';
import { MultiLayerBorder } from './TokenBorder';
import { TokenNameplate, TokenStatusBar, TokenStatusIcons } from './TokenNameplate';
import { getTokenDimensions, getBorderWidth } from '@/utils/token-sizing';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import logger from '@/lib/logger';

// ===========================
// Props Interface
// ===========================

export interface TokenProps {
  /** Token data */
  token: TokenData;
  /** Grid size in pixels */
  gridSize: number;
  /** Whether the token is selected */
  isSelected?: boolean;
  /** Whether the token is targeted */
  isTargeted?: boolean;
  /** Whether the token is hovered */
  isHovered?: boolean;
  /** Whether the current user owns this token */
  isOwner?: boolean;
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Whether another user is moving this token */
  isBeingMovedByOther?: boolean;
  /** Click handler */
  onClick?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
  /** Context menu handler (right-click) */
  onContextMenu?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
  /** Hover enter handler */
  onPointerEnter?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  /** Hover leave handler */
  onPointerLeave?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  /** Drag start handler */
  onDragStart?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  /** Drag handler */
  onDrag?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
  /** Drag end handler */
  onDragEnd?: (token: TokenData, event: ThreeEvent<PointerEvent>) => void;
}

// ===========================
// Component
// ===========================

/**
 * Token Component
 *
 * Complete token representation on the battle map including:
 * - Token image with size-based scaling
 * - Border with disposition colors
 * - Selection/targeting/hover states
 * - Nameplate display
 * - Status bars (HP, etc.)
 * - Status effect icons
 * - Interaction handlers (click, right-click, hover, drag)
 *
 * @example
 * ```tsx
 * <Token
 *   token={tokenData}
 *   gridSize={100}
 *   isSelected={false}
 *   onClick={(token) => console.log('Clicked:', token.name)}
 * />
 * ```
 */
export const Token: React.FC<TokenProps> = ({
  token,
  gridSize,
  isSelected = false,
  isTargeted = false,
  isHovered = false,
  isOwner = false,
  isGM = false,
  isBeingMovedByOther = false,
  onClick,
  onContextMenu,
  onPointerEnter,
  onPointerLeave,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const setHoveredToken = useBattleMapStore((state) => state.setHoveredToken);

  // Calculate token dimensions based on size
  const dimensions = useMemo(
    () => getTokenDimensions(token.size, gridSize, token.width, token.height),
    [token.size, gridSize, token.width, token.height]
  );

  // Calculate border width based on token size
  const borderWidth = useMemo(() => getBorderWidth(token.size), [token.size]);

  // Determine if token should be visible
  const isVisible = useMemo(() => {
    if (isGM) return true; // GM sees all tokens
    if (token.hidden) return false; // Hidden tokens not visible to players
    return true;
  }, [isGM, token.hidden]);

  // Calculate token position (convert from pixel coordinates to world coordinates)
  const position = useMemo<[number, number, number]>(() => {
    // Tokens are positioned at their center in world space
    // The x, y from the token data represent the top-left corner
    const centerX = token.x + dimensions.pixelWidth / 2;
    const centerY = token.y + dimensions.pixelHeight / 2;

    // Apply elevation if present
    const z = token.elevation ? token.elevation * 0.1 : 0;

    return [centerX, centerY, z];
  }, [token.x, token.y, token.elevation, dimensions]);

  // Handle click
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      // Prevent click if locked
      if (token.locked && !isGM) {
        logger.debug('Token is locked', { tokenId: token.id });
        return;
      }

      if (onClick) {
        onClick(token, event);
      }

      logger.debug('Token clicked', { tokenId: token.id, name: token.name });
    },
    [token, isGM, onClick]
  );

  // Handle context menu (right-click)
  const handleContextMenu = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      if (onContextMenu) {
        onContextMenu(token, event);
      }

      logger.debug('Token context menu', { tokenId: token.id, name: token.name });
    },
    [token, onContextMenu]
  );

  // Handle pointer enter (hover start)
  const handlePointerEnter = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoveredToken(token.id);

      if (onPointerEnter) {
        onPointerEnter(token, event);
      }
    },
    [token, setHoveredToken, onPointerEnter]
  );

  // Handle pointer leave (hover end)
  const handlePointerLeave = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();

      // Only clear hover if not dragging
      if (!isDragging) {
        setHoveredToken(null);
      }

      if (onPointerLeave) {
        onPointerLeave(token, event);
      }
    },
    [token, isDragging, setHoveredToken, onPointerLeave]
  );

  // Handle drag start
  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Only allow dragging if token is not locked or user is GM
      if (token.locked && !isGM) return;
      if (!isOwner && !isGM) return;

      event.stopPropagation();
      setIsDragging(true);

      if (onDragStart) {
        onDragStart(token, event);
      }
    },
    [token, isGM, isOwner, onDragStart]
  );

  // Handle drag
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging) return;

      event.stopPropagation();

      if (onDrag) {
        onDrag(token, event);
      }
    },
    [isDragging, token, onDrag]
  );

  // Handle drag end
  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging) return;

      event.stopPropagation();
      setIsDragging(false);

      if (onDragEnd) {
        onDragEnd(token, event);
      }
    },
    [isDragging, token, onDragEnd]
  );

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Determine if token uses circular or square shape
  const isCircular = true; // Can be made configurable based on token settings

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, 0, (token.rotation * Math.PI) / 180]}
      name={`token-${token.id}`}
    >
      {/* Token Image */}
      <TokenImage
        imageUrl={token.imageUrl}
        tokenType={token.tokenType}
        size={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
        circular={isCircular}
        tintColor={token.tint}
        opacity={token.alpha}
        zOffset={0}
      />

      {/* Token Border (with selection/targeting states) */}
      <MultiLayerBorder
        size={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
        circular={isCircular}
        disposition={token.disposition}
        isSelected={isSelected}
        isTargeted={isTargeted}
        isHovered={isHovered}
        borderWidth={borderWidth}
      />

      {/* Visual indicator when being moved by another user */}
      {isBeingMovedByOther && (
        <mesh position={[0, 0, 0.1]}>
          {isCircular ? (
            <ringGeometry args={[
              dimensions.pixelWidth / 2 + borderWidth * 2,
              dimensions.pixelWidth / 2 + borderWidth * 3,
              32
            ]} />
          ) : (
            <planeGeometry args={[
              dimensions.pixelWidth + borderWidth * 6,
              dimensions.pixelHeight + borderWidth * 6
            ]} />
          )}
          <meshBasicMaterial color="#fbbf24" opacity={0.5} transparent />
        </mesh>
      )}

      {/* Token Nameplate */}
      {token.displayName && (
        <TokenNameplate
          name={token.name}
          position={token.nameplate}
          tokenSize={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
          visible={true}
          nameVisibility={token.nameVisibility}
          isOwner={isOwner}
          isGM={isGM}
          isHovered={isHovered}
        />
      )}

      {/* Health Bar */}
      {token.displayBars !== 'none' && token.bar1 && token.bar1.visible && (
        <TokenStatusBar
          value={token.bar1.value}
          max={token.bar1.max}
          temp={token.bar1.temp}
          tokenSize={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
          position="top"
          color={token.bar1.color || token.barColor}
          showValue={token.displayBars === 'always' || isOwner || isGM}
        />
      )}

      {/* Secondary Bar (e.g., spell slots) */}
      {token.displayBars !== 'none' && token.bar2 && token.bar2.visible && (
        <TokenStatusBar
          value={token.bar2.value}
          max={token.bar2.max}
          tokenSize={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
          position="bottom"
          color={token.bar2.color || token.bar2Color}
          showValue={token.displayBars === 'always' || isOwner || isGM}
        />
      )}

      {/* Status Effect Icons */}
      {token.statusEffects && token.statusEffects.length > 0 && (
        <TokenStatusIcons
          icons={token.statusEffects.map((effect) => ({
            id: effect.id,
            icon: effect.icon,
            label: effect.label || effect.description,
            overlay: effect.overlay,
          }))}
          tokenSize={Math.max(dimensions.pixelWidth, dimensions.pixelHeight)}
          position="bottom"
        />
      )}

      {/* Interaction Mesh (invisible, for mouse events) */}
      <mesh
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        position={[0, 0, 0.05]}
      >
        {isCircular ? (
          <circleGeometry args={[dimensions.pixelWidth / 2, 32]} />
        ) : (
          <planeGeometry args={[dimensions.pixelWidth, dimensions.pixelHeight]} />
        )}
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
};

/**
 * TokenGroup Component
 *
 * Renders multiple tokens efficiently.
 * Useful for rendering all tokens in a scene.
 *
 * @example
 * ```tsx
 * <TokenGroup
 *   tokens={sceneTokens}
 *   gridSize={100}
 *   onTokenClick={(token) => console.log('Clicked:', token.name)}
 * />
 * ```
 */
export interface TokenGroupProps {
  /** Array of tokens to render */
  tokens: TokenData[];
  /** Grid size in pixels */
  gridSize: number;
  /** Selected token IDs */
  selectedTokenIds?: string[];
  /** Targeted token IDs */
  targetedTokenIds?: string[];
  /** Hovered token ID */
  hoveredTokenId?: string | null;
  /** Current user ID for ownership checks */
  userId?: string;
  /** Whether current user is GM */
  isGM?: boolean;
  /** Click handler */
  onTokenClick?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
  /** Context menu handler */
  onTokenContextMenu?: (token: TokenData, event: ThreeEvent<MouseEvent>) => void;
}

export const TokenGroup: React.FC<TokenGroupProps> = ({
  tokens,
  gridSize,
  selectedTokenIds = [],
  targetedTokenIds = [],
  hoveredTokenId = null,
  userId,
  isGM = false,
  onTokenClick,
  onTokenContextMenu,
}) => {
  return (
    <group name="tokens-layer">
      {tokens.map((token) => {
        const isSelected = selectedTokenIds.includes(token.id);
        const isTargeted = targetedTokenIds.includes(token.id);
        const isHovered = hoveredTokenId === token.id;
        const isOwner = userId ? token.ownerIds.includes(userId) : false;

        return (
          <Token
            key={token.id}
            token={token}
            gridSize={gridSize}
            isSelected={isSelected}
            isTargeted={isTargeted}
            isHovered={isHovered}
            isOwner={isOwner}
            isGM={isGM}
            onClick={onTokenClick}
            onContextMenu={onTokenContextMenu}
          />
        );
      })}
    </group>
  );
};
