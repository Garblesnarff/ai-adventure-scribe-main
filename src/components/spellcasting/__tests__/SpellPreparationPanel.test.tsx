import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import SpellPreparationPanel from '../SpellPreparationPanel';

// Mock CharacterContext
const mockUseCharacter = vi.fn();
vi.mock('@/contexts/CharacterContext', () => ({
  useCharacter: () => mockUseCharacter(),
}));

// Mock spellApi to avoid real calls
vi.mock('@/services/spellApi', () => ({
  spellApi: {
    getClassSpells: vi.fn().mockResolvedValue({ cantrips: [], spells: [] }),
  },
}));

describe('SpellPreparationPanel', () => {
  it('renders fallback when class does not require preparation', () => {
    mockUseCharacter.mockReturnValue({ state: { character: null }, dispatch: vi.fn() });

    render(<SpellPreparationPanel />);

    expect(screen.getByText('Spell Preparation')).toBeInTheDocument();
    expect(
      screen.getByText('Your character class does not require spell preparation.'),
    ).toBeInTheDocument();
  });
});
