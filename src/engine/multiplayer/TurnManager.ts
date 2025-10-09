import {
  TurnState,
  TurnOrder,
  TurnStatus,
  TurnType,
  SessionParticipant,
  SharedSession,
  SessionConflict,
  ConflictType,
  ResolutionMethod,
  SessionResult
} from './types';
import { PlayerIntent, DMAction } from '../scene/types';
import { WorldGraph } from '../world/graph';

/**
 * Turn management system for multiplayer sessions
 * Handles turn order, timing, conflict resolution, and turn progression
 */
export class TurnManager {
  private currentTurns: Map<string, TurnState> = new Map();
  private turnOrders: Map<string, TurnOrder> = new Map();
  private turnTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private turnHistory: Map<string, TurnState[]> = new Map();

  constructor(private worldGraphs: Map<string, WorldGraph>) {}

  /**
   * Initialize turn order for a session
   */
  initializeTurnOrder(sessionId: string, participants: SessionParticipant[]): TurnOrder {
    // Filter participants who can take turns
    const activeParticipants = participants.filter(p => 
      p.status === 'active' && p.permissions.canControlEntities
    );

    // Sort by role priority (DM first, then by join order or random)
    activeParticipants.sort((a, b) => {
      if (a.role === 'dm' && b.role !== 'dm') return -1;
      if (b.role === 'dm' && a.role !== 'dm') return 1;
      if (a.role === 'player' && b.role === 'spectator') return -1;
      if (b.role === 'player' && a.role === 'spectator') return 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    const turnOrder: TurnOrder = {
      participantIds: activeParticipants.map(p => p.id),
      currentTurnIndex: 0,
      startIndex: 0,
      cycleCount: 0
    };

    this.turnOrders.set(sessionId, turnOrder);
    this.turnHistory.set(sessionId, []);

    return turnOrder;
  }

  /**
   * Start the next turn in a session
   */
  async startNextTurn(
    sessionId: string,
    session: SharedSession
  ): Promise<SessionResult<TurnState>> {
    try {
      const turnOrder = this.turnOrders.get(sessionId);
      if (!turnOrder) {
        return {
          success: false,
          error: 'Turn order not initialized'
        };
      }

      // Get next participant
      const nextParticipantId = this.getNextParticipant(sessionId);
      if (!nextParticipantId) {
        return {
          success: false,
          error: 'No active participants available for turns'
        };
      }

      const participant = session.participants.find(p => p.id === nextParticipantId);
      if (!participant) {
        return {
          success: false,
          error: 'Next participant not found'
        };
      }

      // Clear any existing timeout
      this.clearTurnTimeout(sessionId);

      // Create new turn
      const turnState: TurnState = {
        id: this.generateTurnId(),
        sessionId,
        turnNumber: session.gameState.turnCount + 1,
        participantId: nextParticipantId,
        characterId: participant.characterId,
        turnType: 'action', // Will be updated when action is submitted
        action: this.createEmptyIntent(),
        worldChanges: [],
        startedAt: new Date(),
        endsAt: new Date(Date.now() + session.settings.turnTimeLimit * 1000),
        timeRemaining: session.settings.turnTimeLimit,
        status: 'pending',
        isCompleted: false,
        isSkipped: false,
        synchronizedParticipants: [],
        pendingParticipants: session.participants
          .filter(p => p.status === 'active' && p.id !== nextParticipantId)
          .map(p => p.id)
      };

      this.currentTurns.set(sessionId, turnState);
      this.updateTurnOrder(sessionId, turnState);

      // Start turn timeout
      this.scheduleTurnTimeout(sessionId, turnState.id, session.settings.turnTimeLimit * 1000);

      return {
        success: true,
        data: turnState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error starting turn'
      };
    }
  }

  /**
   * Submit an action for the current turn
   */
  async submitTurnAction(
    sessionId: string,
    participantId: string,
    action: PlayerIntent
  ): Promise<SessionResult<TurnState>> {
    try {
      const currentTurn = this.currentTurns.get(sessionId);
      if (!currentTurn) {
        return {
          success: false,
          error: 'No current turn found'
        };
      }

      if (currentTurn.participantId !== participantId) {
        return {
          success: false,
          error: 'Not your turn'
        };
      }

      if (currentTurn.status !== 'pending' && currentTurn.status !== 'waiting') {
        return {
          success: false,
          error: 'Turn is not accepting actions'
        };
      }

      // Update turn with action
      currentTurn.action = action;
      currentTurn.turnType = this.inferTurnType(action);
      currentTurn.status = 'active';

      // Process action through world graph
      await this.processTurnAction(sessionId, currentTurn);

      return {
        success: true,
        data: currentTurn
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error submitting turn action'
      };
    }
  }

  /**
   * Complete the current turn
   */
  async completeTurn(
    sessionId: string,
    participantId: string,
    response?: DMAction
  ): Promise<SessionResult<TurnState>> {
    try {
      const currentTurn = this.currentTurns.get(sessionId);
      if (!currentTurn) {
        return {
          success: false,
          error: 'No current turn found'
        };
      }

      if (currentTurn.participantId !== participantId) {
        return {
          success: false,
          error: 'Cannot complete another participant\'s turn'
        };
      }

      if (currentTurn.isCompleted) {
        return {
          success: false,
          error: 'Turn already completed'
        };
      }

      // Finalize turn
      currentTurn.response = response;
      currentTurn.status = 'completed';
      currentTurn.isCompleted = true;
      currentTurn.endedAt = new Date();
      currentTurn.duration = currentTurn.endedAt.getTime() - currentTurn.startedAt.getTime();
      currentTurn.timeRemaining = 0;

      // Clear timeout
      this.clearTurnTimeout(sessionId);

      // Add to history
      const history = this.turnHistory.get(sessionId) || [];
      history.push(currentTurn);
      this.turnHistory.set(sessionId, history);

      // Update world graph if needed
      await this.finalizeTurnWorldChanges(sessionId, currentTurn);

      return {
        success: true,
        data: currentTurn
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error completing turn'
      };
    }
  }

  /**
   * Skip the current turn
   */
  async skipTurn(
    sessionId: string,
    participantId: string,
    reason: string = 'Player chose to skip'
  ): Promise<SessionResult<TurnState>> {
    try {
      const currentTurn = this.currentTurns.get(sessionId);
      if (!currentTurn) {
        return {
          success: false,
          error: 'No current turn found'
        };
      }

      if (currentTurn.participantId !== participantId) {
        return {
          success: false,
          error: 'Cannot skip another participant\'s turn'
        };
      }

      // Skip turn
      currentTurn.status = 'skipped';
      currentTurn.isSkipped = true;
      currentTurn.endedAt = new Date();
      currentTurn.duration = currentTurn.endedAt.getTime() - currentTurn.startedAt.getTime();
      currentTurn.timeRemaining = 0;

      // Add metadata about skip reason
      currentTurn.metadata = {
        ...currentTurn.metadata,
        skipReason: reason
      };

      // Clear timeout
      this.clearTurnTimeout(sessionId);

      // Add to history
      const history = this.turnHistory.get(sessionId) || [];
      history.push(currentTurn);
      this.turnHistory.set(sessionId, history);

      return {
        success: true,
        data: currentTurn
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error skipping turn'
      };
    }
  }

  /**
   * Get current turn state
   */
  getCurrentTurn(sessionId: string): TurnState | null {
    return this.currentTurns.get(sessionId) || null;
  }

  /**
   * Get turn history for a session
   */
  getTurnHistory(sessionId: string): TurnState[] {
    return this.turnHistory.get(sessionId) || [];
  }

  /**
   * Get turn order for a session
   */
  getTurnOrder(sessionId: string): TurnOrder | null {
    return this.turnOrders.get(sessionId) || null;
  }

  /**
   * Update turn order (add/remove/rotate participants)
   */
  updateTurnOrder(
    sessionId: string,
    participants: SessionParticipant[]
  ): TurnOrder {
    const activeParticipants = participants.filter(p => 
      p.status === 'active' && p.permissions.canControlEntities
    );

    const currentOrder = this.turnOrders.get(sessionId);

    // Sort participants maintaining existing order where possible
    activeParticipants.sort((a, b) => {
      const aIndex = currentOrder?.participantIds.indexOf(a.id) ?? -1;
      const bIndex = currentOrder?.participantIds.indexOf(b.id) ?? -1;
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // New participants: DM first, then by join time
      if (a.role === 'dm' && b.role !== 'dm') return -1;
      if (b.role === 'dm' && a.role !== 'dm') return 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    const newOrder: TurnOrder = {
      participantIds: activeParticipants.map(p => p.id),
      currentTurnIndex: currentOrder?.currentTurnIndex ?? 0,
      startIndex: currentOrder?.startIndex ?? 0,
      cycleCount: currentOrder?.cycleCount ?? 0
    };

    this.turnOrders.set(sessionId, newOrder);
    return newOrder;
  }

  /**
   * Check for turn conflicts and create conflict objects
   */
  async detectTurnConflicts(
    sessionId: string,
    turn: TurnState
  ): Promise<SessionConflict[]> {
    const conflicts: SessionConflict[] = [];

    // Check for simultaneous action conflicts
    const currentTurns = Array.from(this.currentTurns.values())
      .filter(t => t.sessionId === sessionId && t.id !== turn.id && t.status === 'active');

    for (const otherTurn of currentTurns) {
      const conflict = await this.checkTurnCompatibility(turn, otherTurn);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Check for world state conflicts
    const worldGraph = this.worldGraphs.get(sessionId);
    if (worldGraph) {
      const worldConflicts = await this.checkWorldStateConflict(worldGraph, turn);
      conflicts.push(...worldConflicts);
    }

    return conflicts;
  }

  /**
   * Get time remaining for current turn
   */
  getTimeRemaining(sessionId: string): number {
    const currentTurn = this.currentTurns.get(sessionId);
    if (!currentTurn) return 0;

    return Math.max(0, currentTurn.endsAt.getTime() - Date.now()) / 1000;
  }

  /**
   * Pause/resume turn timer
   */
  pauseTurnTimer(sessionId: string): boolean {
    const timeout = this.turnTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.turnTimeouts.delete(sessionId);
      return true;
    }
    return false;
  }

  resumeTurnTimer(sessionId: string, remainingTime: number): boolean {
    const currentTurn = this.currentTurns.get(sessionId);
    if (!currentTurn) return false;

    currentTurn.timeRemaining = remainingTime;
    currentTurn.endsAt = new Date(Date.now() + remainingTime * 1000);

    this.scheduleTurnTimeout(sessionId, currentTurn.id, remainingTime * 1000);
    return true;
  }

  // Private helper methods

  private getNextParticipant(sessionId: string): string | null {
    const turnOrder = this.turnOrders.get(sessionId);
    if (!turnOrder || turnOrder.participantIds.length === 0) return null;

    const nextIndex = (turnOrder.currentTurnIndex + 1) % turnOrder.participantIds.length;
    return turnOrder.participantIds[nextIndex];
  }

  private updateTurnOrder(sessionId: string, turn: TurnState): void {
    const turnOrder = this.turnOrders.get(sessionId);
    if (!turnOrder) return;

    const currentIndex = turnOrder.participantIds.indexOf(turn.participantId);
    if (currentIndex >= 0) {
      turnOrder.currentTurnIndex = currentIndex;
      
      if (currentIndex === 0 && turnOrder.currentTurnIndex !== turnOrder.startIndex) {
        turnOrder.cycleCount++;
      }
    }
  }

  private generateTurnId(): string {
    return `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptyIntent(): PlayerIntent {
    return {
      id: this.generateTurnId(),
      type: 'action',
      content: '',
      participantId: '',
      timestamp: new Date(),
      metadata: {}
    };
  }

  private inferTurnType(action: PlayerIntent): TurnType {
    const content = action.content?.toLowerCase() || '';
    
    if (content.includes('attack') || content.includes('fight') || content.includes('cast')) {
      return 'combat';
    }
    if (content.includes('move') || content.includes('go') || content.includes('walk') || content.includes('travel')) {
      return 'movement';
    }
    if (content.includes('talk') || content.includes('say') || content.includes('ask') || content.includes('谈判')) {
      return 'dialogue';
    }
    if (content.includes('rest') || content.includes('sleep') || content.includes('camp') || content.includes('long rest')) {
      return 'rest';
    }
    if (content.includes('explore') || content.includes('search') || content.includes('look') || content.includes('investigate')) {
      return 'exploration';
    }
    if (content.includes('trade') || content.includes('buy') || content.includes('sell') || content.includes('barter')) {
      return 'social';
    }
    
    return 'action';
  }

  private async processTurnAction(sessionId: string, turn: TurnState): Promise<void> {
    const worldGraph = this.worldGraphs.get(sessionId);
    if (!worldGraph) return;

    // Process action through world graph
    // This would integrate with the world orchestrator
    // For now, we'll just prepare the turn for world processing
    turn.worldChanges = [];
  }

  private async finalizeTurnWorldChanges(sessionId: string, turn: TurnState): Promise<void> {
    // Apply any pending world changes from the turn
    const worldGraph = this.worldGraphs.get(sessionId);
    if (!worldGraph) return;

    // Apply world changes synchronously
    for (const change of turn.worldChanges) {
      // Apply each change to the world graph
    }
  }

  private scheduleTurnTimeout(sessionId: string, turnId: string, delay: number): void {
    const timeout = setTimeout(async () => {
      await this.handleTurnTimeout(sessionId, turnId);
    }, delay);

    this.turnTimeouts.set(sessionId, timeout);
  }

  private clearTurnTimeout(sessionId: string): void {
    const timeout = this.turnTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.turnTimeouts.delete(sessionId);
    }
  }

  private async handleTurnTimeout(sessionId: string, turnId: string): Promise<void> {
    const currentTurn = this.currentTurns.get(sessionId);
    if (!currentTurn || currentTurn.id !== turnId) return;

    currentTurn.status = 'timeout';
    currentTurn.timeRemaining = 0;
    currentTurn.isSkipped = true;

    // Auto-skip the turn
    await this.skipTurn(sessionId, currentTurn.participantId, 'Turn timeout');
  }

  private async checkTurnCompatibility(turn1: TurnState, turn2: TurnState): Promise<SessionConflict | null> {
    // Check if two turns might conflict with each other
    // This would involve comparing the actions and checking for dependencies
    
    // For now, simple冲突检测
    if (turn1.turnType === 'combat' && turn2.turnType === 'combat') {
      // Both participants trying to combat - potential conflict
      return {
        id: this.generateTurnId(),
        sessionId: turn1.sessionId,
        conflictType: 'character_action',
        status: 'active',
        initiatorId: turn1.participantId,
        affectedParticipants: [turn1.participantId, turn2.participantId],
        originalAction: turn1,
        conflictingStates: [turn2],
        createdAt: new Date(),
        severity: 'medium',
        canProceed: false
      };
    }

    return null;
  }

  private async checkWorldStateConflict(
    worldGraph: WorldGraph,
    turn: TurnState
  ): Promise<SessionConflict[]> {
    // Check if turn action conflicts with current world state
    const conflicts: SessionConflict[] = [];

    // This would involve validating the action against world constraints
    // For now, return empty array
    
    return conflicts;
  }
}
