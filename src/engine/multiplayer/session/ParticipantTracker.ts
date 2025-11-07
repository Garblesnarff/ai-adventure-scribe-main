import { logger } from '../../../lib/logger';
import { SessionParticipant, ParticipantPermissions } from '../types';

/**
 * Tracks participants in multiplayer sessions
 * Manages participant lifecycle, permissions, and presence
 */
export class ParticipantTracker {
  private participantsBySession: Map<string, SessionParticipant[]> = new Map();
  private participantsByUser: Map<string, SessionParticipant[]> = new Map();

  /**
   * Add participant to session
   */
  addParticipant(sessionId: string, participant: SessionParticipant): void {
    // Add to session map
    if (!this.participantsBySession.has(sessionId)) {
      this.participantsBySession.set(sessionId, []);
    }
    this.participantsBySession.get(sessionId)!.push(participant);

    // Add to user map
    if (!this.participantsByUser.has(participant.userId)) {
      this.participantsByUser.set(participant.userId, []);
    }
    this.participantsByUser.get(participant.userId)!.push(participant);

    logger.info(`Participant added: ${participant.id} in session ${sessionId}`);
  }

  /**
   * Remove participant from session
   */
  removeParticipant(sessionId: string, participantId: string): void {
    const participants = this.participantsBySession.get(sessionId);
    if (!participants) return;

    const index = participants.findIndex(p => p.id === participantId);
    if (index === -1) return;

    const participant = participants[index];
    participants.splice(index, 1);

    // Remove from user map
    const userParticipants = this.participantsByUser.get(participant.userId);
    if (userParticipants) {
      const userIndex = userParticipants.findIndex(p => p.id === participantId);
      if (userIndex !== -1) {
        userParticipants.splice(userIndex, 1);
      }
    }

    logger.info(`Participant removed: ${participantId} from session ${sessionId}`);
  }

  /**
   * Get all participants in session
   */
  getParticipants(sessionId: string): SessionParticipant[] {
    return this.participantsBySession.get(sessionId) || [];
  }

  /**
   * Get specific participant
   */
  getParticipant(sessionId: string, participantId: string): SessionParticipant | undefined {
    return this.getParticipants(sessionId).find(p => p.id === participantId);
  }

  /**
   * Get participant by user ID
   */
  getParticipantByUserId(sessionId: string, userId: string): SessionParticipant | undefined {
    return this.getParticipants(sessionId).find(p => p.userId === userId);
  }

  /**
   * Update participant status
   */
  updateStatus(
    sessionId: string,
    participantId: string,
    status: SessionParticipant['status']
  ): boolean {
    const participant = this.getParticipant(sessionId, participantId);
    if (!participant) return false;

    participant.status = status;
    participant.lastSeen = new Date();
    return true;
  }

  /**
   * Update participant presence
   */
  updatePresence(sessionId: string, participantId: string, isOnline: boolean): boolean {
    const participant = this.getParticipant(sessionId, participantId);
    if (!participant) return false;

    participant.connectionState.isOnline = isOnline;
    participant.lastSeen = new Date();

    if (!isOnline) {
      participant.status = 'disconnected';
    } else if (participant.status === 'disconnected') {
      participant.status = 'active';
    }

    return true;
  }

  /**
   * Get active participants
   */
  getActiveParticipants(sessionId: string): SessionParticipant[] {
    return this.getParticipants(sessionId)
      .filter(p => ['active', 'joined'].includes(p.status));
  }

  /**
   * Get online participants
   */
  getOnlineParticipants(sessionId: string): SessionParticipant[] {
    return this.getParticipants(sessionId)
      .filter(p => p.connectionState.isOnline);
  }

  /**
   * Get participants by role
   */
  getParticipantsByRole(
    sessionId: string,
    role: SessionParticipant['role']
  ): SessionParticipant[] {
    return this.getParticipants(sessionId).filter(p => p.role === role);
  }

  /**
   * Update participant permissions
   */
  updatePermissions(
    sessionId: string,
    participantId: string,
    permissions: Partial<ParticipantPermissions>
  ): boolean {
    const participant = this.getParticipant(sessionId, participantId);
    if (!participant) return false;

    participant.permissions = { ...participant.permissions, ...permissions };
    return true;
  }

  /**
   * Mark participant as ready for turn
   */
  setTurnReady(sessionId: string, participantId: string, ready: boolean): boolean {
    const participant = this.getParticipant(sessionId, participantId);
    if (!participant) return false;

    participant.isTurnReady = ready;
    return true;
  }

  /**
   * Mark participant as synchronized
   */
  setSynchronized(sessionId: string, participantId: string, synced: boolean): boolean {
    const participant = this.getParticipant(sessionId, participantId);
    if (!participant) return false;

    participant.isSynchronized = synced;
    return true;
  }

  /**
   * Get participant count for session
   */
  getParticipantCount(sessionId: string): number {
    return this.getParticipants(sessionId).length;
  }

  /**
   * Get active participant count
   */
  getActiveCount(sessionId: string): number {
    return this.getActiveParticipants(sessionId).length;
  }

  /**
   * Check if user is in session
   */
  isUserInSession(sessionId: string, userId: string): boolean {
    return this.getParticipants(sessionId).some(p => p.userId === userId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionParticipant[] {
    return this.participantsByUser.get(userId) || [];
  }

  /**
   * Clear all participants from session
   */
  clearSession(sessionId: string): void {
    const participants = this.getParticipants(sessionId);

    for (const participant of participants) {
      const userParticipants = this.participantsByUser.get(participant.userId);
      if (userParticipants) {
        const index = userParticipants.findIndex(p => p.id === participant.id);
        if (index !== -1) {
          userParticipants.splice(index, 1);
        }
      }
    }

    this.participantsBySession.delete(sessionId);
    logger.info(`Cleared all participants from session ${sessionId}`);
  }

  /**
   * Get default permissions for role
   */
  getDefaultPermissions(role: SessionParticipant['role']): ParticipantPermissions {
    const base: ParticipantPermissions = {
      canControlEntities: false,
      canWorldBuild: false,
      canInvitePlayers: false,
      canModerateChat: false,
      canPauseGame: false,
      canEndSession: false,
      canResolveConflicts: false
    };

    if (role === 'player') {
      return { ...base, canControlEntities: true, canInvitePlayers: true };
    }

    if (role === 'dm') {
      return {
        canControlEntities: true,
        canWorldBuild: true,
        canInvitePlayers: true,
        canModerateChat: true,
        canPauseGame: true,
        canEndSession: true,
        canResolveConflicts: true
      };
    }

    return base; // spectator
  }
}
