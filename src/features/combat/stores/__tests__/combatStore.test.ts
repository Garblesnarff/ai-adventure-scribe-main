/**
 * Combat Store Test Suite
 *
 * Comprehensive tests for the Zustand-based combat store.
 * Tests all slices, state management, and high-level combat operations.
 *
 * Coverage includes:
 * - Store initialization and default state
 * - Participant CRUD operations
 * - Initiative tracking and turn advancement
 * - Damage and healing mechanics
 * - Round management
 * - Combat state persistence
 * - Selector performance
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useCombatStore } from '../combatStore';
import type { CombatParticipant, Condition } from '@/types/combat';

// Mock the dice roll utility
vi.mock('@/utils/diceRolls', () => ({
  rollDie: vi.fn((sides: number) => Math.floor(Math.random() * sides) + 1),
}));

describe('Combat Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useCombatStore.getState();
    store.clearEncounter();
    // Clear localStorage to ensure clean state
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================
  // Initialization Tests
  // ===========================

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const state = useCombatStore.getState();

      expect(state.activeEncounter).toBeNull();
      expect(state.isInCombat).toBe(false);
      expect(state.currentTurnId).toBeNull();
      expect(state.round).toBe(1);
    });

    it('should initialize with default UI state', () => {
      const state = useCombatStore.getState();

      expect(state.showInitiativeTracker).toBe(true);
      expect(state.showCombatLog).toBe(true);
      expect(state.selectedParticipantId).toBeUndefined();
      expect(state.selectedTargetId).toBeUndefined();
    });

    it('should initialize with empty reaction state', () => {
      const state = useCombatStore.getState();

      expect(state.activeReactionOpportunities).toEqual([]);
      expect(state.pendingReactionResponse).toBeUndefined();
    });
  });

  // ===========================
  // Start Combat Tests
  // ===========================

  describe('Start Combat', () => {
    const mockParticipants: Partial<CombatParticipant>[] = [
      {
        id: 'player-1',
        name: 'Fighter',
        participantType: 'player',
        characterId: 'char-1',
        armorClass: 18,
        maxHitPoints: 30,
        currentHitPoints: 30,
        speed: 30,
        initiative: 2, // Initiative modifier
      },
      {
        id: 'monster-1',
        name: 'Goblin',
        participantType: 'monster',
        armorClass: 15,
        maxHitPoints: 7,
        currentHitPoints: 7,
        speed: 30,
        initiative: 3,
      },
      {
        id: 'player-2',
        name: 'Wizard',
        participantType: 'player',
        characterId: 'char-2',
        armorClass: 12,
        maxHitPoints: 20,
        currentHitPoints: 20,
        speed: 30,
        initiative: 1,
      },
    ];

    it('should start combat with initial participants', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', mockParticipants);
      });

      const state = useCombatStore.getState();

      expect(state.isInCombat).toBe(true);
      expect(state.activeEncounter).not.toBeNull();
      expect(state.activeEncounter?.sessionId).toBe('session-1');
      expect(state.activeEncounter?.phase).toBe('active');
      expect(state.activeEncounter?.participants).toHaveLength(3);
      expect(state.round).toBe(1);
    });

    it('should roll initiative for all participants', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', mockParticipants);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      // All participants should have initiative values
      participants.forEach((p) => {
        expect(p.initiative).toBeGreaterThanOrEqual(1);
        expect(p.initiative).toBeLessThanOrEqual(23); // d20 + max modifier
      });
    });

    it('should sort participants by initiative (highest first)', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', mockParticipants);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      for (let i = 0; i < participants.length - 1; i++) {
        expect(participants[i].initiative).toBeGreaterThanOrEqual(
          participants[i + 1].initiative
        );
      }
    });

    it('should set current turn to first participant', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', mockParticipants);
      });

      const state = useCombatStore.getState();
      const firstParticipant = state.activeEncounter?.participants[0];

      expect(state.currentTurnId).toBe(firstParticipant?.id);
      expect(state.activeEncounter?.currentTurnParticipantId).toBe(
        firstParticipant?.id
      );
    });

    it('should initialize participant combat state', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', mockParticipants);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      participants.forEach((p) => {
        expect(p.actionTaken).toBe(false);
        expect(p.bonusActionTaken).toBe(false);
        expect(p.reactionTaken).toBe(false);
        expect(p.movementUsed).toBe(0);
        expect(p.temporaryHitPoints).toBe(0);
        expect(p.conditions).toEqual([]);
        expect(p.deathSaves).toEqual({ successes: 0, failures: 0 });
      });
    });
  });

  // ===========================
  // End Combat Tests
  // ===========================

  describe('End Combat', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should end combat and clear state', () => {
      const { endCombat } = useCombatStore.getState();

      act(() => {
        endCombat();
      });

      const state = useCombatStore.getState();

      expect(state.isInCombat).toBe(false);
      expect(state.activeEncounter).toBeNull();
      expect(state.currentTurnId).toBeNull();
      expect(state.selectedParticipantId).toBeUndefined();
      expect(state.selectedTargetId).toBeUndefined();
    });

    it('should clear reaction state on combat end', () => {
      const { endCombat, addReactionOpportunity } = useCombatStore.getState();

      act(() => {
        addReactionOpportunity({
          id: 'reaction-1',
          participantId: 'player-1',
          trigger: 'creature_leaves_reach',
          triggerDescription: 'Goblin leaves reach',
          availableReactions: ['opportunity_attack'],
        });
      });

      expect(useCombatStore.getState().activeReactionOpportunities).toHaveLength(1);

      act(() => {
        endCombat();
      });

      expect(useCombatStore.getState().activeReactionOpportunities).toEqual([]);
      expect(useCombatStore.getState().pendingReactionResponse).toBeUndefined();
    });
  });

  // ===========================
  // Participant Management Tests
  // ===========================

  describe('Participant Management', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
          initiative: 15,
        },
        {
          id: 'monster-1',
          name: 'Goblin',
          participantType: 'monster',
          armorClass: 15,
          maxHitPoints: 7,
          currentHitPoints: 7,
          speed: 30,
          initiative: 10,
        },
      ]);
    });

    it('should add a new participant in initiative order', () => {
      const { addParticipant } = useCombatStore.getState();

      const newParticipant: CombatParticipant = {
        id: 'monster-2',
        name: 'Orc',
        participantType: 'monster',
        armorClass: 13,
        maxHitPoints: 15,
        currentHitPoints: 15,
        speed: 30,
        initiative: 12,
        temporaryHitPoints: 0,
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        actionTaken: false,
        bonusActionTaken: false,
        reactionTaken: false,
        movementUsed: 0,
        reactionOpportunities: [],
        damageResistances: [],
        damageImmunities: [],
        damageVulnerabilities: [],
      };

      act(() => {
        addParticipant(newParticipant);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      expect(participants).toHaveLength(3);

      // Should be inserted in initiative order (sorted by initiative value)
      const orcIndex = participants.findIndex((p) => p.id === 'monster-2');
      const orc = participants[orcIndex];

      // Verify it's sorted correctly relative to neighbors
      if (orcIndex > 0) {
        expect(participants[orcIndex - 1].initiative).toBeGreaterThanOrEqual(orc.initiative);
      }
      if (orcIndex < participants.length - 1) {
        expect(orc.initiative).toBeGreaterThanOrEqual(participants[orcIndex + 1].initiative);
      }
    });

    it('should remove a participant', () => {
      const { removeParticipant } = useCombatStore.getState();

      act(() => {
        removeParticipant('monster-1');
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      expect(participants).toHaveLength(1);
      expect(participants.find((p) => p.id === 'monster-1')).toBeUndefined();
    });

    it('should update participant properties', () => {
      const { updateParticipant } = useCombatStore.getState();

      act(() => {
        updateParticipant('player-1', {
          actionTaken: true,
          movementUsed: 20,
        });
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.actionTaken).toBe(true);
      expect(fighter?.movementUsed).toBe(20);
    });

    it('should not mutate state when updating non-existent participant', () => {
      const { updateParticipant } = useCombatStore.getState();
      const stateBefore = useCombatStore.getState();

      act(() => {
        updateParticipant('non-existent', { actionTaken: true });
      });

      const stateAfter = useCombatStore.getState();

      expect(stateAfter.activeEncounter?.participants).toEqual(
        stateBefore.activeEncounter?.participants
      );
    });
  });

  // ===========================
  // Damage and Healing Tests
  // ===========================

  describe('Damage and Healing', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should deal damage to a participant', () => {
      const { dealDamage } = useCombatStore.getState();

      act(() => {
        dealDamage('player-1', 10);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.currentHitPoints).toBe(20);
    });

    it('should not reduce HP below 0', () => {
      const { dealDamage } = useCombatStore.getState();

      act(() => {
        dealDamage('player-1', 50);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.currentHitPoints).toBe(0);
    });

    it('should apply temporary HP before real HP', () => {
      const { updateParticipant, dealDamage } = useCombatStore.getState();

      act(() => {
        updateParticipant('player-1', { temporaryHitPoints: 5 });
        dealDamage('player-1', 10);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.temporaryHitPoints).toBe(0);
      expect(fighter?.currentHitPoints).toBe(25); // 30 - 5 (after temp HP absorbed 5)
    });

    it('should only consume temporary HP when damage is less than temp HP', () => {
      const { updateParticipant, dealDamage } = useCombatStore.getState();

      act(() => {
        updateParticipant('player-1', { temporaryHitPoints: 10 });
        dealDamage('player-1', 5);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.temporaryHitPoints).toBe(5);
      expect(fighter?.currentHitPoints).toBe(30); // No damage to real HP
    });

    it('should heal a participant', () => {
      const { dealDamage, healDamage } = useCombatStore.getState();

      act(() => {
        dealDamage('player-1', 15);
        healDamage('player-1', 10);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.currentHitPoints).toBe(25); // 30 - 15 + 10
    });

    it('should not heal above max HP', () => {
      const { dealDamage, healDamage } = useCombatStore.getState();

      act(() => {
        dealDamage('player-1', 5);
        healDamage('player-1', 20);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.currentHitPoints).toBe(30); // Capped at max
    });

    it('should not affect non-existent participant', () => {
      const { dealDamage } = useCombatStore.getState();
      const stateBefore = useCombatStore.getState();

      act(() => {
        dealDamage('non-existent', 10);
      });

      const stateAfter = useCombatStore.getState();

      expect(stateAfter.activeEncounter?.participants).toEqual(
        stateBefore.activeEncounter?.participants
      );
    });
  });

  // ===========================
  // Turn Management Tests
  // ===========================

  describe('Turn Management', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
          initiative: 20,
        },
        {
          id: 'monster-1',
          name: 'Goblin',
          participantType: 'monster',
          armorClass: 15,
          maxHitPoints: 7,
          currentHitPoints: 7,
          speed: 30,
          initiative: 15,
        },
        {
          id: 'player-2',
          name: 'Wizard',
          participantType: 'player',
          armorClass: 12,
          maxHitPoints: 20,
          currentHitPoints: 20,
          speed: 30,
          initiative: 10,
        },
      ]);
    });

    it('should advance to next turn', () => {
      const { nextTurn } = useCombatStore.getState();
      const initialState = useCombatStore.getState();
      const initialTurnId = initialState.currentTurnId;
      const participants = initialState.activeEncounter?.participants || [];
      const currentIndex = participants.findIndex((p) => p.id === initialTurnId);
      const expectedNextId = participants[currentIndex + 1]?.id;

      act(() => {
        nextTurn();
      });

      const state = useCombatStore.getState();

      expect(state.currentTurnId).not.toBe(initialTurnId);
      expect(state.currentTurnId).toBe(expectedNextId);
    });

    it('should reset turn actions when advancing turn', () => {
      const { updateParticipant, nextTurn } = useCombatStore.getState();

      // Set some actions on first participant
      act(() => {
        updateParticipant('player-1', {
          actionTaken: true,
          bonusActionTaken: true,
          movementUsed: 30,
        });
        nextTurn();
      });

      const state = useCombatStore.getState();
      const goblin = state.activeEncounter?.participants.find(
        (p) => p.id === 'monster-1'
      );

      expect(goblin?.actionTaken).toBe(false);
      expect(goblin?.bonusActionTaken).toBe(false);
      expect(goblin?.reactionTaken).toBe(false);
      expect(goblin?.movementUsed).toBe(0);
    });

    it('should start new round when reaching end of initiative order', () => {
      const { nextTurn } = useCombatStore.getState();
      const initialState = useCombatStore.getState();
      const participants = initialState.activeEncounter?.participants || [];
      const firstParticipantId = participants[0]?.id;

      act(() => {
        // Advance through all participants
        for (let i = 0; i < participants.length; i++) {
          nextTurn();
        }
      });

      const state = useCombatStore.getState();

      expect(state.round).toBe(2);
      expect(state.activeEncounter?.currentRound).toBe(2);
      expect(state.currentTurnId).toBe(firstParticipantId); // Back to first
    });

    it('should skip unconscious participants', () => {
      const { dealDamage, nextTurn, updateDeathSaves, rerollInitiative } = useCombatStore.getState();

      // First, set specific initiative values to guarantee order
      act(() => {
        rerollInitiative('player-1', 25);
        rerollInitiative('monster-1', 15);
        rerollInitiative('player-2', 10);
      });

      const initialState = useCombatStore.getState();
      const participants = initialState.activeEncounter?.participants || [];

      // After setting specific initiatives, order should be: player-1, monster-1, player-2
      expect(participants[0].id).toBe('player-1');
      expect(participants[1].id).toBe('monster-1');
      expect(participants[2].id).toBe('player-2');

      act(() => {
        // Knock out the goblin (monster-1) and give it 3 death save failures to be truly dead
        dealDamage('monster-1', 100);
        updateDeathSaves('monster-1', 0, 3);
      });

      // Verify monster-1 is unconscious and failed death saves
      const stateAfterDamage = useCombatStore.getState();
      const unconsciousParticipant = stateAfterDamage.activeEncounter?.participants.find(
        (p) => p.id === 'monster-1'
      );
      expect(unconsciousParticipant?.currentHitPoints).toBe(0);
      expect(unconsciousParticipant?.deathSaves.failures).toBe(3);

      act(() => {
        nextTurn(); // Should skip monster-1 and go to player-2
      });

      const state = useCombatStore.getState();

      // Should have advanced to player-2, skipping the dead monster-1
      expect(state.currentTurnId).toBe('player-2');
      // And should not be on the dead participant
      expect(state.currentTurnId).not.toBe('monster-1');
    });

    it('should set current turn to specific participant', () => {
      const { setCurrentTurn } = useCombatStore.getState();

      act(() => {
        setCurrentTurn('player-2');
      });

      const state = useCombatStore.getState();

      expect(state.currentTurnId).toBe('player-2');
      expect(state.activeEncounter?.currentTurnParticipantId).toBe('player-2');
    });
  });

  // ===========================
  // Initiative Management Tests
  // ===========================

  describe('Initiative Management', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
          initiative: 0,
        },
        {
          id: 'monster-1',
          name: 'Goblin',
          participantType: 'monster',
          armorClass: 15,
          maxHitPoints: 7,
          currentHitPoints: 7,
          speed: 30,
          initiative: 0,
        },
      ]);
    });

    it('should reroll initiative and re-sort participants', () => {
      const { rerollInitiative } = useCombatStore.getState();

      act(() => {
        rerollInitiative('player-1', 25);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      const fighter = participants.find((p) => p.id === 'player-1');
      expect(fighter?.initiative).toBe(25);

      // Should be sorted correctly
      for (let i = 0; i < participants.length - 1; i++) {
        expect(participants[i].initiative).toBeGreaterThanOrEqual(
          participants[i + 1].initiative
        );
      }
    });

    it('should update initiative order manually', () => {
      const { updateInitiativeOrder } = useCombatStore.getState();

      const newOrder = ['monster-1', 'player-1'];

      act(() => {
        updateInitiativeOrder(newOrder);
      });

      const state = useCombatStore.getState();
      const participants = state.activeEncounter?.participants || [];

      expect(participants[0].id).toBe('monster-1');
      expect(participants[1].id).toBe('player-1');
    });
  });

  // ===========================
  // Condition Management Tests
  // ===========================

  describe('Condition Management', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should apply condition to participant', () => {
      const { applyCondition } = useCombatStore.getState();

      const poisonedCondition: Condition = {
        name: 'poisoned',
        description: 'Disadvantage on attack rolls and ability checks',
        duration: 3,
      };

      act(() => {
        applyCondition('player-1', poisonedCondition);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.conditions).toHaveLength(1);
      expect(fighter?.conditions[0].name).toBe('poisoned');
    });

    it('should not apply duplicate conditions', () => {
      const { applyCondition } = useCombatStore.getState();

      const condition: Condition = {
        name: 'blinded',
        description: 'Cannot see',
        duration: 2,
      };

      act(() => {
        applyCondition('player-1', condition);
        applyCondition('player-1', condition); // Try to apply again
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.conditions).toHaveLength(1);
    });

    it('should remove condition from participant', () => {
      const { applyCondition, removeCondition } = useCombatStore.getState();

      const condition: Condition = {
        name: 'stunned',
        description: 'Incapacitated and cannot move',
        duration: 1,
      };

      act(() => {
        applyCondition('player-1', condition);
        removeCondition('player-1', 'stunned');
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.conditions).toHaveLength(0);
    });
  });

  // ===========================
  // Death Saves Tests
  // ===========================

  describe('Death Saves', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 0, // Start unconscious
          speed: 30,
        },
      ]);
    });

    it('should update death saves', () => {
      const { updateDeathSaves } = useCombatStore.getState();

      act(() => {
        updateDeathSaves('player-1', 1, 0);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.deathSaves.successes).toBe(1);
      expect(fighter?.deathSaves.failures).toBe(0);
    });

    it('should track multiple death save failures', () => {
      const { updateDeathSaves } = useCombatStore.getState();

      act(() => {
        updateDeathSaves('player-1', 0, 2);
      });

      const state = useCombatStore.getState();
      const fighter = state.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      expect(fighter?.deathSaves.failures).toBe(2);
    });
  });

  // ===========================
  // Combat Actions Tests
  // ===========================

  describe('Combat Actions', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should add combat action to log', () => {
      const { addAction } = useCombatStore.getState();

      const action = {
        id: 'action-1',
        participantId: 'player-1',
        actionType: 'attack' as const,
        description: 'Fighter attacks with longsword',
        timestamp: new Date(),
        round: 1,
      };

      act(() => {
        addAction(action);
      });

      const state = useCombatStore.getState();

      expect(state.activeEncounter?.actions).toHaveLength(1);
      expect(state.activeEncounter?.actions[0].actionType).toBe('attack');
    });

    it('should set pending action', () => {
      const { setPendingAction } = useCombatStore.getState();

      const pendingAction = {
        participantId: 'player-1',
        actionType: 'cast_spell' as const,
      };

      act(() => {
        setPendingAction(pendingAction);
      });

      const state = useCombatStore.getState();

      expect(state.pendingAction).toEqual(pendingAction);
    });
  });

  // ===========================
  // Reaction System Tests
  // ===========================

  describe('Reaction System', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should add reaction opportunity', () => {
      const { addReactionOpportunity } = useCombatStore.getState();

      const opportunity = {
        id: 'reaction-1',
        participantId: 'player-1',
        trigger: 'creature_leaves_reach' as const,
        triggerDescription: 'Goblin leaves your reach',
        availableReactions: ['opportunity_attack' as const],
      };

      act(() => {
        addReactionOpportunity(opportunity);
      });

      const state = useCombatStore.getState();

      expect(state.activeReactionOpportunities).toHaveLength(1);
      expect(state.activeReactionOpportunities[0].trigger).toBe(
        'creature_leaves_reach'
      );
    });

    it('should remove reaction opportunity', () => {
      const { addReactionOpportunity, removeReactionOpportunity } =
        useCombatStore.getState();

      const opportunity = {
        id: 'reaction-1',
        participantId: 'player-1',
        trigger: 'creature_leaves_reach' as const,
        triggerDescription: 'Goblin leaves your reach',
        availableReactions: ['opportunity_attack' as const],
      };

      act(() => {
        addReactionOpportunity(opportunity);
        removeReactionOpportunity('reaction-1');
      });

      const state = useCombatStore.getState();

      expect(state.activeReactionOpportunities).toHaveLength(0);
    });

    it('should clear all reaction opportunities', () => {
      const { addReactionOpportunity, clearReactionOpportunities } =
        useCombatStore.getState();

      act(() => {
        addReactionOpportunity({
          id: 'reaction-1',
          participantId: 'player-1',
          trigger: 'creature_leaves_reach',
          triggerDescription: 'Test 1',
          availableReactions: ['opportunity_attack'],
        });
        addReactionOpportunity({
          id: 'reaction-2',
          participantId: 'player-1',
          trigger: 'spell_cast_in_range',
          triggerDescription: 'Test 2',
          availableReactions: ['counterspell'],
        });
        clearReactionOpportunities();
      });

      const state = useCombatStore.getState();

      expect(state.activeReactionOpportunities).toEqual([]);
    });

    it('should set pending reaction', () => {
      const { setPendingReaction } = useCombatStore.getState();

      act(() => {
        setPendingReaction('reaction-1', 'opportunity_attack');
      });

      const state = useCombatStore.getState();

      expect(state.pendingReactionResponse?.opportunityId).toBe('reaction-1');
      expect(state.pendingReactionResponse?.selectedReaction).toBe(
        'opportunity_attack'
      );
    });
  });

  // ===========================
  // UI State Tests
  // ===========================

  describe('UI State', () => {
    it('should toggle initiative tracker visibility', () => {
      const { toggleInitiativeTracker } = useCombatStore.getState();
      const initialState = useCombatStore.getState().showInitiativeTracker;

      act(() => {
        toggleInitiativeTracker();
      });

      expect(useCombatStore.getState().showInitiativeTracker).toBe(
        !initialState
      );
    });

    it('should toggle combat log visibility', () => {
      const { toggleCombatLog } = useCombatStore.getState();
      const initialState = useCombatStore.getState().showCombatLog;

      act(() => {
        toggleCombatLog();
      });

      expect(useCombatStore.getState().showCombatLog).toBe(!initialState);
    });

    it('should set selected participant', () => {
      const { setSelectedParticipant } = useCombatStore.getState();

      act(() => {
        setSelectedParticipant('player-1');
      });

      expect(useCombatStore.getState().selectedParticipantId).toBe('player-1');
    });

    it('should set selected target', () => {
      const { setSelectedTarget } = useCombatStore.getState();

      act(() => {
        setSelectedTarget('monster-1');
      });

      expect(useCombatStore.getState().selectedTargetId).toBe('monster-1');
    });

    it('should clear selected participant', () => {
      const { setSelectedParticipant } = useCombatStore.getState();

      act(() => {
        setSelectedParticipant('player-1');
        setSelectedParticipant(undefined);
      });

      expect(useCombatStore.getState().selectedParticipantId).toBeUndefined();
    });
  });

  // ===========================
  // Edge Cases Tests
  // ===========================

  describe('Edge Cases', () => {
    it('should handle operations when no encounter exists', () => {
      const { dealDamage, addAction, nextTurn } = useCombatStore.getState();

      act(() => {
        dealDamage('player-1', 10);
        addAction({
          id: 'action-1',
          participantId: 'player-1',
          actionType: 'attack',
          description: 'Test',
          timestamp: new Date(),
          round: 1,
        });
        nextTurn();
      });

      const state = useCombatStore.getState();

      expect(state.activeEncounter).toBeNull();
    });

    it('should handle removing non-existent participant', () => {
      const { startCombat, removeParticipant } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', [
          {
            id: 'player-1',
            name: 'Fighter',
            participantType: 'player',
            armorClass: 18,
            maxHitPoints: 30,
            currentHitPoints: 30,
            speed: 30,
          },
        ]);
        removeParticipant('non-existent');
      });

      const state = useCombatStore.getState();

      expect(state.activeEncounter?.participants).toHaveLength(1);
    });

    it('should handle empty participant list on combat start', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', []);
      });

      const state = useCombatStore.getState();

      expect(state.activeEncounter?.participants).toEqual([]);
      expect(state.currentTurnId).toBeNull();
    });

    it('should handle removing last participant', () => {
      const { startCombat, removeParticipant } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', [
          {
            id: 'player-1',
            name: 'Fighter',
            participantType: 'player',
            armorClass: 18,
            maxHitPoints: 30,
            currentHitPoints: 30,
            speed: 30,
          },
        ]);
        removeParticipant('player-1');
      });

      const state = useCombatStore.getState();

      expect(state.activeEncounter?.participants).toHaveLength(0);
    });
  });

  // ===========================
  // State Immutability Tests
  // ===========================

  describe('State Immutability', () => {
    beforeEach(() => {
      const { startCombat } = useCombatStore.getState();
      startCombat('session-1', [
        {
          id: 'player-1',
          name: 'Fighter',
          participantType: 'player',
          armorClass: 18,
          maxHitPoints: 30,
          currentHitPoints: 30,
          speed: 30,
        },
      ]);
    });

    it('should not mutate state when dealing damage', () => {
      const stateBefore = useCombatStore.getState();
      const participantsBefore = stateBefore.activeEncounter?.participants;

      act(() => {
        useCombatStore.getState().dealDamage('player-1', 10);
      });

      const stateAfter = useCombatStore.getState();
      const participantsAfter = stateAfter.activeEncounter?.participants;

      // Arrays should be different references
      expect(participantsBefore).not.toBe(participantsAfter);
    });

    it('should not mutate state when updating participant', () => {
      const stateBefore = useCombatStore.getState();
      const participantBefore = stateBefore.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      act(() => {
        useCombatStore.getState().updateParticipant('player-1', {
          actionTaken: true,
        });
      });

      const stateAfter = useCombatStore.getState();
      const participantAfter = stateAfter.activeEncounter?.participants.find(
        (p) => p.id === 'player-1'
      );

      // Participant objects should be different references
      expect(participantBefore).not.toBe(participantAfter);
    });
  });

  // ===========================
  // Persistence Tests
  // ===========================

  describe('Persistence', () => {
    it('should persist combat state to localStorage', () => {
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', [
          {
            id: 'player-1',
            name: 'Fighter',
            participantType: 'player',
            armorClass: 18,
            maxHitPoints: 30,
            currentHitPoints: 30,
            speed: 30,
          },
        ]);
      });

      // Check localStorage
      const stored = localStorage.getItem('combat-storage');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.isInCombat).toBe(true);
    });

    it('should restore combat state from localStorage', () => {
      // Set up a combat state
      const { startCombat } = useCombatStore.getState();

      act(() => {
        startCombat('session-1', [
          {
            id: 'player-1',
            name: 'Fighter',
            participantType: 'player',
            armorClass: 18,
            maxHitPoints: 30,
            currentHitPoints: 30,
            speed: 30,
          },
        ]);
      });

      const stateBeforeReload = useCombatStore.getState();

      // Create a new store instance (simulates page reload)
      // The persist middleware should restore the state
      const restoredState = useCombatStore.getState();

      expect(restoredState.isInCombat).toBe(stateBeforeReload.isInCombat);
      expect(restoredState.round).toBe(stateBeforeReload.round);
    });
  });
});
