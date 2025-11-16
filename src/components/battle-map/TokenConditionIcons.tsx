/**
 * TokenConditionIcons Component
 *
 * Displays active D&D 5e conditions as small icons around a battle map token.
 * Shows icons with tooltips and intelligently stacks multiple conditions.
 *
 * @module components/battle-map/TokenConditionIcons
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import type { Condition, ConditionName } from '@/types/combat';
import {
  CONDITION_ICONS,
  getSortedConditions,
  shouldConditionPulse,
  formatExhaustionDescription,
  getExhaustionLevel,
} from '@/utils/condition-icons';

/**
 * Props for TokenConditionIcons component
 */
export interface TokenConditionIconsProps {
  /** Active conditions on the token */
  conditions: Condition[];
  /** Token radius for positioning icons around border */
  tokenRadius?: number;
  /** Maximum number of icons to show before stacking */
  maxVisible?: number;
  /** Camera zoom level (0-1, used for scaling) */
  zoomLevel?: number;
  /** Icon size in pixels */
  iconSize?: number;
  /** Whether to show tooltips on hover */
  showTooltips?: boolean;
}

/**
 * Single condition icon with tooltip
 */
interface ConditionIconProps {
  condition: Condition;
  position: { x: number; y: number };
  size: number;
  showTooltip: boolean;
  index: number;
}

function ConditionIcon({ condition, position, size, showTooltip, index }: ConditionIconProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const config = CONDITION_ICONS[condition.name];

  if (!config) return null;

  const IconComponent = config.icon;
  const shouldPulse = shouldConditionPulse(condition.name);

  // Format tooltip text
  const tooltipText = useMemo(() => {
    if (condition.name === 'exhaustion' && condition.level) {
      return formatExhaustionDescription(condition.level);
    }
    return `${condition.name.charAt(0).toUpperCase() + condition.name.slice(1)}: ${config.description}`;
  }, [condition, config]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.05,
      }}
      className="absolute"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon Container */}
      <motion.div
        className="rounded-full flex items-center justify-center cursor-help"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: config.backgroundColor,
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
        }}
        animate={
          shouldPulse
            ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 2px 4px rgba(0, 0, 0, 0.4)',
                  '0 2px 8px rgba(255, 255, 255, 0.6)',
                  '0 2px 4px rgba(0, 0, 0, 0.4)',
                ],
              }
            : undefined
        }
        transition={
          shouldPulse
            ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
        whileHover={{ scale: 1.15 }}
      >
        <IconComponent size={config.size || 16} color={config.color} strokeWidth={2.5} />

        {/* Exhaustion Level Badge */}
        {condition.name === 'exhaustion' && condition.level && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white font-bold"
            style={{
              fontSize: '10px',
              border: '1px solid white',
            }}
          >
            {condition.level}
          </div>
        )}
      </motion.div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50"
          style={{
            minWidth: '200px',
            maxWidth: '300px',
          }}
        >
          <div
            className="px-3 py-2 rounded-md text-xs text-white"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="font-bold mb-1">
              {condition.name.charAt(0).toUpperCase() + condition.name.slice(1)}
            </div>
            <div className="text-gray-300 mb-1">{config.description}</div>
            {condition.duration > 0 && (
              <div className="text-gray-400 text-xs">
                Duration: {condition.duration} round{condition.duration !== 1 ? 's' : ''}
              </div>
            )}
            {condition.concentrationRequired && (
              <div className="text-purple-400 text-xs mt-1">Requires Concentration</div>
            )}
          </div>
          {/* Tooltip Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(0, 0, 0, 0.9)',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * TokenConditionIcons Component
 *
 * Displays condition icons in a circle around the token.
 * Automatically positions icons and handles stacking for many conditions.
 *
 * @example
 * ```tsx
 * <mesh position={[0, 0, 0]}>
 *   <TokenConditionIcons
 *     conditions={[
 *       { name: 'poisoned', duration: 3, description: '...' },
 *       { name: 'prone', duration: 1, description: '...' }
 *     ]}
 *     tokenRadius={0.5}
 *   />
 * </mesh>
 * ```
 */
export function TokenConditionIcons({
  conditions,
  tokenRadius = 0.5,
  maxVisible = 6,
  zoomLevel = 1,
  iconSize = 24,
  showTooltips = true,
}: TokenConditionIconsProps) {
  // Filter out unconscious (shown separately in TokenDeathState)
  const visibleConditions = useMemo(
    () => conditions.filter((c) => c.name !== 'unconscious'),
    [conditions],
  );

  // Sort by priority
  const sortedConditionNames = useMemo(
    () => getSortedConditions(visibleConditions.map((c) => c.name)),
    [visibleConditions],
  );

  // Get condition objects in sorted order
  const sortedConditions = useMemo(
    () =>
      sortedConditionNames
        .map((name) => visibleConditions.find((c) => c.name === name))
        .filter((c): c is Condition => c !== undefined),
    [sortedConditionNames, visibleConditions],
  );

  // Calculate positions in a circle around token
  const iconPositions = useMemo(() => {
    const displayCount = Math.min(sortedConditions.length, maxVisible);
    const radius = (tokenRadius * 100 + iconSize / 2 + 8) * zoomLevel; // Convert to pixels with offset
    const positions: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < displayCount; i++) {
      // Start from top and go clockwise
      const angle = (i / displayCount) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return positions;
  }, [sortedConditions.length, maxVisible, tokenRadius, iconSize, zoomLevel]);

  // Don't render if no conditions
  if (sortedConditions.length === 0) return null;

  const displayConditions = sortedConditions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sortedConditions.length - maxVisible);

  return (
    <Html
      position={[0, 0, 0.1]} // Slightly above token
      center
      distanceFactor={10}
      zIndexRange={[110, 0]}
      style={{
        pointerEvents: 'auto',
      }}
    >
      <div className="relative" style={{ width: 0, height: 0 }}>
        <AnimatePresence>
          {displayConditions.map((condition, index) => (
            <ConditionIcon
              key={`${condition.name}-${index}`}
              condition={condition}
              position={iconPositions[index]}
              size={iconSize}
              showTooltip={showTooltips}
              index={index}
            />
          ))}
        </AnimatePresence>

        {/* "+N more" indicator when conditions overflow */}
        {hiddenCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute rounded-full bg-gray-800 text-white font-bold flex items-center justify-center cursor-help"
            style={{
              left: `${iconPositions[maxVisible - 1]?.x || 0}px`,
              top: `${iconPositions[maxVisible - 1]?.y || 0}px`,
              transform: 'translate(-50%, -50%)',
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              fontSize: '10px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
            }}
            title={`${hiddenCount} more condition${hiddenCount !== 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </motion.div>
        )}
      </div>
    </Html>
  );
}
