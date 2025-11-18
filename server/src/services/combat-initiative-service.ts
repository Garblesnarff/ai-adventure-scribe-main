/**
 * Combat Initiative Service
 *
 * Type-safe combat initiative and turn order management for D&D 5E combat.
 * Handles encounter lifecycle, initiative rolls, and turn advancement.
 */

import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import {
  combatEncounters,
  combatParticipants,
  type CombatEncounter,
  type NewCombatEncounter,
  type CombatParticipant,
  type NewCombatParticipant,
} from '../../../db/schema/index.js';
import type {
  CombatState,
  CreateParticipantInput,
  InitiativeRoll,
  TurnOrderEntry,
  AdvanceTurnResult,
  ReorderInitiativeInput,
} from '../types/combat.js';
import { NotFoundError, InternalServerError, BusinessLogicError } from '../lib/errors.js';

/**
 * Roll a d20 for initiative
 */
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Combat Initiative Service
 * Provides type-safe database operations for combat encounters
 */
export class CombatInitiativeService {
  /**
   * Start a new combat encounter
   * @param sessionId - Game session ID
   * @param participantInputs - Array of participants to add
   * @param surpriseRound - Whether this is a surprise round
   * @returns The created encounter with participants
   */
  static async startCombat(
    sessionId: string,
    participantInputs: CreateParticipantInput[],
    surpriseRound: boolean = false
  ): Promise<CombatState> {
    // Create the encounter
    const [encounter] = await db
      .insert(combatEncounters)
      .values({
        sessionId,
        status: 'active',
        currentRound: surpriseRound ? 0 : 1,
        currentTurnOrder: 0,
      })
      .returning();

    if (!encounter) {
      throw new InternalServerError('Failed to create combat encounter');
    }

    // Add participants
    const participants: CombatParticipant[] = [];
    for (const input of participantInputs) {
      const participant = await this.addParticipant(encounter.id, input);
      participants.push(participant);
    }

    // Calculate initial turn order
    await this.calculateTurnOrder(encounter.id);

    // Get the updated state
    return await this.getCombatState(encounter.id);
  }

  /**
   * Add a participant to an existing encounter
   */
  static async addParticipant(
    encounterId: string,
    input: CreateParticipantInput
  ): Promise<CombatParticipant> {
    // Roll initiative (d20 + modifier)
    const roll = rollD20();
    const initiative = roll + input.initiativeModifier;

    const [participant] = await db
      .insert(combatParticipants)
      .values({
        encounterId,
        characterId: input.characterId || null,
        npcId: input.npcId || null,
        name: input.name,
        initiative,
        initiativeModifier: input.initiativeModifier,
        turnOrder: 0, // Will be recalculated
        participantType: input.characterId ? 'player' : input.npcId ? 'npc' : 'other',
      })
      .returning();

    if (!participant) {
      throw new InternalServerError('Failed to add combat participant');
    }

    return participant;
  }

  /**
   * Roll or set initiative for a participant
   * @param encounterId - Combat encounter ID
   * @param participantId - Participant ID
   * @param roll - Optional dice roll (if not provided, will roll automatically)
   * @param modifier - Initiative modifier (DEX modifier)
   * @returns Initiative roll result
   */
  static async rollInitiative(
    encounterId: string,
    participantId: string,
    roll?: number,
    modifier?: number
  ): Promise<InitiativeRoll> {
    // Get participant
    const participant = await db.query.combatParticipants.findFirst({
      where: and(
        eq(combatParticipants.id, participantId),
        eq(combatParticipants.encounterId, encounterId)
      ),
    });

    if (!participant) {
      throw new NotFoundError('Participant', participantId);
    }

    // Use provided roll or roll d20
    const diceRoll = roll !== undefined ? roll : rollD20();
    const initiativeModifier = modifier !== undefined ? modifier : participant.initiativeModifier;
    const total = diceRoll + initiativeModifier;

    // Update participant initiative
    const [updated] = await db
      .update(combatParticipants)
      .set({
        initiative: total,
        initiativeModifier,
      })
      .where(eq(combatParticipants.id, participantId))
      .returning();

    if (!updated) {
      throw new InternalServerError('Failed to update initiative');
    }

    // Recalculate turn order
    await this.calculateTurnOrder(encounterId);

    return {
      participantId,
      roll: diceRoll,
      modifier: initiativeModifier,
      total,
    };
  }

  /**
   * Calculate and update turn order based on initiative
   * Sorts by initiative descending, ties broken by DEX modifier (higher first)
   * @param encounterId - Combat encounter ID
   */
  static async calculateTurnOrder(encounterId: string): Promise<void> {
    // Get all active participants
    const participants = await db.query.combatParticipants.findMany({
      where: and(
        eq(combatParticipants.encounterId, encounterId),
        eq(combatParticipants.isActive, true)
      ),
    });

    // Sort by initiative (desc), then by modifier (desc) for ties
    const sorted = participants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return b.initiativeModifier - a.initiativeModifier;
    });

    // Update turn order for each participant
    for (let i = 0; i < sorted.length; i++) {
      const sortedParticipant = sorted[i];
      if (sortedParticipant) {
        await db
          .update(combatParticipants)
          .set({ turnOrder: i })
          .where(eq(combatParticipants.id, sortedParticipant.id));
      }
    }
  }

  /**
   * Advance to the next turn in combat
   * @param encounterId - Combat encounter ID
   * @returns Result with previous and current participants
   */
  static async advanceTurn(encounterId: string): Promise<AdvanceTurnResult> {
    const encounter = await db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, encounterId),
    });

    if (!encounter) {
      throw new NotFoundError('Combat encounter', encounterId);
    }

    if (encounter.status !== 'active') {
      throw new BusinessLogicError('Encounter is not active', { status: encounter.status });
    }

    // Get current participant
    const previousParticipant = await this.getCurrentTurn(encounterId);

    // Get all active participants ordered by turn order
    const participants = await db.query.combatParticipants.findMany({
      where: and(
        eq(combatParticipants.encounterId, encounterId),
        eq(combatParticipants.isActive, true)
      ),
      orderBy: asc(combatParticipants.turnOrder),
    });

    if (participants.length === 0) {
      throw new BusinessLogicError('No active participants in combat');
    }

    // Calculate next turn
    const currentTurnOrder = encounter.currentTurnOrder;
    const nextTurnOrder = (currentTurnOrder + 1) % participants.length;
    const newRound = nextTurnOrder === 0 && currentTurnOrder !== 0;
    const newRoundNumber = newRound ? encounter.currentRound + 1 : encounter.currentRound;

    // Update encounter
    await db
      .update(combatEncounters)
      .set({
        currentTurnOrder: nextTurnOrder,
        currentRound: newRoundNumber,
        updatedAt: new Date(),
      })
      .where(eq(combatEncounters.id, encounterId));

    // Get new current participant
    const currentParticipant = participants[nextTurnOrder];

    if (!currentParticipant) {
      throw new BusinessLogicError('No participant found at turn order position', { nextTurnOrder });
    }

    return {
      previousParticipant,
      currentParticipant,
      newRound,
      roundNumber: newRoundNumber,
    };
  }

  /**
   * Get the current active participant
   * @param encounterId - Combat encounter ID
   * @returns Current participant or null
   */
  static async getCurrentTurn(encounterId: string): Promise<CombatParticipant | null> {
    const encounter = await db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, encounterId),
    });

    if (!encounter) {
      throw new NotFoundError('Combat encounter', encounterId);
    }

    const participants = await db.query.combatParticipants.findMany({
      where: and(
        eq(combatParticipants.encounterId, encounterId),
        eq(combatParticipants.isActive, true)
      ),
      orderBy: asc(combatParticipants.turnOrder),
    });

    if (participants.length === 0) {
      return null;
    }

    return participants[encounter.currentTurnOrder] || null;
  }

  /**
   * Manually reorder initiative for a participant
   * @param encounterId - Combat encounter ID
   * @param participantId - Participant ID
   * @param newInitiative - New initiative value
   */
  static async reorderInitiative(
    encounterId: string,
    participantId: string,
    newInitiative: number
  ): Promise<void> {
    // Update participant initiative
    await db
      .update(combatParticipants)
      .set({ initiative: newInitiative })
      .where(and(
        eq(combatParticipants.id, participantId),
        eq(combatParticipants.encounterId, encounterId)
      ));

    // Recalculate turn order
    await this.calculateTurnOrder(encounterId);
  }

  /**
   * End a combat encounter
   * @param encounterId - Combat encounter ID
   * @returns Updated encounter
   */
  static async endCombat(encounterId: string): Promise<CombatEncounter> {
    const [updated] = await db
      .update(combatEncounters)
      .set({
        status: 'completed',
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(combatEncounters.id, encounterId))
      .returning();

    if (!updated) {
      throw new InternalServerError('Failed to end combat encounter');
    }

    return updated;
  }

  /**
   * Get complete combat state
   * @param encounterId - Combat encounter ID
   * @returns Complete combat state with participants and turn order
   */
  static async getCombatState(encounterId: string): Promise<CombatState> {
    const encounter = await db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, encounterId),
    });

    if (!encounter) {
      throw new NotFoundError('Combat encounter', encounterId);
    }

    const participants = await db.query.combatParticipants.findMany({
      where: eq(combatParticipants.encounterId, encounterId),
      orderBy: asc(combatParticipants.turnOrder),
    });

    const currentParticipant = await this.getCurrentTurn(encounterId);

    // Build turn order entries
    const turnOrder: TurnOrderEntry[] = participants
      .filter(p => p.isActive)
      .map((participant, index) => ({
        participant,
        isCurrent: currentParticipant?.id === participant.id,
        hasGone: index < encounter.currentTurnOrder,
      }));

    return {
      encounter,
      participants,
      turnOrder,
      currentParticipant,
    };
  }

  /**
   * Get encounter by ID
   */
  static async getEncounterById(encounterId: string): Promise<CombatEncounter | undefined> {
    return await db.query.combatEncounters.findFirst({
      where: eq(combatEncounters.id, encounterId),
    });
  }

  /**
   * Get active encounter for a session
   */
  static async getActiveEncounter(sessionId: string): Promise<CombatEncounter | undefined> {
    return await db.query.combatEncounters.findFirst({
      where: and(
        eq(combatEncounters.sessionId, sessionId),
        eq(combatEncounters.status, 'active')
      ),
    });
  }

  /**
   * Remove a participant from combat
   */
  static async removeParticipant(participantId: string): Promise<void> {
    await db
      .update(combatParticipants)
      .set({ isActive: false })
      .where(eq(combatParticipants.id, participantId));
  }

  /**
   * Update participant HP
   * Note: HP is now tracked in combatParticipantStatus table
   */
  static async updateParticipantHP(
    participantId: string,
    hpCurrent: number
  ): Promise<void> {
    // This method needs to be updated to use combatParticipantStatus table
    // For now, this is a placeholder to maintain API compatibility
    throw new Error('updateParticipantHP needs to be implemented with combatParticipantStatus table');
  }
}
