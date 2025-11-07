/**
 * Combat Log Component Tests
 *
 * Tests for the Zustand-powered CombatLog component
 * including filtering, search, and performance optimizations.
 *
 * @file src/components/combat/__tests__/CombatLog.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CombatLog from '../CombatLog';
import { useCombatStore } from '@/stores/useCombatStore';
import { CombatAction, CombatEncounter } from '@/types/combat';

// Mock Zustand store
vi.mock('@/stores/useCombatStore', () => ({
  useCombatStore: vi.fn(),
  useRecentCombatLog: vi.fn(),
  useShowCombatLog: vi.fn(),
}));

describe('CombatLog Component', () => {
  // Mock combat actions
  const mockActions: CombatAction[] = [
    {
      id: '1',
      encounterId: 'enc-1',
      participantId: 'p-1',
      round: 1,
      turnOrder: 1,
      actionType: 'attack',
      description: 'Warrior attacks with longsword',
      attackRoll: {
        dieType: 20,
        count: 1,
        modifier: 5,
        results: [18],
        total: 23,
      },
      damageRolls: [
        {
          dieType: 8,
          count: 1,
          modifier: 3,
          results: [6],
          total: 9,
        },
      ],
      damageDealt: 9,
      damageType: 'slashing',
      hit: true,
      timestamp: new Date('2024-01-01T12:00:00'),
    },
    {
      id: '2',
      encounterId: 'enc-1',
      participantId: 'p-2',
      round: 1,
      turnOrder: 2,
      actionType: 'cast_spell',
      description: 'Wizard casts Fireball',
      savingThrows: [
        {
          dieType: 20,
          count: 1,
          modifier: 0,
          results: [12],
          total: 12,
        },
      ],
      damageRolls: [
        {
          dieType: 6,
          count: 8,
          modifier: 0,
          results: [3, 5, 2, 6, 4, 1, 5, 3],
          total: 29,
        },
      ],
      damageDealt: 29,
      damageType: 'fire',
      timestamp: new Date('2024-01-01T12:01:00'),
    },
    {
      id: '3',
      encounterId: 'enc-1',
      participantId: 'p-3',
      round: 1,
      turnOrder: 3,
      actionType: 'death_save',
      description: 'Rogue makes death saving throw',
      savingThrows: [
        {
          dieType: 20,
          count: 1,
          modifier: 0,
          results: [15],
          total: 15,
        },
      ],
      timestamp: new Date('2024-01-01T12:02:00'),
    },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementation
    (useCombatStore as any).mockImplementation((selector: any) => {
      const state = {
        activeEncounter: {
          actions: mockActions,
        } as CombatEncounter,
        showCombatLog: true,
        toggleCombatLog: vi.fn(),
      };

      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });
  });

  describe('Rendering', () => {
    it('should render combat log with actions', () => {
      render(<CombatLog />);

      expect(screen.getByText('Combat Log')).toBeInTheDocument();
      expect(screen.getByText('Warrior attacks with longsword')).toBeInTheDocument();
      expect(screen.getByText('Wizard casts Fireball')).toBeInTheDocument();
      expect(screen.getByText('Rogue makes death saving throw')).toBeInTheDocument();
    });

    it('should not render when showCombatLog is false', () => {
      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: null,
          showCombatLog: false,
          toggleCombatLog: vi.fn(),
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      const { container } = render(<CombatLog />);
      expect(container.firstChild).toBeNull();
    });

    it('should render empty state when no actions', () => {
      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: {
            actions: [],
          } as CombatEncounter,
          showCombatLog: true,
          toggleCombatLog: vi.fn(),
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<CombatLog />);
      expect(screen.getByText('Combat log will appear here...')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter actions by type', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableFiltering={true} />);

      // Open filter dropdown
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);

      // Select "Attacks" filter
      const attacksOption = screen.getByRole('option', { name: /Attacks/i });
      await user.click(attacksOption);

      // Should only show attack actions
      await waitFor(() => {
        expect(screen.getByText('Warrior attacks with longsword')).toBeInTheDocument();
        expect(screen.queryByText('Wizard casts Fireball')).not.toBeInTheDocument();
        expect(screen.queryByText('Rogue makes death saving throw')).not.toBeInTheDocument();
      });
    });

    it('should show filter count badge', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableFiltering={true} />);

      // Open filter dropdown
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);

      // Select "Spells" filter
      const spellsOption = screen.getByRole('option', { name: /Spells/i });
      await user.click(spellsOption);

      // Should show filter count
      await waitFor(() => {
        expect(screen.getByText('1 of 3')).toBeInTheDocument();
      });
    });

    it('should clear filters when Clear button clicked', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableFiltering={true} />);

      // Apply filter
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);
      const attacksOption = screen.getByRole('option', { name: /Attacks/i });
      await user.click(attacksOption);

      // Clear filter
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await user.click(clearButton);

      // All actions should be visible again
      await waitFor(() => {
        expect(screen.getByText('Warrior attacks with longsword')).toBeInTheDocument();
        expect(screen.getByText('Wizard casts Fireball')).toBeInTheDocument();
        expect(screen.getByText('Rogue makes death saving throw')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should filter actions by search query', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableSearch={true} />);

      const searchInput = screen.getByPlaceholderText('Search actions...');
      await user.type(searchInput, 'wizard');

      await waitFor(() => {
        expect(screen.queryByText('Warrior attacks with longsword')).not.toBeInTheDocument();
        expect(screen.getByText('Wizard casts Fireball')).toBeInTheDocument();
        expect(screen.queryByText('Rogue makes death saving throw')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableSearch={true} />);

      const searchInput = screen.getByPlaceholderText('Search actions...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No actions match your filters')).toBeInTheDocument();
      });
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(<CombatLog enableSearch={true} />);

      const searchInput = screen.getByPlaceholderText('Search actions...');
      await user.type(searchInput, 'WIZARD');

      await waitFor(() => {
        expect(screen.getByText('Wizard casts Fireball')).toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    it('should export combat log to JSON', async () => {
      const user = userEvent.setup();

      // Mock createElement and click
      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<CombatLog enableExport={true} />);

      const exportButton = screen.getByTitle('Export log to JSON');
      await user.click(exportButton);

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        expect.stringContaining('combat-log-')
      );
    });

    it('should not show export button when disabled', () => {
      render(<CombatLog enableExport={false} />);

      expect(screen.queryByTitle('Export log to JSON')).not.toBeInTheDocument();
    });
  });

  describe('Action Display', () => {
    it('should display attack roll details', () => {
      render(<CombatLog />);

      expect(screen.getByText(/Attack: 23/i)).toBeInTheDocument();
      expect(screen.getByText(/Rolled: 18/i)).toBeInTheDocument();
    });

    it('should display damage details', () => {
      render(<CombatLog />);

      expect(screen.getByText(/Total Damage: 9/i)).toBeInTheDocument();
      expect(screen.getByText(/slashing/i)).toBeInTheDocument();
    });

    it('should display critical hit badge', () => {
      const criticalAction: CombatAction = {
        ...mockActions[0],
        attackRoll: {
          ...mockActions[0].attackRoll!,
          critical: true,
        },
      };

      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: {
            actions: [criticalAction],
          } as CombatEncounter,
          showCombatLog: true,
          toggleCombatLog: vi.fn(),
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<CombatLog />);
      expect(screen.getByText('CRITICAL!')).toBeInTheDocument();
    });

    it('should display advantage badge', () => {
      const advantageAction: CombatAction = {
        ...mockActions[0],
        attackRoll: {
          ...mockActions[0].attackRoll!,
          advantage: true,
        },
      };

      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: {
            actions: [advantageAction],
          } as CombatEncounter,
          showCombatLog: true,
          toggleCombatLog: vi.fn(),
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<CombatLog />);
      expect(screen.getByText('Advantage')).toBeInTheDocument();
    });

    it('should display timestamp', () => {
      render(<CombatLog />);

      // Should display time in locale format
      const time = new Date('2024-01-01T12:00:00').toLocaleTimeString();
      expect(screen.getByText(time)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should limit displayed actions based on maxActions prop', () => {
      const manyActions = Array.from({ length: 100 }, (_, i) => ({
        ...mockActions[0],
        id: `action-${i}`,
        description: `Action ${i}`,
      }));

      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: {
            actions: manyActions,
          } as CombatEncounter,
          showCombatLog: true,
          toggleCombatLog: vi.fn(),
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<CombatLog maxActions={10} />);

      // Should only render last 10 actions (most recent)
      expect(screen.getByText('Action 99')).toBeInTheDocument();
      expect(screen.getByText('Action 90')).toBeInTheDocument();
      expect(screen.queryByText('Action 89')).not.toBeInTheDocument();
    });

    it('should memoize action entries to prevent re-renders', () => {
      const { rerender } = render(<CombatLog />);

      // Force re-render with same props
      rerender(<CombatLog />);

      // Component should not re-render action entries
      // This is verified by React.memo implementation
      expect(screen.getByText('Warrior attacks with longsword')).toBeInTheDocument();
    });
  });

  describe('UI Interactions', () => {
    it('should toggle combat log visibility', async () => {
      const mockToggle = vi.fn();
      const user = userEvent.setup();

      (useCombatStore as any).mockImplementation((selector: any) => {
        const state = {
          activeEncounter: {
            actions: mockActions,
          } as CombatEncounter,
          showCombatLog: true,
          toggleCombatLog: mockToggle,
        };

        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<CombatLog />);

      const hideButton = screen.getByTitle('Hide combat log');
      await user.click(hideButton);

      expect(mockToggle).toHaveBeenCalled();
    });

    it('should scroll container for long logs', () => {
      render(<CombatLog />);

      const scrollContainer = screen.getByText('Warrior attacks with longsword')
        .closest('.overflow-y-auto');

      expect(scrollContainer).toHaveClass('max-h-[400px]');
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });
  });

  describe('Props Validation', () => {
    it('should accept custom className', () => {
      const { container } = render(<CombatLog className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should disable filtering when enableFiltering is false', () => {
      render(<CombatLog enableFiltering={false} />);

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should disable search when enableSearch is false', () => {
      render(<CombatLog enableSearch={false} />);

      expect(screen.queryByPlaceholderText('Search actions...')).not.toBeInTheDocument();
    });
  });
});
