/**
 * TokenResourceBars Component
 *
 * Displays resource bars for character resources like:
 * - Spell slots (by level)
 * - Ki points
 * - Sorcery points
 * - Rage uses
 * - Action surge
 * - Bardic inspiration
 * - Channel divinity
 * - Lay on hands
 *
 * @module components/battle-map/TokenResourceBars
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import type { CharacterResources, SpellSlotConfig, SpellSlotLevel } from '@/types/combat';

/**
 * Props for TokenResourceBars component
 */
export interface TokenResourceBarsProps {
  /** Character resources */
  resources?: CharacterResources;
  /** Spell slots by level */
  spellSlots?: Partial<Record<SpellSlotLevel, SpellSlotConfig>>;
  /** Which resources to display */
  visibleResources?: ResourceType[];
  /** Position offset below token */
  yOffset?: number;
  /** Camera zoom level for scaling/fading */
  zoomLevel?: number;
  /** Width of each resource bar in pixels */
  barWidth?: number;
  /** Height of each resource bar in pixels */
  barHeight?: number;
  /** Maximum number of bars to show */
  maxBars?: number;
  /** Whether token is selected (always show when selected) */
  isSelected?: boolean;
}

/**
 * Available resource types
 */
export type ResourceType =
  | 'spellSlots'
  | 'kiPoints'
  | 'sorceryPoints'
  | 'rages'
  | 'actionSurge'
  | 'bardic_inspiration'
  | 'channelDivinity'
  | 'layOnHands';

/**
 * Resource display configuration
 */
interface ResourceConfig {
  label: string;
  color: string;
  gradient: string;
  priority: number; // Lower = shown first
}

/**
 * Resource configurations with colors and display properties
 */
const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  spellSlots: {
    label: 'Spell Slots',
    color: '#8b5cf6', // purple-600
    gradient: 'linear-gradient(to right, #8b5cf6dd, #8b5cf6)',
    priority: 1,
  },
  kiPoints: {
    label: 'Ki',
    color: '#06b6d4', // cyan-500
    gradient: 'linear-gradient(to right, #06b6d4dd, #06b6d4)',
    priority: 2,
  },
  sorceryPoints: {
    label: 'Sorcery',
    color: '#ec4899', // pink-500
    gradient: 'linear-gradient(to right, #ec4899dd, #ec4899)',
    priority: 3,
  },
  rages: {
    label: 'Rage',
    color: '#ef4444', // red-500
    gradient: 'linear-gradient(to right, #ef4444dd, #ef4444)',
    priority: 4,
  },
  actionSurge: {
    label: 'Action Surge',
    color: '#f59e0b', // amber-500
    gradient: 'linear-gradient(to right, #f59e0bdd, #f59e0b)',
    priority: 5,
  },
  bardic_inspiration: {
    label: 'Bardic Insp.',
    color: '#10b981', // emerald-500
    gradient: 'linear-gradient(to right, #10b981dd, #10b981)',
    priority: 6,
  },
  channelDivinity: {
    label: 'Ch. Divinity',
    color: '#f97316', // orange-500
    gradient: 'linear-gradient(to right, #f97316dd, #f97316)',
    priority: 7,
  },
  layOnHands: {
    label: 'Lay on Hands',
    color: '#14b8a6', // teal-500
    gradient: 'linear-gradient(to right, #14b8a6dd, #14b8a6)',
    priority: 8,
  },
};

/**
 * Spell slot level colors
 */
const SPELL_SLOT_COLORS: Record<SpellSlotLevel, string> = {
  1: '#8b5cf6', // purple-600
  2: '#7c3aed', // violet-600
  3: '#6d28d9', // violet-700
  4: '#5b21b6', // violet-800
  5: '#4c1d95', // violet-900
  6: '#ec4899', // pink-500
  7: '#db2777', // pink-600
  8: '#be185d', // pink-700
  9: '#9f1239', // pink-800
};

/**
 * Single resource bar component
 */
interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  gradient: string;
  width: number;
  height: number;
  index: number;
}

function ResourceBar({ label, current, max, color, gradient, width, height, index }: ResourceBarProps) {
  const percentage = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: index * 0.05,
      }}
      className="flex items-center gap-1"
    >
      {/* Label */}
      <div
        className="text-xs font-bold whitespace-nowrap"
        style={{
          color: 'white',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          minWidth: '60px',
          fontSize: '9px',
        }}
      >
        {label}
      </div>

      {/* Bar Container */}
      <div
        className="relative rounded-sm overflow-hidden flex-1"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(60, 60, 60, 0.8)',
          }}
        />

        {/* Current Resource Bar */}
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={false}
          animate={{
            width: `${percentage * 100}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          style={{
            background: gradient,
          }}
        />

        {/* Shine effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Count Text */}
      <div
        className="text-xs font-bold whitespace-nowrap"
        style={{
          color: 'white',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          minWidth: '24px',
          fontSize: '9px',
        }}
      >
        {current}/{max}
      </div>
    </motion.div>
  );
}

/**
 * TokenResourceBars Component
 *
 * Displays a stack of resource bars below a token.
 * Automatically determines which resources to show based on availability.
 *
 * @example
 * ```tsx
 * <mesh position={[0, 0, 0]}>
 *   <TokenResourceBars
 *     resources={{
 *       kiPoints: { current: 5, max: 10 },
 *       rages: { current: 2, max: 3 }
 *     }}
 *     spellSlots={{
 *       1: { current: 2, max: 4 },
 *       2: { current: 1, max: 3 }
 *     }}
 *   />
 * </mesh>
 * ```
 */
export function TokenResourceBars({
  resources,
  spellSlots,
  visibleResources,
  yOffset = -0.7,
  zoomLevel = 1,
  barWidth = 80,
  barHeight = 6,
  maxBars = 4,
  isSelected = false,
}: TokenResourceBarsProps) {
  // Build list of available resources
  const availableResources = useMemo(() => {
    const result: Array<{
      type: ResourceType;
      label: string;
      current: number;
      max: number;
      config: ResourceConfig;
    }> = [];

    // Add spell slots (show highest available level)
    if (spellSlots) {
      const levels = Object.keys(spellSlots).map(Number) as SpellSlotLevel[];
      const highestLevel = Math.max(...levels);
      const slotConfig = spellSlots[highestLevel as SpellSlotLevel];

      if (slotConfig && slotConfig.max > 0) {
        result.push({
          type: 'spellSlots',
          label: `Lvl ${highestLevel}`,
          current: slotConfig.current,
          max: slotConfig.max,
          config: {
            ...RESOURCE_CONFIGS.spellSlots,
            color: SPELL_SLOT_COLORS[highestLevel as SpellSlotLevel],
            gradient: `linear-gradient(to right, ${SPELL_SLOT_COLORS[highestLevel as SpellSlotLevel]}dd, ${SPELL_SLOT_COLORS[highestLevel as SpellSlotLevel]})`,
          },
        });
      }
    }

    // Add other resources
    if (resources) {
      const resourceMap: Array<[ResourceType, { max: number; current: number } | undefined]> = [
        ['kiPoints', resources.kiPoints],
        ['sorceryPoints', resources.sorceryPoints],
        ['rages', resources.rages],
        ['actionSurge', resources.actionSurge],
        ['bardic_inspiration', resources.bardic_inspiration],
        ['channelDivinity', resources.channelDivinity],
        ['layOnHands', resources.layOnHands],
      ];

      resourceMap.forEach(([type, resource]) => {
        if (resource && resource.max > 0) {
          result.push({
            type,
            label: RESOURCE_CONFIGS[type].label,
            current: resource.current,
            max: resource.max,
            config: RESOURCE_CONFIGS[type],
          });
        }
      });
    }

    // Filter by visibleResources if specified
    const filtered = visibleResources
      ? result.filter((r) => visibleResources.includes(r.type))
      : result;

    // Sort by priority
    return filtered.sort((a, b) => a.config.priority - b.config.priority).slice(0, maxBars);
  }, [resources, spellSlots, visibleResources, maxBars]);

  // Calculate opacity based on zoom
  const opacity = useMemo(() => {
    if (isSelected) return 1;
    return Math.max(0, Math.min(1, zoomLevel * 1.2));
  }, [zoomLevel, isSelected]);

  // Don't render if no resources or completely faded
  if (availableResources.length === 0 || opacity === 0) return null;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={10}
      zIndexRange={[98, 0]}
      style={{
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <div
        className="flex flex-col gap-1 p-2 rounded-md"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          minWidth: `${barWidth + 100}px`,
        }}
      >
        {availableResources.map((resource, index) => (
          <ResourceBar
            key={`${resource.type}-${index}`}
            label={resource.label}
            current={resource.current}
            max={resource.max}
            color={resource.config.color}
            gradient={resource.config.gradient}
            width={barWidth}
            height={barHeight}
            index={index}
          />
        ))}
      </div>
    </Html>
  );
}

/**
 * Compact spell slots display (just dots for each slot)
 */
export function TokenSpellSlotsDots({
  spellSlots,
  level,
  yOffset = -0.5,
}: {
  spellSlots: Partial<Record<SpellSlotLevel, SpellSlotConfig>>;
  level: SpellSlotLevel;
  yOffset?: number;
}) {
  const slots = spellSlots[level];
  if (!slots || slots.max === 0) return null;

  const dotSize = 6;
  const color = SPELL_SLOT_COLORS[level];

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={10}
      zIndexRange={[98, 0]}
      style={{
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center gap-1">
        <span
          className="text-xs font-bold mr-1"
          style={{
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
            fontSize: '9px',
          }}
        >
          L{level}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: slots.max }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                backgroundColor: i < slots.current ? color : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: i < slots.current ? `0 0 4px ${color}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </Html>
  );
}
