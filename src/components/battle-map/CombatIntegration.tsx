/**
 * Combat Integration Component
 *
 * Main combat-canvas bridge component that orchestrates all combat-related
 * visual elements on the battle map.
 *
 * Features:
 * - Syncs combat participants with tokens
 * - Shows initiative indicators
 * - Tracks movement
 * - Handles attack targeting
 * - Shows opportunity attack zones
 * - Displays action economy indicators
 *
 * @module components/battle-map/CombatIntegration
 */

import React, { useMemo, useCallback } from 'react';
import { useCombatStore, useParticipants, useCurrentTurnParticipantId, useIsInCombat } from '@/stores/useCombatStore';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { useCombatCanvasSync } from '@/hooks/use-combat-canvas-sync';
import { InitiativeIndicators } from './InitiativeIndicators';
import { MovementTracking } from './MovementTracking';
import { AttackTargeting } from './AttackTargeting';
import { OpportunityAttackZones } from './OpportunityAttackZones';
import type { Token, UpdateTokenData } from '@/types/token';
import type { CombatParticipant } from '@/types/combat';
import logger from '@/lib/logger';

// ===========================
// Props Interface
// ===========================

export interface CombatIntegrationProps {
  /** All tokens on the scene */
  tokens: Token[];
  /** Grid size in pixels */
  gridSize: number;
  /** Callback to update a token */
  onTokenUpdate?: (tokenId: string, updates: UpdateTokenData) => void;
  /** Callback when a token is clicked for attack */
  onAttackToken?: (attackerId: string, targetId: string) => void;
  /** Callback when movement is completed */
  onMovementComplete?: (tokenId: string, distance: number) => void;
  /** Whether to show initiative indicators */
  showInitiativeIndicators?: boolean;
  /** Whether to show movement tracking */
  showMovementTracking?: boolean;
  /** Whether to show attack targeting */
  showAttackTargeting?: boolean;
  /** Whether to show opportunity attack zones */
  showOpportunityAttackZones?: boolean;
  /** Whether to show action economy indicators */
  showActionEconomy?: boolean;
}

// ===========================
// Component
// ===========================

/**
 * Combat Integration Component
 *
 * Bridges the combat system with the battle map canvas.
 * Manages all combat-related visual overlays and interactions.
 *
 * @example
 * ```tsx
 * <CombatIntegration
 *   tokens={sceneTokens}
 *   gridSize={100}
 *   onTokenUpdate={handleTokenUpdate}
 *   onAttackToken={handleAttack}
 *   showInitiativeIndicators={true}
 *   showMovementTracking={true}
 * />
 * ```
 */
export const CombatIntegration: React.FC<CombatIntegrationProps> = ({
  tokens,
  gridSize,
  onTokenUpdate,
  onAttackToken,
  onMovementComplete,
  showInitiativeIndicators = true,
  showMovementTracking = true,
  showAttackTargeting = true,
  showOpportunityAttackZones = true,
  showActionEconomy = true,
}) => {
  // Combat state
  const isInCombat = useIsInCombat();
  const participants = useParticipants();
  const currentTurnParticipantId = useCurrentTurnParticipantId();
  const selectedParticipantId = useCombatStore((state) => state.selectedParticipantId);
  const selectedTargetId = useCombatStore((state) => state.selectedTargetId);
  const setSelectedTarget = useCombatStore((state) => state.setSelectedTarget);

  // Battle map state
  const selectedTokenIds = useBattleMapStore((state) => state.selectedTokenIds);

  // Sync combat and canvas
  const {
    findTokenForParticipant,
    findParticipantForToken,
    syncParticipantToToken,
    syncTokenToParticipant,
  } = useCombatCanvasSync(tokens, {
    autoSelectOnTurn: true,
    syncHealthBars: true,
    syncConditions: true,
    showDefeatedState: true,
    onTokenUpdate,
    onPositionSync: (participantId, position) => {
      logger.debug('Participant position synced', { participantId, position });
    },
  });

  // ===========================
  // Combat Participants with Tokens
  // ===========================

  /**
   * Get participants that have tokens on the scene
   */
  const participantsWithTokens = useMemo(() => {
    return participants
      .map((participant) => {
        const token = findTokenForParticipant(participant);
        return token ? { participant, token } : null;
      })
      .filter((item): item is { participant: CombatParticipant; token: Token } => item !== null);
  }, [participants, findTokenForParticipant]);

  /**
   * Get current turn participant and token
   */
  const currentTurnInfo = useMemo(() => {
    if (!currentTurnParticipantId) return null;

    const participant = participants.find((p) => p.id === currentTurnParticipantId);
    if (!participant) return null;

    const token = findTokenForParticipant(participant);
    if (!token) return null;

    return { participant, token };
  }, [currentTurnParticipantId, participants, findTokenForParticipant]);

  /**
   * Get selected participant and token
   */
  const selectedInfo = useMemo(() => {
    const participantId = selectedParticipantId || currentTurnParticipantId;
    if (!participantId) return null;

    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return null;

    const token = findTokenForParticipant(participant);
    if (!token) return null;

    return { participant, token };
  }, [selectedParticipantId, currentTurnParticipantId, participants, findTokenForParticipant]);

  /**
   * Get target participant and token
   */
  const targetInfo = useMemo(() => {
    if (!selectedTargetId) return null;

    const participant = participants.find((p) => p.id === selectedTargetId);
    if (!participant) return null;

    const token = findTokenForParticipant(participant);
    if (!token) return null;

    return { participant, token };
  }, [selectedTargetId, participants, findTokenForParticipant]);

  // ===========================
  // Action Economy
  // ===========================

  /**
   * Get action economy for current turn
   */
  const actionEconomy = useMemo(() => {
    if (!currentTurnInfo) return null;

    const { participant } = currentTurnInfo;

    return {
      actionAvailable: !participant.actionTaken,
      bonusActionAvailable: !participant.bonusActionTaken,
      reactionAvailable: !participant.reactionTaken,
      movementRemaining: participant.speed - participant.movementUsed,
    };
  }, [currentTurnInfo]);

  // ===========================
  // Event Handlers
  // ===========================

  /**
   * Handle token click for targeting
   */
  const handleTokenClick = useCallback(
    (token: Token) => {
      const participant = findParticipantForToken(token);
      if (!participant) return;

      // Set as target
      setSelectedTarget(participant.id);

      logger.info('Token selected as target', {
        tokenId: token.id,
        participantId: participant.id,
        participantName: participant.name,
      });
    },
    [findParticipantForToken, setSelectedTarget],
  );

  /**
   * Handle attack on target
   */
  const handleAttack = useCallback(
    (targetToken: Token) => {
      if (!selectedInfo) {
        logger.warn('No attacker selected');
        return;
      }

      const targetParticipant = findParticipantForToken(targetToken);
      if (!targetParticipant) {
        logger.warn('Target token has no participant', { tokenId: targetToken.id });
        return;
      }

      if (onAttackToken) {
        onAttackToken(selectedInfo.participant.id, targetParticipant.id);
      }

      logger.info('Attack initiated', {
        attackerId: selectedInfo.participant.id,
        attackerName: selectedInfo.participant.name,
        targetId: targetParticipant.id,
        targetName: targetParticipant.name,
      });
    },
    [selectedInfo, findParticipantForToken, onAttackToken],
  );

  // ===========================
  // Render
  // ===========================

  // Don't render if not in combat
  if (!isInCombat) {
    return null;
  }

  return (
    <group name="combat-integration">
      {/* Initiative Indicators */}
      {showInitiativeIndicators && (
        <InitiativeIndicators
          participants={participantsWithTokens.map((item) => item.participant)}
          tokens={participantsWithTokens.map((item) => item.token)}
          currentTurnParticipantId={currentTurnParticipantId}
          gridSize={gridSize}
        />
      )}

      {/* Movement Tracking */}
      {showMovementTracking && currentTurnInfo && (
        <MovementTracking
          token={currentTurnInfo.token}
          participant={currentTurnInfo.participant}
          gridSize={gridSize}
          movementRemaining={actionEconomy?.movementRemaining ?? 0}
          onMovementComplete={onMovementComplete}
        />
      )}

      {/* Attack Targeting */}
      {showAttackTargeting && selectedInfo && (
        <AttackTargeting
          attackerToken={selectedInfo.token}
          attackerParticipant={selectedInfo.participant}
          targetToken={targetInfo?.token}
          targetParticipant={targetInfo?.participant}
          allTokens={tokens}
          allParticipants={participants}
          gridSize={gridSize}
          onTargetClick={handleTokenClick}
          onAttack={handleAttack}
        />
      )}

      {/* Opportunity Attack Zones */}
      {showOpportunityAttackZones && currentTurnInfo && (
        <OpportunityAttackZones
          currentToken={currentTurnInfo.token}
          currentParticipant={currentTurnInfo.participant}
          enemyTokens={participantsWithTokens
            .filter(
              (item) =>
                item.participant.participantType === 'enemy' &&
                item.participant.id !== currentTurnInfo.participant.id,
            )
            .map((item) => item.token)}
          enemyParticipants={participantsWithTokens
            .filter(
              (item) =>
                item.participant.participantType === 'enemy' &&
                item.participant.id !== currentTurnInfo.participant.id,
            )
            .map((item) => item.participant)}
          gridSize={gridSize}
        />
      )}

      {/* Action Economy Indicators */}
      {showActionEconomy && currentTurnInfo && actionEconomy && (
        <group name="action-economy-indicators">
          {/* Action indicator */}
          {actionEconomy.actionAvailable && (
            <ActionIndicator
              token={currentTurnInfo.token}
              type="action"
              position="top-left"
              gridSize={gridSize}
            />
          )}

          {/* Bonus action indicator */}
          {actionEconomy.bonusActionAvailable && (
            <ActionIndicator
              token={currentTurnInfo.token}
              type="bonus-action"
              position="top-right"
              gridSize={gridSize}
            />
          )}

          {/* Reaction indicator */}
          {actionEconomy.reactionAvailable && (
            <ActionIndicator
              token={currentTurnInfo.token}
              type="reaction"
              position="bottom-left"
              gridSize={gridSize}
            />
          )}
        </group>
      )}
    </group>
  );
};

// ===========================
// Action Indicator Component
// ===========================

interface ActionIndicatorProps {
  token: Token;
  type: 'action' | 'bonus-action' | 'reaction';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  gridSize: number;
}

const ActionIndicator: React.FC<ActionIndicatorProps> = ({ token, type, position, gridSize }) => {
  // Calculate position offset based on position prop
  const offset = useMemo(() => {
    const size = token.width * gridSize;
    const margin = 10;

    switch (position) {
      case 'top-left':
        return { x: -size / 2 + margin, y: -size / 2 + margin };
      case 'top-right':
        return { x: size / 2 - margin, y: -size / 2 + margin };
      case 'bottom-left':
        return { x: -size / 2 + margin, y: size / 2 - margin };
      case 'bottom-right':
        return { x: size / 2 - margin, y: size / 2 - margin };
    }
  }, [token.width, gridSize, position]);

  // Color based on type
  const color = useMemo(() => {
    switch (type) {
      case 'action':
        return '#FFD700'; // Gold
      case 'bonus-action':
        return '#87CEEB'; // Sky blue
      case 'reaction':
        return '#FF6B6B'; // Coral red
    }
  }, [type]);

  // Icon symbol
  const symbol = useMemo(() => {
    switch (type) {
      case 'action':
        return 'A';
      case 'bonus-action':
        return 'B';
      case 'reaction':
        return 'R';
    }
  }, [type]);

  return (
    <group position={[token.x + offset.x, token.y + offset.y, 5]}>
      {/* Background circle */}
      <mesh>
        <circleGeometry args={[8, 16]} />
        <meshBasicMaterial color={color} opacity={0.8} transparent />
      </mesh>

      {/* Icon (would use Text3D in real implementation) */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[6, 8, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};
