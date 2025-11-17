/**
 * TokenNameplate Component
 *
 * Displays token name above or below the token using HTML overlay.
 * Supports visibility controls, positioning, and zoom-based scaling.
 *
 * @module components/battle-map/TokenNameplate
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { NameplatePosition } from '@/types/token';
import { useCamera } from '@/stores/useBattleMapStore';

// ===========================
// Props Interface
// ===========================

export interface TokenNameplateProps {
  /** Token name to display */
  name: string;
  /** Position relative to token (top/bottom) */
  position?: NameplatePosition;
  /** Size of the token (for offset calculation) */
  tokenSize: number;
  /** Whether the nameplate should be visible */
  visible?: boolean;
  /** Name visibility mode */
  nameVisibility?: 'all' | 'owner' | 'hover' | 'gm';
  /** Whether the current user owns this token */
  isOwner?: boolean;
  /** Whether the current user is GM */
  isGM?: boolean;
  /** Whether the token is hovered */
  isHovered?: boolean;
  /** Base font size in pixels */
  fontSize?: number;
  /** Text color */
  textColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Background opacity (0-1) */
  backgroundOpacity?: number;
  /** Minimum zoom level to show nameplate (prevents clutter when zoomed out) */
  minZoom?: number;
}

// ===========================
// Component
// ===========================

/**
 * TokenNameplate Component
 *
 * Renders token name as HTML overlay with automatic positioning
 * and visibility controls based on zoom level and permissions.
 *
 * @example
 * ```tsx
 * <TokenNameplate
 *   name="Thorin Ironshield"
 *   position={NameplatePosition.BOTTOM}
 *   tokenSize={100}
 *   visible={true}
 *   isOwner={true}
 * />
 * ```
 */
export const TokenNameplate: React.FC<TokenNameplateProps> = ({
  name,
  position = NameplatePosition.BOTTOM,
  tokenSize,
  visible = true,
  nameVisibility = 'all',
  isOwner = false,
  isGM = false,
  isHovered = false,
  fontSize = 14,
  textColor = '#ffffff',
  backgroundColor = '#000000',
  backgroundOpacity = 0.7,
  minZoom = 0.3,
}) => {
  const camera = useCamera();

  // Determine if nameplate should be shown based on visibility rules
  const shouldShow = useMemo(() => {
    if (!visible) return false;

    // Check zoom level
    if (camera.zoom < minZoom) return false;

    // Check visibility permissions
    switch (nameVisibility) {
      case 'gm':
        return isGM;
      case 'owner':
        return isOwner || isGM;
      case 'hover':
        return isHovered || isOwner || isGM;
      case 'all':
      default:
        return true;
    }
  }, [visible, camera.zoom, minZoom, nameVisibility, isGM, isOwner, isHovered]);

  // Calculate vertical offset based on position
  const yOffset = useMemo(() => {
    const baseOffset = tokenSize / 2 + 10; // Half token size + padding
    return position === NameplatePosition.TOP ? baseOffset : -baseOffset;
  }, [tokenSize, position]);

  // Calculate opacity based on zoom level for smooth fade
  const opacity = useMemo(() => {
    if (!shouldShow) return 0;

    // Fade in as we zoom in
    const fadeRange = 0.2; // Zoom range over which to fade
    const fadeStart = minZoom;
    const fadeEnd = minZoom + fadeRange;

    if (camera.zoom <= fadeStart) return 0;
    if (camera.zoom >= fadeEnd) return 1;

    // Linear interpolation
    return (camera.zoom - fadeStart) / fadeRange;
  }, [camera.zoom, minZoom, shouldShow]);

  // Don't render if not visible
  if (!shouldShow || opacity === 0) {
    return null;
  }

  // Calculate scale based on zoom (inverse relationship for consistent size)
  const scale = useMemo(() => {
    // As zoom increases, HTML elements appear smaller, so we scale them up
    const baseScale = 1 / Math.max(camera.zoom, 0.5);
    return Math.min(baseScale, 2); // Cap at 2x to prevent huge text when zoomed out
  }, [camera.zoom]);

  return (
    <Html
      position={[0, yOffset, 0.1]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'opacity 0.2s ease-in-out',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          padding: '4px 8px',
          backgroundColor,
          color: textColor,
          fontSize: `${fontSize}px`,
          fontWeight: 500,
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          opacity: backgroundOpacity,
          backdropFilter: 'blur(2px)',
        }}
      >
        {name}
      </div>
    </Html>
  );
};

/**
 * TokenStatusBar Component
 *
 * Displays a health/resource bar above or below the token.
 * Used for showing HP, spell slots, or other resources.
 *
 * @example
 * ```tsx
 * <TokenStatusBar
 *   value={50}
 *   max={100}
 *   tokenSize={100}
 *   position="top"
 *   color="#ff0000"
 * />
 * ```
 */
export interface TokenStatusBarProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Temporary value (e.g., temp HP) */
  temp?: number;
  /** Size of the token (for positioning) */
  tokenSize: number;
  /** Position relative to token */
  position?: 'top' | 'bottom';
  /** Bar color */
  color?: string;
  /** Temp bar color */
  tempColor?: string;
  /** Bar width as fraction of token size */
  width?: number;
  /** Bar height in pixels */
  height?: number;
  /** Whether to show numeric value */
  showValue?: boolean;
  /** Minimum zoom level to show bar */
  minZoom?: number;
}

export const TokenStatusBar: React.FC<TokenStatusBarProps> = ({
  value,
  max,
  temp = 0,
  tokenSize,
  position = 'top',
  color = '#ff0000',
  tempColor = '#00bfff',
  width = 0.8,
  height = 8,
  showValue = false,
  minZoom = 0.5,
}) => {
  const camera = useCamera();

  // Calculate vertical offset
  const yOffset = useMemo(() => {
    const nameOffset = position === 'top' ? tokenSize / 2 + 25 : -(tokenSize / 2 + 25);
    return nameOffset;
  }, [tokenSize, position]);

  // Calculate bar fill percentage
  const fillPercentage = useMemo(() => {
    return Math.max(0, Math.min(100, (value / max) * 100));
  }, [value, max]);

  const tempPercentage = useMemo(() => {
    if (temp <= 0) return 0;
    return Math.min(100 - fillPercentage, (temp / max) * 100);
  }, [temp, max, fillPercentage]);

  // Check if should show
  const shouldShow = useMemo(() => {
    return camera.zoom >= minZoom;
  }, [camera.zoom, minZoom]);

  if (!shouldShow) return null;

  const barWidth = tokenSize * width;

  return (
    <Html
      position={[0, yOffset, 0.1]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: `${barWidth}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '2px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Main value bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${fillPercentage}%`,
            backgroundColor: color,
            transition: 'width 0.3s ease-out',
          }}
        />

        {/* Temporary value bar (e.g., temp HP) */}
        {tempPercentage > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${fillPercentage}%`,
              top: 0,
              height: '100%',
              width: `${tempPercentage}%`,
              backgroundColor: tempColor,
              transition: 'width 0.3s ease-out',
            }}
          />
        )}

        {/* Value text */}
        {showValue && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '0 0 2px rgba(0, 0, 0, 0.8)',
              pointerEvents: 'none',
            }}
          >
            {value}/{max}
          </div>
        )}
      </div>
    </Html>
  );
};

/**
 * TokenStatusIcons Component
 *
 * Displays status effect icons around the token.
 * Shows conditions like stunned, poisoned, blessed, etc.
 *
 * @example
 * ```tsx
 * <TokenStatusIcons
 *   icons={[
 *     { id: '1', icon: '/icons/stunned.png', label: 'Stunned' },
 *     { id: '2', icon: '/icons/poisoned.png', label: 'Poisoned' },
 *   ]}
 *   tokenSize={100}
 * />
 * ```
 */
export interface StatusIcon {
  id: string;
  icon: string;
  label?: string;
  overlay?: boolean;
}

export interface TokenStatusIconsProps {
  /** Status effect icons to display */
  icons: StatusIcon[];
  /** Size of the token */
  tokenSize: number;
  /** Size of each icon in pixels */
  iconSize?: number;
  /** Position around token (top/bottom/left/right) */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Minimum zoom level to show icons */
  minZoom?: number;
}

export const TokenStatusIcons: React.FC<TokenStatusIconsProps> = ({
  icons,
  tokenSize,
  iconSize = 20,
  position = 'top',
  minZoom = 0.4,
}) => {
  const camera = useCamera();

  const shouldShow = useMemo(() => {
    return camera.zoom >= minZoom && icons.length > 0;
  }, [camera.zoom, minZoom, icons.length]);

  // Calculate offset based on position
  const [xOffset, yOffset] = useMemo(() => {
    const offset = tokenSize / 2 + iconSize / 2 + 5;
    switch (position) {
      case 'top':
        return [0, offset];
      case 'bottom':
        return [0, -offset];
      case 'left':
        return [-offset, 0];
      case 'right':
        return [offset, 0];
      default:
        return [0, offset];
    }
  }, [tokenSize, iconSize, position]);

  if (!shouldShow) return null;

  return (
    <Html
      position={[xOffset, yOffset, 0.1]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '2px',
          flexDirection: position === 'left' || position === 'right' ? 'column' : 'row',
        }}
      >
        {icons.slice(0, 5).map((statusIcon) => (
          <div
            key={statusIcon.id}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              backgroundImage: `url(${statusIcon.icon})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
            title={statusIcon.label}
          />
        ))}
        {icons.length > 5 && (
          <div
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          >
            +{icons.length - 5}
          </div>
        )}
      </div>
    </Html>
  );
};
