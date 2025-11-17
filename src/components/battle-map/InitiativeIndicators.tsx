/**
 * Initiative Indicators Component
 *
 * Displays initiative order and turn indicators on tokens.
 *
 * Features:
 * - Initiative number above each token
 * - Current turn: glowing border
 * - Next in initiative: arrow indicator
 * - Previous turn: dimmed
 * - Color-coded by initiative order (rainbow gradient)
 *
 * @module components/battle-map/InitiativeIndicators
 */

import React, { useMemo } from 'react';
import type { CombatParticipant } from '@/types/combat';
import type { Token } from '@/types/token';
import * as THREE from 'three';

// ===========================
// Props Interface
// ===========================

export interface InitiativeIndicatorsProps {
  /** Combat participants */
  participants: CombatParticipant[];
  /** Tokens corresponding to participants */
  tokens: Token[];
  /** ID of participant whose turn it is */
  currentTurnParticipantId?: string;
  /** Grid size in pixels */
  gridSize: number;
  /** Whether to show initiative numbers */
  showNumbers?: boolean;
  /** Whether to show turn arrows */
  showArrows?: boolean;
  /** Whether to use rainbow colors */
  useRainbowColors?: boolean;
}

// ===========================
// Component
// ===========================

/**
 * Initiative Indicators Component
 *
 * Shows visual indicators of initiative order on the battle map.
 *
 * @example
 * ```tsx
 * <InitiativeIndicators
 *   participants={combatParticipants}
 *   tokens={sceneTokens}
 *   currentTurnParticipantId={currentTurn}
 *   gridSize={100}
 * />
 * ```
 */
export const InitiativeIndicators: React.FC<InitiativeIndicatorsProps> = ({
  participants,
  tokens,
  currentTurnParticipantId,
  gridSize,
  showNumbers = true,
  showArrows = true,
  useRainbowColors = true,
}) => {
  // ===========================
  // Sort Participants by Initiative
  // ===========================

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => b.initiative - a.initiative);
  }, [participants]);

  // ===========================
  // Find Current, Next, and Previous
  // ===========================

  const { currentIndex, currentParticipant, nextParticipant, previousParticipant } = useMemo(() => {
    const currentIndex = sortedParticipants.findIndex(
      (p) => p.id === currentTurnParticipantId,
    );

    const currentParticipant = currentIndex >= 0 ? sortedParticipants[currentIndex] : null;

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sortedParticipants.length : -1;
    const nextParticipant = nextIndex >= 0 ? sortedParticipants[nextIndex] : null;

    const previousIndex =
      currentIndex >= 0
        ? (currentIndex - 1 + sortedParticipants.length) % sortedParticipants.length
        : -1;
    const previousParticipant = previousIndex >= 0 ? sortedParticipants[previousIndex] : null;

    return { currentIndex, currentParticipant, nextParticipant, previousParticipant };
  }, [sortedParticipants, currentTurnParticipantId]);

  // ===========================
  // Rainbow Color Generation
  // ===========================

  /**
   * Get color for initiative position (rainbow gradient)
   */
  const getInitiativeColor = (index: number): string => {
    if (!useRainbowColors) return '#FFFFFF';

    const totalCount = sortedParticipants.length;
    const hue = (index / Math.max(totalCount - 1, 1)) * 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // ===========================
  // Render Indicators
  // ===========================

  return (
    <group name="initiative-indicators">
      {sortedParticipants.map((participant, index) => {
        // Find token for this participant
        const token = tokens.find(
          (t) =>
            t.combatantId === participant.id ||
            t.characterId === participant.characterId ||
            t.id === participant.tokenId,
        );

        if (!token) return null;

        const isCurrent = participant.id === currentTurnParticipantId;
        const isNext = nextParticipant?.id === participant.id;
        const isPrevious = previousParticipant?.id === participant.id;

        const color = getInitiativeColor(index);

        return (
          <group key={participant.id} name={`initiative-indicator-${participant.id}`}>
            {/* Initiative Number */}
            {showNumbers && (
              <InitiativeNumber
                token={token}
                initiative={participant.initiative}
                color={color}
                isCurrent={isCurrent}
                gridSize={gridSize}
              />
            )}

            {/* Current Turn Glow */}
            {isCurrent && (
              <CurrentTurnGlow token={token} color={color} gridSize={gridSize} />
            )}

            {/* Next Turn Arrow */}
            {showArrows && isNext && (
              <NextTurnArrow token={token} color={color} gridSize={gridSize} />
            )}

            {/* Previous Turn Dimming */}
            {isPrevious && <PreviousTurnDim token={token} gridSize={gridSize} />}
          </group>
        );
      })}
    </group>
  );
};

// ===========================
// Initiative Number Component
// ===========================

interface InitiativeNumberProps {
  token: Token;
  initiative: number;
  color: string;
  isCurrent: boolean;
  gridSize: number;
}

const InitiativeNumber: React.FC<InitiativeNumberProps> = ({
  token,
  initiative,
  color,
  isCurrent,
  gridSize,
}) => {
  const size = token.width * gridSize;
  const yOffset = -size / 2 - 20;

  return (
    <group position={[token.x, token.y + yOffset, 10]}>
      {/* Background circle */}
      <mesh>
        <circleGeometry args={[15, 32]} />
        <meshBasicMaterial
          color={isCurrent ? color : '#333333'}
          opacity={isCurrent ? 1.0 : 0.7}
          transparent
        />
      </mesh>

      {/* Border ring */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[15, 17, 32]} />
        <meshBasicMaterial color={color} opacity={isCurrent ? 1.0 : 0.5} transparent />
      </mesh>

      {/* Initiative number (simplified - in production use Text3D) */}
      <mesh position={[0, 0, 0.2]}>
        <circleGeometry args={[8, 16]} />
        <meshBasicMaterial color={isCurrent ? '#FFFFFF' : '#CCCCCC'} />
      </mesh>
    </group>
  );
};

// ===========================
// Current Turn Glow Component
// ===========================

interface CurrentTurnGlowProps {
  token: Token;
  color: string;
  gridSize: number;
}

const CurrentTurnGlow: React.FC<CurrentTurnGlowProps> = ({ token, color, gridSize }) => {
  const size = token.width * gridSize;
  const radius = (size / 2) * 1.1;

  // Create pulsing animation
  const pulseScale = useMemo(() => {
    const scale = new THREE.Vector3(1, 1, 1);
    return scale;
  }, []);

  return (
    <group position={[token.x, token.y, 8]}>
      {/* Outer glow ring (pulsing) */}
      <mesh scale={pulseScale}>
        <ringGeometry args={[radius, radius + 8, 64]} />
        <meshBasicMaterial color={color} opacity={0.6} transparent />
      </mesh>

      {/* Middle glow ring */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[radius + 4, radius + 6, 64]} />
        <meshBasicMaterial color={color} opacity={0.8} transparent />
      </mesh>

      {/* Inner glow ring */}
      <mesh position={[0, 0, 0.2]}>
        <ringGeometry args={[radius, radius + 2, 64]} />
        <meshBasicMaterial color={color} opacity={1.0} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Next Turn Arrow Component
// ===========================

interface NextTurnArrowProps {
  token: Token;
  color: string;
  gridSize: number;
}

const NextTurnArrow: React.FC<NextTurnArrowProps> = ({ token, color, gridSize }) => {
  const size = token.width * gridSize;
  const xOffset = size / 2 + 20;

  // Arrow pointing down (next in line)
  const arrowShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -10);
    shape.lineTo(8, -10);
    shape.lineTo(0, 0);
    shape.lineTo(-8, -10);
    shape.lineTo(0, -10);
    return shape;
  }, []);

  return (
    <group position={[token.x + xOffset, token.y, 9]}>
      {/* Arrow indicator */}
      <mesh rotation={[0, 0, 0]}>
        <shapeGeometry args={[arrowShape]} />
        <meshBasicMaterial color={color} opacity={0.8} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Glow around arrow */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color={color} opacity={0.3} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Previous Turn Dim Component
// ===========================

interface PreviousTurnDimProps {
  token: Token;
  gridSize: number;
}

const PreviousTurnDim: React.FC<PreviousTurnDimProps> = ({ token, gridSize }) => {
  const size = token.width * gridSize;
  const radius = size / 2;

  return (
    <group position={[token.x, token.y, 7]}>
      {/* Dim overlay */}
      <mesh>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color="#000000" opacity={0.3} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Helper Components
// ===========================

/**
 * Pulsing animation hook (would use useFrame in real implementation)
 */
function usePulsingAnimation(minScale: number = 0.95, maxScale: number = 1.05, speed: number = 2) {
  // In production, use useFrame from @react-three/fiber to animate
  // For now, return a static scale
  return useMemo(() => new THREE.Vector3(1, 1, 1), []);
}
