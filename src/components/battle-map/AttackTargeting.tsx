/**
 * Attack Targeting Component
 *
 * Handles attack targeting and range visualization on the battle map.
 *
 * Features:
 * - Click token to target
 * - Show attack range from attacker
 * - Highlight valid targets (in range)
 * - Dim invalid targets (out of range)
 * - Attack roll trigger
 * - Damage visualization
 *
 * @module components/battle-map/AttackTargeting
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { CombatParticipant } from '@/types/combat';
import type { Token } from '@/types/token';
import { gridDistance, pixelToGrid } from '@/utils/movement-validation';
import * as THREE from 'three';
import logger from '@/lib/logger';

// ===========================
// Props Interface
// ===========================

export interface AttackTargetingProps {
  /** Attacker token */
  attackerToken: Token;
  /** Attacker participant */
  attackerParticipant: CombatParticipant;
  /** Target token (optional) */
  targetToken?: Token;
  /** Target participant (optional) */
  targetParticipant?: CombatParticipant;
  /** All tokens on the scene */
  allTokens: Token[];
  /** All combat participants */
  allParticipants: CombatParticipant[];
  /** Grid size in pixels */
  gridSize: number;
  /** Attack range in feet (default: weapon reach or 5ft) */
  attackRange?: number;
  /** Whether to show range circle */
  showRangeCircle?: boolean;
  /** Whether to show attack line */
  showAttackLine?: boolean;
  /** Callback when a target is clicked */
  onTargetClick?: (token: Token) => void;
  /** Callback when attack is triggered */
  onAttack?: (targetToken: Token) => void;
}

// ===========================
// Types
// ===========================

interface DamageFloater {
  id: string;
  token: Token;
  damage: number;
  type: 'damage' | 'heal' | 'miss' | 'critical';
  timestamp: number;
}

// ===========================
// Component
// ===========================

/**
 * Attack Targeting Component
 *
 * Visualizes attack ranges and handles targeting for combat.
 *
 * @example
 * ```tsx
 * <AttackTargeting
 *   attackerToken={currentToken}
 *   attackerParticipant={currentParticipant}
 *   allTokens={sceneTokens}
 *   allParticipants={combatParticipants}
 *   gridSize={100}
 *   onAttack={handleAttack}
 * />
 * ```
 */
export const AttackTargeting: React.FC<AttackTargetingProps> = ({
  attackerToken,
  attackerParticipant,
  targetToken,
  targetParticipant,
  allTokens,
  allParticipants,
  gridSize,
  attackRange,
  showRangeCircle = true,
  showAttackLine = true,
  onTargetClick,
  onAttack,
}) => {
  const [damageFloaters, setDamageFloaters] = useState<DamageFloater[]>([]);

  // ===========================
  // Calculate Attack Range
  // ===========================

  const effectiveAttackRange = useMemo(() => {
    if (attackRange) return attackRange;

    // Determine range from weapon
    const weapon = attackerParticipant.mainHandWeapon;

    if (weapon?.properties?.range) {
      return weapon.properties.range.normal;
    }

    // Default melee reach
    if (weapon?.properties?.reach) {
      return 10; // Reach weapons have 10ft reach
    }

    return 5; // Standard melee reach
  }, [attackRange, attackerParticipant]);

  // ===========================
  // Determine Valid Targets
  // ===========================

  const targetInfo = useMemo(() => {
    return allTokens.map((token) => {
      // Find participant for this token
      const participant = allParticipants.find(
        (p) =>
          p.id === token.combatantId ||
          p.characterId === token.characterId ||
          p.tokenId === token.id,
      );

      if (!participant) {
        return { token, participant: null, inRange: false, distance: Infinity };
      }

      // Skip self
      if (token.id === attackerToken.id) {
        return { token, participant, inRange: false, distance: 0 };
      }

      // Calculate distance
      const attackerGrid = pixelToGrid(attackerToken.x, attackerToken.y, gridSize);
      const targetGrid = pixelToGrid(token.x, token.y, gridSize);
      const distance = gridDistance(attackerGrid, targetGrid);

      // Check if in range
      const inRange = distance <= effectiveAttackRange;

      return { token, participant, inRange, distance };
    });
  }, [
    allTokens,
    allParticipants,
    attackerToken,
    gridSize,
    effectiveAttackRange,
  ]);

  const validTargets = useMemo(() => {
    return targetInfo.filter((info) => info.inRange && info.participant);
  }, [targetInfo]);

  const invalidTargets = useMemo(() => {
    return targetInfo.filter((info) => !info.inRange && info.participant);
  }, [targetInfo]);

  // ===========================
  // Event Handlers
  // ===========================

  const handleTokenClick = useCallback(
    (token: Token) => {
      if (onTargetClick) {
        onTargetClick(token);
      }
    },
    [onTargetClick],
  );

  const handleAttackClick = useCallback(() => {
    if (targetToken && onAttack) {
      onAttack(targetToken);
    }
  }, [targetToken, onAttack]);

  // ===========================
  // Damage Floater Management
  // ===========================

  const addDamageFloater = useCallback(
    (
      token: Token,
      damage: number,
      type: 'damage' | 'heal' | 'miss' | 'critical',
    ) => {
      const floater: DamageFloater = {
        id: `${token.id}-${Date.now()}`,
        token,
        damage,
        type,
        timestamp: Date.now(),
      };

      setDamageFloaters((prev) => [...prev, floater]);

      // Remove after 2 seconds
      setTimeout(() => {
        setDamageFloaters((prev) => prev.filter((f) => f.id !== floater.id));
      }, 2000);
    },
    [],
  );

  // ===========================
  // Render
  // ===========================

  return (
    <group name="attack-targeting">
      {/* Range Circle */}
      {showRangeCircle && (
        <RangeCircle
          token={attackerToken}
          range={effectiveAttackRange}
          gridSize={gridSize}
        />
      )}

      {/* Valid Target Highlights */}
      {validTargets.map((info) => (
        <TargetHighlight
          key={info.token.id}
          token={info.token}
          type="valid"
          gridSize={gridSize}
          onClick={() => handleTokenClick(info.token)}
        />
      ))}

      {/* Invalid Target Highlights */}
      {invalidTargets.map((info) => (
        <TargetHighlight
          key={info.token.id}
          token={info.token}
          type="invalid"
          gridSize={gridSize}
        />
      ))}

      {/* Attack Line */}
      {showAttackLine && targetToken && (
        <AttackLine
          from={attackerToken}
          to={targetToken}
          isValid={validTargets.some((info) => info.token.id === targetToken.id)}
        />
      )}

      {/* Selected Target Indicator */}
      {targetToken && (
        <TargetIndicator
          token={targetToken}
          gridSize={gridSize}
          onAttackClick={handleAttackClick}
        />
      )}

      {/* Damage Floaters */}
      {damageFloaters.map((floater) => (
        <DamageFloater
          key={floater.id}
          floater={floater}
          gridSize={gridSize}
        />
      ))}
    </group>
  );
};

// ===========================
// Range Circle Component
// ===========================

interface RangeCircleProps {
  token: Token;
  range: number;
  gridSize: number;
}

const RangeCircle: React.FC<RangeCircleProps> = ({ token, range, gridSize }) => {
  // Convert range in feet to pixels (5ft per grid square)
  const rangeInSquares = range / 5;
  const rangeInPixels = rangeInSquares * gridSize;

  return (
    <group position={[token.x, token.y, 4]}>
      {/* Range circle */}
      <mesh>
        <ringGeometry args={[rangeInPixels - 2, rangeInPixels + 2, 64]} />
        <meshBasicMaterial color="#FF8800" opacity={0.5} transparent />
      </mesh>

      {/* Inner fill (semi-transparent) */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[rangeInPixels, 64]} />
        <meshBasicMaterial color="#FF8800" opacity={0.15} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Target Highlight Component
// ===========================

interface TargetHighlightProps {
  token: Token;
  type: 'valid' | 'invalid';
  gridSize: number;
  onClick?: () => void;
}

const TargetHighlight: React.FC<TargetHighlightProps> = ({
  token,
  type,
  gridSize,
  onClick,
}) => {
  const size = token.width * gridSize;
  const radius = (size / 2) * 1.1;

  const color = type === 'valid' ? '#00FF00' : '#666666';
  const opacity = type === 'valid' ? 0.6 : 0.3;

  return (
    <group position={[token.x, token.y, 5]}>
      {/* Highlight ring */}
      <mesh onClick={onClick}>
        <ringGeometry args={[radius - 3, radius + 3, 32]} />
        <meshBasicMaterial color={color} opacity={opacity} transparent />
      </mesh>

      {/* Interaction mesh (for clicking) */}
      {onClick && (
        <mesh onClick={onClick}>
          <circleGeometry args={[radius, 32]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  );
};

// ===========================
// Attack Line Component
// ===========================

interface AttackLineProps {
  from: Token;
  to: Token;
  isValid: boolean;
}

const AttackLine: React.FC<AttackLineProps> = ({ from, to, isValid }) => {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(from.x, from.y, 6),
      new THREE.Vector3(to.x, to.y, 6),
    ];
  }, [from, to]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const color = isValid ? '#00FF00' : '#FF0000';

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial
        attach="material"
        color={color}
        linewidth={3}
        opacity={0.7}
        transparent
      />
    </line>
  );
};

// ===========================
// Target Indicator Component
// ===========================

interface TargetIndicatorProps {
  token: Token;
  gridSize: number;
  onAttackClick?: () => void;
}

const TargetIndicator: React.FC<TargetIndicatorProps> = ({
  token,
  gridSize,
  onAttackClick,
}) => {
  const size = token.width * gridSize;
  const radius = (size / 2) * 1.2;

  // Crosshair lines
  const crosshairGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Horizontal line
    points.push(new THREE.Vector3(-radius, 0, 0));
    points.push(new THREE.Vector3(radius, 0, 0));

    // Vertical line
    points.push(new THREE.Vector3(0, -radius, 0));
    points.push(new THREE.Vector3(0, radius, 0));

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <group position={[token.x, token.y, 9]}>
      {/* Target circle */}
      <mesh>
        <ringGeometry args={[radius - 3, radius + 3, 32]} />
        <meshBasicMaterial color="#FF0000" opacity={0.8} transparent />
      </mesh>

      {/* Crosshair */}
      <lineSegments>
        <bufferGeometry attach="geometry" {...crosshairGeometry} />
        <lineBasicMaterial attach="material" color="#FF0000" linewidth={2} />
      </lineSegments>

      {/* Attack button (simplified) */}
      {onAttackClick && (
        <mesh position={[0, radius + 15, 0]} onClick={onAttackClick}>
          <circleGeometry args={[10, 32]} />
          <meshBasicMaterial color="#FF0000" opacity={0.8} transparent />
        </mesh>
      )}
    </group>
  );
};

// ===========================
// Damage Floater Component
// ===========================

interface DamageFloaterProps {
  floater: DamageFloater;
  gridSize: number;
}

const DamageFloater: React.FC<DamageFloaterProps> = ({ floater, gridSize }) => {
  const { token, damage, type } = floater;

  // Calculate animation offset
  const elapsed = Date.now() - floater.timestamp;
  const progress = Math.min(elapsed / 2000, 1); // 2 second animation

  const yOffset = progress * 50; // Rise up
  const opacity = 1 - progress; // Fade out

  // Color based on type
  const color = useMemo(() => {
    switch (type) {
      case 'damage':
        return '#FF0000';
      case 'heal':
        return '#00FF00';
      case 'miss':
        return '#FFFF00';
      case 'critical':
        return '#FF00FF';
    }
  }, [type]);

  // Text to display
  const text = useMemo(() => {
    switch (type) {
      case 'damage':
        return `-${damage}`;
      case 'heal':
        return `+${damage}`;
      case 'miss':
        return 'MISS';
      case 'critical':
        return `CRITICAL! ${damage}`;
    }
  }, [type, damage]);

  const scale = type === 'critical' ? 1.5 : 1.0;

  return (
    <group position={[token.x, token.y - yOffset, 15]}>
      {/* Background */}
      <mesh>
        <planeGeometry args={[60 * scale, 20 * scale]} />
        <meshBasicMaterial color="#000000" opacity={opacity * 0.7} transparent />
      </mesh>

      {/* Text (simplified - in production use Text3D or sprite) */}
      <mesh position={[0, 0, 0.1]} scale={[scale, scale, 1]}>
        <planeGeometry args={[50, 12]} />
        <meshBasicMaterial color={color} opacity={opacity} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Helper Functions
// ===========================

/**
 * Calculate if target has cover from attacker
 */
export function hasTargetCover(
  attacker: Token,
  target: Token,
  obstacles: Token[],
): 'none' | 'half' | 'three-quarters' | 'total' {
  // Simplified - in production, implement line of sight checking
  return 'none';
}

/**
 * Calculate attack modifier based on range
 */
export function getRangeAttackModifier(
  distance: number,
  normalRange: number,
  longRange?: number,
): 'normal' | 'disadvantage' | 'out-of-range' {
  if (distance <= normalRange) {
    return 'normal';
  } else if (longRange && distance <= longRange) {
    return 'disadvantage';
  } else {
    return 'out-of-range';
  }
}
