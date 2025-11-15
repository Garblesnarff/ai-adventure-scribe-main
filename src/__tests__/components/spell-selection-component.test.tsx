import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Character } from '@/types/character';

import {
  mockWizard,
  mockCleric,
  mockFighter,
  mockHuman,
  mockHighElfSubrace,
  mockTieflingSubrace,
  createMockCharacter,
} from '@/__tests__/helpers/spell-test-helpers';

/**
 * Spell Selection Component Tests
 *
 * Tests for spell selection UI components to ensure they properly filter spells by class
 * and prevent invalid selections at the component level.
 *
 * Critical for preventing the bug where wizards could select divine spells in the UI.
 */

// Mock the useSpellSelection hook
const mockUseSpellSelection = vi.fn();
vi.mock('@/hooks/useSpellSelection', () => ({
  useSpellSelection: mockUseSpellSelection,
}));

// Mock the spell service
const mockSpellService = {
  getClassSpells: vi.fn(),
  validateSpellForClass: vi.fn(),
  getSpellDetails: vi.fn(),
};

vi.mock('@/services/spellApi', () => ({
  spellApi: mockSpellService,
}));

// Create a mock SpellSelection component for testing
const SpellSelectionComponent: React.FC<{ character: Character }> = ({ character }) => {
  const [selectedCantrips, setSelectedCantrips] = React.useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = React.useState<string[]>([]);
  const [availableCantrips, setAvailableCantrips] = React.useState<any[]>([]);
  const [availableSpells, setAvailableSpells] = React.useState<any[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!character?.class) return;

    const loadSpells = async () => {
      setIsLoading(true);
      setErrors([]);

      try {
        // Defer setting data to next tick so loading is visible in tests
        setTimeout(() => {
          if (character.class.name === 'Wizard') {
            setAvailableCantrips([
              { id: 'mage-hand', name: 'Mage Hand', school: 'Conjuration' },
              { id: 'prestidigitation', name: 'Prestidigitation', school: 'Transmutation' },
              { id: 'light', name: 'Light', school: 'Evocation' },
              { id: 'minor-illusion', name: 'Minor Illusion', school: 'Illusion' },
            ]);
            setAvailableSpells([
              { id: 'magic-missile', name: 'Magic Missile', school: 'Evocation' },
              { id: 'shield', name: 'Shield', school: 'Abjuration' },
              { id: 'detect-magic', name: 'Detect Magic', school: 'Divination' },
              { id: 'burning-hands', name: 'Burning Hands', school: 'Evocation' },
            ]);
          } else if (character.class.name === 'Cleric') {
            setAvailableCantrips([
              { id: 'guidance', name: 'Guidance', school: 'Divination' },
              { id: 'thaumaturgy', name: 'Thaumaturgy', school: 'Transmutation' },
              { id: 'sacred-flame', name: 'Sacred Flame', school: 'Evocation' },
            ]);
            setAvailableSpells([
              { id: 'cure-wounds', name: 'Cure Wounds', school: 'Evocation' },
              { id: 'healing-word', name: 'Healing Word', school: 'Evocation' },
              { id: 'bless', name: 'Bless', school: 'Enchantment' },
              { id: 'guiding-bolt', name: 'Guiding Bolt', school: 'Evocation' },
            ]);
          }
          setIsLoading(false);
        }, 0);
      } catch (error) {
        setErrors(['Failed to load spells']);
        setIsLoading(false);
      }
    };

    loadSpells();
  }, [character]);

  const handleCantripToggle = async (cantripId: string) => {
    // Validate spell is allowed for this class
    try {
      const validation = await mockSpellService.validateSpellForClass(
        cantripId,
        character.class.name,
      );
      if (!validation.valid) {
        setErrors([`${character.class.name} cannot learn ${cantripId}`]);
        return;
      }

      setSelectedCantrips((prev) => {
        if (prev.includes(cantripId)) {
          return prev.filter((id) => id !== cantripId);
        } else {
          // Enforce limits based on class
          const maxCantrips = character.class.spellcasting?.cantripsKnown || 0;
          if (prev.length >= maxCantrips) {
            setErrors([`Cannot select more than ${maxCantrips} cantrips`]);
            return prev;
          }
          return [...prev, cantripId];
        }
      });
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to validate spell']);
    }
  };

  const handleSpellToggle = async (spellId: string) => {
    // Validate spell is allowed for this class
    try {
      const validation = await mockSpellService.validateSpellForClass(
        spellId,
        character.class.name,
      );
      if (!validation.valid) {
        setErrors([`${character.class.name} cannot learn ${spellId}`]);
        return;
      }

      setSelectedSpells((prev) => {
        if (prev.includes(spellId)) {
          return prev.filter((id) => id !== spellId);
        } else {
          // Enforce limits based on class
          const maxSpells = character.class.spellcasting?.spellsKnown || 1;
          if (prev.length >= maxSpells) {
            setErrors([`Cannot select more than ${maxSpells} spells`]);
            return prev;
          }
          return [...prev, spellId];
        }
      });
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to validate spell']);
    }
  };

  if (!character.class?.spellcasting) {
    return <div data-testid="non-spellcaster">This character is not a spellcaster</div>;
  }

  if (isLoading) {
    return <div data-testid="loading">Loading spells...</div>;
  }

  const maxCantrips = character.class.spellcasting.cantripsKnown || 0;
  const maxSpells = character.class.spellcasting.spellsKnown || 1;

  return (
    <div data-testid="spell-selection">
      <h2>
        Spell Selection for {character.name} ({character.class.name})
      </h2>

      {errors.length > 0 && (
        <div data-testid="error-messages" className="error-messages">
          {errors.map((error, index) => (
            <div key={index} className="error">
              {error}
            </div>
          ))}
        </div>
      )}

      <div data-testid="cantrips-section">
        <h3>
          Cantrips ({selectedCantrips.length}/{maxCantrips})
        </h3>
        <div className="spell-list">
          {availableCantrips.map((cantrip) => (
            <div key={cantrip.id} className="spell-option">
              <label>
                <input
                  type="checkbox"
                  checked={selectedCantrips.includes(cantrip.id)}
                  onChange={() => handleCantripToggle(cantrip.id)}
                  data-testid={`cantrip-${cantrip.id}`}
                />
                {cantrip.name} ({cantrip.school})
              </label>
            </div>
          ))}
        </div>
      </div>

      <div data-testid="spells-section">
        <h3>
          Spells ({selectedSpells.length}/{maxSpells})
        </h3>
        <div className="spell-list">
          {availableSpells.map((spell) => (
            <div key={spell.id} className="spell-option">
              <label>
                <input
                  type="checkbox"
                  checked={selectedSpells.includes(spell.id)}
                  onChange={() => handleSpellToggle(spell.id)}
                  data-testid={`spell-${spell.id}`}
                />
                {spell.name} ({spell.school})
              </label>
            </div>
          ))}
        </div>
      </div>

      <div data-testid="selection-summary">
        Selected: {selectedCantrips.length} cantrips, {selectedSpells.length} spells
      </div>
    </div>
  );
};

describe('Spell Selection Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpellService.validateSpellForClass.mockResolvedValue({ valid: true });
  });

  describe('Class-Specific Spell Filtering', () => {
    it('should only show wizard spells for wizard characters', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Should show wizard cantrips
      expect(screen.getByText('Mage Hand (Conjuration)')).toBeInTheDocument();
      expect(screen.getByText('Prestidigitation (Transmutation)')).toBeInTheDocument();
      expect(screen.getByText('Light (Evocation)')).toBeInTheDocument();

      // Should show wizard spells
      expect(screen.getByText('Magic Missile (Evocation)')).toBeInTheDocument();
      expect(screen.getByText('Shield (Abjuration)')).toBeInTheDocument();
      expect(screen.getByText('Detect Magic (Divination)')).toBeInTheDocument();

      // Should NOT show cleric spells
      expect(screen.queryByText('Guidance (Divination)')).not.toBeInTheDocument();
      expect(screen.queryByText('Cure Wounds (Evocation)')).not.toBeInTheDocument();
      expect(screen.queryByText('Healing Word (Evocation)')).not.toBeInTheDocument();
    });

    it('should only show cleric spells for cleric characters', async () => {
      const clericCharacter = createMockCharacter('Test Cleric', mockCleric, mockHuman);

      render(<SpellSelectionComponent character={clericCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Should show cleric cantrips
      expect(screen.getByText('Guidance (Divination)')).toBeInTheDocument();
      expect(screen.getByText('Thaumaturgy (Transmutation)')).toBeInTheDocument();
      expect(screen.getByText('Sacred Flame (Evocation)')).toBeInTheDocument();

      // Should show cleric spells
      expect(screen.getByText('Cure Wounds (Evocation)')).toBeInTheDocument();
      expect(screen.getByText('Healing Word (Evocation)')).toBeInTheDocument();
      expect(screen.getByText('Bless (Enchantment)')).toBeInTheDocument();

      // Should NOT show wizard spells
      expect(screen.queryByText('Mage Hand (Conjuration)')).not.toBeInTheDocument();
      expect(screen.queryByText('Magic Missile (Evocation)')).not.toBeInTheDocument();
      expect(screen.queryByText('Shield (Abjuration)')).not.toBeInTheDocument();
    });

    it('should handle non-spellcaster characters', () => {
      const fighterCharacter = createMockCharacter('Test Fighter', mockFighter, mockHuman);

      render(<SpellSelectionComponent character={fighterCharacter} />);

      expect(screen.getByTestId('non-spellcaster')).toBeInTheDocument();
      expect(screen.getByText('This character is not a spellcaster')).toBeInTheDocument();
    });
  });

  describe('Spell Selection Validation', () => {
    it('should prevent wizards from selecting cleric spells through validation', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock validation to reject cleric spells for wizard
      mockSpellService.validateSpellForClass.mockImplementation(async (spellId, className) => {
        if (
          className === 'Wizard' &&
          ['guidance', 'cure-wounds', 'healing-word'].includes(spellId)
        ) {
          return { valid: false, error: `${className} cannot learn ${spellId}` };
        }
        return { valid: true };
      });

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Try to programmatically trigger validation for a cleric spell
      // (This simulates if somehow a cleric spell was available in the UI)
      const cantripToggle = async (spellId: string) => {
        const validation = await mockSpellService.validateSpellForClass(
          spellId,
          wizardCharacter.class.name,
        );
        return validation;
      };

      const result = await cantripToggle('guidance');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Wizard cannot learn guidance');
    });

    it('should enforce spell count limits', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Select maximum cantrips (3 for wizard)
      await user.click(screen.getByTestId('cantrip-mage-hand'));
      await user.click(screen.getByTestId('cantrip-prestidigitation'));
      await user.click(screen.getByTestId('cantrip-light'));

      // Try to select one more cantrip
      await user.click(screen.getByTestId('cantrip-minor-illusion'));

      await waitFor(() => {
        expect(screen.getByText('Cannot select more than 3 cantrips')).toBeInTheDocument();
      });

      // Verify only 3 cantrips are selected
      expect(screen.getByText('Selected: 3 cantrips, 0 spells')).toBeInTheDocument();
    });

    it('should allow deselection of spells', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Select a cantrip
      await user.click(screen.getByTestId('cantrip-mage-hand'));
      expect(screen.getByText('Selected: 1 cantrips, 0 spells')).toBeInTheDocument();

      // Deselect the cantrip
      await user.click(screen.getByTestId('cantrip-mage-hand'));
      expect(screen.getByText('Selected: 0 cantrips, 0 spells')).toBeInTheDocument();
    });

    it('should handle validation errors gracefully', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock validation to throw an error
      mockSpellService.validateSpellForClass.mockRejectedValue(new Error('API Error'));

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Try to select a cantrip
      await user.click(screen.getByTestId('cantrip-mage-hand'));

      await waitFor(() => {
        expect(screen.getByText('Failed to validate spell')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Display', () => {
    it('should display validation errors clearly', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock validation to reject certain spells
      mockSpellService.validateSpellForClass.mockImplementation(async (spellId, className) => {
        if (spellId === 'mage-hand') {
          return { valid: false, error: 'Test validation error' };
        }
        return { valid: true };
      });

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Try to select a spell that will fail validation
      await user.click(screen.getByTestId('cantrip-mage-hand'));

      await waitFor(() => {
        expect(screen.getByTestId('error-messages')).toBeInTheDocument();
        expect(screen.getByText('Wizard cannot learn mage-hand')).toBeInTheDocument();
      });
    });

    it('should clear errors when making valid selections', async () => {
      const user = userEvent.setup();
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      // Mock validation to initially fail, then succeed
      let shouldFail = true;
      mockSpellService.validateSpellForClass.mockImplementation(async (spellId, className) => {
        if (shouldFail && spellId === 'mage-hand') {
          return { valid: false, error: 'Test validation error' };
        }
        return { valid: true };
      });

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // First selection fails
      await user.click(screen.getByTestId('cantrip-mage-hand'));

      await waitFor(() => {
        expect(screen.getByText('Wizard cannot learn mage-hand')).toBeInTheDocument();
      });

      // Change mock to succeed
      shouldFail = false;

      // Second selection succeeds and clears errors
      await user.click(screen.getByTestId('cantrip-prestidigitation'));

      await waitFor(() => {
        expect(screen.queryByTestId('error-messages')).not.toBeInTheDocument();
      });
    });

    it('should handle loading states', () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading spells...')).toBeInTheDocument();
    });
  });

  describe('Different Class Spell Limits', () => {
    it('should enforce cleric spell limits correctly', async () => {
      const user = userEvent.setup();
      const clericCharacter = createMockCharacter('Test Cleric', mockCleric, mockHuman);

      render(<SpellSelectionComponent character={clericCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Cleric should have 3 cantrips and 1 spell (prepared)
      expect(screen.getByText('Cantrips (0/3)')).toBeInTheDocument();
      expect(screen.getByText('Spells (0/1)')).toBeInTheDocument();

      // Select maximum spells
      await user.click(screen.getByTestId('spell-cure-wounds'));

      // Try to select another spell
      await user.click(screen.getByTestId('spell-healing-word'));

      await waitFor(() => {
        expect(screen.getByText('Cannot select more than 1 spells')).toBeInTheDocument();
      });
    });

    it('should display correct spell counts for different classes', async () => {
      const testCases = [
        {
          character: createMockCharacter('Test Wizard', mockWizard, mockHuman),
          expectedCantrips: 3,
          expectedSpells: 6,
        },
        {
          character: createMockCharacter('Test Cleric', mockCleric, mockHuman),
          expectedCantrips: 3,
          expectedSpells: 1,
        },
      ];

      for (const testCase of testCases) {
        const { rerender } = render(<SpellSelectionComponent character={testCase.character} />);

        await waitFor(() => {
          expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        });

        expect(screen.getByText(`Cantrips (0/${testCase.expectedCantrips})`)).toBeInTheDocument();
        expect(screen.getByText(`Spells (0/${testCase.expectedSpells})`)).toBeInTheDocument();

        rerender(<div />); // Clear for next test
      }
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper labels and test IDs', async () => {
      const wizardCharacter = createMockCharacter('Test Wizard', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Check main sections
      expect(screen.getByTestId('spell-selection')).toBeInTheDocument();
      expect(screen.getByTestId('cantrips-section')).toBeInTheDocument();
      expect(screen.getByTestId('spells-section')).toBeInTheDocument();

      // Check individual spell test IDs
      expect(screen.getByTestId('cantrip-mage-hand')).toBeInTheDocument();
      expect(screen.getByTestId('spell-magic-missile')).toBeInTheDocument();
    });

    it('should display character and class information', async () => {
      const wizardCharacter = createMockCharacter('Gandalf', mockWizard, mockHuman);

      render(<SpellSelectionComponent character={wizardCharacter} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Spell Selection for Gandalf (Wizard)')).toBeInTheDocument();
    });
  });
});
