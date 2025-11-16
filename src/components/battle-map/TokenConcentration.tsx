/**
 * TokenConcentration Component
 *
 * Displays a visual indicator when a spellcaster is maintaining concentration.
 * Shows a pulsing blue/purple aura with spell name on hover.
 *
 * @module components/battle-map/TokenConcentration
 */

import React from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Props for TokenConcentration component
 */
export interface TokenConcentrationProps {
  /** Name of the spell being concentrated on */
  spellName: string | null;
  /** Token radius for sizing the aura */
  tokenRadius?: number;
  /** Whether to show the spell name on hover */
  showSpellName?: boolean;
  /** Camera zoom level for scaling */
  zoomLevel?: number;
  /** Custom aura color (defaults to purple/blue) */
  auraColor?: string;
}

/**
 * TokenConcentration Component
 *
 * Renders a pulsing aura effect around tokens maintaining concentration.
 * Displays spell name tooltip on hover.
 *
 * @example
 * ```tsx
 * <mesh position={[0, 0, 0]}>
 *   <TokenConcentration
 *     spellName="Hold Person"
 *     tokenRadius={0.5}
 *   />
 * </mesh>
 * ```
 */
export function TokenConcentration({
  spellName,
  tokenRadius = 0.5,
  showSpellName = true,
  zoomLevel = 1,
  auraColor,
}: TokenConcentrationProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Don't render if not concentrating
  if (!spellName) return null;

  // Calculate sizes based on token radius and zoom
  const baseSize = tokenRadius * 100 * 2 * zoomLevel; // Convert to pixels (diameter)
  const auraSize = baseSize + 20; // Aura is slightly larger than token

  // Default gradient colors (purple to blue)
  const gradientColors = auraColor
    ? [auraColor, auraColor]
    : ['rgba(147, 51, 234, 0.4)', 'rgba(59, 130, 246, 0.4)']; // purple-600 to blue-500

  return (
    <>
      {/* 3D Glow Effect (rendered in 3D space) */}
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[tokenRadius * 1.3, 32]} />
        <meshBasicMaterial transparent opacity={0.3} color="#8b5cf6" />
      </mesh>

      {/* 2D HTML Overlay for animated effects */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={10}
        zIndexRange={[90, 0]}
        style={{
          pointerEvents: showSpellName ? 'auto' : 'none',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Pulsing Aura */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: `${auraSize}px`,
              height: `${auraSize}px`,
              background: `radial-gradient(circle, ${gradientColors[0]}, ${gradientColors[1]}, transparent)`,
              border: '2px solid rgba(139, 92, 246, 0.5)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Secondary Pulse Ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: `${auraSize + 10}px`,
              height: `${auraSize + 10}px`,
              border: '2px solid rgba(139, 92, 246, 0.3)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Concentration Icon Badge */}
          <motion.div
            className="absolute rounded-full bg-purple-600 flex items-center justify-center cursor-help"
            style={{
              width: '24px',
              height: '24px',
              top: `${-auraSize / 2 - 12}px`,
              border: '2px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
            }}
            whileHover={{ scale: 1.1 }}
            animate={{
              y: [0, -2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Sparkles size={14} color="white" strokeWidth={2.5} />
          </motion.div>

          {/* Spell Name Tooltip */}
          {showSpellName && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute pointer-events-none z-50"
              style={{
                bottom: `${auraSize / 2 + 20}px`,
              }}
            >
              <div
                className="px-3 py-2 rounded-md text-xs text-white whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(139, 92, 246, 0.5)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <div>
                    <div className="font-bold text-purple-300">Concentrating</div>
                    <div className="text-gray-300">{spellName}</div>
                  </div>
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Taking damage may break concentration
                </div>
              </div>
              {/* Tooltip Arrow */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  bottom: '-6px',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(0, 0, 0, 0.9)',
                }}
              />
            </motion.div>
          )}

          {/* Particle Effects */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-purple-400"
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i * Math.PI * 2) / 3) * (auraSize / 2)],
                y: [0, Math.sin((i * Math.PI * 2) / 3) * (auraSize / 2)],
                opacity: [0.8, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 0.6,
              }}
            />
          ))}
        </div>
      </Html>
    </>
  );
}

/**
 * Compact concentration indicator (just the badge, no aura)
 */
export function TokenConcentrationCompact({
  spellName,
  yOffset = 0.3,
}: {
  spellName: string | null;
  yOffset?: number;
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  if (!spellName) return null;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={10}
      zIndexRange={[95, 0]}
      style={{
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        className="rounded-full bg-purple-600 flex items-center justify-center cursor-help"
        style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        }}
        whileHover={{ scale: 1.15 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          boxShadow: [
            '0 2px 6px rgba(139, 92, 246, 0.4)',
            '0 2px 10px rgba(139, 92, 246, 0.8)',
            '0 2px 6px rgba(139, 92, 246, 0.4)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles size={12} color="white" strokeWidth={2.5} />
      </motion.div>

      {/* Tooltip */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 whitespace-nowrap"
        >
          <div
            className="px-2 py-1 rounded text-xs text-white"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
            }}
          >
            <span className="text-purple-300">⚡</span> {spellName}
          </div>
        </motion.div>
      )}
    </Html>
  );
}
