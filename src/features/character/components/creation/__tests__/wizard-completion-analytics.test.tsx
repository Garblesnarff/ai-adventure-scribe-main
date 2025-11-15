import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import WizardContent from '@/components/character-creation/wizard/WizardContent';
import * as AnalyticsModule from '@/services/analytics';

// Mock wizardSteps to a single final step to immediately trigger save path
vi.mock('@/components/character-creation/wizard/constants', () => ({
  wizardSteps: [{ component: () => null, label: 'Finalization' }],
}));

// Mock CharacterContext to provide a valid character
vi.mock('@/contexts/CharacterContext', () => ({
  useCharacter: () => ({
    state: {
      character: {
        name: 'Test Hero',
        race: { name: 'Elf', subraces: [] },
        class: { name: 'Fighter' },
        background: { name: 'Soldier' },
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 10, modifier: 0, savingThrow: false },
          constitution: { score: 10, modifier: 0, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
        skillProficiencies: [],
        languages: [],
        theme: 'fantasy',
      },
    },
  }),
}));

// Mock saver hook to resolve with id
vi.mock('@/hooks/use-character-save', () => ({
  useCharacterSave: () => ({ saveCharacter: async () => ({ id: 'char-1' }), isSaving: false }),
}));

// Mock scroll and toast
vi.mock('@/hooks/use-auto-scroll', () => ({ useAutoScroll: () => ({ scrollToTop: () => {} }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: () => {} }) }));

// Silence navigate by mocking react-router-dom useNavigate
vi.mock('react-router-dom', async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    useNavigate: () => () => {},
  };
});

describe('Character creation completion analytics', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('fires analytics on successful save', async () => {
    const spy = vi
      .spyOn(AnalyticsModule.analytics, 'characterCreationCompleted')
      .mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/app/characters/create?campaign=cmp-xyz']}>
        <WizardContent />
      </MemoryRouter>,
    );

    // Click the completion button
    const btn = await screen.findByRole('button', { name: /Complete Character/i });
    fireEvent.click(btn);

    expect(spy).toHaveBeenCalled();
  });
});
