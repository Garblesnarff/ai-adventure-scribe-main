/**
 * InitiativeTracker Component Tests
 *
 * Tests the Zustand-powered InitiativeTracker component to ensure:
 * - Correct rendering with combat state
 * - Proper use of granular selectors
 * - Next turn functionality
 * - No active combat state handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InitiativeTracker from '../InitiativeTracker';
import { useCombatStore } from '@/stores/useCombatStore';
import { CombatEncounter, CombatParticipant } from '@/types/combat';

// Mock the Zustand store
vi.mock('@/stores/useCombatStore', () => ({
  useCombatStore: vi.fn(),
  useParticipants: vi.fn(),
  useCurrentTurnParticipantId: vi.fn(),
  useCurrentRound: vi.fn(),
  useIsInCombat: vi.fn(),
  useActiveEncounter: vi.fn(),
}));

describe('InitiativeTracker', () => {
  const mockParticipant1: CombatParticipant = {
    id: 'p1',
    name: 'Warrior',
    participantType: 'player',
    initiative: 15,
    armorClass: 18,
    maxHitPoints: 50,
    currentHitPoints: 35,
    temporaryHitPoints: 0,
    speed: 30,
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
    activeConcentration: null,
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    fightingStyles: [],
    visionTypes: [],
    obscurement: 'clear',
    isHidden: false,
    stealthCheckBonus: 0,
  };

  const mockParticipant2: CombatParticipant = {
    id: 'p2',
    name: 'Goblin',
    participantType: 'enemy',
    initiative: 12,
    armorClass: 12,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    speed: 30,
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
    activeConcentration: null,
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    fightingStyles: [],
    visionTypes: [],
    obscurement: 'clear',
    isHidden: false,
    stealthCheckBonus: 0,
  };

  const mockEncounter: CombatEncounter = {
    id: 'encounter1',
    sessionId: 'session1',
    phase: 'active',
    currentRound: 3,
    currentTurnParticipantId: 'p1',
    participants: [mockParticipant1, mockParticipant2],
    actions: [],
    roundsElapsed: 3,
    startTime: new Date(),
    location: 'Test Location',
    environmentalEffects: [],
    visibility: 'clear',
  };

  const mockNextTurn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "No active combat" when not in combat', () => {
    // Mock store to return no combat state
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(false);
    useParticipants.mockReturnValue([]);
    useCurrentTurnParticipantId.mockReturnValue(undefined);
    useCurrentRound.mockReturnValue(0);
    useActiveEncounter.mockReturnValue(null);

    render(<InitiativeTracker />);

    expect(screen.getByText('No active combat')).toBeInTheDocument();
    expect(screen.getByText('Initiative Tracker')).toBeInTheDocument();
  });

  it('should render combat mode when in combat', () => {
    // Mock store to return active combat state
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    render(<InitiativeTracker />);

    expect(screen.getByText('COMBAT MODE')).toBeInTheDocument();
    expect(screen.getByText('Round 3')).toBeInTheDocument();
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByText('Goblin')).toBeInTheDocument();
  });

  it('should display elapsed time correctly', () => {
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    render(<InitiativeTracker />);

    // 3 rounds * 6 seconds = 18 seconds
    expect(screen.getByText('18 seconds elapsed')).toBeInTheDocument();
  });

  it('should call nextTurn when Next Turn button is clicked', () => {
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    render(<InitiativeTracker />);

    const nextTurnButton = screen.getByRole('button', { name: /next turn/i });
    fireEvent.click(nextTurnButton);

    expect(mockNextTurn).toHaveBeenCalledTimes(1);
  });

  it('should highlight current turn participant', () => {
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    const { container } = render(<InitiativeTracker />);

    // Check that the Warrior (current turn) has the amber highlight class
    const warriorRow = screen.getByText('Warrior').closest('div');
    expect(warriorRow?.className).toContain('bg-amber-100');
  });

  it('should display HP correctly', () => {
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    render(<InitiativeTracker />);

    // Check Warrior's HP
    expect(screen.getByText('35/50')).toBeInTheDocument();
    // Check Goblin's HP
    expect(screen.getByText('20/20')).toBeInTheDocument();
  });

  it('should render with onAddParticipant button when provided', () => {
    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue(mockEncounter.participants);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue(mockEncounter);

    const mockOnAdd = vi.fn();
    render(<InitiativeTracker onAddParticipant={mockOnAdd} />);

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it('should display action badges for current turn participant', () => {
    const participantWithActions: CombatParticipant = {
      ...mockParticipant1,
      actionTaken: true,
      bonusActionTaken: true,
      reactionTaken: false,
    };

    (useCombatStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes('nextTurn')) return mockNextTurn;
      return undefined;
    });

    const { useIsInCombat, useParticipants, useCurrentTurnParticipantId, useCurrentRound, useActiveEncounter } = require('@/stores/useCombatStore');
    useIsInCombat.mockReturnValue(true);
    useParticipants.mockReturnValue([participantWithActions, mockParticipant2]);
    useCurrentTurnParticipantId.mockReturnValue('p1');
    useCurrentRound.mockReturnValue(3);
    useActiveEncounter.mockReturnValue({
      ...mockEncounter,
      participants: [participantWithActions, mockParticipant2],
    });

    render(<InitiativeTracker />);

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Bonus')).toBeInTheDocument();
  });
});
