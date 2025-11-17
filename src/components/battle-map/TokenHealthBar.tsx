/**
 * TokenHealthBar Component
 *
 * Displays a health bar above battle map tokens showing:
 * - Current/max HP with color coding
 * - Temporary HP overlay
 * - Smooth HP change transitions
 * - Fade out when zoomed out
 *
 * @module components/battle-map/TokenHealthBar
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';

/**
 * Props for TokenHealthBar component
 */
export interface TokenHealthBarProps {
  /** Current hit points */
  currentHp: number;
  /** Maximum hit points */
  maxHp: number;
  /** Temporary hit points */
  tempHp?: number;
  /** Position offset above token (in scene units) */
  yOffset?: number;
  /** Whether to show HP text (current/max) */
  showText?: boolean;
  /** Camera zoom level (0-1, used for fade out) */
  zoomLevel?: number;
  /** Width of health bar in pixels */
  width?: number;
  /** Height of health bar in pixels */
  height?: number;
  /** Whether token is selected */
  isSelected?: boolean;
}

/**
 * Get health bar color based on HP percentage
 */
function getHealthColor(percentage: number): string {
  if (percentage > 0.5) return '#22c55e'; // green-500
  if (percentage > 0.25) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

/**
 * Get health bar gradient for visual appeal
 */
function getHealthGradient(percentage: number): string {
  const color = getHealthColor(percentage);
  // Create a gradient from darker to lighter
  return `linear-gradient(to right, ${color}dd, ${color})`;
}

/**
 * TokenHealthBar Component
 *
 * Renders a health bar above a token using drei's Html component.
 * Automatically updates when HP changes with smooth transitions.
 *
 * @example
 * ```tsx
 * <mesh position={[0, 0, 0]}>
 *   <TokenHealthBar
 *     currentHp={45}
 *     maxHp={60}
 *     tempHp={10}
 *     showText={true}
 *   />
 * </mesh>
 * ```
 */
export function TokenHealthBar({
  currentHp,
  maxHp,
  tempHp = 0,
  yOffset = 0.6,
  showText = true,
  zoomLevel = 1,
  width = 120,
  height = 12,
  isSelected = false,
}: TokenHealthBarProps) {
  // Calculate percentages
  const hpPercentage = useMemo(
    () => Math.max(0, Math.min(1, currentHp / maxHp)),
    [currentHp, maxHp],
  );

  const tempHpPercentage = useMemo(
    () => Math.max(0, Math.min(1, tempHp / maxHp)),
    [tempHp, maxHp],
  );

  // Fade out when zoomed out
  const opacity = useMemo(() => {
    if (isSelected) return 1; // Always show when selected
    return Math.max(0, Math.min(1, zoomLevel * 1.5));
  }, [zoomLevel, isSelected]);

  // Don't render if completely faded or dead
  if (opacity === 0 || maxHp === 0) return null;

  const healthColor = getHealthColor(hpPercentage);
  const healthGradient = getHealthGradient(hpPercentage);

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <div
        className="flex flex-col items-center gap-0.5"
        style={{
          filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' : 'none',
        }}
      >
        {/* HP Text */}
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-bold text-white px-2 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {tempHp > 0 ? (
              <>
                {currentHp}
                <span className="text-cyan-400">+{tempHp}</span> / {maxHp}
              </>
            ) : (
              <>
                {currentHp} / {maxHp}
              </>
            )}
          </motion.div>
        )}

        {/* Health Bar Container */}
        <div
          className="relative rounded-sm overflow-hidden"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Background (empty HP) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(60, 60, 60, 0.8)',
            }}
          />

          {/* Current HP Bar */}
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={false}
            animate={{
              width: `${hpPercentage * 100}%`,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            style={{
              background: healthGradient,
              boxShadow: `inset 0 1px 2px rgba(255, 255, 255, 0.3)`,
            }}
          />

          {/* Temporary HP Overlay */}
          {tempHp > 0 && (
            <motion.div
              className="absolute inset-y-0"
              initial={{ opacity: 0, width: 0 }}
              animate={{
                left: `${hpPercentage * 100}%`,
                width: `${tempHpPercentage * 100}%`,
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              style={{
                background: 'linear-gradient(to right, #06b6d4dd, #06b6d4)', // cyan gradient
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          )}

          {/* Shine effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
            }}
          />
        </div>

        {/* Low HP Warning Pulse */}
        {hpPercentage < 0.25 && hpPercentage > 0 && (
          <motion.div
            className="absolute inset-0 rounded-sm pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0 rgba(239, 68, 68, 0)`,
                `0 0 8px rgba(239, 68, 68, 0.6)`,
                `0 0 0 rgba(239, 68, 68, 0)`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>
    </Html>
  );
}

/**
 * Compact version of health bar (no text, smaller)
 */
export function TokenHealthBarCompact({
  currentHp,
  maxHp,
  tempHp = 0,
  yOffset = 0.4,
  zoomLevel = 1,
}: Omit<TokenHealthBarProps, 'showText' | 'width' | 'height'>) {
  return (
    <TokenHealthBar
      currentHp={currentHp}
      maxHp={maxHp}
      tempHp={tempHp}
      yOffset={yOffset}
      showText={false}
      zoomLevel={zoomLevel}
      width={80}
      height={8}
    />
  );
}
