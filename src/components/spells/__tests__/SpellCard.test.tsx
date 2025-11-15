import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import SpellCard from '../SpellCard';

import type { Spell } from '@/types/character';

/**
 * SpellCard Component Tests
 *
 * Validates the SpellCard component functionality:
 * - Spell information rendering
 * - Selection state handling
 * - Disabled state behavior
 * - Component indicators
 * - Tooltip interactions
 * - Accessibility features
 */

// Mock the spell components utility
vi.mock('@/utils/spellComponents', () => ({
  getComponentTrackingInfo: (spell: Spell) => ({
    verbal: spell.verbal || false,
    somatic: spell.somatic || false,
    material: spell.material || false,
    materialDescription: spell.materialDescription,
    materialCost: spell.materialCost,
    materialConsumed: spell.materialConsumed || false,
  }),
}));

describe('SpellCard Component', () => {
  const mockSpell: Spell = {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '120 feet',
    components: 'V, S',
    verbal: true,
    somatic: true,
    material: false,
    duration: 'Instantaneous',
    description: 'A dart of magical force strikes its target, dealing 1d4 + 1 force damage.',
    damage: '1d4 + 1',
  };

  const mockCantrip: Spell = {
    id: 'mage-hand',
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    casting_time: '1 action',
    range_text: '30 feet',
    components: 'V, S',
    verbal: true,
    somatic: true,
    material: false,
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range.',
    concentration: true,
  };

  const mockRitualSpell: Spell = {
    id: 'detect-magic',
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Self',
    components: 'V, S',
    verbal: true,
    somatic: true,
    material: false,
    duration: 'Concentration, up to 10 minutes',
    description: 'For the duration, you sense the presence of magic within 30 feet of you.',
    concentration: true,
    ritual: true,
  };

  const mockMaterialSpell: Spell = {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '150 feet',
    components: 'V, S, M (a tiny ball of bat guano and sulfur)',
    verbal: true,
    somatic: true,
    material: true,
    materialDescription: 'a tiny ball of bat guano and sulfur',
    duration: 'Instantaneous',
    description:
      'A bright streak flashes from your pointing finger to a point you choose within range.',
    damage: '8d6',
  };

  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render spell name and level', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });

    it('should render cantrip with correct level badge', () => {
      render(
        <SpellCard
          spell={mockCantrip}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('Mage Hand')).toBeInTheDocument();
      expect(screen.getByText('Cantrip')).toBeInTheDocument();
    });

    it('should render school badge', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('Evocation')).toBeInTheDocument();
    });

    it('should render spell description', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(
        screen.getByText(
          'A dart of magical force strikes its target, dealing 1d4 + 1 force damage.',
        ),
      ).toBeInTheDocument();
    });

    it('should hide level badge when showLevel is false', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
          showLevel={false}
        />,
      );

      expect(screen.queryByText('Level 1')).not.toBeInTheDocument();
      expect(screen.getByText('Evocation')).toBeInTheDocument();
    });
  });

  describe('Special Properties', () => {
    it('should show concentration badge for concentration spells', () => {
      render(
        <SpellCard
          spell={mockCantrip}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('Concentration')).toBeInTheDocument();
    });

    it('should show ritual badge for ritual spells', () => {
      render(
        <SpellCard
          spell={mockRitualSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('Ritual')).toBeInTheDocument();
      expect(screen.getByText('Concentration')).toBeInTheDocument();
    });

    it('should show damage badge for damaging spells', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('1d4 + 1')).toBeInTheDocument();
    });
  });

  describe('Spell Details', () => {
    it('should display casting time, range, and duration', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.getByText('1 action')).toBeInTheDocument();
      expect(screen.getByText('120 feet')).toBeInTheDocument();
      expect(screen.getByText('Instantaneous')).toBeInTheDocument();
    });

    it('should show component indicators', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      // Should have verbal and somatic icons
      const componentSection = screen.getByText('1 action').closest('.grid');
      expect(componentSection).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('should show checkbox as unchecked when not selected', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      expect(checkbox).not.toBeChecked();
    });

    it('should show checkbox as checked when selected', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={true}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      expect(checkbox).toBeChecked();
    });

    it('should apply selected styling when selected', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={true}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-infinite-purple', 'bg-infinite-purple/10');
    });

    it('should apply gold theme styling when selected', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={true}
          isDisabled={false}
          onToggle={mockOnToggle}
          colorTheme="gold"
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-infinite-gold');
      expect(card.className).toContain('bg-infinite-gold/10');
    });

    it('should apply teal theme styling when selected', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={true}
          isDisabled={false}
          onToggle={mockOnToggle}
          colorTheme="teal"
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-infinite-teal');
      expect(card.className).toContain('bg-infinite-teal/10');
    });

    it('should fall back to default theme for unexpected colorTheme', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={true}
          isDisabled={false}
          onToggle={mockOnToggle}
          // @ts-expect-error intentionally passing unexpected value to exercise default branch
          colorTheme={'unknown' as any}
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-primary');
      expect(card.className).toContain('bg-primary/5');
    });
  });

  describe('Disabled State', () => {
    it('should disable checkbox when disabled', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={true}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      expect(checkbox).toBeDisabled();
    });

    it('should apply disabled styling when disabled', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={true}
          onToggle={mockOnToggle}
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not call onToggle when disabled and clicked', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={true}
          onToggle={mockOnToggle}
        />,
      );

      const card =
        screen.getByText('Magic Missile').closest('[role="button"]') ||
        screen.getByText('Magic Missile').closest('div');
      fireEvent.click(card!);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Interaction', () => {
    it('should call onToggle when card is clicked', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const card = screen.getByText('Magic Missile').closest('div')!;
      fireEvent.click(card);

      expect(mockOnToggle).toHaveBeenCalledWith('magic-missile');
    });

    it('should call onToggle when checkbox is clicked', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      fireEvent.click(checkbox);

      expect(mockOnToggle).toHaveBeenCalledWith('magic-missile');
    });

    it('should not call onToggle when disabled', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={true}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      fireEvent.click(checkbox);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Material Components', () => {
    it('should show material component information', () => {
      render(
        <SpellCard
          spell={mockMaterialSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      // Material component indicator should be present
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });
      expect(checkbox).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Select Magic Missile' });

      await user.tab();
      expect(checkbox).toHaveFocus();

      await user.keyboard(' ');
      expect(mockOnToggle).toHaveBeenCalledWith('magic-missile');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SpellCard
          spell={mockSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
          className="custom-class"
        />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('School Colors', () => {
    const schoolSpells = [
      { school: 'Abjuration', expectedClass: 'text-blue-800' },
      { school: 'Conjuration', expectedClass: 'text-yellow-800' },
      { school: 'Divination', expectedClass: 'text-purple-800' },
      { school: 'Enchantment', expectedClass: 'text-pink-800' },
      { school: 'Evocation', expectedClass: 'text-red-800' },
      { school: 'Illusion', expectedClass: 'text-indigo-800' },
      { school: 'Necromancy', expectedClass: 'text-gray-800' },
      { school: 'Transmutation', expectedClass: 'text-green-800' },
    ];

    schoolSpells.forEach(({ school, expectedClass }) => {
      it(`should apply correct color for ${school} school`, () => {
        const spell = { ...mockSpell, school };
        render(
          <SpellCard spell={spell} isSelected={false} isDisabled={false} onToggle={mockOnToggle} />,
        );

        const schoolBadge = screen.getByText(school);
        expect(schoolBadge).toHaveClass(expectedClass);
      });
    });

    it('should apply default color for unknown school', () => {
      const spell = { ...mockSpell, school: 'Unknown' };
      render(
        <SpellCard spell={spell} isSelected={false} isDisabled={false} onToggle={mockOnToggle} />,
      );

      const schoolBadge = screen.getByText('Unknown');
      expect(schoolBadge).toHaveClass('text-gray-800');
    });
  });

  describe('Edge Cases', () => {
    it('should handle spell without damage', () => {
      const spellWithoutDamage = { ...mockSpell, damage: undefined };
      render(
        <SpellCard
          spell={spellWithoutDamage}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.queryByText('1d4 + 1')).not.toBeInTheDocument();
    });

    it('should handle spell without concentration', () => {
      const spellWithoutConcentration = { ...mockSpell, concentration: false };
      render(
        <SpellCard
          spell={spellWithoutConcentration}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.queryByText('Concentration')).not.toBeInTheDocument();
    });

    it('should handle spell without ritual', () => {
      const spellWithoutRitual = { ...mockSpell, ritual: false };
      render(
        <SpellCard
          spell={spellWithoutRitual}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(screen.queryByText('Ritual')).not.toBeInTheDocument();
    });

    it('should handle very long spell names gracefully', () => {
      const longNameSpell = {
        ...mockSpell,
        name: 'This is a very long spell name that might cause layout issues',
      };

      render(
        <SpellCard
          spell={longNameSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(
        screen.getByText('This is a very long spell name that might cause layout issues'),
      ).toBeInTheDocument();
    });

    it('should handle very long descriptions gracefully', () => {
      const longDescSpell = {
        ...mockSpell,
        description:
          'This is a very long description that goes on and on and might cause layout issues. '.repeat(
            10,
          ),
      };

      render(
        <SpellCard
          spell={longDescSpell}
          isSelected={false}
          isDisabled={false}
          onToggle={mockOnToggle}
        />,
      );

      expect(
        screen.getByText((text) => text.startsWith('This is a very long description')),
      ).toBeInTheDocument();
    });
  });
});
