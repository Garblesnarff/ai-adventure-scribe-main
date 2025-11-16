/**
 * TokenDeathState Component
 *
 * Displays visual indicators for tokens in death-related states:
 * - Prone indicator
 * - Unconscious state (darkened with X or skull)
 * - Dead state (faded to gray)
 * - Death saving throw markers
 *
 * @module components/battle-map/TokenDeathState
 */

import React from 'react';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, X, Circle } from 'lucide-react';
import type { DeathSaves } from '@/types/combat';

/**
 * Props for TokenDeathState component
 */
export interface TokenDeathStateProps {
  /** Current hit points (0 or less = unconscious/dead) */
  currentHp: number;
  /** Death saving throws */
  deathSaves?: DeathSaves;
  /** Whether token is prone */
  isProne?: boolean;
  /** Token radius for sizing effects */
  tokenRadius?: number;
  /** Camera zoom level for scaling */
  zoomLevel?: number;
  /** Whether to show death save markers */
  showDeathSaves?: boolean;
}

/**
 * Death Save Dots Component
 * Shows success and failure markers for death saving throws
 */
interface DeathSaveDotsProps {
  successes: number;
  failures: number;
  tokenRadius: number;
}

function DeathSaveDots({ successes, failures, tokenRadius }: DeathSaveDotsProps) {
  const dotSize = 8;
  const spacing = 12;

  return (
    <div className="flex flex-col gap-2">
      {/* Successes */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-green-400 mr-1">✓</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`success-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full"
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                backgroundColor: i < successes ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Failures */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-red-400 mr-1">✗</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`failure-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full"
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                backgroundColor: i < failures ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * TokenDeathState Component
 *
 * Renders visual overlays for death-related token states.
 * Applies different effects based on whether the token is prone, unconscious, or dead.
 *
 * @example
 * ```tsx
 * <mesh position={[0, 0, 0]}>
 *   <TokenDeathState
 *     currentHp={0}
 *     deathSaves={{ successes: 1, failures: 2 }}
 *     isProne={true}
 *     tokenRadius={0.5}
 *   />
 * </mesh>
 * ```
 */
export function TokenDeathState({
  currentHp,
  deathSaves,
  isProne = false,
  tokenRadius = 0.5,
  zoomLevel = 1,
  showDeathSaves = true,
}: TokenDeathStateProps) {
  const isUnconscious = currentHp <= 0 && (deathSaves?.failures ?? 0) < 3;
  const isDead =
    currentHp <= 0 && ((deathSaves?.failures ?? 0) >= 3 || (deathSaves?.isStable === false && currentHp < 0));

  const tokenSize = tokenRadius * 100 * 2 * zoomLevel; // Convert to pixels (diameter)

  return (
    <>
      {/* 3D Effects */}
      {isDead && (
        // Gray overlay for dead tokens
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[tokenRadius, 32]} />
          <meshBasicMaterial transparent opacity={0.7} color="#374151" />
        </mesh>
      )}

      {isUnconscious && !isDead && (
        // Dark overlay for unconscious tokens
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[tokenRadius, 32]} />
          <meshBasicMaterial transparent opacity={0.5} color="#1f2937" />
        </mesh>
      )}

      {/* 2D HTML Overlays */}
      <Html
        position={[0, 0, 0.03]}
        center
        distanceFactor={10}
        zIndexRange={[105, 0]}
        style={{
          pointerEvents: 'none',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: `${tokenSize}px`,
            height: `${tokenSize}px`,
          }}
        >
          {/* Prone Indicator - Rotated Token Visual */}
          {isProne && !isDead && (
            <motion.div
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 90, opacity: 1 }}
              exit={{ rotate: 0, opacity: 0 }}
              className="absolute"
              style={{
                width: `${tokenSize * 0.4}px`,
                height: `${tokenSize * 0.4}px`,
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(14, 165, 233, 0.8)', // sky-500
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                }}
              >
                <span className="text-white font-bold text-xs rotate-[-90deg]">PRONE</span>
              </div>
            </motion.div>
          )}

          {/* Unconscious Indicator - X or Skull */}
          {isUnconscious && !isDead && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute"
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: `${tokenSize * 0.6}px`,
                  height: `${tokenSize * 0.6}px`,
                  backgroundColor: 'rgba(31, 41, 55, 0.9)', // gray-800
                  border: '3px solid #ef4444', // red-500
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
                }}
              >
                <X size={tokenSize * 0.4} color="white" strokeWidth={3} />
              </div>
            </motion.div>
          )}

          {/* Dead Indicator - Skull */}
          {isDead && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute"
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: `${tokenSize * 0.7}px`,
                  height: `${tokenSize * 0.7}px`,
                  backgroundColor: 'rgba(17, 24, 39, 0.95)', // gray-900
                  border: '3px solid #7f1d1d', // red-900
                  boxShadow: '0 0 16px rgba(127, 29, 29, 0.8)',
                }}
              >
                <Skull size={tokenSize * 0.5} color="#dc2626" strokeWidth={2} />
              </div>
            </motion.div>
          )}

          {/* Death Save Markers */}
          {showDeathSaves && isUnconscious && !isDead && deathSaves && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute"
              style={{
                top: `${tokenSize / 2 + 20}px`,
              }}
            >
              <div
                className="px-3 py-2 rounded-md"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="text-xs font-bold text-white mb-2 text-center">Death Saves</div>
                <DeathSaveDots
                  successes={deathSaves.successes}
                  failures={deathSaves.failures}
                  tokenRadius={tokenRadius}
                />
                {deathSaves.isStable && (
                  <div className="text-xs text-green-400 mt-2 text-center">Stable</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Pulsing Red Border for Critical State (2 failures) */}
          {isUnconscious && !isDead && (deathSaves?.failures ?? 0) === 2 && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: `${tokenSize + 10}px`,
                height: `${tokenSize + 10}px`,
                border: '3px solid #ef4444',
              }}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>
      </Html>
    </>
  );
}

/**
 * Minimal prone indicator (just an icon)
 */
export function TokenProneIndicator({ tokenRadius = 0.5 }: { tokenRadius?: number }) {
  return (
    <Html
      position={[0, tokenRadius * 0.7, 0.03]}
      center
      distanceFactor={10}
      zIndexRange={[105, 0]}
      style={{
        pointerEvents: 'none',
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: 90 }}
        exit={{ scale: 0, rotate: 0 }}
        className="px-2 py-1 rounded bg-sky-500 text-white text-xs font-bold"
        style={{
          border: '1px solid white',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
        }}
      >
        PRONE
      </motion.div>
    </Html>
  );
}

/**
 * Death state text overlay (for dead tokens)
 */
export function TokenDeadOverlay() {
  return (
    <Html
      position={[0, -0.3, 0.03]}
      center
      distanceFactor={10}
      zIndexRange={[105, 0]}
      style={{
        pointerEvents: 'none',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-3 py-1 rounded-md bg-red-900/90 text-white text-xs font-bold"
        style={{
          border: '2px solid #7f1d1d',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.6)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
        }}
      >
        DEAD
      </motion.div>
    </Html>
  );
}
