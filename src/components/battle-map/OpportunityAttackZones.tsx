/**
 * Opportunity Attack Zones Component
 *
 * Visualizes threatened areas and handles opportunity attacks.
 *
 * Features:
 * - Show threatened areas (enemy reach)
 * - Detect when token leaves threatened area
 * - Prompt for opportunity attack
 * - Animate attack
 *
 * @module components/battle-map/OpportunityAttackZones
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { CombatParticipant, ReactionOpportunity } from '@/types/combat';
import type { Token } from '@/types/token';
import { gridDistance, pixelToGrid, type GridCoordinate } from '@/utils/movement-validation';
import { useCombatStore } from '@/stores/useCombatStore';
import * as THREE from 'three';
import logger from '@/lib/logger';

// ===========================
// Props Interface
// ===========================

export interface OpportunityAttackZonesProps {
  /** Current token being moved */
  currentToken: Token;
  /** Current participant */
  currentParticipant: CombatParticipant;
  /** Enemy tokens on the scene */
  enemyTokens: Token[];
  /** Enemy participants */
  enemyParticipants: CombatParticipant[];
  /** Grid size in pixels */
  gridSize: number;
  /** Whether to show threatened zones */
  showThreatenedZones?: boolean;
  /** Whether to auto-prompt for opportunity attacks */
  autoPromptOA?: boolean;
  /** Callback when opportunity attack is triggered */
  onOpportunityAttack?: (attackerId: string, targetId: string) => void;
}

// ===========================
// Types
// ===========================

interface ThreatenedZone {
  enemyToken: Token;
  enemyParticipant: CombatParticipant;
  reach: number;
  isCurrentlyThreatened: boolean;
}

// ===========================
// Component
// ===========================

/**
 * Opportunity Attack Zones Component
 *
 * Shows threatened areas and manages opportunity attack triggers.
 *
 * @example
 * ```tsx
 * <OpportunityAttackZones
 *   currentToken={movingToken}
 *   currentParticipant={movingParticipant}
 *   enemyTokens={enemies}
 *   enemyParticipants={enemyParticipants}
 *   gridSize={100}
 * />
 * ```
 */
export const OpportunityAttackZones: React.FC<OpportunityAttackZonesProps> = ({
  currentToken,
  currentParticipant,
  enemyTokens,
  enemyParticipants,
  gridSize,
  showThreatenedZones = true,
  autoPromptOA = true,
  onOpportunityAttack,
}) => {
  const [triggeredOAs, setTriggeredOAs] = useState<Set<string>>(new Set());
  const [previousPosition, setPreviousPosition] = useState<GridCoordinate | null>(null);

  const addReactionOpportunity = useCombatStore((state) => state.addReactionOpportunity);

  // ===========================
  // Calculate Threatened Zones
  // ===========================

  const threatenedZones = useMemo<ThreatenedZone[]>(() => {
    return enemyTokens.map((enemyToken, index) => {
      const enemyParticipant = enemyParticipants[index];

      // Determine enemy reach
      const weapon = enemyParticipant?.mainHandWeapon;
      const reach = weapon?.properties?.reach ? 10 : 5; // Reach weapons = 10ft, normal = 5ft

      // Calculate distance to current token
      const currentGrid = pixelToGrid(currentToken.x, currentToken.y, gridSize);
      const enemyGrid = pixelToGrid(enemyToken.x, enemyToken.y, gridSize);
      const distance = gridDistance(currentGrid, enemyGrid);

      // Check if currently threatened
      const isCurrentlyThreatened = distance <= reach;

      return {
        enemyToken,
        enemyParticipant,
        reach,
        isCurrentlyThreatened,
      };
    });
  }, [currentToken, enemyTokens, enemyParticipants, gridSize]);

  // ===========================
  // Detect Leaving Threatened Area
  // ===========================

  useEffect(() => {
    if (!autoPromptOA || !previousPosition) return;

    const currentGrid = pixelToGrid(currentToken.x, currentToken.y, gridSize);

    // Check if we left any threatened zones
    threatenedZones.forEach((zone) => {
      const { enemyToken, enemyParticipant, reach, isCurrentlyThreatened } = zone;

      // Skip if enemy has already taken reaction
      if (enemyParticipant.reactionTaken) return;

      // Skip if already triggered OA for this enemy this turn
      const oaKey = `${enemyParticipant.id}-${currentParticipant.id}`;
      if (triggeredOAs.has(oaKey)) return;

      // Calculate previous distance
      const enemyGrid = pixelToGrid(enemyToken.x, enemyToken.y, gridSize);
      const previousDistance = gridDistance(previousPosition, enemyGrid);
      const wasThreatened = previousDistance <= reach;

      // Check if left threatened area
      if (wasThreatened && !isCurrentlyThreatened) {
        // Trigger opportunity attack!
        handleOpportunityAttackTrigger(zone);
        setTriggeredOAs((prev) => new Set(prev).add(oaKey));
      }
    });

    // Update previous position
    setPreviousPosition(currentGrid);
  }, [
    currentToken,
    previousPosition,
    threatenedZones,
    autoPromptOA,
    gridSize,
    triggeredOAs,
    currentParticipant.id,
  ]);

  // ===========================
  // Opportunity Attack Handler
  // ===========================

  const handleOpportunityAttackTrigger = useCallback(
    (zone: ThreatenedZone) => {
      const { enemyParticipant } = zone;

      logger.info('Opportunity attack triggered', {
        attackerId: enemyParticipant.id,
        attackerName: enemyParticipant.name,
        targetId: currentParticipant.id,
        targetName: currentParticipant.name,
      });

      // Create reaction opportunity
      const opportunity: ReactionOpportunity = {
        id: `oa-${enemyParticipant.id}-${Date.now()}`,
        participantId: enemyParticipant.id,
        trigger: 'creature_leaves_reach',
        triggerDescription: `${currentParticipant.name} left your reach`,
        availableReactions: ['opportunity_attack'],
        triggeredBy: currentParticipant.id,
        expiresAtEndOfTurn: false,
      };

      // Add to combat store
      addReactionOpportunity(opportunity);

      // Callback if provided
      if (onOpportunityAttack) {
        onOpportunityAttack(enemyParticipant.id, currentParticipant.id);
      }
    },
    [currentParticipant, addReactionOpportunity, onOpportunityAttack],
  );

  // ===========================
  // Reset on Turn Change
  // ===========================

  useEffect(() => {
    // Reset triggered OAs when participant changes
    setTriggeredOAs(new Set());
    setPreviousPosition(pixelToGrid(currentToken.x, currentToken.y, gridSize));
  }, [currentParticipant.id, currentToken.x, currentToken.y, gridSize]);

  // ===========================
  // Render
  // ===========================

  return (
    <group name="opportunity-attack-zones">
      {showThreatenedZones &&
        threatenedZones.map((zone, index) => (
          <ThreatenedZone
            key={zone.enemyToken.id}
            zone={zone}
            gridSize={gridSize}
            isTriggered={triggeredOAs.has(
              `${zone.enemyParticipant.id}-${currentParticipant.id}`,
            )}
          />
        ))}
    </group>
  );
};

// ===========================
// Threatened Zone Component
// ===========================

interface ThreatenedZoneComponentProps {
  zone: ThreatenedZone;
  gridSize: number;
  isTriggered: boolean;
}

const ThreatenedZone: React.FC<ThreatenedZoneComponentProps> = ({
  zone,
  gridSize,
  isTriggered,
}) => {
  const { enemyToken, reach, isCurrentlyThreatened } = zone;

  // Convert reach in feet to pixels
  const reachInSquares = reach / 5;
  const reachInPixels = reachInSquares * gridSize;

  // Color based on state
  const color = useMemo(() => {
    if (isTriggered) {
      return '#FF0000'; // Red - OA triggered
    } else if (isCurrentlyThreatened) {
      return '#FF8800'; // Orange - currently threatened
    } else {
      return '#FFFF00'; // Yellow - threatened zone
    }
  }, [isTriggered, isCurrentlyThreatened]);

  const opacity = useMemo(() => {
    if (isTriggered) {
      return 0.5;
    } else if (isCurrentlyThreatened) {
      return 0.4;
    } else {
      return 0.2;
    }
  }, [isTriggered, isCurrentlyThreatened]);

  return (
    <group position={[enemyToken.x, enemyToken.y, 3]} name={`threatened-zone-${enemyToken.id}`}>
      {/* Threatened area circle */}
      <mesh>
        <circleGeometry args={[reachInPixels, 64]} />
        <meshBasicMaterial color={color} opacity={opacity} transparent />
      </mesh>

      {/* Border ring */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[reachInPixels - 2, reachInPixels, 64]} />
        <meshBasicMaterial color={color} opacity={opacity * 1.5} transparent />
      </mesh>

      {/* Triggered flash */}
      {isTriggered && (
        <TriggeredFlash token={enemyToken} reach={reachInPixels} />
      )}
    </group>
  );
};

// ===========================
// Triggered Flash Component
// ===========================

interface TriggeredFlashProps {
  token: Token;
  reach: number;
}

const TriggeredFlash: React.FC<TriggeredFlashProps> = ({ token, reach }) => {
  const [opacity, setOpacity] = useState(1.0);

  useEffect(() => {
    // Fade out animation
    const interval = setInterval(() => {
      setOpacity((prev) => Math.max(0, prev - 0.05));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <group position={[0, 0, 0.2]}>
      {/* Expanding ring */}
      <mesh>
        <ringGeometry args={[reach * 0.8, reach * 1.2, 64]} />
        <meshBasicMaterial color="#FF0000" opacity={opacity * 0.8} transparent />
      </mesh>

      {/* Flash circle */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[reach * 0.3, 32]} />
        <meshBasicMaterial color="#FFFFFF" opacity={opacity} transparent />
      </mesh>
    </group>
  );
};

// ===========================
// Helper Functions
// ===========================

/**
 * Check if a token has the Mobile feat (ignores OAs)
 */
export function hasMobileFeat(participant: CombatParticipant): boolean {
  // Check participant flags or features
  return participant.flags?.hasMobileFeat ?? false;
}

/**
 * Check if a token is using the Disengage action
 */
export function isDisengaged(participant: CombatParticipant): boolean {
  // Check if they used Disengage this turn
  return participant.flags?.isDisengaged ?? false;
}

/**
 * Calculate which enemies can make opportunity attacks
 */
export function calculateOpportunityAttackers(
  movingToken: Token,
  movingParticipant: CombatParticipant,
  previousPosition: GridCoordinate,
  currentPosition: GridCoordinate,
  enemies: Array<{ token: Token; participant: CombatParticipant }>,
  gridSize: number,
): Array<{ token: Token; participant: CombatParticipant }> {
  // Skip if Mobile feat
  if (hasMobileFeat(movingParticipant)) {
    return [];
  }

  // Skip if Disengaged
  if (isDisengaged(movingParticipant)) {
    return [];
  }

  const attackers: Array<{ token: Token; participant: CombatParticipant }> = [];

  enemies.forEach(({ token, participant }) => {
    // Skip if already used reaction
    if (participant.reactionTaken) return;

    // Get enemy reach
    const weapon = participant.mainHandWeapon;
    const reach = weapon?.properties?.reach ? 10 : 5;

    // Calculate distances
    const enemyGrid = pixelToGrid(token.x, token.y, gridSize);
    const previousDistance = gridDistance(previousPosition, enemyGrid);
    const currentDistance = gridDistance(currentPosition, enemyGrid);

    // Check if left threatened area
    if (previousDistance <= reach && currentDistance > reach) {
      attackers.push({ token, participant });
    }
  });

  return attackers;
}

/**
 * Check if movement provokes opportunity attacks
 */
export function doesMovementProvokeOA(
  from: GridCoordinate,
  to: GridCoordinate,
  enemyPosition: GridCoordinate,
  reach: number,
): boolean {
  const fromDistance = gridDistance(from, enemyPosition);
  const toDistance = gridDistance(to, enemyPosition);

  // Provokes if starting in reach and ending out of reach
  return fromDistance <= reach && toDistance > reach;
}
