/**
 * Combat Canvas Sync Hook
 *
 * Synchronizes combat state with battle map state.
 * Links combat participants to tokens on the canvas.
 *
 * @module hooks/use-combat-canvas-sync
 */

import { useEffect, useCallback, useRef } from 'react';
import { useCombatStore, useParticipants, useCurrentTurnParticipantId } from '@/stores/useCombatStore';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import type { CombatParticipant } from '@/types/combat';
import type { Token, UpdateTokenData } from '@/types/token';
import logger from '@/lib/logger';

// ===========================
// Types
// ===========================

export interface CombatCanvasSyncOptions {
  /** Automatically select token when turn starts */
  autoSelectOnTurn?: boolean;
  /** Update token HP bars when damage is dealt */
  syncHealthBars?: boolean;
  /** Apply visual conditions to tokens */
  syncConditions?: boolean;
  /** Gray out defeated tokens */
  showDefeatedState?: boolean;
  /** Callback when tokens need to be updated */
  onTokenUpdate?: (tokenId: string, updates: UpdateTokenData) => void;
  /** Callback when participant position changes */
  onPositionSync?: (participantId: string, position: { x: number; y: number }) => void;
}

// ===========================
// Hook
// ===========================

/**
 * Synchronize combat state with battle map canvas
 *
 * Features:
 * - Auto-select token when turn starts
 * - Sync HP changes to token health bars
 * - Apply condition effects to tokens
 * - Update defeated token appearance
 * - Track movement used this turn
 *
 * @param tokens - Array of tokens on the battle map
 * @param options - Sync configuration options
 *
 * @example
 * ```tsx
 * const { syncParticipantToToken, syncTokenToParticipant } = useCombatCanvasSync(tokens, {
 *   autoSelectOnTurn: true,
 *   syncHealthBars: true,
 *   onTokenUpdate: (tokenId, updates) => updateToken(tokenId, updates),
 * });
 * ```
 */
export function useCombatCanvasSync(
  tokens: Token[],
  options: CombatCanvasSyncOptions = {},
) {
  const {
    autoSelectOnTurn = true,
    syncHealthBars = true,
    syncConditions = true,
    showDefeatedState = true,
    onTokenUpdate,
    onPositionSync,
  } = options;

  // Combat store
  const participants = useParticipants();
  const currentTurnParticipantId = useCurrentTurnParticipantId();
  const updateParticipant = useCombatStore((state) => state.updateParticipant);
  const isInCombat = useCombatStore((state) => state.isInCombat);

  // Battle map store
  const selectToken = useBattleMapStore((state) => state.selectToken);
  const clearSelection = useBattleMapStore((state) => state.clearSelection);

  // Track previous turn to detect changes
  const previousTurnRef = useRef<string | undefined>();

  // ===========================
  // Participant to Token Mapping
  // ===========================

  /**
   * Find token for a given participant
   */
  const findTokenForParticipant = useCallback(
    (participant: CombatParticipant): Token | undefined => {
      return tokens.find(
        (token) =>
          token.combatantId === participant.id ||
          token.characterId === participant.characterId ||
          token.id === participant.tokenId,
      );
    },
    [tokens],
  );

  /**
   * Find participant for a given token
   */
  const findParticipantForToken = useCallback(
    (token: Token): CombatParticipant | undefined => {
      return participants.find(
        (p) =>
          p.id === token.combatantId ||
          p.characterId === token.characterId ||
          p.tokenId === token.id,
      );
    },
    [participants],
  );

  // ===========================
  // Sync Participant Data to Token
  // ===========================

  /**
   * Sync participant data to their token
   */
  const syncParticipantToToken = useCallback(
    (participant: CombatParticipant) => {
      const token = findTokenForParticipant(participant);
      if (!token || !onTokenUpdate) return;

      const updates: UpdateTokenData = {};

      // Sync health bar
      if (syncHealthBars && token.bar1) {
        updates.bar1 = {
          value: participant.currentHitPoints,
          max: participant.maxHitPoints,
          temp: participant.temporaryHitPoints,
        };
      }

      // Sync conditions
      if (syncConditions) {
        updates.conditions = participant.conditions.map((c) => c.name);
        updates.statusEffects = participant.conditions.map((c, index) => ({
          id: `${participant.id}-${c.name}-${index}`,
          icon: getConditionIcon(c.name),
          label: c.name,
          description: c.description,
          duration: c.duration,
        }));
      }

      // Sync position if available
      if (participant.position) {
        updates.x = participant.position.x;
        updates.y = participant.position.y;
      }

      // Show defeated state (gray out, reduced opacity)
      if (showDefeatedState && participant.currentHitPoints <= 0) {
        updates.alpha = 0.5;
        updates.tint = '#666666';
      } else if (token.alpha !== 1 || token.tint) {
        // Restore normal appearance
        updates.alpha = 1;
        updates.tint = undefined;
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        onTokenUpdate(token.id, updates);
      }
    },
    [
      findTokenForParticipant,
      onTokenUpdate,
      syncHealthBars,
      syncConditions,
      showDefeatedState,
    ],
  );

  // ===========================
  // Sync Token Data to Participant
  // ===========================

  /**
   * Sync token data to their participant
   */
  const syncTokenToParticipant = useCallback(
    (token: Token) => {
      const participant = findParticipantForToken(token);
      if (!participant) return;

      const updates: Partial<CombatParticipant> = {};

      // Sync position
      if (onPositionSync && (token.x !== participant.position?.x || token.y !== participant.position?.y)) {
        updates.position = {
          x: token.x,
          y: token.y,
          sceneId: token.sceneId,
        };
        onPositionSync(participant.id, { x: token.x, y: token.y });
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        updateParticipant(participant.id, updates);
      }
    },
    [findParticipantForToken, updateParticipant, onPositionSync],
  );

  // ===========================
  // Auto-select Token on Turn Start
  // ===========================

  useEffect(() => {
    if (!isInCombat || !autoSelectOnTurn || !currentTurnParticipantId) return;

    // Check if turn changed
    if (previousTurnRef.current === currentTurnParticipantId) return;
    previousTurnRef.current = currentTurnParticipantId;

    // Find the participant whose turn it is
    const currentParticipant = participants.find((p) => p.id === currentTurnParticipantId);
    if (!currentParticipant) return;

    // Find their token
    const token = findTokenForParticipant(currentParticipant);
    if (!token) {
      logger.warn('Could not find token for current turn participant', {
        participantId: currentTurnParticipantId,
        participantName: currentParticipant.name,
      });
      return;
    }

    // Select the token
    selectToken(token.id, false);

    logger.info('Auto-selected token for turn', {
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      tokenId: token.id,
    });
  }, [
    isInCombat,
    currentTurnParticipantId,
    participants,
    findTokenForParticipant,
    selectToken,
    autoSelectOnTurn,
  ]);

  // ===========================
  // Sync All Participants
  // ===========================

  /**
   * Sync all participants to their tokens
   */
  const syncAllParticipants = useCallback(() => {
    participants.forEach((participant) => {
      syncParticipantToToken(participant);
    });
  }, [participants, syncParticipantToToken]);

  /**
   * Sync all tokens to their participants
   */
  const syncAllTokens = useCallback(() => {
    tokens.forEach((token) => {
      syncTokenToParticipant(token);
    });
  }, [tokens, syncTokenToParticipant]);

  // ===========================
  // Auto-sync on participant changes
  // ===========================

  useEffect(() => {
    if (!isInCombat) return;
    syncAllParticipants();
  }, [participants, isInCombat, syncAllParticipants]);

  // ===========================
  // Cleanup on combat end
  // ===========================

  useEffect(() => {
    if (!isInCombat) {
      clearSelection();
      previousTurnRef.current = undefined;
    }
  }, [isInCombat, clearSelection]);

  // ===========================
  // Return API
  // ===========================

  return {
    syncParticipantToToken,
    syncTokenToParticipant,
    syncAllParticipants,
    syncAllTokens,
    findTokenForParticipant,
    findParticipantForToken,
  };
}

// ===========================
// Helper Functions
// ===========================

/**
 * Get icon URL for a condition
 */
function getConditionIcon(conditionName: string): string {
  const iconMap: Record<string, string> = {
    blinded: '/icons/conditions/blinded.svg',
    charmed: '/icons/conditions/charmed.svg',
    deafened: '/icons/conditions/deafened.svg',
    frightened: '/icons/conditions/frightened.svg',
    grappled: '/icons/conditions/grappled.svg',
    incapacitated: '/icons/conditions/incapacitated.svg',
    invisible: '/icons/conditions/invisible.svg',
    paralyzed: '/icons/conditions/paralyzed.svg',
    petrified: '/icons/conditions/petrified.svg',
    poisoned: '/icons/conditions/poisoned.svg',
    prone: '/icons/conditions/prone.svg',
    restrained: '/icons/conditions/restrained.svg',
    stunned: '/icons/conditions/stunned.svg',
    unconscious: '/icons/conditions/unconscious.svg',
    exhaustion: '/icons/conditions/exhaustion.svg',
    surprised: '/icons/conditions/surprised.svg',
    concentrating: '/icons/conditions/concentrating.svg',
  };

  return iconMap[conditionName.toLowerCase()] || '/icons/conditions/default.svg';
}
